"""Browser observation extractor for ARIA snapshots and screenshots."""

from pathlib import Path
from typing import Any, Optional, Union
from app.models.actions import ObservationPayload


class BrowserObserver:
    """Extracts semantic ARIA snapshots and visual screenshots from a Patchright Page."""

    async def capture_observation(
        self,
        page: Any,
        screenshot_path: Optional[Union[str, Path]] = None,
    ) -> ObservationPayload:
        """Capture accessibility tree and viewport state.

        Args:
            page: Active Patchright Page instance.
            screenshot_path: Optional local file path where PNG screenshot should be saved.
        """
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
