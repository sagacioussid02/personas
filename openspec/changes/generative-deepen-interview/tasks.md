## 1. Topic selection engine

- [ ] 1.1 Build a topic-selection function that reads `knowledge_gaps` (from `add-persona-gap-ledger`), sorted by count descending, as the first-priority source
- [ ] 1.2 Define "thin field" thresholds per `personality_model` field (empty list, list below N entries, empty/short text) and build the second-priority selector
- [ ] 1.3 Build the fallback question bank, seeded with the three original evergreen topics (hard decisions, non-negotiables, mind-change) plus any persona-type-aware additions
- [ ] 1.4 Replace `_ALL_DEEPEN_TOPICS`'s exhaustive-list semantics with the new priority-chain selector; remove the "already deepened across all three areas" terminal short-circuit
- [ ] 1.5 Implement gap-topic decay/reset when a session directly addresses that topic

## 2. Targeted patch synthesis

- [ ] 2.1 Rewrite `_deepen_and_save`'s synthesis prompt to request field-scoped updates (only fields relevant to the answered topic) instead of full-model regeneration
- [ ] 2.2 Implement field-by-field merge of the returned patch into the existing model, rather than replacing the whole `personality_model` object
- [ ] 2.3 Add the periodic full-resynthesis "consolidation" pass (every N accepted patches), reusing the existing full-regeneration path but snapshotting first (see task 3.1)

## 3. Version history

- [ ] 3.1 Add `personality_model_versions` to the twin data model; snapshot before/on each update with `{version, model_snapshot, created_at, trigger}`
- [ ] 3.2 Implement cap/eviction that always retains the origin version
- [ ] 3.3 Add a rollback operation (endpoint or internal function) that restores a prior version and records the rollback itself as a new version entry

## 4. Source cap fix

- [ ] 4.1 Update `merge_sources` to exclude creation-time source types (`resume_profile`, `experience_notes`, `skills_inventory`, `achievement_notes`, `values_profile`) from the eviction pool
- [ ] 4.2 Handle the edge case where foundational sources alone approach the cap (reduce effective cap for non-foundational sources rather than evict foundational ones)

## 5. Verification

- [ ] 5.1 Test: twin with populated gap ledger gets gap-driven questions first
- [ ] 5.2 Test: brand-new twin with no history gets the original evergreen questions (regression test for cold start)
- [ ] 5.3 Test: completing a deepen session does not block a future session from finding new topics once new gaps appear
- [ ] 5.4 Test: targeted patch updates leave unrelated model fields unchanged
- [ ] 5.5 Test: version history caps correctly and always retains the origin version; rollback restores a prior version correctly
- [ ] 5.6 Test: source cap eviction never removes foundational source types even after many deepen sessions
