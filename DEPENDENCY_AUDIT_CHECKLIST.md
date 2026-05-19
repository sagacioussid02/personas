# Backend Python Dependency Audit & Upgrade Checklist (TD-1)

**Sprint:** Week of 2025-07-14  
**Item:** TD-1 · Backend Python Dependency Audit & Upgrade  
**Effort:** 2–3 days  
**Risk:** Medium  

---

## Overview

This checklist guides the systematic audit and upgrade of Python dependencies in `backend/requirements.txt` and `backend/pyproject.toml`. The goal is to:

1. Identify security vulnerabilities and outdated packages.
2. Triage findings by severity and compatibility risk.
3. Stage upgrades incrementally with re-testing.
4. Confirm CI green before merging.

---

## Pre-Flight Checks

- [ ] Confirm `pip-audit` or `safety` is installed in the CI environment.
  - If not available, add installation step to CI (< 1 hour effort).
- [ ] Verify current Python version in `backend/` matches CI environment (should be 3.12+).
- [ ] Ensure all tests pass on `main` before starting (baseline).
- [ ] Create a feature branch: `minions/engineer/backend-python-audit`.

---

## Phase 1: Audit & Discovery (Day 1)

### Step 1.1: Run Vulnerability Scan

```bash
cd backend
pip-audit --desc  # or: safety check --json
```

- [ ] Capture output (save to `AUDIT_RESULTS.txt` for reference).
- [ ] Note any CVEs, their severity (CRITICAL, HIGH, MEDIUM, LOW), and affected packages.

### Step 1.2: Check for Outdated Packages

```bash
pip list --outdated
```

- [ ] Identify packages with available updates.
- [ ] Cross-reference with `requirements.txt` and `pyproject.toml`.

### Step 1.3: Document Current State

- [ ] List all dependencies and their current versions:
  ```bash
  pip freeze > CURRENT_VERSIONS.txt
  ```
- [ ] Note any known compatibility issues (e.g., FastAPI ↔ Pydantic, boto3 API changes).

---

## Phase 2: Triage & Planning (Day 1–2)

### Step 2.1: Categorize Findings

Create a triage table (example below):

| Package | Current | Latest | Severity | Risk | Action |
|---------|---------|--------|----------|------|--------|
| fastapi | 0.95.0 | 0.104.0 | MEDIUM | HIGH | Staged upgrade |
| pydantic | 1.10.0 | 2.0.0 | LOW | HIGH | Verify compatibility |
| boto3 | 1.26.0 | 1.28.0 | LOW | MEDIUM | Safe upgrade |
| ... | ... | ... | ... | ... | ... |

- [ ] Severity: From `pip-audit` output (CRITICAL > HIGH > MEDIUM > LOW).
- [ ] Risk: Compatibility risk based on version jump and known issues.
- [ ] Action: Defer, staged upgrade, or safe upgrade.

### Step 2.2: Identify Blockers

- [ ] Check for breaking changes in major version upgrades (e.g., FastAPI 0.95 → 0.104, Pydantic 1 → 2).
- [ ] Review upstream changelogs for API signature changes.
- [ ] Note any packages that should be deferred to a future sprint.

### Step 2.3: Plan Upgrade Order

- [ ] Prioritize CRITICAL and HIGH severity vulnerabilities first.
- [ ] Group compatible upgrades (e.g., all patch-level updates together).
- [ ] Plan major version upgrades last (e.g., Pydantic 1 → 2).

---

## Phase 3: Staged Upgrades & Testing (Day 2–3)

### Step 3.1: Upgrade Batch 1 (Patch-Level & Low-Risk)

```bash
# Example: upgrade patch-level and minor-version safe updates
pip install --upgrade boto3 urllib3 requests
pip freeze > requirements.txt  # or update pyproject.toml
```

- [ ] Update `requirements.txt` or `pyproject.toml`.
- [ ] Run local tests:
  ```bash
  pytest tests/ -v
  ```
- [ ] Verify API endpoints still respond:
  ```bash
  uvicorn server:app --reload
  curl http://localhost:8000/health
  ```
- [ ] Commit: `build(deps): upgrade low-risk Python dependencies (batch 1)`.

### Step 3.2: Upgrade Batch 2 (Medium-Risk)

- [ ] Identify medium-risk upgrades (e.g., FastAPI minor version bump).
- [ ] Upgrade:
  ```bash
  pip install --upgrade fastapi
  ```
