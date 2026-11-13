# Contributing to Personality Twin

Welcome to the twin project. This guide covers local setup, the build pipeline, contribution workflow, and how we make decisions as a team.

## Quick Start

See the [README](./README.md) for local setup (Node 20+, Python 3.12+, Clerk account, AWS credentials).

## Contribution Workflow

### Before You Start

1. **Check the backlog** — Is the work already tracked? If not, file an issue.
2. **Assign yourself** — Let the team know you're working on it.
3. **Check for Decision Records** — If the work is material (new feature, dependency upgrade, infra change, team change), it needs DR approval. See [DECISIONS.md](./DECISIONS.md).
4. **Create a feature branch** — Use the naming pattern: `minions/<role>/<short-summary>`

### During Development

1. **Write code** — Follow the language-specific guides below.
2. **Run tests and linters locally** — No surprises in CI.
3. **Commit with conventional messages** — See [COMMIT_STANDARDS.md](./COMMIT_STANDARDS.md).
4. **Keep commits focused** — One logical change per commit.
5. **Update lock files** — `npm ci` (frontend), `uv pip compile` (backend).

### Before You Push

1. **Read your own diff** — Catch obvious issues before review.
2. **Run full test suite:**
   - Frontend: `npm run type-check && npm run lint && npm test && npm run build`
   - Backend: `pylint backend/ && pytest`
3. **Ensure lock files are committed** — These are required for reproducible builds.

### Opening a Pull Request

1. Push your branch: `git push origin minions/engineer/my-feature`
2. Open PR against `main` (not `production`)
3. Title should match your commit message (conventional format)
4. Body should explain: what, why, testing approach
5. Link any related issues

### Code Review

- **Peer engineer reviews first** — Checks logic, style, and test coverage
- **Operator reviews second** — Verifies alignment and approves merge
- **Respond to feedback** — Either push a fix commit or explain your reasoning
- **All CI must pass** — Green tests and linters required
- **You cannot merge your own PR** — Even if approved, wait for another engineer or operator to merge

See [COMMIT_STANDARDS.md](./COMMIT_STANDARDS.md) for detailed review expectations.

## Monorepo Package Boundaries

This project uses a monorepo structure with distinct responsibilities:

### Root `package.json` (Tooling Only)

The root contains **shared build and development tools**:
- Linting (ESLint, Prettier)
- Build utilities
- Shared dev dependencies

**Rule:** Do not add application dependencies here. The root is for tooling only.

### Frontend `package.json` (Application Dependencies)

The frontend contains **all UI application code and libraries**:
- React, Next.js
- UI components and utilities
- Frontend-specific tools

**Rule:** All new frontend code must use `.tsx` or `.ts` extensions. No `.js` or `.mjs` files in the frontend directory.

### Backend `pyproject.toml` (Backend Dependencies)

The backend uses Python and is managed via `pyproject.toml`:
- FastAPI, Bedrock client libraries
- Backend-specific utilities
- Locked in `requirements.lock` for reproducible builds

**To add a backend dependency:**

```bash
# 1. Edit backend/pyproject.toml and add the package
# 2. Regenerate the lock file
cd backend
uv pip compile pyproject.toml -o requirements.lock
# 3. Commit both pyproject.toml and requirements.lock
```

## Language-Specific Guidelines

### Frontend (TypeScript / Next.js / React)

- **File extensions:** `.tsx` for components, `.ts` for utilities. No `.js` or `.mjs`.
- **Type safety:** Use TypeScript; avoid `any` unless unavoidable.
- **Testing:** Jest unit tests in `__tests__` or alongside source.
- **Linting:** `npm run lint` (ESLint + Prettier)
- **Build:** `npm run build` catches issues early.
- **Clerk integration:** Follow the @clerk/nextjs docs for auth.

**Example component:**

```typescript
// frontend/components/ChatMessage.tsx
import React from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content }) => {
  return (
    <div className={`message message-${role}`}>
      {content}
    </div>
  );
};
```

