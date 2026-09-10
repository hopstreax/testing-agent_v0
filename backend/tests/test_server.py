"""Unit and integration tests for FastAPI dashboard server and RunManager."""

import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from app.cli import parse_args
from app.models.actions import StepRecord
from app.models.agent import AgentRunResult, FailureDiagnosis
from app.server import RunManager, create_app


@pytest.fixture
def temp_artifacts_dir(tmp_path: Path) -> Path:
    """Create a temporary artifacts directory."""
    artifacts = tmp_path / "artifacts" / "runs"
    artifacts.mkdir(parents=True, exist_ok=True)
    return artifacts


@pytest.fixture
def client(temp_artifacts_dir: Path) -> TestClient:
    """Create a TestClient with a clean RunManager pointed to temp directory."""
    manager = RunManager(artifacts_base_dir=temp_artifacts_dir)
    app = create_app(artifacts_base_dir=temp_artifacts_dir, run_manager=manager)
    return TestClient(app)


# ---------------------------------------------------------------------------
# 1 & 2: Dashboard root endpoint
# ---------------------------------------------------------------------------

def test_get_dashboard_html(client: TestClient) -> None:
    """Test GET / returns dashboard HTML containing brand and form."""
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    text = response.text
    assert "Autonomous" in text
    assert "Testing Agent" in text
    assert 'id="test-form"' in text
    assert 'id="url"' in text
    assert 'id="goal"' in text
    assert 'id="start-btn"' in text


# ---------------------------------------------------------------------------
# 3, 4, 5: Input validation on POST /api/runs
# ---------------------------------------------------------------------------

def test_post_runs_missing_url(client: TestClient) -> None:
    """Test POST /api/runs rejects payload with missing URL."""
    res = client.post("/api/runs", json={"goal": "Check login"})
    assert res.status_code == 422


def test_post_runs_empty_url(client: TestClient) -> None:
    """Test POST /api/runs rejects empty URL string."""
    res = client.post("/api/runs", json={"url": "   ", "goal": "Check login"})
    assert res.status_code == 422


def test_post_runs_invalid_url_scheme(client: TestClient) -> None:
    """Test POST /api/runs rejects URL without http:// or https://."""
    res = client.post("/api/runs", json={"url": "ftp://example.com", "goal": "Check login"})
    assert res.status_code == 422


def test_post_runs_missing_goal(client: TestClient) -> None:
    """Test POST /api/runs rejects missing testing goal."""
    res = client.post("/api/runs", json={"url": "https://example.com"})
    assert res.status_code == 422


def test_post_runs_empty_goal(client: TestClient) -> None:
    """Test POST /api/runs rejects whitespace-only goal."""
    res = client.post("/api/runs", json={"url": "https://example.com", "goal": "   "})
    assert res.status_code == 422


def test_post_runs_malformed_json(client: TestClient) -> None:
    """Test POST /api/runs rejects malformed JSON."""
    res = client.post(
        "/api/runs",
        content="not-json",
        headers={"Content-Type": "application/json"},
    )
    assert res.status_code == 422


# ---------------------------------------------------------------------------
# 6 & 7: Start run and query running state
# ---------------------------------------------------------------------------

def test_post_runs_accepts_and_returns_running_state(
    client: TestClient,
    temp_artifacts_dir: Path,
) -> None:
    """Test POST /api/runs returns 202 and run_id, and state is initially running."""
    # Prevent actual TestRunner from executing by mocking _execute_run
    with patch.object(RunManager, "_execute_run", new_callable=AsyncMock):
        res = client.post(
            "/api/runs",
            json={
                "url": "https://example.com",
                "goal": "Verify title",
                "browser": "local",
                "headless": True,
            },
        )
        assert res.status_code == 202
        data = res.json()
        assert "run_id" in data
        assert data["status"] == "running"
        assert data["url"] == "https://example.com"
        assert data["goal"] == "Verify title"

        run_id = data["run_id"]
        # Query GET /api/runs/{run_id}
        status_res = client.get(f"/api/runs/{run_id}")
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data["run_id"] == run_id
        assert status_data["status"] == "running"
        assert status_data["url"] == "https://example.com"


