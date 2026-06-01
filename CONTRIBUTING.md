# Contributing to Personality Twin

Thanks for helping build the future of AI personas. This guide covers how to contribute code, documentation, and ideas to the project.

---

## Getting Started

### Prerequisites

- Node 20+ (for frontend)
- Python 3.12+ (for backend)
- AWS credentials with Bedrock access (for full local testing)
- Clerk account (free tier works)

### Local Setup

#### Backend

```bash
cd backend
pip install -r requirements.txt      # or: uv pip install -r requirements.txt
cp .env.example .env
# Fill in: CLERK_JWKS_URL, SESSION_HMAC_SECRET (64-char hex)
# Optional: USE_S3=false for local disk storage
uvicorn server:app --reload --port 8000
```

#### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Fill in: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
npm run dev
```

Frontend runs at `http://localhost:3000`; backend at `http://localhost:8000`.

---

## Monorepo Package.json Boundary

This project uses a monorepo structure with two separate `package.json` files:

- **Root `package.json`** (12 dependencies) — Shared tooling, build scripts, and workspace-level dependencies
  - Use this for: workspace management, linting, type-checking, testing frameworks, and build tools
  - Examples: `typescript`, `eslint`, `jest`, `next`

- **Frontend `package.json`** (`frontend/package.json`, 13 dependencies) — Frontend-specific dependencies
  - Use this for: React, Next.js plugins, UI libraries, and frontend utilities
  - Examples: `@clerk/nextjs`, `react`, `react-dom`

**Rule:** All new frontend code must use `.tsx` or `.ts` files. Do not add new `.js` or `.mjs` files to the frontend.

**When in doubt:** If your change is frontend-specific (React components, Next.js pages, UI logic), edit `frontend/package.json`. If it's a shared tool or workspace-level dependency, edit the root `package.json`.

---

## Code Style and Standards

### TypeScript

- Use strict mode (`"strict": true` in `tsconfig.json`)
- Prefer explicit types over `any`
- Run `npm run type-check` before committing

### Python

- Follow PEP 8 (use `black` for formatting)
- Use type hints where possible
- Run `pytest` before committing

### Linting

```bash
# Frontend
cd frontend
npm run lint

# Backend
cd backend
pylint server.py  # or your module
```

---

## Automated Workflows and CI Gates

This project uses automated workflows to maintain code quality and security. Understand the gates before submitting a PR.

### Automated Workflows

Five automated workflows run on every PR:

1. **`claude-code-review.yml`** — AI-powered code review (informational comments only)
2. **`claude-fix.yml`** — Automated fixes for linting and formatting (requires manual trigger)
3. **`claude.yml`** — General-purpose AI analysis (manual trigger only)
4. **`auto-pr.yml`** — Opens PRs for approved changes (requires human review before merge)
5. **`pr-responder.yml`** — Automated PR responses (informational only)

**Key Point:** Automated workflows provide feedback and suggestions, but **human review and approval are always required** before code is merged or deployed.

### Required Status Checks (Blocking Merge)

The following checks must pass before your PR can be merged:

- **`secrets-scan.yml`** — Ensures no secrets or API keys are committed
- **`security-scan.yml`** — Scans for known vulnerabilities
- **All tests** — Unit, integration, and e2e tests must pass

**Before merging:** Verify all required checks are green (✅) in the PR status.

### Human Approval Gates

1. **PR Review:** At least one peer engineer must review and approve your PR
2. **Operator Review:** After peer approval and green CI, the operator reviews before merge
3. **Deployment:** Deployments require explicit human approval (no automated deploy from automated PRs)

See `CI_WORKFLOWS.md` for detailed trigger conditions and governance rules.

---

## Submitting a PR

### Branch Naming

Create a feature branch from `main`:

```bash
git checkout -b minions/<role>/<short-summary>
# Examples:
# minions/engineer/add-chat-error-handling
# minions/cloud_devops/fix-lambda-cold-start
```

### Commit Messages

Use Conventional Commits:

```
feat: add persona creation onboarding flow
fix: handle Bedrock throttling errors gracefully
chore: consolidate Python dependencies
docs: add architecture and runbook documentation
```

### PR Description

Include:

- **What:** Brief description of the change
- **Why:** Context and motivation
- **How:** Implementation approach
- **Testing:** How you tested the change
- **Checklist:**
  - [ ] Code follows style guidelines
  - [ ] Tests pass locally (`npm test`, `pytest`)
  - [ ] No new secrets or sensitive data committed
  - [ ] Documentation updated (if applicable)
  - [ ] Required status checks pass in CI

### Review Process

1. **Peer Review:** A peer engineer reviews your code for correctness, style, and security
2. **CI Verification:** Automated checks must pass (secrets-scan, security-scan, tests)
3. **Operator Review:** After peer approval, the operator reviews for alignment with project goals
4. **Merge:** Only the operator or designated maintainer merges PRs

**Do not merge your own work.** All PRs require peer review and operator approval.

---

## Testing

### Frontend Tests

```bash
cd frontend
npm test
```

### Backend Tests

```bash
cd backend
pytest
```

### Running Locally

Before submitting a PR, test your changes end-to-end:

1. Start the backend: `cd backend && uvicorn server:app --reload`
2. Start the frontend: `cd frontend && npm run dev`
3. Test the feature in your browser at `http://localhost:3000`
4. Check the backend logs for errors
5. Run linters and tests

---

## Documentation

Update documentation when you:

- Add a new feature or API endpoint
- Change how something works
- Add a new environment variable
- Document a known limitation or workaround

**Key docs:**
- `README.md` — Project overview and quick start
- `ARCHITECTURE.md` — System design and request flow
- `RUNBOOK.md` — Operational procedures and incident response
- `CI_WORKFLOWS.md` — Automated workflow governance and security gates
- `CONTRIBUTING.md` — This file

---

## Reporting Issues

Found a bug or have a feature idea? Open an issue with:

- **Title:** Clear, concise description
- **Description:** What happened, what you expected, and how to reproduce
- **Environment:** OS, Node/Python version, AWS region, etc.
- **Logs:** Relevant error messages or stack traces

---

## Code of Conduct

Be respectful, inclusive, and constructive. We're building something great together.

---

## Questions?

Reach out to the team:

- **Engineering Lead:** For code and architecture questions
- **Cloud DevOps Lead:** For infrastructure and CI/CD questions
- **Product Owner:** For feature and priority questions
- **Operator:** For deployment and governance questions
