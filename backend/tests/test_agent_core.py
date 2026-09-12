"""Deterministic unit tests for AutonomousTestAgent and orchestration loop."""

import asyncio
from unittest.mock import AsyncMock, MagicMock
import pytest

from app.agent.orchestrator import AutonomousTestAgent
from app.browser.actions import ActionDispatcher
from app.browser.diagnostics import DiagnosticsCollector
from app.browser.observer import BrowserObserver
from app.llm.errors import AllProvidersFailedError
from app.llm.mock import MockLLMProvider
from app.models.actions import (
    ActionResult,
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
)


def make_mock_page(
    url: str = "https://example.com",
    title: str = "Example Domain",
    aria_snapshot: str = "- heading 'Welcome'\n- button 'Submit'",
) -> MagicMock:
    """Create a lightweight mock Patchright Page for deterministic testing."""
    mock_page = MagicMock()
    mock_page.url = url
    mock_page.title = AsyncMock(return_value=title)
    mock_page.aria_snapshot = AsyncMock(return_value=aria_snapshot)
    mock_page.screenshot = AsyncMock()
    mock_page.goto = AsyncMock()
    mock_page.evaluate = AsyncMock()

    mock_page.keyboard = MagicMock()
    mock_page.keyboard.press = AsyncMock()

    mock_page.mouse = MagicMock()
    mock_page.mouse.wheel = AsyncMock()

    # Mock locator ladder
    mock_locator = MagicMock()
    mock_locator.click = AsyncMock()
    mock_locator.fill = AsyncMock()
    mock_locator.press = AsyncMock()
    mock_locator.select_option = AsyncMock()
    mock_locator.hover = AsyncMock()
    mock_page.get_by_role = MagicMock(return_value=mock_locator)
    mock_page.get_by_text = MagicMock(return_value=mock_locator)
    mock_page.get_by_placeholder = MagicMock(return_value=mock_locator)
    mock_page.get_by_label = MagicMock(return_value=mock_locator)
    mock_page.locator = MagicMock(return_value=mock_locator)
    return mock_page


# =========================================================================
# ActionDispatcher NavigateAction Tests
# =========================================================================

async def test_dispatcher_executes_navigate_action() -> None:
    dispatcher = ActionDispatcher()
    mock_page = make_mock_page()
    action = NavigateAction(url="https://example.com/dashboard")

    result = await dispatcher.execute(mock_page, action)

    assert result.success is True
    assert result.action_type == "navigate"
    assert result.resolved_by == "page.goto"
    assert result.duration_ms >= 0
    assert result.error_message is None
    mock_page.goto.assert_awaited_once_with(
        "https://example.com/dashboard",
        timeout=7000,
        wait_until="domcontentloaded",
    )


async def test_dispatcher_executes_navigate_action_failure() -> None:
    dispatcher = ActionDispatcher()
    mock_page = make_mock_page()
    mock_page.goto = AsyncMock(side_effect=RuntimeError("net::ERR_CONNECTION_REFUSED"))
    action = NavigateAction(url="https://invalid.example.com")

    result = await dispatcher.execute(mock_page, action)

    assert result.success is False
    assert result.action_type == "navigate"
    assert "ERR_CONNECTION_REFUSED" in (result.error_message or "")


# =========================================================================
# AutonomousTestAgent Core Loop & Deterministic Verification Tests
# =========================================================================

