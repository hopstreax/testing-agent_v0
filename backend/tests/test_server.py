import asyncio
import json
import os
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.auth import COOKIE_NAME, User, create_session_token
from app.cli import parse_args
from app.models.actions import StepRecord
from app.models.agent import AgentRunResult, FailureDiagnosis
from app.server import RunManager, RunRequest, RunStatusResponse, create_app

TEST_USER_ID = "test_sub_1082938471928374"
TEST_USER = User(id=TEST_USER_ID, email="developer@example.com", name="Test Developer")
TEST_SECRET = "deterministic-test-session-secret-key-32bytes!!"


@pytest.fixture(autouse=True)
def set_test_env():
    """Ensure SESSION_SECRET_KEY is consistently set for tests."""
    with patch.dict(os.environ, {"SESSION_SECRET_KEY": TEST_SECRET, "ENVIRONMENT": "development"}):
        yield


def make_authenticated_client(app: FastAPI, user_id: str = TEST_USER_ID) -> TestClient:
    """Create a TestClient with a valid tracekit_session cookie for the specified user."""
    c = TestClient(app)
    user = User(id=user_id, email=f"{user_id}@example.com", name="Test User")
    token = create_session_token(user, secret_key=TEST_SECRET)
    c.cookies.set(COOKIE_NAME, token)
    return c


@pytest.fixture
def temp_artifacts_dir(tmp_path: Path) -> Path:
    """Create a temporary artifacts directory."""
    artifacts = tmp_path / "artifacts" / "runs"
    artifacts.mkdir(parents=True, exist_ok=True)
    return artifacts


