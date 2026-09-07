"""Unit tests for Pydantic action models and serialization."""

import pytest
from pydantic import TypeAdapter, ValidationError
from app.models.actions import (
    ActionResult,
    AgentAction,
    ClickAction,
    FillAction,
    ObservationPayload,
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
