# Lessons Learned

This document captures production incidents, root causes, and remediations from the Personality Twin platform. Each incident is linked to a GitHub issue for tracking and code-level fixes.

## Incident Log

### 1. Lambda Build Failures from Conflicting Python Dependency Manifests

**Severity:** HIGH  
**Date Discovered:** 2024-01-15  
**Status:** OPEN → Issue #[B1-LAMBDA-DEPS]  
**Owner:** Engineer  

**Narrative:**
Engineers reported 2-3 hours per sprint lost to Lambda build failures caused by pyproject.toml and requirements.txt being out of sync. The build pipeline would fail silently in CI without clear error messages, forcing manual investigation.

**Root Cause:**
Dual Python dependency manifests (pyproject.toml and requirements.txt) exist simultaneously in the backend. When developers update one file, the other becomes stale. The Lambda build process reads requirements.txt, but developers often only update pyproject.toml, causing dependency resolution failures during packaging.

**Impact:**
- 2-3 hours per sprint of unplanned debugging
- Delayed deployments
- Inconsistent local vs. CI behavior
- Silent failures in automated builds

**Remediation (Code Fix):**
- Consolidate to pyproject.toml as single source of truth
- Generate requirements.txt via pip-compile or uv export in CI
- Add build-artifacts.yml check to fail if generated requirements.txt differs from committed version
- Document in CONTRIBUTING.md that pyproject.toml is authoritative

**Related Issues:**
- Bug B1: Fix silent Lambda build failures caused by conflicting Python dependency manifests
- Tech Debt T1: Consolidate Python dependency manifests and enforce lock-file in CI

---

### 2. Bedrock + Lambda Cold-Start Latency on Chat Responses

**Severity:** MEDIUM  
**Date Discovered:** 2024-01-14  
**Status:** OPEN → Issue #[CHAT-LATENCY]  
**Owner:** Senior Engineer  

**Narrative:**
Users reported slow chat response times, particularly on the first interaction after a period of inactivity. Investigation revealed Lambda cold-start overhead combined with Bedrock model initialization delays.

**Root Cause:**
Lambda functions are provisioned on-demand without reserved concurrency. Bedrock model invocations add 1-2 seconds of initialization overhead. Combined, cold-start latency can exceed 5-10 seconds, breaking the "fluid in-character chat" promise in the README.

**Impact:**
- P95 chat latency exceeds acceptable thresholds
- Poor user experience on first interaction
- Reduced engagement and perceived quality
- Reliability issues under normal load

**Remediation (Code + IaC Fix):**
- Implement Lambda reserved concurrency or provisioned concurrency for chat endpoint
- Add CloudWatch instrumentation to track cold-start vs. warm-start latency
- Implement graceful retry logic for Bedrock timeouts
- Document p95 latency SLO in ARCHITECTURE.md
- Consider model caching or warm-up strategies

**Related Issues:**
- Feature F2: Improve conversational chat interface quality and latency

---

### 3. Automated PR Feedback Loop from Claude Automation Triad

**Severity:** MEDIUM  
**Date Discovered:** 2024-01-13  
**Status:** OPEN → Issue #[AUTOMATION-LOOP]  
**Owner:** Cloud DevOps  

**Narrative:**
CI workflows (claude-code-review.yml, claude-fix.yml, claude.yml combined with auto-pr.yml and pr-responder.yml) were observed creating automated commit→PR→review→fix loops. A single code change would trigger multiple automated responses, creating noisy PR history and spurious commits.

**Root Cause:**
Multiple Claude automation workflows trigger on overlapping events (PR creation, commits, reviews) without concurrency guards or trigger-condition guards. When one workflow creates a commit, it triggers another workflow, which creates a PR, which triggers the first workflow again, creating a loop.

**Impact:**
- Noisy PR history with spurious automated commits
- Wasted CI resources
- Confusion about actual code changes vs. automation artifacts
- Potential for infinite loops if not caught

**Remediation (IaC Fix):**
- Add concurrency groups to claude-code-review.yml, claude-fix.yml, and claude.yml
- Implement if: guards to prevent simultaneous execution on the same PR
- Document intended event scope for each workflow
- Add trigger-condition comments explaining why each workflow fires
- Test scenario: verify no automated loop is reproducible

**Related Issues:**
- Bug B2: Fix automated PR feedback loop triggered by Claude automation triad
- Ops O2: Add concurrency guards to Claude automation triad to prevent PR feedback loops

---

### 4. Missing Frontend Build Boundary Documentation

**Severity:** LOW  
**Date Discovered:** 2024-01-12  
**Status:** OPEN → Issue #[BUILD-BOUNDARY]  
**Owner:** Documentation Engineer  

**Narrative:**
Root-level TSX/JS files exist alongside the frontend/ directory, creating ambiguity about which package.json is authoritative. Engineers reported wrong-artifact deploys and onboarding friction from unclear build boundaries.

**Root Cause:**
No clear documentation of which files belong to root tooling vs. the Next.js app. The build pipeline uses root package.json, but developers sometimes assume frontend/package.json is authoritative, leading to incorrect artifact builds.

**Impact:**
- Wrong artifacts deployed to production
- Onboarding friction for new engineers
- Inconsistent build behavior
- Potential for silent deployment failures

**Remediation (Documentation Fix):**
- Document in ARCHITECTURE.md which files belong to root tooling vs. Next.js app
- Add inline comments in build-artifacts.yml explaining the split
- Update CONTRIBUTING.md with clear guidance on which package.json to modify
- Document why the split exists (if architectural reason) or plan consolidation

**Related Issues:**
- Tech Debt T4: Document frontend build boundary in ARCHITECTURE.md
- Docs D1: Write developer onboarding guide covering local setup, build pipeline, and deployment

---

### 5. Unprotected Destroy Workflow on Production Infrastructure

**Severity:** CRITICAL  
**Date Discovered:** 2024-01-11  
**Status:** OPEN → Issue #[DESTROY-GATE]  
**Owner:** Cloud DevOps  

**Narrative:**
destroy.yml workflow on production AWS stack (Lambda, S3, CloudFront, Bedrock) has no documented environment protection. Combined with auto-pr.yml and claude-fix.yml automation, an accidental trigger could cause total infrastructure loss.

**Root Cause:**
Workflow is triggered by push, PR, and schedule events in addition to manual workflow_dispatch. No GitHub Actions environment block with required reviewers. No safeguards against accidental execution.

**Impact:**
- Total infrastructure loss risk (P0)
- Production data loss
- Service unavailability
- Potential for accidental trigger via automated workflows

**Remediation (IaC Fix):**
- Add GitHub Actions environment block with required reviewers to destroy.yml
- Change trigger to workflow_dispatch only (remove push, PR, schedule triggers)
- Document the manual approval requirement
- Test that non-manual triggers do not execute
- Add confirmation prompt in workflow for additional safety

**Related Issues:**
- Ops O1: Add manual approval gate to destroy.yml workflow

---

## Summary

All incidents have been mapped to GitHub issues with assigned owners. The highest-severity incidents (Lambda build failures, chat latency, destroy workflow protection) are prioritized for sprint 3 remediation. Documentation-only incidents (build boundary) are scoped as documentation fixes. All remediations include code or IaC changes, not documentation alone.

## Tracking

See INCIDENT_ISSUES.md for the complete registry of incidents mapped to GitHub issues, owners, and remediation status.
