"""Unit tests for DiagnosticsCollector event handling."""

from unittest.mock import MagicMock
from app.browser.diagnostics import DiagnosticsCollector


def test_diagnostics_collection():
    collector = DiagnosticsCollector()
    mock_page = MagicMock()
    collector.attach(mock_page)

    assert mock_page.on.call_count == 4

    # Simulate console error
    error_msg = MagicMock(type="error", text="SyntaxError: Unexpected token", location={"url": "app.js"})
    collector._handle_console(error_msg)

    # Simulate console info (should be ignored)
    info_msg = MagicMock(type="info", text="App started")
    collector._handle_console(info_msg)

    # Simulate page error
    collector._handle_pageerror(RuntimeError("Uncaught exception"))

    # Simulate HTTP 404 response
    res_404 = MagicMock(status=404, url="https://api.com/user", status_text="Not Found")
    collector._handle_response(res_404)

    # Simulate HTTP 200 response (should be ignored)
    res_200 = MagicMock(status=200, url="https://api.com/ok", status_text="OK")
    collector._handle_response(res_200)

    # Simulate failed request
    failed_req = MagicMock(url="https://api.com/data", method="GET", failure="net::ERR_CONNECTION_REFUSED")
    collector._handle_requestfailed(failed_req)

    summary = collector.get_summary()
    assert summary["console_error_count"] == 1
    assert summary["page_error_count"] == 1
    assert summary["http_error_count"] == 1
    assert summary["failed_request_count"] == 1
    assert summary["has_errors"] is True

    collector.clear()
    assert collector.get_summary()["has_errors"] is False
