"""Unit tests for the LLM provider abstraction, mock provider, context, and fallback engine."""

import pytest
from pydantic import ValidationError
from app.llm import (
    AllProvidersFailedError,
    BaseLLMProvider,
    FallbackLLMProvider,
    LLMConfigurationError,
    LLMProviderError,
    LLMProviderExhaustedError,
    LLMProviderUnavailableError,
    LLMRateLimitError,
    LLMResponseFormatError,
    MockLLMProvider,
    StepPromptContext,
)
from app.models.actions import (
    ActionResult,
    ClickAction,
    FillAction,
    FinishAction,
    ObservationPayload,
    StepDecision,
    StepRecord,
)


@pytest.fixture
def sample_observation():
    return ObservationPayload(
        url="https://the-internet.herokuapp.com/login",
        title="The Internet",
        aria_snapshot="- textbox 'Username'\n- textbox 'Password'\n- button 'Login'",
    )


@pytest.fixture
def sample_decision():
    return StepDecision(
        observation_summary="Login form displayed.",
        decision="Enter username to begin authentication.",
        action=FillAction(role="textbox", name="Username", value="tomsmith"),
    )


@pytest.fixture
def sample_context(sample_observation):
    return StepPromptContext(
        goal="Log into the application and verify success.",
        current_observation=sample_observation,
        test_variables={"username": "tomsmith", "password": "SuperSecretPassword!"},
    )


# ---------------------------------------------------------------------------
# BaseLLMProvider protocol tests
# ---------------------------------------------------------------------------

def test_base_provider_cannot_be_instantiated():
    with pytest.raises(TypeError):
        BaseLLMProvider()  # type: ignore


# ---------------------------------------------------------------------------
# StepPromptContext tests
# ---------------------------------------------------------------------------

def test_step_prompt_context_construction(sample_context, sample_observation):
    assert sample_context.goal == "Log into the application and verify success."
    assert sample_context.current_observation == sample_observation
    assert sample_context.history == []
    assert sample_context.test_variables["username"] == "tomsmith"


@pytest.mark.parametrize("invalid_goal", ["", "   "])
def test_step_prompt_context_rejects_empty_goal(invalid_goal, sample_observation):
    with pytest.raises(ValidationError):
        StepPromptContext(
            goal=invalid_goal,
            current_observation=sample_observation,
        )


def test_step_prompt_context_get_recent_history(sample_context, sample_observation, sample_decision):
    dummy_result = ActionResult(success=True, action_type="fill", duration_ms=100)

    # Create 5 records
    records = [
        StepRecord(
            step_number=i,
            observation=sample_observation,
            decision=sample_decision,
            result=dummy_result,
        )
        for i in range(1, 6)
    ]
    sample_context.history = records

    # Default max_steps = 3
    recent = sample_context.get_recent_history()
    assert len(recent) == 3
    assert [r.step_number for r in recent] == [3, 4, 5]

    # Non-mutating check
    assert len(sample_context.history) == 5

    # Boundary tests
    assert len(sample_context.get_recent_history(max_steps=10)) == 5
    assert sample_context.get_recent_history(max_steps=0) == []
    assert sample_context.get_recent_history(max_steps=-1) == []


# ---------------------------------------------------------------------------
# MockLLMProvider tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_mock_provider_returns_scripted_decision(sample_context, sample_decision):
    mock = MockLLMProvider(name="test_mock", script=[sample_decision])

    assert mock.provider_name == "test_mock"
    assert await mock.is_available() is True
    assert mock.call_count == 0

    result = await mock.generate_step(sample_context)

    assert result == sample_decision
    assert result is not sample_decision  # Must be a deep copy
    assert mock.call_count == 1
    assert mock.calls[0] == sample_context


@pytest.mark.asyncio
async def test_mock_provider_script_exhaustion(sample_context, sample_decision):
    mock = MockLLMProvider(script=[sample_decision])

    # First call succeeds
    await mock.generate_step(sample_context)

    # Second call raises exhaustion
    with pytest.raises(LLMProviderExhaustedError, match="exhausted all scripted decisions"):
        await mock.generate_step(sample_context)


@pytest.mark.asyncio
async def test_mock_provider_add_step(sample_context, sample_decision):
    mock = MockLLMProvider()
    mock.add_step(sample_decision)

    assert len(mock._script) == 1
    result = await mock.generate_step(sample_context)
    assert result == sample_decision


