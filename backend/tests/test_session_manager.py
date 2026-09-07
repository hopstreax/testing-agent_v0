"""Unit tests for SolariSessionManager."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.browser.session import SolariSessionManager


def test_session_manager_missing_key(monkeypatch):
    monkeypatch.delenv("SOLARI_API_KEY", raising=False)
    with pytest.raises(ValueError, match="SOLARI_API_KEY is required"):
        SolariSessionManager(api_key=None)


@pytest.mark.asyncio
async def test_session_manager_lifecycle():
    mock_browser = MagicMock()
    mock_browser.id = "sess_mock_123"
    mock_browser.is_connected = True
    mock_browser.new_page = AsyncMock(return_value="mock_page")
    mock_browser.close = AsyncMock()

    mock_client = MagicMock()
    mock_client.launch = AsyncMock(return_value=mock_browser)
    mock_client.close = AsyncMock()

    with patch("app.browser.session.Solari", return_value=mock_client):
        manager = SolariSessionManager(api_key="test_key")
        assert manager.is_active is False

        await manager.launch(recording=True)
        assert manager.is_active is True
        assert manager.session_id == "sess_mock_123"

        page = await manager.new_page()
        assert page == "mock_page"

        await manager.close()
        assert manager.is_active is False
        assert manager.session_id is None
        mock_browser.close.assert_awaited_once()
        mock_client.close.assert_awaited_once()


@pytest.mark.asyncio
async def test_session_manager_close_idempotency():
    mock_browser = MagicMock()
    mock_browser.close = AsyncMock()

    mock_client = MagicMock()
    mock_client.launch = AsyncMock(return_value=mock_browser)
    mock_client.close = AsyncMock()

    with patch("app.browser.session.Solari", return_value=mock_client):
        manager = SolariSessionManager(api_key="test_key")
        await manager.launch()

        # First close
        await manager.close()
        assert mock_browser.close.await_count == 1
        assert mock_client.close.await_count == 1

        # Second close should be a no-op
        await manager.close()
        assert mock_browser.close.await_count == 1
        assert mock_client.close.await_count == 1


@pytest.mark.asyncio
async def test_session_manager_close_preserves_client_cleanup_on_browser_error():
    mock_browser = MagicMock()
    mock_browser.close = AsyncMock(side_effect=RuntimeError("Browser close failed"))

    mock_client = MagicMock()
    mock_client.launch = AsyncMock(return_value=mock_browser)
    mock_client.close = AsyncMock()

    with patch("app.browser.session.Solari", return_value=mock_client):
        manager = SolariSessionManager(api_key="test_key")
        await manager.launch()

        with pytest.raises(RuntimeError, match="Browser close failed"):
            await manager.close()

        # Client cleanup must have still been executed
        mock_client.close.assert_awaited_once()
        assert manager.is_active is False
        assert manager.session_id is None
