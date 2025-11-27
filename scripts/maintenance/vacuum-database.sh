#!/bin/bash
# Vacuum Database
# Purpose: Optimizes PostgreSQL database performance
# Description: Runs VACUUM ANALYZE to reclaim space and update statistics

set -e

echo "🔧 Running database vacuum..."

DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-bharatcart}"
DB_USER="${DB_USER:-postgres}"

# Full vacuum (reclaims space)
echo "Running VACUUM FULL..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "VACUUM FULL VERBOSE;"

# Analyze (updates statistics)
echo "Running ANALYZE..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "ANALYZE VERBOSE;"

# Reindex
echo "Running REINDEX..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "REINDEX DATABASE $DB_NAME;"

echo "✅ Database optimization complete!"

# Show database size
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
  SELECT 
    pg_size_pretty(pg_database_size('$DB_NAME')) as size;
"
