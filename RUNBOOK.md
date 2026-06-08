# Personality Twin — Operational Runbook

## Overview

This runbook covers diagnosis and recovery procedures for the three most common failure modes documented in LESSONS_LEARNED.md:

1. **Lambda Cold Starts** — Slow first request after deployment
2. **Bedrock Throttling** — Rate limit exceeded errors
3. **S3 Failures** — Missing or inaccessible persona context

Each section includes symptoms, root-cause diagnosis, and step-by-step recovery steps.

---

## 1. Lambda Cold Starts

### Symptoms

- First chat request after deployment takes 5–15 seconds
- Subsequent requests complete in < 500 ms
- CloudWatch Logs show `REPORT` duration > 10 seconds
- User sees loading spinner or timeout error

### Root Cause Analysis

**Step 1: Check CloudWatch Logs**

```bash
# Navigate to CloudWatch Logs in AWS Console
# Log group: /aws/lambda/twin-api-{env}
# Filter by most recent deployment timestamp

# Look for REPORT lines:
# REPORT RequestId: abc123 Duration: 12345.67 ms Billed Duration: 13000 ms Memory Used: 512 MB
```

If `Duration > 10000 ms` on first invocation, cold start is confirmed.

**Step 2: Identify Bottleneck**

Check logs for initialization phases:

```
[INIT] Python runtime starting...
[INIT] FastAPI app loading...
[INIT] S3 context fetch...
[INVOKE] Chat request processing...
```

Note which phase takes longest. Typical breakdown:
- Python runtime: 1–2 sec
- FastAPI app: 2–3 sec
- S3 context fetch: 1–2 sec
- Bedrock inference: 2–5 sec

### Recovery Steps

#### Option A: Increase Lambda Memory (Fastest)

1. **Navigate to Lambda Console** → Select `twin-api-{env}` function
2. **Configuration tab** → General settings → Memory
3. **Increase from 1024 MB to 2048 MB** (doubles CPU allocation)
4. **Save and test** — Redeploy or invoke manually
5. **Expected result:** Cold start time drops to 3–5 seconds

**Cost impact:** ~2x memory cost, but faster user experience. Acceptable for production.

#### Option B: Enable Provisioned Concurrency (Eliminates Cold Starts)

1. **Lambda Console** → Concurrency tab
2. **Provisioned concurrency** → Set to 1 (or higher for expected concurrent users)
3. **Confirm** — AWS provisions and keeps 1 Lambda instance warm
4. **Expected result:** All requests < 500 ms; no cold starts

**Cost impact:** ~$0.015/hour per provisioned instance (~$11/month for 1 instance). Worth it for production.

#### Option C: Optimize Code (Longer-term)

1. **Move S3 context fetch outside hot path** — Cache in Lambda memory between invocations
2. **Lazy-load FastAPI dependencies** — Import only what's needed per request
3. **Use Lambda Layers** — Pre-compile dependencies to reduce extraction time

### Monitoring & Prevention

**Set CloudWatch Alarm:**

1. CloudWatch Console → Alarms → Create alarm
2. Metric: `AWS/Lambda` → `Duration`
3. Statistic: `Average` → Threshold: `10000 ms` (10 sec)
4. Evaluation: 2 consecutive periods of 5 minutes
5. Action: SNS notification to on-call

**Expected behavior after fix:**
- First request: 3–5 sec (acceptable)
- Subsequent requests: < 500 ms
- No user-facing timeouts

---

## 2. Bedrock Throttling

### Symptoms

- Chat request fails with `ThrottlingException` or HTTP 429
- Error message: `"Rate exceeded. Please retry after {delay} seconds"`
- Happens during traffic spikes or concurrent user sessions
- CloudWatch Logs show `bedrock:InvokeModel` failures

### Root Cause Analysis

**Step 1: Check Bedrock Quota**

```bash
# AWS Console → Bedrock → Model access
# Check "Provisioned throughput" and "On-demand throughput"
# Default: 100 requests/minute for Sonnet model
```

If concurrent users exceed quota, throttling occurs.

**Step 2: Estimate Required Quota**

```
Required quota = (concurrent users) × (requests per user per minute) × 1.5 (safety margin)

Example:
- 10 concurrent users
- 2 requests/min per user (typical chat cadence)
- Required: 10 × 2 × 1.5 = 30 req/min

If current quota is 100 req/min, you're safe.
If you expect 100+ concurrent users, request increase to 1000+ req/min.
```

