"""Deterministic, credential-free mock LLM provider for unit tests and simulation."""

from typing import List, Optional, Union
from app.llm.base import BaseLLMProvider
from app.llm.context import StepPromptContext
from app.llm.errors import LLMProviderExhaustedError
from app.models.actions import StepDecision


class MockLLMProvider(BaseLLMProvider):
    """Mock LLM provider that returns scripted decisions or raises scripted exceptions."""

    def __init__(
        self,
        name: str = "mock",
        script: Optional[List[Union[StepDecision, Exception]]] = None,
        available: bool = True,
    ) -> None:
        self._name = name
        self._script: List[Union[StepDecision, Exception]] = list(script or [])
        self._available = available
        self.calls: List[StepPromptContext] = []

    @property
    def provider_name(self) -> str:
        return self._name

    async def is_available(self) -> bool:
        return self._available

    @property
    def call_count(self) -> int:
        return len(self.calls)

    def add_step(self, item: Union[StepDecision, Exception]) -> None:
        """Append a scripted StepDecision or Exception to the queue."""
        self._script.append(item)

    async def generate_step(
        self,
        context: StepPromptContext,
        timeout_s: float = 30.0,
    ) -> StepDecision:
        self.calls.append(context)

        if not self._script:
            raise LLMProviderExhaustedError(
                f"MockLLMProvider '{self._name}' has exhausted all scripted decisions."
            )

        item = self._script.pop(0)

        if isinstance(item, Exception):
            raise item

        return item.model_copy(deep=True)
