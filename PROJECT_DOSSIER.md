---
generated_at: 2026-07-05T10:57:31.929428+00:00
commit_sha: f82d0c79979ca039a32cc71f38d41f5ebe5e413e
crew: discoverer/v1
sections_present: [architecture, data, infra, security, hot_spots, tech_debt, incidents, questions]
---

# Architecture

The project is a full-stack "Personality Twin" platform composed of a Next.js frontend, a FastAPI/Python backend, and AWS-managed infrastructure, all wired together through a serverless deployment model.

## Frontend

The frontend is a Next.js 15 application (`frontend/package.json:1-3`) written in TypeScript, deployed to Vercel (`frontend/vercel.json`). Routing and middleware are handled by Next.js App Router (`frontend/app/`) with a custom middleware layer at `frontend/middleware.ts`. The Vercel configuration rewrites all API calls to the backend:

```
frontend/vercel.json
```

Static assets are served from `frontend/public/`. UI components live in `frontend/components/` and shared utilities in `frontend/lib/`. Styling uses PostCSS (`frontend/postcss.config.mjs`).

Key frontend dependencies include Clerk for authentication, React, and Tailwind CSS (`frontend/package.json`).

## Backend

The backend is a Python 3.12 FastAPI application (`backend/pyproject.toml`, `backend/.python-version`). It has two entry points:

- **HTTP server**: `backend/server.py` — runs the FastAPI app for local development and direct invocation.
- **AWS Lambda handler**: `backend/lambda_handler.py` — wraps the FastAPI app for serverless execution via AWS Lambda + API Gateway.

Core backend modules:

| File | Responsibility |
|---|---|
| `backend/agent_orchestrator.py` | Coordinates multi-agent interactions |
| `backend/personality_agent.py` | Core agent logic for a personality twin |
| `backend/context.py` | Manages conversation/session context |
| `backend/source_memory.py` | Retrieves and manages source memory for a twin |
| `backend/resources.py` | AWS resource references (S3, Bedrock, etc.) |
| `backend/errors.py` | Centralised error types and user-facing error handling (`backend/errors.py`) |
| `backend/deploy.py` | Deployment helper utilities |

Personality definitions are stored as text files under `backend/personalities/` and `backend/public_personas/`. Per-twin data lives under `backend/twins/`. A sample persona description is at `backend/me.txt`.

The backend uses `uv` for dependency management (`backend/uv.lock`, `backend/pyproject.toml`) and lists pinned runtime dependencies in `backend/requirements.txt`.

Key backend dependencies include `fastapi`, `boto3`/`botocore` (AWS SDK), `anthropic` (Claude API), and `mangum` (Lambda adapter) (`backend/requirements.txt`).

## Infrastructure

Infrastructure is managed with Terraform (`terraform/`):

| File | Purpose |
|---|---|
| `terraform/main.tf` | Core AWS resources (Lambda, API Gateway, S3, CloudFront) |
| `terraform/backend.tf` | Remote state backend configuration |
| `terraform/variables.tf` | Input variable declarations |
| `terraform/outputs.tf` | Stack output values |
| `terraform/versions.tf` | Provider and Terraform version constraints |
| `terraform/terraform.tfvars` | Variable values |

A disabled backend setup note exists at `terraform/.disabled_backend-setup.txt`. Deployment and teardown are scripted at `scripts/deploy.sh` and `scripts/destroy.sh`.

CI/CD pipelines are defined in `.github/workflows/`:

- `deploy.yml` — production deployment
- `destroy.yml` — infrastructure teardown
- `build-artifacts.yml` — artifact packaging
- `claude.yml` / `claude-fix.yml` — AI-assisted PR workflows
- `auto-pr.yml` — automated PR creation
- `pr-responder.yml` — PR comment automation
- `secrets-scan.yml` / `security-scan.yml` — security gates

## API Contract

The OpenAPI specification and change-management process live under `openspec/` (`openspec/config.yaml`, `openspec/changes/`), providing a versioned contract between frontend and backend.

---

# Data model & flows

## Core entities

### Personality / Twin

A "twin" is the central entity. Its definition is stored as structured text files:

