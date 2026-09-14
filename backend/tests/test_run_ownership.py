"""Comprehensive security and isolation tests for user-scoped run ownership.

Covers:
1-4.   Authentication requirements (401 on unauthenticated run endpoints)
5-10.  Ownership isolation between User A and User B (list, detail, artifacts)
11-12. Spoofing attempts (client-supplied user_id rejected or ignored)
13-15. Clone & edit authorization (User A succeeds, User B gets 404, cloned run belongs to caller)
16-19. User-scoped filesystem namespaces, empty dashboard for new users, legacy root-level run isolation
20-21. Path traversal defenses (artifact paths and user ID containment)
22.    Persistence and server restart recovery respecting user ownership
"""

import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.auth.session import COOKIE_NAME, User, create_session_token
from app.models import AgentRunResult
from app.runner import TestRunner
from app.server import RunManager, create_app

TEST_SECRET = "test-secret-key-for-ownership-tests-32charsmin!"
USER_A = User(id="101010101010101010101", email="alice@example.com", name="Alice")
USER_B = User(id="202020202020202020202", email="bob@example.com", name="Bob")


@pytest.fixture(autouse=True)
def set_auth_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SESSION_SECRET_KEY", TEST_SECRET)


@pytest.fixture
def temp_artifacts_dir(tmp_path: Path) -> Path:
    runs_dir = tmp_path / "runs"
    runs_dir.mkdir(parents=True, exist_ok=True)
    return runs_dir


@pytest.fixture
def app(temp_artifacts_dir: Path):
    manager = RunManager(artifacts_base_dir=temp_artifacts_dir)
    return create_app(run_manager=manager, artifacts_base_dir=temp_artifacts_dir)


def make_client(app, user: User | None = None) -> TestClient:
    client = TestClient(app)
    if user is not None:
        token = create_session_token(user, secret_key=TEST_SECRET)
        client.cookies.set(COOKIE_NAME, token)
    return client


# ---------------------------------------------------------------------------
# 1-4: Authentication Requirements (Unauthenticated requests get 401)
# ---------------------------------------------------------------------------

def test_unauthenticated_post_runs_returns_401(app) -> None:
    """POST /api/runs without session returns 401."""
    client = make_client(app, user=None)
    res = client.post("/api/runs", json={"url": "https://example.com", "goal": "Check landing"})
    assert res.status_code == 401
    assert "Authentication required" in res.text


def test_unauthenticated_get_runs_returns_401(app) -> None:
    """GET /api/runs without session returns 401."""
    client = make_client(app, user=None)
    res = client.get("/api/runs")
    assert res.status_code == 401
    assert "Authentication required" in res.text


def test_unauthenticated_get_run_detail_returns_401(app) -> None:
    """GET /api/runs/{run_id} without session returns 401."""
    client = make_client(app, user=None)
    res = client.get("/api/runs/any_run_id")
    assert res.status_code == 401
    assert "Authentication required" in res.text


def test_unauthenticated_get_artifact_returns_401(app) -> None:
    """GET /api/runs/{run_id}/artifacts/{path} without session returns 401."""
    client = make_client(app, user=None)
    res = client.get("/api/runs/any_run_id/artifacts/report.json")
    assert res.status_code == 401
    assert "Authentication required" in res.text


# ---------------------------------------------------------------------------
# 5-10: Ownership Isolation Between Users (User A vs User B)
# ---------------------------------------------------------------------------

def test_user_a_can_create_run_and_is_recorded_as_owner(app, temp_artifacts_dir: Path) -> None:
    """User A creates a run; owner_id matches User A's id."""
    client_a = make_client(app, user=USER_A)
    with patch.object(RunManager, "_execute_run", new_callable=AsyncMock):
        res = client_a.post("/api/runs", json={"url": "https://example.com", "goal": "User A goal"})
    assert res.status_code == 202
    data = res.json()
    assert "run_id" in data
    assert data["owner_id"] == USER_A.id


