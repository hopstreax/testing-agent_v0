"""Prompt context model supplying ground-truth state to LLM reasoning providers."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator
from app.models.actions import ObservationPayload, StepRecord


class StepPromptContext(BaseModel):
    """Structured context provided to an LLM provider to decide the next action."""

    goal: str = Field(
        ...,
        min_length=1,
        description="Natural-language testing objective provided by the user.",
    )
    current_observation: ObservationPayload = Field(
        ...,
        description="Current browser page state (URL, title, semantic ARIA snapshot, screenshot path).",
    )
    history: List[StepRecord] = Field(
        default_factory=list,
        description="Chronological sequence of previously executed steps in this run.",
    )
    diagnostics_summary: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Summary of recent browser errors (console, page exceptions, HTTP >= 400).",
    )
    test_variables: Dict[str, str] = Field(
        default_factory=dict,
        description="Key-value credentials or test parameters supplied for this run.",
    )

    @field_validator("goal")
    @classmethod
    def validate_goal(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Goal cannot be empty or whitespace only")
        return cleaned

    def get_recent_history(self, max_steps: int = 3) -> List[StepRecord]:
        """Return the most recent N steps without mutating the underlying history list."""
        if max_steps <= 0:
            return []
        return self.history[-max_steps:] if self.history else []
