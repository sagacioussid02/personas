# Triaged Issues from LESSONS_LEARNED.md

## Issue Tracking and Sprint Planning

This document tracks all incidents and failure modes documented in LESSONS_LEARNED.md, with severity levels, ownership, and sprint targets.

---

## P0 - Critical (Production Teardown / Data Loss Risk)

### Issue #1: Lambda Cold Start Timeouts
- **Severity**: P0 (Critical)
- **Owner**: cloud_devops
- **Sprint Target**: Sprint 4 (this sprint)
- **Status**: In Progress
- **Description**: Lambda functions exceed 30-second API Gateway timeout during cold starts, returning 504 Gateway Timeout to users. Bedrock model initialization adds 8-12 seconds to first invocation.
- **Root Cause**: No provisioned concurrency; model loaded on every cold start.
- **Mitigation**: 
  - Code fix: Implement graceful timeout handling and user-facing error message (merged Sprint 4)
  - Infrastructure: Enable Lambda provisioned concurrency (deferred to Sprint 5)
  - Monitoring: CloudWatch alarm on Lambda duration percentile (merged Sprint 4)
- **Runbook**: See RUNBOOK.md § Lambda Cold Start Recovery

### Issue #2: Bedrock Throttling (Rate Limiting)
- **Severity**: P0 (Critical)
- **Owner**: cloud_devops
- **Sprint Target**: Sprint 4 (this sprint)
- **Status**: In Progress
- **Description**: Bedrock API returns 429 ThrottlingException under concurrent load (>5 simultaneous requests). Users see raw 500 Internal Server Error.
- **Root Cause**: No request queuing or backoff; no per-user rate limiting.
- **Mitigation**:
  - Code fix: Implement exponential backoff and user-facing error message (merged Sprint 4)
  - Infrastructure: Request Bedrock quota increase (deferred to Sprint 5)
  - Monitoring: CloudWatch alarm on Bedrock throttle count (merged Sprint 4)
- **Runbook**: See RUNBOOK.md § Bedrock Throttling Recovery

### Issue #3: S3 Failures (Access Denied / Bucket Not Found)
- **Severity**: P0 (Critical)
- **Owner**: cloud_devops
- **Sprint Target**: Sprint 4 (this sprint)
- **Status**: In Progress
- **Description**: S3 read/write failures (AccessDenied, NoSuchBucket, ServiceUnavailable) return raw 500 errors. No retry logic; transient failures are not recovered.
- **Root Cause**: No error handling; no exponential backoff for transient failures.
- **Mitigation**:
  - Code fix: Implement retry logic with exponential backoff and user-facing error message (merged Sprint 4)
  - Infrastructure: Verify S3 bucket policy and IAM role (deferred to Sprint 5)
  - Monitoring: CloudWatch alarm on S3 error rate (merged Sprint 4)
- **Runbook**: See RUNBOOK.md § S3 Failure Recovery

---

## P1 - High (Service Degradation)

### Issue #4: Missing Lock Files (Non-Reproducible Builds)
- **Severity**: P1 (High)
- **Owner**: cloud_devops
- **Sprint Target**: Sprint 4
- **Status**: Deferred (assigned to separate tech-debt task)
- **Description**: No package-lock.json, yarn.lock, or poetry.lock. CI builds may ship different dependency versions than tested.
- **Root Cause**: Lock files not committed; dual Python dependency files (pyproject.toml + requirements.txt).
- **Mitigation**: Enforce lock files in CI (separate task: "Enforce lock files and reproducible installs in CI")

### Issue #5: destroy.yml Without Manual Approval Gate
- **Severity**: P1 (High)
- **Owner**: cloud_devops
- **Sprint Target**: Sprint 4
- **Status**: Deferred (assigned to separate ops task)
- **Description**: destroy.yml can tear down entire production stack without human approval. No environment protection rules.
- **Root Cause**: Workflow trigger not restricted; no required reviewers.
- **Mitigation**: Add manual approval gate to destroy.yml (separate task: "Add manual approval gate to destroy.yml")

---

## P2 - Medium (Operational Friction)

### Issue #6: Dual Python Dependency Files
- **Severity**: P2 (Medium)
- **Owner**: engineer
- **Sprint Target**: Sprint 4
- **Status**: Deferred (assigned to separate tech-debt task)
- **Description**: Both pyproject.toml and requirements.txt maintained separately. Constant sync overhead; CI drift.
- **Root Cause**: No single source of truth; manual maintenance of both files.
- **Mitigation**: Consolidate to pyproject.toml with pip-compile lock artifact (separate task: "Consolidate Python dependency files to single source of truth")

### Issue #7: AI Auto-Fix Loop Without Human Gate
- **Severity**: P2 (Medium)
- **Owner**: cloud_devops
- **Sprint Target**: Sprint 4
- **Status**: Deferred (assigned to separate ops task)
- **Description**: claude-fix.yml + auto-pr.yml + pr-responder.yml may open, approve, and merge PRs without human review.
- **Root Cause**: No documented trigger restrictions; no required status checks blocking merge.
- **Mitigation**: Audit and gate AI auto-fix CI loop (separate task: "Audit and gate AI auto-fix CI loop")

---

## P3 - Low (Documentation / Onboarding)

### Issue #8: Missing Architecture Documentation
- **Severity**: P3 (Low)
- **Owner**: documentation_engineer
- **Sprint Target**: Sprint 4
- **Status**: Deferred (assigned to separate docs task)
- **Description**: No ARCHITECTURE.md or RUNBOOK.md. Engineers and on-call responders lack operational reference.
- **Root Cause**: Knowledge exists only in incident logs and tribal knowledge.
- **Mitigation**: Write ARCHITECTURE.md and RUNBOOK.md (separate task: "Write architecture and runbook documentation for the serverless twin stack")

### Issue #9: Monorepo Package.json Boundary Unclear
- **Severity**: P3 (Low)
- **Owner**: documentation_engineer
- **Sprint Target**: Sprint 4
- **Status**: Deferred (assigned to separate docs task)
- **Description**: Engineers unsure whether to edit root package.json or frontend/package.json. Daily friction.
- **Root Cause**: No documented rule in CONTRIBUTING.md.
- **Mitigation**: Document boundary in CONTRIBUTING.md (separate task: "Document monorepo package.json boundary in CONTRIBUTING.md")

---

## Summary

| Severity | Count | Sprint Target | Status |
|----------|-------|---------------|--------|
| P0 (Critical) | 3 | Sprint 4 | In Progress (this PR) |
| P1 (High) | 2 | Sprint 4 | Deferred (separate tasks) |
| P2 (Medium) | 2 | Sprint 4 | Deferred (separate tasks) |
| P3 (Low) | 2 | Sprint 4 | Deferred (separate tasks) |

**This PR addresses the three P0 items with code fixes, error handling, CloudWatch alarms, and operational runbook.**