- **Personality definitions**: `backend/personalities/` — one file per configured twin persona.
- **Public personas**: `backend/public_personas/` — curated public-facing twin definitions.
- **Per-twin runtime data**: `backend/twins/` — runtime or derived data scoped to a specific twin.
- **Source memory**: managed by `backend/source_memory.py` — retrieves contextual memory associated with a twin, likely from S3 (`backend/resources.py`).
- **Example personality schema**: `personality.example.txt` (root) — documents the expected structure of a personality definition file.

### Memory

Persistent memory snapshots are stored as JSON blobs under `memory/`:

- `memory/8e03dfd2-eb55-474b-97ed-1391b55c5b7a.json`
- `memory/b61e9c81-3184-47b6-99bb-98f34280771a.json`

These are keyed by UUID, suggesting a per-session or per-user memory store.

### Context

Conversation context is managed by `backend/context.py`, which tracks the state of an ongoing interaction (message history, active twin, session metadata).

## Request / response flow

```
User (browser)
    │
    ▼
Next.js Frontend  (Vercel)
    │  API calls rewritten via vercel.json
    ▼
AWS API Gateway
    │
    ▼
AWS Lambda  ←── backend/lambda_handler.py (Mangum adapter)
    │
    ▼
FastAPI App  ←── backend/server.py
    │
    ├── backend/agent_orchestrator.py   (routes to correct agent)
    │       │
    │       └── backend/personality_agent.py  (twin-specific logic)
    │               │
    │               ├── backend/context.py        (session state)
    │               ├── backend/source_memory.py  (S3 memory retrieval)
    │               └── AWS Bedrock / Anthropic    (LLM inference)
    │
    └── backend/errors.py  (error normalisation → user-facing messages)
```

- The Lambda handler (`backend/lambda_handler.py`) adapts HTTP events from API Gateway into ASGI calls consumed by FastAPI.
- The orchestrator (`backend/agent_orchestrator.py`) selects and invokes the appropriate `personality_agent.py` instance for the requested twin.
- The personality agent loads its definition from `backend/personalities/` or `backend/public_personas/`, hydrates context from `backend/context.py`, fetches relevant memory via `backend/source_memory.py`, and calls the LLM (Bedrock/Anthropic) to generate a response.
- Errors are normalised through `backend/errors.py` before being returned to the client, providing user-facing messages for known serverless failure modes (introduced in commit `f82d0c7`).

## Static / media assets

- User-uploaded context and twin source material are stored in S3, referenced via `backend/resources.py`.
- CloudFront sits in front of S3 for static asset delivery (`terraform/main.tf`).

## Authentication flow

Authentication is delegated to Clerk (configured as a frontend dependency in `frontend/package.json`). The Next.js middleware at `frontend/middleware.ts` enforces auth on protected routes before requests reach the backend.

## Environment configuration

All secrets and environment variables are documented (by name only) in `.env.example`. The backend reads AWS credentials, Bedrock endpoint configuration, and other runtime values from environment variables injected at Lambda invocation time or via local `.env` for development.

# Infra & deploy topology

## Overview

Personality Twin uses a split-plane deployment: the frontend runs on Vercel's edge network while the backend runs serverless on AWS. Terraform manages all AWS resources; GitHub Actions drives CI/CD for both planes.

---

## Frontend — Vercel

The frontend is a Next.js 15 TypeScript application (`frontend/package.json:1-3`) deployed to Vercel. The Vercel project configuration is declared at `frontend/vercel.json`, which rewrites all `/api/*` traffic to the AWS API Gateway endpoint so the browser never calls AWS directly. Next.js App Router handles page routing (`frontend/app/`), and a custom middleware layer at `frontend/middleware.ts` enforces Clerk authentication on protected routes before any request leaves the edge. Static assets are served from `frontend/public/`. PostCSS/Tailwind styling is configured via `frontend/postcss.config.mjs`.

---

## Backend — AWS Serverless

The backend is a Python 3.12 FastAPI application with two entry points:

- **Local / direct HTTP**: `backend/server.py` — runs the FastAPI app directly.
- **Lambda entry point**: `backend/lambda_handler.py` — wraps FastAPI via the Mangum ASGI adapter (`backend/requirements.txt`) for execution inside AWS Lambda + API Gateway.

AWS SDK access (S3, Bedrock) is provided by `boto3`/`botocore`; LLM inference uses the `anthropic` SDK and AWS Bedrock. All AWS resource references (bucket names, endpoint ARNs, etc.) are centralised in `backend/resources.py`.

