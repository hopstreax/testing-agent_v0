"""Domain models for agent execution results and run metadata."""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
from app.models.actions import StepRecord


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
