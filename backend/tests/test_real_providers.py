"""Deterministic mocked tests for real LLM reasoning providers."""

import json
import httpx
import pytest

from app.llm.context import StepPromptContext
from app.llm.errors import (
    LLMConfigurationError,
    LLMProviderError,
    LLMProviderUnavailableError,
    LLMRateLimitError,
    LLMResponseFormatError,
)
from app.llm.fallback import FallbackLLMProvider
from app.llm.gemini import GeminiLLMProvider
from app.llm.groq import GroqLLMProvider
from app.llm.ollama import OllamaLLMProvider
from app.llm.utils import (
    extract_and_parse_step_decision,
    serialize_prompt_context,
)
from app.models.actions import (
    ClickAction,
    FinishAction,
    ObservationPayload,
    StepDecision,
)

pytestmark = pytest.mark.asyncio


@pytest.fixture
def sample_context() -> StepPromptContext:
    return StepPromptContext(
        goal="Click on the sign in button and verify login page",
        current_observation=ObservationPayload(
            url="https://example.com",
            title="Example Home",
            aria_snapshot="- button 'Sign In'\n- link 'About'",
        ),
        test_variables={"username": "alice"},
        diagnostics_summary={"console_errors": 0},
    )


VALID_DECISION_DICT = {
    "observation_summary": "On home page with a Sign In button visible.",
    "decision": "Click the sign in button to navigate to the authentication flow.",
    "action": {
        "action_type": "click",
        "role": "button",
        "name": "Sign In",
    },
}


# =========================================================================
# Shared Utilities Tests
# =========================================================================

def test_serialize_prompt_context(sample_context: StepPromptContext) -> None:
    text = serialize_prompt_context(sample_context)
    assert "Click on the sign in button" in text
    assert "https://example.com" in text
    assert "Example Home" in text
    assert "Sign In" in text
    assert "console_errors: 0" in text
    assert "username: alice" in text
    assert "StepDecision" in text
    assert "Disambiguation Rules:" in text
    assert "index" in text
    assert "has_count" in text


def test_prompt_hardened_index_guidance(sample_context: StepPromptContext) -> None:
    """Verify system prompt removes generic index=0 defaults and emphasizes disambiguation."""
    prompt = serialize_prompt_context(sample_context)
    # Action templates must not encourage index=0 as default
    assert '"index": 0' not in prompt
    # Disambiguation rules must clearly guide index usage
    assert "Do NOT provide 'index' by default" in prompt
    assert "'index' is an explicit disambiguation mechanism" in prompt
    assert "ambiguity error from TraceKit explicitly indicates multiple matches" in prompt



def test_extract_and_parse_step_decision_variants() -> None:
    # 1. Plain JSON
    raw_plain = json.dumps(VALID_DECISION_DICT)
    decision = extract_and_parse_step_decision(raw_plain, "test")
    assert decision.observation_summary == VALID_DECISION_DICT["observation_summary"]
    assert isinstance(decision.action, ClickAction)

    # 2. Markdown fenced JSON
    raw_fenced = f"```json\n{raw_plain}\n```"
    decision_fenced = extract_and_parse_step_decision(raw_fenced, "test")
    assert decision_fenced.action.action_type == "click"

    # 3. Preamble and postamble surrounding JSON
    raw_with_text = f"Here is my step decision:\n{raw_plain}\nHope this helps you test."
    decision_surrounded = extract_and_parse_step_decision(raw_with_text, "test")
    assert decision_surrounded.action.action_type == "click"

    # 4. Empty or whitespace
    with pytest.raises(LLMResponseFormatError, match="empty or whitespace"):
        extract_and_parse_step_decision("   ", "test")

    # 5. Completely malformed text
    with pytest.raises(LLMResponseFormatError):
        extract_and_parse_step_decision("Sorry, I cannot help with this.", "test")

    # 6. Invalid schema inside JSON (e.g. unknown action type)
    invalid_schema = json.dumps({
        "observation_summary": "test",
        "decision": "test",
        "action": {"action_type": "hover"},
    })
    with pytest.raises(LLMResponseFormatError, match="invalid StepDecision schema"):
        extract_and_parse_step_decision(invalid_schema, "test")


