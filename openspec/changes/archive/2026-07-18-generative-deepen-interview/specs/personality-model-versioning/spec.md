## ADDED Requirements

### Requirement: Deepen answers produce targeted field patches, not full-model regeneration
When a deepen answer is saved, the system SHALL request and apply an update limited to the `personality_model` fields relevant to the topic just answered, rather than regenerating the entire model.

#### Scenario: Answer about non-negotiables updates only relevant fields
- **WHEN** a deepen answer addresses the non-negotiables topic
- **THEN** the resulting model update modifies only the fields relevant to non-negotiables (e.g. `blind_spots`, `what_they_avoid`, `decision_framework`) and leaves unrelated fields (e.g. `core_values`, `risk_profile`) byte-for-byte unchanged unless they were also targeted

### Requirement: Every personality-model update is retained in version history
The system SHALL append a snapshot of the `personality_model` to a bounded `personality_model_versions` history before or when applying any update, and SHALL always retain the first ("origin") version regardless of cap eviction.

#### Scenario: Update creates a new version entry
- **WHEN** a deepen answer results in a personality_model update
- **THEN** a new entry is appended to `personality_model_versions` containing the pre-update (or post-update, per implementation) snapshot, a timestamp, and a trigger label

#### Scenario: Version history exceeds its cap
- **WHEN** `personality_model_versions` would exceed its maximum retained size after a new entry is added
- **THEN** the oldest non-origin entries are evicted first, and the origin (first-ever) version is never evicted

### Requirement: A prior personality-model version can be restored
The system SHALL support restoring a twin's `personality_model` to any version retained in `personality_model_versions`.

#### Scenario: Rollback to a previous version
- **WHEN** a twin owner requests rollback to a specific retained version
- **THEN** the twin's active `personality_model` is replaced with that version's snapshot, and the rollback itself is recorded as a new version-history entry

### Requirement: Foundational sources are protected from cap eviction
The system SHALL exclude creation-time source types (resume profile, experience notes, skills inventory, achievement notes, values profile) from the source-list eviction pool used when the source cap is exceeded, so continuous deepening cannot silently remove a twin's original profile sources.

#### Scenario: Many deepen sessions accumulate sources over time
- **WHEN** a twin's total source count exceeds the cap due to many `deepen_interview` sources accumulated over repeated sessions
- **THEN** eviction removes the oldest `deepen_interview`/`manual_correction` sources first, and creation-time source types remain present regardless of age

#### Scenario: Foundational source count alone would exceed the cap
- **WHEN** a twin's creation-time sources alone approach the overall cap
- **THEN** the system SHALL still retain all creation-time sources, and the effective cap for non-foundational sources is reduced accordingly rather than evicting foundational sources
