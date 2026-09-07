"""Browser automation package for Solari and Patchright."""

from app.browser.session import SolariSessionManager
from app.browser.observer import BrowserObserver
from app.browser.actions import ActionDispatcher
from app.browser.diagnostics import DiagnosticsCollector

__all__ = [
    "SolariSessionManager",
    "BrowserObserver",
    "ActionDispatcher",
    "DiagnosticsCollector",
]
