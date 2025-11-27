# Database Backup & Restore Runbook

**Purpose**: Backup and restore procedures for PostgreSQL  
**Audience**: DBA, DevOps, SRE

## Backup Schedule

| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Full | Daily 2 AM UTC | 30 days | S3 |
| Incremental | Every 6 hours | 7 days | S3 |
| Point-in-Time | WAL archiving | 7 days | S3 |

## Manual Backup

### Full Database Backup
```bash
# Create backup
pg_dump -h postgres -U postgres -Fc bharatcart > backup_$(date +%Y%m%d_%H%M%S).dump

# Compress
gzip backup_*.dump

# Upload to S3
aws s3 cp backup_*.dump.gz s3://bharatcart-backups/manual/
```

### Schema-Only Backup
```bash
# Backup schema
pg_dump -h postgres -U postgres -s bharatcart > schema_$(date +%Y%m%d).sql
```

### Data-Only Backup
```bash
# Backup data
pg_dump -h postgres -U postgres -a bharatcart > data_$(date +%Y%m%d).sql
```

### Specific Tables
```bash
# Backup specific tables
pg_dump -h postgres -U postgres -t users -t orders bharatcart > tables_backup.sql
```

## Automated Backup

### Kubernetes CronJob
```yaml
# Already configured in k8s/jobs/backup-cronjob.yaml
# Runs daily at 2 AM UTC
```

### Verify Backups
```bash
# List recent backups
aws s3 ls s3://bharatcart-backups/postgres/ --recursive | tail -10

# Download and verify
aws s3 cp s3://bharatcart-backups/postgres/latest.dump.gz .
gunzip latest.dump.gz
pg_restore --list latest.dump
```

## Restore Procedures

### Full Database Restore

⚠️ **WARNING**: This will overwrite the database!

```bash
# 1. Stop application
kubectl scale deployment/bharatcart-api --replicas=0

# 2. Download backup
aws s3 cp s3://bharatcart-backups/postgres/backup_20240101.dump.gz .
gunzip backup_20240101.dump.gz

# 3. Drop existing database (CAREFUL!)
psql -h postgres -U postgres -c "DROP DATABASE bharatcart;"

# 4. Create new database
psql -h postgres -U postgres -c "CREATE DATABASE bharatcart;"

# 5. Restore
pg_restore -h postgres -U postgres -d bharatcart backup_20240101.dump

# 6. Verify
psql -h postgres -U postgres -d bharatcart -c "SELECT COUNT(*) FROM users;"

# 7. Restart application
kubectl scale deployment/bharatcart-api --replicas=3
```

### Partial Restore (Specific Tables)
```bash
# Restore only users table
pg_restore -h postgres -U postgres -d bharatcart -t users backup.dump
```

### Point-in-Time Recovery (PITR)
```bash
# Restore to specific timestamp
# 1. Restore base backup
pg_restore -h postgres -U postgres -d bharatcart base_backup.dump

# 2. Configure recovery
cat > recovery.conf << EOF
restore_command = 'aws s3 cp s3://bharatcart-backups/wal/%f %p'
recovery_target_time = '2024-01-01 12:00:00 UTC'
EOF

# 3. Restart PostgreSQL
# PostgreSQL will replay WAL logs to target time
```

## Disaster Recovery

### Complete Failure Scenario
```bash
# 1. Provision new database instance
# 2. Restore from S3 backup
# 3. Update DNS/connection strings
# 4. Verify data integrity
# 5. Resume operations
```

### Data Corruption Recovery
```bash
# 1. Identify corruption scope
psql -c "SELECT * FROM pg_stat_database WHERE datname = 'bharatcart';"

# 2. Restore affected tables from backup
pg_restore -h postgres -U postgres -d bharatcart -t corrupted_table backup.dump

# 3. Verify data
```

## Backup Verification

### Monthly Backup Tests
```bash
# 1. Restore to test database
createdb test_restore
pg_restore -d test_restore latest_backup.dump

# 2. Run verification queries
psql -d test_restore -c "SELECT COUNT(*) FROM users;"
psql -d test_restore -c "SELECT COUNT(*) FROM orders;"

# 3. Drop test database
dropdb test_restore
```

## Monitoring

### Backup Alerts
- Backup failure: Critical alert
- Backup size deviation >20%: Warning
- Backup duration >2 hours: Warning

### Metrics to Track
- Backup size over time
- Backup duration
- Success/failure rate
- Restore test results
