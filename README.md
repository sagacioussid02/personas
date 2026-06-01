# Personality Twin

> **Turn human expertise into an always-on AI persona.**

Personality Twin is a production-ready platform for creating digital versions of real people, founders, experts, and public figures. It captures voice, judgment, values, and decision-making style, then turns that into a conversational AI experience users can interact with anytime.

Built for scale on AWS, it combines a polished Next.js frontend with a FastAPI backend powered by Bedrock, Lambda, S3, and CloudFront.

---

## Why it stands out

- **Capture more than a resume** — preserve how someone thinks, not just what they have done
- **Create premium AI experiences** — let users chat with a founder, advisor, mentor, or historical persona
- **Deploy with confidence** — secure, serverless AWS architecture designed for real-world usage
- **Personalize at depth** — guided interviews and uploaded context make each twin feel distinct and believable

## Core experience

1. **Try a live twin instantly** — start chatting from the homepage with no setup required
2. **Build your own personality twin** — answer guided prompts and upload context to create a richer AI identity
3. **Refine the model** — deepen the twin with values, trade-offs, and pivotal decisions
4. **Launch memorable conversations** — explore curated public personas and showcase the product experience

---

## Running locally

You need: Node 20+, Python 3.12, AWS credentials with Bedrock access, and a Clerk account (free tier works).

### Backend

```bash
cd backend
pip install -r requirements.txt      # or: uv pip install -r requirements.txt

# Copy and fill in the required values
cp .env.example .env
# Required: CLERK_JWKS_URL, SESSION_HMAC_SECRET (64-char hex)
# Optional: USE_S3=false uses local disk (fine for dev)

uvicorn server:app --reload --port 8000
```

The API is now at `http://localhost:8000`. Hit `/docs` for the auto-generated Swagger UI — FastAPI gives you that for free, which almost makes up for Python's packaging situation.

### Frontend

```bash
cd frontend
npm install

# Copy and fill in
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

npm run dev
```

App runs at `http://localhost:3000`.

### Environment variables you actually need

| Variable | Where | What |
|---|---|---|
| `CLERK_JWKS_URL` | backend | From your Clerk dashboard → API Keys |
| `SESSION_HMAC_SECRET` | backend | 64-char hex. Generate with: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | frontend | From Clerk dashboard |
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:8000` for local dev |

Everything else has sensible defaults for local development.

---

## Architecture (the 30-second version)

```
Browser
  │
  ├── Static frontend (Next.js)
  │     S3 + CloudFront in prod, localhost:3000 locally
  │
  └── API calls ──► FastAPI (Python)
                      Lambda in prod, uvicorn locally
```

For a detailed architecture diagram, request flow, and operational runbook, see:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — End-to-end system design, Lambda + Bedrock integration, and failure modes
- **[RUNBOOK.md](./RUNBOOK.md)** — Operational procedures for Lambda cold starts, Bedrock throttling, and S3 failures
- **[CI_WORKFLOWS.md](./CI_WORKFLOWS.md)** — Automated workflow governance, security gates, and deployment approval rules

---

## Contributing

We welcome contributions. See [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- Local setup and testing
- Code style and standards
- Monorepo package.json boundary (root vs. frontend)
- PR submission and review process
- Automated workflow gates and required status checks

---

## Deployment

The project deploys to AWS Lambda + CloudFront. See the deployment workflow in `.github/workflows/deploy.yml` and operational guidance in [RUNBOOK.md](./RUNBOOK.md).

**Key points:**

- Frontend is built and deployed to S3 + CloudFront
- Backend is packaged as a Lambda function
- All deployments require human approval (no automated deploy from automated PRs)
- See [CI_WORKFLOWS.md](./CI_WORKFLOWS.md) for deployment approval gates

---

## Lessons Learned

We track operational incidents and known issues in [LESSONS_LEARNED.md](./LESSONS_LEARNED.md). Common failure modes include:

- Lambda cold starts (mitigated with provisioned concurrency)
- Bedrock throttling (mitigated with exponential backoff and user-friendly error messages)
- S3 failures (mitigated with retry logic and fallback caching)

See [RUNBOOK.md](./RUNBOOK.md) for diagnosis and recovery steps.

---

## License

MIT. See LICENSE for details.

---

## Questions?

Reach out to the team or open an issue. We're here to help.
