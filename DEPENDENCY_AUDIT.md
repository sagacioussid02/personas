# TD-01: Dependency Audit & Upgrade Checklist

## Overview

Run `npm audit` and `pip-audit` across all three manifests, review breaking changes for FastAPI, Next.js, and AWS SDK libraries, and update lockfiles.

**This item is sequentially unblocked by BUG-01 — the lockfile must be verified clean before the audit baseline is meaningful.**

---

## Pre-Execution Setup

- [ ] Ensure BUG-01 (lockfile validation) has been merged to `main`
- [ ] Clone the repo and check out the latest `main` branch
- [ ] Verify Node.js version is 20+: `node --version`
- [ ] Verify npm version is current: `npm --version`
- [ ] Verify Python 3.12 is available: `python3 --version`
- [ ] Create a fresh branch for this work: `git checkout -b minions/engineer/dependency-audit-upgrade`

---

## Step 1: Root-Level npm Audit

### 1.1 Run npm audit on root package.json
```bash
npm audit
```
- [ ] Command completes
- [ ] Document the output: number of vulnerabilities by severity (low, moderate, high, critical)
- [ ] Note any packages with known vulnerabilities

### 1.2 Review high/critical vulnerabilities
```bash
npm audit --severity=high
```
- [ ] List all high/critical vulnerabilities
- [ ] For each vulnerability, document:
  - Package name and current version
  - Vulnerability description
  - Recommended fix version
  - Breaking changes (if any)

### 1.3 Assess upgrade feasibility
- [ ] For each high/critical vulnerability, determine if an upgrade is available
- [ ] Check the package changelog for breaking changes
- [ ] Document any packages that cannot be upgraded due to incompatibilities

---

## Step 2: Frontend npm Audit

### 2.1 Run npm audit on frontend/package.json
```bash
cd frontend
npm audit
```
- [ ] Command completes
- [ ] Document the output: number of vulnerabilities by severity
- [ ] Note any packages with known vulnerabilities

### 2.2 Review high/critical vulnerabilities
```bash
cd frontend
npm audit --severity=high
```
- [ ] List all high/critical vulnerabilities
- [ ] For each vulnerability, document:
  - Package name and current version
  - Vulnerability description
  - Recommended fix version
  - Breaking changes (if any)

### 2.3 Assess upgrade feasibility
- [ ] For each high/critical vulnerability, determine if an upgrade is available
- [ ] Check the package changelog for breaking changes
- [ ] Document any packages that cannot be upgraded due to incompatibilities
- [ ] Special attention to Next.js, React, and @clerk/nextjs upgrades

---

## Step 3: Backend Python Audit

### 3.1 Run pip-audit on backend/requirements.txt
```bash
cd backend
pip-audit -r requirements.txt
```
- [ ] Command completes
- [ ] Document the output: number of vulnerabilities by severity
- [ ] Note any packages with known vulnerabilities

### 3.2 Review high/critical vulnerabilities
```bash
cd backend
pip-audit -r requirements.txt --desc
```
- [ ] List all high/critical vulnerabilities
- [ ] For each vulnerability, document:
  - Package name and current version
  - Vulnerability description
  - Recommended fix version
  - Breaking changes (if any)

### 3.3 Assess upgrade feasibility
- [ ] For each high/critical vulnerability, determine if an upgrade is available
- [ ] Check the package changelog for breaking changes
- [ ] Document any packages that cannot be upgraded due to incompatibilities
- [ ] Special attention to FastAPI and AWS SDK upgrades

---

## Step 4: Dependency Upgrade Planning

### 4.1 Create upgrade plan

For each package with a high/critical vulnerability:

1. **Package:** [name]
   - **Current version:** [version]
   - **Recommended version:** [version]
   - **Breaking changes:** [yes/no, describe]
   - **Upgrade priority:** [critical/high/medium]
   - **Testing required:** [list specific tests]

- [ ] Upgrade plan is documented
- [ ] All high/critical vulnerabilities are addressed
- [ ] Breaking changes are identified and documented

