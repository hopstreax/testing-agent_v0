"""Unit tests for reporting module and artifact generation."""

import json
from pathlib import Path
import pytest

from app.models.actions import (
    ActionResult,
    AssertAction,
    ClickAction,
    FillAction,
    FinishAction,
    HoverAction,
    NavigateAction,
    ObservationPayload,
    ScrollAction,
    StepDecision,
    StepRecord,
)
from app.models.agent import AgentRunResult
from app.reporting import (
    build_json_report,
    build_markdown_report,
    extract_action_details,
    format_action_label,
    relativize_path,
    write_reports,
)


def test_relativize_path_basic(tmp_path: Path) -> None:
    base = tmp_path / "run_01"
    shot = base / "screenshots" / "step_00_initial.png"

    rel = relativize_path(str(shot), base)
    assert rel == "screenshots/step_00_initial.png"


def test_relativize_path_none_and_relative() -> None:
    assert relativize_path(None, Path("/tmp")) is None
    assert relativize_path("", Path("/tmp")) is None
    assert relativize_path("screenshots/step_01.png", Path("/tmp")) == "screenshots/step_01.png"


def test_format_action_label() -> None:
    assert "click" in format_action_label(ClickAction(role="button", name="Submit"))
    assert "fill" in format_action_label(FillAction(role="textbox", name="User", value="alice"))
    assert "navigate" in format_action_label(NavigateAction(url="https://example.com"))
    assert "assert" in format_action_label(AssertAction(assertion_type="visible", role="heading"))
    assert format_action_label(AssertAction(assertion_type="enabled", role="button", name="Submit")) == "assert(enabled, Submit)"
    assert format_action_label(AssertAction(assertion_type="has_count", selector=".items", expected_value="4")) == "assert(has_count=4, .items)"
    assert "finish" in format_action_label(FinishAction(success=True, message="Done"))
    assert format_action_label(ScrollAction(direction="down", amount=500)) == "scroll down 500px"
    assert format_action_label(ScrollAction(direction="up", amount=250)) == "scroll up 250px"
    assert format_action_label(HoverAction(role="button", name="Menu")) == "hover(Menu)"


def test_extract_action_details() -> None:
    act = AssertAction(assertion_type="has_text", role="heading", name="Welcome", expected_value="Hello")
    details = extract_action_details(act)
    assert details["action_type"] == "assert"
    assert details["assertion_type"] == "has_text"
    assert details["role"] == "heading"
    assert details["expected_value"] == "Hello"

    scroll_details = extract_action_details(ScrollAction(direction="down", amount=400))
    assert scroll_details["action_type"] == "scroll"
    assert scroll_details["direction"] == "down"
    assert scroll_details["amount"] == 400

    hover_details = extract_action_details(HoverAction(role="link", name="Pricing"))
    assert hover_details["action_type"] == "hover"
    assert hover_details["role"] == "link"
    assert hover_details["name"] == "Pricing"


def test_build_json_report_structure(tmp_path: Path) -> None:
    run_dir = tmp_path / "test_run"
    run_dir.mkdir(parents=True)
    shot_dir = run_dir / "screenshots"
    shot_dir.mkdir()
    (shot_dir / "step_00_initial.png").write_text("fake_png")
    (shot_dir / "step_02_assert_success.png").write_text("fake_png")

    obs = ObservationPayload(url="https://example.com", title="Example", aria_snapshot="- heading")
    history = [
        StepRecord(
            step_number=1,
            observation=obs,
            decision=StepDecision(
                observation_summary="Page loaded",
                decision="Click submit button",
                action=ClickAction(role="button", name="Submit"),
            ),
            result=ActionResult(success=True, action_type="click", duration_ms=50, resolved_by="role=button"),
            screenshot_path=None,
        ),
        StepRecord(
            step_number=2,
            observation=obs,
            decision=StepDecision(
                observation_summary="Submitted",
                decision="Verify success heading",
                action=AssertAction(assertion_type="has_text", role="heading", name="Success", expected_value="Welcome"),
            ),
            result=ActionResult(success=True, action_type="assert", duration_ms=30, resolved_by="expect.to_contain_text"),
            screenshot_path=str(shot_dir / "step_02_assert_success.png"),
        ),
        StepRecord(
            step_number=3,
            observation=obs,
            decision=StepDecision(
                observation_summary="Verified",
                decision="Goal achieved",
                action=FinishAction(success=True, message="Login flow verified successfully"),
            ),
            result=ActionResult(success=True, action_type="finish", duration_ms=0, resolved_by="agent.finish"),
            screenshot_path=None,
        ),
    ]

    run_result = AgentRunResult(
        success=True,
        termination_reason="goal_achieved",
        message="Login flow verified successfully",
        steps_executed=3,
        history=history,
        duration_ms=1500,
        diagnostics={"console_errors": 0, "page_errors": 0, "failed_requests": 0},
        run_id="20260911_120000_abc123",
        goal="Test login flow",
        target_url="https://example.com",
    )

    report_dict = build_json_report(run_result, run_dir)

    assert report_dict["run_id"] == "20260911_120000_abc123"
    assert report_dict["goal"] == "Test login flow"
    assert report_dict["target_url"] == "https://example.com"
    assert report_dict["success"] is True
    assert report_dict["termination_reason"] == "goal_achieved"
    assert report_dict["duration_ms"] == 1500
    assert report_dict["steps_executed"] == 3

    # Assertions extracted
    assert len(report_dict["assertions"]) == 1
    assert report_dict["assertions"][0]["assertion_type"] == "has_text"
    assert report_dict["assertions"][0]["expected_value"] == "Welcome"
    assert report_dict["assertions"][0]["success"] is True
    assert report_dict["assertions"][0]["screenshot_path"] == "screenshots/step_02_assert_success.png"

    # Steps info
    assert len(report_dict["steps"]) == 3
    assert report_dict["steps"][0]["action_type"] == "click"
    assert report_dict["steps"][1]["action_type"] == "assert"
    assert report_dict["steps"][2]["action_type"] == "finish"

    # Screenshots list contains relative paths
    assert "screenshots/step_00_initial.png" in report_dict["screenshots"]
    assert "screenshots/step_02_assert_success.png" in report_dict["screenshots"]


