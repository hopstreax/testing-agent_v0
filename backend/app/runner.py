"""Execution runner coordinating browser sessions, autonomous agent runs, and artifact persistence."""

import asyncio
from datetime import datetime
import os
from pathlib import Path
import time
from typing import Any, Dict, Optional, Tuple, Union
import uuid

from app.agent.orchestrator import AutonomousTestAgent
from app.browser.actions import ActionDispatcher
from app.browser.diagnostics import DiagnosticsCollector
from app.browser.observer import BrowserObserver
from app.browser.session import LocalBrowserSessionManager, SolariSessionManager
from app.llm.base import BaseLLMProvider
from app.llm.fallback import FallbackLLMProvider
from app.llm.gemini import GeminiLLMProvider
from app.llm.groq import GroqLLMProvider
from app.llm.ollama import OllamaLLMProvider
from app.diagnosis import diagnose_failure
from app.models.agent import AgentRunResult
from app.reporting import write_reports


def resolve_llm_provider(
    provider_name: Optional[str] = None,
    model: Optional[str] = None,
) -> BaseLLMProvider:
    """Resolve and instantiate the appropriate LLM provider based on name or environment."""
    p_name = (provider_name or "").strip().lower()

    if p_name == "gemini":
        return GeminiLLMProvider(model=model)
    if p_name == "groq":
        return GroqLLMProvider(model=model)
    if p_name == "ollama":
        return OllamaLLMProvider(model=model)

    # Default: Fallback chain prioritizing configured zero-budget providers
    providers: list[BaseLLMProvider] = [
        GeminiLLMProvider(model=model),
        GroqLLMProvider(model=model),
        OllamaLLMProvider(model=model),
    ]
    return FallbackLLMProvider(providers)


