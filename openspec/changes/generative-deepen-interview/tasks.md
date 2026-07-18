## 1. Topic selection engine

- [x] 1.1 Build a topic-selection function that reads `knowledge_gaps` (from `add-persona-gap-ledger`), sorted by count descending, as the first-priority source — `_select_deepen_topics()`; reads `knowledge_gaps` defensively via `.get()` so this works whether or not `add-persona-gap-ledger` has merged yet, activating automatically once it has
- [x] 1.2 Define "thin field" thresholds per `personality_model` field (empty list, list below N entries, empty/short text) and build the second-priority selector — `_is_field_thin()` + `_THIN_FIELD_DEEPEN_TOPICS` (covers `pivotal_decisions`, `characteristic_quotes` — the two fields `render-dormant-persona-fields` added rendering for but that `/create-twin`'s synthesis prompt doesn't currently populate)
- [x] 1.3 Build the fallback question bank, seeded with the three original evergreen topics (hard decisions, non-negotiables, mind-change) plus any persona-type-aware additions — `_EVERGREEN_DEEPEN_TOPICS`; persona-type-aware additions beyond the three evergreen topics left as a follow-up (design.md's wording was optional, not mandatory for this change)
- [x] 1.4 Replace `_ALL_DEEPEN_TOPICS`'s exhaustive-list semantics with the new priority-chain selector; remove the "already deepened across all three areas" terminal short-circuit — done; the new "nothing selectable right now" response is honest and non-terminal (no permanent state written)
- [x] 1.5 Implement gap-topic decay/reset when a session directly addresses that topic — `_decay_addressed_gaps()`, called from `_deepen_and_save`

## 2. Targeted patch synthesis

- [x] 2.1 Rewrite `_deepen_and_save`'s synthesis prompt to request field-scoped updates (only fields relevant to the answered topic) instead of full-model regeneration — `_patch_personality_model()`, using `_target_fields_for_topics()` to resolve which fields a session's addressed topics should touch
- [x] 2.2 Implement field-by-field merge of the returned patch into the existing model, rather than replacing the whole `personality_model` object — done in `_patch_personality_model()`: only keys present in `target_fields` are overwritten
- [x] 2.3 Add the periodic full-resynthesis "consolidation" pass (every N accepted patches), reusing the existing full-regeneration path but snapshotting first (see task 3.1) — `_consolidate_personality_model()` (the original always-on prompt, now run every `_CONSOLIDATION_EVERY_N_PATCHES=5` patches), gated by a new `deepen_patch_count` counter on the twin record

## 3. Version history

- [x] 3.1 Add `personality_model_versions` to the twin data model; snapshot before/on each update with `{version, model_snapshot, created_at, trigger}` — `_append_model_version()`, called from `_deepen_and_save` before every patch/consolidation (this also seeds version 1, the origin, on a twin's very first deepen update)
- [x] 3.2 Implement cap/eviction that always retains the origin version — capped at `_MODEL_VERSIONS_CAP=10`, origin (version 1) explicitly excluded from eviction
- [x] 3.3 Add a rollback operation (endpoint or internal function) that restores a prior version and records the rollback itself as a new version entry — `restore_personality_model_version()` + `PATCH /twin/{twin_id}/personality/rollback` (owner-gated)

## 4. Source cap fix

- [x] 4.1 Update `merge_sources` to exclude creation-time source types (`resume_profile`, `experience_notes`, `skills_inventory`, `achievement_notes`, `values_profile`) from the eviction pool — `_PROTECTED_SOURCE_TYPES`
- [x] 4.2 Handle the edge case where foundational sources alone approach the cap (reduce effective cap for non-foundational sources rather than evict foundational ones) — `remaining_budget = max(0, _SOURCES_CAP - len(protected))`

## 5. Verification

- [x] 5.1 Test: twin with populated gap ledger gets gap-driven questions first — confirmed: highest-count gap (`GAP:product`, count 5) selected before a lower-count gap and before evergreen topics
- [x] 5.2 Test: brand-new twin with no history gets the original evergreen questions (regression test for cold start) — confirmed: empty gap ledger + non-thin fields → exactly `{PAST_DECISIONS, NON_NEGOTIABLES, MIND_CHANGE}`
- [x] 5.3 Test: completing a deepen session does not block a future session from finding new topics once new gaps appear — confirmed: twin with all 3 evergreen topics already covered + one new gap entry → `_select_deepen_topics` returns `[GAP:ai]`, not empty/terminal
- [x] 5.4 Test: targeted patch updates leave unrelated model fields unchanged — confirmed via one live Bedrock call: `PAST_DECISIONS`'s 4 target fields (`decision_heuristics`, `blind_spots`, `decision_framework`, `pivotal_decisions`) changed or were absent as expected; all 5 untargeted fields (`core_values`, `risk_profile`, `what_they_optimize_for`, `communication_traits`, `personality_summary`) were byte-for-byte unchanged
- [x] 5.5 Test: version history caps correctly and always retains the origin version; rollback restores a prior version correctly — confirmed: 15 updates against a cap of 10 leaves exactly `[1, 7, 8, ..., 15]` (origin + 9 most recent); rollback to a surviving version restores the exact snapshot and appends 2 new entries (`pre-rollback` + `rollback_to_vN`); rollback to a nonexistent version returns `False` without mutating anything
- [x] 5.6 Test: source cap eviction never removes foundational source types even after many deepen sessions — confirmed: after simulating 60 `deepen_interview` sources accumulating past the 40-item cap, all 5 foundational sources survive; 35 of the 60 `deepen_interview` sources survive (the recency-based remainder of the budget)