---

## AWS Infrastructure (Terraform)

All AWS resources are declared in `terraform/`:

| File | Purpose |
|---|---|
| `terraform/main.tf` | Core resources: Lambda function, API Gateway, S3 bucket(s), CloudFront distribution |
| `terraform/backend.tf` | Remote Terraform state backend configuration |
| `terraform/variables.tf` | Input variable declarations |
| `terraform/outputs.tf` | Stack output values (e.g., API Gateway URL, CloudFront domain) |
| `terraform/versions.tf` | Provider and Terraform version constraints |
| `terraform/terraform.tfvars` | Concrete variable values |

A note at `terraform/.disabled_backend-setup.txt` indicates the remote backend setup step can be toggled independently of the main stack.

**Key AWS services provisioned** (per `terraform/main.tf`):
- **AWS Lambda** — executes the FastAPI backend via `backend/lambda_handler.py`
- **AWS API Gateway** — HTTP entry point that triggers Lambda
- **AWS S3** — stores twin source material, personality context, and static assets
- **AWS CloudFront** — CDN in front of S3 for static asset delivery

---

## Request flow

```
Browser
  │
  ▼
Vercel Edge (Next.js 15)          frontend/vercel.json  — API rewrite rules
  │  /api/* rewritten →
  ▼
AWS API Gateway                   terraform/main.tf
  │
  ▼
AWS Lambda                        terraform/main.tf
  │  ASGI adapter
  ▼
FastAPI (Mangum)                  backend/lambda_handler.py
  │
  ├── Agent orchestration         backend/agent_orchestrator.py
  │     └── Personality agent     backend/personality_agent.py
  │           ├── Session context backend/context.py
  │           ├── S3 memory       backend/source_memory.py
  │           └── LLM inference   AWS Bedrock / Anthropic
  │
  └── Error normalisation         backend/errors.py
```

Authentication is enforced at the Vercel edge by `frontend/middleware.ts` (Clerk); unauthenticated requests are rejected before reaching API Gateway.

---

## CI/CD Pipelines

All pipelines are defined under `.github/workflows/`:

| Workflow file | Role |
|---|---|
| `.github/workflows/deploy.yml` | Production deployment (Terraform apply + Lambda package) |
| `.github/workflows/destroy.yml` | Infrastructure teardown (`scripts/destroy.sh`) |
| `.github/workflows/build-artifacts.yml` | Packages Lambda deployment artifacts (`build-artifacts.yml` at root mirrors this) |
| `.github/workflows/secrets-scan.yml` | Blocks merges that introduce secret material |
| `.github/workflows/security-scan.yml` | Dependency and static security analysis |
| `.github/workflows/claude.yml` / `claude-fix.yml` | AI-assisted PR review and auto-fix |
| `.github/workflows/auto-pr.yml` | Automated PR creation for bot-generated branches |
| `.github/workflows/pr-responder.yml` | PR comment automation |

Deployment and teardown are also available as shell scripts: `scripts/deploy.sh` and `scripts/destroy.sh`.

---

## Environment & Secrets

All required environment variables are documented by name in `.env.example`. At runtime, secrets (AWS credentials, Bedrock configuration, Clerk keys, Anthropic API key) are injected as Lambda environment variables or, for local development, loaded from a `.env` file. No secret values are stored in the repository. The `backend/resources.py` module centralises references to AWS resource identifiers consumed at runtime.

# Security posture

## Authentication & Authorization

Authentication is delegated entirely to Clerk and enforced at the Vercel edge layer via `frontend/middleware.ts`. Unauthenticated requests are rejected before they reach AWS API Gateway or the Lambda backend, providing a consistent perimeter. The frontend declares Clerk as a dependency (`frontend/package.json`), confirming it is a first-class runtime dependency rather than an optional add-on.

## Secrets Management

No secret values are stored in the repository. All credentials and sensitive configuration (AWS credentials, Bedrock endpoint, Clerk keys, Anthropic API key) are documented by name only in `.env.example`, and the `.gitignore` files at both root and backend level (`backend/.gitignore`) are expected to exclude `.env` from version control. At runtime, secrets are injected as Lambda environment variables. AWS resource identifiers (bucket names, ARNs) are centralised in `backend/resources.py` rather than scattered across the codebase.

## Security Gates in CI/CD

