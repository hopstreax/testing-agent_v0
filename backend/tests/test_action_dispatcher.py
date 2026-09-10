"""Unit tests for ActionDispatcher locator resolution and execution."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from app.browser.actions import ActionDispatcher
from app.models.actions import AssertAction, ClickAction, FillAction


def make_mock_expect():
    assertions = MagicMock()
    assertions.to_be_visible = AsyncMock()
    assertions.to_be_hidden = AsyncMock()
    assertions.to_contain_text = AsyncMock()
    assertions.to_have_value = AsyncMock()
    assertions.to_have_url = AsyncMock()
    assertions.to_have_title = AsyncMock()
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
