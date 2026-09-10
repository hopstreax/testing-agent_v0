"""Unit tests for TestRunner execution lifecycle, failure safety, and CLI."""

import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from app.cli import parse_args
from app.llm.mock import MockLLMProvider
from app.models.actions import (
    AssertAction,
    FinishAction,
    StepDecision,
)
from app.runner import TestRunner, resolve_llm_provider
from tests.test_agent_core import make_mock_page


def test_cli_parse_args_defaults() -> None:
    args = parse_args(["run", "--url", "https://example.com", "--goal", "Check title"])
    assert args.command == "run"
    assert args.url == "https://example.com"
    assert args.goal == "Check title"
    assert args.browser == "local"
    assert args.headless is True
    assert args.max_steps == 15
    assert args.artifacts_dir == "artifacts/runs"
    assert args.provider is None


def test_cli_parse_args_headed_and_provider() -> None:
    args = parse_args([
        "run",
        "--url",
        "https://test.com",
        "--goal",
        "Test form",
        "--browser",
        "solari",
        "--headed",
        "--max-steps",
        "10",
        "--provider",
        "gemini",
    ])
    assert args.browser == "solari"
    assert args.headless is False
    assert args.max_steps == 10
    assert args.provider == "gemini"


def test_resolve_llm_provider() -> None:
    gemini_p = resolve_llm_provider("gemini")
    assert gemini_p.provider_name == "gemini"

    groq_p = resolve_llm_provider("groq")
    assert groq_p.provider_name == "groq"

    ollama_p = resolve_llm_provider("ollama")
    assert ollama_p.provider_name == "ollama"

    fallback_p = resolve_llm_provider(None)
    assert "fallback" in fallback_p.provider_name


def test_runner_create_run_directory(tmp_path: Path) -> None:
    runner = TestRunner(artifacts_base_dir=tmp_path)
    run_id, run_dir = runner.create_run_directory()

    assert run_dir.exists()
    assert (run_dir / "screenshots").exists()
    assert run_dir.name == run_id


@pytest.mark.asyncio
async def test_runner_executes_successful_test_and_generates_reports(tmp_path: Path) -> None:
    mock_page = make_mock_page()

    provider = MockLLMProvider(script=[
        StepDecision(
            observation_summary="Page loaded",
            decision="Assert heading visible",
            action=AssertAction(assertion_type="visible", role="heading", name="Welcome"),
        ),
        StepDecision(
            observation_summary="Heading verified",
            decision="Finish test successfully",
            action=FinishAction(success=True, message="Goal achieved"),
        ),
    ])

    mock_session = MagicMock()
    mock_session.launch = AsyncMock()
    mock_session.new_page = AsyncMock(return_value=mock_page)
    mock_session.close = AsyncMock()

    runner = TestRunner(
        artifacts_base_dir=tmp_path,
        llm_provider=provider,
    )

    with patch.object(runner, "_create_session_manager", return_value=mock_session):
        result, run_dir = await runner.run(
            url="https://example.com",
            goal="Verify welcome heading",
        )

        assert result.success is True
        assert result.termination_reason == "goal_achieved"
        assert result.steps_executed == 2
        assert run_dir.exists()

        # Check report files exist
        json_report = run_dir / "report.json"
        md_report = run_dir / "report.md"
        assert json_report.exists()
        assert md_report.exists()

        # Check JSON report content
        with open(json_report, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert data["success"] is True
        assert data["goal"] == "Verify welcome heading"
        assert data["target_url"] == "https://example.com"
        assert len(data["assertions"]) == 1
        assert data["assertions"][0]["assertion_type"] == "visible"
        assert data["assertions"][0]["success"] is True

        # Check session manager was closed
        mock_session.close.assert_awaited_once()


@pytest.mark.asyncio
async def test_runner_failure_safety_still_generates_reports(tmp_path: Path) -> None:
    """When a failure occurs, the runner still generates report.json and report.md."""
    mock_session = MagicMock()
    mock_session.launch = AsyncMock(side_effect=RuntimeError("Browser launch crash"))
    mock_session.close = AsyncMock()

    runner = TestRunner(artifacts_base_dir=tmp_path)

    with patch.object(runner, "_create_session_manager", return_value=mock_session):
        result, run_dir = await runner.run(
            url="https://example.com",
            goal="Test crash handling",
        )

        assert result.success is False
        assert result.termination_reason == "unrecoverable_error"
        assert "Browser launch crash" in result.message

        json_report = run_dir / "report.json"
        md_report = run_dir / "report.md"
        assert json_report.exists()
        assert md_report.exists()

        with open(json_report, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert data["success"] is False
        assert data["termination_reason"] == "unrecoverable_error"


@pytest.mark.asyncio
async def test_runner_screenshot_wiring_policy(tmp_path: Path) -> None:
    """Verify screenshot policy captures initial, assert success, and finish screenshots."""
    mock_page = make_mock_page()

    provider = MockLLMProvider(script=[
        StepDecision(
            observation_summary="Page loaded",
            decision="Verify welcome heading",
            action=AssertAction(assertion_type="visible", role="heading", name="Welcome"),
        ),
        StepDecision(
            observation_summary="Heading verified",
            decision="Finish test successfully",
            action=FinishAction(success=True, message="Goal achieved"),
        ),
    ])

    mock_session = MagicMock()
    mock_session.launch = AsyncMock()
    mock_session.new_page = AsyncMock(return_value=mock_page)
    mock_session.close = AsyncMock()

    runner = TestRunner(
        artifacts_base_dir=tmp_path,
        llm_provider=provider,
    )

    with patch.object(runner, "_create_session_manager", return_value=mock_session):
        result, run_dir = await runner.run(
            url="https://example.com",
            goal="Verify screenshot wiring",
        )

        assert result.success is True
        # Page screenshot was invoked for initial observation, assertion, and final state
        assert mock_page.screenshot.await_count >= 2
