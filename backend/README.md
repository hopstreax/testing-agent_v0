# Autonomous Website Testing Agent — Backend

This is the backend service for the Autonomous Website Testing Agent built with Solari Cloud Browser and Patchright.

## Project Root

`testing-agent_v0/` is the project root for the autonomous website testing application.

## Architecture Overview

The agent executes an autonomous **Observe → Reason → Act → Verify** loop:
- **Observe**: Extracts semantic UI structure via `page.aria_snapshot(mode="ai", boxes=True)` and captures viewport PNG screenshots.
- **Reason**: Uses a pluggable zero-budget LLM provider (Gemini 2.0 Flash / Groq Llama-3.3 / local Ollama) to decide the next browser action.
- **Act**: Dispatches structured, strictly-typed Pydantic actions through Patchright against the remote Solari browser session.
- **Verify**: Evaluates deterministic Playwright assertions (`expect`) to assert pass/fail authority.
- **Decision Trace**: Emits a structured 4-part trace (`observation_summary` -> `decision` -> `action` -> `result`) without exposing raw internal model chain-of-thought.

## Prerequisites

- Python 3.11+ (verified on Python 3.14.2)
- Solari Cloud API Key (`SOLARI_API_KEY`) from [console.getsolari.com](https://console.getsolari.com)

## Environment Configuration

Copy `.env.example` to `.env` and provide your Solari API key:

```bash
cp .env.example .env
```

```env
SOLARI_API_KEY=slr_live_your_actual_key_here
```

## Milestone 0 Setup Verification

Verify that all required core dependencies are installed and accessible:

```bash
python -c "import solari_browser, patchright, pydantic, pydantic_settings, pytest_asyncio; print('Dependencies OK')"
```
