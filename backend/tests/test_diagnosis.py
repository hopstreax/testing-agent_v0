"""Unit tests for deterministic failure diagnosis and classification."""

import argparse
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from app.cli import run_cli
from app.diagnosis import diagnose_failure
from app.models.actions import (
    ActionResult,
    AssertAction,
    ClickAction,
    FillAction,
    FinishAction,
    NavigateAction,
    ObservationPayload,
    StepDecision,
    StepRecord,
)
from app.models.agent import AgentRunResult, FailureDiagnosis
from app.reporting import build_json_report, build_markdown_report


@pytest.fixture
def base_obs() -> ObservationPayload:
    return ObservationPayload(
        url="https://example.com",
        title="Example Domain",
        aria_snapshot="- heading 'Example Domain'",
    )


# 1. Successful run -> no diagnosis
def test_successful_run_has_no_diagnosis(base_obs: ObservationPayload) -> None:
    res = AgentRunResult(
        success=True,
        termination_reason="goal_achieved",
        message="Goal satisfied",
        steps_executed=1,
        history=[],
        duration_ms=500,
    )
    diagnosis = diagnose_failure(res)
    assert diagnosis is None


# 2. Failed has_text assertion -> APPLICATION_BEHAVIOR_MISMATCH / ASSERTION_FAILED
def test_failed_has_text_assertion_diagnosis(base_obs: ObservationPayload) -> None:
    history = [
        StepRecord(
            step_number=1,
            observation=base_obs,
            decision=StepDecision(
                observation_summary="Page loaded",
                decision="Verify status message",
                action=AssertAction(
                    assertion_type="has_text",
                    selector="#status",
                    expected_value="Authenticated as alice",
                ),
            ),
            result=ActionResult(
                success=False,
                action_type="assert",
                duration_ms=45,
                resolved_by="selector='#status'",
                error_message="Locator expected to contain text 'Authenticated as alice' but received 'Invalid credentials'",
            ),
        )
    ]
    res = AgentRunResult(
        success=False,
        termination_reason="goal_failed",
        message="Status text did not match",
        steps_executed=1,
        history=history,
        duration_ms=800,
    )

    diagnosis = diagnose_failure(res)
    assert diagnosis is not None
    assert diagnosis.classification == "APPLICATION_BEHAVIOR_MISMATCH"
    assert diagnosis.cause == "ASSERTION_FAILED"
    assert "has_text assertion failed on selector='#status'" in diagnosis.summary
    assert "Authenticated as alice" in diagnosis.summary


# 3. Locator failure -> AUTOMATION_FAILURE / LOCATOR_NOT_FOUND
def test_locator_failure_diagnosis(base_obs: ObservationPayload) -> None:
    history = [
        StepRecord(
            step_number=1,
            observation=base_obs,
            decision=StepDecision(
                observation_summary="Page loaded",
                decision="Click submit button",
                action=ClickAction(role="button", name="Submit"),
            ),
            result=ActionResult(
                success=False,
                action_type="click",
                duration_ms=5000,
                resolved_by=None,
                error_message="Timeout 5000ms exceeded waiting for get_by_role('button', name='Submit')",
            ),
        )
    ]
    res = AgentRunResult(
        success=False,
        termination_reason="goal_failed",
        message="Failed to click submit button",
        steps_executed=1,
        history=history,
        duration_ms=5200,
    )

    diagnosis = diagnose_failure(res)
    assert diagnosis is not None
    assert diagnosis.classification == "AUTOMATION_FAILURE"
    assert diagnosis.cause == "LOCATOR_NOT_FOUND"
    assert "role='button', name='Submit'" in diagnosis.summary
    assert "could not be resolved or timed out" in diagnosis.summary


# 4. Navigation failure -> AUTOMATION_FAILURE / NAVIGATION_ERROR
def test_navigation_failure_diagnosis() -> None:
    res = AgentRunResult(
        success=False,
        termination_reason="unrecoverable_error",
        message="Initial navigation to 'https://invalid.domain' failed: net::ERR_NAME_NOT_RESOLVED",
        steps_executed=0,
        history=[],
        duration_ms=250,
    )

    diagnosis = diagnose_failure(res)
    assert diagnosis is not None
    assert diagnosis.classification == "AUTOMATION_FAILURE"
    assert diagnosis.cause == "NAVIGATION_ERROR"
    assert "Navigation error encountered" in diagnosis.summary
    assert "ERR_NAME_NOT_RESOLVED" in diagnosis.summary


# 5. Stagnation -> AUTOMATION_FAILURE / AGENT_STAGNATION
def test_stagnation_diagnosis(base_obs: ObservationPayload) -> None:
    res = AgentRunResult(
        success=False,
        termination_reason="stagnation_detected",
        message="Stagnation detected: identical action 'click' repeated consecutively on identical page state.",
        steps_executed=3,
        history=[],
        duration_ms=1200,
    )

    diagnosis = diagnose_failure(res)
    assert diagnosis is not None
    assert diagnosis.classification == "AUTOMATION_FAILURE"
    assert diagnosis.cause == "AGENT_STAGNATION"
    assert "loop stagnation detected" in diagnosis.summary.lower()


