## Context

Confirmed via code inspection:
- `_ALL_DEEPEN_TOPICS = ["PAST_DECISIONS", "NON_NEGOTIABLES", "MIND_CHANGE"]` is a hardcoded, exhaustive list. `deepen_message` auto-marks topics as covered if the corresponding `_context` field is already non-empty, computes `remaining = [t for t in _ALL_DEEPEN_TOPICS if t not in covered]`, and returns an immediate "already deepened" response with no LLM call at all when `remaining` is empty. This is the terminal state to remove.
- `_DEEPEN_SYSTEM_TEMPLATE` hardcodes the three topics and their exact question phrasing directly in the prompt string — topic selection and question-asking are currently the same static text, not driven by any data.
- `_deepen_and_save` sends the *entire* existing `personality_model` JSON back to Bedrock inside the synthesis prompt and asks for "an improved JSON model" with the same structure — a full-document rewrite. On failure it falls back to keeping the old model with only `_context` merged in (the `except Exception` branch), but on *success* there is no snapshot of the pre-update model — nothing to roll back to if the regenerated version is worse (e.g. drops a previously-good `decision_framework` nuance).
- `merge_sources` sorts all sources by `created_at` descending and truncates to 40 (`merged[:40]`), with no distinction by `source_type` — a twin's original `resume_profile`/`values_profile` sources (created once, at account creation) will eventually be pushed out by newer `deepen_interview` sources if deepening runs indefinitely, which this change explicitly enables.
- (Depends on, but does not require) the knowledge-gap ledger from `add-persona-gap-ledger`: `knowledge_gaps` entries with topic tags and counts, if that change has landed.

## Goals / Non-Goals

**Goals:**
- Deepen sessions are re-entrant and never permanently "complete" — there is always a next best question available (gap-driven, then thin-field-driven, then a persona-type fallback bank).
- Each deepen answer produces a small, targeted patch to the specific model fields it addresses, not a full-document regeneration.
- Every update to a twin's `personality_model` is retained in a version history, with the ability to view/rollback to a previous version.
- The source cap no longer silently evicts foundational, once-only sources as continuous deepening accumulates more `deepen_interview` sources over time.

**Non-Goals:**
- Not building the frontend re-entrant UI in this change — backend contract only (see Impact in proposal.md).
- Not building a UI for browsing/restoring specific historical versions — this change persists the history and exposes a rollback-to-previous-version primitive; a richer version browser is a future change.
- Not replacing the existing evergreen three questions — they remain in the fallback question bank for twins with no gap/thin-field signal yet (cold start), they're just no longer the *only* questions and no longer terminal.

## Decisions

**Topic selection priority: gaps → thin fields → persona-type fallback bank.** A brand-new twin (or one migrated per `migrate-default-twin-to-record` with no chat history yet) has an empty `knowledge_gaps` ledger — the existing three evergreen questions (hard decisions, non-negotiables, mind-change) become the fallback bank's first entries, preserving today's proven cold-start behavior exactly. Once a twin has chat history, the gap ledger's highest-count entries take priority — this is "what people are actually asking that the twin can't answer," which is a stronger signal than a generic questionnaire.

**"Thin field" is any `personality_model` list/text field that's empty or below a length/count threshold** (e.g. `pivotal_decisions` absent, `characteristic_quotes` fewer than 2 entries) — reuses the render work from `render-dormant-persona-fields` as the definition of "what fields matter enough to be worth filling in."

**Session ends, twin doesn't.** `done: true` still ends the *current* interview session's conversational flow (same UX moment — "thanks, that's plenty for now") but no longer writes a permanent "fully deepened" marker. The next call to `deepen_message` with fresh/empty `history` simply recomputes topic selection against current ledger/field state — if the twin has accumulated new gaps since the last session, those surface; if nothing new exists, the fallback bank's untouched entries surface; only if genuinely nothing is left does the endpoint say so (rare, and not permanent — new chat activity can always produce new gaps).

**Targeted, additive patches instead of full-model regeneration.** Each deepen answer already maps to specific `_context` fields today (`pastDecisions`, `nonNegotiables`, `softPreferences`, `mindChange`) via `DeepenFieldUpdates`. Extend this: when the topic came from the gap ledger or a thin-field target, the synthesis call asks Bedrock to return *only* the fields relevant to that topic (e.g. "update `decision_heuristics` and `blind_spots` given this new answer about X" — mirroring how `_deepen_and_save`'s docstring already says new data "should sharpen: decision_heuristics, blind_spots, what_they_avoid..." but currently achieves this by regenerating everything). The patch is merged into the existing model field-by-field, not replacing the whole object.

**Version history via a bounded list, not a full audit log.** `personality_model_versions: List[dict]` stores `{version, model_snapshot, created_at, trigger}` for each update, capped (same convention as `sources`/`knowledge_gaps` — bounded, evict oldest first, but always retain the very first ("origin") version so there's always a known-good floor to roll back to, not just "the last N").

**Source cap becomes type-aware, not just recency-aware.** `merge_sources` reserves floor space for `resume_profile`/`values_profile`/`experience_notes`/`skills_inventory`/`achievement_notes` source types (the one-time creation-time sources) — these are excluded from the 40-cap's eviction pool, or given their own small reserved sub-quota — while `deepen_interview` and `manual_correction` sources compete for the remainder by recency, same as today. This directly closes the eviction risk that continuous deepening (this change's entire premise) would otherwise make worse over time.

## Risks / Trade-offs

- **[Risk]** Targeted patches could drift the model into internal inconsistency over many sessions (e.g. `decision_framework` no longer matches newly-patched `decision_heuristics`). → **Mitigation**: periodically (e.g. every N accepted patches) still run a full re-synthesis pass as a "consolidation" step — reusing today's full-regeneration path, but now with a version snapshot taken first so it's the same risk as today, not a new one, and it's infrequent rather than every single answer.
- **[Risk]** Version history storage grows twin JSON size over time. → **Mitigation**: cap and store snapshots as diffs where practical, or cap at a modest count (e.g. 10) plus always keeping the origin version — full design of the storage format is an implementation task, not a spec requirement here.
- **[Risk]** Removing the terminal "fully deepened" state changes user expectations set by the current UI (a completion screen implying "done"). → **Mitigation**: explicitly out of scope for backend spec, but flagged in proposal.md's Impact section as required frontend follow-up.
- **[Risk]** Gap-driven questions could feel repetitive if the same handful of gap topics dominate every session. → **Mitigation**: once a topic is asked about in a session, its gap-ledger count should reset/decay (a small addition to `add-persona-gap-ledger`'s consumer contract) so answered gaps stop dominating future topic selection.

## Migration Plan

Existing twins with `_context.pastDecisions`/`nonNegotiables`/`mindChange` already populated (i.e., already "fully deepened" under the old terminal model) are unaffected in data — those fields remain valid inputs to the new priority scheme (they simply count as non-thin fields, no longer as a permanent stop condition). No backfill required; `personality_model_versions` starts empty (or seeded with a single "origin" snapshot of the current model) on first write under this change.

Rollback: revert the code change; twins that already went through a session under the new logic keep whatever `personality_model_versions`/gap-driven updates they received (additive, non-destructive), so rollback only affects *future* interview behavior, not existing data.

## Open Questions

- Should the "consolidation" full-resynthesis pass (mitigating patch drift) run on a fixed cadence (every N patches) or be manually triggerable by the owner? Recommend fixed cadence for v1 to avoid another UI surface; revisit if drift proves to need manual control.
