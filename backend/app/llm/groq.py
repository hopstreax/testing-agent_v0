"""Groq Cloud LLM reasoning provider using the OpenAI-compatible REST API."""

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

DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b"
GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"


class GroqLLMProvider(BaseLLMProvider):
    """Reasoning provider utilizing Groq Cloud via OpenAI-compatible endpoint with JSON mode."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        self.api_key = (api_key or os.getenv("GROQ_API_KEY", "")).strip()
        self.model = (model or os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL)).strip()
        self._client = client

    @property
    def provider_name(self) -> str:
        return "groq"

    async def is_available(self) -> bool:
        """Cheap check verifying whether Groq API key is configured."""
        return bool(self.api_key)

    async def generate_step(
        self,
        context: StepPromptContext,
        timeout_s: float = 30.0,
    ) -> StepDecision:
        if not self.api_key:
            raise LLMConfigurationError("Groq API key is not configured (GROQ_API_KEY).")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        prompt_text = serialize_prompt_context(context)
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an autonomous browser testing agent reasoning engine. Respond only with a valid JSON StepDecision object.",
                },
                {
                    "role": "user",
                    "content": prompt_text,
                },
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
        }

        try:
            if self._client is not None:
                resp = await self._client.post(GROQ_ENDPOINT, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
            else:
                async with httpx.AsyncClient(timeout=httpx.Timeout(timeout_s, connect=5.0)) as client:
                    resp = await client.post(GROQ_ENDPOINT, json=payload, headers=headers)
                    resp.raise_for_status()
                    data = resp.json()
        except Exception as exc:
            raise map_http_exception(exc, self.provider_name, timeout_s) from exc

        choices = data.get("choices", [])
        if not choices:
            raise LLMResponseFormatError(
                f"Provider '{self.provider_name}' returned empty choices list."
            )

        message = choices[0].get("message", {})
        raw_text = message.get("content")
        if not raw_text:
            raise LLMResponseFormatError(
                f"Provider '{self.provider_name}' returned empty message content."
            )

        return extract_and_parse_step_decision(raw_text, self.provider_name)