### 4.2 Prioritize upgrades
- [ ] Critical vulnerabilities are prioritized first
- [ ] Upgrades with breaking changes are flagged for careful testing
- [ ] Upgrades with no breaking changes are grouped together

---

## Step 5: Execute Root-Level Upgrades

### 5.1 Upgrade packages
```bash
# For each package in the upgrade plan:
npm install <package>@<new-version>
```
- [ ] Each upgrade completes without errors
- [ ] `package.json` is updated with new versions
- [ ] `package-lock.json` is regenerated

### 5.2 Verify compatibility
```bash
npm ls
```
- [ ] No unmet peer dependencies
- [ ] No duplicate or conflicting versions
- [ ] All dependencies are resolved correctly

### 5.3 Run tests (if available)
```bash
npm run lint
npm run type-check
```
- [ ] Linting passes with no new errors
- [ ] Type checking passes with no new errors

---

## Step 6: Execute Frontend Upgrades

### 6.1 Upgrade packages
```bash
cd frontend
# For each package in the upgrade plan:
npm install <package>@<new-version>
```
- [ ] Each upgrade completes without errors
- [ ] `frontend/package.json` is updated with new versions
- [ ] `frontend/package-lock.json` is regenerated

### 6.2 Verify compatibility
```bash
cd frontend
npm ls
```
- [ ] No unmet peer dependencies
- [ ] No duplicate or conflicting versions
- [ ] All dependencies are resolved correctly

### 6.3 Run tests and build
```bash
cd frontend
npm run lint
npm run type-check
npm run build
```
- [ ] Linting passes with no new errors
- [ ] Type checking passes with no new errors
- [ ] Build completes successfully
- [ ] No critical warnings in build output

---

## Step 7: Execute Backend Upgrades

### 7.1 Upgrade packages
```bash
cd backend
# For each package in the upgrade plan:
pip install --upgrade <package>==<new-version>
```
- [ ] Each upgrade completes without errors
- [ ] `backend/requirements.txt` is updated with new versions

### 7.2 Verify compatibility
```bash
cd backend
pip check
```
- [ ] No dependency conflicts
- [ ] All dependencies are compatible

### 7.3 Run tests (if available)
```bash
cd backend
# If pytest is configured:
pytest
```
- [ ] Tests pass with no new failures
- [ ] No deprecation warnings

---

## Step 8: Post-Upgrade Validation

### 8.1 Run full audit suite
```bash
# Root
npm audit

# Frontend
cd frontend
npm audit

# Backend
cd backend
pip-audit -r requirements.txt
```
- [ ] Root npm audit reports zero high/critical vulnerabilities (or all remaining are documented)
- [ ] Frontend npm audit reports zero high/critical vulnerabilities (or all remaining are documented)
- [ ] Backend pip-audit reports zero vulnerabilities (or all remaining are documented)

### 8.2 Document accepted risks

For any remaining vulnerabilities:

1. **Package:** [name]
   - **Vulnerability:** [description]
   - **Reason for acceptance:** [rationale]
   - **Mitigation:** [how is this risk mitigated]
   - **Review date:** [when to re-evaluate]

- [ ] All remaining vulnerabilities are documented with accepted-risk rationale
- [ ] Mitigations are clear and verifiable

### 8.3 Smoke test

**Local smoke test:**

```bash
# Backend
cd backend
cp .env.example .env
# Fill in required env vars (or use test values)
uvicorn server:app --reload --port 8000 &

# Frontend
cd frontend
cp .env.local.example .env.local
# Fill in required env vars
npm run dev &

# Test basic functionality:
# - Homepage loads
# - API health check passes
# - No console errors
```

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Homepage loads in browser
- [ ] No console errors or warnings
- [ ] API health check passes (if available)

---

## Step 9: CI Validation

### 9.1 Verify CI will pass
- [ ] Push branch to remote: `git push origin minions/engineer/dependency-audit-upgrade`
- [ ] Open a PR targeting `main`
- [ ] Wait for CI to complete
- [ ] [ ] All CI checks pass (build, lint, type-check, audit, etc.)

