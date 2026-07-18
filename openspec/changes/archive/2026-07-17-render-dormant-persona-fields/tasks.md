## 1. context.py: decision-section rendering

- [x] 1.1 In `_build_decision_section`, add a `communication_traits` subsection (rendered when the list is non-empty), placed near the existing `communication_traits`-adjacent content (after Core Values, before Decision Heuristics)
- [x] 1.2 Add a `pivotal_decisions` subsection framed as worked examples, placed after `blind_spots` and before the existing "How to answer decision questions" instructions
- [x] 1.3 Add a `characteristic_quotes` subsection headed as voice-calibration examples, with explicit "don't just recite these" guidance, placed after `personality_summary`
- [x] 1.4 Add mind-change rendering: read `personality_model.get("mind_change")`, falling back to `personality_model.get("_context", {}).get("mindChange")`; render exactly one section when either is present
- [x] 1.5 Guard all four additions with the same `if personality_model.get(...)` truthy-check pattern already used for `core_values`/`blind_spots`/etc. so twins without these fields render unchanged

## 2. source_memory.py: writingSamples as a source

- [x] 2.1 Add a `writing_samples` mapping entry to `build_initial_sources`'s `mappings` list, sourcing from `fields.get("writingSamples")`, following the same `(source_type, title, content, confidence)` tuple shape as the existing entries
- [x] 2.2 Confirm `_infer_tags`'s keyword map produces a sensible tag for writing-samples content (should already hit "communication" via existing keyword cues) — add a cue if it doesn't (confirmed: title "Writing samples" hits the "communication" cue list's "writing" keyword directly, no code change needed)

## 3. Verification

- [x] 3.1 Manually build a system prompt (via existing test harness or a one-off script) for the Gandhi public persona and confirm `communication_traits`, `pivotal_decisions`, `characteristic_quotes`, and `mind_change` all appear (confirmed via one-off script — all four present)
- [x] 3.2 Build a system prompt for a persona/twin JSON with none of these four fields and diff against pre-change output to confirm zero change (confirmed via one-off script — all four sections absent, no regression)
- [x] 3.3 Create a twin via `/create-twin` with a non-empty `writingSamples` field and confirm `ensure_sources`/`retrieve_relevant_sources` can retrieve it for a relevant query (confirmed via one-off script — source created, tagged "communication", retrieved for a writing-style query)
- [x] 3.4 Run existing backend test suite (if any covers context.py/source_memory.py) and fix any snapshot-style test that hardcodes the old prompt shape (no existing test suite covers these files — nothing to run or fix)
