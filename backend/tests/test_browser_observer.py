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


@pytest.mark.asyncio
async def test_observer_settle_page_bounded_behavior():
    """Verify settle_page invokes wait_for_load_state with bounded timeout and evaluates frame drain."""
    observer = BrowserObserver()
    mock_page = MagicMock()
    mock_page.wait_for_load_state = AsyncMock()
    mock_page.evaluate = AsyncMock()

    await observer.settle_page(mock_page, timeout_ms=3000)

    mock_page.wait_for_load_state.assert_awaited_once_with("domcontentloaded", timeout=3000)
    mock_page.evaluate.assert_awaited_once()


@pytest.mark.asyncio
async def test_observer_settle_page_stable_fast_path():
    """Verify a stable page does not incur multi-second delays."""
    import time

    observer = BrowserObserver()
    mock_page = MagicMock()
    mock_page.wait_for_load_state = AsyncMock()
    mock_page.evaluate = AsyncMock()

    start = time.perf_counter()
    await observer.settle_page(mock_page)
    elapsed = time.perf_counter() - start

    assert elapsed < 0.2  # Should complete in milliseconds on fast path


@pytest.mark.asyncio
async def test_observer_settle_delayed_navigation():
    """Verify simulated delayed navigation is awaited and completes smoothly."""
    import asyncio

    observer = BrowserObserver()
    mock_page = MagicMock()

    async def delayed_load_state(state, timeout=None):
        await asyncio.sleep(0.05)

    mock_page.wait_for_load_state = AsyncMock(side_effect=delayed_load_state)
    mock_page.evaluate = AsyncMock()

    await observer.settle_page(mock_page, timeout_ms=2500)
    mock_page.wait_for_load_state.assert_awaited_once_with("domcontentloaded", timeout=2500)


@pytest.mark.asyncio
async def test_observer_settle_timeout_handled_gracefully():
    """Verify settling timeout does not crash observation capture."""
    observer = BrowserObserver()
    mock_page = MagicMock()
    mock_page.wait_for_load_state = AsyncMock(side_effect=TimeoutError("Navigation timeout of 2500ms exceeded"))
    mock_page.evaluate = AsyncMock()
    mock_page.url = "https://example.com"
    mock_page.title = AsyncMock(return_value="Delayed Page")
    mock_page.aria_snapshot = AsyncMock(return_value="- heading 'Delayed Page'")

    # Should not raise TimeoutError
    obs = await observer.capture_observation(mock_page)
    assert obs.url == "https://example.com"
    assert obs.title == "Delayed Page"
    assert obs.aria_snapshot == "- heading 'Delayed Page'"


@pytest.mark.asyncio
async def test_observer_settle_evaluate_destroyed_context_handled_gracefully():
    """Verify execution context destruction during navigation is handled gracefully."""
    observer = BrowserObserver()
    mock_page = MagicMock()
    mock_page.wait_for_load_state = AsyncMock()
    mock_page.evaluate = AsyncMock(side_effect=Exception("Execution context was destroyed, most likely because of a navigation."))

    # Should not raise
    await observer.settle_page(mock_page, timeout_ms=2500)
    assert mock_page.wait_for_load_state.await_count >= 1
