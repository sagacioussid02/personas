# Incident to GitHub Issue Mapping

This document provides a central registry of all incidents from LESSONS_LEARNED.md mapped to GitHub issues, owners, and remediation status.

## Incident Registry

| Incident | Severity | GitHub Issue | Owner | Status | Sprint | Notes |
|----------|----------|--------------|-------|--------|--------|-------|
| Lambda Build Failures from Conflicting Python Dependency Manifests | HIGH | #[B1-LAMBDA-DEPS] | Engineer | OPEN | 3 | Root cause: pyproject.toml and requirements.txt out of sync. Fix: consolidate to single source of truth, generate lock file in CI. |
| Bedrock + Lambda Cold-Start Latency on Chat Responses | MEDIUM | #[CHAT-LATENCY] | Senior Engineer | OPEN | 3 | Root cause: Lambda cold-start + Bedrock initialization overhead. Fix: reserved concurrency, CloudWatch instrumentation, retry logic. |
| Automated PR Feedback Loop from Claude Automation Triad | MEDIUM | #[AUTOMATION-LOOP] | Cloud DevOps | OPEN | 3 | Root cause: overlapping workflow triggers without concurrency guards. Fix: add concurrency groups and if: guards to prevent loops. |
| Missing Frontend Build Boundary Documentation | LOW | #[BUILD-BOUNDARY] | Documentation Engineer | OPEN | 3 | Root cause: ambiguous which package.json is authoritative. Fix: document in ARCHITECTURE.md and CONTRIBUTING.md. |
| Unprotected Destroy Workflow on Production Infrastructure | CRITICAL | #[DESTROY-GATE] | Cloud DevOps | OPEN | 3 | Root cause: destroy.yml triggered by push/PR/schedule without approval gate. Fix: add GitHub Actions environment block, workflow_dispatch only. |

## Remediation Status

### Sprint 3 Assignments

**HIGH Priority (2-3 hrs/sprint impact):**
- [ ] #[B1-LAMBDA-DEPS] - Engineer - Fix silent Lambda build failures (Bug B1)
- [ ] #[CHAT-LATENCY] - Senior Engineer - Improve chat interface quality and latency (Feature F2)

**CRITICAL Priority (P0 blast-radius risk):**
- [ ] #[DESTROY-GATE] - Cloud DevOps - Add manual approval gate to destroy.yml (Ops O1)

**MEDIUM Priority (Active defect):**
- [ ] #[AUTOMATION-LOOP] - Cloud DevOps - Fix automated PR feedback loop (Bug B2) + Add concurrency guards (Ops O2)

**LOW Priority (Onboarding friction):**
- [ ] #[BUILD-BOUNDARY] - Documentation Engineer - Document frontend build boundary (Tech Debt T4) + Write onboarding guide (Docs D1)

## Issue Template

All incident-related issues should use the incident-tracking template in `.github/ISSUE_TEMPLATE/incident-tracking.md`.

## Cross-References

- **LESSONS_LEARNED.md**: Full incident narratives and root-cause analysis
- **Sprint 3 Planning**: Refined task assignments and acceptance criteria
- **ARCHITECTURE.md**: System design and deployment pipeline documentation
- **CONTRIBUTING.md**: Developer onboarding and build pipeline guidance

## Notes

- Issue numbers are placeholders pending actual GitHub issue creation
- Owners are assigned per sprint 3 planning conversation
- All incidents have code or IaC remediations; documentation-only fixes are explicitly scoped as such
- Highest-severity incident (Lambda build failures) has parallel code fix in bug B1 track
- Destroy workflow protection is zero-cost change, promoted to P0 ops item
