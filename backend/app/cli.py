"""Command-line interface entry point for executing autonomous website tests."""

import argparse
import asyncio
import os
from pathlib import Path
import sys
from typing import Optional

from dotenv import load_dotenv

from app.runner import TestRunner, resolve_llm_provider


def parse_args(args: Optional[list[str]] = None) -> argparse.Namespace:
    """Parse command line arguments for the testing agent runner."""
    parser = argparse.ArgumentParser(
        prog="python -m app.cli",
        description="Autonomous Website Testing Agent CLI",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Subcommand: run
    run_parser = subparsers.add_parser("run", help="Run an autonomous website test")
    run_parser.add_argument(
        "--url",
        required=True,
        type=str,
        help="Target website URL to test (e.g. https://example.com)",
    )
    run_parser.add_argument(
        "--goal",
        required=True,
        type=str,
        help="Natural language testing objective",
    )
    run_parser.add_argument(
        "--browser",
        choices=["local", "solari"],
        default="local",
        help="Browser engine to use (default: local Patchright Chromium)",
    )
    run_parser.add_argument(
        "--headless",
        dest="headless",
        action="store_true",
        default=True,
        help="Run browser in headless mode (default)",
    )
    run_parser.add_argument(
        "--headed",
        dest="headless",
        action="store_false",
        help="Run browser in visible headed mode",
    )
    run_parser.add_argument(
        "--max-steps",
        type=int,
        default=15,
        help="Maximum agent reasoning/action steps (default: 15)",
    )
    run_parser.add_argument(
        "--artifacts-dir",
        type=str,
        default="artifacts/runs",
        help="Base directory for storing run artifacts (default: artifacts/runs)",
    )
    run_parser.add_argument(
        "--provider",
        type=str,
        choices=["gemini", "groq", "ollama"],
        default=None,
        help="Specific LLM reasoning provider (default: fallback chain)",
    )
    run_parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="LLM model name override",
    )

    # Subcommand: serve
    serve_parser = subparsers.add_parser("serve", help="Launch local dashboard web server")
    serve_parser.add_argument(
        "--host",
        type=str,
        default="127.0.0.1",
        help="Host interface to bind (default: 127.0.0.1)",
    )
    serve_parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to listen on (default: 8000)",
    )
    serve_parser.add_argument(
        "--reload",
        action="store_true",
        default=False,
        help="Enable auto-reload for local development",
    )

    return parser.parse_args(args)


async def run_cli(args: argparse.Namespace) -> int:
    """Execute the CLI run command asynchronously."""
    print("=" * 64)
    print("AUTONOMOUS WEBSITE TESTING AGENT — TEST EXECUTION")
    print("=" * 64)
    print(f"Goal       : {args.goal}")
    print(f"Target URL : {args.url}")
    print(f"Browser    : {args.browser} ({'headless' if args.headless else 'headed'})")
    print(f"Provider   : {args.provider or 'auto-fallback'}")
    print(f"Max Steps  : {args.max_steps}")
    print("=" * 64)
    print("Launching test execution...")

    provider = resolve_llm_provider(provider_name=args.provider, model=args.model)
    runner = TestRunner(
        artifacts_base_dir=args.artifacts_dir,
        llm_provider=provider,
        browser_type=args.browser,
        headless=args.headless,
        max_steps=args.max_steps,
    )

    result, run_dir = await runner.run(url=args.url, goal=args.goal)

    print("\n" + "=" * 64)
    status_label = "PASSED" if result.success else "FAILED"
    print(f"TEST OUTCOME: {status_label}")
    print("=" * 64)
    print(f"Termination: {result.termination_reason}")
    if not result.success and result.failure_diagnosis:
        print(f"Classification: {result.failure_diagnosis.classification}")
        print(f"Cause      : {result.failure_diagnosis.cause}")
        print(f"Reason     : {result.failure_diagnosis.summary}")
    else:
        print(f"Message    : {result.message}")
    print(f"Steps      : {result.steps_executed}")
    print(f"Duration   : {result.duration_ms} ms ({result.duration_ms / 1000:.2f}s)")
    print(f"Run Dir    : {run_dir}")
    print(f"Report JSON: {run_dir / 'report.json'}")
    print(f"Report MD  : {run_dir / 'report.md'}")
    print("=" * 64)

    return 0 if result.success else 1


def main() -> None:
    """Synchronous CLI entry point."""
    load_dotenv()
    args = parse_args()
    if args.command == "run":
        exit_code = asyncio.run(run_cli(args))
        sys.exit(exit_code)
    elif args.command == "serve":
        import uvicorn
        if getattr(args, "reload", False):
            uvicorn.run("app.server:app", host=args.host, port=args.port, reload=True)
        else:
            from app.server import app
            uvicorn.run(app, host=args.host, port=args.port)
        sys.exit(0)
    sys.exit(1)


if __name__ == "__main__":
    main()
