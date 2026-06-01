# Operational Runbook for Personality Twin

## Overview

This runbook covers diagnosis and recovery procedures for the three documented failure modes in the Personality Twin serverless stack:

1. **Lambda Cold Start Timeouts**
2. **Bedrock Throttling (Rate Limiting)**
3. **S3 Failures (Access Denied / Transient Errors)**

For architecture overview, see ARCHITECTURE.md.

---

## Lambda Cold Start Timeouts

### Symptoms

- Users see "Service temporarily unavailable due to high demand" error message
- CloudWatch Logs show Lambda duration > 30 seconds
- API Gateway returns 504 Gateway Timeout
- Bedrock model initialization logs appear in Lambda execution logs

### Root Cause

Lambda function is cold-started (no provisioned concurrency) and must initialize the Bedrock model on first invocation. Model loading takes 8-12 seconds, plus Python runtime startup and dependency imports. Total time exceeds 30-second API Gateway timeout.

### Diagnosis Steps

1. **Check CloudWatch Logs**
   ```bash
   # SSH into bastion or use AWS CLI
   aws logs tail /aws/lambda/twin-api --follow
   ```
   Look for:
   - `"Initializing Bedrock model..."` messages
   - Duration logs showing > 25 seconds
   - `"Cold start detected"` markers

2. **Check Lambda Metrics**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name Duration \
     --dimensions Name=FunctionName,Value=twin-api \
     --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 60 \
     --statistics Maximum,Average
   ```
   If `Maximum > 30000` (milliseconds), cold starts are occurring.

3. **Check Provisioned Concurrency**
   ```bash
   aws lambda get-provisioned-concurrency-config \
     --function-name twin-api
   ```
   If no output or error, provisioned concurrency is not enabled.

### Recovery Steps

#### Immediate (User-Facing)

1. **Verify error message is user-friendly**
   - Users should see: "Service temporarily unavailable due to high demand. Please try again in a few seconds."
   - NOT: Raw 504 or stack trace
   - This is handled by the error middleware in `backend/server.py` (merged in this PR)

2. **Communicate to users** (if applicable)
   - Post status update: "We're experiencing brief delays. Our team is working on it."
   - Estimated recovery: 5-10 minutes as Lambda warms up

#### Short-Term (Next 1-2 hours)

1. **Monitor Lambda invocation rate**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name Invocations \
     --dimensions Name=FunctionName,Value=twin-api \
     --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 60 \
     --statistics Sum
   ```
   If invocation rate is high (> 10/min), cold starts will continue.

2. **Check CloudWatch alarm**
   - Alarm: `twin-lambda-duration-p99` should be firing
   - Review alarm history in AWS Console → CloudWatch → Alarms

3. **Increase Lambda timeout** (temporary, if not already done)
   ```bash
   aws lambda update-function-configuration \
     --function-name twin-api \
     --timeout 60
   ```
   This gives cold starts more time to complete (though API Gateway still times out at 30s).

#### Long-Term (Sprint 5)

1. **Enable Provisioned Concurrency**
   ```bash
   aws lambda put-provisioned-concurrency-config \
     --function-name twin-api \
     --provisioned-concurrent-executions 5
   ```
   This keeps 5 Lambda instances warm at all times, eliminating cold starts.

2. **Monitor cost impact**
   - Provisioned concurrency costs ~$0.015/hour per concurrent execution
   - 5 concurrent = ~$0.075/hour = ~$55/month
   - Weigh against user experience improvement

3. **Consider Lambda layers for dependencies**
   - Package Bedrock SDK and dependencies in a Lambda layer
   - Reduces cold start time by 2-3 seconds

---

## Bedrock Throttling (Rate Limiting)

### Symptoms

- Users see "Service is experiencing high demand. Please try again shortly." error message
- CloudWatch Logs show `ThrottlingException` from Bedrock API
- Multiple concurrent chat requests fail
- Error rate spikes during peak hours

### Root Cause

Bedrock API has rate limits (default: 5 concurrent requests per model). When concurrent requests exceed this limit, Bedrock returns 429 ThrottlingException. No retry logic or request queuing means the error is immediately returned to the user.

### Diagnosis Steps

1. **Check CloudWatch Logs for Bedrock errors**
   ```bash
   aws logs tail /aws/lambda/twin-api --follow | grep -i throttl
   ```
   Look for:
   - `"ThrottlingException"` messages
   - `"Rate exceeded"` or `"Request limit exceeded"`
   - Timestamp correlation with user complaints