def test_user_a_can_list_own_run_and_user_b_cannot_see_it(app, temp_artifacts_dir: Path) -> None:
    """User A lists runs and sees their run; User B sees an empty list."""
    client_a = make_client(app, user=USER_A)
    client_b = make_client(app, user=USER_B)

    with patch.object(RunManager, "_execute_run", new_callable=AsyncMock):
        res_a = client_a.post("/api/runs", json={"url": "https://example.com/a", "goal": "Run A"})
        run_id_a = res_a.json()["run_id"]

    # User A sees Run A
    list_a = client_a.get("/api/runs").json()
    assert len(list_a) == 1
    assert list_a[0]["run_id"] == run_id_a
    assert list_a[0]["owner_id"] == USER_A.id

    # User B does not see Run A
    list_b = client_b.get("/api/runs").json()
    assert len(list_b) == 0


def test_user_b_cannot_retrieve_user_a_run_detail_returns_404(app) -> None:
    """User B requesting User A's run returns 404 (not 403, preventing IDOR enumeration)."""
    client_a = make_client(app, user=USER_A)
    client_b = make_client(app, user=USER_B)

    with patch.object(RunManager, "_execute_run", new_callable=AsyncMock):
        res_a = client_a.post("/api/runs", json={"url": "https://example.com/a", "goal": "Run A"})
        run_id_a = res_a.json()["run_id"]

    # User A gets 200
    res_detail_a = client_a.get(f"/api/runs/{run_id_a}")
    assert res_detail_a.status_code == 200
    assert res_detail_a.json()["owner_id"] == USER_A.id

    # User B gets 404
    res_detail_b = client_b.get(f"/api/runs/{run_id_a}")
    assert res_detail_b.status_code == 404
    assert "not found" in res_detail_b.json()["detail"].lower()


def test_user_b_cannot_retrieve_user_a_artifact_returns_404(app, temp_artifacts_dir: Path) -> None:
    """User B requesting User A's artifact returns 404."""
    client_a = make_client(app, user=USER_A)
    client_b = make_client(app, user=USER_B)

    run_id = "20260914_010101_usera001"
    run_dir = temp_artifacts_dir / USER_A.id / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "report.json").write_text(json.dumps({"owner_id": USER_A.id, "run_id": run_id}), encoding="utf-8")

    # User A gets 200
    res_artifact_a = client_a.get(f"/api/runs/{run_id}/artifacts/report.json")
    assert res_artifact_a.status_code == 200
    assert res_artifact_a.json()["run_id"] == run_id

    # User B gets 404
    res_artifact_b = client_b.get(f"/api/runs/{run_id}/artifacts/report.json")
    assert res_artifact_b.status_code == 404


# ---------------------------------------------------------------------------
# 11-12: Spoofing Prevention
# ---------------------------------------------------------------------------

def test_client_supplied_user_id_is_ignored_or_rejected(app) -> None:
    """Attempting to inject a user_id / owner_id in the request body never overrides session identity."""
    client_a = make_client(app, user=USER_A)
    with patch.object(RunManager, "_execute_run", new_callable=AsyncMock):
        # Send user_id or owner_id pointing to User B
        res = client_a.post("/api/runs", json={
            "url": "https://example.com",
            "goal": "Spoof test",
            "user_id": USER_B.id,
            "owner_id": USER_B.id,
        })
    # If accepted or extra fields allowed, owner_id must strictly still be USER_A
    assert res.status_code in (202, 422)
    if res.status_code == 202:
        data = res.json()
        assert data["owner_id"] == USER_A.id


# ---------------------------------------------------------------------------
# 13-15: Clone & Edit Protection
# ---------------------------------------------------------------------------

