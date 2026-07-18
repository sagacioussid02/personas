## 1. Ledger data model and helpers

- [ ] 1.1 Add a `record_knowledge_gap(twin_data, topic_tags, source, question_snippet)`-style helper to `source_memory.py`, alongside the existing source/grounding helpers
- [ ] 1.2 Implement dedup-by-topic + count increment, and the cap/eviction policy (lowest-count, least-recent first), mirroring `merge_sources`'s cap pattern
- [ ] 1.3 Reuse `_infer_tags` (or extract a shared topic-tagging function if `_infer_tags` needs adjustment) to derive topic keys from the user's question text

## 2. Gap-detection trigger in the chat path

- [ ] 2.1 In the `/chat` handler, after `orchestration` is computed, evaluate the gap-worthy condition (uncertain grounding, low confidence, or zero sources on factual/mixed queries) — pure computation, no I/O
- [ ] 2.2 Schedule the ledger write via `background_tasks.add_task`, following the same pattern as `_send_connect_notification`
- [ ] 2.3 Ensure the background task loads the current twin record, applies `record_knowledge_gap`, and calls `_save_twin` — guard against writing when `twin_data` is None (matching existing `if twin_data` gating elsewhere in the handler)

## 3. Corrections integration

- [ ] 3.1 In the corrections endpoint (`server.py` ~1696-1742), call `record_knowledge_gap` with the correction's topic and a `source="correction"` marker, at the point where the correction is already being saved via `_save_twin`

## 4. Verification

- [ ] 4.1 Unit-test `record_knowledge_gap`: new topic creates entry, repeated topic increments count, cap eviction drops lowest-count/least-recent entries first
- [ ] 4.2 Integration-test: send a chat message expected to produce a low-confidence/ungrounded answer for a test twin, confirm the twin record gains a `knowledge_gaps` entry after the background task completes
- [ ] 4.3 Confirm chat response latency is unaffected (background task doesn't block the HTTP response) via a timing check in existing test harness or manual verification
- [ ] 4.4 Confirm a well-grounded, high-confidence chat turn produces no ledger write (no unnecessary `_save_twin` calls)
