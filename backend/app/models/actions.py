"""Pydantic models for browser actions, observations, and agent decisions."""

import time
from typing import Annotated, Literal, Optional, Union
from pydantic import BaseModel, Field, field_validator, model_validator


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


class AssertAction(BaseAction):
    """Action to execute a deterministic browser assertion against an element or page."""

    action_type: Literal["assert"] = "assert"
    assertion_type: Literal[
        "visible",
        "hidden",
        "has_text",
        "has_value",
        "has_url",
        "has_title",
    ] = Field(..., description="The type of assertion to evaluate.")
    expected_value: Optional[str] = Field(
        None,
        description="Expected value for has_text, has_value, has_url, or has_title assertions.",
    )

    @model_validator(mode="after")
    def validate_assertion_requirements(self) -> "AssertAction":
        # 1. Page assertions (has_url, has_title) require non-empty expected_value
        if self.assertion_type in ("has_url", "has_title"):
            if self.expected_value is None or not self.expected_value.strip():
                raise ValueError(f"Assertion '{self.assertion_type}' requires a non-empty 'expected_value'.")
            return self

        # 2. Element assertions with expected_value (has_text, has_value)
        if self.assertion_type in ("has_text", "has_value"):
            if self.expected_value is None or not self.expected_value.strip():
                raise ValueError(f"Assertion '{self.assertion_type}' requires a non-empty 'expected_value'.")

        # 3. Element assertions (visible, hidden, has_text, has_value) require a locator criterion
        has_locator = any([
            self.role,
            self.name,
            self.text,
            self.placeholder,
            self.label,
            self.selector,
        ])
        if not has_locator:
            raise ValueError(
                f"Assertion '{self.assertion_type}' targets a DOM element and requires at least "
                "one locator criterion (role, name, text, placeholder, label, selector)."
            )

        return self


SupportedKey = Literal[
    "Enter",
    "Escape",
    "Tab",
    "ArrowDown",
    "ArrowUp",
    "Backspace",
]


class PressKeyAction(BaseAction):
    """Action to press a specific keyboard key, optionally targeting a focused element."""

    action_type: Literal["press_key"] = "press_key"
    key: SupportedKey = Field(
        ...,
        description="Keyboard key to press. Supported: 'Enter', 'Escape', 'Tab', 'ArrowDown', 'ArrowUp', 'Backspace'.",
    )


class SelectAction(BaseAction):
    """Action to select an option in a native HTML <select> element."""

    action_type: Literal["select"] = "select"
    value: Optional[str] = Field(None, description="Option value attribute to select")
    label: Optional[str] = Field(None, description="Option visible text/label to select")

    @model_validator(mode="after")
    def validate_select_action(self) -> "SelectAction":
        # 1. Require a locator criterion
        has_locator = any([
            self.role,
            self.name,
            self.text,
            self.placeholder,
            self.selector,
        ])
        if not has_locator:
            raise ValueError(
                "SelectAction requires at least one locator criterion (role, name, text, placeholder, selector)."
            )

        # 2. Require exactly one of value or label
        has_value = self.value is not None and bool(self.value.strip())
        has_label = self.label is not None and bool(self.label.strip())

        if not has_value and not has_label:
            raise ValueError("SelectAction requires either 'value' or 'label' to select an option.")

        if has_value and has_label:
            raise ValueError("SelectAction cannot specify both 'value' and 'label'. Provide only one option criterion.")

        return self


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
    Union[
        ClickAction,
        FillAction,
        NavigateAction,
        AssertAction,
        PressKeyAction,
        SelectAction,
        FinishAction,
    ],
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
    screenshot_path: Optional[str] = Field(None, description="Path to screenshot evidence captured for this step")
