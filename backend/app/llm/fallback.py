"""Composite LLM provider implementing sequential failover across provider tiers."""

from typing import List, Tuple
from app.llm.base import BaseLLMProvider
from app.llm.context import StepPromptContext
from app.llm.errors import (
    AllProvidersFailedError,
    LLMProviderUnavailableError,
    LLMRateLimitError,
    LLMResponseFormatError,
)
from app.models.actions import StepDecision


class FallbackLLMProvider(BaseLLMProvider):
    """Composite provider that iterates through a priority list of providers with automatic failover."""

    def __init__(self, providers: List[BaseLLMProvider]) -> None:
        if not providers:
            raise ValueError("FallbackLLMProvider requires at least one provider.")
        self.providers = list(providers)

    @property
    def provider_name(self) -> str:
        names = ", ".join(p.provider_name for p in self.providers)
        return f"fallback({names})"

    async def is_available(self) -> bool:
        """Returns True if at least one provider in the chain reports available."""
        for provider in self.providers:
            if await provider.is_available():
                return True
        return False

    async def generate_step(
        self,
        context: StepPromptContext,
        timeout_s: float = 30.0,
    ) -> StepDecision:
        attempts: List[Tuple[str, Exception]] = []

        for provider in self.providers:
            # Check availability upfront
            try:
                available = await provider.is_available()
            except Exception as exc:  # noqa: BLE001
                attempts.append((provider.provider_name, exc))
                continue

            if not available:
                attempts.append(
                    (
                        provider.provider_name,
                        LLMProviderUnavailableError(
                            f"Provider '{provider.provider_name}' is not configured or unavailable."
                        ),
                    )
                )
                continue

            # Attempt step generation
            try:
                return await provider.generate_step(context, timeout_s=timeout_s)
            except (
                LLMRateLimitError,
                LLMProviderUnavailableError,
                LLMResponseFormatError,
            ) as recoverable_err:
                attempts.append((provider.provider_name, recoverable_err))
                continue

        raise AllProvidersFailedError(attempts)
