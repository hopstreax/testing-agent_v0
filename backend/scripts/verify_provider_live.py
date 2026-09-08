"""Manual verification script for real LLM providers in isolation.

Usage:
    python backend/scripts/verify_provider_live.py --provider gemini
    python backend/scripts/verify_provider_live.py --provider groq
    python backend/scripts/verify_provider_live.py --provider ollama
"""

import argparse
import asyncio
import sys
from pathlib import Path

# Add backend directory to sys.path so app imports succeed
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv

from app.llm.context import StepPromptContext
from app.llm.gemini import GeminiLLMProvider
from app.llm.groq import GroqLLMProvider
from app.llm.ollama import OllamaLLMProvider
from app.models.actions import ObservationPayload


async def run_smoke_test(provider_type: str) -> int:
    env_path = backend_dir / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
    else:
        load_dotenv()

    print(f"=== Testing Real LLM Provider: {provider_type} ===")

    if provider_type == "gemini":
        provider = GeminiLLMProvider()
    elif provider_type == "groq":
        provider = GroqLLMProvider()
    elif provider_type == "ollama":
        provider = OllamaLLMProvider()
    else:
        print(f"ERROR: Unknown provider '{provider_type}'")
        return 1

    # Check availability
    print(f"Checking {provider_type} availability...")
    is_avail = await provider.is_available()
    if not is_avail:
        print(f"FAIL: Provider '{provider_type}' reports NOT available.")
        if provider_type in ("gemini", "groq"):
            print(f"Ensure {provider_type.upper()}_API_KEY is configured in .env.")
        elif provider_type == "ollama":
            print(f"Ensure local Ollama daemon is running at {getattr(provider, 'host', 'localhost')}.")
        return 1

    print(f"Provider '{provider_type}' is available. Constructing synthetic StepPromptContext...")

    aria_text = (
        "- heading 'Welcome to Example' [level=1]\n"
        "- button 'Get Started'\n"
        "- link 'Learn More'"
    )

    context = StepPromptContext(
        goal="Verify that the user can click the 'Get Started' button on the landing page.",
        current_observation=ObservationPayload(
            url="https://example.com",
            title="Example Landing Page",
            aria_snapshot=aria_text,
        ),
        test_variables={"user_email": "test@example.com"},
    )

    print("Calling generate_step(context)...")
    try:
        decision = await provider.generate_step(context, timeout_s=30.0)
    except Exception as exc:
        print(f"FAIL: generate_step raised {type(exc).__name__}: {exc}")
        return 1

    print("\n--- Decision Generated Successfully ---")
    print(f"Observation Summary: {decision.observation_summary}")
    print(f"Decision Rationale : {decision.decision}")
    print(f"Chosen Action Type : {decision.action.action_type}")
    print(f"Action Details     : {decision.action.model_dump()}")
    print("---------------------------------------\n")
    print(f"SUCCESS: {provider_type} generated a valid StepDecision.")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Live smoke-test for real LLM providers")
    parser.add_argument(
        "--provider",
        choices=["gemini", "groq", "ollama"],
        required=True,
        help="LLM provider to test",
    )
    args = parser.parse_args()
    code = asyncio.run(run_smoke_test(args.provider))
    sys.exit(code)


if __name__ == "__main__":
    main()
