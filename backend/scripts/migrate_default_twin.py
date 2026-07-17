"""
One-time (re-runnable) script: synthesize Sidd's default twin — today built
live from static files in backend/data/ via resources.py — into a proper
twin JSON record with a personality_model, using the exact same synthesis
path /create-twin uses (server.synthesize_personality_model).

This is part of openspec/changes/migrate-default-twin-to-record: once this
record exists and the frontend is cut over to send its twin_id, Sidd's twin
becomes eligible for deepen sessions, corrections, and source-grounded
retrieval like every other twin — none of which the current data-files path
supports.

Usage:
  cd backend
  python scripts/migrate_default_twin.py [--dry-run]

Re-running after editing backend/data/*.txt or *.json files re-synthesizes
and overwrites the twin record with fresh content — this is the intended
workflow for keeping Sidd's twin current (see design.md's Non-Goals: the
data files remain the human-editable source of truth, not the resulting
JSON).

Note on backend/data/ files: bio.txt is an unfilled template (still contains
literal "[Company]"/"[2-3 paragraph overview...]" placeholder text) and
communication.txt is empty — both are dead weight today because
resources.py's load_markdown_file() looks for "bio.md"/"communication_style.md"
and finds nothing (the actual files are .txt), so neither has ever reached
the live twin's prompt. This script intentionally ignores both and instead
uses summary.txt (which has real content) and style.txt for bio/communication
signal. If you fill in bio.txt with real content before re-running this
script, update the mapping below to use it.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import server  # noqa: E402
import source_memory  # noqa: E402

DATA_DIR = Path(__file__).parent.parent / "data"

# Deterministic (uuid5, fixed namespace + name) so re-running this script, or
# regenerating it from scratch, always produces the same twin_id. Matches
# _TWIN_ID_RE's [a-f0-9]{32} format used for all user-created and public twins.
import uuid  # noqa: E402
DEFAULT_TWIN_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "default-twin.sidd.personas").hex

# The Clerk user_id that should be treated as this twin's owner for
# owner-gated endpoints (deepen, corrections). Unset by default — until this
# is configured, this twin's record is chattable but not deepen/correction-able
# via the authenticated owner endpoints, since those check
# twin_data["user_id"] == the caller's Clerk user_id.
DEFAULT_TWIN_OWNER_USER_ID = os.getenv("DEFAULT_TWIN_OWNER_USER_ID") or None


def _read_text(filename: str) -> str:
    path = DATA_DIR / filename
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8").strip()


def _read_json(filename: str) -> dict:
    path = DATA_DIR / filename
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _flatten_skills(skills_json: dict) -> str:
    technical = skills_json.get("technical_skills", {})
    lines = []
    for category, items in technical.items():
        if items:
            lines.append(f"{category.replace('_', ' ').title()}: {', '.join(items)}")
    if skills_json.get("soft_skills"):
        lines.append(f"Soft skills: {', '.join(skills_json['soft_skills'])}")
    if skills_json.get("certifications"):
        lines.append(f"Certifications: {', '.join(skills_json['certifications'])}")
    return "\n".join(lines)


def _strip_instructional_preamble(summary: str) -> str:
    """summary.txt is written as a system-prompt fragment ("You are a chatbot
    acting as..."), not a third-person bio. Drop paragraphs that are
    instructions-to-the-AI rather than facts about Sidd, so _context.bio
    (rendered verbatim as "Bio: ..." in context.py) reads like a bio."""
    paragraphs = [p.strip() for p in summary.split("\n\n") if p.strip()]
    kept = [
        p for p in paragraphs
        if not p.lower().startswith(("you are a chatbot", "your goal is"))
    ]
    return "\n\n".join(kept)


def build_fields() -> dict:
    facts = _read_json("facts.json")
    skills_json = _read_json("skills.json")
    summary = _strip_instructional_preamble(_read_text("summary.txt"))
    style = _read_text("style.txt")
    interests = _read_text("interests.txt")

    name = facts.get("name") or facts.get("full_name") or "Sidd"
    title = facts.get("current_role") or ""

    bio_parts = [summary]
    if facts.get("specialties"):
        bio_parts.append(f"Specialties: {', '.join(facts['specialties'])}.")
    if facts.get("years_experience"):
        bio_parts.append(f"{facts['years_experience']} years of professional experience.")
    if facts.get("education"):
        edu = "; ".join(
            f"{e.get('degree', '')} — {e.get('institution', '')} ({e.get('year', '')})"
            for e in facts["education"]
        )
        bio_parts.append(f"Education: {edu}.")
    if interests:
        bio_parts.append(f"Interests: {interests}")
    bio = "\n\n".join(p for p in bio_parts if p)

    return {
        "name": name,
        "title": title,
        "bio": bio,
        "skills": _flatten_skills(skills_json),
        "experience": "",  # no work_experience source file exists today (see module docstring)
        "achievements": "",  # no achievements source file exists today
        "coreValues": "",  # not captured in data/ today — fill in via a deepen session post-migration
        "decisionStyle": "",  # not captured in data/ today — fill in via a deepen session post-migration
        "riskTolerance": "",
        "pastDecisions": "",  # not captured in data/ today — fill in via a deepen session post-migration
        "communicationStyle": style,
        "writingSamples": "",
        "blindSpots": "",
    }


def build_twin_data(fields: dict) -> dict:
    personality_model = server.synthesize_personality_model(**fields)
    personality_model["_context"] = {
        "bio": fields["bio"],
        "skills": fields["skills"],
        "experience": fields["experience"],
        "achievements": fields["achievements"],
        "coreValues": fields["coreValues"],
        "decisionStyle": fields["decisionStyle"],
        "pastDecisions": fields["pastDecisions"],
        "communicationStyle": fields["communicationStyle"],
        "blindSpots": fields["blindSpots"],
        "verbalQuirks": "",
        # server.py's /chat handler defaults response_style to "concise" only
        # when request.twin_id is absent ("keep homepage chat snappy" — see
        # its comment). Once the frontend cutover sends this twin_id on every
        # request, that special case no longer applies, so pin "concise"
        # here explicitly — context.py's prompt() already prefers
        # personality_model._context.responseStyle over the passed-in
        # default when set, so this preserves today's response length
        # behavior instead of silently switching to "balanced" (3-6
        # sentences) post-cutover.
        "responseStyle": "concise",
    }

    from datetime import datetime

    return {
        "twin_id": DEFAULT_TWIN_ID,
        "user_id": DEFAULT_TWIN_OWNER_USER_ID,
        "name": fields["name"],
        "title": fields["title"],
        # Backend only enforces PUBLIC_PERSONA_ANON_LIMIT (server.py) for
        # twins with is_public=True — the twin_id-less path this twin used
        # to be reached through had NO server-side anon rate limit at all.
        # The frontend already client-side-caps anon exchanges at the same
        # limit (twin.tsx's MAX_ANON_EXCHANGES), so this closes a real gap
        # (unlimited /chat calls via direct API access, bypassing the UI)
        # with zero visible behavior change for the actual homepage chat.
        "is_public": True,
        "archetype_id": None,
        "archetype_display_name": None,
        "personality_model": personality_model,
        "sources": source_memory.build_initial_sources(fields),
        "created_at": datetime.now().isoformat(),
        "chat_url": f"/twin?id={DEFAULT_TWIN_ID}",
    }


def save_twin_flat(twin_data: dict) -> str:
    """Write twin_data to the flat twins/{twin_id}.json key only (no per-user
    copy) — matching the public-persona convention of no user_id prefix,
    since this twin has no owning end-user distinct from Sidd's own operator
    identity (see design.md's storage decision)."""
    payload = json.dumps(twin_data, indent=2)
    if server.USE_S3:
        server.s3_client.put_object(
            Bucket=server.S3_BUCKET,
            Key=f"{server.TWINS_S3_PREFIX}{DEFAULT_TWIN_ID}.json",
            Body=payload,
            ContentType="application/json",
        )
        return f"s3://{server.S3_BUCKET}/{server.TWINS_S3_PREFIX}{DEFAULT_TWIN_ID}.json"
    else:
        os.makedirs(server.TWINS_DIR, exist_ok=True)
        path = os.path.join(server.TWINS_DIR, f"{DEFAULT_TWIN_ID}.json")
        with open(path, "w", encoding="utf-8") as f:
            f.write(payload)
        return path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Synthesize and print the resulting twin record without writing it",
    )
    args = parser.parse_args()

    fields = build_fields()
    print(f"Synthesizing personality model for '{fields['name']}' ({fields['title']})...")
    twin_data = build_twin_data(fields)

    if not DEFAULT_TWIN_OWNER_USER_ID:
        print(
            "WARNING: DEFAULT_TWIN_OWNER_USER_ID is not set — this twin record will have "
            "user_id=None, so owner-gated endpoints (deepen, corrections) won't authorize "
            "any caller against it until this is configured with Sidd's real Clerk user_id."
        )

    if args.dry_run:
        print(json.dumps(twin_data, indent=2))
        return

    location = save_twin_flat(twin_data)
    print(f"Wrote twin record ({DEFAULT_TWIN_ID}) to {location}")
    print(f"Chat with it directly via twin_id={DEFAULT_TWIN_ID} before cutting the frontend over.")


if __name__ == "__main__":
    main()