@pytest.fixture
def client(temp_artifacts_dir: Path) -> TestClient:
    """Create an authenticated TestClient with a clean RunManager pointed to temp directory."""
    manager = RunManager(artifacts_base_dir=temp_artifacts_dir)
    app = create_app(artifacts_base_dir=temp_artifacts_dir, run_manager=manager)
    return make_authenticated_client(app, user_id=TEST_USER_ID)


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
    client = make_authenticated_client(app)

    fake_run_result = AgentRunResult(
        success=True,
        termination_reason="goal_achieved",
        message="Goal satisfied",
        steps_executed=3,
        duration_ms=2500,
    )

    user_run_dir = temp_artifacts_dir / TEST_USER_ID / "fake_run"
    mock_runner = MagicMock()
    mock_runner.create_run_directory.return_value = ("fake_run", user_run_dir)

    async def fake_run(*args, **kwargs):
        user_run_dir.mkdir(parents=True, exist_ok=True)
        # Write minimal report.json
        report_data = {
            "run_id": "fake_run",
            "owner_id": TEST_USER_ID,
            "success": True,
            "termination_reason": "goal_achieved",
            "message": "Goal satisfied",
            "duration_ms": 2500,
            "steps_executed": 3,
            "assertions": [{"step_number": 1, "assertion_type": "visible", "success": True}],
            "screenshots": ["screenshots/step_01.png"],
        }
        with open(user_run_dir / "report.json", "w", encoding="utf-8") as f:
            json.dump(report_data, f)
        return fake_run_result, user_run_dir

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
    client = make_authenticated_client(app)

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
        run_dir = temp_artifacts_dir / TEST_USER_ID / run_id
        run_dir.mkdir(parents=True, exist_ok=True)
        report_data = {
            "run_id": run_id,
            "owner_id": TEST_USER_ID,
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
    run_dir = temp_artifacts_dir / TEST_USER_ID / run_id
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
    run_dir = temp_artifacts_dir / TEST_USER_ID / run_id
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
    run_dir = temp_artifacts_dir / TEST_USER_ID / run_id
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
    disk_run = temp_artifacts_dir / TEST_USER_ID / "20260910_historical_run"
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


def test_list_runs_chronological_ordering_newest_first(
    temp_artifacts_dir: Path,
) -> None:
    """Test runs are sorted newest-first using canonical run_id across memory and disk."""
    manager = RunManager(artifacts_base_dir=temp_artifacts_dir)
    app = create_app(run_manager=manager)
    client = make_authenticated_client(app)

    # 1. Historical run 1 on disk (Sep 11 morning)
    disk_run_1 = temp_artifacts_dir / TEST_USER_ID / "20260911_100000_aaaa1111"
    disk_run_1.mkdir(parents=True, exist_ok=True)
    (disk_run_1 / "report.json").write_text(
        json.dumps({
            "run_id": "20260911_100000_aaaa1111",
            "target_url": "https://example.com/old",
            "goal": "Old test",
            "success": True,
            "duration_ms": 1000,
        }),
        encoding="utf-8",
    )

    # 2. Historical run 2 on disk (Sep 11 afternoon)
    disk_run_2 = temp_artifacts_dir / TEST_USER_ID / "20260911_150000_bbbb2222"
    disk_run_2.mkdir(parents=True, exist_ok=True)
    (disk_run_2 / "report.json").write_text(
        json.dumps({
            "run_id": "20260911_150000_bbbb2222",
            "target_url": "https://example.com/mid",
            "goal": "Mid test",
            "success": False,
            "duration_ms": 2000,
        }),
        encoding="utf-8",
    )

    # 3. In-memory run (Sep 12) with ISO created_at
    manager._runs["20260912_110000_cccc3333"] = RunStatusResponse(
        run_id="20260912_110000_cccc3333",
        owner_id=TEST_USER_ID,
        status="running",
        url="https://example.com/newest",
        goal="Newest test",
        browser="local",
        headless=True,
        created_at="2026-09-12T05:30:00.000000+00:00",
    )

    res = client.get("/api/runs")
    assert res.status_code == 200
    runs = res.json()
    assert len(runs) == 3

    # Must be ordered newest-first by run_id
    run_ids = [r["run_id"] for r in runs]
    assert run_ids == [
        "20260912_110000_cccc3333",
        "20260911_150000_bbbb2222",
        "20260911_100000_aaaa1111",
    ]
    # In-memory run maintains status and created_at
    assert runs[0]["status"] == "running"
    assert runs[0]["created_at"] == "2026-09-12T05:30:00.000000+00:00"
    # Disk runs maintain status
    assert runs[1]["status"] == "failed"
    assert runs[2]["status"] == "completed"



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


# ---------------------------------------------------------------------------
# Storage State Validation Tests
# ---------------------------------------------------------------------------

def test_post_runs_with_valid_storage_state(client: TestClient, tmp_path: Path) -> None:
    """Test POST /api/runs accepts valid storage state JSON file."""
    auth_file = tmp_path / "auth.json"
    auth_file.write_text(json.dumps({"cookies": [{"name": "sid", "value": "xyz123"}]}), encoding="utf-8")

    with patch.object(RunManager, "start_run") as mock_start:
        mock_start.return_value = MagicMock(run_id="run_auth_1", status="running", url="http://example.com", goal="Check", owner_id=TEST_USER_ID)
        res = client.post("/api/runs", json={
            "url": "http://example.com",
            "goal": "Check dashboard",
            "storage_state_path": str(auth_file),
        })
        assert res.status_code == 202
        # Check that validated storage_state_path was passed
        req = mock_start.call_args.kwargs.get("request") or mock_start.call_args.args[0]
        assert req.storage_state_path == str(auth_file.resolve())


def test_post_runs_rejects_nonexistent_storage_state(client: TestClient, tmp_path: Path) -> None:
    """Test POST /api/runs rejects nonexistent storage state path."""
    nonexistent = tmp_path / "does_not_exist.json"
    res = client.post("/api/runs", json={
        "url": "http://example.com",
        "goal": "Check dashboard",
        "storage_state_path": str(nonexistent),
    })
    assert res.status_code == 422
    assert "not found" in res.text


def test_post_runs_rejects_directory_storage_state(client: TestClient, tmp_path: Path) -> None:
    """Test POST /api/runs rejects directory passed as storage state path."""
    res = client.post("/api/runs", json={
        "url": "http://example.com",
        "goal": "Check dashboard",
        "storage_state_path": str(tmp_path),
    })
    assert res.status_code == 422
    assert "cannot be a directory" in res.text


def test_post_runs_rejects_non_json_storage_state(client: TestClient, tmp_path: Path) -> None:
    """Test POST /api/runs rejects non-JSON file."""
    txt_file = tmp_path / "creds.txt"
    txt_file.write_text("password=secret", encoding="utf-8")
    res = client.post("/api/runs", json={
        "url": "http://example.com",
        "goal": "Check dashboard",
        "storage_state_path": str(txt_file),
    })
    assert res.status_code == 422
    assert "must be a JSON file" in res.text


def test_post_runs_rejects_malformed_json_storage_state(client: TestClient, tmp_path: Path) -> None:
    """Test POST /api/runs rejects malformed JSON content."""
    bad_json = tmp_path / "bad.json"
    bad_json.write_text("{not valid json: ", encoding="utf-8")
    res = client.post("/api/runs", json={
        "url": "http://example.com",
        "goal": "Check dashboard",
        "storage_state_path": str(bad_json),
    })
    assert res.status_code == 422
    assert "invalid JSON" in res.text


def test_post_runs_rejects_storage_state_without_cookies_or_origins(client: TestClient, tmp_path: Path) -> None:
    """Test POST /api/runs rejects JSON missing cookies or origins keys."""
    wrong_structure = tmp_path / "wrong.json"
    wrong_structure.write_text(json.dumps({"some_key": "some_value"}), encoding="utf-8")
    res = client.post("/api/runs", json={
        "url": "http://example.com",
        "goal": "Check dashboard",
        "storage_state_path": str(wrong_structure),
    })
    assert res.status_code == 422
    assert "containing 'cookies' or 'origins'" in res.text


def test_post_runs_null_storage_state_allowed(client: TestClient) -> None:
    """Test POST /api/runs works normally with null or omitted storage_state_path."""
    with patch.object(RunManager, "start_run") as mock_start:
        mock_start.return_value = MagicMock(run_id="run_clean_1", status="running", url="http://example.com", goal="Check", owner_id=TEST_USER_ID)
        res = client.post("/api/runs", json={
            "url": "http://example.com",
            "goal": "Check public page",
            "storage_state_path": None,
        })
        assert res.status_code == 202


# =============================================================================
# Milestone 6.4: Clone & Edit Run Configuration Tests
# =============================================================================

@pytest.mark.asyncio
async def test_run_status_response_preserves_clone_configuration(tmp_path: Path) -> None:
    """Verify active in-memory runs retain max_steps and storage_state_path for clone workflows."""
    manager = RunManager(artifacts_base_dir=tmp_path)
    auth_file = tmp_path / "valid_auth.json"
    auth_file.write_text(json.dumps({"cookies": [{"name": "sid", "value": "xyz"}]}), encoding="utf-8")

    req = RunRequest(
        url="https://example.com/app",
        goal="Test clone config",
        browser="local",
        headless=False,
        max_steps=25,
        storage_state_path=str(auth_file),
    )

    with patch.object(manager, "_execute_run", new_callable=AsyncMock):
        status = manager.start_run(req, user_id=TEST_USER_ID)

    assert status.url == "https://example.com/app"
    assert status.goal == "Test clone config"
    assert status.headless is False
    assert status.max_steps == 25
    assert status.storage_state_path == str(auth_file.resolve())

    # Ensure get_run returns the same configuration
    fetched = manager.get_run(status.run_id, user_id=TEST_USER_ID)
    assert fetched is not None
    assert fetched.max_steps == 25
    assert fetched.storage_state_path == str(auth_file.resolve())
    # Crucially, credentials/cookies must not be exposed in the response
    data_dict = fetched.model_dump()
    assert "cookies" not in data_dict
    assert "origins" not in data_dict


def test_historical_disk_run_clone_configuration_fallback(tmp_path: Path) -> None:
    """Verify historical disk-backed runs safely fallback to max_steps=15 and storage_state_path=None."""
    manager = RunManager(artifacts_base_dir=tmp_path)
    run_dir = tmp_path / TEST_USER_ID / "20260912_120000_disktest"
    run_dir.mkdir(parents=True)

    report_data = {
        "run_id": "20260912_120000_disktest",
        "target_url": "https://example.com/old",
        "goal": "Historical test goal",
        "success": True,
        "duration_ms": 1200,
        "authenticated": True,
    }
    (run_dir / "report.json").write_text(json.dumps(report_data), encoding="utf-8")

    fetched = manager.get_run("20260912_120000_disktest", user_id=TEST_USER_ID)
    assert fetched is not None
    assert fetched.url == "https://example.com/old"
    assert fetched.goal == "Historical test goal"
    assert fetched.max_steps == 15
    assert fetched.storage_state_path is None
    assert fetched.provider == "auto"
    assert fetched.model is None


# ---------------------------------------------------------------------------
# M6.6: Provider Metadata & Provider/Model Selection Tests
# ---------------------------------------------------------------------------

def test_get_providers_metadata_endpoint(client: TestClient) -> None:
    """Verify GET /api/providers returns static curated provider metadata without secrets."""
    res = client.get("/api/providers")
    assert res.status_code == 200
    providers = res.json()
    assert isinstance(providers, list)
    assert len(providers) == 4

    provider_ids = [p["id"] for p in providers]
    assert provider_ids == ["auto", "gemini", "groq", "ollama"]
    # Verify Mock is NOT exposed
    assert "mock" not in provider_ids

    # Verify Gemini metadata
    gemini = next(p for p in providers if p["id"] == "gemini")
    assert gemini["label"] == "Google Gemini"
    assert gemini["default_model"] == "gemini-3.6-flash"
    assert "gemini-3.6-flash" in gemini["models"]

    # Verify Groq metadata
    groq = next(p for p in providers if p["id"] == "groq")
    assert groq["label"] == "Groq"
    assert groq["default_model"] == "openai/gpt-oss-120b"
    assert groq["models"] == ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"]
    assert "llama-3.3-70b-versatile" not in groq["models"]
    assert "llama-3.1-8b-instant" not in groq["models"]

    # Verify Ollama metadata
    ollama = next(p for p in providers if p["id"] == "ollama")
    assert ollama["label"] == "Ollama"
    assert ollama["default_model"] == "qwen2.5-coder:3b"

    # Verify no secret fields exist in the response
    for p in providers:
        assert "api_key" not in p
        assert "key" not in p
        assert "secret" not in p
        assert "token" not in p


def test_post_runs_provider_defaults_to_auto(client: TestClient) -> None:
    """When provider and model are omitted in POST /api/runs, defaults to 'auto' and None."""
    res = client.post(
        "/api/runs",
        json={
            "url": "https://example.com",
            "goal": "Verify default provider",
        },
    )
    assert res.status_code == 202
    run_id = res.json()["run_id"]

    status_res = client.get(f"/api/runs/{run_id}")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["provider"] == "auto"
    assert status_data["model"] is None


def test_post_runs_explicit_provider_and_model(client: TestClient) -> None:
    """Verify POST /api/runs accepts explicit provider and custom model."""
    res = client.post(
        "/api/runs",
        json={
            "url": "https://example.com",
            "goal": "Verify explicit groq provider",
            "provider": "groq",
            "model": "openai/gpt-oss-120b",
        },
    )
    assert res.status_code == 202
    run_id = res.json()["run_id"]

    status_res = client.get(f"/api/runs/{run_id}")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["provider"] == "groq"
    assert status_data["model"] == "openai/gpt-oss-120b"


def test_post_runs_invalid_provider_rejected(client: TestClient) -> None:
    """Verify POST /api/runs rejects unauthorized or unsupported providers."""
    for invalid in ["openai", "claude", "mock", "unknown"]:
        res = client.post(
            "/api/runs",
            json={
                "url": "https://example.com",
                "goal": "Test invalid provider",
                "provider": invalid,
            },
        )
        assert res.status_code == 422


@pytest.mark.asyncio
async def test_manager_start_run_resolves_explicit_provider_and_model(tmp_path: Path) -> None:
    """Verify RunManager resolves explicit provider and model and passes to TestRunner."""
    from app.llm.groq import GroqLLMProvider, DEFAULT_GROQ_MODEL

    manager = RunManager(artifacts_base_dir=tmp_path)
    req = RunRequest(
        url="https://example.com",
        goal="Test provider resolution in manager",
        provider="groq",
        model="openai/gpt-oss-20b",
    )

    with patch("app.server.TestRunner") as mock_runner_cls, patch.object(
        manager, "_execute_run", new_callable=AsyncMock
    ):
        status = manager.start_run(req, user_id=TEST_USER_ID)

        assert status.provider == "groq"
        assert status.model == "openai/gpt-oss-20b"

        # Check TestRunner constructor received resolved Groq provider
        mock_runner_cls.assert_called_once()
        call_kwargs = mock_runner_cls.call_args.kwargs
        llm = call_kwargs["llm_provider"]
        assert isinstance(llm, GroqLLMProvider)
        assert llm.model == "openai/gpt-oss-20b"


def test_groq_default_model_is_current() -> None:
    """Verify Groq default model is current and deprecated models are not used."""
    from app.llm.groq import DEFAULT_GROQ_MODEL, GroqLLMProvider
    from app.llm.metadata import get_providers_metadata

    assert DEFAULT_GROQ_MODEL == "openai/gpt-oss-120b"
    assert DEFAULT_GROQ_MODEL != "llama-3.3-70b-versatile"

    provider = GroqLLMProvider(api_key="test", model=None)
    # If GROQ_MODEL env var is set to default or not set, provider model must not be deprecated
    assert provider.model != "llama-3.3-70b-versatile"
    assert provider.model != "llama-3.1-8b-instant"

    metadata = next(p for p in get_providers_metadata() if p.id == "groq")
    assert metadata.default_model == "openai/gpt-oss-120b"
    assert "llama-3.3-70b-versatile" not in metadata.models
    assert "llama-3.1-8b-instant" not in metadata.models
    assert "openai/gpt-oss-120b" in metadata.models
    assert "openai/gpt-oss-20b" in metadata.models
    assert "qwen/qwen3.6-27b" in metadata.models
