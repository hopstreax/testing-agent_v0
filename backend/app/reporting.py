"""Reporting module generating structured JSON and human-readable Markdown test artifacts."""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.models.actions import (
    AssertAction,
    ClickAction,
    FillAction,
    FinishAction,
    HoverAction,
    NavigateAction,
    PressKeyAction,
    ScrollAction,
    SelectAction,
    StepRecord,
)
from app.models.agent import AgentRunResult


def relativize_path(path_str: Optional[str], base_dir: Path) -> Optional[str]:
    """Convert an absolute or relative path to a normalized relative POSIX path against base_dir."""
    if not path_str:
        return None
    try:
        path_obj = Path(path_str)
        if path_obj.is_absolute():
            try:
                return path_obj.relative_to(base_dir.resolve()).as_posix()
            except ValueError:
                # If path is not inside base_dir, check if screenshots folder matches
                if "screenshots" in path_obj.parts:
                    idx = path_obj.parts.index("screenshots")
                    return Path(*path_obj.parts[idx:]).as_posix()
                return path_obj.name
        return path_obj.as_posix()
    except Exception:
        return path_str


def extract_action_details(action: Any) -> Dict[str, Any]:
    """Extract key locator and parameter attributes from an action for structured reporting."""
    details: Dict[str, Any] = {"action_type": getattr(action, "action_type", "unknown")}

    for attr in ("role", "name", "text", "placeholder", "label", "selector", "index", "value", "key", "assertion_type", "expected_value", "direction", "amount", "success", "message"):
        val = getattr(action, attr, None)
        if val is not None:
            details[attr] = val

    return details


def format_action_label(action: Any) -> str:
    """Format a concise human-readable description of an action for summary tables."""
    action_type = getattr(action, "action_type", "unknown")
    idx_suffix = f" [index={action.index}]" if getattr(action, "index", None) is not None else ""

    if isinstance(action, ClickAction):
        target = (action.name or action.role or action.selector or action.text or "")
        target_str = f"{target}{idx_suffix}" if target else idx_suffix.strip()
        return f"click({target_str})" if target_str else "click"
    if isinstance(action, FillAction):
        target = (action.name or action.placeholder or action.role or action.selector or "")
        target_str = f"{target}{idx_suffix}" if target else idx_suffix.strip()
        return f"fill({target_str}, value='{action.value}')"
    if isinstance(action, NavigateAction):
        return f"navigate({action.url})"
    if isinstance(action, AssertAction):
        target = (action.name or action.role or action.selector or action.text or action.expected_value or "")
        target_str = f"{target}{idx_suffix}" if target else idx_suffix.strip()
        if action.assertion_type == "has_count":
            return f"assert(has_count={action.expected_value}, {target})"
        return f"assert({action.assertion_type}, {target_str})"
    if isinstance(action, PressKeyAction):
        return f"press_key('{action.key}')"
    if isinstance(action, SelectAction):
        opt = f"value='{action.value}'" if action.value is not None else f"label='{action.label}'"
        return f"select({opt}{idx_suffix})"
    if isinstance(action, ScrollAction):
        return f"scroll {action.direction} {action.amount}px"
    if isinstance(action, HoverAction):
        target = (action.name or action.role or action.selector or action.text or "")
        target_str = f"{target}{idx_suffix}" if target else idx_suffix.strip()
        return f"hover({target_str})" if target_str else "hover"
    if isinstance(action, FinishAction):
        return f"finish(success={action.success})"

    return action_type