async def test_agent_happy_path_success() -> None:
    """Happy path: Navigate -> Fill -> Click -> Assert -> Finish(success=True)."""
    mock_page = make_mock_page()

    provider = MockLLMProvider(script=[
        StepDecision(
            observation_summary="On home page.",
            decision="Navigate to login page.",
            action=NavigateAction(url="https://example.com/login"),
        ),
        StepDecision(
            observation_summary="On login page.",
            decision="Fill username field.",
            action=FillAction(role="textbox", name="Username", value="alice"),
        ),
        StepDecision(
            observation_summary="Username filled.",
            decision="Click submit button.",
            action=ClickAction(role="button", name="Submit"),
        ),
        StepDecision(
            observation_summary="Dashboard loaded.",
            decision="Verify welcome heading is visible.",
            action=AssertAction(assertion_type="visible", role="heading", name="Welcome"),
        ),
        StepDecision(
            observation_summary="Assertion verified.",
            decision="Goal satisfied.",
            action=FinishAction(success=True, message="Login flow verified successfully"),
        ),
    ])

    agent = AutonomousTestAgent(llm_provider=provider, max_steps=10)
    result = await agent.run(mock_page, goal="Test user login")

    assert result.success is True
    assert result.termination_reason == "goal_achieved"
    assert result.message == "Login flow verified successfully"
    assert result.steps_executed == 5
    assert len(result.history) == 5

    # Verify chronological step records
    assert result.history[0].step_number == 1
    assert result.history[0].decision.action.action_type == "navigate"
    assert result.history[1].step_number == 2
    assert result.history[1].decision.action.action_type == "fill"
    assert result.history[2].step_number == 3
    assert result.history[2].decision.action.action_type == "click"
    assert result.history[3].step_number == 4
    assert result.history[3].decision.action.action_type == "assert"
    assert result.history[3].result.success is True
    assert result.history[4].step_number == 5
    assert result.history[4].decision.action.action_type == "finish"
    assert result.history[4].result.success is True


async def test_agent_terminal_failure() -> None:
    """FinishAction(success=False) terminates immediately without requiring assertions."""
    mock_page = make_mock_page()

    provider = MockLLMProvider(script=[
        StepDecision(
            observation_summary="Error banner visible.",
            decision="Account locked.",
            action=FinishAction(success=False, message="User is blocked from logging in"),
        )
    ])

    agent = AutonomousTestAgent(llm_provider=provider)
    result = await agent.run(mock_page, goal="Test user login")

    assert result.success is False
    assert result.termination_reason == "goal_failed"
    assert result.message == "User is blocked from logging in"
    assert result.steps_executed == 1
    assert len(result.history) == 1
    assert result.history[0].result.success is False


async def test_agent_blocks_finish_success_without_prior_assertion() -> None:
    """Finish(success=True) without prior assertion is rejected, logs error, and lets agent recover."""
    mock_page = make_mock_page()

    provider = MockLLMProvider(script=[
        # Turn 1: LLM tries to finish with success prematurely
        StepDecision(
            observation_summary="Page loaded.",
            decision="Declare victory without checking.",
            action=FinishAction(success=True, message="Premature victory"),
        ),
        # Turn 2: LLM learns from rejection error in history and runs AssertAction
        StepDecision(
            observation_summary="Rejected finish observed in history.",
            decision="Run assertion to verify state.",
            action=AssertAction(assertion_type="visible", role="button", name="Submit"),
        ),
        # Turn 3: LLM finishes now that assertion succeeded
        StepDecision(
            observation_summary="Assertion succeeded.",
            decision="Finish now.",
            action=FinishAction(success=True, message="Properly verified victory"),
        ),
    ])

    agent = AutonomousTestAgent(llm_provider=provider, max_steps=10)
    result = await agent.run(mock_page, goal="Test anti-hallucination verification")

    assert result.success is True
    assert result.termination_reason == "goal_achieved"
    assert result.steps_executed == 3
    assert len(result.history) == 3

    # Check that turn 1 was recorded as a rejected finish
    assert result.history[0].step_number == 1
    assert result.history[0].decision.action.action_type == "finish"
    assert result.history[0].result.success is False
    assert result.history[0].result.resolved_by == "agent.finish_rejected"
    assert "requires at least one successful deterministic assertion" in (result.history[0].result.error_message or "")

    # Check turn 2 succeeded as an assertion
    assert result.history[1].step_number == 2
    assert result.history[1].decision.action.action_type == "assert"
    assert result.history[1].result.success is True

    # Check turn 3 concluded successfully
    assert result.history[2].step_number == 3
    assert result.history[2].result.success is True