def test_build_markdown_report_structure(tmp_path: Path) -> None:
    run_dir = tmp_path / "test_run_md"
    run_dir.mkdir(parents=True)

    obs = ObservationPayload(url="https://example.com", title="Example", aria_snapshot="- heading")
    history = [
        StepRecord(
            step_number=1,
            observation=obs,
            decision=StepDecision(
                observation_summary="Page loaded",
                decision="Verify heading is visible",
                action=AssertAction(assertion_type="visible", role="heading", name="Example"),
            ),
            result=ActionResult(success=True, action_type="assert", duration_ms=25, resolved_by="role=heading"),
            screenshot_path="screenshots/step_01_assert_success.png",
        ),
    ]

    run_result = AgentRunResult(
        success=True,
        termination_reason="goal_achieved",
        message="Heading verified",
        steps_executed=1,
        history=history,
        duration_ms=800,
        diagnostics={"console_errors": 0, "page_errors": 0, "failed_requests": 0},
        run_id="run_md_123",
        goal="Verify example heading",
        target_url="https://example.com",
    )

    md = build_markdown_report(run_result, run_dir)

    assert "# Test Execution Report: `run_md_123`" in md
    assert "**Status**: **PASSED**" in md
    assert "- **Goal**: Verify example heading" in md
    assert "- **Target URL**: https://example.com" in md
    assert "## Deterministic Verification" in md
    assert "| 1 | `visible` | `role=heading, name='Example'` | - | **PASSED** | - | [Screenshot](screenshots/step_01_assert_success.png) |" in md
    assert "## Execution Steps Trace" in md
    assert "## Browser Diagnostics" in md


def test_write_reports_file_persistence(tmp_path: Path) -> None:
    run_dir = tmp_path / "run_persist"
    run_result = AgentRunResult(
        success=False,
        termination_reason="goal_failed",
        message="Assertion failed",
        steps_executed=1,
        history=[],
        duration_ms=400,
        diagnostics={"console_errors": 1, "recent_console_errors": ["Error: 404 not found"]},
        run_id="run_fail_999",
        goal="Fail intentionally",
        target_url="https://fail.example.com",
    )

    json_path, md_path = write_reports(run_result, run_dir)

    assert json_path.exists()
    assert md_path.exists()
    assert json_path.name == "report.json"
    assert md_path.name == "report.md"

    # Verify JSON content is valid
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert data["success"] is False
    assert data["termination_reason"] == "goal_failed"
    assert data["diagnostics"]["console_errors"] == 1

    # Verify MD content
    md_text = md_path.read_text(encoding="utf-8")
    assert "**FAILED**" in md_text
    assert "Error: 404 not found" in md_text


def test_report_authenticated_indicators(tmp_path: Path) -> None:
    """Verify JSON and Markdown reports indicate authenticated session without leaking secrets."""
    run_dir = tmp_path / "run_auth_report"
    run_dir.mkdir(parents=True)

    run_result = AgentRunResult(
        success=True,
        termination_reason="goal_achieved",
        message="Protected view verified",
        steps_executed=1,
        history=[],
        duration_ms=500,
        run_id="run_auth_777",
        goal="Test dashboard",
        target_url="https://app.example.com/dashboard",
        authenticated=True,
    )

    json_report = build_json_report(run_result, run_dir)
    assert json_report["authenticated"] is True
    assert json_report["storage_state"] is True
    # Ensure no secrets leak
    assert "cookies" not in json_report
    assert "token" not in json_report

    md_report = build_markdown_report(run_result, run_dir)
    assert "- **Authenticated Session**: Yes" in md_report


