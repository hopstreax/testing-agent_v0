"""Normalized exception hierarchy for LLM reasoning providers."""

from typing import List, Tuple


class LLMProviderError(Exception):
    """Base exception for all LLM provider errors."""

    pass


class LLMConfigurationError(LLMProviderError):
    """Raised when provider configuration or required API credentials are missing/invalid."""

    pass


class LLMRateLimitError(LLMProviderError):
    """Raised when a provider returns HTTP 429 (Rate Limit Exceeded) or quota is exhausted.

    Signals to FallbackLLMProvider that it should fail over to the next provider.
    """

    pass


class LLMProviderUnavailableError(LLMProviderError):
    """Raised when a provider endpoint is unreachable (e.g. HTTP 503, offline local daemon, network error).

    Signals to FallbackLLMProvider that it should fail over to the next provider.
    """

    pass


class LLMResponseFormatError(LLMProviderError):
    """Raised when provider output cannot be parsed or validated into a StepDecision.

    Signals to FallbackLLMProvider that it should fail over to the next provider.
    """

    pass


class LLMProviderExhaustedError(LLMProviderError):
    """Raised when a mock or scripted provider has exhausted its queue of scripted decisions."""

    pass


class AllProvidersFailedError(LLMProviderError):
    """Raised by FallbackLLMProvider when every provider in the fallback chain has failed."""

    def __init__(self, attempts: List[Tuple[str, Exception]]) -> None:
        self.attempts = attempts
        summary = ", ".join(
            f"{name}: {type(exc).__name__}('{exc}')" for name, exc in attempts
        )
        super().__init__(f"All LLM providers failed. Attempts: [{summary}]")
