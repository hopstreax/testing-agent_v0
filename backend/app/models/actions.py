"""Pydantic models for browser actions, observations, and agent decisions."""

import time
from typing import Annotated, Literal, Optional, Union
from pydantic import BaseModel, Field, field_validator


class BaseAction(BaseModel):
    """Base model for all locator-targeted browser actions."""

    # Locator resolution fields (Priority Ladder)
    role: Optional[str] = Field(None, description="ARIA role, e.g. 'button', 'textbox'")
    name: Optional[str] = Field(None, description="Accessible name or label matching the role")
    text: Optional[str] = Field(None, description="Exact or partial text content of the element")
    placeholder: Optional[str] = Field(None, description="Input placeholder attribute")
    label: Optional[str] = Field(None, description="Associated label text for input controls")
    selector: Optional[str] = Field(None, description="CSS selector or data-testid locator fallback")


class ClickAction(BaseAction):
    """Action to click on an element."""

    action_type: Literal["click"] = "click"
    button: Literal["left", "right", "middle"] = "left"
    click_count: int = Field(default=1, ge=1, le=3)


class FillAction(BaseAction):
    """Action to fill text into an input field."""

    action_type: Literal["fill"] = "fill"
    value: str = Field(..., description="Text string to input into the field")


class NavigateAction(BaseModel):
    """Action to navigate the browser to a specific URL."""

    action_type: Literal["navigate"] = "navigate"
    url: str = Field(..., description="Target HTTP or HTTPS URL to load")

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("URL cannot be empty or whitespace only")
        if not (cleaned.startswith("http://") or cleaned.startswith("https://")):
            raise ValueError("URL must start with 'http://' or 'https://'")
        return cleaned


class FinishAction(BaseModel):
    """Action signaling test completion or terminal failure."""

    action_type: Literal["finish"] = "finish"
    success: bool = Field(..., description="True if testing goal was verified, False if blocked or failed")
    message: str = Field(..., min_length=1, description="Summary explanation of the test outcome")

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Finish message cannot be empty or whitespace only")
        return cleaned


# Discriminated union of all supported actions
AgentAction = Annotated[
    Union[ClickAction, FillAction, NavigateAction, FinishAction],
    Field(discriminator="action_type"),
]


class ActionResult(BaseModel):
    """Structured result returned by ActionDispatcher after executing an action."""

    success: bool
    action_type: str
    duration_ms: int
    resolved_by: Optional[str] = Field(None, description="Locator strategy used to find the element")
    error_message: Optional[str] = None


class ObservationPayload(BaseModel):
    """Structured observation captured from a browser page."""

    url: str
    title: str
    aria_snapshot: str
    screenshot_path: Optional[str] = None
    timestamp: float = Field(default_factory=time.time)


class StepDecision(BaseModel):
    """Structured decision emitted by the LLM on each reasoning turn."""

    observation_summary: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Concise description of the current page state and key visible elements.",
    )
    decision: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Action rationale explaining why this specific action was chosen to make progress.",
    )
    action: AgentAction = Field(
        ...,
        description="Strictly-typed browser action to execute.",
    )

    @field_validator("observation_summary", "decision")
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty or whitespace only")
        return cleaned


class StepRecord(BaseModel):
    """In-memory record of an executed agent step, linking observation, decision, and result."""

    step_number: int = Field(..., ge=1, description="1-indexed step counter")
    observation: ObservationPayload = Field(..., description="Page state captured prior to the action")
    decision: StepDecision = Field(..., description="LLM reasoning and chosen action")
    result: ActionResult = Field(..., description="Execution outcome from the browser layer")
    timestamp: float = Field(default_factory=time.time, description="Epoch timestamp when step completed")