### Backend (Python / FastAPI)

- **Python version:** 3.12+
- **Style:** PEP 8. Run `pylint` locally.
- **Type hints:** Use for function signatures and complex logic.
- **Testing:** `pytest` with fixtures for Bedrock mocking.
- **Environment:** Use `.env` for local secrets (not committed). See `backend/.env.example`.

**Example FastAPI endpoint:**

```python
# backend/routes/chat.py
from fastapi import APIRouter, HTTPException
from app.services.bedrock import invoke_model

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/")
async def chat(user_id: str, message: str):
    """Send a message to a personality twin."""
    try:
        response = await invoke_model(user_id, message)
        return {"role": "assistant", "content": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Installing Dependencies

### Frontend

```bash
cd frontend
npm ci        # Use npm ci for reproducible installs (CI & production)
npm install   # Use npm install locally when adding new deps
```

### Backend

```bash
cd backend
pip install --require-hashes -r requirements.lock  # CI & production
pip install -e .                                   # Local development
```

## Code Style

- **Commits:** Conventional commits (feat:, fix:, docs:, etc.). See [COMMIT_STANDARDS.md](./COMMIT_STANDARDS.md).
- **Frontend:** TypeScript, ESLint, Prettier. Run `npm run lint`.
- **Backend:** Python 3.12+, PEP 8. Run `pylint`.
- **Documentation:** Clear, present tense, examples where helpful.
- **Comments:** Explain *why*, not *what* (the code shows what).

## Testing

### Frontend

```bash
cd frontend
npm test                   # Jest
npm run type-check         # TypeScript
npm run lint               # ESLint + Prettier
npm run build              # Catch production issues
```

### Backend

```bash
cd backend
pytest                     # Unit & integration tests
pylint **/*.py             # Code style
```

## Decision Records

Material changes require a Decision Record (DR) and operator approval. See [DECISIONS.md](./DECISIONS.md) for:

- When a DR is required (features, deps, infra, team changes)
- How to propose one
- Approval workflow

## Code Ownership

See [CODEOWNERS](./CODEOWNERS) for domain ownership and review requirements.

## Local Development Setup

### Backend (FastAPI + Python)

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a Python virtual environment:**
   ```bash
   python3.12 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies from the lock file:**
   ```bash
   pip install -r requirements.lock
   ```

   > **Note:** `requirements.lock` is auto-generated from `pyproject.toml` via `uv pip compile`. It is the source of truth for reproducible builds. Do not edit it directly.

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `CLERK_JWKS_URL` — From your Clerk dashboard → API Keys
   - `SESSION_HMAC_SECRET` — 64-char hex. Generate with:
     ```bash
     python -c "import secrets; print(secrets.token_hex(32))"
     ```

   Optional:
   - `USE_S3=false` — Use local disk instead of S3 (fine for dev)

5. **Run the development server:**
   ```bash
   uvicorn server:app --reload --port 8000
   ```

   API is now at `http://localhost:8000`. Visit `/docs` for the auto-generated Swagger UI.

### Frontend (Next.js + React)

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies using npm ci (enforces lock file):**
   ```bash
   npm ci
   ```

   > **Note:** `package-lock.json` is committed and enforced in CI. Use `npm ci` for reproducible installs. Only use `npm install` if you intentionally update dependencies, then commit the updated lock file.

3. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```

   Required variables:
   - `NEXT_PUBLIC_API_URL=http://localhost:8000`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...` (from Clerk dashboard)

4. **Run the development server:**
   ```bash
   npm run dev
   ```

   App is now at `http://localhost:3000`.

## Build Pipeline

### Python Dependency Management

**Single source of truth:** `backend/pyproject.toml`

- All Python dependencies are declared in `pyproject.toml`
- `requirements.lock` is generated via `uv pip compile` in CI and committed for reproducibility
- CI enforces that `requirements.lock` matches the generated output from `pyproject.toml`
- If you add or update a Python dependency:
  1. Edit `backend/pyproject.toml`
  2. Regenerate `requirements.lock` locally:
     ```bash
     cd backend
     uv pip compile pyproject.toml -o requirements.lock
     ```
  3. Commit both files

### Node Dependency Management

**Single source of truth:** `frontend/package-lock.json`

- Use `npm ci` for reproducible installs (CI and local dev)
- Use `npm install` only when intentionally updating dependencies
- Always commit the updated `package-lock.json` after running `npm install`

### Running CI Checks Locally

**Backend:**
```bash
cd backend

# Linting
ruff check .

# Type checking
mypy server

# Tests
pytest

# Code formatting (check only)
black --check .
```

**Frontend:**
```bash
cd frontend

# Linting
npm run lint

# Type checking
npm run type-check

# Tests
npm test
```

## Deployment

### Staging Deployment

1. **Ensure all tests pass locally:**
   ```bash
   # Backend
   cd backend && pytest

   # Frontend
   cd frontend && npm test
   ```

2. **Push to a feature branch:**
   ```bash
   git checkout -b feature/your-feature
   git push origin feature/your-feature
   ```

3. **Open a pull request** targeting `main`

4. **CI will automatically:**
   - Run all tests
   - Validate dependency manifests
   - Build Lambda artifact
   - Build frontend bundle

5. **After approval and CI passes**, merge to `main` to trigger staging deployment

### Production Deployment

Production deployments are managed by the DevOps team via the `destroy.yml` and deployment workflows. Contact the team for production release procedures.

## Project Structure

```
twin/
├── backend/                    # FastAPI application
│   ├── pyproject.toml         # Python dependencies (source of truth)
│   ├── requirements.lock      # Generated lock file (auto-generated in CI)
│   ├── server/                # FastAPI app code
│   └── tests/                 # Backend tests
├── frontend/                  # Next.js application
│   ├── package.json           # Node metadata
│   ├── package-lock.json      # Node lock file (committed, enforced in CI)
│   ├── app/                   # Next.js app directory
│   └── __tests__/             # Frontend tests
├── ARCHITECTURE.md            # System architecture diagram
├── CONTRIBUTING.md            # This file
└── README.md                  # Project overview
```

## Common Issues

### "ModuleNotFoundError" or import errors in backend

**Cause:** Virtual environment not activated or dependencies not installed.

**Fix:**
```bash
cd backend
source venv/bin/activate  # or: venv\Scripts\activate on Windows
pip install -r requirements.lock
```

### "Cannot find module" errors in frontend

**Cause:** Dependencies not installed or lock file out of sync.

**Fix:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm ci
```

### Lambda build fails with dependency errors

**Cause:** `requirements.lock` out of sync with `pyproject.toml`.

**Fix:**
```bash
cd backend
uv pip compile pyproject.toml -o requirements.lock
git add requirements.lock
git commit -m "chore: regenerate requirements.lock"
```

### CI validation fails: "requirements.lock does not match generated output"

**Cause:** You edited `requirements.lock` directly or `pyproject.toml` changed without regenerating.

**Fix:**
```bash
cd backend
uv pip compile pyproject.toml -o requirements.lock
git add requirements.lock
git commit -m "chore: regenerate requirements.lock"
```

## Architecture & Ops

- **System design:** See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full stack breakdown (CloudFront, Lambda, Bedrock, S3).
- **Deployment:** See [docs/operations/](./docs/operations/) for runbooks and operational procedures.

## Getting Help

- Check `ARCHITECTURE.md` for system design details
- Review `LESSONS_LEARNED.md` for known issues and workarounds
- Open an issue on GitHub with reproduction steps
- Reach out to the team on Slack

## Code Review Guidelines

- All PRs require at least one approval before merge
- CI must pass (tests, linting, type checks, dependency validation)
- Dependency changes must include updated lock files
- Documentation updates should accompany code changes

Thank you for contributing to Personality Twin!