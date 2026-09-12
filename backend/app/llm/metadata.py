"""Static metadata and curated model definitions for LLM providers."""

from typing import List, Optional
from pydantic import BaseModel, Field

from app.llm.gemini import DEFAULT_GEMINI_MODEL
from app.llm.groq import DEFAULT_GROQ_MODEL
from app.llm.ollama import DEFAULT_OLLAMA_MODEL


class ProviderMetadata(BaseModel):
    """Public metadata describing a supported LLM provider and curated models."""

    id: str = Field(..., description="Unique provider identifier used in API requests")
    label: str = Field(..., description="Human-readable provider display label")
    default_model: Optional[str] = Field(None, description="Default model name for the provider")
    models: List[str] = Field(default_factory=list, description="Curated list of recommended models")


def get_providers_metadata() -> List[ProviderMetadata]:
    """Return static provider metadata for frontend selection.

    Excludes internal Mock provider. Never exposes credentials.
    """
    return [
        ProviderMetadata(
            id="auto",
            label="Auto (Fallback)",
            default_model=None,
            models=[],
        ),
        ProviderMetadata(
            id="gemini",
            label="Google Gemini",
            default_model=DEFAULT_GEMINI_MODEL,
            models=[
                DEFAULT_GEMINI_MODEL,
                "gemini-2.5-flash",
                "gemini-2.5-pro",
            ],
        ),
        ProviderMetadata(
            id="groq",
            label="Groq",
            default_model=DEFAULT_GROQ_MODEL,
            models=[
                DEFAULT_GROQ_MODEL,
                "openai/gpt-oss-20b",
                "qwen/qwen3.6-27b",
            ],
        ),
        ProviderMetadata(
            id="ollama",
            label="Ollama",
            default_model=DEFAULT_OLLAMA_MODEL,
            models=[
                DEFAULT_OLLAMA_MODEL,
                "llama3.2:3b",
            ],
        ),
    ]