2. **Check Bedrock metrics**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Bedrock \
     --metric-name ThrottledRequests \
     --dimensions Name=ModelId,Value=anthropic.claude-3-sonnet-20240229-v1:0 \
     --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 60 \
     --statistics Sum
   ```
   If `Sum > 0`, throttling is occurring.

3. **Check concurrent request count**
   ```bash
   aws logs insights query \
     --log-group-name /aws/lambda/twin-api \
     --query 'fields @timestamp, @message | filter @message like /Invoking Bedrock/ | stats count() as concurrent_requests by bin(5m)'
   ```

4. **Check Bedrock quota**
   ```bash
   aws bedrock describe-model-customization-job \
     --region us-east-1
   ```
   Or check AWS Console → Bedrock → Model Access → View Details

### Recovery Steps

#### Immediate (User-Facing)

1. **Verify error message is user-friendly**
   - Users should see: "Service is experiencing high demand. Please try again shortly."
   - NOT: Raw 429 or `ThrottlingException`
   - This is handled by the error middleware in `backend/server.py` (merged in this PR)

2. **Implement exponential backoff** (already in this PR)
   - First retry: 1 second delay
   - Second retry: 2 second delay
   - Third retry: 4 second delay
   - Max retries: 3
   - This is implemented in `backend/server.py` `invoke_bedrock_with_backoff()` function

3. **Communicate to users** (if applicable)
   - Post status update: "We're experiencing higher-than-expected demand. Requests may take longer."
   - Estimated recovery: 5-15 minutes as traffic normalizes

#### Short-Term (Next 1-2 hours)

1. **Monitor Bedrock throttle rate**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Bedrock \
     --metric-name ThrottledRequests \
     --dimensions Name=ModelId,Value=anthropic.claude-3-sonnet-20240229-v1:0 \
     --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 60 \
     --statistics Sum
   ```
   If throttling continues, escalate to next step.

2. **Check CloudWatch alarm**
   - Alarm: `twin-bedrock-throttle-rate` should be firing
   - Review alarm history in AWS Console → CloudWatch → Alarms

3. **Implement request queuing** (if not already done)
   - Add a simple in-memory queue to batch Bedrock requests
   - Process queue at 1 request per 200ms (5 concurrent max)
   - This prevents thundering herd of simultaneous requests

#### Long-Term (Sprint 5)

1. **Request Bedrock quota increase**
   ```bash
   # Via AWS Console: Service Quotas → Bedrock → Concurrent requests
   # Or via CLI:
   aws service-quotas request-service-quota-increase \
     --service-code bedrock \
     --quota-code L-XXXXXXXX \
     --desired-value 20
   ```
   Request increase to 20 concurrent requests (4x current limit).

2. **Implement per-user rate limiting**
   - Track requests per user ID
   - Limit to 2 concurrent requests per user
   - Queue additional requests with exponential backoff

3. **Consider model switching**
   - If Claude 3 Sonnet is consistently throttled, evaluate:
     - Claude 3 Haiku (faster, cheaper, lower latency)
     - Llama 2 (open-source, lower cost)
   - Benchmark latency and quality trade-offs

---

## S3 Failures (Access Denied / Transient Errors)

### Symptoms

- Users see "Unable to load persona data. Please try again." error message
- CloudWatch Logs show S3 errors: `AccessDenied`, `NoSuchBucket`, `ServiceUnavailable`
- Persona loading fails intermittently
- Error rate spikes during S3 maintenance windows

### Root Cause

S3 read/write operations fail due to:
1. **AccessDenied** — IAM role lacks S3 permissions
2. **NoSuchBucket** — Bucket name misconfigured or deleted
3. **ServiceUnavailable** — Transient S3 service error (rare, but happens)
4. **SlowDown** — S3 request rate exceeded (if uploading many files)

No retry logic means transient failures are immediately returned to the user.

### Diagnosis Steps

1. **Check CloudWatch Logs for S3 errors**
   ```bash
   aws logs tail /aws/lambda/twin-api --follow | grep -i 's3\|bucket'
   ```
   Look for:
   - `"AccessDenied"` or `"Access Denied"`
   - `"NoSuchBucket"` or `"Bucket does not exist"`
   - `"ServiceUnavailable"` or `"Service Unavailable"`
   - `"SlowDown"` or `"Please reduce your request rate"`

2. **Check S3 bucket exists and is accessible**
   ```bash
   aws s3 ls s3://twin-personas-prod/
   ```
   If error, bucket is inaccessible or doesn't exist.

3. **Check IAM role permissions**
   ```bash
   # Get Lambda execution role
   aws lambda get-function-configuration --function-name twin-api | grep Role
   
   # Check role policy
   aws iam get-role-policy --role-name <role-name> --policy-name <policy-name>
   ```
   Verify policy includes:
   - `s3:GetObject` (read)
   - `s3:PutObject` (write)
   - `s3:ListBucket` (list)

4. **Check S3 bucket policy**
   ```bash
   aws s3api get-bucket-policy --bucket twin-personas-prod
   ```
   Verify policy allows Lambda execution role to access bucket.

5. **Check S3 service status**
   - Visit AWS Service Health Dashboard: https://status.aws.amazon.com/
   - Look for S3 incidents in your region

### Recovery Steps

#### Immediate (User-Facing)

1. **Verify error message is user-friendly**
   - Users should see: "Unable to load persona data. Please try again."
   - NOT: Raw S3 error or stack trace
   - This is handled by the error middleware in `backend/server.py` (merged in this PR)

