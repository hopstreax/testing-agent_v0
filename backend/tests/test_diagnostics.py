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
    assert summary["recent_console_errors"] == ["SyntaxError: Unexpected token"]
    assert len(summary["recent_failed_requests"]) == 2
    assert "404 Not Found - https://api.com/user" in summary["recent_failed_requests"][0]
    assert "GET https://api.com/data (net::ERR_CONNECTION_REFUSED)" in summary["recent_failed_requests"][1]

    collector.clear()
    assert collector.get_summary()["has_errors"] is False
    assert collector.get_summary()["recent_console_errors"] == []
    assert collector.get_summary()["recent_failed_requests"] == []


def test_diagnostics_summary_bounded_recent_entries():
    """Verify that recent_console_errors and recent_failed_requests are strictly bounded to 3."""
    collector = DiagnosticsCollector()

    for i in range(5):
        collector._handle_console(MagicMock(type="error", text=f"Console error {i}", location=None))
        collector._handle_response(MagicMock(status=400 + i, url=f"https://api.com/error_{i}", status_text="Error"))

    summary = collector.get_summary()
    assert summary["console_error_count"] == 5
    assert summary["http_error_count"] == 5

    assert len(summary["recent_console_errors"]) == 3
    assert summary["recent_console_errors"] == [
        "Console error 2",
        "Console error 3",
        "Console error 4",
    ]

    assert len(summary["recent_failed_requests"]) == 3
    assert "https://api.com/error_2" in summary["recent_failed_requests"][0]
    assert "https://api.com/error_3" in summary["recent_failed_requests"][1]
    assert "https://api.com/error_4" in summary["recent_failed_requests"][2]


def test_diagnostics_sanitizes_credentials():
    """Verify that credentials, tokens, and query parameters are redacted from recent diagnostics."""
    collector = DiagnosticsCollector()

    collector._handle_console(MagicMock(
        type="error",
        text="Auth failed with token=secret123 and Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        location=None,
    ))
    collector._handle_response(MagicMock(
        status=401,
        url="https://api.com/auth?token=my_secret_token&key=secret_key&session=sess_123",
        status_text="Unauthorized",
    ))

    summary = collector.get_summary()
    assert "secret123" not in summary["recent_console_errors"][0]
    assert "eyJhbGci" not in summary["recent_console_errors"][0]
    assert "[REDACTED]" in summary["recent_console_errors"][0]

    assert "my_secret_token" not in summary["recent_failed_requests"][0]
    assert "secret_key" not in summary["recent_failed_requests"][0]
    assert "sess_123" not in summary["recent_failed_requests"][0]
    assert "token=[REDACTED]" in summary["recent_failed_requests"][0]
