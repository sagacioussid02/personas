# Python Dependency Manifest Guide

## Overview

This project uses a single source of truth for Python dependencies: **`backend/pyproject.toml`**.

The `backend/requirements.txt` file is **auto-generated** from `pyproject.toml` and should never be edited directly.

## Why This Matters

Previously, the project maintained both `pyproject.toml` and `requirements.txt` independently, which led to:
- Silent build failures when dependencies diverged
- 2-3 hours per sprint lost to debugging manifest mismatches
- Unpredictable Lambda deployment artifacts

## Workflow

### Adding or Updating a Dependency

1. **Edit `backend/pyproject.toml`** only
   ```toml
   dependencies = [
       "fastapi==0.104.1",
       "new-package==1.2.3",  # Add here
   ]
   ```

2. **Regenerate `requirements.txt`**
   ```bash
   cd backend
   pip-compile pyproject.toml --output-file=requirements.txt
   ```

3. **Commit both files**
   ```bash
   git add backend/pyproject.toml backend/requirements.txt
   git commit -m "deps: add new-package"
   ```

### Local Development

```bash
cd backend
pip install -r requirements.txt
```

Or, if using `uv` (faster):
```bash
cd backend
uv pip install -r requirements.txt
```

### CI/CD Validation

The GitHub Actions workflow `.github/workflows/build-artifacts.yml` automatically:
1. Regenerates `requirements.txt` from `pyproject.toml`
2. Fails the build if the committed `requirements.txt` is out of sync
3. Provides clear instructions to fix the issue

## Python Version

The project targets **Python 3.12**. This is pinned in:
- `backend/.python-version` (for `pyenv` and similar tools)
- `backend/pyproject.toml` (`requires-python = ">=3.12"`)
- `.github/workflows/build-artifacts.yml` (CI environment)

## Troubleshooting

### "requirements.txt is out of sync" error in CI

**Fix:**
```bash
cd backend
pip install pip-tools
pip-compile pyproject.toml --output-file=requirements.txt
git add requirements.txt
git commit --amend --no-edit
git push --force-with-lease
```

### Missing transitive dependencies

If a package is missing from `requirements.txt`, it's likely a transitive dependency that `pip-compile` will pick up automatically. Run the regeneration step above.

### Development dependencies

Development-only packages (pytest, black, mypy, etc.) are listed under `[project.optional-dependencies]` in `pyproject.toml`:

```bash
cd backend
pip install -e ".[dev]"
```

## References

- [PEP 517 – A build-system independent format](https://www.python.org/dev/peps/pep-0517/)
- [PEP 518 – Specifying build system requirements](https://www.python.org/dev/peps/pep-0518/)
- [pip-tools documentation](https://github.com/jazzband/pip-tools)
