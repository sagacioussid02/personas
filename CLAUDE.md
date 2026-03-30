# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow
- Always create a feature branch before making any changes. Never push directly to `main`.
- Branch naming: `feature/<description>`, `fix/<description>`, `chore/<description>`
- All changes go through a PR targeting `main`
- PRs are auto-created by GitHub Actions on push — never manually create PRs
- The remote default branch is `main` (note: `origin/HEAD` points to `SiddData` but the actual default is `main`)

## Commands

### Frontend
```bash
cd frontend
npm run dev        # Start dev server on localhost:3000
npm run build      # Production build (static export to out/)
npm run lint       # ESLint
```

### Backend
```bash
cd backend
uvicorn server:app --reload --host 0.0.0.0 --port 8000  # Dev server
python deploy.py   # Build Lambda deployment package (lambda-deployment.zip)
```

### Infrastructure
```bash
cd terraform
terraform init     # Initialize (requires AWS credentials + S3 backend config)
terraform plan
terraform apply
```

## Architecture

### Request Flow
```
Browser → CloudFront → API Gateway → Lambda (FastAPI/Mangum) → Bedrock + S3
                     ↘ S3 (static frontend assets)
```

### Key Files
- `backend/server.py` — All API endpoints (~2200 lines), auth logic, session management
- `backend/context.py` — System prompt construction for Bedrock calls
- `backend/personality_agent.py` — Archetype detection and personality synthesis
- `backend/resources.py` — Loads default twin data from `backend/data/`
- `frontend/app/` — Next.js App Router pages
- `frontend/components/twin.tsx` — Unauthenticated chat component
- `frontend/components/twin-chat.tsx` — Authenticated chat for user-created twins

### Authentication
- Clerk provides JWTs (RS256) to the frontend
- Frontend sends `Authorization: Bearer <token>` on protected requests
- Backend verifies via Clerk JWKS (cached in-memory, refreshed on unknown `kid`)
- `user_id` is extracted from the JWT `sub` claim

### Session IDs
- **Anonymous users:** UUID (supplied by client or generated)
- **Authenticated users:** HMAC-SHA256(`user_id:twin_id`, `SESSION_HMAC_SECRET`) — opaque 64-char hex, stable across devices, prevents session hijacking
- Valid formats enforced by regex: UUID v4 or `[0-9a-f]{64}`

### Data Layout (S3 or local filesystem)
```
twins/{user_id}/{twin_id}.json   # User-created twins
twins/{twin_id}.json             # Public personas (no user_id prefix)
sessions/{session_id}.json       # Conversation history
```

### Bedrock Integration
- Default model: `global.amazon.nova-2-lite-v1:0`
- Called via `boto3` `bedrock-runtime` client in `us-east-2`
- `USE_S3=false` uses local filesystem; `USE_S3=true` uses S3

### Dependency Management
`backend/requirements.txt` and `backend/pyproject.toml` must stay in sync — Lambda packaging uses `requirements.txt` but local dev uses `pyproject.toml` (uv).

## Deployment
- CI/CD deploys automatically on push to `main` via `.github/workflows/deploy.yml`
- Lambda is built inside a Docker container matching the Lambda runtime to ensure binary compatibility
- Frontend is deployed via Vercel (connected to `main`); also buildable for S3/CloudFront static hosting

## Environment Variables

**Backend:**
| Variable | Purpose |
|----------|---------|
| `CLERK_JWKS_URL` | Clerk JWKS endpoint for JWT verification |
| `SESSION_HMAC_SECRET` | 64-char hex; derives authenticated session IDs |
| `USE_S3` | `true` = S3 storage, `false` = local filesystem |
| `S3_BUCKET` | Bucket name for twins/sessions |
| `BEDROCK_MODEL_ID` | Override default LLM |
| `CORS_ORIGINS` | Comma-separated allowed origins |

**Frontend:**
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend base URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