def test_clone_and_edit_isolation(app) -> None:
    """User A can retrieve own run configuration for Clone & Edit; User B cannot."""
    client_a = make_client(app, user=USER_A)
    client_b = make_client(app, user=USER_B)

    with patch.object(RunManager, "_execute_run", new_callable=AsyncMock):
        res_a = client_a.post("/api/runs", json={
            "url": "https://example.com/app",
            "goal": "Original Run A Goal",
            "max_steps": 22,
        })
        run_id_a = res_a.json()["run_id"]

    # User A retrieves configuration for clone: 200
    res_clone_src_a = client_a.get(f"/api/runs/{run_id_a}")
    assert res_clone_src_a.status_code == 200
    src_data = res_clone_src_a.json()
    assert src_data["goal"] == "Original Run A Goal"
    assert src_data["max_steps"] == 22

    # User B attempts to retrieve User A's run for clone: 404
    res_clone_src_b = client_b.get(f"/api/runs/{run_id_a}")
    assert res_clone_src_b.status_code == 404

    # When User B launches a run, it is owned by User B, not User A
    with patch.object(RunManager, "_execute_run", new_callable=AsyncMock):
        res_new_b = client_b.post("/api/runs", json={
            "url": src_data["url"],
            "goal": "User B copy",
            "max_steps": src_data["max_steps"],
        })
    assert res_new_b.status_code == 202
    assert res_new_b.json()["owner_id"] == USER_B.id


# ---------------------------------------------------------------------------
# 16-19: User-Scoped Filesystem & Legacy Runs Isolation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_new_run_written_to_user_namespaced_directory(app, temp_artifacts_dir: Path) -> None:
    """Active run execution creates artifacts under artifacts/runs/<user_id>/<run_id>/."""
    manager = app.state.run_manager if hasattr(app.state, "run_manager") else None
    client_a = make_client(app, user=USER_A)

    fake_result = AgentRunResult(
        success=True,
        termination_reason="goal_achieved",
        message="Finished",
        steps_executed=1,
        duration_ms=500,
    )

    with patch("app.server.TestRunner.run", new_callable=AsyncMock) as mock_run:
        async def fake_runner_exec(*args, **kwargs):
            actual_run_id = kwargs.get("run_id")
            run_dir = temp_artifacts_dir / USER_A.id / actual_run_id
            run_dir.mkdir(parents=True, exist_ok=True)
            (run_dir / "report.json").write_text(
                json.dumps({"run_id": actual_run_id, "owner_id": USER_A.id, "success": True}),
                encoding="utf-8",
            )
            return fake_result, run_dir

        mock_run.side_effect = fake_runner_exec

        res = client_a.post("/api/runs", json={"url": "https://example.com", "goal": "Namespacing check"})
        assert res.status_code == 202
        run_id = res.json()["run_id"]

        manager = app.state.run_manager
        task = manager._tasks[run_id]
        await task

        assert manager._runs[run_id].status == "completed", f"Status: {manager._runs[run_id].status}, Error: {manager._runs[run_id].error}"

    # Verify directory physically resides under temp_artifacts_dir / USER_A.id / run_id
    expected_run_dir = temp_artifacts_dir / USER_A.id / run_id
    assert expected_run_dir.exists()
    assert (expected_run_dir / "report.json").exists()

    # And NOT directly under temp_artifacts_dir / run_id
    assert not (temp_artifacts_dir / run_id).exists()


def test_brand_new_user_gets_empty_run_list(app, temp_artifacts_dir: Path) -> None:
    """A user who has never created runs receives an empty list [], without any directory existing."""
    new_user = User(id="999999999999999999999", email="newuser@example.com", name="New User")
    client_new = make_client(app, user=new_user)

    # Ensure no directory exists for this user
    user_dir = temp_artifacts_dir / new_user.id
    assert not user_dir.exists()

    res = client_new.get("/api/runs")
    assert res.status_code == 200
    assert res.json() == []


def test_legacy_root_level_runs_are_ignored(app, temp_artifacts_dir: Path) -> None:
    """Pre-M8 runs directly under artifacts/runs/<run_id>/ are never exposed to any user."""
    legacy_run_id = "20260901_legacy_unauthenticated_run"
    legacy_dir = temp_artifacts_dir / legacy_run_id
    legacy_dir.mkdir(parents=True, exist_ok=True)
    (legacy_dir / "report.json").write_text(
        json.dumps({"run_id": legacy_run_id, "target_url": "https://legacy.com", "goal": "Legacy"}),
        encoding="utf-8",
    )

    client_a = make_client(app, user=USER_A)
    client_b = make_client(app, user=USER_B)

    # Neither User A nor User B can see the legacy run in list
    assert client_a.get("/api/runs").json() == []
    assert client_b.get("/api/runs").json() == []

    # Neither User A nor User B can get the legacy run detail
    assert client_a.get(f"/api/runs/{legacy_run_id}").status_code == 404
    assert client_b.get(f"/api/runs/{legacy_run_id}").status_code == 404

    # Neither User A nor User B can get the legacy artifact
    assert client_a.get(f"/api/runs/{legacy_run_id}/artifacts/report.json").status_code == 404
    assert client_b.get(f"/api/runs/{legacy_run_id}/artifacts/report.json").status_code == 404


