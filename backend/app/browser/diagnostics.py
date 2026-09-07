"""CDP event listener and diagnostics collector for browser errors."""

from typing import Any, Dict, List


class DiagnosticsCollector:
    """Collects runtime console errors, page exceptions, and HTTP network failures."""

    def __init__(self) -> None:
        self.console_errors: List[Dict[str, Any]] = []
        self.page_errors: List[Dict[str, Any]] = []
        self.http_errors: List[Dict[str, Any]] = []
        self.failed_requests: List[Dict[str, Any]] = []

    def attach(self, page: Any) -> None:
        """Register diagnostic event listeners on a Patchright Page."""
        page.on("console", self._handle_console)
        page.on("pageerror", self._handle_pageerror)
        page.on("response", self._handle_response)
        page.on("requestfailed", self._handle_requestfailed)

    def _handle_console(self, msg: Any) -> None:
        if getattr(msg, "type", "") == "error":
            self.console_errors.append({
                "type": msg.type,
                "text": getattr(msg, "text", str(msg)),
                "location": getattr(msg, "location", None),
            })

    def _handle_pageerror(self, error: Any) -> None:
        self.page_errors.append({
            "message": str(error),
            "type": type(error).__name__,
        })

    def _handle_response(self, response: Any) -> None:
        status = getattr(response, "status", 200)
        if status >= 400:
            self.http_errors.append({
                "status": status,
                "url": getattr(response, "url", ""),
                "status_text": getattr(response, "status_text", ""),
            })

    def _handle_requestfailed(self, request: Any) -> None:
        failure = getattr(request, "failure", None)
        self.failed_requests.append({
            "url": getattr(request, "url", ""),
            "method": getattr(request, "method", ""),
            "error_text": str(failure) if failure else "Unknown failure",
        })

    def clear(self) -> None:
        """Reset collected diagnostics buffers."""
        self.console_errors.clear()
        self.page_errors.clear()
        self.http_errors.clear()
        self.failed_requests.clear()

    def get_summary(self) -> Dict[str, Any]:
        """Return a structured summary of captured anomalies."""
        return {
            "console_error_count": len(self.console_errors),
            "page_error_count": len(self.page_errors),
            "http_error_count": len(self.http_errors),
            "failed_request_count": len(self.failed_requests),
            "has_errors": any([
                self.console_errors,
                self.page_errors,
                self.http_errors,
                self.failed_requests,
            ]),
        }
