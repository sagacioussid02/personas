# Twin Project Commit & Review Standards

All commits to twin follow a strict review and quality gate process. This document codifies expectations for commit messages, branching, testing, and approval workflows.

## Conventional Commits

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat:` — A new feature (requires Decision Record if material)
- `fix:` — A bug fix (scoped to single component)
- `docs:` — Documentation updates (README, CONTRIBUTING, etc.)
- `style:` — Code style or formatting (linting, prettier)
- `refactor:` — Code restructuring with no behavior change
- `perf:` — Performance improvements
- `test:` — Adding or updating tests
- `chore:` — Build, CI, or dependency updates
- `ci:` — CI/CD pipeline changes (requires Decision Record)

### Scope (Optional)

Identify the area affected:

- `backend` — FastAPI services, Lambda, Bedrock integration
- `frontend` — Next.js, React, UI components
- `infra` — AWS resources, deployment, CloudFront
- `auth` — Authentication, Clerk integration
- `db` — Database schema, migrations
- `api` — REST API contracts

### Subject

- Imperative mood: "add" not "added" or "adds"
- No period at the end
- Max 50 characters
- Lowercase first letter (except proper nouns)

### Body (Optional)

- Explain *what* and *why*, not *how* (that's the code)
- Wrap at 72 characters
- Separate from subject with blank line
- Reference issue numbers: `Closes #123`

### Footer (Optional)

```
Co-authored-by: Name <email>
Breaking-change: description if applicable
```

## Example Commits

```
feat(backend): add streaming response handler for long-running chat

Upgrade Bedrock integration to support streaming InvokeModelWithResponseStream.
This reduces time-to-first-token for users and improves perceived latency.

Closes #45
```

```
fix(frontend): correct session cookie expiration logic

The session cookie was not being renewed on activity. Added explicit
refresh logic in the useAuth hook to extend expiration on each request.

Breaking-change: Session tokens are now 12 hours instead of 24.
```

```
docs: clarify environment variable setup in README
```

## Branching Model

### Branch Naming

All work branches follow the pattern:

```
minions/<role>/<short-summary>
```

Examples:

- `minions/engineer/add-streaming-chat`
- `minions/engineer/fix-session-expiry`
- `minions/operator/update-tier-pricing`

### Protected Branches

- `main` — Default branch, protected from direct pushes
- `production` — Release branch, protected from all pushes except operator

No direct commits to `main` or `master`. All changes flow through PR.

## Pull Request Process

### Before You Open

1. **Run linters locally:**
   ```bash
   npm run lint          # Frontend
   pylint backend/       # Backend
   ```

2. **Run tests:**
   ```bash
   npm test              # Frontend
   pytest backend/       # Backend
   ```

3. **Update lock files:**
   ```bash
   npm ci                # Frontend (npm-lock.json)
   uv pip compile backend/pyproject.toml -o backend/requirements.lock
   ```

4. **Review your own changes** — Read the diff before requesting review.

### Opening the PR

1. Push your branch to origin:
   ```bash
   git push origin minions/engineer/my-feature
   ```

2. Open PR against `main` (not `production`)

3. Use the PR title as your commit message (it will be squashed)

4. In PR body, explain:
   - **What:** The feature or bug fix
   - **Why:** The problem it solves
   - **How:** High-level approach (reviewers will see the code)
   - **Testing:** How to verify it works locally
   - **Related:** Issue numbers, linked PRs

### Review Gates

✅ **All of these must pass before merge:**

1. **Green CI** — All automated tests and linters pass
2. **Peer review** — Another engineer approves the code
3. **Operator review** — Operator reviews final changeset before merge
4. **No conflicts** — Branch is up-to-date with main
5. **All threads resolved** — Review comments addressed

❌ **You cannot merge your own PR** — Even if you are the operator, another engineer must approve the code first.

### Code Review Expectations

**Reviewers**, check for:
- Code style and test coverage (use the linters and test output)
- Logic correctness and edge cases
- No unrelated changes or silent deletions
- Dependencies are locked and minimal
- Documentation is clear and accurate

**Authors**, respond to feedback with:
- `Commit <hash>` if you pushed a fix
- `Agreed, changed in <file>` if you made the update
- Rationale if you disagree; escalate to operator if needed

## Testing & Quality Gates

### Frontend (Next.js / React)

```bash
npm ci                  # Install deps from lock file
npm run type-check      # TypeScript type checking
npm run lint            # ESLint + Prettier
npm test                # Jest unit tests
npm run build           # Production build (catches issues)
```

### Backend (FastAPI / Python)

```bash
cd backend
pip install -r requirements.lock
pylint **/*.py          # Code style
pytest                  # Unit and integration tests
```

### CI Runs On

- Every push to a `minions/*` branch
- Every PR opened or updated against `main`
- Merge to `main` (gates the merge)
- Manual trigger to `production` (operator only)

## Material Changes & Decision Records

See [DECISIONS.md](./DECISIONS.md) for when a Decision Record is required and how to propose material changes. Examples:

- Adding a new backend service
- Upgrading a major dependency
- Provisioning new AWS infrastructure
- Team composition changes

No code review or merge happens until the operator approves the decision.

## Merging

1. **Operator approves** the final code in the PR
2. **Operator clicks "Merge"** (or engineer merges after operator approval)
3. Branch is automatically deleted
4. Commit is squashed into a single conventional commit on `main`
5. Release notes are auto-generated from commits

If a revert is needed, treat it as a new PR (don't force-push main).

## Questions?

If a commit message feels awkward or you're unsure about scope, ask in the PR. This standard evolves as the team grows.
