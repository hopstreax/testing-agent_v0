"""Google Gemini LLM reasoning provider using the Generative Language v1beta REST API."""

import os
from typing import Optional
import httpx

from app.llm.base import BaseLLMProvider
from app.llm.context import StepPromptContext
from app.llm.errors import (
    LLMConfigurationError,
    LLMResponseFormatError,
)
from app.llm.utils import (
    extract_and_parse_step_decision,
    map_http_exception,
    serialize_prompt_context,
)
from app.models.actions import StepDecision

DEFAULT_GEMINI_MODEL = "gemini-3.6-flash"
GEMINI_ENDPOINT_TEMPLATE = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)


class GeminiLLMProvider(BaseLLMProvider):
    """Reasoning provider utilizing Google Gemini via direct REST endpoint with JSON mode."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        self.api_key = (api_key or os.getenv("GEMINI_API_KEY", "")).strip()
        self.model = (model or os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)).strip()
        self._client = client

    @property
    def provider_name(self) -> str:
        return "gemini"

    async def is_available(self) -> bool:
        """Cheap check verifying whether Gemini API key is configured."""
        return bool(self.api_key)

    async def generate_step(
        self,
        context: StepPromptContext,
        timeout_s: float = 30.0,
    ) -> StepDecision:
        if not self.api_key:
            raise LLMConfigurationError("Gemini API key is not configured (GEMINI_API_KEY).")

        endpoint = GEMINI_ENDPOINT_TEMPLATE.format(model=self.model)
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key,
        }

        prompt_text = serialize_prompt_context(context)
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt_text}],
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
            },
        }

        try:
            if self._client is not None:
                resp = await self._client.post(endpoint, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
            else:
                async with httpx.AsyncClient(timeout=httpx.Timeout(timeout_s, connect=5.0)) as client:
                    resp = await client.post(endpoint, json=payload, headers=headers)
                    resp.raise_for_status()
                    data = resp.json()
        except Exception as exc:
            raise map_http_exception(exc, self.provider_name, timeout_s) from exc

        candidates = data.get("candidates", [])
        if not candidates:
            raise LLMResponseFormatError(
                f"Provider '{self.provider_name}' returned no candidates (possible safety filter block)."
            )

        candidate = candidates[0]
        content = candidate.get("content", {})
        parts = content.get("parts", [])
        if not parts or "text" not in parts[0]:
            raise LLMResponseFormatError(
                f"Provider '{self.provider_name}' candidate missing text parts."
            )

        raw_text = parts[0]["text"]
        return extract_and_parse_step_decision(raw_text, self.provider_name)
