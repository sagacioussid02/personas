# FEAT-01: Secrets Scan Hardening Checklist

## Overview

The `twin` platform handles personal voice/judgment data and integrates with AWS Bedrock, Lambda, and S3. A misconfigured or incomplete secrets scan is an active credential-leakage exposure.

**This checklist ensures CI security workflows are reviewed, gaps are documented, and at least one enforcement gap is remediated.**

---

## Pre-Execution Setup

- [ ] Clone the repo and check out the latest `main` branch
- [ ] Create a fresh branch for this work: `git checkout -b minions/engineer/secrets-scan-hardening`
- [ ] Identify the CI workflows: `.github/workflows/secrets-scan.yml` and `.github/workflows/security-scan.yml`

---

## Step 1: Review Secrets-Scan Workflow

### 1.1 Examine the current workflow
```bash
cat .github/workflows/secrets-scan.yml
```
- [ ] Workflow file exists and is readable
- [ ] Document the current scanning tool(s) used (e.g., `truffleHog`, `detect-secrets`, `gitleaks`)
- [ ] Note the current enforcement posture (blocking vs. warning-only)

### 1.2 Identify secret patterns covered
- [ ] AWS Access Key ID patterns (e.g., `AKIA...`)
- [ ] AWS Secret Access Key patterns
- [ ] Anthropic API key patterns (e.g., `sk-ant-...`)
- [ ] Clerk API keys (e.g., `pk_test_...`, `sk_test_...`)
- [ ] Generic private key patterns (RSA, EC, PGP)
- [ ] Database connection strings
- [ ] OAuth tokens and refresh tokens

### 1.3 Document coverage gaps
- [ ] List any secret patterns that are NOT currently scanned
- [ ] Note any false-negative patterns (secrets that might slip through)
- [ ] Identify any overly broad patterns that might cause false positives

---

## Step 2: Review Security-Scan Workflow

### 2.1 Examine the current workflow
```bash
cat .github/workflows/security-scan.yml
```
- [ ] Workflow file exists and is readable
- [ ] Document the current scanning tool(s) used (e.g., `npm audit`, `pip-audit`, `snyk`)
- [ ] Note the current enforcement posture (blocking vs. warning-only)

### 2.2 Identify vulnerability checks covered
- [ ] npm package vulnerabilities (high/critical severity)
- [ ] Python package vulnerabilities (high/critical severity)
- [ ] Dependency version constraints
- [ ] Known vulnerable package versions

### 2.3 Document coverage gaps
- [ ] List any vulnerability types that are NOT currently scanned
- [ ] Note any false-negative patterns (vulnerabilities that might slip through)
- [ ] Identify any overly broad patterns that might cause false positives

---

## Step 3: Assess Enforcement Posture

### 3.1 Secrets-scan enforcement
- [ ] Does the workflow fail the build on secret detection? (blocking)
- [ ] Or does it only warn? (warning-only)
- [ ] Are there any exceptions or allow-lists that might weaken enforcement?

### 3.2 Security-scan enforcement
- [ ] Does the workflow fail the build on high/critical vulnerabilities? (blocking)
- [ ] Or does it only warn? (warning-only)
- [ ] Are there any exceptions or allow-lists that might weaken enforcement?

### 3.3 Document enforcement gaps
- [ ] Identify any warning-only rules that should be promoted to blocking
- [ ] Note any allow-lists that might be too permissive
- [ ] List any missing enforcement rules

---

## Step 4: Identify Remediation Opportunities

### 4.1 High-priority gaps
- [ ] **Gap 1:** Identify the single highest-impact enforcement gap (e.g., "secrets-scan only warns, does not block")
- [ ] **Gap 2:** Identify a secondary gap for documentation (e.g., "AWS credential patterns are not explicitly configured")

### 4.2 Remediation plan
- [ ] Document the specific change needed to remediate Gap 1
- [ ] Document the specific change needed to remediate Gap 2
- [ ] Estimate effort for each remediation

---

## Step 5: Implement Remediation

### 5.1 Remediate Gap 1 (Blocking Enforcement)

**Example:** If secrets-scan currently only warns, promote it to blocking:

```yaml
# Before:
- name: Scan for secrets
  run: |
    truffleHog filesystem . --json > secrets-report.json || true

# After:
- name: Scan for secrets
  run: |
    truffleHog filesystem . --json > secrets-report.json
    if [ -s secrets-report.json ]; then
      echo "Secrets detected!"
      cat secrets-report.json
      exit 1
    fi
```

