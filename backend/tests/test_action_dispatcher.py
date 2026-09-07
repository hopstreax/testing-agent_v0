"""Unit tests for ActionDispatcher locator resolution and execution."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from app.browser.actions import ActionDispatcher
from app.models.actions import ClickAction, FillAction


@pytest.fixture
def dispatcher():
    return ActionDispatcher(default_timeout_ms=5000)


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
