## Why

Every chat turn already produces the exact signal a smart deepening process would need — the critic (`agents/critic_agent.py`'s `review_grounded_answer`, via `build_grounding_summary` in `source_memory.py`) labels each answer's `confidence_label` and `grounding_mode`, and flags when zero sources were retrieved — but none of it is persisted. Confirmed in `server.py`: `orchestration["grounding"]` is only ever serialized into the `/chat` HTTP response (`ChatResponse.grounding`, gated behind `can_view_source_details`) so the *asking user* can see it; it's discarded after the response is sent. The twin owner never learns "people keep asking about X and the twin has nothing for it." This is the data-collection prerequisite for item 4 (a generative, gap-driven deepen interview) and for a periodic owner-facing report — right now there's no ledger for either to read from.

## What Changes

- After each chat turn, low-confidence/ungrounded answers (`grounding_mode` in `{"uncertain"}` or `confidence_label == "low"`, or zero retrieved sources) are recorded as a `knowledge_gap` entry against the twin, keyed by a normalized topic derived from the user's question.
- Repeated gaps on the same topic increment a `count` rather than duplicating entries — the ledger tracks *frequency*, not a raw event log.
- Corrections (`AddCorrectionRequest`, already an explicit "twin got this wrong" signal) also feed the ledger, at higher weight than an inferred low-confidence answer, since they're an explicit owner judgment rather than an inference.
- A new field `knowledge_gaps: List[dict]` is added to the twin JSON record, capped in size the same way `sources` already is (`merge_sources` caps at 40) to bound storage growth.
- No new user-facing behavior yet — this change only builds and populates the ledger. Consuming it (a generative interview, an owner-facing report) is explicitly out of scope, covered by items 4 and a future reporting change.

## Capabilities

### New Capabilities
- `persona-knowledge-gaps`: The data model, capture triggers, and lifecycle (dedup/decay/cap) for a twin's knowledge-gap ledger.

### Modified Capabilities
(none — this only adds a new field and a new post-chat side effect; it does not change any existing requirement's behavior)

## Impact

- Affected code: `backend/server.py`'s `/chat` handler (new post-orchestration step, alongside the existing `save_conversation` call), a new `record_knowledge_gap`-style helper (likely in `source_memory.py`, alongside the existing source/grounding helpers it's a natural extension of), the `AddCorrectionRequest` handler (`server.py:1696` area).
- Data impact: new `knowledge_gaps` field on twin JSON records; no migration needed since it's additive and defensively read with `.get()`.
- Performance: this is in-band with the existing per-request `save_conversation`/`_save_twin` write path — no new network calls, just an additional field computed from data already in memory (`orchestration["grounding"]`).
