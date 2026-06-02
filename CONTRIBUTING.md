# Contributing to Personality Twin

Welcome! This guide covers local setup, the build pipeline, and deployment for Personality Twin.

## Prerequisites

- **Node.js** 20+ (for frontend)
- **Python** 3.12+ (for backend)
- **AWS credentials** with Bedrock access (for chat features)
- **Clerk account** (free tier works for local dev)
- **Git** (for version control)

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
   pip install -r requirements.txt
   ```
   
   > **Note:** `requirements.txt` is auto-generated from `pyproject.toml` via `pip-compile`. It is the source of truth for reproducible builds. Do not edit it directly.

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
- `requirements.txt` is generated via `pip-compile` in CI and committed for reproducibility
- CI enforces that `requirements.txt` matches the generated output from `pyproject.toml`
- If you add or update a Python dependency:
  1. Edit `backend/pyproject.toml`
  2. Regenerate `requirements.txt` locally:
     ```bash
     cd backend
     pip install pip-compile  # if not already installed
     pip-compile pyproject.toml
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
│   ├── requirements.txt       # Generated lock file (auto-generated in CI)
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
pip install -r requirements.txt
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

**Cause:** `requirements.txt` out of sync with `pyproject.toml`.

**Fix:**
```bash
cd backend
pip-compile pyproject.toml
git add requirements.txt
git commit -m "chore: regenerate requirements.txt"
```

### CI validation fails: "requirements.txt does not match generated output"

**Cause:** You edited `requirements.txt` directly or `pyproject.toml` changed without regenerating.

**Fix:**
```bash
cd backend
pip-compile pyproject.toml
git add requirements.txt
git commit -m "chore: regenerate requirements.txt"
```

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
