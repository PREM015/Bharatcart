# Incident Response Runbook

**Purpose**: Guide for handling production incidents  
**Audience**: On-call engineers, SRE team

## Severity Levels

### SEV1 - Critical
- **Definition**: Complete service outage, data loss
- **Response Time**: Immediate
- **Escalation**: CTO, VP Engineering
- **Examples**: Site down, database corruption

### SEV2 - High
- **Definition**: Major feature broken, significant users affected
- **Response Time**: 15 minutes
- **Escalation**: Engineering Manager
- **Examples**: Payment processing down, login broken

### SEV3 - Medium
- **Definition**: Minor feature issues, workaround available
- **Response Time**: 2 hours
- **Examples**: Slow page load, email delays

### SEV4 - Low
- **Definition**: Cosmetic issues, no user impact
- **Response Time**: Next business day
- **Examples**: UI glitches, logging errors

## Incident Response Process

### 1. Detection
- Monitoring alert triggers
- User report received
- Internal discovery

### 2. Triage (5 minutes)
```bash
# Quick health check
npm run health-check

# Check recent deployments
git log --oneline -10

# Check monitoring dashboards
open https://grafana.bharatcart.com
```

### 3. Communication
```markdown
# Slack announcement template
**[SEV1] Production Incident**
- **What**: Brief description
- **Impact**: Number of users affected
- **Status**: Investigating
- **Incident Commander**: @name
- **War Room**: #incident-YYYYMMDD
```

### 4. Investigation

#### Database Issues
```bash
# Check connections
psql -h postgres -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
psql -h postgres -U postgres -c "
  SELECT pid, now() - query_start as duration, query 
  FROM pg_stat_activity 
  WHERE state = 'active' 
  ORDER BY duration DESC;
"

# Check locks
psql -h postgres -U postgres -c "
  SELECT * FROM pg_locks WHERE NOT granted;
"
```

#### Redis Issues
```bash
# Check Redis memory
redis-cli INFO memory

# Check slow commands
redis-cli SLOWLOG GET 10

# Check connections
redis-cli CLIENT LIST
```

#### API Issues
```bash
# Check logs
kubectl logs -f deployment/bharatcart-api --tail=100

# Check pod health
kubectl get pods

# Check resource usage
kubectl top pods
```

### 5. Mitigation

#### Rollback Deployment
```bash
# Rollback to previous version
kubectl rollout undo deployment/bharatcart-api

# Check rollout status
kubectl rollout status deployment/bharatcart-api
```

#### Scale Up Resources
```bash
# Scale API pods
kubectl scale deployment/bharatcart-api --replicas=10

# Scale database
# (Contact DBA team)
```

#### Enable Maintenance Mode
```bash
# Enable maintenance page
kubectl apply -f k8s/maintenance-mode.yaml
```

### 6. Resolution
- Verify fix deployed
- Monitor for 30 minutes
- Update status page
- Close incident

### 7. Post-Incident

#### Post-Mortem Template
```markdown
# Incident Post-Mortem: [TITLE]

**Date**: YYYY-MM-DD
**Duration**: X hours
**Severity**: SEVX
**Incident Commander**: Name

## Summary
Brief description of what happened.

## Impact
- Users affected: X,XXX
- Revenue impact: $X,XXX
- Downtime: X hours

## Timeline
- HH:MM - Incident detected
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Incident resolved

## Root Cause
Technical explanation of what went wrong.

## Resolution
What was done to fix it.

## Action Items
- [ ] Fix X (Owner: @name, Due: YYYY-MM-DD)
- [ ] Improve monitoring for Y (Owner: @name)
- [ ] Update runbook (Owner: @name)

## Lessons Learned
What we learned and how to prevent this.
```

## Common Issues & Solutions

### Issue: API Timeout
```bash
# Check API logs
kubectl logs deployment/bharatcart-api | grep -i "timeout"

# Check database connections
psql -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Solution: Scale up or optimize queries
```

### Issue: High Memory Usage
```bash
# Check memory
kubectl top pods

# Check memory leaks
node --inspect dist/index.js

# Solution: Restart pods or fix memory leak
```

### Issue: Database Connection Pool Exhausted
```bash
# Check connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Solution: Increase max_connections or fix connection leaks
```

## Contacts

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| On-Call Engineer | Rotating | +1-XXX | @oncall |
| Engineering Manager | Name | +1-XXX | @manager |
| CTO | Name | +1-XXX | @cto |
| DBA | Name | +1-XXX | @dba |

## External Services

| Service | Status Page | Support |
|---------|-------------|---------|
| AWS | status.aws.amazon.com | Premium Support |
| Stripe | status.stripe.com | dashboard |
| SendGrid | status.sendgrid.com | support@ |
