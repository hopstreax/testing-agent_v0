"""FastAPI application server and RunManager for the Autonomous Website Testing Agent."""

import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
from typing import Any, Dict, List, Literal, Optional
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, Field, HttpUrl, field_validator

from app.models.agent import AgentRunResult
from app.runner import TestRunner, resolve_llm_provider


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager ensuring .env is loaded on startup."""
    load_dotenv()
    yield

# Path to dashboard HTML
STATIC_DIR = Path(__file__).parent / "static"
INDEX_HTML_PATH = STATIC_DIR / "index.html"

# Allowed artifact extensions
ALLOWED_EXTENSIONS = {".json", ".md", ".png"}

# Valid run_id pattern (e.g. 20260911_003000_1234abcd)
RUN_ID_REGEX = re.compile(r"^[a-zA-Z0-9_\-]+$")


class RunRequest(BaseModel):
    """Payload to launch a new autonomous website test."""

    url: str = Field(..., description="Target website URL to test")
    goal: str = Field(..., description="Natural language testing goal")
    browser: Literal["local", "solari"] = Field("local", description="Browser engine")
    headless: bool = Field(True, description="Run browser in headless mode")
    max_steps: int = Field(15, ge=1, le=50, description="Maximum agent reasoning steps")

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Target URL cannot be empty.")
        if not (s.startswith("http://") or s.startswith("https://")):
            raise ValueError("Target URL must start with http:// or https://")
        return s

    @field_validator("goal")
    @classmethod
    def validate_goal(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Testing goal cannot be empty.")
        return s


class RunLaunchResponse(BaseModel):
    """Response returned upon accepting a new test run."""

    run_id: str
    status: Literal["running"] = "running"
    url: str
    goal: str


class RunStatusResponse(BaseModel):
    """Execution status and structured result for a test run."""

    run_id: str
    status: Literal["running", "completed", "failed", "error"]
    url: str
    goal: str
    browser: str
    headless: bool
    created_at: str
    duration_ms: Optional[int] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    artifacts: Optional[Dict[str, str]] = None


class RunSummary(BaseModel):
    """Lightweight summary of a test run."""

    run_id: str
    status: Literal["running", "completed", "failed", "error"]
    url: str
    goal: str
    created_at: str
    duration_ms: Optional[int] = None
    success: Optional[bool] = None


class RunManager:
    """In-memory execution manager coordinating background TestRunner tasks."""

    def __init__(self, artifacts_base_dir: Optional[Path] = None) -> None:
        self.artifacts_base_dir = (
            Path(artifacts_base_dir or "artifacts/runs").resolve()
        )
        self.artifacts_base_dir.mkdir(parents=True, exist_ok=True)
        self._runs: Dict[str, RunStatusResponse] = {}
        self._tasks: Dict[str, asyncio.Task[Any]] = {}

    def _generate_run_id(self) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        short_id = uuid.uuid4().hex[:8]
        return f"{timestamp}_{short_id}"

    def start_run(
        self,
        request: RunRequest,
        llm_provider: Optional[Any] = None,
    ) -> RunStatusResponse:
        """Create run state, schedule background execution, and return immediately."""
        run_id = self._generate_run_id()
        now_str = datetime.now(timezone.utc).isoformat()

        run_state = RunStatusResponse(
            run_id=run_id,
            status="running",
            url=request.url,
            goal=request.goal,
            browser=request.browser,
            headless=request.headless,
            created_at=now_str,
        )
        self._runs[run_id] = run_state

        # Instantiate runner using requested configuration
        runner = TestRunner(
            artifacts_base_dir=self.artifacts_base_dir,
            llm_provider=llm_provider,
            browser_type=request.browser,
            headless=request.headless,
            max_steps=request.max_steps,
        )

        # Dispatch background execution task
        task = asyncio.create_task(
            self._execute_run(run_id=run_id, runner=runner, request=request)
        )
        self._tasks[run_id] = task

        return run_state

    async def _execute_run(
        self,
        run_id: str,
        runner: TestRunner,
        request: RunRequest,
    ) -> None:
        """Background worker executing TestRunner end-to-end and storing result."""
        try:
            agent_result, run_dir = await runner.run(
                url=request.url,
                goal=request.goal,
                run_id=run_id,
            )

            # Load generated report.json for rich structured representation
            report_json_path = run_dir / "report.json"
            result_data: Optional[Dict[str, Any]] = None
            if report_json_path.is_file():
                try:
                    with open(report_json_path, "r", encoding="utf-8") as f:
                        result_data = json.load(f)
                except Exception:
                    result_data = None

            status_str = "completed" if agent_result.success else "failed"
            artifacts_dict = {
                "report_json": f"/api/runs/{run_id}/artifacts/report.json",
                "report_md": f"/api/runs/{run_id}/artifacts/report.md",
            }

            self._runs[run_id].status = status_str
            self._runs[run_id].duration_ms = agent_result.duration_ms
            self._runs[run_id].result = result_data
            self._runs[run_id].artifacts = artifacts_dict

        except Exception as exc:
            self._runs[run_id].status = "error"
            self._runs[run_id].error = str(exc)

    def get_run(self, run_id: str) -> Optional[RunStatusResponse]:
        """Retrieve run state by ID, with fallback to persisted disk reports."""
        if not RUN_ID_REGEX.match(run_id):
            return None

        # 1. In-memory state
        if run_id in self._runs:
            return self._runs[run_id]

        # 2. Disk fallback (e.g. historical runs)
        run_dir = (self.artifacts_base_dir / run_id).resolve()
        if (
            run_dir.is_dir()
            and run_dir.is_relative_to(self.artifacts_base_dir)
            and (run_dir / "report.json").is_file()
        ):
            try:
                with open(run_dir / "report.json", "r", encoding="utf-8") as f:
                    data = json.load(f)

                status_str = "completed" if data.get("success") else "failed"
                run_state = RunStatusResponse(
                    run_id=run_id,
                    status=status_str,
                    url=data.get("target_url", ""),
                    goal=data.get("goal", ""),
                    browser="local",
                    headless=True,
                    created_at=data.get("start_time") or datetime.now(timezone.utc).isoformat(),
                    duration_ms=data.get("duration_ms"),
                    result=data,
                    artifacts={
                        "report_json": f"/api/runs/{run_id}/artifacts/report.json",
                        "report_md": f"/api/runs/{run_id}/artifacts/report.md",
                    },
                )
                self._runs[run_id] = run_state
                return run_state
            except Exception:
                return None

        return None

    def list_runs(self) -> List[RunSummary]:
        """List summaries of runs in memory and on disk."""
        summaries: List[RunSummary] = []
        seen_ids = set()

        # From memory
        for r_id, state in self._runs.items():
            seen_ids.add(r_id)
            success_val = None
            if state.result is not None:
                success_val = state.result.get("success")
            elif state.status == "completed":
                success_val = True
            elif state.status == "failed":
                success_val = False

            summaries.append(
                RunSummary(
                    run_id=state.run_id,
                    status=state.status,
                    url=state.url,
                    goal=state.goal,
                    created_at=state.created_at,
                    duration_ms=state.duration_ms,
                    success=success_val,
                )
            )

        # From disk
        if self.artifacts_base_dir.is_dir():
            for entry in self.artifacts_base_dir.iterdir():
                if entry.is_dir() and entry.name not in seen_ids and RUN_ID_REGEX.match(entry.name):
                    report_path = entry / "report.json"
                    if report_path.is_file():
                        try:
                            with open(report_path, "r", encoding="utf-8") as f:
                                data = json.load(f)
                            success_val = data.get("success")
                            status_val = "completed" if success_val else "failed"
                            summaries.append(
                                RunSummary(
                                    run_id=entry.name,
                                    status=status_val,
                                    url=data.get("target_url", ""),
                                    goal=data.get("goal", ""),
                                    created_at=data.get("start_time") or "",
                                    duration_ms=data.get("duration_ms"),
                                    success=success_val,
                                )
                            )
                        except Exception:
                            continue

        # Sort newest first
        summaries.sort(key=lambda s: s.created_at or s.run_id, reverse=True)
        return summaries


def create_app(
    artifacts_base_dir: Optional[Path] = None,
    run_manager: Optional[RunManager] = None,
    llm_provider: Optional[Any] = None,
) -> FastAPI:
    """Create and configure the FastAPI web application."""
    app = FastAPI(
        title="Autonomous Website Testing Agent Dashboard",
        description="Local web dashboard and REST API for testing-agent_v0",
        version="0.1.0",
        lifespan=lifespan,
    )

    manager = run_manager or RunManager(artifacts_base_dir=artifacts_base_dir)
    app.state.run_manager = manager
    app.state.llm_provider = llm_provider

    # -------------------------------------------------------------------------
    # Route: Dashboard UI (GET /)
    # -------------------------------------------------------------------------
    @app.get("/", response_class=HTMLResponse)
    async def serve_dashboard() -> HTMLResponse:
        """Serve the single-page dashboard HTML."""
        if not INDEX_HTML_PATH.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dashboard HTML template not found.",
            )
        with open(INDEX_HTML_PATH, "r", encoding="utf-8") as f:
            content = f.read()
        return HTMLResponse(content=content)

    # -------------------------------------------------------------------------
    # Route: Launch Test Run (POST /api/runs)
    # -------------------------------------------------------------------------
    @app.post(
        "/api/runs",
        status_code=status.HTTP_202_ACCEPTED,
        response_model=RunLaunchResponse,
    )
    async def launch_run(request: RunRequest) -> RunLaunchResponse:
        """Start an autonomous test run asynchronously."""
        run_state = manager.start_run(
            request=request,
            llm_provider=app.state.llm_provider,
        )
        return RunLaunchResponse(
            run_id=run_state.run_id,
            status="running",
            url=run_state.url,
            goal=run_state.goal,
        )

    # -------------------------------------------------------------------------
    # Route: Run Status (GET /api/runs/{run_id})
    # -------------------------------------------------------------------------
    @app.get("/api/runs/{run_id}", response_model=RunStatusResponse)
    async def get_run_status(run_id: str) -> RunStatusResponse:
        """Retrieve execution state, structured results, and artifact URLs."""
        if not RUN_ID_REGEX.match(run_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Run '{run_id}' not found.",
            )
        run_state = manager.get_run(run_id)
        if not run_state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Run '{run_id}' not found.",
            )
        return run_state

    # -------------------------------------------------------------------------
    # Route: List Runs (GET /api/runs)
    # -------------------------------------------------------------------------
    @app.get("/api/runs", response_model=List[RunSummary])
    async def list_runs() -> List[RunSummary]:
        """List recent test runs from memory and disk."""
        return manager.list_runs()

    # -------------------------------------------------------------------------
    # Route: Safe Artifact Serving (GET /api/runs/{run_id}/artifacts/{file_path:path})
    # -------------------------------------------------------------------------
    @app.get("/api/runs/{run_id}/artifacts/{file_path:path}")
    async def serve_artifact(run_id: str, file_path: str) -> FileResponse:
        """Safely serve report.json, report.md, or screenshots belonging to a run."""
        # 1. Validate run_id format
        if not RUN_ID_REGEX.match(run_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid run ID.",
            )

        # 2. Reject obvious traversal attempts in file_path
        normalized_path = file_path.replace("\\", "/")
        if (
            ".." in normalized_path
            or normalized_path.startswith("/")
            or normalized_path.startswith("~")
            or ":" in normalized_path
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Artifact not found.",
            )

        # 3. Validate file extension
        suffix = Path(normalized_path).suffix.lower()
        if suffix not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Artifact not found.",
            )

        # 4. Resolve run directory and verify containment
        base_dir = manager.artifacts_base_dir.resolve()
        run_dir = (base_dir / run_id).resolve()
        if not run_dir.is_dir() or not run_dir.is_relative_to(base_dir):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Run artifacts not found.",
            )

        # 5. Resolve target file and verify strict containment inside run_dir
        target_file = (run_dir / normalized_path).resolve()
        if not target_file.is_file() or not target_file.is_relative_to(run_dir):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Artifact file not found.",
            )

        # 6. Determine media type
        media_types = {
            ".json": "application/json",
            ".md": "text/markdown; charset=utf-8",
            ".png": "image/png",
        }
        media_type = media_types.get(suffix, "application/octet-stream")

        return FileResponse(path=target_file, media_type=media_type)

    return app


# Default app instance
app = create_app()