def build_json_report(run_result: AgentRunResult, run_dir: Path) -> Dict[str, Any]:
    """Construct a complete, machine-readable JSON dictionary representing the test run."""
    base_dir = Path(run_dir).resolve()

    # Extract all deterministic assertions executed in the run
    assertions: List[Dict[str, Any]] = []
    collected_screenshots: List[str] = []

    for step in run_result.history:
        rel_shot = relativize_path(step.screenshot_path, base_dir)
        if rel_shot and rel_shot not in collected_screenshots:
            collected_screenshots.append(rel_shot)

        action = step.decision.action
        if getattr(action, "action_type", None) == "assert":
            assertions.append({
                "step_number": step.step_number,
                "assertion_type": getattr(action, "assertion_type", "unknown"),
                "expected_value": getattr(action, "expected_value", None),
                "locator": {
                    k: v for k, v in {
                        "role": getattr(action, "role", None),
                        "name": getattr(action, "name", None),
                        "text": getattr(action, "text", None),
                        "placeholder": getattr(action, "placeholder", None),
                        "label": getattr(action, "label", None),
                        "selector": getattr(action, "selector", None),
                    }.items() if v is not None
                },
                "success": step.result.success,
                "error_message": step.result.error_message,
                "screenshot_path": rel_shot,
            })

    # Chronological steps
    steps: List[Dict[str, Any]] = []
    for step in run_result.history:
        rel_shot = relativize_path(step.screenshot_path, base_dir)
        steps.append({
            "step_number": step.step_number,
            "action_type": step.decision.action.action_type,
            "action_details": extract_action_details(step.decision.action),
            "decision": step.decision.decision,
            "observation_summary": step.decision.observation_summary,
            "result": {
                "success": step.result.success,
                "duration_ms": step.result.duration_ms,
                "resolved_by": step.result.resolved_by,
                "error_message": step.result.error_message,
            },
            "screenshot_path": rel_shot,
        })

    # Also inspect run directory for any additional screenshots on disk (e.g. initial, stagnation)
    shots_dir = base_dir / "screenshots"
    if shots_dir.is_dir():
        for p in sorted(shots_dir.glob("*.png")):
            rel_p = relativize_path(str(p), base_dir)
            if rel_p and rel_p not in collected_screenshots:
                collected_screenshots.append(rel_p)

    diagnosis_dict = None
    if run_result.failure_diagnosis:
        diagnosis_dict = run_result.failure_diagnosis.model_dump()

    return {
        "run_id": run_result.run_id or base_dir.name,
        "goal": run_result.goal or "",
        "target_url": run_result.target_url or "",
        "success": run_result.success,
        "termination_reason": run_result.termination_reason,
        "message": run_result.message,
        "duration_ms": run_result.duration_ms,
        "steps_executed": run_result.steps_executed,
        "diagnosis": diagnosis_dict,
        "assertions": assertions,
        "steps": steps,
        "diagnostics": run_result.diagnostics or {},
        "screenshots": collected_screenshots,
        "authenticated": getattr(run_result, "authenticated", False),
        "storage_state": bool(getattr(run_result, "authenticated", False)),
    }


