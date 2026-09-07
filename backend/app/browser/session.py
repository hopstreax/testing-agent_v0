"""Session management wrapping the real Solari Cloud Browser SDK."""

import os
from typing import Any, Optional
from solari_browser import Solari
from solari_browser.errors import SolariError


class SolariSessionManager:
    """Manages the lifecycle of a remote Solari Browser session and local driver."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ) -> None:
        self.api_key = api_key or os.getenv("SOLARI_API_KEY")
        if not self.api_key:
            raise ValueError(
                "SOLARI_API_KEY is required. Please set it in environment or pass to SolariSessionManager."
            )
        self.base_url = base_url
        self._client: Optional[Solari] = None
        self._browser: Optional[Any] = None
        self._session_id: Optional[str] = None

    @property
    def session_id(self) -> Optional[str]:
        """Returns active Solari session ID."""
        return self._session_id

    @property
    def browser(self) -> Optional[Any]:
        """Returns active Patchright browser session instance."""
        return self._browser

    @property
    def is_active(self) -> bool:
        """Returns True if a browser session is currently active and connected."""
        return self._browser is not None and getattr(self._browser, "is_connected", False)

    async def launch(self, recording: bool = False, stealth: bool = False) -> Any:
        """Launch a remote Solari browser session.

        Solari.launch() creates the remote cloud session and connects over Patchright
        internally, returning a BrowserSession instance.
        """
        if self._browser is not None:
            return self._browser

        kwargs: dict[str, Any] = {"api_key": self.api_key}
        if self.base_url:
            kwargs["base_url"] = self.base_url

        self._client = Solari(**kwargs)
        self._browser = await self._client.launch(recording=recording, stealth=stealth)
        self._session_id = getattr(self._browser, "id", None)
        return self._browser

    async def new_page(self) -> Any:
        """Create and return a new Patchright Page on the active session."""
        if not self._browser:
            raise RuntimeError("Browser session not launched. Call launch() first.")
        return await self._browser.new_page()

    async def close(self) -> None:
        """Close the browser session and release both the remote slot and local driver."""
        browser = self._browser
        client = self._client
        self._browser = None
        self._session_id = None
        self._client = None

        try:
            if browser is not None:
                await browser.close()
        finally:
            if client is not None:
                await client.close()

    async def __aenter__(self) -> "SolariSessionManager":
        await self.launch()
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self.close()
