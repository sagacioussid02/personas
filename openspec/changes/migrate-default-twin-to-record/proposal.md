## Why

Sidd's own twin — the one being advertised as a live contact channel — is the only persona in the system that cannot be deepened, corrected, or given retrieval sources. It's built from static files in `backend/data/` (`bio.txt` et al., loaded once at import time by `resources.py`) rather than a `personality_model` twin record. Every capability the other personas get for free (deepen interviews, corrections, source-grounded retrieval, personality re-synthesis) is gated on `request.twin_id` being set and `load_twin()` returning a record — the default twin (`request.twin_id is None`) skips all of it (`backend/server.py:1035-1037`, confirmed by grep — `twin_data = None` whenever `twin_id` is absent, and every downstream capability branches on `if twin_data`). Fixing this is a prerequisite for the gap-ledger and generative-interview changes (items 3 and 4) to apply uniformly, and it's the most direct way to make the flagship twin as improvable as everyone else's.

## What Changes

- A one-time migration reads `backend/data/*` via the existing `resources.py` loaders and synthesizes a `personality_model` for Sidd's twin using the same synthesis path `create_twin` already uses, producing a twin JSON record with a stable, well-known `twin_id`.
- The default-twin chat path (`request.twin_id` absent) is retired in favor of always resolving a `twin_id` — the frontend's unauthenticated default-chat entry point now targets Sidd's twin's stable `twin_id` instead of relying on the `twin_data is None` branch.
- `backend/data/*` remains as the one-time migration input; it stops being read live by `resources.py` on every cold start. **BREAKING**: `resources.py`'s live file-loading behavior is removed once the migration lands and the frontend is updated — direct edits to `backend/data/*.txt` files no longer take effect without re-running the migration.
- Sidd's twin gains a `sources` list (built the same way `build_initial_sources` builds them for any other twin) and becomes eligible for the deepen interview, corrections, and future gap-ledger/generative-interview work on equal footing with user-created twins and public personas.

## Capabilities

### New Capabilities
- `default-twin-migration`: One-time process and resulting data contract for converting the static-file-backed default twin into a standard twin record.

### Modified Capabilities
(none — no existing spec covers the default-twin code path yet; the `/chat` endpoint's behavior for `twin_id`-less requests is being retired, not modified under an existing spec)

## Impact

- Affected code: `backend/resources.py` (retired or reduced to a one-off migration script), `backend/context.py` (`_build_from_data_files` code path becomes dead once migration lands — kept only as long as needed for rollback safety), `backend/server.py` (`/chat` handler's `twin_data is None` branch), frontend chat entry points that currently omit `twin_id` (`frontend/components/twin.tsx`).
- Data impact: one new twin JSON record (`twins/{twin_id}.json`, following the public-persona convention of no `user_id` prefix per CLAUDE.md's Data Layout) seeded from `backend/data/*`.
- Deployment ordering matters: the twin record must exist and be reachable before the frontend stops sending `twin_id`-less requests, or chat breaks for anonymous visitors to the homepage. See design.md Migration Plan.
