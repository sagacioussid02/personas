# Contributing to Personality Twin

## Monorepo Package Boundary

This project uses a monorepo structure with two distinct package.json files:

### Root `package.json`

The root package.json (12 dependencies) contains **shared tooling and build infrastructure** only:
- Linting and formatting tools (eslint, prettier)
- Build and deployment utilities
- Shared development dependencies

**Rule:** Do not add application dependencies to the root package.json. The root is for tooling only.

### Frontend `package.json`

The frontend/package.json (13 dependencies) contains **all frontend application code dependencies**:
- React, Next.js, and related libraries
- UI component libraries
- Frontend-specific utilities

**Rule:** All new frontend code must use `.tsx` or `.ts` file extensions. Do not create new `.js` or `.mjs` files in the frontend directory.

## When to Edit Which File

| Change Type | Edit | Reason |
|---|---|---|
| Add a linting rule, formatter config, or build tool | Root `package.json` | Shared across the monorepo |
| Add a React component, utility, or library for the UI | Frontend `package.json` | Frontend-specific dependency |
| Add a backend Python dependency | `backend/pyproject.toml` | Backend uses Python, not npm |
| Add a TypeScript type definition | Frontend `package.json` | Frontend uses TypeScript |

## Backend Dependencies

Backend dependencies are managed in `backend/pyproject.toml` and locked in `backend/requirements.lock`. To add a new backend dependency:

1. Edit `backend/pyproject.toml` and add the dependency to the `dependencies` list
2. Run `uv pip compile backend/pyproject.toml -o backend/requirements.lock` to regenerate the lock file
3. Commit both `pyproject.toml` and `requirements.lock`

## Installing Dependencies

### Frontend

```bash
cd frontend
npm ci  # Use npm ci for reproducible installs in CI
npm install  # Use npm install locally to add new dependencies
```

### Backend

```bash
cd backend
pip install --require-hashes -r requirements.lock  # CI and production
pip install -e .  # Local development
```

## Code Style

- **Frontend:** TypeScript (.tsx, .ts only). Run `npm run lint` to check.
- **Backend:** Python 3.12+. Follow PEP 8.
- **Commits:** Use conventional commits (feat:, fix:, docs:, etc.)

## Testing

- Frontend: `npm test` (Jest)
- Backend: `pytest` (from backend directory)

## Before You Push

1. Run linters locally: `npm run lint` (frontend), `pylint` (backend)
2. Run tests: `npm test` (frontend), `pytest` (backend)
3. Ensure lock files are up to date
4. Use conventional commit messages
