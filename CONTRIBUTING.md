# Contributing to Personality Twin

## Python Dependency Management

### Single Source of Truth: `pyproject.toml`

The backend uses a **single source of truth** for Python dependencies:

- **`backend/pyproject.toml`** — The authoring source. Edit this file when adding, removing, or updating dependencies.
- **`backend/requirements.txt`** — Auto-generated lock file with pinned versions and hashes. **Do not edit by hand.**
- **`backend/requirements-dev.txt`** — Auto-generated lock file for development dependencies. **Do not edit by hand.**

### Workflow

#### Adding or updating a dependency

1. Edit `backend/pyproject.toml`:
   - Add the package to the `dependencies` list (for production) or `[project.optional-dependencies] dev` (for development only).
   - Use a version specifier (e.g., `fastapi>=0.104.0,<0.105.0`) or pin to a specific version.

2. Regenerate the lock files:
   ```bash
   cd backend
   pip install pip-tools
   pip-compile --generate-hashes pyproject.toml
   pip-compile --generate-hashes --extra dev pyproject.toml -o requirements-dev.txt
   ```

3. Commit both `pyproject.toml` and the updated lock files (`requirements.txt`, `requirements-dev.txt`).

#### Installing dependencies locally

```bash
cd backend
# For production dependencies only:
pip install -r requirements.txt

# For development (includes test, lint, and type-check tools):
pip install -r requirements-dev.txt
```

#### Why this approach?

- **Reproducibility**: Lock files with hashes ensure every CI run and deployment installs identical versions.
- **Supply-chain security**: Hashes prevent tampering or unexpected version changes.
- **Single source of truth**: No more sync overhead between `pyproject.toml` and `requirements.txt`.
- **CI enforcement**: CI can use `pip install --require-hashes` to guarantee deterministic builds.

## Frontend Dependency Management

### Root vs. Frontend `package.json`

The project has two `package.json` files:

- **`package.json`** (root) — Shared tooling and workspace configuration (12 dependencies).
- **`frontend/package.json`** — Frontend-specific dependencies for Next.js, React, and related tools (13 dependencies).

### Rule: Where to add dependencies

- **Frontend code** (React components, Next.js pages, client-side utilities): Add to `frontend/package.json`.
- **Root-level tooling** (build scripts, CI helpers, shared dev tools): Add to `package.json` (root).
- **All new frontend code must use `.tsx` or `.ts`**: No new `.js` or `.mjs` files in the frontend.

### Workflow

1. Identify whether the dependency is frontend-specific or root-level.
2. Edit the appropriate `package.json`.
3. Run `npm install` from the root or `cd frontend && npm install` to update `package-lock.json`.
4. Commit both the `package.json` and `package-lock.json` changes.

## Code Style

### Python

- Format with `black` (line length: 100).
- Type hints encouraged; use `mypy` for checking.
- Lint with `flake8`.

### TypeScript / JavaScript

- Use TypeScript (`.ts`, `.tsx`) for all new frontend code.
- Format with Prettier (via ESLint config).
- No new `.js` or `.mjs` files in the frontend.

## Testing

### Python

```bash
cd backend
pytest
```

### Frontend

```bash
cd frontend
npm test
```

## Submitting a PR

1. Create a branch: `minions/<role>/<short-summary>`.
2. Make your changes and test locally.
3. Commit with a conventional commit message (e.g., `refactor: consolidate Python dependencies`).
4. Push and open a PR targeting `main`.
5. Ensure all CI checks pass.
6. Request review from a peer engineer.
7. After peer approval, the operator will review and merge.

## Questions?

Refer to the `ARCHITECTURE.md` and `RUNBOOK.md` for system design and operational guidance.
