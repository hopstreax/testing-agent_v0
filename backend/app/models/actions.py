"""Pydantic models for browser actions and observations in Milestone 1."""

import time
from typing import Annotated, Literal, Optional, Union
from pydantic import BaseModel, Field


class BaseAction(BaseModel):
    """Base model for all targetable browser actions."""

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


# Discriminated union of all supported actions
AgentAction = Annotated[
    Union[ClickAction, FillAction],
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
