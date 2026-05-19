# BUG-01: Lockfile Cleanup & Validation Checklist

## Overview

Commit `7dffcc8` explicitly resolves a `package.json` merge conflict from PR #51/#53. Merge conflict resolutions can silently drop dependencies, misalign versions between `package.json` and lockfiles, or leave the dependency tree in an inconsistent state.

**This checklist ensures the lockfile is verified clean before any dependency upgrade work begins.**

---

## Pre-Execution Setup

- [ ] Clone the repo and check out the latest `main` branch
- [ ] Verify Node.js version is 20+: `node --version`
- [ ] Verify npm version is current: `npm --version`
- [ ] Create a fresh branch for this work: `git checkout -b minions/engineer/lockfile-validation`

---

## Step 1: Verify `package.json` Integrity

### 1.1 Check for syntax errors
```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('package.json', 'utf8')))"
```
- [ ] Command succeeds with no JSON parse errors
- [ ] All expected dependencies are present

### 1.2 Compare against pre-conflict state (if available)
```bash
git show 7dffcc8^:package.json > /tmp/package.json.pre-conflict
diff -u /tmp/package.json.pre-conflict package.json
```
- [ ] Review the diff for any unexpected removals or version changes
- [ ] Document any intentional changes in the PR description

### 1.3 Verify dependency versions are valid semver
```bash
node -e "const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8')); Object.entries({...pkg.dependencies, ...pkg.devDependencies}).forEach(([k,v]) => console.log(k, v))"
```
- [ ] All versions follow valid semver patterns (e.g., `^14.0.4`, `18.2.0`, `>=20.0.0`)
- [ ] No malformed or empty version strings

---

## Step 2: Validate `package-lock.json` Consistency

### 2.1 Remove and regenerate lockfile
```bash
rm package-lock.json
npm install --package-lock-only
```
- [ ] Command completes without errors
- [ ] `package-lock.json` is regenerated

### 2.2 Check for lockfile drift
```bash
git diff package-lock.json | head -50
```
- [ ] Review the diff for unexpected changes
- [ ] If the diff is large, investigate whether dependencies were silently dropped or added
- [ ] Document any significant changes

### 2.3 Verify lockfile format
```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('package-lock.json', 'utf8')).lockfileVersion)"
```
- [ ] Lockfile version is consistent with npm version (typically v3 for npm 9+)

---

## Step 3: Fresh Install Test

### 3.1 Clean install in a temporary directory
```bash
mkdir /tmp/twin-fresh-install
cd /tmp/twin-fresh-install
git clone <repo-url> .
git checkout <branch-name>
npm ci
```
- [ ] `npm ci` completes without errors
- [ ] No warnings about missing or conflicting dependencies
- [ ] `node_modules/` is populated correctly

### 3.2 Verify installed versions match lockfile
```bash
npm ls --depth=0
```
- [ ] All top-level dependencies are installed
- [ ] No unmet peer dependencies
- [ ] No duplicate or conflicting versions

---

## Step 4: Frontend-Specific Validation

### 4.1 Check frontend package.json
```bash
cd frontend
node -e "console.log(JSON.parse(require('fs').readFileSync('package.json', 'utf8')))"
```
- [ ] Frontend `package.json` is valid JSON
- [ ] All expected dependencies are present

### 4.2 Frontend fresh install
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install --package-lock-only
npm ci
```
- [ ] `npm ci` completes without errors
- [ ] No warnings about missing or conflicting dependencies

### 4.3 Verify Next.js build
```bash
cd frontend
npm run build
```
- [ ] Build completes without errors
- [ ] No critical warnings in build output
- [ ] `.next/` directory is created

---

## Step 5: Backend-Specific Validation

### 5.1 Check backend requirements.txt
```bash
cd backend
cat requirements.txt | grep -v '^#' | grep -v '^$'
```
- [ ] All dependencies are listed with valid version specifiers
- [ ] No duplicate entries

### 5.2 Verify Python environment (optional, if Python is available)
```bash
cd backend
python3 -m venv /tmp/twin-venv
source /tmp/twin-venv/bin/activate
pip install -r requirements.txt
```
- [ ] All Python dependencies install without errors
- [ ] No version conflicts or missing dependencies

---

## Step 6: CI Validation

### 6.1 Run local linting (if configured)
```bash
npm run lint
```
- [ ] Linting passes with no errors
- [ ] No new linting warnings introduced

### 6.2 Run type checking (if configured)
```bash
npm run type-check
```
- [ ] Type checking passes with no errors
- [ ] No new type errors introduced

### 6.3 Verify CI will pass
- [ ] Push branch to remote: `git push origin minions/engineer/lockfile-validation`
- [ ] Open a PR targeting `main`
- [ ] Wait for CI to complete
- [ ] [ ] All CI checks pass (build, lint, type-check, etc.)

---

## Step 7: Documentation & Commit

### 7.1 Document findings
- [ ] Create a summary of any changes made to `package.json` or lockfiles
- [ ] Note any dependencies that were dropped, added, or version-bumped
- [ ] Document any warnings or issues encountered and how they were resolved

### 7.2 Commit changes
```bash
git add package.json package-lock.json frontend/package.json frontend/package-lock.json
git commit -m "build: validate and regenerate lockfiles post-merge-conflict resolution

- Regenerated package-lock.json from package.json
- Verified no dependencies were silently dropped
- Confirmed npm ci runs cleanly in fresh environment
- Frontend build passes without errors
- All CI checks pass

Closes BUG-01"
```
- [ ] Commit message is clear and references BUG-01
- [ ] All lockfile changes are committed

---

## Acceptance Criteria (Final Verification)

- [ ] `npm ci` runs cleanly in a fresh environment with zero errors
- [ ] `package-lock.json` is consistent with `package.json`
- [ ] No dependencies were silently dropped or duplicated vs. the pre-conflict state
- [ ] CI build passes on a clean runner
- [ ] Frontend build completes successfully
- [ ] All type checks pass
- [ ] PR is ready for peer review

---

## Troubleshooting

### Issue: `npm ci` fails with version mismatch
**Solution:** Run `npm install --package-lock-only` to regenerate the lockfile, then commit the changes.

### Issue: Frontend build fails
**Solution:** Check for missing dependencies in `frontend/package.json`. Run `npm ls --depth=0` to identify unmet peer dependencies.

### Issue: Large lockfile diff
**Solution:** This is expected if the merge conflict affected many dependencies. Review the diff carefully and document any significant changes in the PR description.

### Issue: CI fails on a clean runner
**Solution:** Investigate the CI logs for specific error messages. Common causes include missing environment variables, incorrect Node.js version, or missing dependencies.

---

*Checklist prepared for sprint item BUG-01. Follow in order and check off each step as completed.*