# =========================================================================
# Gemini Provider Tests
# =========================================================================

async def test_gemini_availability() -> None:
    assert await GeminiLLMProvider(api_key="valid-key").is_available() is True
    assert await GeminiLLMProvider(api_key="").is_available() is False
    assert await GeminiLLMProvider(api_key="   ").is_available() is False


async def test_gemini_generate_step_success(sample_context: StepPromptContext) -> None:
    mock_response = {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": json.dumps(VALID_DECISION_DICT)}],
                    "role": "model",
                },
                "finishReason": "STOP",
            }
        ]
    }

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers.get("x-goog-api-key") == "test-key"
        assert "gemini-3.6-flash" in str(request.url)
        body = json.loads(request.content.decode("utf-8"))
        # Verify that Gemini generationConfig does NOT send temperature (Gemini 3.6 requirement)
        gen_config = body.get("generationConfig", {})
        assert "temperature" not in gen_config
        assert gen_config.get("responseMimeType") == "application/json"
        return httpx.Response(200, json=mock_response)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = GeminiLLMProvider(api_key="test-key", model="gemini-3.6-flash", client=client)
    decision = await provider.generate_step(sample_context)

    assert decision.action.action_type == "click"
    assert isinstance(decision.action, ClickAction)
    assert decision.action.name == "Sign In"


async def test_gemini_default_model_is_3_6() -> None:
    provider = GeminiLLMProvider(api_key="test-key")
    assert provider.model == "gemini-3.6-flash"


async def test_gemini_rate_limit_error(sample_context: StepPromptContext) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json={"error": {"message": "Resource has been exhausted"}})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = GeminiLLMProvider(api_key="test-key", client=client)

    with pytest.raises(LLMRateLimitError, match="rate limit or quota exceeded"):
        await provider.generate_step(sample_context)


async def test_gemini_service_unavailable_error(sample_context: StepPromptContext) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, text="Service Unavailable")

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = GeminiLLMProvider(api_key="test-key", client=client)

    with pytest.raises(LLMProviderUnavailableError, match=r"currently unavailable \(HTTP 503\)"):
        await provider.generate_step(sample_context)


async def test_gemini_timeout_error(sample_context: StepPromptContext) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("Read timed out")

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = GeminiLLMProvider(api_key="test-key", client=client)

    with pytest.raises(LLMProviderUnavailableError, match="timed out"):
        await provider.generate_step(sample_context)


async def test_gemini_secret_not_leaked_in_error(sample_context: StepPromptContext) -> None:
    secret_key = "super-secret-gemini-key-xyz"

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": "Unauthorized key"})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = GeminiLLMProvider(api_key=secret_key, client=client)

    with pytest.raises(LLMConfigurationError) as exc_info:
        await provider.generate_step(sample_context)
    assert secret_key not in str(exc_info.value)


async def test_gemini_unexpected_http_error_extracts_detail(sample_context: StepPromptContext) -> None:
    server_error_msg = "This model is no longer available. Please use gemini-3.6-flash."

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"error": {"code": 404, "message": server_error_msg}})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = GeminiLLMProvider(api_key="test-key", client=client)

    with pytest.raises(LLMProviderError) as exc_info:
        await provider.generate_step(sample_context)

    err_str = str(exc_info.value)
    assert "HTTP 404" in err_str
    assert server_error_msg in err_str


async def test_gemini_empty_candidate_blocked(sample_context: StepPromptContext) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"candidates": []})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = GeminiLLMProvider(api_key="test-key", client=client)

    with pytest.raises(LLMResponseFormatError, match="returned no candidates"):
        await provider.generate_step(sample_context)


# =========================================================================
# Groq Provider Tests
# =========================================================================

async def test_groq_availability() -> None:
    assert await GroqLLMProvider(api_key="valid-key").is_available() is True
    assert await GroqLLMProvider(api_key="").is_available() is False


