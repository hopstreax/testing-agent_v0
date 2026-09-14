"""Browser observation extractor for ARIA snapshots and screenshots."""

import inspect
from pathlib import Path
from typing import Any, Optional, Union
from app.models.actions import ObservationPayload


class BrowserObserver:
    """Extracts semantic ARIA snapshots and visual screenshots from a Patchright Page."""

    async def settle_page(self, page: Any, timeout_ms: int = 2500) -> None:
        """Settle page state deterministically before extracting observations.

        Uses standard browser signals:
        1. Awaits DOMContentLoaded if navigation is in flight with a bounded timeout.
        2. Waits for a browser animation frame and microtask queue drain so
           client-side UI updates (React/Vue/vanilla) have flushed to the DOM.
        """
        try:
            if hasattr(page, "wait_for_load_state") and callable(page.wait_for_load_state):
                res = page.wait_for_load_state("domcontentloaded", timeout=timeout_ms)
                if inspect.isawaitable(res):
                    await res
        except Exception:
            pass

        try:
            if hasattr(page, "evaluate") and callable(page.evaluate):
                res = page.evaluate(
                    "() => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)))"
                )
                if inspect.isawaitable(res):
                    await res
        except Exception:
            try:
                if hasattr(page, "wait_for_load_state") and callable(page.wait_for_load_state):
                    res = page.wait_for_load_state("domcontentloaded", timeout=timeout_ms)
                    if inspect.isawaitable(res):
                        await res
            except Exception:
                pass

    async def capture_observation(
        self,
        page: Any,
        screenshot_path: Optional[Union[str, Path]] = None,
        settle: bool = True,
        settle_timeout_ms: int = 2500,
    ) -> ObservationPayload:
        """Capture accessibility tree and viewport state.

        Args:
            page: Active Patchright Page instance.
            screenshot_path: Optional local file path where PNG screenshot should be saved.
            settle: Whether to wait for deterministic browser settling before snapshot.
            settle_timeout_ms: Maximum bounded milliseconds to wait for page settling.
        """
        if settle:
            await self.settle_page(page, timeout_ms=settle_timeout_ms)

        # Primary semantic observation
        aria_tree = await page.aria_snapshot(mode="ai", boxes=True)

        # Page metadata
        url = getattr(page, "url", "")
        title = await page.title()

        # Evidence screenshot capture if requested
        saved_screenshot_str: Optional[str] = None
        if screenshot_path:
            path_obj = Path(screenshot_path).resolve()
            path_obj.parent.mkdir(parents=True, exist_ok=True)
            await page.screenshot(path=str(path_obj), full_page=False)
            saved_screenshot_str = str(path_obj)

        return ObservationPayload(
            url=url,
            title=title,
            aria_snapshot=aria_tree,
            screenshot_path=saved_screenshot_str,
        )
