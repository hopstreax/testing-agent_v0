"""Deterministic failure diagnosis and classification layer for test execution runs."""

from typing import Any, Optional

from app.models.actions import AssertAction
from app.models.agent import AgentRunResult, FailureDiagnosis


def _format_target_locator(action: Any) -> str:
    """Format action target locator into a concise human-readable description."""
    parts = []
    if getattr(action, "role", None):
        parts.append(f"role='{action.role}'")
    if getattr(action, "name", None):
        parts.append(f"name='{action.name}'")
    if getattr(action, "text", None):
        parts.append(f"text='{action.text}'")
    if getattr(action, "placeholder", None):
        parts.append(f"placeholder='{action.placeholder}'")
    if getattr(action, "label", None):
        parts.append(f"label='{action.label}'")
    if getattr(action, "selector", None):
        parts.append(f"selector='{action.selector}'")

    return ", ".join(parts) if parts else "(page)"


def diagnose_failure(result: AgentRunResult) -> Optional[FailureDiagnosis]:
    """Deterministically classify and summarize a failed test run from execution evidence.

    Returns None if the test run was successful.
    """
    if result.success:
        return None

    diag = result.diagnostics or {}

    # -------------------------------------------------------------------------
    # Rule 1: Infrastructure / Session / Provider / Navigation Crashes
    # -------------------------------------------------------------------------
    if result.termination_reason == "unrecoverable_error":
        msg_lower = result.message.lower()

        # 1a. Navigation failure
        if "navigation" in msg_lower or "net::" in msg_lower or "dns" in msg_lower or "conn" in msg_lower:
            return FailureDiagnosis(
                classification="AUTOMATION_FAILURE",
                cause="NAVIGATION_ERROR",
                summary=f"Automation failure: Navigation error encountered: {result.message}",
            )

        # 1b. LLM reasoning / Provider failure
        if any(term in msg_lower for term in ("llm", "provider", "gemini", "groq", "ollama", "api key", "rate limit", "429")):
            return FailureDiagnosis(
                classification="AUTOMATION_FAILURE",
                cause="PROVIDER_ERROR",
                summary=f"Automation failure: LLM reasoning provider error: {result.message}",
            )

        # 1c. Browser session / launch failure
        if any(term in msg_lower for term in ("browser", "session", "launch", "driver", "solari", "patchright")):
            return FailureDiagnosis(
                classification="AUTOMATION_FAILURE",
                cause="SESSION_ERROR",
                summary=f"Automation failure: Browser session initialization failed: {result.message}",
            )

        return FailureDiagnosis(
            classification="AUTOMATION_FAILURE",
            cause="UNKNOWN_FAILURE",
            summary=f"Automation failure: Unrecoverable error encountered: {result.message}",
        )

    # -------------------------------------------------------------------------
    # Rule 2: Application Crash (Uncaught Page Exceptions / HTTP 5xx Server Errors)
    # -------------------------------------------------------------------------
    # 2a. Uncaught JavaScript page errors
    page_errors = diag.get("page_errors") or []
    if page_errors:
        first_err = page_errors[0]
        err_msg = first_err.get("message", str(first_err)) if isinstance(first_err, dict) else str(first_err)
        return FailureDiagnosis(
            classification="APPLICATION_BEHAVIOR_MISMATCH",
            cause="APPLICATION_CRASH",
            summary=f"Application crash: Target website raised uncaught page exception: {err_msg}",
        )

    # 2b. HTTP 5xx server responses
    http_errors = diag.get("http_errors") or []
    server_errors = [e for e in http_errors if isinstance(e, dict) and e.get("status", 0) >= 500]
    if server_errors:
        first_server_err = server_errors[0]
        status = first_server_err.get("status", 500)
        url = first_server_err.get("url", "")
        return FailureDiagnosis(
            classification="APPLICATION_BEHAVIOR_MISMATCH",
            cause="APPLICATION_CRASH",
            summary=f"Application crash: Target website returned HTTP {status} server error on '{url}'.",
        )

    # -------------------------------------------------------------------------
    # Rule 3: Deterministic Assertion Failure (APPLICATION_BEHAVIOR_MISMATCH)
    # -------------------------------------------------------------------------
    failed_assertion_step = None
    for step in result.history:
        act = step.decision.action
        if getattr(act, "action_type", None) == "assert" and not step.result.success:
            failed_assertion_step = step
            break

    if failed_assertion_step is not None:
        act_assert: AssertAction = failed_assertion_step.decision.action  # type: ignore[assignment]
        target_desc = _format_target_locator(act_assert)
        a_type = act_assert.assertion_type
        exp_val = act_assert.expected_value or ""

        # Check if the failure was actually a missing locator criteria or timeout resolving element
        err_msg = failed_assertion_step.result.error_message or ""
        if "does not contain any valid locator criteria" in err_msg:
            return FailureDiagnosis(
                classification="AUTOMATION_FAILURE",
                cause="LOCATOR_NOT_FOUND",
                summary=f"Automation failure: AssertAction specified invalid or missing locator criteria on step {failed_assertion_step.step_number}.",
            )

        if a_type == "has_text":
            summary = f"Application behavior mismatch: has_text assertion failed on {target_desc}. Expected '{exp_val}'."
        elif a_type == "has_value":
            summary = f"Application behavior mismatch: has_value assertion failed on {target_desc}. Expected '{exp_val}'."
        elif a_type == "visible":
            summary = f"Application behavior mismatch: visible assertion failed on {target_desc}. Element was not visible."
        elif a_type == "hidden":
            summary = f"Application behavior mismatch: hidden assertion failed on {target_desc}. Element was not hidden."
        elif a_type == "enabled":
            summary = f"Application behavior mismatch: enabled assertion failed on {target_desc}. Element was not enabled."
        elif a_type == "disabled":
            summary = f"Application behavior mismatch: disabled assertion failed on {target_desc}. Element was not disabled."
        elif a_type == "checked":
            summary = f"Application behavior mismatch: checked assertion failed on {target_desc}. Element was not checked."
        elif a_type == "unchecked":
            summary = f"Application behavior mismatch: unchecked assertion failed on {target_desc}. Element was not unchecked."
        elif a_type == "has_count":
            summary = f"Application behavior mismatch: has_count assertion failed on {target_desc}. Expected count '{exp_val}'."
        elif a_type == "has_url":
            summary = f"Application behavior mismatch: has_url assertion failed. Expected URL containing '{exp_val}'."
        elif a_type == "has_title":
            summary = f"Application behavior mismatch: has_title assertion failed. Expected title containing '{exp_val}'."
        else:
            summary = f"Application behavior mismatch: {a_type} assertion failed on {target_desc}."

        return FailureDiagnosis(
            classification="APPLICATION_BEHAVIOR_MISMATCH",
            cause="ASSERTION_FAILED",
            summary=summary,
        )

    # -------------------------------------------------------------------------
    # Rule 4: Action / Locator Resolution Failure (AUTOMATION_FAILURE)
    # -------------------------------------------------------------------------
    failed_action_step = None
    for step in reversed(result.history):
        act = step.decision.action
        if getattr(act, "action_type", None) in ("click", "fill", "select", "press_key") and not step.result.success:
            failed_action_step = step
            break

    if failed_action_step is not None:
        act = failed_action_step.decision.action
        target_desc = _format_target_locator(act)
        return FailureDiagnosis(
            classification="AUTOMATION_FAILURE",
            cause="LOCATOR_NOT_FOUND",
            summary=f"Automation failure: Locator for {target_desc} could not be resolved or timed out on step {failed_action_step.step_number}.",
        )

    # -------------------------------------------------------------------------
    # Rule 5: Loop Stagnation Detected (AUTOMATION_FAILURE)
    # -------------------------------------------------------------------------
    if result.termination_reason == "stagnation_detected":
        return FailureDiagnosis(
            classification="AUTOMATION_FAILURE",
            cause="AGENT_STAGNATION",
            summary="Automation failure: Agent loop stagnation detected: Repeated unproductive actions on unchanged browser state.",
        )

    # -------------------------------------------------------------------------
    # Rule 6: Maximum Step Budget Exceeded (AUTOMATION_FAILURE)
    # -------------------------------------------------------------------------
    if result.termination_reason == "max_steps_exceeded":
        return FailureDiagnosis(
            classification="AUTOMATION_FAILURE",
            cause="BUDGET_EXCEEDED",
            summary=f"Automation failure: Execution reached maximum step budget ({result.steps_executed} steps) without completing testing goal.",
        )

    # -------------------------------------------------------------------------
    # Rule 7: Explicit Goal Failure (Agent FinishAction(success=False))
    # -------------------------------------------------------------------------
    if result.termination_reason == "goal_failed":
        msg = result.message or "Agent declared goal failed."
        msg_lower = msg.lower()
        if "not found" in msg_lower or "unable to find" in msg_lower or "cannot find" in msg_lower:
            return FailureDiagnosis(
                classification="AUTOMATION_FAILURE",
                cause="LOCATOR_NOT_FOUND",
                summary=f"Automation failure: Element not found: {msg}",
            )
        return FailureDiagnosis(
            classification="AUTOMATION_FAILURE",
            cause="UNKNOWN_FAILURE",
            summary=f"Automation failure: Goal declared failed by agent: {msg}",
        )

    # -------------------------------------------------------------------------
    # Rule 8: Fallback / Unknown Failure
    # -------------------------------------------------------------------------
    return FailureDiagnosis(
        classification="AUTOMATION_FAILURE",
        cause="UNKNOWN_FAILURE",
        summary=f"Automation failure: Test ended unsuccessfully: {result.message}",
    )
