# Security Audit Template

**Purpose**: Standardized security assessment  
**Description**: Comprehensive checklist for audits

## Audit Information
- **Date**: [YYYY-MM-DD]
- **Auditor**: [Name]
- **Scope**: [Systems covered]

## Authentication & Authorization
- [ ] Password policy enforced (12+ chars)
- [ ] MFA enabled for admin accounts
- [ ] Session timeout configured (30 min)
- [ ] JWT tokens properly validated
- [ ] RBAC implemented correctly

## Data Protection
- [ ] Database encrypted at rest (AES-256)
- [ ] TLS 1.3 for all connections
- [ ] API keys in secrets manager
- [ ] PII masked in logs
- [ ] Backup encryption enabled

## Application Security
- [ ] XSS protection (Content-Security-Policy)
- [ ] CSRF tokens on forms
- [ ] SQL injection prevention (parameterized queries)
- [ ] Input validation on all endpoints
- [ ] Security headers configured (HSTS, X-Frame-Options)

## Infrastructure
- [ ] OS patches up to date
- [ ] Docker images scanned (Trivy/Snyk)
- [ ] Kubernetes security policies
- [ ] Network policies configured
- [ ] Firewall rules reviewed

## Monitoring
- [ ] Centralized logging (ELK/Loki)
- [ ] Failed login attempts tracked
- [ ] Anomaly detection enabled
- [ ] Alerts configured (Slack/PagerDuty)

## Findings
| Severity | Issue | Recommendation | Status |
|----------|-------|----------------|--------|
| Critical |       |                |        |
| High     |       |                |        |
| Medium   |       |                |        |

## Sign-off
Security Officer: ________________  
Date: _______
