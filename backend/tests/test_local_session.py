"""Unit tests for LocalBrowserSessionManager."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.browser.session import LocalBrowserSessionManager, _is_browser_connected


def test_is_browser_connected_helper() -> None:
    assert _is_browser_connected(None) is False

    mock_callable = MagicMock()
    mock_callable.is_connected = MagicMock(return_value=True)
    assert _is_browser_connected(mock_callable) is True

    mock_bool = MagicMock()
    mock_bool.is_connected = False
    assert _is_browser_connected(mock_bool) is False


@pytest.mark.asyncio
async def test_local_browser_session_lifecycle() -> None:
    mock_browser = MagicMock()
    mock_browser.is_connected = MagicMock(return_value=True)
    mock_browser.new_page = AsyncMock(return_value="local_mock_page")
    mock_browser.close = AsyncMock()

    mock_chromium = MagicMock()
    mock_chromium.launch = AsyncMock(return_value=mock_browser)

    mock_pw = MagicMock()
    mock_pw.chromium = mock_chromium
    mock_pw.stop = AsyncMock()

    with patch("app.browser.session.async_playwright") as mock_async_playwright:
        mock_pw_builder = MagicMock()
        mock_pw_builder.start = AsyncMock(return_value=mock_pw)
        mock_async_playwright.return_value = mock_pw_builder

        manager = LocalBrowserSessionManager(headless=True)
        assert manager.is_active is False

        # Launch
        browser = await manager.launch()
        assert browser == mock_browser
        assert manager.is_active is True
        mock_chromium.launch.assert_awaited_once_with(headless=True)

        # Idempotent launch
        b2 = await manager.launch()
        assert b2 == mock_browser
        assert mock_chromium.launch.await_count == 1

        # New page
        page = await manager.new_page()
        assert page == "local_mock_page"

        # Close
        await manager.close()
        assert manager.is_active is False
        mock_browser.close.assert_awaited_once()
        mock_pw.stop.assert_awaited_once()


@pytest.mark.asyncio
async def test_local_browser_session_new_page_before_launch_raises() -> None:
    manager = LocalBrowserSessionManager()
    with pytest.raises(RuntimeError, match="Local browser session not launched"):
        await manager.new_page()


@pytest.mark.asyncio
async def test_local_browser_session_context_manager() -> None:
    mock_browser = MagicMock()
    mock_browser.is_connected = MagicMock(return_value=True)
    mock_browser.close = AsyncMock()

    mock_pw = MagicMock()
    mock_pw.chromium.launch = AsyncMock(return_value=mock_browser)
    mock_pw.stop = AsyncMock()

    with patch("app.browser.session.async_playwright") as mock_async_playwright:
        mock_pw_builder = MagicMock()
        mock_pw_builder.start = AsyncMock(return_value=mock_pw)
        mock_async_playwright.return_value = mock_pw_builder

        async with LocalBrowserSessionManager(headless=False) as mgr:
            assert mgr.is_active is True
            mock_pw.chromium.launch.assert_awaited_once_with(headless=False)

        assert mgr.is_active is False
        mock_browser.close.assert_awaited_once()
        mock_pw.stop.assert_awaited_once()


@pytest.mark.asyncio
async def test_local_browser_session_with_storage_state() -> None:
    """Verify LocalBrowserSessionManager creates context with storage_state."""
    mock_context = MagicMock()
    mock_context.new_page = AsyncMock(return_value="authenticated_page")
    mock_context.close = AsyncMock()

    mock_browser = MagicMock()
    mock_browser.is_connected = MagicMock(return_value=True)
    mock_browser.new_context = AsyncMock(return_value=mock_context)
    mock_browser.close = AsyncMock()

    mock_chromium = MagicMock()
    mock_chromium.launch = AsyncMock(return_value=mock_browser)

    mock_pw = MagicMock()
    mock_pw.chromium = mock_chromium
    mock_pw.stop = AsyncMock()

    with patch("app.browser.session.async_playwright") as mock_async_playwright:
        mock_pw_builder = MagicMock()
        mock_pw_builder.start = AsyncMock(return_value=mock_pw)
        mock_async_playwright.return_value = mock_pw_builder

        manager = LocalBrowserSessionManager(headless=True, storage_state="auth.json")
        await manager.launch()

        page = await manager.new_page()
        assert page == "authenticated_page"
        mock_browser.new_context.assert_awaited_once_with(storage_state="auth.json")
        mock_context.new_page.assert_awaited_once()

        # Calling new_page again reuses context
        page2 = await manager.new_page()
        assert page2 == "authenticated_page"
        assert mock_browser.new_context.await_count == 1

        # Close releases context and browser
        await manager.close()
        mock_context.close.assert_awaited_once()
        mock_browser.close.assert_awaited_once()
        mock_pw.stop.assert_awaited_once()
