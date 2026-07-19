## Why

The deepen interview (`server.py`'s `/twin/{twin_id}/deepen/message`, `_DEEPEN_SYSTEM_TEMPLATE`, `_ALL_DEEPEN_TOPICS`) asks exactly three fixed questions — hard decisions, non-negotiables, mind-change — once, for every twin regardless of type, and then refuses to run again: confirmed in code, once `_ALL_DEEPEN_TOPICS` is a subset of `topics_covered`, the endpoint short-circuits with "You've already deepened {twin} across all three areas." A founder, a violinist, and a customer-support lead get the identical interview, and there is no way to keep improving a twin once those three boxes are checked — which is exactly the ceiling this proposal exists to remove, using the gap ledger (a prior, separate change) as the source of what to ask next. Separately, `_deepen_and_save` re-synthesizes the *entire* `personality_model` from scratch on every completion with no version history — a degraded regeneration silently overwrites the previous (possibly better) model with no rollback.

## What Changes

- The deepen interview is no longer capped at three fixed topics. Question selection draws from (in priority order): the twin's `knowledge_gaps` ledger (top unresolved gaps), the thinnest/least-populated `personality_model` fields, and a persona-type-aware fallback question bank for twins with no gap history yet (cold start — e.g. a brand-new twin with zero chat turns).
- **BREAKING**: `_ALL_DEEPEN_TOPICS` as a fixed, exhaustive list is removed. `topics_covered`/`done` semantics change from "all three fixed topics answered, permanently finished" to "this session's selected topics are answered, session over" — a twin is always eligible for a new deepen session later, there is no terminal "fully deepened" state.
- `_deepen_and_save` moves from full-model re-synthesis to **targeted, additive field patches** driven by the specific topic just answered, plus a `personality_model_versions` history so any single update can be rolled back.
- The 40-entry `sources` cap (`merge_sources`) is amended so that foundational source types (from initial twin creation) are protected from eviction, since continuous deepening now means the source list grows indefinitely rather than stopping after one interview.
- A twin owner (or, per the original request, "Eve") can trigger a new deepen session at any time; the system surfaces which topics it would ask about (from the gap ledger) before starting.

## Capabilities

### New Capabilities
- `generative-deepen-topics`: Gap-driven, non-terminating topic selection for deepen sessions, replacing the fixed three-topic list.
- `personality-model-versioning`: Additive, targeted personality-model updates with retained version history and rollback.

### Modified Capabilities
(none — no existing spec covers `/twin/{twin_id}/deepen/message`'s current fixed-topic behavior; this proposal establishes the first spec for it)

## Impact

- Affected code: `server.py` (`_DEEPEN_SYSTEM_TEMPLATE`, `_ALL_DEEPEN_TOPICS`, `DeepenRequest`/`DeepenResponse`, `deepen_message` handler, `_deepen_and_save`), `source_memory.py` (`merge_sources` cap/eviction logic).
- Depends on the knowledge-gap ledger existing (a prior change, `add-persona-gap-ledger`) as its primary topic source; without it, this change still works via the thin-field and cold-start fallback paths alone, at reduced quality.
- Frontend impact: the deepen UI's "you're done, here's your completion screen" flow needs to change to "here's what we could still deepen" — a re-entrant, ongoing surface rather than a one-time wizard. Frontend changes are noted but not specified in detail here (backend-first scope).
- Data impact: new `personality_model_versions` field on twin records (additive); `sources` cap logic changes (backward compatible — existing twins' sources are unaffected until they cross the cap again).
