"""Unit tests for Pydantic action models, decisions, records, and serialization."""

import pytest
from pydantic import TypeAdapter, ValidationError
from app.models.actions import (
    ActionResult,
    AgentAction,
    AssertAction,
    ClickAction,
    FillAction,
    FinishAction,
    HoverAction,
    NavigateAction,
    ObservationPayload,
    PressKeyAction,
    ScrollAction,
    SelectAction,
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

    assert_data = {
        "action_type": "assert",
        "assertion_type": "visible",
        "role": "button",
        "name": "Submit",
    }
    parsed_assert = adapter.validate_python(assert_data)
    assert isinstance(parsed_assert, AssertAction)

    finish_data = {"action_type": "finish", "success": True, "message": "Test passed"}
    parsed_finish = adapter.validate_python(finish_data)
    assert isinstance(parsed_finish, FinishAction)

    with pytest.raises(ValidationError):
        adapter.validate_python({"action_type": "unknown_action"})


def test_assert_action_visible_hidden_valid():
    a1 = AssertAction(assertion_type="visible", role="button", name="Submit")
    assert a1.action_type == "assert"
    assert a1.assertion_type == "visible"
    assert a1.role == "button"
    assert a1.name == "Submit"

    a2 = AssertAction(assertion_type="hidden", selector="#loading-spinner")
    assert a2.action_type == "assert"
    assert a2.assertion_type == "hidden"
    assert a2.selector == "#loading-spinner"


def test_assert_action_has_text_has_value_valid():
    a1 = AssertAction(assertion_type="has_text", role="heading", expected_value="Welcome Alice")
    assert a1.action_type == "assert"
    assert a1.assertion_type == "has_text"
    assert a1.expected_value == "Welcome Alice"

    a2 = AssertAction(assertion_type="has_value", placeholder="Email", expected_value="alice@example.com")
    assert a2.action_type == "assert"
    assert a2.assertion_type == "has_value"
    assert a2.expected_value == "alice@example.com"


def test_assert_action_has_url_has_title_valid():
    a1 = AssertAction(assertion_type="has_url", expected_value="https://example.com/dashboard")
    assert a1.action_type == "assert"
    assert a1.assertion_type == "has_url"
    assert a1.expected_value == "https://example.com/dashboard"
    # Page-level assertions do not require locator fields
    assert a1.role is None
    assert a1.selector is None

    a2 = AssertAction(assertion_type="has_title", expected_value="Dashboard - MyApp")
    assert a2.action_type == "assert"
    assert a2.assertion_type == "has_title"
    assert a2.expected_value == "Dashboard - MyApp"


def test_assert_action_missing_locator_rejected():
    # Element assertions without any locator criteria must fail validation
    with pytest.raises(ValidationError, match="requires at least one locator criterion"):
        AssertAction(assertion_type="visible")

    with pytest.raises(ValidationError, match="requires at least one locator criterion"):
        AssertAction(assertion_type="hidden")

    with pytest.raises(ValidationError, match="requires at least one locator criterion"):
        AssertAction(assertion_type="has_text", expected_value="Hello")

    with pytest.raises(ValidationError, match="requires at least one locator criterion"):
        AssertAction(assertion_type="has_value", expected_value="John")


@pytest.mark.parametrize("empty_val", [None, "", "   "])
def test_assert_action_missing_expected_value_rejected(empty_val):
    # has_url and has_title require non-empty expected_value
    with pytest.raises(ValidationError, match="requires a non-empty 'expected_value'"):
        AssertAction(assertion_type="has_url", expected_value=empty_val)

    with pytest.raises(ValidationError, match="requires a non-empty 'expected_value'"):
        AssertAction(assertion_type="has_title", expected_value=empty_val)

    # has_text and has_value require non-empty expected_value
    with pytest.raises(ValidationError, match="requires a non-empty 'expected_value'"):
        AssertAction(assertion_type="has_text", role="button", name="OK", expected_value=empty_val)

    with pytest.raises(ValidationError, match="requires a non-empty 'expected_value'"):
        AssertAction(assertion_type="has_value", role="textbox", expected_value=empty_val)


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

    # 4. Assert
    d_assert = StepDecision(
        observation_summary="Success message banner is visible.",
        decision="Verifying presence of confirmation text.",
        action=AssertAction(assertion_type="has_text", selector=".alert", expected_value="Order confirmed"),
    )
    assert isinstance(d_assert.action, AssertAction)

    # 5. Finish
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


def test_step_decision_assert_serialization_roundtrip():
    decision = StepDecision(
        observation_summary="Checking heading.",
        decision="Verify landing heading.",
        action=AssertAction(assertion_type="has_text", role="heading", name="Welcome", expected_value="Welcome"),
    )

    json_str = decision.model_dump_json()
    reconstituted = StepDecision.model_validate_json(json_str)

    assert reconstituted == decision
    assert isinstance(reconstituted.action, AssertAction)
    assert reconstituted.action.expected_value == "Welcome"


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


# =============================================================================
# Milestone 3 — Slice 2: PressKeyAction and SelectAction Schema Tests
# =============================================================================

def test_valid_press_key_action_with_locator():
    action = PressKeyAction(key="Enter", role="textbox", name="Search")
    assert action.action_type == "press_key"
    assert action.key == "Enter"
    assert action.role == "textbox"
    assert action.name == "Search"


def test_valid_press_key_action_without_locator():
    action = PressKeyAction(key="Escape")
    assert action.action_type == "press_key"
    assert action.key == "Escape"
    assert action.role is None
    assert action.selector is None


def test_invalid_unsupported_key_rejected():
    with pytest.raises(ValidationError):
        PressKeyAction(key="F1")

    with pytest.raises(ValidationError):
        PressKeyAction(key="Control+C")

    with pytest.raises(ValidationError):
        PressKeyAction(key="Space")


def test_valid_select_action_by_value():
    action = SelectAction(role="combobox", name="Country", value="US")
    assert action.action_type == "select"
    assert action.role == "combobox"
    assert action.name == "Country"
    assert action.value == "US"
    assert action.label is None


def test_valid_select_action_by_label():
    action = SelectAction(selector="#country-select", label="United States")
    assert action.action_type == "select"
    assert action.selector == "#country-select"
    assert action.label == "United States"
    assert action.value is None


def test_select_action_missing_locator_rejected():
    with pytest.raises(ValidationError) as exc:
        SelectAction(value="US")
    assert "requires at least one locator criterion" in str(exc.value)


def test_select_action_missing_option_criterion_rejected():
    with pytest.raises(ValidationError) as exc:
        SelectAction(selector="#dropdown")
    assert "requires either 'value' or 'label'" in str(exc.value)


def test_select_action_ambiguous_value_and_label_rejected():
    with pytest.raises(ValidationError) as exc:
        SelectAction(selector="#dropdown", value="US", label="United States")
    assert "cannot specify both 'value' and 'label'" in str(exc.value)


def test_step_decision_deserialization_press_key_and_select():
    # PressKeyAction roundtrip
    dec_press = StepDecision(
        observation_summary="Search input focused.",
        decision="Press Enter to submit search.",
        action=PressKeyAction(key="Enter", role="textbox", name="Search"),
    )
    json_press = dec_press.model_dump_json()
    reconstituted_press = StepDecision.model_validate_json(json_press)
    assert isinstance(reconstituted_press.action, PressKeyAction)
    assert reconstituted_press.action.key == "Enter"
    assert reconstituted_press == dec_press

    # SelectAction roundtrip
    dec_select = StepDecision(
        observation_summary="Country dropdown visible.",
        decision="Select US country option.",
        action=SelectAction(role="combobox", name="Country", value="US"),
    )
    json_select = dec_select.model_dump_json()
    reconstituted_select = StepDecision.model_validate_json(json_select)
    assert isinstance(reconstituted_select.action, SelectAction)
    assert reconstituted_select.action.value == "US"
    assert reconstituted_select == dec_select


# ---------------------------------------------------------------------------
# M6.1 ScrollAction and HoverAction Tests
# ---------------------------------------------------------------------------

def test_scroll_action_defaults():
    """Test ScrollAction default values."""
    action = ScrollAction()
    assert action.action_type == "scroll"
    assert action.direction == "down"
    assert action.amount == 500


def test_scroll_action_custom():
    """Test ScrollAction with custom direction and amount."""
    action = ScrollAction(direction="up", amount=1200)
    assert action.action_type == "scroll"
    assert action.direction == "up"
    assert action.amount == 1200


def test_scroll_action_invalid_direction():
    """Test ScrollAction rejects invalid directions."""
    with pytest.raises(ValidationError):
        ScrollAction(direction="left")  # type: ignore


def test_scroll_action_invalid_amount():
    """Test ScrollAction rejects invalid amounts (ge=1, le=5000)."""
    with pytest.raises(ValidationError):
        ScrollAction(amount=0)
    with pytest.raises(ValidationError):
        ScrollAction(amount=10000)


def test_hover_action_valid():
    """Test HoverAction with valid locator criteria."""
    action = HoverAction(role="button", name="Solutions")
    assert action.action_type == "hover"
    assert action.role == "button"
    assert action.name == "Solutions"


def test_hover_action_missing_locator_rejected():
    """Test HoverAction rejects missing locator criteria."""
    with pytest.raises(ValidationError) as exc:
        HoverAction()
    assert "requires at least one locator criterion" in str(exc.value)


def test_agent_action_union_scroll_and_hover():
    """Test AgentAction discriminated union parses scroll and hover actions."""
    adapter = TypeAdapter(AgentAction)

    scroll_data = {"action_type": "scroll", "direction": "up", "amount": 350}
    parsed_scroll = adapter.validate_python(scroll_data)
    assert isinstance(parsed_scroll, ScrollAction)
    assert parsed_scroll.direction == "up"
    assert parsed_scroll.amount == 350

    hover_data = {"action_type": "hover", "selector": "#dropdown-nav"}
    parsed_hover = adapter.validate_python(hover_data)
    assert isinstance(parsed_hover, HoverAction)
    assert parsed_hover.selector == "#dropdown-nav"


def test_step_decision_deserialization_scroll_and_hover():
    """Test StepDecision roundtrip serialization for scroll and hover."""
    dec_scroll = StepDecision(
        observation_summary="Page loaded, target below fold.",
        decision="Scroll down to reveal footer.",
        action=ScrollAction(direction="down", amount=800),
    )
    json_scroll = dec_scroll.model_dump_json()
    reconstituted_scroll = StepDecision.model_validate_json(json_scroll)
    assert isinstance(reconstituted_scroll.action, ScrollAction)
    assert reconstituted_scroll.action.direction == "down"
    assert reconstituted_scroll.action.amount == 800

    dec_hover = StepDecision(
        observation_summary="Navigation bar visible.",
        decision="Hover over Products to reveal submenu.",
        action=HoverAction(role="menuitem", name="Products"),
    )
    json_hover = dec_hover.model_dump_json()
    reconstituted_hover = StepDecision.model_validate_json(json_hover)
    assert isinstance(reconstituted_hover.action, HoverAction)
    assert reconstituted_hover.action.name == "Products"
