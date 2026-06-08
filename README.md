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

## Architecture & Operations

### System Design

For a detailed breakdown of how Lambda, Bedrock, CloudFront, and S3 fit together, see [**ARCHITECTURE.md**](./ARCHITECTURE.md). It covers:

- End-to-end request flow (CloudFront → Lambda → Bedrock → S3)
- Key configuration parameters for each AWS service
- Known failure modes and their mitigations
- Deployment pipeline and scaling considerations

### Operational Runbook

If you're on-call or troubleshooting, start with [**RUNBOOK.md**](./RUNBOOK.md). It provides step-by-step diagnosis and recovery procedures for:

- **Lambda Cold Starts** — Why first requests are slow and how to fix it
- **Bedrock Throttling** — Rate limit errors and quota management
- **S3 Failures** — Missing personas and permission issues

### Incident Log

See [**LESSONS_LEARNED.md**](./LESSONS_LEARNED.md) for a curated log of production incidents, their root causes, and remediation status.

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
                      │
                      ├─► Bedrock (Claude inference)
                      │
                      └─► S3 (persona context storage)
```

---

## Deployment

### Local → AWS

```bash
# 1. Ensure you have AWS credentials configured
aws sts get-caller-identity

# 2. Backend: build and deploy Lambda function
cd backend
pip install -r requirements.txt
zip -r ../lambda.zip . -x "*.git*" "__pycache__/*" "*.pyc"
aws lambda update-function-code \
  --function-name twin-api-prod \
  --zip-file fileb://../lambda.zip

# 3. Frontend: build and deploy to S3 + CloudFront
cd ../frontend
npm run build
aws s3 sync out/ s3://twin-frontend-prod/ --delete
aws cloudfront create-invalidation \
  --distribution-id E123ABC \
  --paths "/*"
```

For CI/CD automation, see `.github/workflows/deploy.yml`.

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
```
twin/
├── backend/                    # FastAPI application
│   ├── server.py              # Main app, /chat endpoint
│   ├── models.py              # Pydantic schemas
│   ├── bedrock.py             # Bedrock client wrapper
│   ├── storage.py             # S3 and local storage
│   └── requirements.txt        # Python dependencies
├── frontend/                   # Next.js application
│   ├── app/                   # App router (Next.js 13+)
│   ├── components/            # React components
│   ├── lib/                   # Utilities
│   └── package.json           # Node dependencies
├── .github/workflows/          # CI/CD pipelines
│   ├── deploy.yml             # Deploy to AWS
│   ├── destroy.yml            # Teardown (manual approval)
│   └── tests.yml              # Run tests on PR
├── ARCHITECTURE.md            # System design & operations
├── RUNBOOK.md                 # Troubleshooting guide
├── LESSONS_LEARNED.md         # Incident log
├── CONTRIBUTING.md            # Development guidelines
└── README.md                  # This file
```

---

## Development

### Code style

- **Python:** Black formatter, mypy type checking
- **TypeScript/React:** ESLint, Prettier
- **Commits:** Conventional Commits (feat:, fix:, docs:, etc.)

### Testing

```bash
# Backend
cd backend
pytest tests/ -v

# Frontend
cd frontend
npm test
```
---

## Monitoring & Alerts

Production deployments are monitored via CloudWatch. Key metrics:

- **Lambda duration** — P50, P95, P99 latencies
- **Lambda errors** — 4xx and 5xx error rates
- **Bedrock throttling** — Rate limit exceeded events
- **S3 access errors** — Permission and missing-key failures
- **CloudFront cache hit ratio** — Should be > 80%

Alarms are configured to page on-call for:

- Error rate > 1%
- P95 latency > 5 sec
- Any Bedrock throttle event
- S3 access denied > 5 in 5 min

See [RUNBOOK.md](./RUNBOOK.md) for diagnosis and recovery steps.

See [RUNBOOK.md](./RUNBOOK.md) for diagnosis and recovery steps.

---

## Questions?

Reach out to the team or open an issue. We're here to help.
## FAQ

**Q: How do I create a new persona?**

A: Use the `/personas/create` endpoint (POST) with a structured intake payload. The frontend guides users through prompts, uploads, and Q&A. Context is stored in S3; Bedrock embeddings are generated for semantic search.

**Q: What's the latency for a chat request?**

A: Typical: 1–3 sec (S3 context fetch + Bedrock inference). Cold starts add 5–15 sec on first request after deployment. See [ARCHITECTURE.md](./ARCHITECTURE.md) for optimization tips.

**Q: Can I use a different LLM instead of Claude?**

A: Yes. Bedrock supports multiple models (Llama, Mistral, etc.). Update `bedrock.py` to change the `modelId` parameter. Note: prompt format and token limits vary by model.

**Q: How much does this cost to run?**

A: Rough monthly estimate (10k chat requests/month):

- Lambda: $0.20 (compute)
- Bedrock: $5–10 (inference, depends on model)
- S3: < $0.10 (storage)
- CloudFront: $0.50–2 (data transfer)
- **Total: ~$6–13/month** (very cheap for a production service)

**Q: How do I scale to 1000s of concurrent users?**

A: Lambda auto-scales. Bedrock has per-account rate limits (default: 100 req/min). Request a quota increase to 1000+ req/min. See [RUNBOOK.md](./RUNBOOK.md) for details.

---

## License

MIT. See LICENSE file.

---

## Support

- **Documentation:** [ARCHITECTURE.md](./ARCHITECTURE.md), [RUNBOOK.md](./RUNBOOK.md), [LESSONS_LEARNED.md](./LESSONS_LEARNED.md)
- **Issues:** GitHub Issues
- **On-call:** See [RUNBOOK.md](./RUNBOOK.md) for escalation path
