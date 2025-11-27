#!/bin/bash
# Setup Database
# Purpose: Initializes database for development
# Description: Creates database, runs migrations, seeds data

set -e

echo "🗄️  Setting up database..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

DB_NAME="${DB_NAME:-bharatcart}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"

# Create database
echo "Creating database..."
psql -h "$DB_HOST" -U "$DB_USER" -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 ||   psql -h "$DB_HOST" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME"

echo "✅ Database created"

# Run Prisma migrations
echo "Running migrations..."
npx prisma migrate dev

echo "✅ Migrations complete"

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

echo "✅ Prisma Client generated"

# Seed database
echo "Seeding database..."
npx prisma db seed

echo "✅ Database seeded"

# Show database info
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
  SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

echo "✅ Database setup complete!"
