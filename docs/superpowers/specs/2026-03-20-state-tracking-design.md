# State Tracking for CAITO Management Logic

**Date:** 2026-03-20
**Goal:** Add structured decision state tracking to improve stress-test scoring (50pts management logic block)

## Problem

The assistant answers each message independently, without:
- Explicitly tracking what changed between waves
- Distinguishing emotional pressure from factual changes
- Recalculating metrics when new constraints arrive
- Adjusting argumentation strategy on political shifts

## Architecture

```
Request → extract_message()
  → classify_message()        # rule-based + LLM haiku fallback
  → update_state()            # recalculate metrics from case formulas
  → build_dynamic_prompt()    # SYSTEM_PROMPT + dynamic state block
  → call_claude(messages)     # main model with history + state
  → Response
```

All new code goes into `main.py`. Three new components, integrated into existing `process_chat()`.

## Component 1: DecisionState

Python dataclass holding current decision state per session.

```python
@dataclass
class DecisionState:
    position: str = "scenario_b"
    position_rationale: str = "Оптимальный баланс ROI, payback и операционных рисков"

    # Overrides from stress-test waves
    capex_cut_pct: float = 0.0
    sla_forecast: float = 0.948
    model_error_increase: float = 0.0
    cdto_left: bool = False
    ceo_pressure_count: int = 0

    # Computed metrics (recalculated on override changes)
    budget_mln: float = 340.0
    payback_months: float = 10.0
    roi_24m: float = 3.6
    incremental_revenue_y1_mln: float = 475.0
    operational_losses_mln: float = 813.0

    # Change log
    changelog: list[dict] = field(default_factory=list)
```

Stored in `ConversationStore` alongside message history, keyed by session_id.

## Component 2: MessageClassifier

### Rule-based layer

Regex/keyword detectors for the 5 known stress-test waves:

| Pattern | Role | Event | Extracted |
|---|---|---|---|
| capex + cut/reduce/30% | CFO | capex_cut | percentage |
| SLA + number < 0.95 | COO | sla_degradation | value |
| error recommendations + 40%/increase | ML | model_degradation | percentage |
| leaves company/departs + CDTO/digital | BOARD | cdto_leaves | — |
| market window/losing share/competitors + no new numbers | CEO | emotional_pressure | — |

Returns: `ClassificationResult(role, event_type, has_new_facts, extracted_value)`

### LLM fallback

If no rule matches and message > 50 chars, call haiku with mini-prompt returning JSON classification. Same schema as rule-based output.

## Component 3: StateUpdater

Deterministic recalculation using case formulas:

**capex_cut(pct):**
- budget = 340 * (1 - pct)
- payback = lerp(10, 16, pct / 0.30)
- roi = lerp(3.6, 2.3, pct / 0.30)
- revenue_y1 = lerp(475, 310, pct / 0.30)

**model_degradation():**
- error_rate becomes 0.228 * 1.40 = 0.32
- revenue_y1 drops to ~228 mln (degradation scenario from case data)
- payback = 21

**sla_degradation(value):**
- delta_pp = (0.95 - value) * 100
- additional_losses = delta_pp * 90 mln per pp

**cdto_leaves():**
- Sets flag, no metric change
- Changelog notes political shift, instructs LLM to use CFO-language

**emotional_pressure():**
- Increments counter, no metric change
- Changelog notes: "no facts changed"

**Combined effects** — applied cumulatively. If CAPEX -30% AND model degradation:
- payback recalculated with both penalties
- position auto-shifts if payback > 18 months

**Position auto-change rules:**
- payback > 18 → "reconsider/halt"
- capex_cut >= 30% AND model_degradation → "halt project"
- all metrics nominal + retrain confirmed → "accelerate launch"
- otherwise → stay scenario_b

## Dynamic Prompt Block

Appended to SYSTEM_PROMPT before each LLM call:

```
═══ ТЕКУЩЕЕ СОСТОЯНИЕ РЕШЕНИЯ ═══
Позиция: {position} — {rationale}
Изменённые вводные: {list of active overrides}
Пересчитанные метрики: payback {X} мес, ROI {X}×, потери {X} млрд ₽/год

ИСТОРИЯ ИЗМЕНЕНИЙ:
{numbered changelog entries}

ИНСТРУКЦИЯ:
- Новые факты → "Новая вводная меняет расчёт: ..."
- Давление без фактов → "Метрики не изменились."
- Ссылайся на пересчитанные цифры выше.
- Покажи как новая вводная соотносится с предыдущими.
```

## Integration Point

In `process_chat()`, between `extract_message()` and `call_claude()`:

```python
# After extracting user_message:
classification = classify_message(user_message)
state = get_or_create_state(session_id)
update_state(state, classification)
dynamic_prompt = build_dynamic_prompt(state)
# Pass SYSTEM_PROMPT + dynamic_prompt to LLM
```

## What We Don't Change

- Existing endpoints, error handling, CORS, health checks
- ConversationStore interface (we add state storage alongside it)
- SYSTEM_PROMPT content (we append to it, not modify)
- Input validation and sanitization pipeline