Two dedicated security workflows run as part of the CI pipeline:

- **Secrets scanning**: `.github/workflows/secrets-scan.yml` — intended to block merges that introduce secret material into the repository.
- **Security scanning**: `.github/workflows/security-scan.yml` — performs dependency and static security analysis.

These are supplemented by a hardening document at `SECRETS_SCAN_HARDENING.md`, a dependency audit at `DEPENDENCY_AUDIT.md`, and a lockfile validation process documented at `LOCKFILE_VALIDATION.md`, indicating deliberate attention to supply-chain risk.

## Dependency Management & Supply Chain

The backend uses `uv` with a pinned lockfile (`backend/uv.lock`) and explicit runtime dependencies in `backend/requirements.txt`. The frontend uses npm with a lockfile (`frontend/package-lock.json`). A root-level `package-lock.json` also exists. The project maintains a `DEPENDENCY_AUDIT.md`, a `DEPENDENCY_AUDIT_CHECKLIST.md`, and a `DEPENDENCY_MANIFEST_GUIDE.md`, suggesting a structured process for reviewing third-party dependencies. A test at `__tests__/package-json.test.js` validates package manifest integrity, with the test runner configured at `jest.config.js`.

## Infrastructure Security Posture

All AWS infrastructure is declared as code in `terraform/`, covering Lambda, API Gateway, S3, and CloudFront (`terraform/main.tf`). Remote Terraform state is configured via `terraform/backend.tf`, reducing the risk of state file exposure. The browser never calls AWS directly — all `/api/*` traffic is rewritten through Vercel to API Gateway (`frontend/vercel.json`), limiting the AWS attack surface to a single controlled entry point.

## Error Handling & Information Disclosure

Error normalisation is centralised in `backend/errors.py`, which provides user-facing messages for known serverless failure modes (introduced in commit `f82d0c7`). This reduces the risk of leaking internal stack traces or AWS resource details to end users. The pattern is documented in `INCIDENT_ISSUES.md` and `LESSONS_LEARNED.md`, indicating operational learning is being captured.

## Memory & Persistent Data

Persistent memory snapshots are stored as JSON blobs under `memory/` (`memory/8e03dfd2-eb55-474b-97ed-1391b55c5b7a.json`, `memory/b61e9c81-3184-47b6-99bb-98f34280771a.json`), keyed by UUID. These files are committed to the repository, which is a potential concern if they contain user-identifiable or sensitive session data — the content of these files is not visible in the provided readings, but their presence in version control warrants review.

## Identified Gaps & Risks

1. **Committed memory blobs**: `memory/8e03dfd2-eb55-474b-97ed-1391b55c5b7a.json` and `memory/b61e9c81-3184-47b6-99bb-98f34280771a.json` are tracked in the repository. If these contain PII or session data, they should be removed from history and excluded via `.gitignore`.

2. **Terraform variable values in repo**: `terraform/terraform.tfvars` is present in the repository tree. If this file contains non-public resource identifiers or configuration values, it should be reviewed to ensure no sensitive data is committed.

3. **Personality and persona files in repo**: `backend/personalities/`, `backend/public_personas/`, and `backend/me.txt` are committed. The `me.txt` file in particular may contain personal information about a real individual and should be assessed for data minimisation compliance.

4. **No explicit rate limiting or WAF evidence**: The readings do not cite any WAF, rate limiting, or DDoS protection configuration in `terraform/main.tf` or `frontend/vercel.json`. API Gateway and CloudFront both support these controls; their absence from the visible configuration is a gap worth confirming.

5. **AI-assisted PR workflows with repo write access**: `.github/workflows/claude.yml` and `.github/workflows/claude-fix.yml` grant an AI agent the ability to create commits and PRs. The security boundary of these workflows (what permissions the Claude token holds, whether it can push to protected branches) should be explicitly reviewed and constrained.

# Hot spots

**`backend/errors.py`** — The most recent commit (`f82d0c7`) touched this file to add user-facing error handling for known serverless failure modes. It sits at the intersection of Lambda cold-start behaviour, API Gateway timeout responses, and Bedrock/Anthropic call failures, making it a convergence point for all runtime failure modes. Any new failure mode discovered in production requires a change here (`backend/errors.py`).

