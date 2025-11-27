# Deployment Rollback Runbook

**Purpose**: Guide for rolling back failed deployments  
**Audience**: DevOps, Engineering

## Pre-Rollback Checklist

- [ ] Verify issue is deployment-related
- [ ] Check if hotfix is faster than rollback
- [ ] Get approval from Engineering Manager
- [ ] Notify team in #deployments channel
- [ ] Create backup (if not automated)

## Kubernetes Rollback

### Quick Rollback
```bash
# Rollback to previous version
kubectl rollout undo deployment/bharatcart-api

# Check rollout status
kubectl rollout status deployment/bharatcart-api

# Verify pods are healthy
kubectl get pods -l app=bharatcart,component=api
```

### Rollback to Specific Revision
```bash
# View rollout history
kubectl rollout history deployment/bharatcart-api

# Rollback to specific revision
kubectl rollout undo deployment/bharatcart-api --to-revision=5

# Verify
kubectl rollout status deployment/bharatcart-api
```

## Docker Rollback

### Stop Current Version
```bash
# Stop current containers
docker-compose down

# Pull previous image
docker pull bharatcart/api:v1.2.0

# Update docker-compose.yml with previous tag
# Then restart
docker-compose up -d
```

## Database Migration Rollback

### Prisma Migrations
```bash
# View migration history
npx prisma migrate status

# Mark migration as rolled back
npx prisma migrate resolve --rolled-back "20240101000000_migration_name"

# Apply previous migration
npx prisma migrate deploy
```

### Manual SQL Rollback
```bash
# Connect to database
psql -h postgres -U postgres -d bharatcart

# Run rollback SQL
BEGIN;
-- Your rollback SQL here
-- Verify changes
ROLLBACK; -- or COMMIT;
```

## Vercel/Netlify Rollback

### Vercel
```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote <deployment-url>

# Or via dashboard:
# https://vercel.com/bharatcart/deployments
```

## Post-Rollback Steps

1. **Verify System Health**
```bash
# Check all services
npm run health-check

# Verify in production
curl https://bharatcart.com/health

# Check monitoring
open https://grafana.bharatcart.com
```

2. **Update Status**
```markdown
# Slack announcement
✅ **Deployment Rollback Complete**
- Rolled back to: v1.2.0
- Reason: [Brief explanation]
- Current status: Stable
- Next steps: Investigating root cause
```

3. **Create Incident**
- Log in incident management system
- Create post-mortem
- Schedule review meeting

## Prevention

### Before Deploying
- [ ] All tests passing
- [ ] Code review approved
- [ ] Deploy to staging first
- [ ] Load testing completed
- [ ] Database migrations tested
- [ ] Rollback plan documented

### Deployment Best Practices
- Use blue-green deployments
- Implement canary releases
- Enable feature flags
- Monitor key metrics during rollout
- Have rollback automation
