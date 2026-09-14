"""CDP event listener and diagnostics collector for browser errors."""

import re
from typing import Any, Dict, List

SENSITIVE_PARAM_PATTERN = re.compile(
    r"(?i)(token|key|secret|password|auth|api_key|access_token|session)=([^&]+)"
)


def sanitize_url(url: str) -> str:
    """Mask common sensitive query parameters in captured URLs."""
    if not url:
        return ""
    return SENSITIVE_PARAM_PATTERN.sub(r"\1=[REDACTED]", url)


def sanitize_error_text(text: str) -> str:
    """Mask credentials, tokens, or bearer headers in error text."""
    if not text:
        return ""
    text = SENSITIVE_PARAM_PATTERN.sub(r"\1=[REDACTED]", text)
    if "Bearer " in text:
        text = re.sub(r"Bearer\s+[A-Za-z0-9\-\._~+/]+=*", "Bearer [REDACTED]", text)
    return text


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
        """Return a structured summary of captured anomalies with bounded recent details."""
        # Recent console errors (at most 3, sanitized)
        recent_console: List[str] = [
            sanitize_error_text(e.get("text", "") or str(e))
            for e in self.console_errors[-3:]
        ]

        # Recent failed requests (HTTP status >= 400 and network transport failures, at most 3, sanitized)
        failed_req_entries: List[str] = []
        for h in self.http_errors:
            status = h.get("status", "")
            url = sanitize_url(h.get("url", ""))
            status_text = h.get("status_text", "")
            label = f"{status} {status_text}".strip() if status_text else str(status)
            failed_req_entries.append(f"{label} - {url}".strip(" -"))
        for r in self.failed_requests:
            url = sanitize_url(r.get("url", ""))
            method = r.get("method", "")
            err = r.get("error_text", "Failed")
            prefix = f"{method} " if method else ""
            failed_req_entries.append(f"{prefix}{url} ({err})".strip())

        recent_failed = failed_req_entries[-3:]

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
            "recent_console_errors": recent_console,
            "recent_failed_requests": recent_failed,
        }