async def test_agent_recovers_after_failed_assertion() -> None:
    """Failed assertion enters history and allows agent to recover on next turn."""
    mock_page = make_mock_page()

    dispatcher = ActionDispatcher()
    original_execute = dispatcher.execute
    call_count = 0

    async def custom_execute(page, action, timeout_ms=None):
        nonlocal call_count
        if isinstance(action, AssertAction):
            call_count += 1
            if call_count == 1:
                return ActionResult(
                    success=False,
                    action_type="assert",
                    duration_ms=40,
                    resolved_by="role=heading",
                    error_message="Assertion 'has_text' failed: Expected 'Expected Heading' but received 'Loading...'",
                )
        return await original_execute(page, action, timeout_ms)

    dispatcher.execute = custom_execute

    provider = MockLLMProvider(script=[
        # Turn 1: Assert fails
        StepDecision(
            observation_summary="Page loaded.",
            decision="Assert heading text.",
            action=AssertAction(assertion_type="has_text", role="heading", name="Title", expected_value="Expected Heading"),
        ),
        # Turn 2: LLM sees failure in history, tries alternate assertion which succeeds
        StepDecision(
            observation_summary="Observed assertion mismatch in history.",
            decision="Assert button visibility instead.",
            action=AssertAction(assertion_type="visible", role="button", name="Submit"),
        ),
        # Turn 3: Conclude
        StepDecision(
            observation_summary="Button verified.",
            decision="Conclude test.",
            action=FinishAction(success=True, message="Recovered from assertion failure"),
        ),
    ])

    agent = AutonomousTestAgent(llm_provider=provider, dispatcher=dispatcher, max_steps=10)
    result = await agent.run(mock_page, goal="Test assertion failure recovery")

    assert result.success is True
    assert result.termination_reason == "goal_achieved"
    assert result.steps_executed == 3
    assert result.history[0].result.success is False
    assert "Expected Heading" in (result.history[0].result.error_message or "")
    assert result.history[1].result.success is True
    assert result.history[2].result.success is True


async def test_agent_repeated_failed_assertion_stagnation() -> None:
    """Repeatedly executing the exact same failed assertion on unchanged state triggers stagnation."""
    mock_page = make_mock_page()

    dispatcher = ActionDispatcher()

    async def failing_execute(page, action, timeout_ms=None):
        return ActionResult(
            success=False,
            action_type="assert",
            duration_ms=30,
            resolved_by="role=button",
            error_message="Assertion 'visible' failed: Locator not found",
        )

    dispatcher.execute = failing_execute

    same_assert = AssertAction(assertion_type="visible", role="button", name="Missing")
    provider = MockLLMProvider(script=[
        StepDecision(
            observation_summary="Looking for button.",
            decision="Assert button is visible.",
            action=same_assert,
        ),
        StepDecision(
            observation_summary="Looking for button again.",
            decision="Retry asserting button is visible.",
            action=same_assert,
        ),
    ])

    agent = AutonomousTestAgent(llm_provider=provider, dispatcher=dispatcher, max_steps=10)
    result = await agent.run(mock_page, goal="Test assertion stagnation")

    assert result.success is False
    assert result.termination_reason == "stagnation_detected"
    assert result.steps_executed == 1


async def test_agent_max_steps_exceeded() -> None:
    mock_page = make_mock_page()

    endless_decisions = [
        StepDecision(
            observation_summary=f"Step {i}",
            decision="Click next",
            action=ClickAction(role="button", name=f"Btn {i}"),
        )
        for i in range(10)
    ]
    provider = MockLLMProvider(script=endless_decisions)

    agent = AutonomousTestAgent(llm_provider=provider, max_steps=3)
    result = await agent.run(mock_page, goal="Test endless loop")

    assert result.success is False
    assert result.termination_reason == "max_steps_exceeded"
    assert result.steps_executed == 3
    assert len(result.history) == 3
    assert "maximum limit of 3 steps" in result.message


async def test_agent_action_loop_stagnation() -> None:
    mock_page = make_mock_page()

    same_click = ClickAction(role="button", name="Retry")
    provider = MockLLMProvider(script=[
        StepDecision(
            observation_summary="Error displayed.",
            decision="Click retry button.",
            action=same_click,
        ),
        StepDecision(
            observation_summary="Error still displayed.",
            decision="Click retry button again.",
            action=same_click,
        ),
    ])

    agent = AutonomousTestAgent(llm_provider=provider, max_steps=10)
    result = await agent.run(mock_page, goal="Test retry behavior")

    assert result.success is False
    assert result.termination_reason == "stagnation_detected"
    assert "identical action 'click' repeated consecutively" in result.message
    assert result.steps_executed == 1