def test_reporting_m63_assertions(tmp_path: Path) -> None:
    """Verify JSON and Markdown reports accurately capture all five M6.3 assertion types."""
    run_dir = tmp_path / "run_m63_report"
    run_dir.mkdir(parents=True)

    obs = ObservationPayload(url="https://example.com", title="Test M6.3", aria_snapshot="")
    steps = [
        StepRecord(
            step_number=1,
            observation=obs,
            decision=StepDecision(observation_summary="Step 1", decision="Assert disabled", action=AssertAction(assertion_type="disabled", selector="#btn-submit")),
            result=ActionResult(success=True, action_type="assert", duration_ms=20, resolved_by="selector='#btn-submit'"),
        ),
        StepRecord(
            step_number=2,
            observation=obs,
            decision=StepDecision(observation_summary="Step 2", decision="Assert checked", action=AssertAction(assertion_type="checked", role="checkbox", name="Agree")),
            result=ActionResult(success=True, action_type="assert", duration_ms=25, resolved_by="role=checkbox, name=Agree"),
        ),
        StepRecord(
            step_number=3,
            observation=obs,
            decision=StepDecision(observation_summary="Step 3", decision="Assert unchecked", action=AssertAction(assertion_type="unchecked", selector="#terms")),
            result=ActionResult(success=True, action_type="assert", duration_ms=18, resolved_by="selector='#terms'"),
        ),
        StepRecord(
            step_number=4,
            observation=obs,
            decision=StepDecision(observation_summary="Step 4", decision="Assert enabled", action=AssertAction(assertion_type="enabled", role="button", name="Submit")),
            result=ActionResult(success=True, action_type="assert", duration_ms=30, resolved_by="role=button, name=Submit"),
        ),
        StepRecord(
            step_number=5,
            observation=obs,
            decision=StepDecision(observation_summary="Step 5", decision="Assert has_count", action=AssertAction(assertion_type="has_count", selector=".item", expected_value="3")),
            result=ActionResult(success=True, action_type="assert", duration_ms=15, resolved_by="selector='.item'"),
        ),
    ]

    run_result = AgentRunResult(
        success=True,
        termination_reason="goal_achieved",
        message="All M6.3 assertions passed",
        steps_executed=5,
        history=steps,
        duration_ms=450,
        run_id="run_m63_test",
        goal="Test M6.3 reporting",
        target_url="https://example.com",
    )

    json_data = build_json_report(run_result, run_dir)
    assert len(json_data["assertions"]) == 5
    assert [a["assertion_type"] for a in json_data["assertions"]] == [
        "disabled", "checked", "unchecked", "enabled", "has_count"
    ]
    assert json_data["assertions"][4]["expected_value"] == "3"

    md = build_markdown_report(run_result, run_dir)
    assert "`disabled`" in md
    assert "`checked`" in md
    assert "`unchecked`" in md
    assert "`enabled`" in md
    assert "`has_count`" in md
    assert "| 5 | `has_count` | `selector='.item'` | 3 | **PASSED** |" in md


def test_reporting_m65_index(tmp_path: Path) -> None:
    """Verify that index appears in action details and formatted labels for M6.5."""
    click_act = ClickAction(role="button", name="Delete", index=1)
    details = extract_action_details(click_act)
    assert details.get("index") == 1

    label = format_action_label(click_act)
    assert "Delete [index=1]" in label

    assert_act = AssertAction(assertion_type="visible", selector=".row-btn", index=2)
    assert_details = extract_action_details(assert_act)
    assert assert_details.get("index") == 2
    assert_label = format_action_label(assert_act)
    assert ".row-btn [index=2]" in assert_label

    obs = ObservationPayload(url="https://example.com", title="Test", aria_snapshot="- button Delete")
    step = StepRecord(
        step_number=1,
        observation=obs,
        decision=StepDecision(observation_summary="Items listed", decision="Click second delete", action=click_act),
        result=ActionResult(success=True, action_type="click", duration_ms=25, resolved_by="role=button, name=Delete [index=1]"),
    )
    run_result = AgentRunResult(
        success=True,
        termination_reason="goal_achieved",
        message="Done",
        steps_executed=1,
        history=[step],
        duration_ms=100,
        run_id="run_m65",
        goal="Test M6.5 index reporting",
        target_url="https://example.com",
    )
    json_data = build_json_report(run_result, tmp_path)
    assert json_data["steps"][0]["action_details"]["index"] == 1

    md = build_markdown_report(run_result, tmp_path)
    assert "Delete [index=1]" in md