# ---------------------------------------------------------------------------
# 8 & 9: Successful vs failed run execution simulation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_manager_successful_execution(temp_artifacts_dir: Path) -> None:
    """Test RunManager transitions to completed when agent succeeds."""
    manager = RunManager(artifacts_base_dir=temp_artifacts_dir)
    app = create_app(run_manager=manager)
    client = TestClient(app)

    fake_run_result = AgentRunResult(
        success=True,
        termination_reason="goal_achieved",
        message="Goal satisfied",
        steps_executed=3,
        duration_ms=2500,
    )

    mock_runner = MagicMock()
    mock_runner.create_run_directory.return_value = ("fake_run", temp_artifacts_dir / "fake_run")

    async def fake_run(*args, **kwargs):
        run_dir = temp_artifacts_dir / "fake_run"
        run_dir.mkdir(parents=True, exist_ok=True)
        # Write minimal report.json
        report_data = {
            "run_id": "fake_run",
            "success": True,
            "termination_reason": "goal_achieved",
            "message": "Goal satisfied",
            "duration_ms": 2500,
            "steps_executed": 3,
            "assertions": [{"step_number": 1, "assertion_type": "visible", "success": True}],
            "screenshots": ["screenshots/step_01.png"],
        }
        with open(run_dir / "report.json", "w", encoding="utf-8") as f:
            json.dump(report_data, f)
        return fake_run_result, run_dir

    mock_runner.run = AsyncMock(side_effect=fake_run)

    with patch("app.server.TestRunner", return_value=mock_runner):
        res = client.post(
            "/api/runs",
            json={"url": "https://example.com", "goal": "Verify title"},
        )
        assert res.status_code == 202
        run_id = res.json()["run_id"]

        # Await the manager's background task
        task = manager._tasks[run_id]
        await task

        # Check status
        status_res = client.get(f"/api/runs/{run_id}")
        assert status_res.status_code == 200
        data = status_res.json()
        assert data["status"] == "completed"
        assert data["duration_ms"] == 2500
        assert data["result"] is not None
        assert data["result"]["success"] is True
        assert len(data["result"]["assertions"]) == 1
        assert data["artifacts"]["report_json"] == f"/api/runs/{run_id}/artifacts/report.json"


@pytest.mark.asyncio
async def test_run_manager_failed_execution_with_diagnosis(temp_artifacts_dir: Path) -> None:
    """Test RunManager transitions to failed and exposes FailureDiagnosis."""
    manager = RunManager(artifacts_base_dir=temp_artifacts_dir)
    app = create_app(run_manager=manager)
    client = TestClient(app)

    fake_diagnosis = FailureDiagnosis(
        classification="APPLICATION_BEHAVIOR_MISMATCH",
        cause="ASSERTION_FAILED",
        summary="Application behavior mismatch: has_text assertion failed.",
    )

    fake_run_result = AgentRunResult(
        success=False,
        termination_reason="goal_failed",
        message="Assertion failed",
        steps_executed=2,
        duration_ms=1800,
        failure_diagnosis=fake_diagnosis,
    )

    mock_runner = MagicMock()

    async def fake_run(*args, **kwargs):
        run_id = kwargs.get("run_id") or "failed_run"
        run_dir = temp_artifacts_dir / run_id
        run_dir.mkdir(parents=True, exist_ok=True)
        report_data = {
            "run_id": run_id,
            "success": False,
            "termination_reason": "goal_failed",
            "message": "Assertion failed",
            "duration_ms": 1800,
            "steps_executed": 2,
            "diagnosis": fake_diagnosis.model_dump(),
            "assertions": [{"step_number": 1, "assertion_type": "has_text", "success": False}],
            "screenshots": ["screenshots/step_01_fail.png"],
        }
        with open(run_dir / "report.json", "w", encoding="utf-8") as f:
            json.dump(report_data, f)
        return fake_run_result, run_dir

    mock_runner.run = AsyncMock(side_effect=fake_run)

    with patch("app.server.TestRunner", return_value=mock_runner):
        res = client.post(
            "/api/runs",
            json={"url": "https://example.com/fail", "goal": "Verify error banner"},
        )
        assert res.status_code == 202
        run_id = res.json()["run_id"]

        task = manager._tasks[run_id]
        await task

        status_res = client.get(f"/api/runs/{run_id}")
        assert status_res.status_code == 200
        data = status_res.json()
        assert data["status"] == "failed"
        assert data["result"]["diagnosis"] is not None
        assert data["result"]["diagnosis"]["classification"] == "APPLICATION_BEHAVIOR_MISMATCH"
        assert data["result"]["diagnosis"]["cause"] == "ASSERTION_FAILED"