async def test_agent_prolonged_state_stagnation_detected() -> None:
    mock_page = make_mock_page()

    provider = MockLLMProvider(script=[
        StepDecision(
            observation_summary="Input visible.",
            decision="Fill search with query 1.",
            action=FillAction(role="textbox", name="Search", value="test1"),
        ),
        StepDecision(
            observation_summary="Input visible.",
            decision="Fill search with query 2.",
            action=FillAction(role="textbox", name="Search", value="test2"),
        ),
        StepDecision(
            observation_summary="Input visible.",
            decision="Fill search with query 3.",
            action=FillAction(role="textbox", name="Search", value="test3"),
        ),
    ])

    agent = AutonomousTestAgent(llm_provider=provider, max_steps=10)
    result = await agent.run(mock_page, goal="Test search input")

    assert result.success is False
    assert result.termination_reason == "stagnation_detected"
    assert "consecutive actions with non-progress" in result.message
    assert result.steps_executed == 3


async def test_agent_sequential_form_filling_does_not_falsely_stagnate() -> None:
    mock_page = make_mock_page(aria_snapshot="- textbox 'First Name'\n- textbox 'Last Name'\n- textbox 'Email'")

    provider = MockLLMProvider(script=[
        StepDecision(
            observation_summary="Form visible.",
            decision="Fill first name.",
            action=FillAction(role="textbox", name="First Name", value="Alice"),
        ),
        StepDecision(
            observation_summary="Form visible.",
            decision="Fill last name.",
            action=FillAction(role="textbox", name="Last Name", value="Smith"),
        ),
        StepDecision(
            observation_summary="Form visible.",
            decision="Fill email.",
            action=FillAction(role="textbox", name="Email", value="alice@example.com"),
        ),
        StepDecision(
            observation_summary="Fields populated.",
            decision="Verify email field has value.",
            action=AssertAction(assertion_type="has_value", role="textbox", name="Email", expected_value="alice@example.com"),
        ),
        StepDecision(
            observation_summary="Form completed.",
            decision="Done filling.",
            action=FinishAction(success=True, message="All fields filled"),
        ),
    ])

    agent = AutonomousTestAgent(llm_provider=provider, max_steps=10)
    result = await agent.run(mock_page, goal="Fill registration form")

    assert result.success is True
    assert result.termination_reason == "goal_achieved"
    assert result.steps_executed == 5
    assert result.message == "All fields filled"


async def test_agent_action_failure_and_recovery() -> None:
    mock_page = make_mock_page()

    dispatcher = ActionDispatcher()
    original_execute = dispatcher.execute
    call_count = 0

    async def failing_execute(page, action, timeout_ms=None):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return ActionResult(
                success=False,
                action_type=action.action_type,
                duration_ms=50,
                error_message="Locator not found: role=button, name=MissingBtn",
            )
        return await original_execute(page, action, timeout_ms)

    dispatcher.execute = failing_execute

    provider = MockLLMProvider(script=[
        StepDecision(
            observation_summary="Trying button.",
            decision="Click missing button.",
            action=ClickAction(role="button", name="MissingBtn"),
        ),
        StepDecision(
            observation_summary="Observed button failure in history.",
            decision="Assert page title instead.",
            action=AssertAction(assertion_type="has_title", expected_value="Example"),
        ),
        StepDecision(
            observation_summary="Title verified.",
            decision="Finish test acknowledging recovery.",
            action=FinishAction(success=True, message="Recovered from failure"),
        ),
    ])

    agent = AutonomousTestAgent(llm_provider=provider, dispatcher=dispatcher)
    result = await agent.run(mock_page, goal="Test error recovery")

    assert result.success is True
    assert result.steps_executed == 3
    assert result.history[0].result.success is False
    assert "Locator not found" in (result.history[0].result.error_message or "")
    assert result.history[1].result.success is True
    assert result.history[2].result.success is True
    assert result.termination_reason == "goal_achieved"


async def test_agent_all_providers_failed() -> None:
    mock_page = make_mock_page()
    provider = MockLLMProvider()
    provider.generate_step = AsyncMock(
        side_effect=AllProvidersFailedError([("gemini", RuntimeError("Rate limit 429"))])
    )

    agent = AutonomousTestAgent(llm_provider=provider)
    result = await agent.run(mock_page, goal="Test unrecoverable failure")

    assert result.success is False
    assert result.termination_reason == "unrecoverable_error"
    assert "All LLM providers failed" in result.message