**Step 3: Check CloudWatch Metrics**

```bash
# CloudWatch Console → Metrics → Bedrock
# Look for:
# - InvocationCount (total requests)
# - ThrottledCount (rejected requests)
# - Ratio: ThrottledCount / InvocationCount should be < 1%
```

### Recovery Steps

#### Option A: Request Quota Increase (Recommended)

1. **AWS Console** → Service Quotas
2. **Search:** "Bedrock" → "On-demand throughput for model"
3. **Request quota increase** → Set to 1000 requests/minute (or higher)
4. **Provide justification:** "Production chat application with N concurrent users"
5. **AWS approves** (typically within 1 hour)
6. **Test:** Retry chat requests; should succeed

**Note:** No code changes needed; quota increase is automatic.

#### Option B: Implement Exponential Backoff (Immediate Mitigation)

1. **Edit `backend/server.py`** → `/chat` endpoint
2. **Add retry logic:**

```python
import time
from botocore.exceptions import ClientError

max_retries = 3
for attempt in range(max_retries):
    try:
        response = bedrock_client.invoke_model(
            modelId="anthropic.claude-3-sonnet-20240229-v1:0",
            body=json.dumps({"prompt": prompt, "max_tokens": 1024})
        )
        return response
    except ClientError as e:
        if e.response['Error']['Code'] == 'ThrottlingException':
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # 1s, 2s, 4s
                time.sleep(wait_time)
                continue
        raise
```

3. **Deploy** → Redeploy Lambda function
4. **Test:** Chat requests now retry automatically on throttle

**Expected behavior:** User sees slight delay (1–7 sec total) but request succeeds.

#### Option C: Use SQS Queue for Non-Real-Time Requests

1. **Create SQS queue** → `twin-chat-queue-{env}`
2. **Modify FastAPI** → Queue chat requests instead of invoking Bedrock directly
3. **Create Lambda consumer** → Processes queue with exponential backoff
4. **Trade-off:** Latency increases (5–30 sec) but throughput improves

**Use case:** Batch persona creation, background analysis (not real-time chat).

### Monitoring & Prevention

**Set CloudWatch Alarm:**

1. CloudWatch Console → Alarms → Create alarm
2. Metric: `AWS/Bedrock` → `ThrottledCount`
3. Statistic: `Sum` → Threshold: `> 0` (any throttle is a problem)
4. Evaluation: 1 period of 5 minutes
5. Action: SNS notification to on-call + auto-scale Lambda concurrency

**Expected behavior after fix:**
- ThrottledCount = 0 (no throttles)
- All chat requests succeed within 5 seconds
- Error rate < 0.1%

---

## 3. S3 Failures

### Symptoms

- Chat fails with `NoSuchKey` error
- Error message: `"Persona context not found: {persona_id}"`
- Specific personas fail; others work fine
- CloudWatch Logs show S3 `GetObject` failures

### Root Cause Analysis

**Step 1: Check S3 Bucket & Permissions**

```bash
# AWS Console → S3 → twin-personas-{env} bucket
# Verify:
# 1. Bucket exists and is in correct region
# 2. Bucket policy allows Lambda role to read objects
# 3. Objects are not encrypted with customer-managed KMS key
```

**Step 2: Verify Lambda IAM Role**

```bash
# AWS Console → IAM → Roles → twin-api-{env}-role
# Check inline policies for:
# {
#   "Effect": "Allow",
#   "Action": "s3:GetObject",
#   "Resource": "arn:aws:s3:::twin-personas-*/*"
# }
```

If missing, add the policy.

**Step 3: Check Persona Exists**

```bash
# AWS Console → S3 → twin-personas-{env}
# Search for persona ID (e.g., "persona_12345.json")
# If not found, persona was never created or was deleted
```

**Step 4: Check CloudWatch Logs**

```bash
# CloudWatch Logs → /aws/lambda/twin-api-{env}
# Filter: "AccessDenied" or "NoSuchKey"
# Look for:
# - Which persona ID failed?
# - What was the exact error?
# - When did it start?
```

### Recovery Steps

#### Scenario A: Persona Not Found

**Diagnosis:** S3 GetObject returns `NoSuchKey`.

**Recovery:**

