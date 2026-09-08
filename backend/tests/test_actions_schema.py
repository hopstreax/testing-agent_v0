"""Unit tests for Pydantic action models, decisions, records, and serialization."""

import pytest
from pydantic import TypeAdapter, ValidationError
from app.models.actions import (
    ActionResult,
    AgentAction,
    ClickAction,
    FillAction,
    FinishAction,
    NavigateAction,
    ObservationPayload,
    StepDecision,
    StepRecord,
)


def test_click_action_defaults():
    action = ClickAction(role="button", name="Submit")
    assert action.action_type == "click"
    assert action.role == "button"
    assert action.name == "Submit"
    assert action.button == "left"
    assert action.click_count == 1


def test_click_action_custom():
    action = ClickAction(selector="#menu", button="right", click_count=2)
    assert action.action_type == "click"
    assert action.selector == "#menu"
    assert action.button == "right"
    assert action.click_count == 2


def test_fill_action():
    action = FillAction(placeholder="Email", value="user@example.com")
    assert action.action_type == "fill"
    assert action.placeholder == "Email"
    assert action.value == "user@example.com"


def test_fill_action_missing_value():
    with pytest.raises(ValidationError):
        FillAction(placeholder="Email")  # type: ignore


def test_discriminated_agent_action():
    adapter = TypeAdapter(AgentAction)

    click_data = {"action_type": "click", "role": "button", "name": "Login"}
    parsed_click = adapter.validate_python(click_data)
    assert isinstance(parsed_click, ClickAction)

    fill_data = {"action_type": "fill", "label": "Username", "value": "testuser"}
    parsed_fill = adapter.validate_python(fill_data)
    assert isinstance(parsed_fill, FillAction)

    nav_data = {"action_type": "navigate", "url": "https://example.com"}
    parsed_nav = adapter.validate_python(nav_data)
    assert isinstance(parsed_nav, NavigateAction)

    finish_data = {"action_type": "finish", "success": True, "message": "Test passed"}
    parsed_finish = adapter.validate_python(finish_data)
    assert isinstance(parsed_finish, FinishAction)

    with pytest.raises(ValidationError):
        adapter.validate_python({"action_type": "unknown_action"})


def test_action_result_and_observation_payload():
    result = ActionResult(
        success=True,
        action_type="click",
        duration_ms=125,
        resolved_by="role=button, name=Login",
    )
    assert result.success is True
    assert result.error_message is None

    observation = ObservationPayload(
        url="https://example.com",
        title="Example Domain",
        aria_snapshot="- heading 'Example Domain'",
        screenshot_path="/tmp/shot.png",
    )
    assert observation.url == "https://example.com"
    assert observation.screenshot_path == "/tmp/shot.png"
    assert observation.timestamp > 0


def test_navigate_action_valid():
    nav1 = NavigateAction(url="https://the-internet.herokuapp.com/login")
    assert nav1.action_type == "navigate"
    assert nav1.url == "https://the-internet.herokuapp.com/login"

    nav2 = NavigateAction(url="  http://localhost:3000/dashboard  ")
    assert nav2.url == "http://localhost:3000/dashboard"


@pytest.mark.parametrize("invalid_url", [
    "",
    "   ",
    "example.com/login",
    "javascript:alert(1)",
    "file:///C:/passwords.txt",
    "data:text/html,<h1>hi</h1>",
    "ftp://files.example.com",
])
def test_navigate_action_invalid_urls(invalid_url):
    with pytest.raises(ValidationError):
        NavigateAction(url=invalid_url)


def test_finish_action_success_and_failure():
    finish_pass = FinishAction(success=True, message="User profile successfully verified.")
    assert finish_pass.action_type == "finish"
    assert finish_pass.success is True
    assert finish_pass.message == "User profile successfully verified."

    finish_fail = FinishAction(success=False, message="Login failed: Invalid credentials alert shown.")
    assert finish_fail.success is False
    assert finish_fail.message == "Login failed: Invalid credentials alert shown."


@pytest.mark.parametrize("invalid_msg", ["", "   "])
def test_finish_action_invalid_message(invalid_msg):
    with pytest.raises(ValidationError):
        FinishAction(success=True, message=invalid_msg)


def test_step_decision_with_all_action_types():
    # 1. Click
    d_click = StepDecision(
        observation_summary="Login button is active.",
        decision="Clicking login button to submit.",
        action=ClickAction(role="button", name="Log in"),
    )
    assert isinstance(d_click.action, ClickAction)

    # 2. Fill
    d_fill = StepDecision(
        observation_summary="Username input is empty.",
        decision="Entering credentials into field.",
        action=FillAction(role="textbox", name="Username", value="admin"),
    )
    assert isinstance(d_fill.action, FillAction)

    # 3. Navigate
    d_nav = StepDecision(
        observation_summary="Page loaded incorrectly.",
        decision="Navigating back to main login entry point.",
        action=NavigateAction(url="https://example.com/login"),
    )
    assert isinstance(d_nav.action, NavigateAction)

    # 4. Finish
    d_finish = StepDecision(
        observation_summary="Dashboard welcome banner visible.",
        decision="Goal verified successfully. Concluding test run.",
        action=FinishAction(success=True, message="Completed."),
    )
    assert isinstance(d_finish.action, FinishAction)


@pytest.mark.parametrize("bad_field", ["", "   "])
def test_step_decision_rejects_empty_fields(bad_field):
    action = ClickAction(role="button", name="OK")
    with pytest.raises(ValidationError):
        StepDecision(observation_summary=bad_field, decision="Valid decision", action=action)

    with pytest.raises(ValidationError):
        StepDecision(observation_summary="Valid summary", decision=bad_field, action=action)


def test_step_decision_serialization_roundtrip():
    decision = StepDecision(
        observation_summary="Form fields populated.",
        decision="Submitting registration.",
        action=ClickAction(role="button", name="Submit"),
    )

    json_str = decision.model_dump_json()
    reconstituted = StepDecision.model_validate_json(json_str)

    assert reconstituted == decision
    assert isinstance(reconstituted.action, ClickAction)
    assert reconstituted.action.name == "Submit"


def test_step_record_construction_and_validation():
    observation = ObservationPayload(
        url="https://example.com",
        title="Example",
        aria_snapshot="- button 'Submit'",
    )
    decision = StepDecision(
        observation_summary="Submit button visible.",
        decision="Clicking submit.",
        action=ClickAction(role="button", name="Submit"),
    )
    result = ActionResult(
        success=True,
        action_type="click",
        duration_ms=145,
        resolved_by="role=button, name=Submit",
    )

    record = StepRecord(
        step_number=1,
        observation=observation,
        decision=decision,
        result=result,
    )

    assert record.step_number == 1
    assert record.observation.url == "https://example.com"
    assert record.decision.action.action_type == "click"
    assert record.result.success is True
    assert record.timestamp > 0

    # Test step_number boundary (must be >= 1)
    with pytest.raises(ValidationError):
        StepRecord(
            step_number=0,
            observation=observation,
            decision=decision,
            result=result,
        )
