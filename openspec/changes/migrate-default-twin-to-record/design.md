## Context

Confirmed via code inspection:
- `backend/resources.py` reads `backend/data/*` (`bio.md`, `facts.json`, `skills.json`, `summary.txt`, `style.txt`, `linkedin.pdf`, plus any other `.md`/`.json` dropped in that directory) at **module import time** — i.e. once per Lambda cold start, not per-request.
- `backend/context.py`'s `prompt()` branches on whether a `personality_model` argument was passed: with one, it calls `_build_from_personality_model` + `_build_decision_section` (the path every user twin and public persona uses); without one, it calls `_build_from_data_files`, which reads the module-level globals populated by `resources.py`.
- `backend/server.py`'s `/chat` handler sets `twin_data = None` whenever `request.twin_id` is falsy (`server.py:1035-1036`), and every downstream feature — source retrieval, corrections, archetype-based personality review (`server.py:1145`, guarded by `if request.twin_id and twin_data`) — is conditioned on `twin_data` being truthy. So the default twin structurally cannot participate in retrieval, corrections, or (currently) deepening, which is itself gated behind `/twin/{twin_id}/deepen/message` and requires `load_twin(twin_id)` to succeed.
- The frontend's unauthenticated homepage chat (`frontend/components/twin.tsx`) posts `{ message, session_id }` with no `twin_id` — it's the sole caller of the `twin_data is None` path in production.

## Goals / Non-Goals

**Goals:**
- Sidd's twin gets a real `twin_id` and a twin JSON record with a `personality_model`, exactly like a user-created twin.
- Sidd's twin becomes eligible for deepen, corrections, sources, and (once built) the gap-ledger/generative-interview work from items 3-4 — with no special-casing in `server.py` beyond what already exists for any twin.
- The migration is a one-time, reviewable, re-runnable script — not a runtime code path — so it can be inspected before the resulting JSON is committed/uploaded.

**Non-Goals:**
- Not changing the synthesis prompt or `personality_model` schema itself — reuses exactly what `create_twin` already produces.
- Not building a general "any static-file persona can migrate" framework — this targets the one default twin.
- Not deciding here whether `backend/data/*` files are deleted after migration — recommend keeping them as the human-editable source of truth that the (re-runnable) migration script re-synthesizes from, rather than hand-editing the resulting JSON directly. That's a repo-convention decision, not a spec requirement.

## Decisions

**Reuse `create_twin`'s synthesis prompt via a script, not a new prompt.** The existing synthesis prompt (in `server.py`'s `create_twin`) is already tuned and validated (`_PERSONALITY_MODEL_KEYS` check). A migration script maps `backend/data/*` fields onto the same `CreateTwinRequest`-shaped input (bio ← `bio.md`, skills ← `skills.json`, experience ← `work_experience.md`, etc.) and calls the same Bedrock synthesis path, so the resulting model is structurally identical to any user twin's — no divergent prompt to maintain.

**Stable, well-known `twin_id`, not a random UUID.** Unlike user-created twins (`uuid.uuid4().hex`), Sidd's twin needs a fixed ID so the frontend can hardcode it (mirroring how public personas use "stable hard-coded IDs defined in `backend/public_personas/*.json`" per CLAUDE.md). Store it as a flat key `twins/{twin_id}.json` (no `user_id` prefix), matching the public-persona storage convention, since this twin — like public personas — has no owning end-user account distinct from Sidd's own operator identity.

**Frontend switches from omitting `twin_id` to sending the fixed ID.** `frontend/components/twin.tsx`'s request body gains `twin_id: DEFAULT_TWIN_ID` (an env-configured or hardcoded constant). This is the actual cutover moment — before this ships, the migration's record must already exist and be loadable via `load_twin`.

**Retire `resources.py`'s live loading only after cutover is verified**, not in the same deploy. Two-step rollout (see Migration Plan) so there's a window to fall back to the old code path if the new twin record has an issue.

**`_build_from_data_files` / default-twin code path in `context.py` and `server.py` is deleted only in a follow-up cleanup change**, not this one — this change's scope is "make the migration possible and cut the frontend over," not "delete the old path the same day." Keeping it one extra release behind a dead code path is a deliberate rollback safety margin given this is the twin advertised publicly right now.

## Risks / Trade-offs

- **[Risk]** Synthesis quality regression — the LLM-synthesized `personality_model` might capture Sidd's voice/decision-making less faithfully than the hand-written `communication.txt`/`style.txt` files did verbatim. → **Mitigation**: `_build_from_personality_model` already renders raw `_context` fields (bio, skills, experience, communicationStyle) verbatim alongside the synthesized decision section — none of the original raw text is lost, only supplemented. Manually review the synthesized output against current behavior before cutover (see Verification tasks).
- **[Risk]** Cutover breaks the live, publicly-advertised contact channel if the new twin record has a bug (missing field, bad archetype_id, etc.). → **Mitigation**: two-step rollout with the old code path staying intact for one release; test the new `twin_id` end-to-end (chat, connect-notify flow) in a non-default capacity (e.g. via explicit `twin_id` query param) before flipping the frontend's default.
- **[Risk]** `backend/data/*` files drift out of sync with the twin record if someone edits the `.txt`/`.md` files expecting live effect (old habit). → **Mitigation**: this proposal's **BREAKING** change explicitly documents that `resources.py` stops reading these files live; update `CLAUDE.md`'s Key Files section to reflect the new source of truth once this ships.

## Migration Plan

1. Write and run the one-time migration script (reads `backend/data/*`, calls the synthesis path, writes the resulting twin JSON with a fixed `twin_id`).
2. Manually review the synthesized `personality_model` against the current default-twin chat behavior (side-by-side prompts, spot-check answers).
3. Deploy backend with the new twin record in place (S3 or local `twins/`), but do NOT yet change the frontend — the old `twin_data is None` path keeps serving production traffic.
4. Smoke-test the new twin record by chatting with it via an explicit `twin_id` (bypassing the default path) to confirm parity.
5. Cut the frontend over to send the fixed `twin_id` by default.
6. Monitor for one release cycle; if stable, file the follow-up cleanup change to delete `_build_from_data_files` and retire `resources.py`'s live file loading.

Rollback: revert the frontend change (step 5) to stop sending `twin_id` — the old `twin_data is None` path and `resources.py` remain untouched until step 6, so rollback is a frontend-only revert with no backend changes to undo.

## Open Questions

- Should the migration script be committed to the repo (e.g. `backend/scripts/migrate_default_twin.py`) as a re-runnable tool for future re-synthesis, or run once and discarded? Recommend committing it — re-running it after future `backend/data/*` edits is the intended workflow for keeping Sidd's twin current, per the Non-Goals note above.
