## 1. Migration script

- [ ] 1.1 Write `backend/scripts/migrate_default_twin.py`: read `backend/data/*` via the existing `resources.py` loaders (or duplicate the minimal reads needed), map onto `CreateTwinRequest`-shaped fields
- [ ] 1.2 Reuse `create_twin`'s synthesis call path (extract the synthesis prompt + Bedrock call + `_extract_json_object` + `_PERSONALITY_MODEL_KEYS` validation into a shared helper if not already reusable, so the script and `create_twin` don't diverge)
- [ ] 1.3 Assign a fixed, well-known `twin_id` (constant, documented alongside public persona IDs)
- [ ] 1.4 Build `sources` via `build_initial_sources`, same as `create_twin` does
- [ ] 1.5 Write the resulting JSON to `twins/{twin_id}.json` (local filesystem or S3, matching `USE_S3` config) with no `user_id` prefix, matching public-persona storage convention

## 2. Review and verification (pre-cutover)

- [ ] 2.1 Run the migration script; manually review the synthesized `personality_model` against current default-twin behavior (compare `_build_from_data_files` output vs. `_build_from_personality_model` + `_build_decision_section` output side by side)
- [ ] 2.2 Chat-test the new twin record via an explicit `twin_id` query (bypassing the default path) for parity with today's default-twin answers on a fixed set of test questions
- [ ] 2.3 Confirm the connect-notify flow (feedback/contact intent detection, SES notification) still works correctly when reached via the new `twin_id` path

## 3. Frontend cutover

- [ ] 3.1 Add the default twin's fixed `twin_id` as a frontend constant (env var or hardcoded, matching how public persona IDs are referenced)
- [ ] 3.2 Update `frontend/components/twin.tsx`'s `/chat` request body to include `twin_id`
- [ ] 3.3 Deploy and smoke-test the live homepage chat end-to-end

## 4. Post-cutover monitoring

- [ ] 4.1 Monitor chat behavior and error rates for one release cycle after cutover
- [ ] 4.2 File a follow-up change to delete `_build_from_data_files` (context.py) and retire `resources.py`'s live file-loading, once stability is confirmed
- [ ] 4.3 Update `CLAUDE.md`'s Key Files section to reflect the new source of truth for Sidd's twin (twin record vs. static data files)
