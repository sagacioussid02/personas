# Secrets Scanning and Security Hardening

## Overview

This document outlines the secrets scanning and security hardening strategy for the Twin project.

## Secrets Management Policy

### Prohibited in Repository
- AWS access keys and secret keys
- API keys and tokens
- Database passwords
- Private encryption keys
- OAuth secrets
- Clerk API keys
- Session secrets (except examples)

### Proper Handling
1. All secrets must be stored in environment variables
2. Use `.env.example` files to document required variables
3. Never commit `.env` or `.env.local` files
4. Reference secrets by variable name only

## Environment Variables

### Backend Required
- `CLERK_JWKS_URL` - Clerk authentication endpoint
- `SESSION_HMAC_SECRET` - 64-character hex string for session signing
- `AWS_ACCESS_KEY_ID` - AWS credentials (from environment)
- `AWS_SECRET_ACCESS_KEY` - AWS credentials (from environment)
- `AWS_REGION` - AWS region (default: us-east-1)

### Frontend Required
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `NEXT_PUBLIC_API_URL` - Backend API endpoint

### Optional
- `USE_S3` - Enable S3 storage (default: true in production)
- `DEBUG` - Enable debug logging (default: false)

## Secrets Scanning in CI

### Tools Integrated
1. **git-secrets** - Prevents secrets from being committed
2. **TruffleHog** - Detects high-entropy strings
3. **Semgrep** - Pattern-based secret detection

### Scanning Process
1. Pre-commit hooks scan for secrets
2. CI pipeline runs comprehensive secret scanning
3. Failed scans block PR merging
4. All findings reviewed and remediated

## Hardening Measures

### Code-Level
- No hardcoded credentials anywhere
- Use environment variable references only
- Implement proper error handling (don't leak secrets in errors)
- Sanitize logs to remove sensitive data

### Infrastructure-Level
- AWS IAM policies follow least-privilege principle
- Clerk authentication properly configured
- HTTPS/TLS enforced for all communications
- CORS properly restricted

### Process-Level
- All developers use `.env.example` as template
- Secrets rotation scheduled quarterly
- Access logs monitored for suspicious activity
- Incident response plan documented

## Incident Response

### If Secret is Exposed
1. Immediately rotate the compromised secret
2. Review access logs for unauthorized use
3. Document incident with timestamp
4. Notify affected parties
5. Update security scanning rules if needed

## Compliance

- Follows OWASP secrets management guidelines
- Complies with AWS security best practices
- Aligns with Clerk security recommendations
- Regular security audits scheduled

## Verification Checklist

- [ ] No secrets in git history
- [ ] All `.env` files in `.gitignore`
- [ ] `.env.example` documents all required variables
- [ ] CI secrets scanning enabled
- [ ] Pre-commit hooks installed
- [ ] Team trained on secrets handling
- [ ] Incident response plan documented

## References

- OWASP Secrets Management: https://cheatsheetseries.owasp.org/
- AWS Security Best Practices: https://aws.amazon.com/security/
- Clerk Security: https://clerk.com/docs/security
