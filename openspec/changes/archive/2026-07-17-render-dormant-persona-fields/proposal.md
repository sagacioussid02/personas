## Why

The personality synthesis pipeline (`create_twin`, the deepen interview, and hand-authored public personas) already collects or produces several fields that never reach the chat system prompt: `communication_traits`, `pivotal_decisions`, `characteristic_quotes`, and `mind_change` are present in `personality_model` (visible today in `backend/public_personas/gandhi.json` and friends) but `backend/context.py` never renders them. Separately, `writingSamples` is collected on twin creation (`CreateTwinRequest.writingSamples`) but is never turned into a retrievable source in `source_memory.py`. This is the cheapest, highest-leverage fix available: the data already exists and is already being paid for (synthesis tokens, user interview time) — it's just discarded before it can improve any twin's voice or reasoning.

## What Changes

- `context.py`'s `_build_decision_section` renders `communication_traits`, `pivotal_decisions`, `characteristic_quotes`, and `mind_change` into the system prompt wherever they're present on a `personality_model`, in addition to the fields it already renders.
- `characteristic_quotes` are framed as voice/style examples ("here's how {short_name} actually talks"), not as facts to recite verbatim on demand.
- `pivotal_decisions` are framed as worked examples the twin can reason from when answering "what would you do" questions, alongside the existing decision heuristics.
- `source_memory.py`'s `build_initial_sources` gains a `writing_samples` entry so `writingSamples` becomes retrievable like every other creation-time field.
- No changes to the synthesis prompts, the data model, or the API surface — this is purely "render what's already collected."

## Capabilities

### New Capabilities
- `persona-prompt-rendering`: Governs which `personality_model` fields the system-prompt builder in `context.py` must render, and how each field type (values/heuristics vs. voice examples vs. worked-decision examples) is framed to the LLM.

### Modified Capabilities
(none — no existing specs cover this behavior yet)

## Impact

- Affected code: `backend/context.py` (`_build_decision_section`, `_build_from_personality_model`), `backend/source_memory.py` (`build_initial_sources`).
- No API contract changes, no migration needed for existing twin JSON records (fields are read defensively with `.get()` and already exist in most persona records; twins created before this change simply render fewer sections, same as today).
- Slightly longer system prompts for twins that have these fields populated — bounded by the size of the fields themselves (typically a handful of short list items / short paragraphs), not unbounded like the corrections section.
