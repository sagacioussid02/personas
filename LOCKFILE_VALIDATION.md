# Lock File Validation Strategy

## Overview

This document describes the validation strategy for dependency lock files in the Twin project.

## Lock Files Covered

### Frontend (Node.js)
- **File**: `frontend/package-lock.json`
- **Manager**: npm
- **Node Version**: >=20.0.0
- **Last Updated**: See git history

### Backend (Python)
- **File**: `backend/requirements.txt`
- **Manager**: pip / uv
- **Python Version**: 3.12+
- **Last Updated**: See git history

## Validation Process

### Pre-Commit Validation
1. Verify lock file syntax is valid JSON/format
2. Check for duplicate entries
3. Validate version constraints
4. Ensure all dependencies are resolvable

### CI Pipeline Validation
1. Run `npm ci` (frontend) to verify lock file integrity
2. Run `pip install -r requirements.txt` (backend) to verify dependencies
3. Execute security scanning on installed packages
4. Validate no conflicting versions exist

### Dependency Integrity Checks
- Verify package checksums match published versions
- Ensure no packages are missing from lock file
- Check for transitive dependency conflicts
- Validate version ranges are appropriate

## Update Procedure

### Frontend Updates
```bash
cd frontend
npm update
npm audit fix
npm ci  # Verify lock file
```

### Backend Updates
```bash
cd backend
pip install --upgrade -r requirements.txt
pip check  # Verify no conflicts
```

## Security Considerations

- All updates require security audit
- Vulnerable packages must be updated immediately
- Lock files should be committed to version control
- Regular dependency updates scheduled monthly

## Validation Checklist

- [ ] Lock file syntax is valid
- [ ] All dependencies are resolvable
- [ ] No security vulnerabilities detected
- [ ] Version constraints are appropriate
- [ ] Transitive dependencies are compatible
- [ ] Installation succeeds in clean environment
- [ ] All tests pass with new dependencies

## Troubleshooting

### Common Issues

**Issue**: Lock file conflicts
- **Solution**: Delete lock file and regenerate with `npm install` or `pip freeze`

**Issue**: Dependency resolution failures
- **Solution**: Check version constraints, may need to update package.json/requirements.txt

**Issue**: Security vulnerabilities in dependencies
- **Solution**: Update to patched version, or find alternative package

## References

- npm documentation: https://docs.npmjs.com/
- pip documentation: https://pip.pypa.io/
- Python packaging: https://packaging.python.org/
