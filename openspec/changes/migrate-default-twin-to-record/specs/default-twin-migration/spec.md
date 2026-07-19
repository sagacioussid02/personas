## ADDED Requirements

### Requirement: Default twin has a stable twin record
The system SHALL provide a twin JSON record for Sidd's default twin, stored at `twins/{twin_id}.json` with a fixed, well-known `twin_id`, containing a `personality_model` synthesized from the same fields `create_twin` accepts (bio, skills, experience, achievements, core values, decision style, past decisions, communication style, blind spots).

#### Scenario: Default twin record is loadable
- **WHEN** `load_twin(DEFAULT_TWIN_ID)` is called with the migrated default twin's fixed ID
- **THEN** it returns a twin JSON record with a non-empty `personality_model` containing all keys in `_PERSONALITY_MODEL_KEYS`

#### Scenario: Migration is re-runnable
- **WHEN** the migration script is run again after `backend/data/*` files are edited
- **THEN** it produces an updated twin record reflecting the new source content, without requiring manual JSON editing

### Requirement: Chat requests for the default twin use a real twin_id
The `/chat` endpoint's behavior for Sidd's default twin SHALL be reached via a `twin_id`-bearing request, using the same `load_twin` + `personality_model`-driven code path as any other twin, rather than the `twin_data is None` special case.

#### Scenario: Frontend homepage chat sends twin_id
- **WHEN** an anonymous visitor sends a message via the unauthenticated homepage chat component
- **THEN** the request body includes `twin_id` set to the default twin's fixed ID
- **AND** the `/chat` handler resolves `twin_data` via `load_twin` exactly as it would for any other twin

#### Scenario: Default twin participates in source retrieval
- **WHEN** a chat message is sent to the default twin post-migration
- **THEN** `retrieve_relevant_sources` is invoked against the default twin's `sources` list exactly as it is for user-created twins and public personas

### Requirement: Two-step cutover preserves rollback safety
The migration SHALL be deployable such that the new twin record exists and is verified before the frontend stops using the legacy `twin_data is None` code path, and the legacy path SHALL remain functional until a separate follow-up change removes it.

#### Scenario: New twin record verified before frontend cutover
- **WHEN** the migrated twin record is deployed
- **THEN** it SHALL be reachable and testable via an explicit `twin_id` in chat requests before the frontend's default request stops omitting `twin_id`

#### Scenario: Rollback via frontend revert
- **WHEN** an issue is found with the migrated twin record after frontend cutover
- **THEN** reverting the frontend change alone (without any backend revert) SHALL restore the previous `twin_data is None` behavior, since `resources.py` and `_build_from_data_files` remain intact until the follow-up cleanup change