**`backend/agent_orchestrator.py`** — Coordinates multi-agent interactions and routes requests to the correct `backend/personality_agent.py` instance. As the central dispatch layer between API Gateway and LLM inference, it is the most likely file to require changes when new twin types, routing rules, or agent behaviours are introduced (`backend/agent_orchestrator.py`).

**`backend/personality_agent.py`** — Core agent logic for a personality twin. It integrates `backend/context.py`, `backend/source_memory.py`, and the LLM call in a single unit, meaning changes to any of those subsystems ripple through here. It is the highest-complexity file in the backend call path (`backend/personality_agent.py`).

**`backend/lambda_handler.py`** — The Mangum ASGI adapter entry point for AWS Lambda. Any change to Lambda runtime configuration, timeout handling, or API Gateway event shape must be reflected here. It is also the first place cold-start latency manifests (`backend/lambda_handler.py`).

**`frontend/middleware.ts`** — Enforces Clerk authentication at the Vercel edge for all protected routes. A misconfiguration here bypasses the entire auth perimeter before requests reach API Gateway. It is a single file with system-wide security impact (`frontend/middleware.ts`).

**`frontend/vercel.json`** — Contains the API rewrite rules that proxy all `/api/*` traffic to the AWS API Gateway endpoint. A misconfiguration here breaks the entire frontend-to-backend connection or exposes the wrong backend origin (`frontend/vercel.json`).

**`terraform/main.tf`** — Declares all core AWS resources: Lambda, API Gateway, S3, and CloudFront. It is the single file that must change for any infrastructure topology change, making it a high-blast-radius file (`terraform/main.tf`).

**`.github/workflows/deploy.yml`** — Production deployment pipeline. It is in the high-churn set (1 touch in the 90-day window alongside most other workflow files), and a broken deploy workflow directly blocks all production releases (`.github/workflows/deploy.yml`).

---

# Tech-debt register

| ID | Description | Location | Severity |
|----|-------------|----------|----------|
| TD-01 | **Memory blobs committed to version control.** Two UUID-keyed JSON files are tracked in the repository. If they contain PII or session data, they violate data minimisation principles and are difficult to purge from history. | `memory/8e03dfd2-eb55-474b-97ed-1391b55c5b7a.json`, `memory/b61e9c81-3184-47b6-99bb-98f34280771a.json` | High |
| TD-02 | **`terraform/terraform.tfvars` committed.** Variable values file is present in the repository tree. If it contains non-public resource identifiers, endpoint URLs, or account IDs, it expands the blast radius of a repo compromise. | `terraform/terraform.tfvars` | Medium |
| TD-03 | **`backend/me.txt` committed.** A personal information file for a real individual is tracked in version control. This may conflict with data minimisation or GDPR obligations and should be assessed. | `backend/me.txt` | Medium |
| TD-04 | **Personality and persona definitions in-repo.** All twin personality definitions are stored as flat text files under `backend/personalities/` and `backend/public_personas/`. There is no evident database or CMS layer, meaning adding or updating a twin requires a code deployment. | `backend/personalities/`, `backend/public_personas/` | Medium |
| TD-05 | **Disabled Terraform remote backend.** A note at `terraform/.disabled_backend-setup.txt` indicates the remote state backend can be toggled off. If state is ever managed locally, it creates risk of state drift, concurrent apply conflicts, and state file loss. | `terraform/.disabled_backend-setup.txt`, `terraform/backend.tf` | Medium |
| TD-06 | **No evidence of WAF, rate limiting, or DDoS protection.** The visible configuration in `terraform/main.tf` and `frontend/vercel.json` does not cite any WAF rules, API Gateway usage plans, or CloudFront rate limiting. Both services support these controls natively. | `terraform/main.tf`, `frontend/vercel.json` | Medium |
| TD-07 | **Dual lockfile surface.** A root-level `package-lock.json` exists alongside `frontend/package-lock.json`. The root lockfile's purpose is not immediately clear from the tree; if it diverges from the frontend lockfile, dependency resolution becomes ambiguous. | `package-lock.json`, `frontend/package-lock.json` | Low |
| TD-08 | **AI-assisted PR workflows with unaudited repo write access.** `claude.yml` and `claude-fix.yml` grant an AI agent the ability to create commits and PRs. The permission scope of the Claude token (whether it can push to protected branches) is not visible in the provided readings. | `.github/workflows/claude.yml`, `.github/workflows/claude-fix.yml` | Medium |
| TD-09 | **`backend/deploy.py` role unclear.** A deployment helper module exists inside the backend package alongside the Lambda handler. Its relationship to `scripts/deploy.sh` and `.github/workflows/deploy.yml` is not documented, creating potential for divergent deployment paths. | `backend/deploy.py`, `scripts/deploy.sh`, `.github/workflows/deploy.yml` | Low |
| TD-10 | **`build-artifacts.yml` duplicated at root.** A `build-artifacts.yml` file exists at the repository root in addition to `.github/workflows/build-artifacts.yml`. If these are not identical, artifact packaging behaviour may differ between local and CI invocations. | `build-artifacts.yml`, `.github/workflows/build-artifacts.yml` | Low |

