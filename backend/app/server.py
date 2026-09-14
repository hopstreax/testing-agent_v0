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
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel, Field, HttpUrl, field_validator

from app.auth import (
    OAUTH_STATE_COOKIE_NAME,
    User,
    build_google_authorization_url,
    clear_oauth_state_cookie,
    clear_session_cookie,
    create_session_token,
    exchange_google_code_for_tokens,
    generate_oauth_state,
    get_current_user,
    get_google_oauth_config,
    get_optional_current_user,
    set_oauth_state_cookie,
    set_session_cookie,
    validate_oauth_state,
    verify_google_id_token,
)
from app.llm.metadata import ProviderMetadata, get_providers_metadata
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

# Valid user_id / Google sub pattern (alphanumeric, underscores, hyphens)
USER_ID_REGEX = re.compile(r"^[a-zA-Z0-9_\-]+$")


class RunRequest(BaseModel):
    """Payload to launch a new autonomous website test."""

    url: str = Field(..., description="Target website URL to test")
    goal: str = Field(..., description="Natural language testing goal")
    browser: Literal["local", "solari"] = Field("local", description="Browser engine")
    headless: bool = Field(True, description="Run browser in headless mode")
    max_steps: int = Field(15, ge=1, le=50, description="Maximum agent reasoning steps")
    storage_state_path: Optional[str] = Field(None, description="Path to local Playwright storage_state.json")
    provider: Literal["auto", "gemini", "groq", "ollama"] = Field("auto", description="LLM reasoning provider")
    model: Optional[str] = Field(None, description="Optional LLM model override")

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

    @field_validator("storage_state_path")
    @classmethod
    def validate_storage_state_path(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        if not cleaned:
            return None

        # Reject null bytes
        if "\0" in cleaned:
            raise ValueError("Invalid storage state path.")

        path_obj = Path(cleaned).resolve()

        if not path_obj.exists():
            raise ValueError(f"Storage state file not found: '{cleaned}'")

        if path_obj.is_dir():
            raise ValueError(f"Storage state path cannot be a directory: '{cleaned}'")

        if not path_obj.is_file():
            raise ValueError(f"Storage state path must be a regular file: '{cleaned}'")

        if path_obj.suffix.lower() != ".json":
            raise ValueError("Storage state file must be a JSON file (.json extension).")

        # Size check (max 5MB)
        if path_obj.stat().st_size > 5 * 1024 * 1024:
            raise ValueError("Storage state file exceeds maximum permitted size (5MB).")

        # Validate JSON content structure without leaking secrets
        try:
            with open(path_obj, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            raise ValueError("Storage state file contains invalid JSON.")

        if not isinstance(data, dict) or not ("cookies" in data or "origins" in data):
            raise ValueError(
                "Storage state file must be a valid Playwright storage state JSON (containing 'cookies' or 'origins')."
            )

        return str(path_obj)


class RunLaunchResponse(BaseModel):
    """Response returned upon accepting a new test run."""

    run_id: str
    status: Literal["running"] = "running"
    url: str
    goal: str
    owner_id: Optional[str] = None


class RunStatusResponse(BaseModel):
    """Execution status and structured result for a test run."""

    run_id: str
    status: Literal["running", "completed", "failed", "error"]
    url: str
    goal: str
    browser: str
    headless: bool
    created_at: str
    owner_id: Optional[str] = None
    duration_ms: Optional[int] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    artifacts: Optional[Dict[str, str]] = None
    max_steps: int = 15
    storage_state_path: Optional[str] = None
    provider: Optional[str] = "auto"
    model: Optional[str] = None


class RunSummary(BaseModel):
    """Lightweight summary of a test run."""

    run_id: str
    status: Literal["running", "completed", "failed", "error"]
    url: str
    goal: str
    created_at: str
    owner_id: Optional[str] = None
    duration_ms: Optional[int] = None
    success: Optional[bool] = None


class RunManager:
    """In-memory execution manager coordinating background TestRunner tasks."""

    def __init__(self, artifacts_base_dir: Optional[Path] = None) -> None:
        if artifacts_base_dir is not None:
            effective_base = artifacts_base_dir
        else:
            env_dir = os.getenv("ARTIFACTS_DIR", "").strip()
            effective_base = env_dir if env_dir else "artifacts/runs"
        self.artifacts_base_dir = Path(effective_base).resolve()
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
        user_id: str,
        llm_provider: Optional[Any] = None,
    ) -> RunStatusResponse:
        """Create run state, schedule background execution, and return immediately."""
        if not USER_ID_REGEX.match(user_id):
            raise ValueError("Invalid user identifier format.")

        run_id = self._generate_run_id()
        now_str = datetime.now(timezone.utc).isoformat()

        # Resolve provider for the run unless an explicit provider was injected
        resolved_llm = llm_provider
        if resolved_llm is None:
            p_name = None if request.provider == "auto" else request.provider
            clean_model = request.model.strip() if request.model else None
            resolved_llm = resolve_llm_provider(provider_name=p_name, model=clean_model)

        run_state = RunStatusResponse(
            run_id=run_id,
            status="running",
            url=request.url,
            goal=request.goal,
            browser=request.browser,
            headless=request.headless,
            created_at=now_str,
            owner_id=user_id,
            max_steps=request.max_steps,
            storage_state_path=request.storage_state_path,
            provider=request.provider,
            model=request.model,
        )
        self._runs[run_id] = run_state

        # User-scoped artifact directory: artifacts/runs/<user_id>/
        user_artifacts_dir = (self.artifacts_base_dir / user_id).resolve()
        if not user_artifacts_dir.is_relative_to(self.artifacts_base_dir):
            raise ValueError("User directory traversal detected.")
        user_artifacts_dir.mkdir(parents=True, exist_ok=True)

        # Instantiate runner using user-scoped directory and owner_id
        runner = TestRunner(
            artifacts_base_dir=user_artifacts_dir,
            llm_provider=resolved_llm,
            browser_type=request.browser,
            headless=request.headless,
            max_steps=request.max_steps,
            owner_id=user_id,
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
                storage_state=request.storage_state_path,
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
            if agent_result.llm_provider:
                self._runs[run_id].provider = agent_result.llm_provider
            if agent_result.llm_model:
                self._runs[run_id].model = agent_result.llm_model

        except Exception as exc:
            self._runs[run_id].status = "error"
            self._runs[run_id].error = str(exc)

    def get_run(self, run_id: str, user_id: str) -> Optional[RunStatusResponse]:
        """Retrieve run state by ID for a specific user, with fallback to persisted disk reports."""
        if not RUN_ID_REGEX.match(run_id) or not USER_ID_REGEX.match(user_id):
            return None

        # 1. In-memory state
        if run_id in self._runs:
            state = self._runs[run_id]
            if state.owner_id == user_id:
                return state
            return None

        # 2. Disk fallback scoped strictly to this user's namespace
        user_artifacts_dir = (self.artifacts_base_dir / user_id).resolve()
        if not user_artifacts_dir.is_dir() or not user_artifacts_dir.is_relative_to(self.artifacts_base_dir):
            return None

        run_dir = (user_artifacts_dir / run_id).resolve()
        if (
            run_dir.is_dir()
            and run_dir.is_relative_to(user_artifacts_dir)
            and (run_dir / "report.json").is_file()
        ):
            try:
                with open(run_dir / "report.json", "r", encoding="utf-8") as f:
                    data = json.load(f)

                report_owner = data.get("owner_id")
                if report_owner is not None and report_owner != user_id:
                    return None

                status_str = "completed" if data.get("success") else "failed"
                run_state = RunStatusResponse(
                    run_id=run_id,
                    status=status_str,
                    url=data.get("target_url", ""),
                    goal=data.get("goal", ""),
                    browser="local",
                    headless=True,
                    created_at=data.get("start_time") or datetime.now(timezone.utc).isoformat(),
                    owner_id=user_id,
                    duration_ms=data.get("duration_ms"),
                    result=data,
                    artifacts={
                        "report_json": f"/api/runs/{run_id}/artifacts/report.json",
                        "report_md": f"/api/runs/{run_id}/artifacts/report.md",
                    },
                    provider=data.get("llm_provider", "auto"),
                    model=data.get("llm_model", None),
                )
                self._runs[run_id] = run_state
                return run_state
            except Exception:
                return None

        return None

    def list_runs(self, user_id: str) -> List[RunSummary]:
        """List summaries of runs belonging exclusively to the specified user."""
        if not USER_ID_REGEX.match(user_id):
            return []

        summaries: List[RunSummary] = []
        seen_ids = set()

        # 1. From memory (only runs owned by this user)
        for r_id, state in self._runs.items():
            if state.owner_id == user_id:
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
                        owner_id=state.owner_id,
                        duration_ms=state.duration_ms,
                        success=success_val,
                    )
                )

        # 2. From user-scoped disk directory: artifacts/runs/<user_id>/
        user_artifacts_dir = (self.artifacts_base_dir / user_id).resolve()
        if user_artifacts_dir.is_dir() and user_artifacts_dir.is_relative_to(self.artifacts_base_dir):
            for entry in user_artifacts_dir.iterdir():
                if entry.is_dir() and entry.name not in seen_ids and RUN_ID_REGEX.match(entry.name):
                    report_path = entry / "report.json"
                    if report_path.is_file():
                        try:
                            with open(report_path, "r", encoding="utf-8") as f:
                                data = json.load(f)
                            if data.get("owner_id") is not None and data.get("owner_id") != user_id:
                                continue
                            success_val = data.get("success")
                            status_val = "completed" if success_val else "failed"
                            summaries.append(
                                RunSummary(
                                    run_id=entry.name,
                                    status=status_val,
                                    url=data.get("target_url", ""),
                                    goal=data.get("goal", ""),
                                    created_at=data.get("start_time") or "",
                                    owner_id=user_id,
                                    duration_ms=data.get("duration_ms"),
                                    success=success_val,
                                )
                            )
                        except Exception:
                            continue

        # Sort newest first using canonical run_id timestamp
        summaries.sort(key=lambda s: s.run_id, reverse=True)
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
    # Route: Health Probe (GET /api/health)
    # -------------------------------------------------------------------------
    @app.get("/api/health")
    async def health_check() -> Dict[str, str]:
        """Lightweight operational health probe for container and deployment monitors."""
        env = os.getenv("ENVIRONMENT", "development").strip().lower() or "development"
        return {
            "status": "ok",
            "environment": env,
        }

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
    async def launch_run(
        request: RunRequest,
        current_user: User = Depends(get_current_user),
    ) -> RunLaunchResponse:
        """Start an autonomous test run asynchronously for the authenticated user."""
        if not USER_ID_REGEX.match(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user identifier format.",
            )
        run_state = manager.start_run(
            request=request,
            user_id=current_user.id,
            llm_provider=app.state.llm_provider,
        )
        return RunLaunchResponse(
            run_id=run_state.run_id,
            status="running",
            url=run_state.url,
            goal=run_state.goal,
            owner_id=run_state.owner_id,
        )

    # -------------------------------------------------------------------------
    # Route: Run Status (GET /api/runs/{run_id})
    # -------------------------------------------------------------------------
    @app.get("/api/runs/{run_id}", response_model=RunStatusResponse)
    async def get_run_status(
        run_id: str,
        current_user: User = Depends(get_current_user),
    ) -> RunStatusResponse:
        """Retrieve execution state, structured results, and artifact URLs for the user's run."""
        if not USER_ID_REGEX.match(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user identifier format.",
            )
        if not RUN_ID_REGEX.match(run_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Run '{run_id}' not found.",
            )
        run_state = manager.get_run(run_id=run_id, user_id=current_user.id)
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
    async def list_runs(
        current_user: User = Depends(get_current_user),
    ) -> List[RunSummary]:
        """List recent test runs belonging to the authenticated user."""
        if not USER_ID_REGEX.match(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user identifier format.",
            )
        return manager.list_runs(user_id=current_user.id)

    # -------------------------------------------------------------------------
    # Route: List Providers (GET /api/providers)
    # -------------------------------------------------------------------------
    @app.get("/api/providers", response_model=List[ProviderMetadata])
    async def list_providers() -> List[ProviderMetadata]:
        """Return static metadata describing supported LLM providers and curated models."""
        return get_providers_metadata()

    # -------------------------------------------------------------------------
    # Route: Google OAuth Login (GET /api/auth/google/login)
    # -------------------------------------------------------------------------
    @app.get("/api/auth/google/login")
    async def google_login() -> Response:
        """Initiate Google OAuth 2.0 authorization code flow."""
        try:
            config = get_google_oauth_config()
        except RuntimeError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth is not configured.",
            )

        state = generate_oauth_state()
        auth_url = build_google_authorization_url(
            state=state,
            client_id=config["client_id"],
            redirect_uri=config["redirect_uri"],
        )

        response = RedirectResponse(
            url=auth_url,
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )
        set_oauth_state_cookie(response, state)
        return response

    # -------------------------------------------------------------------------
    # Route: Google OAuth Callback (GET /api/auth/google/callback)
    # -------------------------------------------------------------------------
    @app.get("/api/auth/google/callback")
    async def google_callback(
        request: Request,
        code: Optional[str] = None,
        state: Optional[str] = None,
        error: Optional[str] = None,
        error_description: Optional[str] = None,
    ) -> Response:
        """Handle Google OAuth 2.0 authorization callback and establish session."""
        if error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google authentication was denied or cancelled.",
            )

        if not code or not code.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing authorization code.",
            )

        stored_state = request.cookies.get(OAUTH_STATE_COOKIE_NAME)
        if not state or not stored_state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing OAuth state parameter.",
            )

        if not validate_oauth_state(state, stored_state):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OAuth state validation failed.",
            )

        try:
            config = get_google_oauth_config()
        except RuntimeError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth is not configured.",
            )

        try:
            tokens = await exchange_google_code_for_tokens(
                code=code.strip(),
                client_id=config["client_id"],
                client_secret=config["client_secret"],
                redirect_uri=config["redirect_uri"],
            )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange authorization code.",
            )

        id_token = tokens.get("id_token")
        if not id_token or not isinstance(id_token, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token response from Google.",
            )

        try:
            user = verify_google_id_token(
                id_token=id_token,
                client_id=config["client_id"],
            )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google ID token verification failed.",
            )

        try:
            session_token = create_session_token(user)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to establish session.",
            )

        response = RedirectResponse(
            url="/runs",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )
        set_session_cookie(response, session_token)
        clear_oauth_state_cookie(response)
        return response

    # -------------------------------------------------------------------------
    # Route: Current User Identity (GET /api/auth/me)
    # -------------------------------------------------------------------------
    @app.get("/api/auth/me")
    async def get_current_auth_user(
        current_user: Optional[User] = Depends(get_optional_current_user),
    ) -> Dict[str, Any]:
        """Return the current user identity if authenticated, else authenticated: False."""
        if current_user is None:
            return {"authenticated": False}

        return {
            "authenticated": True,
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "name": current_user.name,
                "picture": current_user.picture,
            },
        }

    # -------------------------------------------------------------------------
    # Route: Logout (POST /api/auth/logout)
    # -------------------------------------------------------------------------
    @app.post("/api/auth/logout")
    async def logout() -> Response:
        """Clear the TraceKit session and any lingering OAuth state cookies."""
        response = JSONResponse(content={"status": "ok"})
        clear_session_cookie(response)
        clear_oauth_state_cookie(response)
        return response

    # -------------------------------------------------------------------------
    # Route: Safe Artifact Serving (GET /api/runs/{run_id}/artifacts/{file_path:path})
    # -------------------------------------------------------------------------
    @app.get("/api/runs/{run_id}/artifacts/{file_path:path}")
    async def serve_artifact(
        run_id: str,
        file_path: str,
        current_user: User = Depends(get_current_user),
    ) -> FileResponse:
        """Safely serve report.json, report.md, or screenshots belonging to the authenticated user's run."""
        # 1. Validate run_id format
        if not RUN_ID_REGEX.match(run_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid run ID.",
            )

        # 2. Validate user_id format
        if not USER_ID_REGEX.match(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid user identifier.",
            )

        # 3. Reject obvious traversal attempts in file_path
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

        # 4. Validate file extension
        suffix = Path(normalized_path).suffix.lower()
        if suffix not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Artifact not found.",
            )

        # 5. Resolve user directory and verify containment
        base_dir = manager.artifacts_base_dir.resolve()
        user_dir = (base_dir / current_user.id).resolve()
        if not user_dir.is_dir() or not user_dir.is_relative_to(base_dir):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Run artifacts not found.",
            )

        # 6. Resolve run directory and verify containment inside user_dir
        run_dir = (user_dir / run_id).resolve()
        if not run_dir.is_dir() or not run_dir.is_relative_to(user_dir):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Run artifacts not found.",
            )

        # 7. Resolve target file and verify strict containment inside run_dir
        target_file = (run_dir / normalized_path).resolve()
        if not target_file.is_file() or not target_file.is_relative_to(run_dir):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Artifact file not found.",
            )

        # 8. Determine media type
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
