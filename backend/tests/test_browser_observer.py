"""Unit tests for BrowserObserver observation extraction."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from app.browser.observer import BrowserObserver


@pytest.mark.asyncio
async def test_capture_observation(tmp_path):
    observer = BrowserObserver()
    mock_page = MagicMock()
    mock_page.url = "https://example.com/test"
    mock_page.title = AsyncMock(return_value="Test Page Title")
    mock_page.aria_snapshot = AsyncMock(return_value="- button 'Submit'")
    mock_page.screenshot = AsyncMock()

    screenshot_file = tmp_path / "subdir" / "step_01.png"
    observation = await observer.capture_observation(mock_page, screenshot_path=screenshot_file)

    assert observation.url == "https://example.com/test"
    assert observation.title == "Test Page Title"
    assert observation.aria_snapshot == "- button 'Submit'"
    assert observation.screenshot_path == str(screenshot_file.resolve())

    mock_page.aria_snapshot.assert_awaited_once_with(mode="ai", boxes=True)
    mock_page.screenshot.assert_awaited_once_with(path=str(screenshot_file.resolve()), full_page=False)
