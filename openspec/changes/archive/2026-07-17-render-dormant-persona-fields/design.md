## Context

`backend/context.py` builds the chat system prompt from a twin's `personality_model`. Two code paths feed it:
- `_build_decision_section(personality_model, display_name)` — renders the "how they think & decide" section for any twin that has a `personality_model` (user-created twins and public personas).
- `_build_from_personality_model(personality_model, title)` — renders the raw `_context` fields (bio, skills, experience, communication style) for user-created twins specifically.

Public persona JSON files (`backend/public_personas/*.json`) already contain `communication_traits`, `pivotal_decisions`, `characteristic_quotes`, and `mind_change` (the latter also written into `_context.mindChange` by the deepen flow via `_deepen_and_save` in `server.py`). None of these four fields are read by either function today — verified by grep against `context.py`. They are inert weight in the twin JSON.

`writingSamples` is captured in `CreateTwinRequest` and stashed into `personality_model["_context"]["verbalQuirks"]`'s sibling context dict, but `source_memory.build_initial_sources` has no mapping entry for it, so it never becomes a `source_item` and is therefore invisible to `retrieve_relevant_sources`.

## Goals / Non-Goals

**Goals:**
- Every field already present on a `personality_model` gets rendered into the system prompt, framed appropriately for its type.
- `writingSamples` becomes a retrievable source like every other creation-time field.
- Zero behavior change for twins that lack these fields (most existing user-created twins, since the creation-time synthesis prompt doesn't currently ask for quotes/pivotal decisions — those are only present in public personas and twins that have been through deepen).

**Non-Goals:**
- Not changing the `create_twin` synthesis prompt to *generate* `pivotal_decisions` or `characteristic_quotes` for new twins — that's a separate, larger change (letting the LLM invent "pivotal decisions" from a short bio risks fabrication; for now this only renders fields when a human or public-persona author actually supplied them).
- Not touching the deepen re-synthesis prompt.
- Not changing `_PERSONALITY_MODEL_KEYS` (the required-key validation set in `server.py`) — these remain optional fields, rendered only when present.

## Decisions

**Frame quotes as voice examples, not facts.** `characteristic_quotes` risk being read by the LLM as things to recite on-demand ("quote something Gandhi said") rather than as calibration for tone. The rendered section is headed "How {short_name} actually talks (representative quotes)" with an explicit instruction: use these to calibrate voice, don't just repeat them back — mirroring the existing pattern already used for corrections (`_build_corrections_section` treats quoted blocks as reference data, not directives).

**Frame pivotal_decisions as worked examples for the existing decision-answering flow.** They're appended to `_build_decision_section` (which already has a "how to answer decision questions" section) rather than creating a new top-level section, so the model naturally reaches for them when reasoning about "what would you do" questions.

**communication_traits renders alongside the existing communicationStyle field**, not replacing it — `communication_traits` is the synthesized/analytical version (e.g. "Plain, direct language — no oratorical flourishes"), `communicationStyle` is the raw user-submitted text. Both are short and complementary; no need to pick one.

**mind_change renders once, preferring the top-level `personality_model["mind_change"]` over `_context["mindChange"]` when both exist** (the top-level field is post-synthesis and more concise; the `_context` one is the raw deepen answer). Falls back to whichever is present.

**writingSamples becomes a `source_item` via the existing `make_source_item` helper**, following the exact pattern already used for `skills`/`achievements` in `build_initial_sources` — no new plumbing, just one more entry in the `mappings` list.

## Risks / Trade-offs

- **[Risk]** Longer system prompts increase token cost per chat turn for twins with these fields populated. → **Mitigation**: these fields are short by construction (quotes: a handful of one-liners; pivotal_decisions: 2-3 entries per the deepen/persona schema) — bounded, not unbounded like corrections, which already has an explicit character budget. No budget cap added here since worst-case size is small and known.
- **[Risk]** For public personas, injecting `characteristic_quotes` verbatim could make the model over-index on quoting rather than reasoning. → **Mitigation**: explicit "voice calibration, not verbatim recitation" framing in the rendered section, consistent with existing Critical Rule 1 ("never invent facts") and Rule 6 (no markdown) already in the prompt.

## Migration Plan

No data migration needed — this only changes what `context.py` reads from existing JSON structures, all fields are read with `.get()` / falsy-checked before rendering (matching the existing pattern for every other optional field in `_build_decision_section`). Deploys like any other backend change; no schema version bump required.

Rollback: revert the `context.py` / `source_memory.py` diff; no persisted state to unwind.

## Open Questions

- Should a future change extend the `create_twin` synthesis prompt to actively produce `pivotal_decisions`/`characteristic_quotes` for newly created twins (not just public personas/deepened twins)? Left as a follow-up — flagged as out of scope above.
