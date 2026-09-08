"""Local Ollama LLM reasoning provider using the Ollama REST API."""

import os
from typing import Optional
import httpx

from app.llm.base import BaseLLMProvider
from app.llm.context import StepPromptContext
from app.llm.errors import (
    LLMResponseFormatError,
)
from app.llm.utils import (
    extract_and_parse_step_decision,
    map_http_exception,
    serialize_prompt_context,
)
from app.models.actions import StepDecision

DEFAULT_OLLAMA_HOST = "http://localhost:11434"
DEFAULT_OLLAMA_MODEL = "qwen2.5-coder:3b"


class OllamaLLMProvider(BaseLLMProvider):
    """Reasoning provider utilizing a local Ollama daemon via REST endpoint with JSON mode."""

    def __init__(
        self,
        host: Optional[str] = None,
        model: Optional[str] = None,
        client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        raw_host = (host or os.getenv("OLLAMA_HOST", DEFAULT_OLLAMA_HOST)).strip()
        self.host = raw_host.rstrip("/")
        self.model = (model or os.getenv("OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL)).strip()
        self._client = client

    @property
    def provider_name(self) -> str:
        return "ollama"

    async def is_available(self) -> bool:
        """Check if local Ollama daemon is reachable by pinging /api/tags with a 1.0s timeout."""
        try:
            if self._client is not None:
                resp = await self._client.get(f"{self.host}/api/tags")
                return resp.status_code == 200
            else:
                async with httpx.AsyncClient(timeout=1.0) as client:
                    resp = await client.get(f"{self.host}/api/tags")
                    return resp.status_code == 200
        except Exception:
            return False

    async def generate_step(
        self,
        context: StepPromptContext,
        timeout_s: float = 30.0,
    ) -> StepDecision:
        headers = {"Content-Type": "application/json"}
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
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.1,
            },
        }

        try:
            if self._client is not None:
                resp = await self._client.post(f"{self.host}/api/chat", json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
            else:
                async with httpx.AsyncClient(timeout=httpx.Timeout(timeout_s, connect=5.0)) as client:
                    resp = await client.post(f"{self.host}/api/chat", json=payload, headers=headers)
                    resp.raise_for_status()
                    data = resp.json()
        except Exception as exc:
            raise map_http_exception(exc, self.provider_name, timeout_s) from exc

        message = data.get("message", {})
        raw_text = message.get("content")
        if not raw_text:
            raise LLMResponseFormatError(
                f"Provider '{self.provider_name}' returned empty message content."
            )

        return extract_and_parse_step_decision(raw_text, self.provider_name)
