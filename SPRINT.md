# Sprint Proposal — `twin` Project

**Sprint:** Week of 2025-07-14  
**Project:** `twin` (sagacioussid02/personas)  
**Prepared by:** Manager (minions/manager)  
**Status:** Approved — Ready for Execution

---

## Sprint Title

**"Foundations First: CI Hardening, Security Hygiene & Dependency Clarity"**

---

## Objective

Establish a stable, secure CI baseline and resolve structural dependency ambiguity before any feature-level dependency upgrades. This sprint eliminates the recurring merge-conflict risk, hardens the secrets scanning pipeline, and cleans up the root/frontend package split — positioning the team to safely execute the frontend npm upgrade in the following sprint.

---

## Sprint Items

### 🚀 Feature Item

> **Note:** No net-new feature items were identified in the current backlog signals. All available real items are tech-debt and bug-class work. Per sprint rules, no items have been fabricated. The operator confirmed this sprint proceeds as a tech-debt + bug sprint.

---

### 🔧 Tech-Debt Item (Primary)

#### TD-1 · Backend Python Dependency Audit & Upgrade

| Field | Detail |
|-------|--------|
| **Type** | `tech_debt` / security |
| **Source** | `backend/requirements.txt`, `backend/pyproject.toml` |
| **Impact** | High — 11 Python dependencies powering FastAPI + AWS Bedrock integration; stale boto3/FastAPI/auth libraries carry real CVE and API-signature risk in a production serverless environment |
| **Effort** | Small-Medium (2–3 days) |
| **Approach** | Run `pip-audit` or `safety` against `requirements.txt`; triage findings; stage upgrades with re-test; confirm CI green before merge |
| **Sequencing** | Must follow TD-2 (CI guard in place to catch regressions automatically) |
| **Risk** | **Medium** — FastAPI ↔ Pydantic version mismatches are a known pain point; AWS SDK upgrades may change API signatures |

---

### 🐛 Bug Items (Real, Evidenced)

#### BUG-1 · Package.json Merge Conflict CI Guard

| Field | Detail |
|-------|--------|
| **Type** | `bug` / `tech_debt` |
| **Source** | Commit `7dffcc8` (0 days old) — "build: resolve package.json merge conflict from PR #51 (#53)" |
| **Impact** | Medium — Recurring integration pain point; broken builds waste developer time and risk shipping a malformed `package.json` to `main` |
| **Effort** | Small (≤1 day) |
| **Approach** | Add `npm install --dry-run` or JSON lint/validation step to CI on all PRs targeting `main`; additive only, no production code changes |
| **Sequencing** | **Day 1 — merge first**; unblocks all subsequent dependency work this sprint |
| **Risk** | **Low** — Purely additive CI step |

#### BUG-2 · Secrets Scan CI Hardening

| Field | Detail |
|-------|--------|
| **Type** | `tech_debt` / security |
| **Source** | `.github/workflows/secrets-scan.yml`, `.github/workflows/security-scan.yml` |
| **Impact** | High — Platform is production-ready and handles AI persona data; misconfigured secrets scan could allow credential leakage into the repository |
| **Effort** | Small (1–2 days) |
| **Approach** | Review workflow YAML for coverage gaps; test with synthetic secrets; confirm alerting path is wired end-to-end; additive hardening only |
| **Sequencing** | Parallel with BUG-1 on Day 1–2 |
| **Risk** | **Low** — No production code changes |

---

### 🧹 Supporting Tech-Debt (Prerequisite for Next Sprint)

#### TD-2 · Root vs. Frontend `package.json` Rationalization

| Field | Detail |
|-------|--------|
| **Type** | `tech_debt` |
| **Source** | `package.json` (10 deps) vs. `frontend/package.json` (13 deps); corroborated by merge conflict commit `7dffcc8` |
| **Impact** | Medium — Overlapping/misaligned deps at root vs. workspace level caused PR #51/#53 conflict; must be resolved before frontend npm upgrade can proceed safely |
| **Effort** | Small (1–2 days) |
| **Approach** | Diff both files; identify overlaps; consolidate or document intentional splits; validate build scripts and CI still pass |
| **Sequencing** | Day 2–3, after BUG-1 CI guard is merged |
| **Risk** | **Low-Medium** — Consolidation could affect build scripts or CI workflows referencing root-level packages |

---

## Execution Sequence

```
Day 1      BUG-1  — CI Guard (merge conflict prevention) ← merge first
Day 1–2    BUG-2  — Secrets Scan Hardening (parallel, no deps on BUG-1)
Day 2–3    TD-2   — Root vs. Frontend package.json Rationalization
Day 3–5    TD-1   — Backend Python Dependency Audit & Upgrade
─────────────────────────────────────────────────────────────────────
NEXT SPRINT        Feature #1 — Frontend npm Audit & Upgrade
                   (unblocked after TD-2 lands)
```

---

## Deferred Items

| Item | Reason |
|------|--------|
| Frontend npm Dependency Audit & Upgrade (Candidate #1) | Blocked by unresolved root/workspace `package.json` split (TD-2). Upgrading 13 frontend deps before the workspace boundary is clarified risks reproducing the PR #51/#53 merge conflict pattern. Scheduled for next sprint once TD-2 lands. |

---

## Estimated Cost

| Item | Effort (Days) | Notes |
|------|--------------|-------|
| BUG-1 · CI Guard | 1 | Additive CI step only |
| BUG-2 · Secrets Scan Hardening | 1–2 | Review + synthetic test + alerting validation |
| TD-2 · package.json Rationalization | 1–2 | Diff, consolidate, validate |
| TD-1 · Backend Python Audit & Upgrade | 2–3 | pip-audit/safety, triage, staged upgrades, re-test |
| **Total Sprint Effort** | **5–8 engineer-days** | Fits a standard 1-week sprint for a small team |

> **Tooling note:** Confirm `pip-audit` or `safety` is available in the CI environment before sprint start. If not, add a bootstrap step (estimated < 1 hour; not counted separately).

---

## Risk Score

| Item | Risk |
|------|------|
| BUG-1 · CI Guard | 🟢 **Low** |
| BUG-2 · Secrets Scan Hardening | 🟢 **Low** |
| TD-2 · package.json Rationalization | 🟡 **Low-Medium** |
| TD-1 · Backend Python Audit & Upgrade | 🟡 **Medium** |
| **Overall Sprint Risk** | 🟡 **Medium** |

**Risk rationale:** The sprint is dominated by additive, low-blast-radius CI and audit work. The only meaningful risk is the backend Python upgrade (FastAPI/Pydantic version sensitivity, AWS SDK API changes), which is mitigated by sequencing it after the CI guard is in place and by using `pip-audit` to scope changes before applying them.

---

## Approval Status

✅ **Operator Approved** — Ready for execution beginning 2025-07-14.

---

*Proposed by: minions/manager | Approved by: operator*
