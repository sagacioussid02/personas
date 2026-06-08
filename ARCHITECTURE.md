# Personality Twin — Architecture & Operations

## System Overview

Personality Twin is a serverless platform built on AWS that captures human expertise and judgment, then serves it as a conversational AI experience. The system combines a Next.js frontend, FastAPI backend, and AWS services (Lambda, Bedrock, S3, CloudFront) to deliver low-latency, scalable interactions.

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS / CLIENTS                         │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
                         ▼
        ┌────────────────────────────────────┐
        │      CloudFront CDN (Global)       │
        │  • TLS Termination                 │
        │  • Cache Layer (Static Assets)     │
        │  • Custom Domain Support           │
        │  • DDoS Protection (AWS Shield)    │
        └────────────┬───────────────────────┘
                     │
         ┌───────────┴──────────────┐
         │                          │
         ▼                          ▼
  ┌─────────────────┐      ┌──────────────────┐
  │  S3 Frontend    │      │  API Gateway     │
  │  • Next.js App  │      │  • REST Endpoint │
  │  • Static Files │      │  • CORS Handling │
  │  • 404 Routing  │      │  • Auth Checks   │
  └─────────────────┘      └────────┬─────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │   AWS Lambda (Compute)    │
                    │                           │
                    │  FastAPI Application      │
                    │  • /chat endpoint         │
                    │  • /health check          │
                    │  • Persona management     │
                    │  • Session handling       │
                    │                           │
                    │  Context Loading:         │
                    │  • Bio & Background       │
                    │  • Skills & Experience    │
                    │  • Values & Judgment      │
                    │  • Communication Style    │
                    └────────────┬──────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
      ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐
      │ AWS Bedrock      │  │ S3 Storage   │  │ CloudWatch   │
      │ • Claude Model   │  │ • Personas   │  │ • Logs       │
      │ • Inference      │  │ • Context    │  │ • Metrics    │
      │ • Streaming      │  │ • Artifacts  │  │ • Alarms     │
      └──────────────────┘  └──────────────┘  └──────────────┘