class TestRunner:
    """Coordinates autonomous test execution, browser lifecycle, and artifact persistence."""

    __test__ = False

    def __init__(
        self,
        artifacts_base_dir: Optional[Union[str, Path]] = None,
        llm_provider: Optional[BaseLLMProvider] = None,
        browser_type: str = "local",
        headless: bool = True,
        max_steps: int = 15,
        observer: Optional[BrowserObserver] = None,
        dispatcher: Optional[ActionDispatcher] = None,
        diagnostics: Optional[DiagnosticsCollector] = None,
        storage_state: Optional[Union[str, Path, Dict[str, Any]]] = None,
        owner_id: Optional[str] = None,
    ) -> None:
        self.artifacts_base_dir = Path(artifacts_base_dir or "artifacts/runs").resolve()
        self.llm_provider = llm_provider
        self.browser_type = browser_type.strip().lower()
        self.headless = headless
        self.max_steps = max_steps
        self.observer = observer or BrowserObserver()
        self.dispatcher = dispatcher or ActionDispatcher()
        self.diagnostics = diagnostics
        self.storage_state = storage_state
        self.owner_id = owner_id

    def create_run_directory(self, run_id: Optional[str] = None) -> Tuple[str, Path]:
        """Create a unique timestamped run artifact directory."""
        if not run_id:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            short_uuid = uuid.uuid4().hex[:8]
            run_id = f"{timestamp}_{short_uuid}"

        run_dir = self.artifacts_base_dir / run_id
        (run_dir / "screenshots").mkdir(parents=True, exist_ok=True)
        return (run_id, run_dir)

    def _create_session_manager(self, storage_state: Optional[Union[str, Path, Dict[str, Any]]] = None) -> Any:
        """Instantiate browser session manager based on requested browser type."""
        if self.browser_type == "solari":
            return SolariSessionManager()
        effective_state = storage_state if storage_state is not None else self.storage_state
        return LocalBrowserSessionManager(headless=self.headless, storage_state=effective_state)

    async def run(
        self,
        url: str,
        goal: str,
        test_variables: Optional[Dict[str, str]] = None,
        run_id: Optional[str] = None,
        storage_state: Optional[Union[str, Path, Dict[str, Any]]] = None,
    ) -> Tuple[AgentRunResult, Path]:
        """Execute one autonomous test run end-to-end, guaranteeing artifact generation."""
        start_time = time.perf_counter()
        actual_run_id, run_dir = self.create_run_directory(run_id)
        screenshot_dir = run_dir / "screenshots"

        provider = self.llm_provider or resolve_llm_provider()
        diagnostics = self.diagnostics or DiagnosticsCollector()
        effective_storage_state = storage_state if storage_state is not None else self.storage_state

        # Initial provider/model determination
        if isinstance(provider, FallbackLLMProvider):
            active_p = provider.last_active_provider
            resolved_provider = active_p.provider_name if active_p else "auto"
            resolved_model = getattr(active_p, "model", None) if active_p else None
        else:
            resolved_provider = provider.provider_name
            resolved_model = getattr(provider, "model", None)

        # Fail-fast provider validation before launching browser for explicit providers
        if not isinstance(provider, FallbackLLMProvider):
            try:
                is_ready = await provider.is_available()
            except Exception:
                is_ready = False

            if not is_ready:
                elapsed_ms = int((time.perf_counter() - start_time) * 1000)
                err_msg = f"Provider '{provider.provider_name}' is unavailable or not configured. Check the backend provider configuration."

                run_result = AgentRunResult(
                    success=False,
                    termination_reason="unrecoverable_error",
                    message=err_msg,
                    steps_executed=0,
                    history=[],
                    duration_ms=elapsed_ms,
                    diagnostics=None,
                    run_id=actual_run_id,
                    goal=goal,
                    target_url=url,
                    artifacts_dir=str(run_dir),
                    authenticated=bool(effective_storage_state),
                    llm_provider=resolved_provider,
                    llm_model=resolved_model,
                )
                run_result.failure_diagnosis = diagnose_failure(run_result)
                write_reports(run_result, run_dir, owner_id=self.owner_id)
                return (run_result, run_dir)

        session_mgr = self._create_session_manager(storage_state=effective_storage_state)

        agent = AutonomousTestAgent(
            llm_provider=provider,
            observer=self.observer,
            dispatcher=self.dispatcher,
            diagnostics=diagnostics,
            max_steps=self.max_steps,
        )

        run_result: Optional[AgentRunResult] = None

        try:
            # 1. Launch browser session
            await session_mgr.launch()
            page = await session_mgr.new_page()

            # 2. Execute test agent loop
            run_result = await agent.run(
                page=page,
                goal=goal,
                initial_url=url,
                test_variables=test_variables,
                screenshot_dir=screenshot_dir,
            )

        except (TypeError, ValueError, AssertionError, AttributeError):
            raise
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            run_result = AgentRunResult(
                success=False,
                termination_reason="unrecoverable_error",
                message=f"Test runner execution encountered fatal error: {exc}",
                steps_executed=0,
                history=[],
                duration_ms=elapsed_ms,
                diagnostics=dict(diagnostics.get_summary()) if diagnostics else None,
            )

        finally:
            # Clean up browser session
            try:
                await session_mgr.close()
            except Exception:
                pass

        # Guarantee run metadata fields on result
        assert run_result is not None

        # Update resolved provider/model if fallback executed with a specific provider
        if isinstance(provider, FallbackLLMProvider) and provider.last_active_provider:
            resolved_provider = provider.last_active_provider.provider_name
            resolved_model = getattr(provider.last_active_provider, "model", None)

        run_result.run_id = actual_run_id
        run_result.goal = goal
        run_result.target_url = url
        run_result.artifacts_dir = str(run_dir)
        run_result.authenticated = bool(effective_storage_state)
        run_result.llm_provider = resolved_provider
        run_result.llm_model = resolved_model
        if not run_result.success and not run_result.failure_diagnosis:
            run_result.failure_diagnosis = diagnose_failure(run_result)

        # 3. Generate and persist structured test artifacts (report.json, report.md)
        write_reports(run_result, run_dir, owner_id=self.owner_id)

        return (run_result, run_dir)
