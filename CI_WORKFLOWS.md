# Automated Workflow Governance

> **Audit and gate documentation for the AI auto-fix CI loop and related automated workflows.**

This document establishes clear ownership, trigger conditions, and human approval gates for all automated workflows in the twin project. It serves as the source of truth for CI governance and security controls.

---

## Workflow Registry

### 1. `claude-code-review.yml`

**Purpose:** Automated code review using Claude AI to provide feedback on pull requests.

**Trigger:**
- Event: `pull_request` (opened, synchronize, reopened)
- Scope: All PRs to `main` and feature branches
- Automation Level: Read-only (comment-only, no approval)

**Ownership:** Principal Engineer (PE) / Engineering Lead

**Human Gate:** None required for comment posting. Comments are informational only and do not block merge.

**Required Status Checks:** None (informational workflow)

**Risk Mitigation:**
- Comments are read-only; no approval or merge authority
- Developers must manually review and act on feedback
- No secrets or sensitive data passed to Claude

---

### 2. `claude-fix.yml`

**Purpose:** Automated code fixes for linting, formatting, and common issues.

**Trigger:**
- Event: `workflow_dispatch` (manual trigger only) or scheduled (if configured)
- Scope: Fixes are committed to a feature branch, not directly to `main`
- Automation Level: Creates commits and pushes to feature branch

**Ownership:** Cloud DevOps / Engineering Lead

**Human Gate:** 
- **Required:** Manual workflow dispatch trigger (no automatic event-driven execution)
- **Required:** Pull request review and approval before merge to `main`
- **Required Status Checks:** `secrets-scan.yml`, `security-scan.yml`, and all tests must pass

**Risk Mitigation:**
- No automatic trigger on push or PR events
- Fixes are pushed to a feature branch, not `main`
- All fixes must pass through standard PR review and required status checks
- Operator or designated reviewer must approve before merge

---

### 3. `claude.yml`

**Purpose:** General-purpose Claude AI workflow for code analysis and generation tasks.

**Trigger:**
- Event: `workflow_dispatch` (manual trigger only)
- Scope: Triggered by authorized team members
- Automation Level: Generates output (comments, artifacts, or reports)

**Ownership:** Principal Engineer (PE) / Engineering Lead

**Human Gate:**
- **Required:** Manual workflow dispatch trigger
- **Required:** Human review of generated output before any action is taken
- **Required Status Checks:** N/A (informational workflow)

**Risk Mitigation:**
- Manual trigger only; no automatic execution
- Output is reviewed before integration
- No direct merge or deploy authority

---

### 4. `auto-pr.yml`

**Purpose:** Automatically opens pull requests for approved changes (e.g., from `claude-fix.yml` or other automated processes).

**Trigger:**
- Event: `workflow_dispatch` or triggered by upstream automated workflows
- Scope: Creates PRs to `main` from feature branches
- Automation Level: Opens PR; does not approve or merge

**Ownership:** Cloud DevOps / Engineering Lead

**Human Gate:**
- **Required:** Pull request review and approval (standard review process)
- **Required Status Checks:** `secrets-scan.yml`, `security-scan.yml`, and all tests must pass
- **Required:** Operator or designated reviewer approval before merge
- **Explicit Rule:** PRs opened by `auto-pr.yml` are treated as standard PRs and require human approval before merge

**Risk Mitigation:**
- Opens PR but does not approve or merge
- All standard PR review gates apply
- Required status checks must pass
- No automated merge without human approval

---

### 5. `pr-responder.yml`

**Purpose:** Automated responses to PR events (e.g., comments, status updates, or workflow coordination).

**Trigger:**
- Event: `pull_request` (opened, synchronize, reopened) or `pull_request_review`
- Scope: Responds to PR activity
- Automation Level: Posts comments or updates PR metadata

**Ownership:** Cloud DevOps / Engineering Lead

**Human Gate:** None required for comment posting or status updates. Comments are informational only.

**Required Status Checks:** None (informational workflow)

**Risk Mitigation:**
- Comments and status updates are informational only
- No approval or merge authority
- Developers must manually review and act on responses

---

## Required Status Checks (Blocking Merge)

The following workflows are **required status checks** that must pass before any PR can be merged to `main`:

1. **`secrets-scan.yml`** — Scans for exposed secrets, API keys, and credentials
   - Blocks merge if secrets are detected
   - Owner: Security / Cloud DevOps

2. **`security-scan.yml`** — Performs security vulnerability scanning
   - Blocks merge if high-severity vulnerabilities are found
   - Owner: Security / Cloud DevOps

3. **All tests** (unit, integration, e2e) — Ensures code quality and functionality
   - Blocks merge if tests fail
   - Owner: Engineering Lead

**Enforcement:** GitHub branch protection rules enforce these checks. No PR can be merged without passing all required status checks.

---

## Deploy Workflow (`deploy.yml`) — Human Approval Gate

**Explicit Rule:** `deploy.yml` cannot be triggered by an automated-workflow-opened PR without human approval.

**Implementation:**
- `deploy.yml` is triggered only by `workflow_dispatch` (manual trigger) or by a specific branch (e.g., `main` after merge)
- If `deploy.yml` is triggered by a push to `main`, it requires an explicit approval gate (GitHub Actions environment with required reviewers)
- PRs opened by automated workflows (e.g., `auto-pr.yml`) do not automatically trigger `deploy.yml`
- Operator or designated release manager must manually approve deployment

**Risk Mitigation:**
- No automated deploy from automated-workflow-opened PRs
- Explicit human approval required for all production deployments
- Audit trail of who approved each deployment

---

## Workflow Chain Security

### Potential Attack Surface: `claude-fix.yml` → `auto-pr.yml` → `deploy.yml`

**Scenario:** Could an automated workflow chain bypass human review and deploy to production?

**Answer:** No. The following controls prevent this:

1. **`claude-fix.yml`** creates commits on a feature branch (not `main`)
2. **`auto-pr.yml`** opens a PR but does not approve or merge
3. **Standard PR review gates** require human approval and passing required status checks
4. **`deploy.yml`** requires explicit human approval (workflow_dispatch or environment gate)
5. **No automated merge:** Even if all status checks pass, a human must click "Merge" on the PR
6. **No automated deploy:** Even if PR is merged, a human must trigger `deploy.yml` or approve the deployment environment

**Conclusion:** The workflow chain is secure. Human approval is required at two critical gates: PR merge and deployment.

---

## Audit and Monitoring

**Audit Trail:**
- All workflow executions are logged in GitHub Actions
- All PR approvals and merges are logged in GitHub
- All deployments are logged in GitHub Actions and CloudWatch

**Monitoring:**
- Review workflow execution logs regularly for anomalies
- Monitor for unexpected automated PR opens or merges
- Alert on any deployment without corresponding human approval

**Incident Response:**
- If an automated workflow behaves unexpectedly, immediately disable it
- Review the workflow configuration and logs
- Notify the security team and operator
- Do not re-enable until root cause is identified and fixed

---

## Governance and Updates

**Owner:** Cloud DevOps Lead / Principal Engineer

**Review Cadence:** Quarterly or when workflows are added/modified

**Change Process:**
1. Propose changes to this document in a PR
2. Operator and PE review and approve
3. Update workflow files if needed
4. Merge and communicate changes to the team

**Questions or Concerns:** Contact the Cloud DevOps Lead or Principal Engineer
