"""Autonomous testing agent loop and orchestration state machine."""

import asyncio
import time
from typing import Any, Dict, List, Optional, Tuple

from app.browser.actions import ActionDispatcher
from app.browser.diagnostics import DiagnosticsCollector
from app.browser.observer import BrowserObserver
from app.llm.base import BaseLLMProvider
from app.llm.context import StepPromptContext
from app.models.actions import (
    ActionResult,
    AgentAction,
    ClickAction,
    FillAction,
    FinishAction,
    NavigateAction,
    ObservationPayload,
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
        if isinstance(action, FinishAction):
            return ("finish",)
        return (action.action_type,)

    async def run(
        self,
        page: Any,
        goal: str,
        initial_url: Optional[str] = None,
        test_variables: Optional[Dict[str, str]] = None,
    ) -> AgentRunResult:
        """Execute the autonomous testing loop against the provided page."""
        start_time = time.perf_counter()

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
            obs = await self.observer.capture_observation(page)
        except (TypeError, ValueError, AssertionError, AttributeError):
            raise
        except asyncio.CancelledError:
            raise
        except Exception as exc:
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

            # Terminal FinishAction handling
            if isinstance(action, FinishAction):
                finish_res = ActionResult(
                    success=action.success,
                    action_type="finish",
                    duration_ms=0,
                    resolved_by="agent.finish",
                )
                record = StepRecord(
                    step_number=step_number,
                    observation=obs,
                    decision=decision,
                    result=finish_res,
                )
                history.append(record)
                steps_executed += 1
                elapsed_ms = int((time.perf_counter() - start_time) * 1000)
                return AgentRunResult(
                    success=action.success,
                    termination_reason="goal_achieved" if action.success else "goal_failed",
                    message=action.message,
                    steps_executed=steps_executed,
                    history=history,
                    duration_ms=elapsed_ms,
                    diagnostics=diag_summary,
                )

            # Safeguard: Immediate action-loop stagnation
            action_sig = self.compute_action_signature(action)
            current_fingerprint = self.compute_state_fingerprint(obs)

            if (
                current_fingerprint == last_state_fingerprint
                and action_sig == last_action_sig
            ):
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

            # Dispatch browser action
            action_res = await self.dispatcher.execute(page, action)

            # Record executed step into history
            record = StepRecord(
                step_number=step_number,
                observation=obs,
                decision=decision,
                result=action_res,
            )
            history.append(record)
            steps_executed += 1
            last_action_sig = action_sig

            # Capture post-action observation
            try:
                next_obs = await self.observer.capture_observation(page)
            except (TypeError, ValueError, AssertionError, AttributeError):
                raise
            except asyncio.CancelledError:
                raise
            except Exception as exc:
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
