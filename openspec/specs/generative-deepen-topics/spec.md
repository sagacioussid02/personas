# generative-deepen-topics Specification

## Purpose
TBD - created by archiving change generative-deepen-interview. Update Purpose after archive.
## Requirements
### Requirement: Topic selection prioritizes knowledge gaps
When a twin has entries in its `knowledge_gaps` ledger, a new deepen session SHALL select its next question topic(s) from the highest-count unresolved gap entries before falling back to any other source.

#### Scenario: Twin has an unresolved gap
- **WHEN** a deepen session starts for a twin with at least one `knowledge_gaps` entry not yet addressed in this or a prior session
- **THEN** the next question targets the highest-count such entry's topic

#### Scenario: Twin has no gap ledger entries
- **WHEN** a deepen session starts for a twin with an empty `knowledge_gaps` ledger
- **THEN** topic selection falls through to the thin-field priority, and then the fallback question bank

### Requirement: Topic selection falls back to thin personality-model fields
When a twin has no unresolved gap-ledger entries, a new deepen session SHALL select its next question topic from `personality_model` fields that are empty or below their minimum-content threshold.

#### Scenario: Twin has a thin field and no gaps
- **WHEN** a twin has no gap-ledger entries but `characteristic_quotes` is empty
- **THEN** the next question targets acquiring characteristic quotes

### Requirement: Cold-start fallback preserves the original evergreen questions
When a twin has no gap-ledger entries and no thin fields below threshold (e.g. a brand-new twin with no chat history), a new deepen session SHALL use the fallback question bank, which includes the three original evergreen topics (hard decisions, non-negotiables, mind-change) as its first entries.

#### Scenario: Brand-new twin with no chat history
- **WHEN** a deepen session starts for a twin created moments ago with an empty gap ledger and no personality_model fields yet populated beyond initial synthesis
- **THEN** the session's first question matches one of the three original evergreen topics

### Requirement: A deepen session ending does not permanently close the twin to future deepening
When a deepen session completes (`done: true`), the system SHALL NOT record a permanent "fully deepened" state that prevents future sessions; a subsequent call to start a new session SHALL always recompute topic selection against current gap/field state.

#### Scenario: Twin previously completed all three evergreen topics
- **WHEN** a twin has previously completed a deepen session covering all three original evergreen topics
- **AND** new chat activity has since produced entries in its knowledge-gap ledger
- **THEN** starting a new deepen session offers questions targeting the new gap-ledger entries, not an "already deepened" refusal

#### Scenario: Nothing left to ask right now
- **WHEN** a twin has an empty gap ledger, no thin fields, and the fallback bank is exhausted
- **THEN** the endpoint reports there is nothing further to deepen right now, without writing any state that would prevent a future session once new gaps or thin fields exist

### Requirement: Answered gap topics decay from future topic selection within a reasonable window
When a gap-ledger topic is directly addressed by a deepen answer, its influence on subsequent topic selection SHALL be reduced (e.g. by resetting or decaying its count) so the same topic does not dominate every future session.

#### Scenario: Gap topic addressed once
- **WHEN** a deepen answer addresses the twin's top gap-ledger topic
- **THEN** a subsequent deepen session does not select that same topic again unless it re-accumulates gap signal from new chat activity