# 6. Max steps -> AUTOMATION_FAILURE / BUDGET_EXCEEDED
def test_budget_exceeded_diagnosis() -> None:
    res = AgentRunResult(
        success=False,
        termination_reason="max_steps_exceeded",
        message="Execution reached maximum limit of 15 steps without completing goal.",
        steps_executed=15,
        history=[],
        duration_ms=24000,
    )

    diagnosis = diagnose_failure(res)
    assert diagnosis is not None
    assert diagnosis.classification == "AUTOMATION_FAILURE"
    assert diagnosis.cause == "BUDGET_EXCEEDED"
    assert "maximum step budget (15 steps)" in diagnosis.summary


# 7. Provider failure -> AUTOMATION_FAILURE / PROVIDER_ERROR
def test_provider_failure_diagnosis() -> None:
    res = AgentRunResult(
        success=False,
        termination_reason="unrecoverable_error",
        message="LLM reasoning failed: Provider 'gemini' rate limit or quota exceeded (HTTP 429).",
        steps_executed=2,
        history=[],
        duration_ms=3000,
    )

    diagnosis = diagnose_failure(res)
    assert diagnosis is not None
    assert diagnosis.classification == "AUTOMATION_FAILURE"
    assert diagnosis.cause == "PROVIDER_ERROR"
    assert "LLM reasoning provider error" in diagnosis.summary


# 8a. Page exception -> APPLICATION_BEHAVIOR_MISMATCH / APPLICATION_CRASH
def test_page_exception_crash_diagnosis(base_obs: ObservationPayload) -> None:
    res = AgentRunResult(
        success=False,
        termination_reason="goal_failed",
        message="Website became unresponsive",
        steps_executed=1,
        history=[],
        duration_ms=1000,
        diagnostics={
            "page_errors": [{"message": "Uncaught TypeError: Cannot read properties of undefined (reading 'login')"}],
            "http_errors": [],
        },
    )

    diagnosis = diagnose_failure(res)
    assert diagnosis is not None
    assert diagnosis.classification == "APPLICATION_BEHAVIOR_MISMATCH"
    assert diagnosis.cause == "APPLICATION_CRASH"
    assert "uncaught page exception" in diagnosis.summary
    assert "Cannot read properties of undefined" in diagnosis.summary


# 8b. HTTP 5xx error -> APPLICATION_BEHAVIOR_MISMATCH / APPLICATION_CRASH
def test_http_500_server_error_diagnosis() -> None:
    res = AgentRunResult(
        success=False,
        termination_reason="goal_failed",
        message="Submission failed",
        steps_executed=2,
        history=[],
        duration_ms=1500,
        diagnostics={
            "page_errors": [],
            "http_errors": [{"status": 500, "url": "https://example.com/api/auth", "status_text": "Internal Server Error"}],
        },
    )

    diagnosis = diagnose_failure(res)
    assert diagnosis is not None
    assert diagnosis.classification == "APPLICATION_BEHAVIOR_MISMATCH"
    assert diagnosis.cause == "APPLICATION_CRASH"
    assert "HTTP 500 server error" in diagnosis.summary
    assert "https://example.com/api/auth" in diagnosis.summary


# 9. Deterministic summary contains relevant details
def test_diagnosis_summary_contains_relevant_assertion_details(base_obs: ObservationPayload) -> None:
    history = [
        StepRecord(
            step_number=1,
            observation=base_obs,
            decision=StepDecision(
                observation_summary="Page loaded",
                decision="Check URL",
                action=AssertAction(assertion_type="has_url", expected_value="dashboard"),
            ),
            result=ActionResult(
                success=False,
                action_type="assert",
                duration_ms=20,
                resolved_by="page.url",
                error_message="Expected URL containing 'dashboard'",
            ),
        )
    ]
    res = AgentRunResult(
        success=False,
        termination_reason="goal_failed",
        message="Wrong URL",
        steps_executed=1,
        history=history,
        duration_ms=400,
    )

    diagnosis = diagnose_failure(res)
    assert diagnosis is not None
    assert diagnosis.classification == "APPLICATION_BEHAVIOR_MISMATCH"
    assert diagnosis.cause == "ASSERTION_FAILED"
    assert "has_url assertion failed" in diagnosis.summary
    assert "dashboard" in diagnosis.summary


