# persona-prompt-rendering Specification

## Purpose
TBD - created by archiving change render-dormant-persona-fields. Update Purpose after archive.
## Requirements
### Requirement: Render communication_traits in the decision section
When a twin's `personality_model` contains a non-empty `communication_traits` list, the system prompt builder SHALL render it as a distinct subsection alongside (not replacing) any raw `communicationStyle` text already rendered from `_context`.

#### Scenario: Twin has communication_traits
- **WHEN** a chat request is built for a twin whose `personality_model.communication_traits` is a non-empty list
- **THEN** the system prompt includes a "Communication Traits" subsection listing each trait

#### Scenario: Twin lacks communication_traits
- **WHEN** a chat request is built for a twin whose `personality_model` has no `communication_traits` key or an empty list
- **THEN** the system prompt omits the Communication Traits subsection and no other section changes

### Requirement: Render pivotal_decisions as worked reasoning examples
When a twin's `personality_model` contains a non-empty `pivotal_decisions` list, the system prompt builder SHALL render it within the decision-making section as worked examples the twin can draw on when answering "what would you do" style questions.

#### Scenario: Twin has pivotal_decisions
- **WHEN** a chat request is built for a twin whose `personality_model.pivotal_decisions` is a non-empty list
- **THEN** the system prompt includes each pivotal decision as a labeled example within the "How {name} Thinks & Decides" section

#### Scenario: Twin lacks pivotal_decisions
- **WHEN** a chat request is built for a twin whose `personality_model` has no `pivotal_decisions` key or an empty list
- **THEN** the decision section renders exactly as it did before this change, with no pivotal-decisions subsection

### Requirement: Render characteristic_quotes as voice calibration, not recitable facts
When a twin's `personality_model` contains a non-empty `characteristic_quotes` list, the system prompt builder SHALL render them under a heading that frames them as voice/tone calibration examples, with an explicit instruction that they are not to be treated as an instruction to quote on demand or as directives.

#### Scenario: Twin has characteristic_quotes
- **WHEN** a chat request is built for a twin whose `personality_model.characteristic_quotes` is a non-empty list
- **THEN** the system prompt includes a section headed to indicate these are representative quotes for voice calibration, listing each quote
- **AND** the section includes explicit guidance that quotes calibrate tone rather than being facts to recite verbatim on request

#### Scenario: Twin lacks characteristic_quotes
- **WHEN** a chat request is built for a twin whose `personality_model` has no `characteristic_quotes` key or an empty list
- **THEN** the system prompt omits this section entirely

### Requirement: Render mind_change with a single source of truth
When a twin has a non-empty `mind_change` value at either `personality_model["mind_change"]` (top-level, post-synthesis) or `personality_model["_context"]["mindChange"]` (raw deepen answer), the system prompt builder SHALL render exactly one mind-change section, preferring the top-level synthesized value when both are present.

#### Scenario: Only top-level mind_change present
- **WHEN** `personality_model.mind_change` is non-empty and `_context.mindChange` is absent or empty
- **THEN** the system prompt renders a mind-change section using `personality_model.mind_change`

#### Scenario: Only raw _context.mindChange present
- **WHEN** `personality_model.mind_change` is absent or empty and `_context.mindChange` is non-empty
- **THEN** the system prompt renders a mind-change section using `_context.mindChange`

#### Scenario: Both present
- **WHEN** both `personality_model.mind_change` and `_context.mindChange` are non-empty
- **THEN** the system prompt renders exactly one mind-change section, using `personality_model.mind_change`

#### Scenario: Neither present
- **WHEN** neither field is present or both are empty
- **THEN** the system prompt omits the mind-change section entirely

### Requirement: writingSamples becomes a retrievable source
When `CreateTwinRequest.writingSamples` is non-empty, `build_initial_sources` SHALL produce a `source_item` for it using the same `make_source_item` helper and confidence conventions used for the other creation-time fields, so it participates in `retrieve_relevant_sources` like `skills`, `experience`, and `achievements` already do.

#### Scenario: Twin created with writing samples
- **WHEN** a twin is created via `/create-twin` with a non-empty `writingSamples` field
- **THEN** `build_initial_sources` includes a source item whose `source_type` identifies it as writing samples and whose `content` is the normalized `writingSamples` text

#### Scenario: Twin created without writing samples
- **WHEN** a twin is created via `/create-twin` with an empty or missing `writingSamples` field
- **THEN** `build_initial_sources` produces no source item for it, and no other sources are affected