async def test_agent_cancellation_propagates() -> None:
    mock_page = make_mock_page()
    provider = MockLLMProvider()
    provider.generate_step = AsyncMock(side_effect=asyncio.CancelledError())

    agent = AutonomousTestAgent(llm_provider=provider)
    with pytest.raises(asyncio.CancelledError):
        await agent.run(mock_page, goal="Test cancel")


async def test_agent_programming_error_propagates() -> None:
    mock_page = make_mock_page()
    provider = MockLLMProvider()
    provider.generate_step = AsyncMock(side_effect=TypeError("Unexpected type bug"))

    agent = AutonomousTestAgent(llm_provider=provider)
    with pytest.raises(TypeError, match="Unexpected type bug"):
        await agent.run(mock_page, goal="Test bug")


async def test_agent_initial_url_navigation() -> None:
    mock_page = make_mock_page()
    provider = MockLLMProvider(script=[
        StepDecision(
            observation_summary="Page loaded.",
            decision="Verify URL loaded correctly.",
            action=AssertAction(assertion_type="has_url", expected_value="example.com/app"),
        ),
        StepDecision(
            observation_summary="URL confirmed.",
            decision="Done.",
            action=FinishAction(success=True, message="Initial page verified"),
        )
    ])

    agent = AutonomousTestAgent(llm_provider=provider)
    result = await agent.run(mock_page, goal="Test initial url", initial_url="https://example.com/app")

    mock_page.goto.assert_awaited_once_with("https://example.com/app", wait_until="domcontentloaded")
    assert result.success is True
    # Initial url is setup (step 0); LLM turn 1 is AssertAction, turn 2 is FinishAction
    assert result.steps_executed == 2


async def test_agent_diagnostics_propagation() -> None:
    mock_page = make_mock_page()
    diagnostics = DiagnosticsCollector()
    diagnostics.attach(mock_page)

    # Simulate console error
    error_msg = MagicMock(type="error", text="TypeError: undefined is not a function", location=None)
    diagnostics._handle_console(error_msg)

    provider = MockLLMProvider(script=[
        StepDecision(
            observation_summary="Error in console.",
            decision="Verify page title.",
            action=AssertAction(assertion_type="has_title", expected_value="Example"),
        ),
        StepDecision(
            observation_summary="Title verified.",
            decision="Finish test.",
            action=FinishAction(success=True, message="Diagnostics checked"),
        )
    ])

    agent = AutonomousTestAgent(llm_provider=provider, diagnostics=diagnostics)
    result = await agent.run(mock_page, goal="Test diagnostics")

    assert result.diagnostics is not None
    assert result.diagnostics["console_error_count"] == 1
    assert result.diagnostics["has_errors"] is True
    assert result.success is True


# =============================================================================
# Milestone 3 — Slice 2: PressKeyAction and SelectAction Agent Loop Tests
# =============================================================================

async def test_agent_executes_press_key_and_completes() -> None:
    mock_page = make_mock_page()

    provider = MockLLMProvider(script=[
        StepDecision(
            observation_summary="Search input focused.",
            decision="Press Enter to submit query.",
            action=PressKeyAction(key="Enter", role="textbox", name="Search"),
        ),
        StepDecision(
            observation_summary="Search results displayed.",
            decision="Verify search heading is visible.",
            action=AssertAction(assertion_type="visible", role="heading", name="Results"),
        ),
        StepDecision(
            observation_summary="Search verified.",
            decision="Complete goal.",
            action=FinishAction(success=True, message="Search verified successfully"),
        ),
    ])

    agent = AutonomousTestAgent(llm_provider=provider, max_steps=5)
    result = await agent.run(mock_page, goal="Test search submission")

    assert result.success is True
    assert result.termination_reason == "goal_achieved"
    assert result.steps_executed == 3
    assert result.history[0].decision.action.action_type == "press_key"
    assert result.history[0].result.success is True
    assert result.history[1].decision.action.action_type == "assert"
    assert result.history[1].result.success is True
    assert result.history[2].decision.action.action_type == "finish"


