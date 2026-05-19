# Sprint Proposal — `twin` Project

## Sprint: `twin-sprint-2025-W29`
**Title:** Stabilize & Secure — Lockfile Cleanup, Secrets Hardening, and Dependency Audit
**Sprint Window:** 2025-07-14 → 2025-07-18 (1 week)
**Prepared by:** Manager Agent (minions/manager)
**Date:** 2025-07-10

---

## Objective

Resolve the active lockfile integrity risk introduced by the PR #51/#53 merge conflict, harden CI secrets scanning before any further credential exposure can occur, and — once the dependency tree is verified clean — execute a full audit and upgrade of all frontend and backend packages. This sprint eliminates the three highest-urgency compounding risks in the `twin` platform before new feature work resumes.

---

## Sprint Items

### 🐛 Bug — `BUG-01`

| Field | Value |
|-------|-------|
| **Title** | Post-merge cleanup and validation after `package.json` conflict resolution (PR #53) |
| **Type** | `bug` |
| **Source** | Commit `7dffcc8` — *"build: resolve package.json merge conflict from PR #51 (#53)"* |
| **Description** | The most recent commit explicitly resolves a `package.json` merge conflict. Merge conflict resolutions can silently drop dependencies, misalign versions between `package.json` and lockfiles, or leave the dependency tree in an inconsistent state. This must be verified and closed before any dependency upgrade work begins. |
| **Acceptance Criteria** | `npm ci` runs cleanly in a fresh environment with zero errors; `package-lock.json` is consistent with `package.json`; no dependencies were silently dropped or duplicated vs. the pre-conflict state; CI build passes on a clean runner. |
| **Estimated Effort** | 0.5–1 day |
| **Assigned Skill** | Frontend / Build engineer |
| **Blocks** | `TD-01` (Dependency Audit) — must land first |

---

### 🔧 Tech Debt — `TD-01`

| Field | Value |
|-------|-------|
| **Title** | Audit and upgrade outdated npm and Python dependencies |
| **Type** | `tech_debt` |
| **Source** | Package files: `package.json` (10 npm deps), `frontend/package.json` (13 npm deps), `backend/requirements.txt` (11 Python deps) |
| **Description** | Run `npm audit` and `pip-audit` across all three manifests, review breaking changes for FastAPI, Next.js, and AWS SDK libraries, and update lockfiles. This is sequentially unblocked by `BUG-01` — the lockfile must be verified clean before the audit baseline is meaningful. |
| **Acceptance Criteria** | `npm audit` reports zero high/critical vulnerabilities (or all remaining are documented with accepted-risk rationale); `pip-audit` clean on `backend/requirements.txt`; all three lockfiles updated and committed; CI passes on updated deps; no runtime regressions in local smoke test. |
| **Estimated Effort** | 2–3 days |
| **Assigned Skill** | Full-stack engineer (npm + Python) |
| **Depends On** | `BUG-01` must be merged first |

---

### 🔒 Feature — `FEAT-01`

> **Note on classification:** The security scan hardening item is classified here as the sprint's **feature delivery** because it introduces new, hardened CI enforcement behavior (blocking vs. warning, coverage gap remediation) that does not currently exist — it is not merely maintaining existing functionality. It is the highest-impact additive change this sprint delivers.

| Field | Value |
|-------|-------|
| **Title** | Validate and harden the secrets-scan and security-scan CI workflows |
| **Type** | `feature` (CI security hardening) |
| **Source** | CI workflows: `.github/workflows/secrets-scan.yml`, `.github/workflows/security-scan.yml` |
| **Description** | Review both CI security workflows for coverage gaps, false-negative patterns, and enforcement posture (blocking vs. warning-only). The `twin` platform handles personal voice/judgment data and integrates with AWS Bedrock, Lambda, and S3 — a misconfigured or incomplete secrets scan is an active credential-leakage exposure. This item is fully parallel to `BUG-01` and `TD-01` and carries no blockers. |
| **Acceptance Criteria** | Both workflows reviewed and gaps documented; at minimum one enforcement gap remediated (e.g., warning-only rules promoted to blocking); scan coverage confirmed against all secret patterns relevant to AWS credentials, Anthropic API keys, and any other keys referenced in the project; PR includes a brief findings summary comment. |
| **Estimated Effort** | 1 day |
| **Assigned Skill** | DevSecOps / CI engineer |
| **Depends On** | None — fully parallel |

---

## Sequencing & Execution Plan

```
Day 1–2:  [BUG-01] Lockfile cleanup & validation  ──────────────────────────►  merge
          [FEAT-01] Secrets scan hardening (parallel, starts Day 1)  ─────────►  merge

Day 2–4:  [TD-01] Dependency audit & upgrade  (starts after BUG-01 merges)  ──►  merge

Day 5:    Buffer / review / regression smoke test
```

**Critical path:** `BUG-01` → `TD-01`. `FEAT-01` is off the critical path and should be picked up immediately as a parallel quick win.

---

## Deferred Items (Not in This Sprint)

| Item | Reason for Deferral |
|------|---------------------|
| CI Pipeline Coverage — Add Test Stage | Requires Bedrock/Lambda mock infrastructure decision (no mock layer exists); a Decision Record must be approved before scheduling. Hollow test gates create false confidence. |
| README / Onboarding Documentation | Writing accurate env-var and deployment docs while the dependency tree is in flux will require immediate rework. Defer until stack is stabilized post-this sprint. |

---

## Estimated Sprint Cost

| Item | Effort (days) | Engineer Day Rate (est.) | Item Cost |
|------|--------------|--------------------------|----------|
| `BUG-01` — Lockfile cleanup | 1 day | $800/day (blended) | $800 |
| `FEAT-01` — Secrets scan hardening | 1 day | $800/day (blended) | $800 |
| `TD-01` — Dependency audit & upgrade | 2.5 days (midpoint) | $800/day (blended) | $2,000 |
| **Sprint management overhead** | 0.5 day | $800/day | $400 |
| **Total** | **5 days** | | **$4,000** |

> **Rate basis:** Blended senior-engineer day rate estimate. Operator should substitute actual team rates. No external tooling costs are anticipated — `npm audit` and `pip-audit` are zero-cost CLI tools already available in the stack.

---

## Risk Score

### Overall Sprint Risk: **MEDIUM**

| Dimension | Score | Rationale |
|-----------|-------|----------|
| **Execution risk** | Low | All three items are well-scoped with clear acceptance criteria and known tooling. No new infrastructure is introduced. |
| **Dependency upgrade risk** | Medium | FastAPI, Next.js, and AWS SDK upgrades can introduce breaking changes. Mitigated by sequencing `BUG-01` first and running smoke tests post-upgrade. |
| **Lockfile drift risk** | Medium | Until `BUG-01` is verified, the true dependency surface is undefined. This is the sprint's highest-urgency item and its resolution gates the audit. |
| **CI hardening risk** | Low | `FEAT-01` is purely additive — no production code changes. Worst case: a false-positive scan block that is quickly tunable. |
| **Schedule risk** | Low | 5 engineer-days of work in a 5-day sprint with one buffer day. No external dependencies or third-party approvals required. |
| **Security risk (if sprint is NOT executed)** | High | Deferring all three items leaves an unverified lockfile, an under-hardened secrets scan, and a growing CVE surface across 34 total dependencies. |

---

## Decision Record Requirement

No new external dependencies, vendors, or infrastructure changes are introduced in this sprint. No Decision Record is required for execution. However, the following **future Decision Record is flagged** as a prerequisite before the deferred CI test-coverage item can be scheduled:

> **DR-TWIN-001 (pending):** Select and approve a Bedrock/Lambda mock strategy for automated test infrastructure in the `twin` CI pipeline.

---

## Approvals Required Before Execution

| Role | Action Required |
|------|----------------|
| **Operator** | Approve this sprint proposal |
| **Peer Agent (code review)** | Review any PRs produced by sprint execution before merge |
| **Operator** | Final merge approval after peer review and green CI |

> Per hard rules: no agent merges their own work. All PRs target `main` via `minions/<role>/<short-summary>` branches. No TOS acceptance is required for this sprint.

---

*Sprint proposal prepared by Manager Agent. All items sourced from verified project signals — no fabricated work items. Ready for operator review and approval.*
