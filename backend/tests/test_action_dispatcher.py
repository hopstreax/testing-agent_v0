"""Unit tests for ActionDispatcher locator resolution and execution."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from app.browser.actions import ActionDispatcher
from app.models.actions import (
    AssertAction,
    ClickAction,
    FillAction,
    HoverAction,
    PressKeyAction,
    ScrollAction,
    SelectAction,
)


def make_mock_expect():
    assertions = MagicMock()
    assertions.to_be_visible = AsyncMock()
    assertions.to_be_hidden = AsyncMock()
    assertions.to_contain_text = AsyncMock()
    assertions.to_have_value = AsyncMock()
    assertions.to_have_url = AsyncMock()
    assertions.to_have_title = AsyncMock()
    assertions.to_be_enabled = AsyncMock()
    assertions.to_be_disabled = AsyncMock()
    assertions.to_be_checked = AsyncMock()
    assertions.not_to_be_checked = AsyncMock()
    assertions.to_have_count = AsyncMock()
    return MagicMock(return_value=assertions)


@pytest.fixture
def mock_expect():
    return make_mock_expect()


@pytest.fixture
def dispatcher(mock_expect):
    return ActionDispatcher(default_timeout_ms=5000, default_assertion_timeout_ms=5000, expect_fn=mock_expect)


@pytest.fixture
def mock_page():
    page = MagicMock()
    page.get_by_role = MagicMock()
    page.get_by_text = MagicMock()
    page.get_by_placeholder = MagicMock()
    page.get_by_label = MagicMock()
    page.locator = MagicMock()
    return page


def test_resolve_locator_role_and_name(dispatcher, mock_page):
    action = ClickAction(role="button", name="Submit")
    locator, strat = dispatcher.resolve_locator(mock_page, action)
    mock_page.get_by_role.assert_called_once_with("button", name="Submit", exact=False)
    assert "role=button, name=Submit" in strat


def test_resolve_locator_text(dispatcher, mock_page):
    action = ClickAction(text="Click Here")
    locator, strat = dispatcher.resolve_locator(mock_page, action)
    mock_page.get_by_text.assert_called_once_with("Click Here", exact=False)
    assert "text='Click Here'" in strat


def test_resolve_locator_placeholder(dispatcher, mock_page):
    action = FillAction(placeholder="Enter email", value="a@b.com")
    locator, strat = dispatcher.resolve_locator(mock_page, action)
    mock_page.get_by_placeholder.assert_called_once_with("Enter email")
    assert "placeholder='Enter email'" in strat


def test_resolve_locator_selector(dispatcher, mock_page):
    action = ClickAction(selector="button.primary")
    locator, strat = dispatcher.resolve_locator(mock_page, action)
    mock_page.locator.assert_called_once_with("button.primary")
    assert "selector='button.primary'" in strat


def test_resolve_locator_no_criteria(dispatcher, mock_page):
    action = ClickAction()
    with pytest.raises(ValueError, match="does not contain any valid locator criteria"):
        dispatcher.resolve_locator(mock_page, action)


@pytest.mark.asyncio
async def test_execute_fill_success(dispatcher, mock_page):
    mock_locator = MagicMock()
    mock_locator.fill = AsyncMock()
    mock_page.get_by_role.return_value = mock_locator

    action = FillAction(role="textbox", name="User", value="myuser")
    res = await dispatcher.execute(mock_page, action, timeout_ms=3000)

    assert res.success is True
    assert res.action_type == "fill"
    assert res.error_message is None
    assert res.duration_ms >= 0
    mock_locator.fill.assert_awaited_once_with("myuser", timeout=3000)


@pytest.mark.asyncio
async def test_execute_click_failure(dispatcher, mock_page):
    mock_locator = MagicMock()
    mock_locator.click = AsyncMock(side_effect=TimeoutError("Element not interactable"))
    mock_page.locator.return_value = mock_locator

    action = ClickAction(selector="#btn")
    res = await dispatcher.execute(mock_page, action, timeout_ms=1000)

    assert res.success is False
    assert res.action_type == "click"
    assert "Element not interactable" in (res.error_message or "")


# =========================================================================
# AssertAction Execution Tests
# =========================================================================

@pytest.mark.asyncio
async def test_execute_assert_visible_success(dispatcher, mock_page, mock_expect):
    mock_locator = MagicMock()
    mock_page.get_by_role.return_value = mock_locator

    action = AssertAction(assertion_type="visible", role="button", name="Submit")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    assert res.action_type == "assert"
    assert res.error_message is None
    assert res.resolved_by == "role=button, name=Submit"
    mock_expect(mock_locator).to_be_visible.assert_awaited_once_with(timeout=5000)


@pytest.mark.asyncio
async def test_execute_assert_visible_failure(dispatcher, mock_page, mock_expect):
    mock_locator = MagicMock()
    mock_page.locator.return_value = mock_locator
    mock_expect(mock_locator).to_be_visible.side_effect = AssertionError("Element is not visible")

    action = AssertAction(assertion_type="visible", selector="#alert")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is False
    assert res.action_type == "assert"
    assert "Element is not visible" in (res.error_message or "")


@pytest.mark.asyncio
async def test_execute_assert_hidden_success(dispatcher, mock_page, mock_expect):
    mock_locator = MagicMock()
    mock_page.locator.return_value = mock_locator

    action = AssertAction(assertion_type="hidden", selector="#spinner")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    assert res.action_type == "assert"
    mock_expect(mock_locator).to_be_hidden.assert_awaited_once_with(timeout=5000)


@pytest.mark.asyncio
async def test_execute_assert_has_text_success(dispatcher, mock_page, mock_expect):
    mock_locator = MagicMock()
    mock_page.get_by_role.return_value = mock_locator

    action = AssertAction(assertion_type="has_text", role="heading", name="Title", expected_value="Welcome")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    assert res.action_type == "assert"
    mock_expect(mock_locator).to_contain_text.assert_awaited_once_with("Welcome", timeout=5000)


@pytest.mark.asyncio
async def test_execute_assert_has_text_failure_with_info(dispatcher, mock_page, mock_expect):
    mock_locator = MagicMock()
    mock_page.get_by_role.return_value = mock_locator
    mock_expect(mock_locator).to_contain_text.side_effect = AssertionError(
        "Expected string 'Welcome' but received 'Access Denied'"
    )

    action = AssertAction(assertion_type="has_text", role="heading", name="Title", expected_value="Welcome")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is False
    assert res.action_type == "assert"
    assert "Expected string 'Welcome'" in (res.error_message or "")
    assert "Access Denied" in (res.error_message or "")


@pytest.mark.asyncio
async def test_execute_assert_has_value_success(dispatcher, mock_page, mock_expect):
    mock_locator = MagicMock()
    mock_page.get_by_placeholder.return_value = mock_locator

    action = AssertAction(assertion_type="has_value", placeholder="Email", expected_value="user@example.com")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    assert res.action_type == "assert"
    mock_expect(mock_locator).to_have_value.assert_awaited_once_with("user@example.com", timeout=5000)


@pytest.mark.asyncio
async def test_execute_assert_has_url_success(dispatcher, mock_page, mock_expect):
    action = AssertAction(assertion_type="has_url", expected_value="dashboard")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    assert res.action_type == "assert"
    assert res.resolved_by == "page.url"
    mock_expect(mock_page).to_have_url.assert_awaited_once()


@pytest.mark.asyncio
async def test_execute_assert_has_title_success(dispatcher, mock_page, mock_expect):
    action = AssertAction(assertion_type="has_title", expected_value="My Dashboard")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    assert res.action_type == "assert"
    assert res.resolved_by == "page.title"
    mock_expect(mock_page).to_have_title.assert_awaited_once()


@pytest.mark.asyncio
async def test_page_level_assertions_skip_locator_resolution(dispatcher, mock_page):
    # Page assertions should not call any get_by_* or locator methods on page
    action_url = AssertAction(assertion_type="has_url", expected_value="https://example.com")
    await dispatcher.execute(mock_page, action_url)
    mock_page.get_by_role.assert_not_called()
    mock_page.locator.assert_not_called()

    action_title = AssertAction(assertion_type="has_title", expected_value="Example Domain")
    await dispatcher.execute(mock_page, action_title)
    mock_page.get_by_role.assert_not_called()
    mock_page.locator.assert_not_called()


# =============================================================================
# Milestone 3 — Slice 2: PressKeyAction and SelectAction Dispatcher Tests
# =============================================================================

@pytest.mark.asyncio
async def test_execute_press_key_with_locator(dispatcher, mock_page):
    mock_locator = MagicMock()
    mock_locator.press = AsyncMock()
    mock_page.get_by_role = MagicMock(return_value=mock_locator)

    action = PressKeyAction(key="Enter", role="textbox", name="Search")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    assert res.action_type == "press_key"
    assert "role=textbox, name=Search" in res.resolved_by
    mock_locator.press.assert_awaited_once_with("Enter", timeout=5000)


@pytest.mark.asyncio
async def test_execute_press_key_without_locator(dispatcher, mock_page):
    mock_page.keyboard = MagicMock()
    mock_page.keyboard.press = AsyncMock()

    action = PressKeyAction(key="Escape")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    assert res.action_type == "press_key"
    assert res.resolved_by == "page.keyboard"
    mock_page.keyboard.press.assert_awaited_once_with("Escape")


@pytest.mark.asyncio
async def test_execute_select_option_by_value(dispatcher, mock_page):
    mock_locator = MagicMock()
    mock_locator.select_option = AsyncMock()
    mock_page.get_by_role = MagicMock(return_value=mock_locator)

    action = SelectAction(role="combobox", name="Country", value="US")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    assert res.action_type == "select"
    assert "role=combobox, name=Country" in res.resolved_by
    mock_locator.select_option.assert_awaited_once_with(value="US", timeout=5000)


@pytest.mark.asyncio
async def test_execute_select_option_by_label(dispatcher, mock_page):
    mock_locator = MagicMock()
    mock_locator.select_option = AsyncMock()
    mock_page.locator = MagicMock(return_value=mock_locator)

    action = SelectAction(selector="#country-select", label="United States")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    assert res.action_type == "select"
    assert "selector='#country-select'" in res.resolved_by
    mock_locator.select_option.assert_awaited_once_with(label="United States", timeout=5000)


@pytest.mark.asyncio
async def test_execute_press_key_failure_captured(dispatcher, mock_page):
    mock_locator = MagicMock()
    mock_locator.press = AsyncMock(side_effect=RuntimeError("Element detached from DOM"))
    mock_page.get_by_role = MagicMock(return_value=mock_locator)

    action = PressKeyAction(key="Tab", role="textbox", name="Search")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is False
    assert res.action_type == "press_key"
    assert "Element detached from DOM" in res.error_message


@pytest.mark.asyncio
async def test_execute_select_option_failure_captured(dispatcher, mock_page):
    mock_locator = MagicMock()
    mock_locator.select_option = AsyncMock(side_effect=ValueError("Option 'NonExistent' not found"))
    mock_page.locator = MagicMock(return_value=mock_locator)

    action = SelectAction(selector="#dropdown", value="NonExistent")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is False
    assert res.action_type == "select"
    assert "Option 'NonExistent' not found" in res.error_message


# ---------------------------------------------------------------------------
# M6.1 ScrollAction and HoverAction Dispatcher Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_execute_scroll_down(dispatcher, mock_page):
    """Test ScrollAction dispatches page.evaluate window.scrollBy down."""
    mock_page.evaluate = AsyncMock()

    action = ScrollAction(direction="down", amount=600)
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    assert res.action_type == "scroll"
    assert "page.scroll(down, 600px)" in res.resolved_by
    mock_page.evaluate.assert_awaited_once_with("window.scrollBy(0, 600)")


@pytest.mark.asyncio
async def test_execute_scroll_up(dispatcher, mock_page):
    """Test ScrollAction dispatches page.evaluate window.scrollBy up with negative delta."""
    mock_page.evaluate = AsyncMock()

    action = ScrollAction(direction="up", amount=400)
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    assert res.action_type == "scroll"
    assert "page.scroll(up, 400px)" in res.resolved_by
    mock_page.evaluate.assert_awaited_once_with("window.scrollBy(0, -400)")


@pytest.mark.asyncio
async def test_execute_scroll_fallback_mouse(dispatcher):
    """Test ScrollAction falls back to page.mouse.wheel when evaluate is absent."""
    page_without_eval = MagicMock(spec=["mouse"])
    page_without_eval.mouse = MagicMock()
    page_without_eval.mouse.wheel = AsyncMock()

    action = ScrollAction(direction="down", amount=500)
    res = await dispatcher.execute(page_without_eval, action)

    assert res.success is True
    assert res.action_type == "scroll"
    page_without_eval.mouse.wheel.assert_awaited_once_with(0, 500)


@pytest.mark.asyncio
async def test_execute_hover_success(dispatcher, mock_page):
    """Test HoverAction resolves locator and executes locator.hover()."""
    mock_locator = MagicMock()
    mock_locator.hover = AsyncMock()
    mock_page.get_by_role = MagicMock(return_value=mock_locator)

    action = HoverAction(role="button", name="Pricing")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    assert res.action_type == "hover"
    assert "role=button, name=Pricing" in res.resolved_by
    mock_locator.hover.assert_awaited_once_with(timeout=5000)


@pytest.mark.asyncio
async def test_execute_hover_failure_captured(dispatcher, mock_page):
    """Test HoverAction failures are captured into ActionResult error_message."""
    mock_locator = MagicMock()
    mock_locator.hover = AsyncMock(side_effect=TimeoutError("Element not found within timeout"))
    mock_page.locator = MagicMock(return_value=mock_locator)

    action = HoverAction(selector="#dropdown-trigger")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is False
    assert res.action_type == "hover"
    assert "Element not found within timeout" in res.error_message


# =============================================================================
# Milestone 6.3: Rich Deterministic Assertions Dispatcher Tests
# =============================================================================

@pytest.mark.asyncio
async def test_execute_assert_enabled_success(dispatcher, mock_page, mock_expect):
    mock_locator = MagicMock()
    mock_page.get_by_role = MagicMock(return_value=mock_locator)

    action = AssertAction(assertion_type="enabled", role="button", name="Submit")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    assert res.action_type == "assert"
    assert "role=button, name=Submit" in res.resolved_by
    mock_expect(mock_locator).to_be_enabled.assert_awaited_once_with(timeout=5000)


@pytest.mark.asyncio
async def test_execute_assert_enabled_failure(dispatcher, mock_page, mock_expect):
    mock_locator = MagicMock()
    mock_page.get_by_role = MagicMock(return_value=mock_locator)
    mock_expect(mock_locator).to_be_enabled = AsyncMock(side_effect=AssertionError("Element is disabled"))

    action = AssertAction(assertion_type="enabled", role="button", name="Submit")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is False
    assert res.action_type == "assert"
    assert "Element is disabled" in res.error_message


@pytest.mark.asyncio
async def test_execute_assert_disabled_success(dispatcher, mock_page, mock_expect):
    mock_locator = MagicMock()
    mock_page.locator = MagicMock(return_value=mock_locator)

    action = AssertAction(assertion_type="disabled", selector="#submit-btn")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    assert res.action_type == "assert"
    assert "selector='#submit-btn'" in res.resolved_by
    mock_expect(mock_locator).to_be_disabled.assert_awaited_once_with(timeout=5000)


@pytest.mark.asyncio
async def test_execute_assert_disabled_failure(dispatcher, mock_page, mock_expect):
    mock_locator = MagicMock()
    mock_page.locator = MagicMock(return_value=mock_locator)
    mock_expect(mock_locator).to_be_disabled = AsyncMock(side_effect=AssertionError("Element is enabled"))

    action = AssertAction(assertion_type="disabled", selector="#submit-btn")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is False
    assert res.action_type == "assert"
    assert "Element is enabled" in res.error_message


@pytest.mark.asyncio
async def test_execute_assert_checked_success(dispatcher, mock_page, mock_expect):
    mock_locator = MagicMock()
    mock_page.get_by_role = MagicMock(return_value=mock_locator)

    action = AssertAction(assertion_type="checked", role="checkbox", name="Agree")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    assert res.action_type == "assert"
    mock_expect(mock_locator).to_be_checked.assert_awaited_once_with(timeout=5000)


@pytest.mark.asyncio
async def test_execute_assert_checked_failure(dispatcher, mock_page, mock_expect):
    mock_locator = MagicMock()
    mock_page.get_by_role = MagicMock(return_value=mock_locator)
    mock_expect(mock_locator).to_be_checked = AsyncMock(side_effect=AssertionError("Element is not checked"))

    action = AssertAction(assertion_type="checked", role="checkbox", name="Agree")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is False
    assert res.action_type == "assert"
    assert "Element is not checked" in res.error_message


@pytest.mark.asyncio
async def test_execute_assert_unchecked_success(dispatcher, mock_page, mock_expect):
    mock_locator = MagicMock()
    mock_page.locator = MagicMock(return_value=mock_locator)

    action = AssertAction(assertion_type="unchecked", selector="#terms-cb")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    assert res.action_type == "assert"
    mock_expect(mock_locator).not_to_be_checked.assert_awaited_once_with(timeout=5000)


@pytest.mark.asyncio
async def test_execute_assert_unchecked_failure(dispatcher, mock_page, mock_expect):
    mock_locator = MagicMock()
    mock_page.locator = MagicMock(return_value=mock_locator)
    mock_expect(mock_locator).not_to_be_checked = AsyncMock(side_effect=AssertionError("Element is checked"))

    action = AssertAction(assertion_type="unchecked", selector="#terms-cb")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is False
    assert res.action_type == "assert"
    assert "Element is checked" in res.error_message


@pytest.mark.asyncio
async def test_execute_assert_has_count_success(dispatcher, mock_page, mock_expect):
    mock_locator = MagicMock()
    mock_page.locator = MagicMock(return_value=mock_locator)

    action = AssertAction(assertion_type="has_count", selector=".items", expected_value="3")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    assert res.action_type == "assert"
    mock_expect(mock_locator).to_have_count.assert_awaited_once_with(3, timeout=5000)

    # Test count 0
    mock_expect(mock_locator).to_have_count.reset_mock()
    action_zero = AssertAction(assertion_type="has_count", selector=".empty-list", expected_value="0")
    res_zero = await dispatcher.execute(mock_page, action_zero)
    assert res_zero.success is True
    mock_expect(mock_locator).to_have_count.assert_awaited_once_with(0, timeout=5000)


@pytest.mark.asyncio
async def test_execute_assert_has_count_failure(dispatcher, mock_page, mock_expect):
    mock_locator = MagicMock()
    mock_page.locator = MagicMock(return_value=mock_locator)
    mock_expect(mock_locator).to_have_count = AsyncMock(side_effect=AssertionError("Expected 3 items, found 1"))

    action = AssertAction(assertion_type="has_count", selector=".items", expected_value="3")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is False
    assert res.action_type == "assert"
    assert "Expected 3 items, found 1" in res.error_message


# =============================================================================
# Milestone 6.5: Disambiguation & Index Dispatcher Tests
# =============================================================================

def test_resolve_locator_with_index(dispatcher, mock_page):
    """Verify resolve_locator applies nth(index) and appends [index=X] to strategy string."""
    mock_base = MagicMock()
    mock_nth = MagicMock()
    mock_base.nth.return_value = mock_nth
    mock_page.get_by_role.return_value = mock_base

    action = ClickAction(role="button", name="Delete", index=1)
    locator, strat = dispatcher.resolve_locator(mock_page, action)

    mock_base.nth.assert_called_once_with(1)
    assert locator == mock_nth
    assert "role=button, name=Delete [index=1]" in strat


def test_resolve_locator_without_index_unchanged(dispatcher, mock_page):
    """Verify resolve_locator does NOT call nth() when index is None."""
    mock_base = MagicMock()
    mock_page.get_by_role.return_value = mock_base

    action = ClickAction(role="button", name="Delete")
    locator, strat = dispatcher.resolve_locator(mock_page, action)

    mock_base.nth.assert_not_called()
    assert locator == mock_base
    assert "[index=" not in strat


@pytest.mark.asyncio
async def test_execute_click_with_index_calls_nth(dispatcher, mock_page):
    """Verify click execution targets the nth locator element."""
    mock_base = MagicMock()
    mock_nth = MagicMock()
    mock_nth.click = AsyncMock()
    mock_base.nth.return_value = mock_nth
    mock_page.get_by_role.return_value = mock_base

    action = ClickAction(role="button", name="Add to cart", index=2)
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    mock_base.nth.assert_called_once_with(2)
    mock_nth.click.assert_awaited_once()
    assert "[index=2]" in res.resolved_by


@pytest.mark.asyncio
async def test_execute_assert_with_index_calls_nth(dispatcher, mock_page, mock_expect):
    """Verify assertion execution targets the nth locator element."""
    mock_base = MagicMock()
    mock_nth = MagicMock()
    mock_base.nth.return_value = mock_nth
    mock_page.locator.return_value = mock_base

    action = AssertAction(assertion_type="visible", selector=".card-btn", index=0)
    res = await dispatcher.execute(mock_page, action)

    assert res.success is True
    mock_base.nth.assert_called_once_with(0)
    mock_expect(mock_nth).to_be_visible.assert_awaited_once_with(timeout=5000)
    assert "[index=0]" in res.resolved_by


@pytest.mark.asyncio
async def test_execute_ambiguous_locator_error_formatting(dispatcher, mock_page):
    """Verify strict mode violations are formatted with count and index guidance."""
    mock_base = MagicMock()
    raw_strict_err = (
        "Locator.click: Error: strict mode violation: get_by_role(\"button\", name=\"Delete\") resolved to 3 elements:\n"
        "    1) <button>Delete</button> aka get_by_role(\"button\", name=\"Delete\").first\n"
        "    2) <button>Delete</button> aka get_by_role(\"button\", name=\"Delete\").nth(1)\n"
        "    3) <button>Delete</button> aka get_by_role(\"button\", name=\"Delete\").nth(2)\n"
    )
    mock_base.click = AsyncMock(side_effect=Exception(raw_strict_err))
    mock_page.get_by_role.return_value = mock_base

    action = ClickAction(role="button", name="Delete")
    res = await dispatcher.execute(mock_page, action)

    assert res.success is False
    assert "Locator matched 3 elements and is ambiguous. Use a more specific locator or provide index=0, 1, or 2." in res.error_message
    assert "Distinguishing options:" in res.error_message


@pytest.mark.asyncio
async def test_execute_out_of_range_index_immediate_error(dispatcher, mock_page):
    """Verify out-of-range index fails with a clear message indicating matched count and valid range."""
    mock_base = MagicMock()
    mock_base.count = AsyncMock(return_value=3)
    mock_page.locator.return_value = mock_base

    action = ClickAction(selector=".item-btn", index=5)
    res = await dispatcher.execute(mock_page, action)

    assert res.success is False
    assert "Locator index 5 is out of range; locator matched 3 elements. Valid indexes are 0 through 2." in res.error_message