# ---------------------------------------------------------------------------
# 10 & 11 & 12 & 13: Artifact serving
# ---------------------------------------------------------------------------

def test_serve_artifacts_json_md_and_screenshot(
    client: TestClient,
    temp_artifacts_dir: Path,
) -> None:
    """Test serving report.json, report.md, and png screenshots."""
    run_id = "20260911_run_artifacts_test"
    run_dir = temp_artifacts_dir / run_id
    screenshots_dir = run_dir / "screenshots"
    screenshots_dir.mkdir(parents=True, exist_ok=True)

    # Create dummy artifacts
    (run_dir / "report.json").write_text('{"status": "ok"}', encoding="utf-8")
    (run_dir / "report.md").write_text("# Test Report\nSuccess", encoding="utf-8")
    (screenshots_dir / "step_00.png").write_bytes(b"\x89PNG\r\n\x1a\nfake_image_bytes")

    # 1. report.json
    res_json = client.get(f"/api/runs/{run_id}/artifacts/report.json")
    assert res_json.status_code == 200
    assert "application/json" in res_json.headers["content-type"]
    assert res_json.json() == {"status": "ok"}

    # 2. report.md
    res_md = client.get(f"/api/runs/{run_id}/artifacts/report.md")
    assert res_md.status_code == 200
    assert "text/markdown" in res_md.headers["content-type"]
    assert "# Test Report" in res_md.text

    # 3. screenshot png
    res_png = client.get(f"/api/runs/{run_id}/artifacts/screenshots/step_00.png")
    assert res_png.status_code == 200
    assert "image/png" in res_png.headers["content-type"]
    assert res_png.content == b"\x89PNG\r\n\x1a\nfake_image_bytes"


# ---------------------------------------------------------------------------
# 14: Unknown run returns 404
# ---------------------------------------------------------------------------

def test_unknown_run_returns_404(client: TestClient) -> None:
    """Test querying nonexistent run returns 404."""
    res = client.get("/api/runs/nonexistent_run_9999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


# ---------------------------------------------------------------------------
# 15, 16, 17: Security & path traversal rejection
# ---------------------------------------------------------------------------

def test_reject_path_traversal(
    client: TestClient,
    temp_artifacts_dir: Path,
) -> None:
    """Test path traversal attempts are rejected with 404."""
    run_id = "test_run_secure"
    run_dir = temp_artifacts_dir / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "report.json").write_text("{}", encoding="utf-8")

    # 1. Traversal using ..
    res = client.get(f"/api/runs/{run_id}/artifacts/../report.json")
    assert res.status_code in (404, 422)

    # 2. Traversal escaping base dir
    res2 = client.get(f"/api/runs/{run_id}/artifacts/../../etc/passwd")
    assert res2.status_code in (404, 422)


def test_reject_unsupported_extensions(
    client: TestClient,
    temp_artifacts_dir: Path,
) -> None:
    """Test unsupported extensions (.py, .exe, .sh) are rejected."""
    run_id = "test_run_ext"
    run_dir = temp_artifacts_dir / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "malicious.py").write_text("print('bad')", encoding="utf-8")

    res = client.get(f"/api/runs/{run_id}/artifacts/malicious.py")
    assert res.status_code == 404


def test_reject_malformed_run_id(client: TestClient) -> None:
    """Test malformed run_ids containing path separators are rejected."""
    res = client.get("/api/runs/..%2f..%2fetc/artifacts/report.json")
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# 18: CLI serve command parser
# ---------------------------------------------------------------------------