### 9.2 Review CI logs
- [ ] No new warnings or errors in CI output
- [ ] All dependency checks pass
- [ ] Build artifacts are created successfully

---

## Step 10: Documentation & Commit

### 10.1 Create upgrade summary

Document the following in the PR description:

**Dependency Upgrade Summary:**

**Root-level upgrades:**
- [package]: [old version] → [new version] (breaking: yes/no)
- [package]: [old version] → [new version] (breaking: yes/no)

**Frontend upgrades:**
- [package]: [old version] → [new version] (breaking: yes/no)
- [package]: [old version] → [new version] (breaking: yes/no)

**Backend upgrades:**
- [package]: [old version] → [new version] (breaking: yes/no)
- [package]: [old version] → [new version] (breaking: yes/no)

**Audit Results:**
- Root: [X] high/critical vulnerabilities → [Y] (resolved: [list])
- Frontend: [X] high/critical vulnerabilities → [Y] (resolved: [list])
- Backend: [X] high/critical vulnerabilities → [Y] (resolved: [list])

**Accepted Risks:**
- [package]: [vulnerability] (reason: [rationale])

**Testing:**
- Linting: ✓ Pass
- Type checking: ✓ Pass
- Frontend build: ✓ Pass
- Backend health check: ✓ Pass
- Smoke test: ✓ Pass
- CI: ✓ Pass

- [ ] Summary is complete and accurate
- [ ] All changes are documented

### 10.2 Commit changes
```bash
git add package.json package-lock.json frontend/package.json frontend/package-lock.json backend/requirements.txt
git commit -m "build: audit and upgrade npm and Python dependencies

Executed full dependency audit across root, frontend, and backend:
- Root: upgraded [X] packages, resolved [Y] high/critical vulnerabilities
- Frontend: upgraded [X] packages, resolved [Y] high/critical vulnerabilities
- Backend: upgraded [X] packages, resolved [Y] high/critical vulnerabilities

All lockfiles updated and verified:
- npm ci runs cleanly in fresh environment
- Frontend build passes without errors
- Backend health check passes
- Smoke test passes with no regressions
- CI passes on all checks

Accepted risks documented for [X] remaining vulnerabilities.

Closes TD-01"
```
- [ ] Commit message is clear and references TD-01
- [ ] All dependency changes are committed

---

## Acceptance Criteria (Final Verification)

- [ ] `npm audit` reports zero high/critical vulnerabilities (or all remaining are documented with accepted-risk rationale)
- [ ] `pip-audit` clean on `backend/requirements.txt`
- [ ] All three lockfiles updated and committed
- [ ] CI passes on updated deps
- [ ] No runtime regressions in local smoke test
- [ ] Frontend build completes successfully
- [ ] Backend health check passes
- [ ] PR is ready for peer review

---

## Troubleshooting

### Issue: Upgrade introduces breaking changes
**Solution:** Review the package changelog carefully. Update code to use the new API. Run tests to verify compatibility. Document the breaking change in the PR description.

### Issue: Peer dependency conflict
**Solution:** Check the peer dependency requirements. You may need to upgrade multiple packages together. Use `npm ls` to identify the conflict.

### Issue: Frontend build fails after upgrade
**Solution:** Check the build error message. Common causes include API changes in Next.js or React. Review the package changelog and update code accordingly.

### Issue: Backend import errors after upgrade
**Solution:** Check the import error message. Common causes include API changes in FastAPI or AWS SDK. Review the package changelog and update code accordingly.

### Issue: Smoke test fails
**Solution:** Check the error message. Verify that environment variables are set correctly. Check backend and frontend logs for specific errors. Revert the problematic upgrade and investigate further.

### Issue: CI fails on updated deps
**Solution:** Check the CI logs for specific error messages. Common causes include missing environment variables, incorrect versions, or incompatible dependencies. Verify the lockfiles are correct and commit any missing changes.

---

*Checklist prepared for sprint item TD-01. Follow in order and check off each step as completed. This item is sequentially unblocked by BUG-01.*
