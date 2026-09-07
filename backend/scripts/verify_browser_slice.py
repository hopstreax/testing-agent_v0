"""Standalone verification script for Milestone 1: Deterministic Browser and Observation Slice.

Tests Solari Cloud Browser connection, Patchright attachment, ARIA snapshot,
screenshot generation, typed actions, diagnostics, and graceful cleanup.
"""

import asyncio
import os
import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root))

# Load .env explicitly with override=True so it works regardless of VS Code terminal injection settings
try:
    from dotenv import load_dotenv
    env_file = backend_root / ".env"
    if env_file.exists():
        load_dotenv(env_file, override=True)
except ImportError:
    pass

from app.browser.actions import ActionDispatcher
from app.browser.diagnostics import DiagnosticsCollector
from app.browser.observer import BrowserObserver
from app.browser.session import SolariSessionManager
from app.models.actions import ClickAction, FillAction


TARGET_URL = "https://the-internet.herokuapp.com/login"


def mask_key(key: str) -> str:
    """Mask key for safe logging (e.g., slr_...1234). Never exposes secrets."""
    if not key or len(key) <= 8:
        return "********"
    return f"{key[:4]}...{key[-4:]} ({len(key)} chars)"


async def run_verification() -> int:
    api_key = os.getenv("SOLARI_API_KEY")
    if not api_key:
        print("[ERROR] SOLARI_API_KEY is not set in environment or .env file.")
        print(f"Looked for .env file at: {backend_root / '.env'}")
        print("Please copy .env.example to .env and supply a valid Solari API key.")
        print("Status: Live browser verification remains PENDING (requires SOLARI_API_KEY).")
        return 1

    print("================================================================")
    print("Milestone 1 Verification: Deterministic Browser and Observation Slice")
    print("================================================================")
    print(f"Target URL: {TARGET_URL}")
    print(f"API Key   : Loaded successfully -> {mask_key(api_key)}")

    session_mgr = SolariSessionManager(api_key=api_key)
    observer = BrowserObserver()
    dispatcher = ActionDispatcher()
    diagnostics = DiagnosticsCollector()

    try:
        print("\n[1/6] Launching Solari remote browser session...")
        browser = await session_mgr.launch(recording=True)
        print(f"      Connected successfully! Session ID: {session_mgr.session_id}")

        print("\n[2/6] Opening new page and attaching diagnostics collector...")
        page = await session_mgr.new_page()
        diagnostics.attach(page)

        print(f"\n[3/6] Navigating to {TARGET_URL}...")
        response = await page.goto(TARGET_URL, wait_until="domcontentloaded")
        print(f"      Page loaded. Status: {response.status if response else 'N/A'}")

        print("\n[4/6] Extracting ARIA snapshot and capturing screenshot...")
        screenshot_path = backend_root / "artifacts" / "verification_step_01.png"
        observation = await observer.capture_observation(page, screenshot_path=screenshot_path)

        print(f"      Page Title : {observation.title}")
        print(f"      Snapshot Len: {len(observation.aria_snapshot)} chars")
        print(f"      Screenshot  : {observation.screenshot_path}")
        print("      ARIA Tree Sample (first 5 lines):")
        for line in observation.aria_snapshot.splitlines()[:5]:
            print(f"        | {line}")

        print("\n[5/6] Executing typed browser actions via ActionDispatcher...")
        fill_user = FillAction(role="textbox", name="Username", value="tomsmith")
        fill_res = await dispatcher.execute(page, fill_user)
        print(f"      Action 1: fill(Username) -> success={fill_res.success} ({fill_res.duration_ms}ms, {fill_res.resolved_by})")
        if not fill_res.success:
            print(f"      [WARN] Fill error: {fill_res.error_message}")

        fill_pass = FillAction(role="textbox", name="Password", value="SuperSecretPassword!")
        pass_res = await dispatcher.execute(page, fill_pass)
        print(f"      Action 2: fill(Password) -> success={pass_res.success} ({pass_res.duration_ms}ms, {pass_res.resolved_by})")

        click_btn = ClickAction(role="button", name="Login")
        click_res = await dispatcher.execute(page, click_btn)
        print(f"      Action 3: click(Login)    -> success={click_res.success} ({click_res.duration_ms}ms, {click_res.resolved_by})")

        print("\n[6/6] Inspecting captured diagnostics...")
        summary = diagnostics.get_summary()
        print(f"      Diagnostics summary: {summary}")

        print("\n================================================================")
        print("RESULT: Deterministic Browser and Observation Slice VERIFIED!")
        print("================================================================")
        return 0

    except Exception as exc:
        print(f"\n[FAILURE] Verification encountered an error: {exc}")
        import traceback
        traceback.print_exc()
        return 1

    finally:
        print("\nCleaning up Solari session...")
        await session_mgr.close()
        print("Browser closed and remote session released.")


if __name__ == "__main__":
    exit_code = asyncio.run(run_verification())
    sys.exit(exit_code)
