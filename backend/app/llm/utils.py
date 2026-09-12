"""Shared utility functions for prompt formatting, JSON extraction, and HTTP error mapping."""

import json
from typing import Optional
import httpx
from pydantic import ValidationError

from app.llm.context import StepPromptContext
from app.llm.errors import (
    LLMConfigurationError,
    LLMProviderError,
    LLMProviderUnavailableError,
    LLMRateLimitError,
    LLMResponseFormatError,
)
from app.models.actions import StepDecision


def serialize_prompt_context(context: StepPromptContext) -> str:
    """Serialize a StepPromptContext into a structured text prompt for reasoning models."""
    sections = []

    sections.append("### TESTING GOAL\n" + context.goal + "\n")

    obs = context.current_observation
    obs_lines = [f"- URL: {obs.url}", f"- Title: {obs.title}"]
    if obs.aria_snapshot:
        obs_lines.append(f"- Accessible Elements (ARIA Snapshot):\n{obs.aria_snapshot}")
    sections.append("### CURRENT PAGE OBSERVATION\n" + "\n".join(obs_lines) + "\n")

    if context.history:
        recent = context.get_recent_history(max_steps=5)
        history_lines = []
        for step in recent:
            res_str = "SUCCESS" if step.result.success else f"FAILED ({step.result.error_message or 'error'})"
            history_lines.append(
                f"Step {step.step_number}: Action '{step.result.action_type}' -> {res_str} | "
                f"Reasoning: {step.decision.decision}"
            )
        sections.append("### RECENT STEP HISTORY\n" + "\n".join(history_lines) + "\n")

    if context.diagnostics_summary:
        diag_lines = [f"- {k}: {v}" for k, v in context.diagnostics_summary.items()]
        sections.append("### BROWSER DIAGNOSTICS\n" + "\n".join(diag_lines) + "\n")

    if context.test_variables:
        var_lines = [f"- {k}: {v}" for k, v in context.test_variables.items()]
        sections.append("### TEST VARIABLES / CREDENTIALS\n" + "\n".join(var_lines) + "\n")

    instructions = (
        "### INSTRUCTIONS\n"
        "You are an autonomous website testing agent reasoning engine.\n"
        "Analyze the current page state and testing goal, then select the SINGLE next best action.\n"
        "You must respond with ONLY a valid JSON object matching the following StepDecision schema:\n"
        "{\n"
        '  "observation_summary": "Concise summary of current page state",\n'
        '  "decision": "Rationale for why this action was selected",\n'
        '  "action": {\n'
        '    "action_type": "click" | "fill" | "navigate" | "assert" | "press_key" | "select" | "scroll" | "hover" | "finish",\n'
        '    ... action-specific fields ...\n'
        "  }\n"
        "}\n\n"
        "Action details:\n"
        '- click: {"action_type": "click", "role": "...", "name": "...", "text": "...", "selector": "..."}\n'
        '- fill: {"action_type": "fill", "value": "text to type", "role": "...", "name": "...", "placeholder": "..."}\n'
        '- navigate: {"action_type": "navigate", "url": "http://..."}\n'
        '- assert: {"action_type": "assert", "assertion_type": "visible" | "hidden" | "has_text" | "has_value" | "has_url" | "has_title", "expected_value": "...", "role": "...", "name": "..."}\n'
        '- press_key: {"action_type": "press_key", "key": "Enter" | "Escape" | "Tab" | "ArrowDown" | "ArrowUp" | "Backspace", "role": "...", "name": "...", "selector": "..."}. Note: locator fields are optional; if omitted, key is dispatched globally to the active page.\n'
        '- select: {"action_type": "select", "value": "option_value" OR "label": "Option Label", "role": "combobox", "name": "...", "selector": "..."}. Note: targets native <select> controls; requires a locator and exactly one of value or label.\n'
        '- scroll: {"action_type": "scroll", "direction": "down" | "up", "amount": 500}. Note: use incremental scrolling when the target element is below the current viewport; do not repeatedly scroll if the observation is unchanged.\n'
        '- hover: {"action_type": "hover", "role": "...", "name": "...", "text": "...", "selector": "..."}. Note: use when interaction requires revealing a hover menu, tooltip, or dropdown before interacting with the revealed content.\n'
        '- finish: {"action_type": "finish", "success": true/false, "message": "outcome summary"}. Note: success=true requires at least one prior verified assert action.\n\n'
        "Return ONLY the JSON object. Do not include markdown code fences or conversational text outside the JSON."
    )
    sections.append(instructions)

    return "\n".join(sections)