def build_markdown_report(run_result: AgentRunResult, run_dir: Path) -> str:
    """Generate a clean, human-readable Markdown summary report for the test run."""
    base_dir = Path(run_dir).resolve()
    run_id = run_result.run_id or base_dir.name
    status_str = "**PASSED**" if run_result.success else "**FAILED**"
    duration_s = f"{run_result.duration_ms / 1000:.2f}s"
    is_auth = getattr(run_result, "authenticated", False)

    lines: List[str] = [
        f"# Test Execution Report: `{run_id}`\n",
        "## Summary",
        f"- **Status**: {status_str}",
        f"- **Goal**: {run_result.goal or 'N/A'}",
        f"- **Target URL**: {run_result.target_url or 'N/A'}",
        f"- **Termination Reason**: `{run_result.termination_reason}`",
        f"- **Steps Executed**: {run_result.steps_executed}",
        f"- **Duration**: {run_result.duration_ms} ms ({duration_s})",
        f"- **Authenticated Session**: {'Yes' if is_auth else 'No'}",
        f"- **Outcome Message**: {run_result.message}\n",
    ]

    # Failure Diagnosis Section if run failed
    if run_result.failure_diagnosis:
        fd = run_result.failure_diagnosis
        lines.append("## Failure Diagnosis")
        lines.append(f"- **Classification**: `{fd.classification}`")
        lines.append(f"- **Cause**: `{fd.cause}`")
        lines.append(f"- **Summary**: {fd.summary}\n")

    # Deterministic Verification Section
    lines.append("## Deterministic Verification")
    lines.append(
        "> Deterministic browser assertions evaluate pass/fail authority. "
        "LLM self-declaration is never treated as proof of success.\n"
    )

    assertion_records = [
        step for step in run_result.history
        if getattr(step.decision.action, "action_type", None) == "assert"
    ]

    if assertion_records:
        lines.append("| Step | Assertion Type | Target / Locator | Expected Value | Status | Error Details | Evidence |")
        lines.append("| :--- | :--- | :--- | :--- | :--- | :--- | :--- |")
        for step in assertion_records:
            act: AssertAction = step.decision.action  # type: ignore[assignment]
            target_parts = []
            if act.role:
                target_parts.append(f"role={act.role}")
            if act.name:
                target_parts.append(f"name='{act.name}'")
            if act.text:
                target_parts.append(f"text='{act.text}'")
            if act.placeholder:
                target_parts.append(f"placeholder='{act.placeholder}'")
            if act.label:
                target_parts.append(f"label='{act.label}'")
            if act.selector:
                target_parts.append(f"selector='{act.selector}'")
            target_str = ", ".join(target_parts) or "(page)"

            expected = act.expected_value or "-"
            pass_fail = "**PASSED**" if step.result.success else "**FAILED**"
            err = step.result.error_message or "-"
            rel_shot = relativize_path(step.screenshot_path, base_dir)
            shot_link = f"[Screenshot]({rel_shot})" if rel_shot else "-"

            lines.append(
                f"| {step.step_number} | `{act.assertion_type}` | `{target_str}` | {expected} | {pass_fail} | {err} | {shot_link} |"
            )
        lines.append("")
    else:
        lines.append("*No deterministic assertions were executed during this run.*\n")

    # Execution Steps Trace
    lines.append("## Execution Steps Trace")
    if run_result.history:
        lines.append("| Step | Action | Outcome | Resolved By | Decision Rationale | Evidence |")
        lines.append("| :--- | :--- | :--- | :--- | :--- | :--- |")
        for step in run_result.history:
            action_desc = format_action_label(step.decision.action)
            res_status = "SUCCESS" if step.result.success else f"FAILED: {step.result.error_message or 'error'}"
            resolved = step.result.resolved_by or "-"
            rationale = step.decision.decision.replace("\n", " ").strip()
            if len(rationale) > 80:
                rationale = rationale[:77] + "..."
            rel_shot = relativize_path(step.screenshot_path, base_dir)
            shot_link = f"[Screenshot]({rel_shot})" if rel_shot else "-"

            lines.append(
                f"| {step.step_number} | `{action_desc}` | {res_status} | `{resolved}` | {rationale} | {shot_link} |"
            )
        lines.append("")
    else:
        lines.append("*No steps executed.*\n")

    # Browser Diagnostics
    lines.append("## Browser Diagnostics")
    diag = run_result.diagnostics or {}
    console_errs = diag.get("console_errors", 0)
    page_errs = diag.get("page_errors", 0)
    failed_reqs = diag.get("failed_requests", 0)

    lines.append(f"- **Console Errors**: {console_errs}")
    lines.append(f"- **Page Exceptions**: {page_errs}")
    lines.append(f"- **Failed Network Requests (HTTP >= 400)**: {failed_reqs}")

    recent_console = diag.get("recent_console_errors", [])
    if recent_console:
        lines.append("\n### Recent Console Errors")
        for err in recent_console:
            lines.append(f"- `{err}`")

    recent_failed_http = diag.get("recent_failed_requests", [])
    if recent_failed_http:
        lines.append("\n### Failed HTTP Requests")
        for req in recent_failed_http:
            lines.append(f"- `{req}`")
    lines.append("")

    # Visual Evidence
    lines.append("## Visual Evidence")
    shots_dir = base_dir / "screenshots"
    found_shots: List[Tuple[str, str]] = []
    if shots_dir.is_dir():
        for p in sorted(shots_dir.glob("*.png")):
            rel_p = relativize_path(str(p), base_dir)
            if rel_p:
                found_shots.append((p.stem.replace("_", " ").title(), rel_p))

    if found_shots:
        for label, rel_path in found_shots:
            lines.append(f"- [{label}]({rel_path})")
    else:
        lines.append("*No screenshot artifacts captured for this run.*")
    lines.append("")

    return "\n".join(lines)


def write_reports(run_result: AgentRunResult, run_dir: Path) -> Tuple[Path, Path]:
    """Serialize and write report.json and report.md to the specified run directory."""
    target_dir = Path(run_dir).resolve()
    target_dir.mkdir(parents=True, exist_ok=True)

    json_data = build_json_report(run_result, target_dir)
    json_path = target_dir / "report.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(json_data, f, indent=2)

    md_content = build_markdown_report(run_result, target_dir)
    md_path = target_dir / "report.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    return (json_path, md_path)
