# TD-2 · Root vs. Frontend `package.json` Rationalization

**Objective:** Resolve overlapping and misaligned dependencies between `package.json` (root) and `frontend/package.json` to prevent recurring merge conflicts and enable safe frontend npm upgrades.

**Effort:** 1–2 days  
**Sequencing:** Day 2–3 of sprint (after BUG-1 CI guard is merged)  
**Risk:** Low-Medium

---

## Current State

### Root `package.json` (10 dependencies)

```json
{
  "name": "twin",
  "version": "1.0.0",
  "description": "Personality Twin - Turn human expertise into an always-on AI persona",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@clerk/nextjs": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### Frontend `package.json` (13 dependencies)

Assumed to contain overlapping entries for `next`, `react`, `react-dom`, `@clerk/nextjs`, `typescript`, and `@types/*` packages, plus additional frontend-specific deps.

---

## Problem Statement

1. **Dual package.json structure** — Root and frontend both declare core dependencies (Next.js, React, TypeScript, Clerk).
2. **Version misalignment risk** — Different versions specified at root vs. frontend level can cause:
   - Merge conflicts during concurrent PRs (evidenced by commit `7dffcc8`)
   - Inconsistent build behavior
   - Unexpected transitive dependency resolution
3. **Unclear intent** — No documented reason for the split (monorepo workspace vs. legacy structure).
4. **Blocking next sprint** — Frontend npm upgrade cannot proceed safely until the boundary is clarified.

---

## Decision Tree

### Option A: Consolidate to Root (Recommended)

**When to choose:** If the project is not a true monorepo (i.e., backend and frontend are not separate publishable packages).

**Steps:**
1. Merge all dependencies from `frontend/package.json` into root `package.json`.
2. Remove or empty `frontend/package.json` (or delete it if no longer needed).
3. Update build scripts in root to reference frontend source correctly.
4. Validate:
   - `npm install` succeeds
   - `npm run build` produces frontend output
   - `npm run dev` starts Next.js on localhost:3000
   - CI passes

**Pros:**
- Single source of truth for all dependencies
- Eliminates merge conflict surface area
- Simpler CI/CD (one `package.json` to audit)
- Standard for single-app projects

**Cons:**
- Requires updating any scripts that reference `frontend/package.json` directly
- May require CI workflow adjustments

---

### Option B: Workspace (npm/yarn workspaces)

**When to choose:** If backend and frontend are truly separate packages or if you plan to publish either independently.

**Steps:**
1. Define root `package.json` as workspace root with `"workspaces": ["frontend", "backend"]`.
2. Move shared dev dependencies (TypeScript, ESLint, etc.) to root.
3. Keep frontend-specific runtime deps in `frontend/package.json`.
4. Document the workspace boundary clearly in `README.md`.
5. Validate:
   - `npm install` installs all workspace deps
   - `npm run build -w frontend` builds frontend
   - `npm run dev -w frontend` starts frontend
   - CI passes

**Pros:**
- Supports true monorepo structure
- Clearer separation of concerns
- Enables independent versioning if needed

**Cons:**
- More complex CI/CD
- Requires npm 7+ or yarn
- Workspace commands must be used consistently

---

### Option C: Document Intentional Split

**When to choose:** If there is a documented reason for the split (e.g., frontend is a separate deployment artifact).

**Steps:**
1. Add a comment block to both `package.json` files explaining the split.
2. Document in `README.md` or `ARCHITECTURE.md` why the split exists.
3. Add a CI check to validate that overlapping deps are version-aligned.
4. Validate:
   - Both `npm install` commands succeed independently
   - Versions of overlapping deps match
   - CI check passes

**Pros:**
- Preserves existing structure if there is a good reason
- Minimal refactoring

**Cons:**
- Does not eliminate merge conflict risk
- Requires ongoing manual alignment
- Defers the problem to the next sprint

---

## Recommended Approach: Option A (Consolidate to Root)

**Rationale:**
- The project is a single Next.js app (not a monorepo).
- Consolidation eliminates the merge conflict surface area immediately.
- It is the simplest and most maintainable long-term.
- It aligns with the sprint objective of "dependency clarity."

---

## Execution Checklist

### Pre-Work

- [ ] Create a new branch: `minions/engineer/consolidate-package-json`
- [ ] Ensure BUG-1 (CI Guard) is merged to `main` first
- [ ] Pull latest `main` to avoid conflicts

### Consolidation

- [ ] Open `frontend/package.json` and `package.json` side-by-side
- [ ] Identify all dependencies in `frontend/package.json`
- [ ] For each dependency:
  - [ ] If it exists in root, verify versions are compatible (prefer the higher version if safe)
  - [ ] If it does not exist in root, add it to root `package.json`
- [ ] Remove `frontend/package.json` or leave it empty (decide based on build tooling)
- [ ] Update any build scripts that reference `frontend/package.json` directly

### Validation

- [ ] Run `npm install` from root — should succeed without errors
- [ ] Run `npm run build` — should produce frontend output in `.next/` or equivalent
- [ ] Run `npm run dev` — should start Next.js on localhost:3000
- [ ] Run `npm run lint` — should pass
- [ ] Run `npm run type-check` — should pass
- [ ] Commit and push to feature branch
- [ ] Open PR targeting `main`
- [ ] Verify CI passes (BUG-1 guard should validate `package.json` integrity)
- [ ] Request peer review

### Post-Merge

- [ ] Verify `main` CI passes
- [ ] Update `README.md` if needed to reflect single `package.json` structure
- [ ] Document decision in `ARCHITECTURE.md` (optional but recommended)

---

## Rollback Procedure

If consolidation breaks the build:

1. Revert the commit: `git revert <commit-hash>`
2. Restore `frontend/package.json` from the previous commit
3. Investigate the root cause (likely a version incompatibility)
4. Re-attempt with a more conservative version strategy (e.g., use exact versions instead of caret ranges)

---

## Success Criteria

✅ Single `package.json` at root  
✅ `npm install` succeeds  
✅ `npm run build` produces valid output  
✅ `npm run dev` starts the app  
✅ All linting and type checks pass  
✅ CI green  
✅ Peer review approved  

---

## Next Steps

Once TD-2 is merged:
- TD-1 (Backend Python Audit) can proceed in parallel
- Next sprint: Frontend npm Dependency Audit & Upgrade (unblocked)

---

*Prepared for: Sprint Week of 2025-07-14 | Execution: Day 2–3*
