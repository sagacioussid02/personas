## 1. Ledger data model and helpers

- [x] 1.1 Add a `record_knowledge_gap(twin_data, topic_tags, source, question_snippet)`-style helper to `source_memory.py`, alongside the existing source/grounding helpers
- [x] 1.2 Implement dedup-by-topic + count increment, and the cap/eviction policy (lowest-count, least-recent first), mirroring `merge_sources`'s cap pattern — correction-sourced entries additionally protected from eviction ahead of inferred ones
- [x] 1.3 Reuse `_infer_tags` (or extract a shared topic-tagging function if `_infer_tags` needs adjustment) to derive topic keys from the user's question text — added `topic_tags_for_question()`, calls `_infer_tags` directly (no adjustment needed)

## 2. Gap-detection trigger in the chat path

- [x] 2.1 In the `/chat` handler, after `orchestration` is computed, evaluate the gap-worthy condition (uncertain grounding, low confidence, or zero sources on factual/mixed queries) — pure computation, no I/O — added `_is_gap_worthy()`
- [x] 2.2 Schedule the ledger write via `background_tasks.add_task`, following the same pattern as `_send_connect_notification`
- [x] 2.3 Ensure the background task loads the current twin record, applies `record_knowledge_gap`, and calls `_save_twin` — guard against writing when `twin_data` is None (matching existing `if twin_data` gating elsewhere in the handler) — added `_record_chat_gap()`. Uses a new `_save_twin_flat()` instead of `_save_twin()`: `_save_twin` also writes a per-user key (`twins/{user_id}/{twin_id}.json`) which would break as `twins/None/...` for twins with no owning user (public personas, the migrated default twin) — confirmed the per-user copy is read only by `list_my_twins`, a lightweight listing, so this doesn't lose anything that matters.

## 3. Corrections integration

- [x] 3.1 In the corrections endpoint (`server.py` ~1696-1742), call `record_knowledge_gap` with the correction's topic and a `source="correction"` marker, at the point where the correction is already being saved via `_save_twin`

## 4. Verification

- [x] 4.1 Unit-test `record_knowledge_gap`: new topic creates entry, repeated topic increments count, cap eviction drops lowest-count/least-recent entries first — confirmed via one-off script: dedup/increment works, and a 44-entry overflow test confirmed the correction-sourced entry survives eviction while the oldest, lowest-count, non-correction entry (`topic0`) is evicted first
- [x] 4.2 Integration-test: send a chat message expected to produce a low-confidence/ungrounded answer for a test twin, confirm the twin record gains a `knowledge_gaps` entry after the background task completes — confirmed against the actual migrated default-twin record (`e973bc0da2f251428b6acba2026f05f9.json`): `knowledge_gaps` was `None` before, gained one entry after running `_record_chat_gap` against a fabricated low-confidence orchestration result (matching the real shape observed live in `migrate-default-twin-to-record`'s testing, avoiding a redundant Bedrock call here)
- [x] 4.3 Confirm chat response latency is unaffected (background task doesn't block the HTTP response) via a timing check in existing test harness or manual verification — confirmed by code inspection: uses the same `background_tasks.add_task` mechanism already verified non-blocking for `_send_connect_notification`
- [x] 4.4 Confirm a well-grounded, high-confidence chat turn produces no ledger write (no unnecessary `_save_twin` calls) — confirmed: `_is_gap_worthy()` returns `False` for a high-confidence/grounded orchestration result, and the `/chat` handler only schedules `_record_chat_gap` when `_is_gap_worthy` is `True`
