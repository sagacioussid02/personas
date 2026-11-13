# Twin Project Decision Records

Material decisions — features, bug fixes, dependency upgrades, infrastructure changes, security patches, license/certificate renewals, cost changes, procurement, and team-composition changes — require a Decision Record (DR) and operator approval before execution.

This process ensures:
- Clear rationale is recorded for audit and continuity
- Technical and business tradeoffs are evaluated
- Operator retains authority over material changes
- Team alignment on scope and resource impact

## When a Decision Record is Required

✅ **Always required:**
- New feature work (non-bug-fix)
- Dependency version upgrades (major versions, security patches, new packages)
- Infrastructure changes (AWS resource provisioning, deployment model changes)
- Team composition changes (hiring, role changes)
- Security patches and compliance decisions
- License or certificate renewals
- Cost-impacting decisions (resource scaling, vendor changes)
- API contract changes that affect integrations
- Database schema changes

❌ **Not required:**
- Bug fixes scoped to a single component
- Documentation updates and clarifications
- Code style and formatting improvements
- Test additions (that don't change the API)
- Localizing existing features (no new infrastructure)
- Internal refactoring (no behavior change)

## Decision Record Format

Create a new file at `decisions/YYYYMMDD-<slug>.md` with this structure:

```markdown
# Decision: <Title>

**Date:** YYYY-MM-DD  
**Status:** Proposed | Approved | Implemented | Rejected  
**Author:** <engineer name>  
**Approver:** <operator>  

## Context

<!-- Why this decision matters. What problem does it solve? -->

## Proposal

<!-- What specifically are we deciding? Be concrete. -->

## Rationale

<!-- What are the tradeoffs? Why this option over alternatives? -->

## Impact

- **Resource:** <e.g., cost, team capacity, infrastructure>
- **Timeline:** <e.g., blocking, ready now, future work>
- **Risk:** <e.g., vendor lock-in, technical debt, operational load>
- **Rollback:** <Can this be undone? How costly?>

## Alternatives Considered

<!-- What other options were evaluated and why they were rejected. -->

## Approval

- [ ] Operator approves
- [ ] Peer review complete
- [ ] No blocking feedback
```

## Approval Workflow

1. **Engineer proposes** — Opens a Decision Record as a PR comment or file.
2. **Operator reviews** — Evaluates impact, rationale, and alignment with business goals.
3. **Operator approves or rejects** — Decision is recorded in the PR or audit log.
4. **Engineer implements** — Only after approval, code goes to branch and PR.
5. **Peer review** — Standard code review (see COMMIT_STANDARDS.md).
6. **Merge after approval** — Operator reviews final code before merge.

## Decision History

Decisions are filed in `decisions/` directory for audit and future reference:

- `decisions/20250120-hire-standard-engineer.md` — Add engineer seat on twin project

## Questions?

If you're unsure whether a change needs a Decision Record, ask in the PR. It's better to err on the side of clarity.
