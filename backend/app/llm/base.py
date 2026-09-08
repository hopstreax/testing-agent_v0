"""Abstract base provider protocol for LLM reasoning."""

from abc import ABC, abstractmethod
from app.llm.context import StepPromptContext
from app.models.actions import StepDecision


class BaseLLMProvider(ABC):
    """Abstract interface that all LLM providers must implement."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Unique identifier for this provider (e.g. 'gemini', 'groq', 'ollama', 'mock')."""
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """Check whether provider configuration and endpoints are available."""
        pass

    @abstractmethod
    async def generate_step(
        self,
        context: StepPromptContext,
        timeout_s: float = 30.0,
    ) -> StepDecision:
        """Generate a validated StepDecision based on the supplied context.

        Raises:
            LLMRateLimitError: On HTTP 429 or quota limits.
            LLMProviderUnavailableError: When endpoint is offline or unreachable.
            LLMResponseFormatError: When output cannot be parsed into a StepDecision.
            LLMProviderError: On any other unrecoverable provider failure.
        """
        pass