- [ ] Modify the workflow to fail the build on secret detection
- [ ] Test the change locally (if possible)
- [ ] Document the change in the PR description

### 5.2 Remediate Gap 2 (Coverage Documentation)

**Example:** Add explicit secret pattern configuration:

```yaml
# Add a comment documenting covered patterns:
# Scanned patterns:
#   - AWS Access Key ID (AKIA...)
#   - AWS Secret Access Key
#   - Anthropic API keys (sk-ant-...)
#   - Clerk API keys (pk_test_..., sk_test_...)
#   - Private keys (RSA, EC, PGP)
#   - Database connection strings
#   - OAuth tokens
```

- [ ] Add documentation to the workflow file
- [ ] Ensure all relevant secret patterns are explicitly listed
- [ ] Document any patterns that are intentionally NOT scanned (with rationale)

---

## Step 6: Validation

### 6.1 Verify workflow syntax
```bash
node -e "const yaml = require('js-yaml'); console.log(yaml.load(require('fs').readFileSync('.github/workflows/secrets-scan.yml', 'utf8')))"
```
- [ ] Workflow YAML is valid
- [ ] No syntax errors

### 6.2 Test the workflow (if possible)
- [ ] Create a test commit with a fake secret (e.g., `AKIA1234567890ABCDEF`)
- [ ] Push to a test branch
- [ ] Verify the workflow detects and blocks the secret
- [ ] Revert the test commit

### 6.3 Verify CI will pass
- [ ] Push branch to remote: `git push origin minions/engineer/secrets-scan-hardening`
- [ ] Open a PR targeting `main`
- [ ] Wait for CI to complete
- [ ] [ ] All CI checks pass

---

## Step 7: Documentation & Commit

### 7.1 Create findings summary

Document the following in the PR description:

**Findings Summary:**

1. **Current State:**
   - Secrets-scan tool: [tool name]
   - Enforcement: [blocking/warning-only]
   - Coverage: [list of patterns]

2. **Gaps Identified:**
   - Gap 1: [description]
   - Gap 2: [description]
   - Gap 3: [description]

3. **Remediations Implemented:**
   - Remediation 1: [description]
   - Remediation 2: [description]

4. **Remaining Gaps (for future sprints):**
   - [description]
   - [description]

- [ ] Findings are documented and clear
- [ ] Rationale for each remediation is explained

### 7.2 Commit changes
```bash
git add .github/workflows/secrets-scan.yml .github/workflows/security-scan.yml
git commit -m "feat: harden secrets-scan and security-scan CI workflows

Validated and hardened CI security scanning:
- Promoted secrets-scan to blocking enforcement
- Documented covered secret patterns (AWS, Anthropic, Clerk, keys, tokens)
- Reviewed security-scan coverage for npm and Python dependencies
- Added explicit pattern documentation to workflows

Findings summary:
- Current enforcement: [blocking/warning-only]
- Covered patterns: AWS credentials, Anthropic API keys, Clerk keys, private keys, tokens
- Gaps identified and documented for future sprints

Closes FEAT-01"
```
- [ ] Commit message is clear and references FEAT-01
- [ ] All workflow changes are committed

---

## Acceptance Criteria (Final Verification)

- [ ] Both workflows reviewed and gaps documented
- [ ] At least one enforcement gap remediated (e.g., warning-only rules promoted to blocking)
- [ ] Scan coverage confirmed against all secret patterns relevant to AWS credentials, Anthropic API keys, and other keys referenced in the project
- [ ] PR includes a brief findings summary comment
- [ ] Workflow YAML is valid and passes syntax checks
- [ ] CI passes on the PR
- [ ] PR is ready for peer review

---

## Troubleshooting

### Issue: Workflow YAML is invalid
**Solution:** Use an online YAML validator or `yamllint` to check syntax. Ensure proper indentation and quote escaping.

### Issue: Secrets-scan produces false positives
**Solution:** Add allow-list entries for known false positives (e.g., test credentials, example values). Document the rationale in the workflow.

### Issue: Secrets-scan misses certain patterns
**Solution:** Add custom regex patterns or configure the scanning tool to detect additional secret types. Document the new patterns in the workflow.

### Issue: CI fails due to workflow changes
**Solution:** Verify the workflow syntax is correct. Check the CI logs for specific error messages. Common causes include incorrect indentation, missing required fields, or invalid action versions.

---

*Checklist prepared for sprint item FEAT-01. Follow in order and check off each step as completed.*
