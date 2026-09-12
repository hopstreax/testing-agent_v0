"""Domain models for agent execution results and run metadata."""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
from app.models.actions import StepRecord


class FailureDiagnosis(BaseModel):
    """Structured deterministic diagnosis of a test run failure."""

    classification: Literal[
        "APPLICATION_BEHAVIOR_MISMATCH",
        "AUTOMATION_FAILURE",
    ] = Field(..., description="High-level category distinguishing site behavior mismatch from automation failure.")
    cause: Literal[
        "ASSERTION_FAILED",
        "LOCATOR_NOT_FOUND",
        "NAVIGATION_ERROR",
        "APPLICATION_CRASH",
        "AGENT_STAGNATION",
        "BUDGET_EXCEEDED",
        "PROVIDER_ERROR",
        "SESSION_ERROR",
        "UNKNOWN_FAILURE",
    ] = Field(..., description="Deterministic root cause classification.")
    summary: str = Field(..., description="Concise deterministic summary explaining the failure.")


class AgentRunResult(BaseModel):
    """Overall outcome of an autonomous test execution run."""

    success: bool = Field(..., description="True if goal achieved, False otherwise.")
    termination_reason: Literal[
        "goal_achieved",
        "goal_failed",
        "max_steps_exceeded",
        "stagnation_detected",
        "unrecoverable_error",
        "cancelled",
    ] = Field(..., description="Categorical cause of test termination.")
    message: str = Field(..., description="Human-readable outcome summary or finish explanation.")
    steps_executed: int = Field(..., ge=0, description="Total number of reasoning/action steps performed.")
    history: List[StepRecord] = Field(default_factory=list, description="Chronological Decision Trace.")
    duration_ms: int = Field(default=0, description="Total wall-clock duration of the test run in milliseconds.")
    diagnostics: Optional[Dict[str, Any]] = Field(None, description="Final browser diagnostics summary.")
    run_id: Optional[str] = Field(None, description="Unique run identifier.")
    goal: Optional[str] = Field(None, description="Natural-language testing goal.")
    target_url: Optional[str] = Field(None, description="Initial target URL.")
    artifacts_dir: Optional[str] = Field(None, description="Directory containing run artifacts.")
    failure_diagnosis: Optional[FailureDiagnosis] = Field(
        None, description="Deterministic diagnosis of why the run failed, if applicable."
    )
    authenticated: bool = Field(
        default=False, description="True if run executed with authenticated storage state."
    )