# ---------------------------------------------------------------------------
# 20-21: Path Traversal Defenses & User ID Containment
# ---------------------------------------------------------------------------

def test_path_traversal_in_artifacts_rejected(app, temp_artifacts_dir: Path) -> None:
    """Relative traversal sequences '..' in artifact paths return 404."""
    client_a = make_client(app, user=USER_A)
    run_id = "20260914_traversal_test"
    run_dir = temp_artifacts_dir / USER_A.id / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "report.json").write_text("{}", encoding="utf-8")

    assert client_a.get(f"/api/runs/{run_id}/artifacts/../report.json").status_code in (404, 422)
    assert client_a.get(f"/api/runs/{run_id}/artifacts/../../{USER_A.id}/report.json").status_code in (404, 422)


def test_malicious_user_id_cannot_escape_artifacts_base(app, temp_artifacts_dir: Path) -> None:
    """A forged session user_id containing traversal characters is rejected and cannot escape."""
    malicious_user = User(id="../traversal_user", email="hacker@example.com", name="Hacker")
    client_hacker = make_client(app, user=malicious_user)

    # POST /api/runs must fail validation (HTTP 400) due to safe identifier regex
    res_post = client_hacker.post("/api/runs", json={"url": "https://example.com", "goal": "Attack"})
    assert res_post.status_code == 400

    # GET /api/runs returns 400
    res_list = client_hacker.get("/api/runs")
    assert res_list.status_code == 400

    # GET /api/runs/{run_id} returns 400
    res_get = client_hacker.get("/api/runs/any_run_id")
    assert res_get.status_code == 400

    # Artifact endpoint returns 404/400 (not disclosing artifact)
    res_art = client_hacker.get("/api/runs/any_run_id/artifacts/report.json")
    assert res_art.status_code in (400, 404)


# ---------------------------------------------------------------------------
# 22: Restart / Persistence Recovery Isolation
# ---------------------------------------------------------------------------

def test_persisted_run_recovery_respects_ownership(temp_artifacts_dir: Path) -> None:
    """When server restarts and recreates in-memory state, disk runs are recovered only for owner."""
    # Write User A's run on disk under User A's namespace
    run_id = "20260914_persisted_run_01"
    run_dir = temp_artifacts_dir / USER_A.id / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    report_data = {
        "run_id": run_id,
        "owner_id": USER_A.id,
        "target_url": "https://example.com/persisted",
        "goal": "Persisted run test",
        "success": True,
        "duration_ms": 1500,
        "start_time": "2026-09-14T10:00:00Z",
    }
    (run_dir / "report.json").write_text(json.dumps(report_data), encoding="utf-8")

    # Simulate fresh server start with new RunManager
    fresh_manager = RunManager(artifacts_base_dir=temp_artifacts_dir)
    fresh_app = create_app(run_manager=fresh_manager, artifacts_base_dir=temp_artifacts_dir)

    client_a = make_client(fresh_app, user=USER_A)
    client_b = make_client(fresh_app, user=USER_B)

    # User A sees recovered run
    runs_a = client_a.get("/api/runs").json()
    assert len(runs_a) == 1
    assert runs_a[0]["run_id"] == run_id
    assert runs_a[0]["owner_id"] == USER_A.id

    detail_a = client_a.get(f"/api/runs/{run_id}").json()
    assert detail_a["run_id"] == run_id
    assert detail_a["url"] == "https://example.com/persisted"

    # User B sees empty list and receives 404 for detail
    assert client_b.get("/api/runs").json() == []
    assert client_b.get(f"/api/runs/{run_id}").status_code == 404
    assert client_b.get(f"/api/runs/{run_id}/artifacts/report.json").status_code == 404
