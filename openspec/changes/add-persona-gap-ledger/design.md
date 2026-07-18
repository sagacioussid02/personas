## Context

Confirmed via code inspection:
- `agents/critic_agent.py`'s `review_grounded_answer` already computes, per turn: `grounding_mode` (`grounded` / `grounded+inferred` / `uncertain`), `confidence_label` (`high`/`medium`/`low`), and whether any sources were retrieved at all.
- `server.py`'s `/chat` handler only serializes this into the HTTP response (`ChatResponse.grounding`), gated behind `can_view_source_details` (twin owner or public-twin viewer). It is never written back to the twin record or aggregated. Confirmed no other read/write of `orchestration["grounding"]` exists in the codebase.
- `_save_twin` (server.py:1676) is currently called only from two places: the corrections endpoint and `_deepen_and_save` — never from the plain chat path. Adding a per-chat-turn write is new write-volume, not an extension of an existing per-turn write.
- The codebase already has an established pattern for "cheap synchronous decision, expensive work deferred to a background task" — the connect-notification fix (`_decide_connect_notification` + `background_tasks.add_task(_send_connect_notification, ...)`). This is the natural template to reuse here to avoid adding latency to the chat response.
- `source_memory.py` already has a keyword-based tagging function, `_infer_tags`, used to tag sources by topic (leadership/product/engineering/ai/communication/decision-making/values/career). This is the existing taxonomy in the codebase — reusing it avoids introducing a second, competing topic-classification scheme.

## Goals / Non-Goals

**Goals:**
- Capture, per twin, which topics produce low-confidence or ungrounded answers, with a frequency count — cheaply, without adding a new LLM call or measurable chat-response latency.
- Feed both inferred low-confidence signals and explicit corrections into the same ledger, distinguishing their weight.
- Bound storage growth the same way `sources` already is bounded.

**Non-Goals:**
- Not building the consumer of this data (generative interview, owner report) — that's items 4 and a future reporting change.
- Not guaranteeing exact counts under concurrent writes to the same twin (see Risks) — this is an aggregate quality signal, not a billing-grade counter.
- Not introducing a new topic-classification model/LLM call — reuses existing keyword tagging.

## Decisions

**Topic key = the tag set already produced by `_infer_tags`, not a new classifier.** Reusing the existing 8-category keyword taxonomy (leadership/product/engineering/ai/communication/decision-making/values/career) means gap topics use the same vocabulary as source tags — a gap on "product" topics can later be visibly paired with which sources exist on "product" topics, with zero new infrastructure. Trade-off: coarser granularity than an LLM-derived topic ("pricing strategy" collapses into "product") — acceptable for a v1 frequency signal; a future change can add finer-grained clustering if the coarse buckets prove too blunt in practice.

**Gap detection trigger:** a turn counts as a gap when `grounding_mode == "uncertain"` OR `confidence_label == "low"` OR zero sources were retrieved for a `factual`/`mixed` query (advisory-only questions are expected to have thinner grounding by design per `build_grounding_summary` and shouldn't inflate the ledger). Corrections always count as a gap on the corrected topic, regardless of the above, since they're an explicit signal rather than an inference.

**Recording happens as a background task, not inline.** Mirrors the connect-notify pattern: a cheap synchronous step computes the topic tags and whether this turn is gap-worthy (pure computation, no I/O), then a `background_tasks.add_task` does the load-merge-save of the twin record, exactly like `_send_connect_notification` defers the SES call. This keeps the gap ledger from adding latency to the chat response, at the cost of a small window where the response is already sent before the twin record write completes (acceptable — nothing user-facing depends on that write completing synchronously).

**Corrections increment at higher weight (or a separate `source: "correction"` field) than inferred low-confidence gaps**, so a report/consumer can distinguish "the owner told us this was wrong" from "the critic guessed this was weak" — these are different confidence levels of "this needs attention."

**Cap and dedup like `merge_sources` already does for `sources`.** `knowledge_gaps` is capped at a fixed size (same 40-entry convention as `merge_sources`), sorted by count descending then recency, so the most-asked, least-answered topics survive eviction rather than the most-recent ones.

## Risks / Trade-offs

- **[Risk]** Concurrent chat requests against the same popular public twin (e.g. Gandhi) race on load-modify-save of the twin JSON, causing lost gap-count increments under high concurrency. → **Mitigation**: accept approximate counts for v1 — this is an aggregate quality signal for the owner, not a correctness-critical counter (same risk class already accepted and documented for the in-memory rate limiter per CLAUDE.md: "Acceptable today... If real abuse appears, move the limiter to DynamoDB or Redis"). Revisit with atomic increments (DynamoDB) only if gap counts prove materially wrong in practice.
- **[Risk]** Coarse tag-based topics could bucket genuinely distinct gaps together (e.g. "pricing strategy" and "hiring philosophy" both land in "product"/"leadership"), diluting signal. → **Mitigation**: acceptable for v1 frequency tracking; the `matched_terms` already computed by `retrieve_relevant_sources`-adjacent tokenization could be stored alongside the tag for a future finer-grained view without a schema change (store as a list, not just a tag).
- **[Risk]** Extra background write per gap-worthy chat turn adds S3/filesystem write load. → **Mitigation**: only writes when a turn is actually gap-worthy (most confident, well-grounded turns produce zero extra writes), and reuses the existing `_save_twin` write path with no new infrastructure.

## Migration Plan

Purely additive: `knowledge_gaps` defaults to an absent/empty list on existing twin records, read defensively with `.get("knowledge_gaps", [])` everywhere. No backfill needed — the ledger starts accumulating from the first chat turn after deploy. No rollback concerns beyond reverting the code change; no destructive writes.

## Open Questions

- Should `knowledge_gaps` be visible to the twin owner immediately (e.g. surfaced somewhere in the dashboard) as part of this change, or does visibility wait for the reporting change mentioned in Non-Goals? Recommend deferring visibility to keep this change scoped to data capture only.
