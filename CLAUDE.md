# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CAITO Assistant — AI-ассистент стратегических решений в роли Chief AI & Technology Officer компании BigTechGroup. Хакатон AI South Hub 2026.

- **Repo:** snowbase2026-ai-south-hack/team01
- **License:** MIT
- **Primary branch:** main

## Architecture

Monolith FastAPI app (`main.py`) with React frontend. PostgreSQL for session persistence.

**Request flow:**
1. HTTP POST → one of 5 chat endpoints → `process_chat()`
2. Input sanitization (XSS, length, null-bytes) + rate limiting (30 req/60s)
3. `classify_security_threat()` — 5 threat types → canned response (no LLM call)
4. `_is_question()` — questions bypass LLM classifier → `information_request`
5. `classify_message_rules()` — rule-based stress-wave detection (5 waves)
6. `classify_message_llm()` — LLM fallback for unrecognized messages
7. `update_state()` + `_recalculate()` — deterministic metric recalculation
8. `build_dynamic_prompt()` — per-wave response instructions
9. `retrieve_context()` — keyword-based RAG from `data/*.md`
10. LLM call via `runtime_settings` (OpenRouter or Cloud.ru, switchable)
11. `build_structured_block()` — programmatic position/metrics block (exact numbers)

**Key components in `main.py`:**
- `SYSTEM_PROMPT` (~310 lines) — case data, role rules, scenarios, stakeholder map
- `RuntimeSettings` — multi-provider model selection, persisted to PostgreSQL
- `DecisionState` — position tracking with auto-pivot on threshold breach
- `classify_security_threat()` — 5 categories: injection, prompt_extraction, role_takeover, unfounded_assertion, data_probing
- `ConversationStore` — PostgreSQL-backed with in-memory cache
- Global exception handler catches all errors → returns 400 (never 500)

## Commands

```bash
# Run locally
python main.py                          # starts on PORT (default 8000)

# Docker
docker compose up --build -d            # app + postgres + traefik

# Run tests (requires running server)
python test_api.py http://localhost:8000

# Dependencies
pip install -r requirements.txt
```

## Environment Variables

- `OPENROUTER_API_KEY_PROD` — required, OpenRouter prod key
- `OPENROUTER_API_KEY_TEST` — OpenRouter test key
- `OPENROUTER_MODEL` — default model (`anthropic/claude-sonnet-4`)
- `CLOUDRU_API_KEY` — Cloud.ru API key
- `CLOUDRU_BASE_URL` — Cloud.ru endpoint
- `DATABASE_URL` — PostgreSQL connection string (set in docker-compose)
- `PORT` — server port (default: `8000`)

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/chat` | Main chat (recommended) |
| POST | `/api/v1/chat`, `/chat`, `/api/message`, `/api/query` | Alternative paths |
| POST | `/api/reset` | Reset session |
| GET/POST | `/api/settings` | Get/set provider + model + env |
| GET | `/api/models` | List all available models |
| GET | `/api/sessions` | List sessions |
| GET | `/api/sessions/{id}/history` | Session history |
| GET | `/health` | Health check |
| GET | `/docs` | Swagger UI |

**Error handling (critical for scoring):** Empty body → 400, invalid JSON → 400, missing message → 400, unknown path → 404. **Never 500.**

## Security (two-layer)

1. **Pattern-based** (`classify_security_threat`) — canned responses, no LLM, deterministic
2. **LLM-based** — system prompt security rules handle creative/subtle attacks

## Multi-Provider LLM

`RuntimeSettings` supports OpenRouter (27 models) and Cloud.ru (22 models). Settings persisted to PostgreSQL via `settings` table. Switchable at runtime via `/api/settings`.

## Case Data

All in `data/` as markdown: `financial_profile.md`, `financial_operations.md`, `ml_model.md`, `communications.md`, `strategy_presentation.md`, `briefing.md`. RAG module splits by headers, keyword-matches top-3 chunks.

## Scoring

**AutoScore (70%):** management logic (50pts), functionality (20pts), security (10pts), stability+UX (15pts), cost (5pts).

**Pitch (30%):** product usefulness, system quality, architecture, pitch quality.

**Stress test:** 5 waves — (1) CEO+CDTO emotional, (2) CFO CAPEX -30%, (3) COO SLA 92%, (4) ML +40% errors, (5) CDTO leaves.

## Infrastructure

- **Docker:** Python 3.11-slim, 1 uvicorn worker (in-memory state consistency)
- **DB:** PostgreSQL 16 (sessions, decision states, settings)
- **Networking:** traefik external network
- **VM:** Ubuntu 22.04, 4 vCPU, 8 GB RAM, 65 GB SSD