2. **Implement exponential backoff with jitter** (already in this PR)
   - First retry: 500ms + random(0-500ms)
   - Second retry: 1000ms + random(0-1000ms)
   - Third retry: 2000ms + random(0-2000ms)
   - Max retries: 3
   - This is implemented in `backend/server.py` `read_s3_with_backoff()` function

3. **Communicate to users** (if applicable)
   - Post status update: "We're experiencing brief issues loading persona data. Please try again."
   - Estimated recovery: 1-5 minutes for transient errors

#### Short-Term (Next 1-2 hours)

1. **Verify S3 bucket is accessible**
   ```bash
   aws s3 ls s3://twin-personas-prod/ --recursive | head -20
   ```
   If error, check bucket policy and IAM role.

2. **Check CloudWatch alarm**
   - Alarm: `twin-s3-error-rate` should be firing
   - Review alarm history in AWS Console → CloudWatch → Alarms

3. **If AccessDenied error**
   ```bash
   # Update Lambda execution role policy
   aws iam put-role-policy \
     --role-name twin-lambda-execution-role \
     --policy-name twin-s3-access \
     --policy-document file://s3-policy.json
   ```
   Policy should include:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:GetObject",
           "s3:PutObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::twin-personas-prod",
           "arn:aws:s3:::twin-personas-prod/*"
         ]
       }
     ]
   }
   ```

4. **If NoSuchBucket error**
   ```bash
   # Verify bucket name in Lambda environment variables
   aws lambda get-function-configuration --function-name twin-api | grep -A 5 Environment
   ```
   Check `S3_BUCKET_NAME` environment variable matches actual bucket name.

5. **If ServiceUnavailable error**
   - This is transient; exponential backoff should handle it
   - Monitor error rate; should resolve within 5 minutes
   - If persists, check AWS Service Health Dashboard

#### Long-Term (Sprint 5)

1. **Enable S3 versioning and MFA delete**
   ```bash
   aws s3api put-bucket-versioning \
     --bucket twin-personas-prod \
     --versioning-configuration Status=Enabled
   ```
   Protects against accidental deletion.

2. **Enable S3 access logging**
   ```bash
   aws s3api put-bucket-logging \
     --bucket twin-personas-prod \
     --bucket-logging-status file://logging-config.json
   ```
   Helps diagnose access issues.

3. **Implement S3 request rate optimization**
   - Use S3 Transfer Acceleration for faster uploads
   - Implement multipart upload for large files
   - Consider S3 Intelligent-Tiering for cost optimization

4. **Add S3 circuit breaker**
   - If S3 error rate > 10% for 5 minutes, return cached response
   - Graceful degradation instead of hard failure

---

## General On-Call Procedures

### Escalation Path

1. **Tier 1 (Automated Alerts)**
   - CloudWatch alarms fire → PagerDuty notification
   - On-call engineer reviews alarm and this runbook

2. **Tier 2 (Manual Diagnosis)**
   - Follow diagnosis steps in relevant section above
   - Check CloudWatch Logs and Metrics
   - Verify AWS service status

3. **Tier 3 (Remediation)**
   - Implement recovery steps (immediate or short-term)
   - Monitor metrics to confirm recovery
   - Post status update to users (if applicable)

4. **Tier 4 (Escalation)**
   - If issue persists > 30 minutes, page on-call manager
   - Consider rolling back recent deployments
   - Contact AWS support for infrastructure issues

### Monitoring Dashboard

Create a CloudWatch dashboard with these metrics:

- **Lambda**
  - Duration (p50, p99)
  - Errors
  - Throttles
  - Cold starts (via custom metric)

- **Bedrock**
  - Throttled requests
  - Latency
  - Model invocations

- **S3**
  - 4xx errors (client errors)
  - 5xx errors (server errors)
  - Request count

- **API Gateway**
  - 4xx errors
  - 5xx errors
  - Latency
  - Request count

### Post-Incident Review

After any incident:

1. **Document in LESSONS_LEARNED.md**
   - What happened
   - When it was detected
   - How long it took to resolve
   - Root cause
   - Prevention steps for next time

2. **Update this runbook**
   - Add any new diagnosis steps discovered
   - Update recovery procedures if they changed
   - Add new failure modes if encountered

3. **Create follow-up tasks**
   - Long-term fixes (e.g., provisioned concurrency)
   - Monitoring improvements
   - Documentation updates

---

## Contact and Resources

- **On-Call Rotation**: See team calendar
- **AWS Support**: https://console.aws.amazon.com/support/
- **Bedrock Documentation**: https://docs.aws.amazon.com/bedrock/
- **Lambda Documentation**: https://docs.aws.amazon.com/lambda/
- **S3 Documentation**: https://docs.aws.amazon.com/s3/
- **CloudWatch Documentation**: https://docs.aws.amazon.com/cloudwatch/
