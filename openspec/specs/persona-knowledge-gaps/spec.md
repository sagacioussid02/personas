# persona-knowledge-gaps Specification

## Purpose
TBD - created by archiving change add-persona-gap-ledger. Update Purpose after archive.
## Requirements
### Requirement: Low-confidence chat turns are recorded as knowledge gaps
When a chat turn's grounding is `uncertain`, its confidence label is `low`, or zero sources were retrieved for a factual or mixed query, the system SHALL record a knowledge-gap entry against the twin, keyed by the topic tags inferred from the user's question.

#### Scenario: Uncertain answer creates a gap entry
- **WHEN** a chat turn's critic output has `grounding_mode == "uncertain"`
- **THEN** a knowledge-gap entry is recorded for the twin with a topic derived from the question's inferred tags and a count of at least 1

#### Scenario: Zero sources on a factual question creates a gap entry
- **WHEN** a chat turn is classified as `factual` or `mixed` and `retrieve_relevant_sources` returns zero results
- **THEN** a knowledge-gap entry is recorded for the twin

#### Scenario: Well-grounded advisory answer does not create a gap entry
- **WHEN** a chat turn is classified as `advisory` and produces a `grounded+inferred` grounding mode with `confidence_label` of `medium` or `high`
- **THEN** no knowledge-gap entry is recorded

### Requirement: Repeated gaps on the same topic increment a count, not a duplicate entry
When a new gap-worthy turn's topic matches an existing knowledge-gap entry's topic for the same twin, the system SHALL increment that entry's count rather than creating a new entry.

#### Scenario: Same topic asked twice
- **WHEN** two separate chat turns for the same twin both produce a gap-worthy result with the same inferred topic
- **THEN** the twin's knowledge-gap ledger contains one entry for that topic with count equal to 2

### Requirement: Corrections feed the ledger at higher weight than inferred gaps
When a correction is submitted for a twin, the system SHALL record a knowledge-gap entry for the corrected topic, distinguishable from inferred-gap entries by an explicit source marker, regardless of the chat turn's original grounding/confidence values.

#### Scenario: Correction always creates or reinforces a gap entry
- **WHEN** a user submits a correction via the corrections endpoint
- **THEN** a knowledge-gap entry for that topic is recorded or incremented with a source marker indicating it originated from an explicit correction, distinct from an inferred low-confidence gap

### Requirement: Knowledge-gap ledger is size-bounded
The system SHALL cap the number of knowledge-gap entries retained per twin, evicting the lowest-count, least-recent entries first when the cap is exceeded.

#### Scenario: Ledger exceeds cap
- **WHEN** a twin's knowledge-gap ledger would exceed its maximum size after a new entry is added
- **THEN** the lowest-count, least-recently-updated entries are evicted until the ledger is back within the cap

### Requirement: Gap recording does not add latency to the chat response
The system SHALL defer the knowledge-gap ledger's read-modify-write to a background task scheduled after the chat response is prepared, so that gap recording does not delay the response returned to the user.

#### Scenario: Chat response is unaffected by gap recording
- **WHEN** a chat turn is gap-worthy
- **THEN** the HTTP response is returned to the caller without waiting for the knowledge-gap ledger write to complete