```

## Request Flow

### Chat Request (Happy Path)

1. **User sends message** → Browser makes HTTPS POST to CloudFront
2. **CloudFront routes** → Checks cache for static assets; routes API calls to API Gateway
3. **API Gateway validates** → Checks CORS, rate limits, authentication (Clerk JWT)
4. **Lambda cold start** (if needed) → Python runtime initializes, FastAPI app loads
5. **FastAPI processes** → Loads persona context from S3, builds system prompt
6. **Bedrock inference** → Sends prompt + context to Claude model via boto3
7. **Stream response** → Bedrock returns tokens; Lambda streams back to client
8. **CloudFront caches** → Static responses cached; streaming responses bypass cache
9. **Browser renders** → User sees in-character response

### Persona Creation

1. User completes intake flow (prompts, uploads, Q&A)
2. FastAPI validates and structures persona data
3. Data persisted to S3 with persona ID as key
4. Bedrock embeddings generated for semantic search (future)
5. Confirmation returned to frontend

## Key Configuration Parameters

### Lambda

| Parameter | Default | Notes |
|-----------|---------|-------|
| Memory | 1024 MB | Affects CPU allocation and cold-start time |
| Timeout | 30 sec | Must exceed Bedrock inference latency + overhead |
| Ephemeral Storage | 512 MB | Sufficient for context loading; S3 is source of truth |
| Reserved Concurrency | (none) | Set if expecting traffic spikes to avoid throttling |
| Environment: `USE_S3` | `true` | Set to `false` for local dev (uses disk) |

### Bedrock

| Parameter | Default | Notes |
|-----------|---------|-------|
| Model | `anthropic.claude-3-sonnet-20240229-v1:0` | Balanced cost/latency; upgrade to opus for quality |
| Max Tokens | 1024 | Response length limit; adjust per use case |
| Temperature | 0.7 | Controls randomness; lower = more deterministic |
| Top P | 0.9 | Nucleus sampling; controls diversity |

### S3

| Parameter | Default | Notes |
|-----------|---------|-------|
| Bucket | `twin-personas-{env}` | Regional bucket; enable versioning for safety |
| Encryption | SSE-S3 | Upgrade to KMS if handling sensitive data |
| Lifecycle | 90-day archive | Old versions moved to Glacier for cost |
| CORS | Restricted | Only CloudFront origin allowed |

### CloudFront

| Parameter | Default | Notes |
|-----------|---------|-------|
| TTL (Static) | 86400 sec (1 day) | Cache Next.js assets aggressively |
| TTL (API) | 0 sec | No caching for dynamic responses |
| Compression | gzip, brotli | Reduces payload size |
| HTTP/2 | Enabled | Faster multiplexing |

## Known Failure Modes & Mitigations

### 1. Lambda Cold Starts

**Symptom:** First request after deployment takes 5–15 seconds; subsequent requests are fast (< 500 ms).

**Root Cause:** Python runtime initialization, FastAPI app loading, and S3 context fetch on first invocation.

**Mitigation:**
- Set Lambda memory to ≥ 1024 MB (faster CPU = faster startup)
- Use Lambda Provisioned Concurrency for predictable traffic (costs ~$0.015/hour per instance)
- Implement client-side timeout handling and retry logic
- Monitor CloudWatch Logs for `REPORT` duration; set alarms if > 10 sec

**Monitoring:**
```
CloudWatch Metric: Duration (Lambda)
Alarm: Duration > 10000 ms for 2 consecutive invocations
```

### 2. Bedrock Throttling

**Symptom:** User sees `ThrottlingException` or 429 response; chat hangs or fails.

**Root Cause:** Bedrock has per-account rate limits (default: 100 requests/min for Sonnet). Concurrent users or rapid requests exceed quota.

**Mitigation:**
- Request quota increase from AWS (typical: 1000+ req/min for production)
- Implement exponential backoff in FastAPI (retry up to 3 times with 1s, 2s, 4s delays)
- Use SQS queue for non-real-time requests to smooth load
- Monitor Bedrock CloudWatch metrics for `InvocationCount` and `ThrottledCount`

**Monitoring:**
```
CloudWatch Metric: bedrock:ThrottledCount
Alarm: ThrottledCount > 0 in any 5-min window
```

### 3. S3 Failures

**Symptom:** Chat fails with `NoSuchKey` or `AccessDenied`; persona context missing.

**Root Cause:** S3 bucket misconfigured, persona not found, or Lambda IAM role lacks permissions.

**Mitigation:**
- Verify Lambda execution role has `s3:GetObject` on `arn:aws:s3:::twin-personas-*/*`
- Implement graceful fallback: if persona context missing, use generic system prompt
- Enable S3 versioning and MFA delete to prevent accidental overwrites
- Log all S3 access attempts; set CloudWatch alarm on `AccessDenied` errors

**Monitoring:**
```
CloudWatch Metric: S3 4xx/5xx errors
Alarm: 4xx errors > 5 in 5-min window
```

## Deployment & Scaling

### Deployment Pipeline

1. **Code commit** → GitHub Actions runs tests, linting, security scans
2. **Build artifacts** → `build-artifacts.yml` creates Lambda zip with pinned dependencies
3. **Manual approval** → Operator reviews and approves via GitHub environment
4. **Deploy** → `deploy.yml` updates Lambda function code and configuration
5. **Smoke test** → Health check endpoint validates deployment

### Scaling Considerations

- **Lambda:** Automatically scales to handle concurrent requests (no configuration needed)
- **Bedrock:** Request quota limits concurrency; request increase for high-traffic scenarios
- **S3:** Unlimited throughput; no scaling needed
- **CloudFront:** Global edge locations automatically scale; monitor origin request rate

## Observability

### Key Metrics

- **Lambda Duration:** P50, P95, P99 latencies
- **Lambda Errors:** 4xx (client) and 5xx (server) error rates
- **Bedrock Invocations:** Request count and throttle rate
- **S3 Latency:** Get/Put operation latencies
- **CloudFront Cache Hit Ratio:** Should be > 80% for static assets

### Logging

- **Lambda:** CloudWatch Logs group `/aws/lambda/twin-api-{env}`
- **FastAPI:** Structured JSON logs with request ID, user ID, duration
- **Bedrock:** Boto3 debug logs (enable with `boto3.set_stream_logger()`)
- **S3:** S3 access logs to separate bucket for audit trail

### Alarms

- Lambda error rate > 1% → Page on-call
- Lambda duration P95 > 5 sec → Investigate cold starts
- Bedrock throttle count > 0 → Request quota increase
- S3 access denied > 5 in 5 min → Check IAM role
- CloudFront origin error rate > 1% → Check Lambda health

## Security

- **Authentication:** Clerk JWT validated on every API request
- **Encryption:** TLS 1.2+ for all transport; S3 encryption at rest
- **IAM:** Lambda role scoped to minimal permissions (S3 read, Bedrock invoke)
- **Rate Limiting:** CloudFront and API Gateway rate limits prevent abuse
- **Secrets:** Environment variables injected at Lambda deploy time; never committed to repo

## References

- [RUNBOOK.md](./RUNBOOK.md) — Operational procedures for common failure modes
- [LESSONS_LEARNED.md](./LESSONS_LEARNED.md) — Incident log and remediation tracking
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [Bedrock API Reference](https://docs.aws.amazon.com/bedrock/latest/userguide/)