def extract_and_parse_step_decision(raw_text: str, provider_name: str) -> StepDecision:
    """Extract, parse, and validate a StepDecision model from raw LLM output text.

    Handles:
    - Raw plain JSON
    - Markdown code fences (```json ... ```)
    - Preamble or postamble text surrounding the JSON object

    Raises:
        LLMResponseFormatError: If parsing or Pydantic validation fails.
    """
    if not raw_text or not raw_text.strip():
        raise LLMResponseFormatError(
            f"Provider '{provider_name}' returned empty or whitespace-only response content."
        )

    cleaned = raw_text.strip()

    # Strip markdown code fences if present
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    # First attempt: direct validation
    try:
        return StepDecision.model_validate_json(cleaned)
    except (ValidationError, ValueError, json.JSONDecodeError):
        pass

    # Second attempt: locate outermost JSON object if model included preamble/postamble
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidate = cleaned[first_brace : last_brace + 1]
        try:
            return StepDecision.model_validate_json(candidate)
        except ValidationError as val_err:
            raise LLMResponseFormatError(
                f"Provider '{provider_name}' emitted invalid StepDecision schema: {val_err}"
            ) from val_err
        except (ValueError, json.JSONDecodeError) as json_err:
            raise LLMResponseFormatError(
                f"Provider '{provider_name}' emitted malformed JSON: {json_err}"
            ) from json_err

    raise LLMResponseFormatError(
        f"Provider '{provider_name}' did not emit a valid JSON object in response."
    )


def map_http_exception(
    exc: Exception,
    provider_name: str,
    timeout_s: Optional[float] = None,
) -> Exception:
    """Map httpx network and HTTP status exceptions to normalized LLMProviderError hierarchy.

    Guarantees that sensitive headers (Authorization, x-goog-api-key) and credentials
    are never included in error messages.
    """
    if isinstance(exc, (httpx.TimeoutException, TimeoutError)):
        msg = f"Provider '{provider_name}' request timed out"
        if timeout_s is not None:
            msg += f" after {timeout_s}s"
        return LLMProviderUnavailableError(msg)

    if isinstance(exc, (httpx.ConnectError, httpx.NetworkError)):
        return LLMProviderUnavailableError(
            f"Provider '{provider_name}' endpoint is unreachable or network connection failed."
        )

    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code
        if status == 429:
            return LLMRateLimitError(
                f"Provider '{provider_name}' rate limit or quota exceeded (HTTP 429)."
            )
        if status in (500, 502, 503, 504):
            return LLMProviderUnavailableError(
                f"Provider '{provider_name}' service is currently unavailable (HTTP {status})."
            )
        if status in (401, 403):
            return LLMConfigurationError(
                f"Provider '{provider_name}' authentication failed (HTTP {status}). Check API key."
            )

        # Extract non-sensitive server error message if available
        detail = ""
        try:
            data = exc.response.json()
            if isinstance(data, dict) and "error" in data:
                err_obj = data["error"]
                if isinstance(err_obj, dict):
                    detail = err_obj.get("message", "")
                elif isinstance(err_obj, str):
                    detail = err_obj
        except Exception:
            pass

        if detail:
            # Sanitize to prevent credential leakage
            if "key=" in detail or "Bearer " in detail:
                detail = "[Redacted credential details]"
            return LLMProviderError(
                f"Provider '{provider_name}' returned unexpected HTTP {status}: {detail}"
            )

        return LLMProviderError(
            f"Provider '{provider_name}' returned unexpected HTTP {status}."
        )

    if isinstance(exc, LLMProviderError):
        return exc

    return LLMProviderError(
        f"Provider '{provider_name}' encountered an unexpected error: {type(exc).__name__}"
    )