async def test_groq_generate_step_success(sample_context: StepPromptContext) -> None:
    mock_response = {
        "choices": [
            {
                "message": {"content": json.dumps(VALID_DECISION_DICT)},
                "finish_reason": "stop",
            }
        ]
    }

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers.get("Authorization") == "Bearer test-groq-key"
        body = json.loads(request.content.decode("utf-8"))
        assert body["model"] == "openai/gpt-oss-120b"
        assert body["response_format"] == {"type": "json_object"}
        return httpx.Response(200, json=mock_response)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = GroqLLMProvider(api_key="test-groq-key", model="openai/gpt-oss-120b", client=client)
    decision = await provider.generate_step(sample_context)

    assert decision.action.action_type == "click"
    assert isinstance(decision.action, ClickAction)


async def test_groq_rate_limit_error(sample_context: StepPromptContext) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json={"error": {"message": "Rate limit exceeded"}})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = GroqLLMProvider(api_key="test-groq-key", client=client)

    with pytest.raises(LLMRateLimitError, match="rate limit or quota exceeded"):
        await provider.generate_step(sample_context)


async def test_groq_secret_not_leaked(sample_context: StepPromptContext) -> None:
    secret_key = "top-secret-groq-credential"

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(403, json={"error": "Forbidden"})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = GroqLLMProvider(api_key=secret_key, client=client)

    with pytest.raises(LLMConfigurationError) as exc_info:
        await provider.generate_step(sample_context)
    assert secret_key not in str(exc_info.value)


# =========================================================================
# Ollama Provider Tests
# =========================================================================

async def test_ollama_availability_success_and_offline() -> None:
    # When daemon is online and responds 200
    def handler_online(request: httpx.Request) -> httpx.Response:
        assert str(request.url) == "http://localhost:11434/api/tags"
        return httpx.Response(200, json={"models": []})

    client_online = httpx.AsyncClient(transport=httpx.MockTransport(handler_online))
    provider_online = OllamaLLMProvider(host="http://localhost:11434", client=client_online)
    assert await provider_online.is_available() is True

    # When daemon is offline (ConnectError)
    def handler_offline(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("Connection refused")

    client_offline = httpx.AsyncClient(transport=httpx.MockTransport(handler_offline))
    provider_offline = OllamaLLMProvider(host="http://localhost:11434", client=client_offline)
    assert await provider_offline.is_available() is False


async def test_ollama_generate_step_success(sample_context: StepPromptContext) -> None:
    mock_response = {
        "message": {"role": "assistant", "content": json.dumps(VALID_DECISION_DICT)},
        "done": True,
    }

    def handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url) == "http://localhost:11434/api/chat"
        body = json.loads(request.content.decode("utf-8"))
        assert body["format"] == "json"
        assert body["stream"] is False
        return httpx.Response(200, json=mock_response)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = OllamaLLMProvider(host="http://localhost:11434", model="qwen2.5-coder:3b", client=client)
    decision = await provider.generate_step(sample_context)

    assert decision.action.action_type == "click"


async def test_ollama_generate_step_offline_raises_unavailable(sample_context: StepPromptContext) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("Connection refused")

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = OllamaLLMProvider(host="http://localhost:11434", client=client)

    with pytest.raises(LLMProviderUnavailableError, match="unreachable or network connection failed"):
        await provider.generate_step(sample_context)


# =========================================================================
# Fallback Integration with Real Providers
# =========================================================================

async def test_fallback_chain_with_real_providers(sample_context: StepPromptContext) -> None:
    finish_decision_dict = {
        "observation_summary": "Verified login form is visible.",
        "decision": "Testing goal achieved.",
        "action": {"action_type": "finish", "success": True, "message": "Sign in page verified"},
    }

    def handler(request: httpx.Request) -> httpx.Response:
        if "generativelanguage.googleapis.com" in str(request.url):
            return httpx.Response(429, json={"error": "Quota exceeded"})
        elif "api.groq.com" in str(request.url):
            return httpx.Response(200, json={
                "choices": [{"message": {"content": json.dumps(finish_decision_dict)}}]
            })
        return httpx.Response(404)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    gemini = GeminiLLMProvider(api_key="gemini-key", client=client)
    groq = GroqLLMProvider(api_key="groq-key", client=client)
    chain = FallbackLLMProvider([gemini, groq])

    decision = await chain.generate_step(sample_context)

    assert decision.action.action_type == "finish"
    assert isinstance(decision.action, FinishAction)
    assert decision.action.success is True
    assert decision.action.message == "Sign in page verified"