async def test_agent_executes_select_action_and_completes() -> None:
    mock_page = make_mock_page()

    provider = MockLLMProvider(script=[
        StepDecision(
            observation_summary="Filter dropdown visible.",
            decision="Select Category option.",
            action=SelectAction(role="combobox", name="Category", value="books"),
        ),
        StepDecision(
            observation_summary="Filter applied.",
            decision="Verify Books heading is visible.",
            action=AssertAction(assertion_type="visible", role="heading", name="Books"),
        ),
        StepDecision(
            observation_summary="Filter verified.",
            decision="Complete goal.",
            action=FinishAction(success=True, message="Category filtered successfully"),
        ),
    ])

    agent = AutonomousTestAgent(llm_provider=provider, max_steps=5)
    result = await agent.run(mock_page, goal="Test category filter")

    assert result.success is True
    assert result.termination_reason == "goal_achieved"
    assert result.steps_executed == 3
    assert result.history[0].decision.action.action_type == "select"
    assert result.history[0].result.success is True
    assert result.history[1].decision.action.action_type == "assert"
    assert result.history[2].decision.action.action_type == "finish"


async def test_agent_stagnation_distinguishes_different_keys_and_options() -> None:
    agent = AutonomousTestAgent(llm_provider=MagicMock())

    # Key differences in action signature
    sig_enter = agent.compute_action_signature(PressKeyAction(key="Enter", role="textbox", name="Input"))
    sig_escape = agent.compute_action_signature(PressKeyAction(key="Escape", role="textbox", name="Input"))
    sig_backspace = agent.compute_action_signature(PressKeyAction(key="Backspace", role="textbox", name="Input"))
    assert sig_enter != sig_escape
    assert sig_enter != sig_backspace

    # Option differences in action signature
    sig_us = agent.compute_action_signature(SelectAction(role="combobox", name="Country", value="US"))
    sig_ca = agent.compute_action_signature(SelectAction(role="combobox", name="Country", value="CA"))
    sig_label = agent.compute_action_signature(SelectAction(role="combobox", name="Country", label="Canada"))
    assert sig_us != sig_ca
    assert sig_ca != sig_label

    # Target differences in target computation
    target_enter = agent.compute_action_target(PressKeyAction(key="Enter", role="textbox", name="Input"))
    target_escape = agent.compute_action_target(PressKeyAction(key="Escape", role="textbox", name="Input"))
    assert target_enter != target_escape

    target_country = agent.compute_action_target(SelectAction(role="combobox", name="Country", value="US"))
    target_state = agent.compute_action_target(SelectAction(role="combobox", name="State", value="CA"))
    target_country_alt = agent.compute_action_target(SelectAction(role="combobox", name="Country", value="CA"))
    # Different elements have different targets
    assert target_country != target_state
    # Same element with different values has the same target identity (matching FillAction semantics)
    assert target_country == target_country_alt


async def test_agent_executes_scroll_action_and_completes() -> None:
    mock_page = make_mock_page()

    provider = MockLLMProvider(script=[
        StepDecision(
            observation_summary="Page loaded, target below fold.",
            decision="Scroll down to reveal footer content.",
            action=ScrollAction(direction="down", amount=500),
        ),
        StepDecision(
            observation_summary="Scrolled down, footer heading visible.",
            decision="Assert footer heading is visible.",
            action=AssertAction(assertion_type="visible", role="heading", name="Footer"),
        ),
        StepDecision(
            observation_summary="Assertion passed.",
            decision="Complete goal.",
            action=FinishAction(success=True, message="Scrolled and verified footer"),
        ),
    ])

    agent = AutonomousTestAgent(llm_provider=provider, max_steps=5)
    result = await agent.run(mock_page, goal="Test scrolling to footer")

    assert result.success is True
    assert result.termination_reason == "goal_achieved"
    assert result.steps_executed == 3
    assert result.history[0].decision.action.action_type == "scroll"
    assert result.history[0].result.success is True
    assert result.history[0].result.resolved_by == "page.scroll(down, 500px)"
    assert result.history[1].decision.action.action_type == "assert"
    assert result.history[2].decision.action.action_type == "finish"