# 10. report.json includes diagnosis
def test_report_json_includes_diagnosis(tmp_path: Path, base_obs: ObservationPayload) -> None:
    res = AgentRunResult(
        success=False,
        termination_reason="goal_failed",
        message="Assertion failed",
        steps_executed=1,
        history=[],
        duration_ms=300,
        failure_diagnosis=FailureDiagnosis(
            classification="APPLICATION_BEHAVIOR_MISMATCH",
            cause="ASSERTION_FAILED",
            summary="Application behavior mismatch: visible assertion failed on role='button'.",
        ),
    )

    report_dict = build_json_report(res, tmp_path)
    assert "diagnosis" in report_dict
    assert report_dict["diagnosis"] is not None
    assert report_dict["diagnosis"]["classification"] == "APPLICATION_BEHAVIOR_MISMATCH"
    assert report_dict["diagnosis"]["cause"] == "ASSERTION_FAILED"
    assert "visible assertion failed" in report_dict["diagnosis"]["summary"]


# 11. report.md includes failure diagnosis
def test_report_md_includes_failure_diagnosis(tmp_path: Path) -> None:
    res = AgentRunResult(
        success=False,
        termination_reason="stagnation_detected",
        message="Loop stagnation",
        steps_executed=3,
        history=[],
        duration_ms=1000,
        failure_diagnosis=FailureDiagnosis(
            classification="AUTOMATION_FAILURE",
            cause="AGENT_STAGNATION",
            summary="Automation failure: Agent loop stagnation detected: Repeated unproductive actions on unchanged browser state.",
        ),
    )

    md = build_markdown_report(res, tmp_path)
    assert "## Failure Diagnosis" in md
    assert "- **Classification**: `AUTOMATION_FAILURE`" in md
    assert "- **Cause**: `AGENT_STAGNATION`" in md
    assert "Automation failure: Agent loop stagnation detected" in md


# 12. CLI displays diagnosis
@pytest.mark.asyncio
async def test_cli_displays_diagnosis(capsys: pytest.CaptureFixture[str]) -> None:
    mock_res = AgentRunResult(
        success=False,
        termination_reason="goal_failed",
        message="Failed",
        steps_executed=1,
        history=[],
        duration_ms=950,
        failure_diagnosis=FailureDiagnosis(
            classification="APPLICATION_BEHAVIOR_MISMATCH",
            cause="ASSERTION_FAILED",
            summary="Application behavior mismatch: has_text assertion failed on selector '#status'.",
        ),
    )

    mock_runner = MagicMock()
    mock_runner.run = AsyncMock(return_value=(mock_res, Path("/tmp/run_123")))

    args = argparse.Namespace(
        command="run",
        url="https://example.com",
        goal="Verify status",
        browser="local",
        headless=True,
        max_steps=15,
        artifacts_dir="artifacts/runs",
        provider=None,
        model=None,
    )

    with patch("app.cli.TestRunner", return_value=mock_runner):
        exit_code = await run_cli(args)
        assert exit_code == 1

    captured = capsys.readouterr().out
    assert "TEST OUTCOME: FAILED" in captured
    assert "Classification: APPLICATION_BEHAVIOR_MISMATCH" in captured
    assert "Cause      : ASSERTION_FAILED" in captured
    assert "Reason     : Application behavior mismatch: has_text assertion failed on selector '#status'." in captured


# =============================================================================
# Milestone 6.3: Rich Deterministic Assertions Failure Diagnosis Tests
# =============================================================================

@pytest.mark.parametrize(
    "assertion_type,kwargs,expected_summary_part",
    [
        ("enabled", {"role": "button", "name": "Submit"}, "enabled assertion failed on role='button', name='Submit'. Element was not enabled."),
        ("disabled", {"selector": "#save-btn"}, "disabled assertion failed on selector='#save-btn'. Element was not disabled."),
        ("checked", {"role": "checkbox", "name": "Agree"}, "checked assertion failed on role='checkbox', name='Agree'. Element was not checked."),
        ("unchecked", {"selector": "#opt-in"}, "unchecked assertion failed on selector='#opt-in'. Element was not unchecked."),
        ("has_count", {"selector": ".cart-item", "expected_value": "3"}, "has_count assertion failed on selector='.cart-item'. Expected count '3'."),
    ],
)
def test_m63_assertion_failure_diagnosis(base_obs: ObservationPayload, assertion_type, kwargs, expected_summary_part):
    history = [
        StepRecord(
            step_number=1,
            observation=base_obs,
            decision=StepDecision(
                observation_summary="Page loaded",
                decision=f"Verify {assertion_type}",
                action=AssertAction(assertion_type=assertion_type, **kwargs),
            ),
            result=ActionResult(
                success=False,
                action_type="assert",
                duration_ms=50,
                error_message="Assertion failed",
            ),
        )
    ]
    res = AgentRunResult(
        success=False,
        termination_reason="goal_failed",
        message=f"{assertion_type} assertion failed",
        steps_executed=1,
        history=history,
        duration_ms=500,
    )

    diagnosis = diagnose_failure(res)
    assert diagnosis is not None
    assert diagnosis.classification == "APPLICATION_BEHAVIOR_MISMATCH"
    assert diagnosis.cause == "ASSERTION_FAILED"
    assert expected_summary_part in diagnosis.summary
