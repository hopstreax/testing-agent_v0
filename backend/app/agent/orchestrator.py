"""Autonomous testing agent loop and orchestration state machine."""

import asyncio
from pathlib import Path
import time
from typing import Any, Dict, List, Optional, Tuple, Union

from app.browser.actions import ActionDispatcher
from app.browser.diagnostics import DiagnosticsCollector
from app.browser.observer import BrowserObserver
from app.llm.base import BaseLLMProvider
from app.llm.context import StepPromptContext
from app.models.actions import (
    ActionResult,
    AgentAction,
    AssertAction,
    ClickAction,
    FillAction,
    FinishAction,
    NavigateAction,
    ObservationPayload,
    PressKeyAction,
    SelectAction,
    StepRecord,
)
from app.models.agent import AgentRunResult


class AutonomousTestAgent:
    """Orchestrates the Observe-Reason-Act testing loop with safeguards."""

    def __init__(
        self,
        llm_provider: BaseLLMProvider,
        observer: Optional[BrowserObserver] = None,
        dispatcher: Optional[ActionDispatcher] = None,
        diagnostics: Optional[DiagnosticsCollector] = None,
        max_steps: int = 15,
    ) -> None:
        self.llm_provider = llm_provider
        self.observer = observer or BrowserObserver()
        self.dispatcher = dispatcher or ActionDispatcher()
        self.diagnostics = diagnostics
        self.max_steps = max_steps

    def compute_state_fingerprint(self, observation: ObservationPayload) -> int:
        """Compute deterministic hash of the observable page state."""
        return hash((observation.url, observation.title, observation.aria_snapshot))

    def compute_action_signature(self, action: AgentAction) -> Tuple[Any, ...]:
        """Compute signature representing action intent and parameters."""
        if isinstance(action, ClickAction):
            return ("click", action.role, action.name, action.selector)
        if isinstance(action, FillAction):
            return (
                "fill",
                action.role,
                action.name,
                action.placeholder,
                action.selector,
                action.value,
            )
        if isinstance(action, NavigateAction):
            return ("navigate", action.url)
        if isinstance(action, AssertAction):
            return (
                "assert",
                action.assertion_type,
                action.role,
                action.name,
                action.text,
                action.placeholder,
                action.label,
                action.selector,
                action.expected_value,
            )
        if isinstance(action, PressKeyAction):
            return (
                "press_key",
                action.key,
                action.role,
                action.name,
                action.text,
                action.placeholder,
                action.label,
                action.selector,
            )
        if isinstance(action, SelectAction):
            return (
                "select",
                action.role,
                action.name,
                action.text,
                action.placeholder,
                action.selector,
                action.value,
                action.label,
            )
        if isinstance(action, FinishAction):
            return ("finish", action.success)
        return (action.action_type,)

    def compute_action_target(self, action: AgentAction) -> Tuple[Any, ...]:
        """Compute locator target identity (independent of filled value) for stagnation checks."""
        if isinstance(action, ClickAction):
            return ("click", action.role, action.name, action.selector)
        if isinstance(action, FillAction):
            return ("fill", action.role, action.name, action.placeholder, action.selector)
        if isinstance(action, NavigateAction):
            return ("navigate", action.url)
        if isinstance(action, AssertAction):
            return (
                "assert",
                action.assertion_type,
                action.role,
                action.name,
                action.text,
                action.placeholder,
                action.label,
                action.selector,
            )
        if isinstance(action, PressKeyAction):
            return (
                "press_key",
                action.key,
                action.role,
                action.name,
                action.text,
                action.placeholder,
                action.label,
                action.selector,
            )
        if isinstance(action, SelectAction):
            return (
                "select",
                action.role,
                action.name,
                action.text,
                action.placeholder,
                action.selector,
            )
        if isinstance(action, FinishAction):
            return ("finish",)
        return (action.action_type,)

    async def run(
        self,
        page: Any,
        goal: str,
        initial_url: Optional[str] = None,
        test_variables: Optional[Dict[str, str]] = None,
        screenshot_dir: Optional[Union[str, Path]] = None,
    ) -> AgentRunResult:
        """Execute the autonomous testing loop against the provided page."""
        start_time = time.perf_counter()

        shots_dir: Optional[Path] = Path(screenshot_dir).resolve() if screenshot_dir else None
        if shots_dir:
            shots_dir.mkdir(parents=True, exist_ok=True)

        async def _safe_page_screenshot(filename: str) -> Optional[str]:
            if not shots_dir:
                return None
            target = shots_dir / filename
            if hasattr(page, "screenshot"):
                try:
                    await page.screenshot(path=str(target), full_page=False)
                    return str(target)
                except Exception:
                    return None
            return None

        if self.diagnostics:
            self.diagnostics.attach(page)

        # Initial navigation setup if requested (not counted as an agent step)
        if initial_url:
            try:
                await page.goto(initial_url, wait_until="domcontentloaded")
            except (TypeError, ValueError, AssertionError, AttributeError):
                raise
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                await _safe_page_screenshot("step_00_navigation_failed.png")
                elapsed_ms = int((time.perf_counter() - start_time) * 1000)
                return AgentRunResult(
                    success=False,
                    termination_reason="unrecoverable_error",
                    message=f"Initial navigation to '{initial_url}' failed: {exc}",
                    steps_executed=0,
                    history=[],
                    duration_ms=elapsed_ms,
                    diagnostics=dict(self.diagnostics.get_summary()) if self.diagnostics else None,
                )

        # Initial observation capture
        try:
            init_shot_path = str(shots_dir / "step_00_initial.png") if shots_dir else None
            obs = await self.observer.capture_observation(page, screenshot_path=init_shot_path)
        except (TypeError, ValueError, AssertionError, AttributeError):
            raise
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            await _safe_page_screenshot("step_00_observation_failed.png")
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            return AgentRunResult(
                success=False,
                termination_reason="unrecoverable_error",
                message=f"Initial browser observation failed: {exc}",
                steps_executed=0,
                history=[],
                duration_ms=elapsed_ms,
                diagnostics=dict(self.diagnostics.get_summary()) if self.diagnostics else None,
            )

        steps_executed = 0
        history: List[StepRecord] = []

        last_state_fingerprint = self.compute_state_fingerprint(obs)
        last_action_sig: Optional[Tuple[Any, ...]] = None
        consecutive_unchanged_states = 0
        recent_actions_on_same_state: List[Tuple[Tuple[Any, ...], bool]] = []

        while steps_executed < self.max_steps:
            step_number = steps_executed + 1
            diag_summary = dict(self.diagnostics.get_summary()) if self.diagnostics else None

            context = StepPromptContext(
                goal=goal,
                current_observation=obs,
                history=list(history),
                diagnostics_summary=diag_summary,
                test_variables=test_variables or {},
            )

            # LLM reasoning turn
            try:
                decision = await self.llm_provider.generate_step(context)
            except (TypeError, ValueError, AssertionError, AttributeError):
                raise
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                elapsed_ms = int((time.perf_counter() - start_time) * 1000)
                return AgentRunResult(
                    success=False,
                    termination_reason="unrecoverable_error",
                    message=f"LLM reasoning failed: {exc}",
                    steps_executed=steps_executed,
                    history=history,
                    duration_ms=elapsed_ms,
                    diagnostics=diag_summary,
                )

            action = decision.action

            # Terminal FinishAction handling with anti-hallucination verification requirement
            if isinstance(action, FinishAction):
                if not action.success:
                    # Explicit goal failure is always permitted to terminate immediately
                    finish_res = ActionResult(
                        success=False,
                        action_type="finish",
                        duration_ms=0,
                        resolved_by="agent.finish",
                    )
                    finish_shot = await _safe_page_screenshot(f"step_{step_number:02d}_goal_failed.png")
                    record = StepRecord(
                        step_number=step_number,
                        observation=obs,
                        decision=decision,
                        result=finish_res,
                        screenshot_path=finish_shot,
                    )
                    history.append(record)
                    steps_executed += 1
                    elapsed_ms = int((time.perf_counter() - start_time) * 1000)
                    return AgentRunResult(
                        success=False,
                        termination_reason="goal_failed",
                        message=action.message,
                        steps_executed=steps_executed,
                        history=history,
                        duration_ms=elapsed_ms,
                        diagnostics=diag_summary,
                    )
                else:
                    # Success declaration requires at least one successful AssertAction in the run
                    has_verified_assertion = any(
                        rec.decision.action.action_type == "assert" and rec.result.success
                        for rec in history
                    )
                    if has_verified_assertion:
                        finish_res = ActionResult(
                            success=True,
                            action_type="finish",
                            duration_ms=0,
                            resolved_by="agent.finish",
                        )
                        finish_shot = await _safe_page_screenshot(f"step_{step_number:02d}_final.png")
                        record = StepRecord(
                            step_number=step_number,
                            observation=obs,
                            decision=decision,
                            result=finish_res,
                            screenshot_path=finish_shot,
                        )
                        history.append(record)
                        steps_executed += 1
                        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
                        return AgentRunResult(
                            success=True,
                            termination_reason="goal_achieved",
                            message=action.message,
                            steps_executed=steps_executed,
                            history=history,
                            duration_ms=elapsed_ms,
                            diagnostics=diag_summary,
                        )
                    else:
                        # Reject FinishAction(success=True) and inject synthetic failure to prompt verification
                        rejected_res = ActionResult(
                            success=False,
                            action_type="finish",
                            duration_ms=0,
                            resolved_by="agent.finish_rejected",
                            error_message=(
                                "FinishAction(success=True) was rejected: Goal success requires at least "
                                "one successful deterministic assertion (AssertAction). Please execute an AssertAction "
                                "to verify the expected outcome before concluding success."
                            ),
                        )
                        record = StepRecord(
                            step_number=step_number,
                            observation=obs,
                            decision=decision,
                            result=rejected_res,
                            screenshot_path=None,
                        )
                        history.append(record)
                        steps_executed += 1
                        last_action_sig = self.compute_action_signature(action)
                        continue

            # Safeguard: Immediate action-loop stagnation
            action_sig = self.compute_action_signature(action)
            current_fingerprint = self.compute_state_fingerprint(obs)

            if (
                current_fingerprint == last_state_fingerprint
                and action_sig == last_action_sig
            ):
                await _safe_page_screenshot(f"step_{step_number:02d}_stagnation.png")
                elapsed_ms = int((time.perf_counter() - start_time) * 1000)
                return AgentRunResult(
                    success=False,
                    termination_reason="stagnation_detected",
                    message=(
                        f"Stagnation detected: identical action '{action.action_type}' "
                        "repeated consecutively on identical page state."
                    ),
                    steps_executed=steps_executed,
                    history=history,
                    duration_ms=elapsed_ms,
                    diagnostics=diag_summary,
                )

            # Dispatch browser action (NavigateAction, ClickAction, FillAction, AssertAction)
            action_res = await self.dispatcher.execute(page, action)

            step_shot_path: Optional[str] = None
            if shots_dir:
                if not action_res.success:
                    step_shot_path = str(shots_dir / f"step_{step_number:02d}_{action.action_type}_failed.png")
                elif isinstance(action, AssertAction) and action_res.success:
                    step_shot_path = str(shots_dir / f"step_{step_number:02d}_assert_success.png")

            # Record executed step into history
            record = StepRecord(
                step_number=step_number,
                observation=obs,
                decision=decision,
                result=action_res,
                screenshot_path=step_shot_path,
            )
            history.append(record)
            steps_executed += 1
            last_action_sig = action_sig

            # Capture post-action observation
            try:
                next_obs = await self.observer.capture_observation(page, screenshot_path=step_shot_path)
            except (TypeError, ValueError, AssertionError, AttributeError):
                raise
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                await _safe_page_screenshot(f"step_{step_number:02d}_observation_failed.png")
                elapsed_ms = int((time.perf_counter() - start_time) * 1000)
                return AgentRunResult(
                    success=False,
                    termination_reason="unrecoverable_error",
                    message=f"Browser observation failed after action: {exc}",
                    steps_executed=steps_executed,
                    history=history,
                    duration_ms=elapsed_ms,
                    diagnostics=diag_summary,
                )

            # Safeguard: Prolonged unchanged state stagnation with non-progress
            next_fingerprint = self.compute_state_fingerprint(next_obs)
            action_target = self.compute_action_target(action)

            if next_fingerprint == current_fingerprint:
                consecutive_unchanged_states += 1
                recent_actions_on_same_state.append((action_target, action_res.success))

                if consecutive_unchanged_states >= 3:
                    any_failed = any(not success for _, success in recent_actions_on_same_state)
                    all_same_target = len(set(target for target, _ in recent_actions_on_same_state)) == 1

                    if any_failed or all_same_target:
                        await _safe_page_screenshot(f"step_{step_number:02d}_stagnation.png")
                        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
                        return AgentRunResult(
                            success=False,
                            termination_reason="stagnation_detected",
                            message=(
                                f"Stagnation detected: page state remained unchanged across "
                                f"{consecutive_unchanged_states} consecutive actions with non-progress."
                            ),
                            steps_executed=steps_executed,
                            history=history,
                            duration_ms=elapsed_ms,
                            diagnostics=diag_summary,
                        )
            else:
                consecutive_unchanged_states = 0
                recent_actions_on_same_state.clear()

            last_state_fingerprint = next_fingerprint
            obs = next_obs

        # Reached max_steps without FinishAction
        await _safe_page_screenshot("final_max_steps_exceeded.png")
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        final_diags = dict(self.diagnostics.get_summary()) if self.diagnostics else None
        return AgentRunResult(
            success=False,
            termination_reason="max_steps_exceeded",
            message=f"Execution reached maximum limit of {self.max_steps} steps without completing goal.",
            steps_executed=steps_executed,
            history=history,
            duration_ms=elapsed_ms,
            diagnostics=final_diags,
        )