1. **Check persona creation flow** — Did user complete intake?
2. **Verify S3 upload** — Check S3 console for persona object
3. **If missing:** Re-trigger persona creation or restore from backup
4. **If exists:** Check persona ID in database matches S3 key

**Code fix (graceful fallback):**

```python
# backend/server.py
try:
    persona_context = s3_client.get_object(
        Bucket="twin-personas-prod",
        Key=f"{persona_id}.json"
    )["Body"].read()
except ClientError as e:
    if e.response['Error']['Code'] == 'NoSuchKey':
        # Fallback: use generic system prompt
        persona_context = json.dumps({
            "bio": "A helpful AI assistant",
            "style": "friendly and professional"
        })
    else:
        raise
```

#### Scenario B: Access Denied

**Diagnosis:** S3 GetObject returns `AccessDenied`.

**Recovery:**

1. **Check Lambda IAM role** — Verify `s3:GetObject` permission exists
2. **Check S3 bucket policy** — Ensure it doesn't explicitly deny Lambda role
3. **Check object ACL** — Verify object is not private (should be bucket-default)
4. **Add missing permission:**

```bash
# AWS Console → IAM → Roles → twin-api-{env}-role
# Add inline policy:
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::twin-personas-*/*"
    }
  ]
}
```

5. **Redeploy Lambda** — Changes take effect immediately
6. **Test:** Retry chat; should succeed

#### Scenario C: S3 Bucket Misconfigured

**Diagnosis:** All personas fail; bucket-level issue.

**Recovery:**

1. **Check bucket encryption** — If using customer-managed KMS, verify Lambda role has `kms:Decrypt`
2. **Check bucket versioning** — If enabled, ensure latest version is readable
3. **Check bucket lifecycle** — If objects are archived to Glacier, restore them
4. **Check CORS** — If CloudFront accesses bucket directly, verify CORS policy

**Example CORS fix:**

```json
[
  {
    "AllowedOrigins": ["https://d123.cloudfront.net"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

### Monitoring & Prevention

**Set CloudWatch Alarm:**

1. CloudWatch Console → Alarms → Create alarm
2. Metric: `AWS/S3` → `4xxErrors` or `5xxErrors`
3. Statistic: `Sum` → Threshold: `> 5` (per 5 minutes)
4. Action: SNS notification to on-call

**Enable S3 Access Logging:**

1. S3 Console → Bucket → Properties → Server access logging
2. Enable logging to separate bucket (e.g., `twin-personas-logs-{env}`)
3. Retain logs for 90 days for audit trail

**Expected behavior after fix:**
- All persona contexts load successfully
- S3 error rate = 0
- Chat latency < 2 sec (S3 fetch + Bedrock inference)

---

## Escalation & Support

### When to Page On-Call

- **Lambda error rate > 1%** → Immediate page
- **Bedrock throttle count > 0** → Page within 5 min
- **S3 access denied > 5 in 5 min** → Page within 5 min
- **Chat latency P95 > 10 sec** → Page within 15 min

### Escalation Path

1. **On-call engineer** → Diagnose using this runbook
2. **If unresolved in 15 min** → Escalate to platform team lead
3. **If AWS service issue** → Open AWS Support case (Business or Enterprise plan)
4. **Post-incident** → Add findings to LESSONS_LEARNED.md

### Useful Commands

```bash
# Tail Lambda logs in real-time
aws logs tail /aws/lambda/twin-api-prod --follow

# Check Lambda function configuration
aws lambda get-function-configuration --function-name twin-api-prod

# Invoke Lambda manually (for testing)
aws lambda invoke --function-name twin-api-prod \
  --payload '{"body": "{\"message\": \"test\"}"}' response.json

# List S3 objects for a persona
aws s3 ls s3://twin-personas-prod/ | grep persona_id

# Check Bedrock quota
aws service-quotas get-service-quota \
  --service-code bedrock \
  --quota-code L-XXXXXXXX
```

---

## References

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design and configuration
- [LESSONS_LEARNED.md](./LESSONS_LEARNED.md) — Incident log and tracking
- [AWS Lambda Troubleshooting](https://docs.aws.amazon.com/lambda/latest/dg/troubleshooting.html)
- [Bedrock API Errors](https://docs.aws.amazon.com/bedrock/latest/userguide/error-handling.html)
- [S3 Troubleshooting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/troubleshooting.html)