@pytest.mark.asyncio
async def test_mock_provider_injected_exception(sample_context):
    rate_err = LLMRateLimitError("Quota limit 429")
    mock = MockLLMProvider(script=[rate_err])

    with pytest.raises(LLMRateLimitError, match="Quota limit 429"):
        await mock.generate_step(sample_context)

    assert mock.call_count == 1


# ---------------------------------------------------------------------------
# FallbackLLMProvider tests
# ---------------------------------------------------------------------------

def test_fallback_provider_requires_at_least_one_provider():
    with pytest.raises(ValueError, match="at least one provider"):
        FallbackLLMProvider(providers=[])


@pytest.mark.asyncio
async def test_fallback_provider_uses_primary_when_healthy(sample_context, sample_decision):
    primary = MockLLMProvider(name="primary", script=[sample_decision])
    secondary = MockLLMProvider(name="secondary")

    fallback = FallbackLLMProvider([primary, secondary])
    assert "primary" in fallback.provider_name
    assert await fallback.is_available() is True

    result = await fallback.generate_step(sample_context)

    assert result == sample_decision
    assert primary.call_count == 1
    assert secondary.call_count == 0  # Secondary was never invoked


@pytest.mark.asyncio
async def test_fallback_provider_skips_unavailable_provider(sample_context, sample_decision):
    offline_provider = MockLLMProvider(name="offline", available=False)
    online_provider = MockLLMProvider(name="online", script=[sample_decision], available=True)

    fallback = FallbackLLMProvider([offline_provider, online_provider])
    result = await fallback.generate_step(sample_context)

    assert result == sample_decision
    assert offline_provider.call_count == 0  # Skipped before invocation
    assert online_provider.call_count == 1


@pytest.mark.asyncio
async def test_fallback_on_rate_limit(sample_context, sample_decision):
    primary = MockLLMProvider(name="primary", script=[LLMRateLimitError("Rate limit exceeded 429")])
    secondary = MockLLMProvider(name="secondary", script=[sample_decision])

    fallback = FallbackLLMProvider([primary, secondary])
    result = await fallback.generate_step(sample_context)

    assert result == sample_decision
    assert primary.call_count == 1
    assert secondary.call_count == 1


@pytest.mark.asyncio
async def test_fallback_on_provider_unavailable_error(sample_context, sample_decision):
    primary = MockLLMProvider(name="primary", script=[LLMProviderUnavailableError("Endpoint 503")])
    secondary = MockLLMProvider(name="secondary", script=[sample_decision])

    fallback = FallbackLLMProvider([primary, secondary])
    result = await fallback.generate_step(sample_context)

    assert result == sample_decision
    assert primary.call_count == 1
    assert secondary.call_count == 1


@pytest.mark.asyncio
async def test_fallback_on_response_format_error(sample_context, sample_decision):
    primary = MockLLMProvider(name="primary", script=[LLMResponseFormatError("Malformed JSON")])
    secondary = MockLLMProvider(name="secondary", script=[sample_decision])

    fallback = FallbackLLMProvider([primary, secondary])
    result = await fallback.generate_step(sample_context)

    assert result == sample_decision
    assert primary.call_count == 1
    assert secondary.call_count == 1


@pytest.mark.asyncio
async def test_fallback_does_not_swallow_programming_errors(sample_context):
    primary = MockLLMProvider(name="primary", script=[TypeError("Unexpected bug")])
    secondary = MockLLMProvider(name="secondary")

    fallback = FallbackLLMProvider([primary, secondary])

    with pytest.raises(TypeError, match="Unexpected bug"):
        await fallback.generate_step(sample_context)

    assert secondary.call_count == 0


@pytest.mark.asyncio
async def test_all_providers_failed_preserves_attempts(sample_context):
    p1 = MockLLMProvider(name="gemini_mock", script=[LLMRateLimitError("429 Too Many Requests")])
    p2 = MockLLMProvider(name="groq_mock", script=[LLMProviderUnavailableError("503 Service Unavailable")])
    p3 = MockLLMProvider(name="ollama_mock", available=False)

    fallback = FallbackLLMProvider([p1, p2, p3])

    with pytest.raises(AllProvidersFailedError) as exc_info:
        await fallback.generate_step(sample_context)

    err = exc_info.value
    assert len(err.attempts) == 3
    assert err.attempts[0][0] == "gemini_mock"
    assert isinstance(err.attempts[0][1], LLMRateLimitError)
    assert err.attempts[1][0] == "groq_mock"
    assert isinstance(err.attempts[1][1], LLMProviderUnavailableError)
    assert err.attempts[2][0] == "ollama_mock"
    assert "All LLM providers failed" in str(err)