---

# Recent incidents (last 90d)

The repository's commit history (as provided) contains a single commit in the observable window:

**`f82d0c7` — "ops: add user-facing error handling for known serverless failure modes (#82)"**

This commit directly implies a production incident or class of incidents: the backend was returning raw or unhelpful error responses to users when Lambda cold-starts, API Gateway timeouts, or Bedrock/Anthropic call failures occurred. The fix centralised error normalisation in `backend/errors.py` to surface human-readable messages for these known failure modes (`backend/errors.py`). The PR number (#82) and the `ops:` prefix suggest this was treated as an operational issue rather than a feature. Supporting operational documentation exists at `INCIDENT_ISSUES.md` and `LESSONS_LEARNED.md`, indicating the team has a practice of capturing post-incident learnings.

No other incidents are directly evidenced in the provided commit history or file readings within the 90-day window.

---

# Open questions for operator

1. **Memory blobs in version control**: The files `memory/8e03dfd2-eb55-474b-97ed-1391b55c5b7a.json` and `memory/b61e9c81-3184-47b6-99bb-98f34280771a.json` are committed to the repository. Do these files contain user PII or session data? If so, should they be purged from git history and added to `.gitignore`? Is there a GDPR or data-retention obligation that applies?

2. **`backend/me.txt` and personality files**: `backend/me.txt` appears to contain personal information about a real individual. Has this been reviewed for data minimisation compliance? Are the individuals whose data is stored in `backend/personalities/` and `backend/public_personas/` aware of and consenting to their inclusion?

3. **WAF and rate limiting**: There is no visible WAF, API Gateway usage plan, or CloudFront rate-limiting configuration in the provided readings. Is rate limiting enforced at a layer not visible here (e.g., Vercel's built-in protections, an upstream WAF)? If not, is this a known accepted risk or a gap to close?

4. **AI workflow permissions**: `.github/workflows/claude.yml` and `.github/workflows/claude-fix.yml` grant an AI agent the ability to create commits and open PRs. What is the exact permission scope of the token used? Can it push to protected branches? Has this been explicitly reviewed and constrained to the minimum necessary permissions?

5. **Terraform remote state**: `terraform/.disabled_backend-setup.txt` indicates the remote backend can be toggled off. Is the remote state backend currently active in production? If it has ever been disabled, is there a risk of state drift or a missing state file?

6. **`terraform/terraform.tfvars` contents**: This file is committed to the repository. Does it contain any sensitive values (account IDs, endpoint URLs, resource names that should not be public)? Should it be excluded from version control and injected at CI time instead?

7. **`backend/deploy.py` vs `scripts/deploy.sh`**: Two deployment mechanisms exist. Which is the authoritative deployment path for production? Is `backend/deploy.py` invoked by the CI pipeline, or is it a legacy artifact?

8. **Serverless cold-start SLA**: The recent incident (`f82d0c7`) surfaced Lambda cold-start failures as a user-visible problem. Is there an agreed latency or availability SLA for the twin chat experience? Should provisioned concurrency or a keep-warm mechanism be evaluated to reduce cold-start frequency?

9. **Twin onboarding scalability**: Personality definitions are stored as flat files in `backend/personalities/` and `backend/public_personas/`. Is the current file-based model sufficient for the anticipated number of twins, or is a database-backed approach needed before scale becomes a constraint?

10. **Dual lockfile at root**: `package-lock.json` exists at the repository root alongside `frontend/package-lock.json`. What does the root lockfile govern? Is it kept in sync with the frontend lockfile, and is there a CI check that enforces consistency?