- [ ] Run full test suite:
  ```bash
  pytest tests/ -v --cov
  ```
- [ ] Test Bedrock integration (if applicable):
  ```bash
  # Manual smoke test or integration test
  ```
- [ ] Commit: `build(deps): upgrade medium-risk Python dependencies (batch 2)`.

### Step 3.3: Upgrade Batch 3 (High-Risk / Major Versions)

- [ ] Identify high-risk upgrades (e.g., Pydantic 1 → 2, FastAPI major bump).
- [ ] Review breaking changes in upstream documentation.
- [ ] Upgrade incrementally:
  ```bash
  pip install --upgrade pydantic
  ```
- [ ] Run full test suite + manual integration tests:
  ```bash
  pytest tests/ -v --cov
  # Manual test: create a conversation, verify response format
  ```
- [ ] Check for deprecation warnings:
  ```bash
  python -W all -m pytest tests/ 2>&1 | grep -i deprecat
  ```
- [ ] Commit: `build(deps): upgrade high-risk Python dependencies (batch 3)`.

### Step 3.4: Deferred Upgrades

- [ ] Document any packages deferred to a future sprint (e.g., major version jumps with extensive refactoring).
- [ ] Create a follow-up issue if needed.

---

## Phase 4: CI Validation & Merge (Day 3)

### Step 4.1: Push & Open PR

- [ ] Push all commits to feature branch: `minions/engineer/backend-python-audit`.
- [ ] Open a PR targeting `main`.
- [ ] PR title: `build(deps): audit and upgrade backend Python dependencies`.
- [ ] PR body: Include summary of changes, triage table, and testing notes.

### Step 4.2: CI Checks

- [ ] Confirm all GitHub Actions pass:
  - [ ] Linting (if applicable).
  - [ ] Unit tests.
  - [ ] Integration tests (if applicable).
  - [ ] Security scan (pip-audit in CI).
- [ ] Review any warnings or deprecation notices in CI logs.

### Step 4.3: Peer Review

- [ ] Request review from a peer engineer.
- [ ] Address any feedback or concerns.
- [ ] Ensure reviewer approves before merge.

### Step 4.4: Merge

- [ ] Squash or rebase commits as appropriate.
- [ ] Merge to `main` once CI is green and peer approval is obtained.
- [ ] Verify deployment (if auto-deploy is enabled).

---

## Known Compatibility Issues

### FastAPI ↔ Pydantic

- **Issue:** FastAPI 0.95+ requires Pydantic 2.0+, but Pydantic 2.0 has breaking changes.
- **Mitigation:** Upgrade both together, or use `pydantic.v1` compatibility layer.
- **Reference:** [FastAPI Migration Guide](https://fastapi.tiangolo.com/migration/)

### AWS SDK (boto3)

- **Issue:** boto3 API signatures may change between minor versions.
- **Mitigation:** Test Bedrock integration after upgrade; review boto3 changelog.
- **Reference:** [boto3 Changelog](https://github.com/boto/boto3/releases)

### Python 3.12 Compatibility

- **Issue:** Some older packages may not support Python 3.12.
- **Mitigation:** Verify package compatibility before upgrading; use `pip-audit` to flag issues.

---

## Rollback Plan

If a batch of upgrades causes test failures or regressions:

1. Revert the last commit:
   ```bash
   git revert HEAD
   ```
2. Investigate the root cause (check CI logs, test output).
3. Document the issue and defer the problematic package to a future sprint.
4. Commit the revert and update the PR.

---

## Sign-Off

- [ ] All tests pass locally and in CI.
- [ ] Peer review approved.
- [ ] PR merged to `main`.
- [ ] Deployment verified (if applicable).
- [ ] Checklist complete.

**Completed by:** [Engineer name]  
**Date:** [Date]  
**PR Link:** [Link to merged PR]

---

## Appendix: Useful Commands

```bash
# Install pip-audit
pip install pip-audit

# Run audit with descriptions
pip-audit --desc

# Check for outdated packages
pip list --outdated

# Freeze current environment
pip freeze > requirements.txt

# Run tests with coverage
pytest tests/ -v --cov=backend --cov-report=html

# Check for deprecation warnings
python -W all -m pytest tests/ 2>&1 | grep -i deprecat

# Start local API server
uvicorn server:app --reload --port 8000

# Test health endpoint
curl http://localhost:8000/health
```

---

*Checklist prepared for sprint week of 2025-07-14 | Part of TD-1 execution plan*