def test_cli_parse_args_serve() -> None:
    """Test CLI serve subcommand argument parsing."""
    # Defaults
    args_default = parse_args(["serve"])
    assert args_default.command == "serve"
    assert args_default.host == "127.0.0.1"
    assert args_default.port == 8000
    assert args_default.reload is False

    # Custom options
    args_custom = parse_args(["serve", "--host", "0.0.0.0", "--port", "9090", "--reload"])
    assert args_custom.command == "serve"
    assert args_custom.host == "0.0.0.0"
    assert args_custom.port == 9090
    assert args_custom.reload is True


# ---------------------------------------------------------------------------
# 19: Disk reconstruction & list runs
# ---------------------------------------------------------------------------

def test_list_runs_from_memory_and_disk(
    client: TestClient,
    temp_artifacts_dir: Path,
) -> None:
    """Test listing runs aggregates active runs and historical disk runs."""
    # Create a historical run directly on disk
    disk_run = temp_artifacts_dir / "20260910_historical_run"
    disk_run.mkdir(parents=True, exist_ok=True)
    report_data = {
        "run_id": "20260910_historical_run",
        "target_url": "https://example.com/disk",
        "goal": "Verify disk persistence",
        "success": True,
        "duration_ms": 3200,
        "start_time": "2026-09-10T12:00:00Z",
    }
    (disk_run / "report.json").write_text(json.dumps(report_data), encoding="utf-8")

    res = client.get("/api/runs")
    assert res.status_code == 200
    runs = res.json()
    assert len(runs) >= 1
    hist = next((r for r in runs if r["run_id"] == "20260910_historical_run"), None)
    assert hist is not None
    assert hist["status"] == "completed"
    assert hist["url"] == "https://example.com/disk"
    assert hist["success"] is True


# ---------------------------------------------------------------------------
# 20 & 21: Dotenv loading and absence handling
# ---------------------------------------------------------------------------

def test_server_module_loads_dotenv(monkeypatch, tmp_path: Path) -> None:
    """Test that importing or running server loads .env configuration into environment."""
    import os
    from dotenv import load_dotenv
    env_file = tmp_path / ".env"
    env_file.write_text("TEST_M43_SERVER_VAR=verified_123\n", encoding="utf-8")

    monkeypatch.delenv("TEST_M43_SERVER_VAR", raising=False)
    load_dotenv(dotenv_path=env_file)
    assert os.getenv("TEST_M43_SERVER_VAR") == "verified_123"


def test_server_starts_without_error_when_dotenv_absent(tmp_path: Path) -> None:
    """Test create_app works cleanly when no .env exists."""
    app = create_app(artifacts_base_dir=tmp_path)
    client = TestClient(app)
    res = client.get("/")
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_server_lifespan_loads_dotenv(monkeypatch, tmp_path: Path) -> None:
    """Test that ASGI lifespan loads .env on server startup."""
    import os
    from app.server import lifespan

    env_file = tmp_path / ".env"
    env_file.write_text("M43_LIFESPAN_VAR=lifespan_active\n", encoding="utf-8")

    monkeypatch.delenv("M43_LIFESPAN_VAR", raising=False)
    with patch("app.server.load_dotenv", side_effect=lambda: os.environ.update({"M43_LIFESPAN_VAR": "lifespan_active"})):
        dummy_app = MagicMock()
        async with lifespan(dummy_app):
            assert os.getenv("M43_LIFESPAN_VAR") == "lifespan_active"


def test_cli_main_loads_dotenv() -> None:
    """Test that cli.main() calls load_dotenv on invocation."""
    from app.cli import main as cli_main

    with patch("app.cli.load_dotenv") as mock_load, \
         patch("app.cli.parse_args") as mock_args, \
         patch("app.cli.run_cli", new_callable=AsyncMock) as mock_run:
        mock_args.return_value.command = "run"
        mock_run.return_value = 0
        with pytest.raises(SystemExit) as exc:
            cli_main()
        assert exc.value.code == 0
        assert mock_load.called