async def test_agent_executes_hover_action_and_completes() -> None:
    mock_page = make_mock_page()

    provider = MockLLMProvider(script=[
        StepDecision(
            observation_summary="Navigation bar visible.",
            decision="Hover over Products menu item.",
            action=HoverAction(role="button", name="Products"),
        ),
        StepDecision(
            observation_summary="Dropdown menu revealed.",
            decision="Assert dropdown link is visible.",
            action=AssertAction(assertion_type="visible", role="link", name="Analytics"),
        ),
        StepDecision(
            observation_summary="Assertion passed.",
            decision="Complete goal.",
            action=FinishAction(success=True, message="Hover revealed dropdown successfully"),
        ),
    ])

    agent = AutonomousTestAgent(llm_provider=provider, max_steps=5)
    result = await agent.run(mock_page, goal="Test hover dropdown")

    assert result.success is True
    assert result.termination_reason == "goal_achieved"
    assert result.steps_executed == 3
    assert result.history[0].decision.action.action_type == "hover"
    assert result.history[0].result.success is True
    assert "role=button" in (result.history[0].result.resolved_by or "")
    assert result.history[1].decision.action.action_type == "assert"
    assert result.history[2].decision.action.action_type == "finish"


async def test_agent_stagnation_distinguishes_scroll_and_hover() -> None:
    agent = AutonomousTestAgent(llm_provider=MagicMock())

    # Scroll directions have different signatures and targets
    sig_down = agent.compute_action_signature(ScrollAction(direction="down", amount=500))
    sig_up = agent.compute_action_signature(ScrollAction(direction="up", amount=500))
    sig_down_300 = agent.compute_action_signature(ScrollAction(direction="down", amount=300))
    assert sig_down != sig_up
    assert sig_down != sig_down_300

    target_down = agent.compute_action_target(ScrollAction(direction="down", amount=500))
    target_up = agent.compute_action_target(ScrollAction(direction="up", amount=500))
    assert target_down != target_up

    # Hover signatures and targets distinguish elements
    sig_hover_btn = agent.compute_action_signature(HoverAction(role="button", name="Menu"))
    sig_hover_link = agent.compute_action_signature(HoverAction(role="link", name="Menu"))
    assert sig_hover_btn != sig_hover_link

    target_hover_btn = agent.compute_action_target(HoverAction(role="button", name="Menu"))
    target_hover_link = agent.compute_action_target(HoverAction(role="link", name="Menu"))
    assert target_hover_btn != target_hover_link


# =============================================================================
# Milestone 6.3: Rich Deterministic Assertions Anti-Hallucination & Core Tests
# =============================================================================

@pytest.mark.parametrize(
    "assertion_action",
    [
        AssertAction(assertion_type="enabled", role="button", name="Submit"),
        AssertAction(assertion_type="disabled", selector="#save-btn"),
        AssertAction(assertion_type="checked", role="checkbox", name="Agree"),
        AssertAction(assertion_type="unchecked", selector="#terms"),
        AssertAction(assertion_type="has_count", selector=".item", expected_value="3"),
    ],
)
async def test_agent_m63_assertion_satisfies_anti_hallucination_guard(assertion_action: AssertAction) -> None:
    mock_page = make_mock_page()

    provider = MockLLMProvider(script=[
        StepDecision(
            observation_summary="Interactive element rendered.",
            decision=f"Assert {assertion_action.assertion_type}.",
            action=assertion_action,
        ),
        StepDecision(
            observation_summary="Assertion succeeded.",
            decision="Declare goal complete.",
            action=FinishAction(success=True, message="Goal verified successfully"),
        ),
    ])

    agent = AutonomousTestAgent(llm_provider=provider, max_steps=5)
    result = await agent.run(mock_page, goal="Test M6.3 assertion verification")

    assert result.success is True
    assert result.termination_reason == "goal_achieved"
    assert result.steps_executed == 2
    assert result.history[0].decision.action.action_type == "assert"
    assert result.history[0].result.success is True
    assert result.history[1].decision.action.action_type == "finish"
    assert result.history[1].result.success is True


def test_agent_m63_assertion_signatures_and_targets() -> None:
    agent = AutonomousTestAgent(llm_provider=MagicMock())

    act_enabled = AssertAction(assertion_type="enabled", role="button", name="Submit")
    act_disabled = AssertAction(assertion_type="disabled", role="button", name="Submit")
    act_count_3 = AssertAction(assertion_type="has_count", selector=".item", expected_value="3")
    act_count_0 = AssertAction(assertion_type="has_count", selector=".item", expected_value="0")

    sig_enabled = agent.compute_action_signature(act_enabled)
    sig_disabled = agent.compute_action_signature(act_disabled)
    sig_count_3 = agent.compute_action_signature(act_count_3)
    sig_count_0 = agent.compute_action_signature(act_count_0)

    assert sig_enabled != sig_disabled
    assert sig_count_3 != sig_count_0
