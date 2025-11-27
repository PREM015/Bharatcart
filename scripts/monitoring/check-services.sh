#!/bin/bash
# Check Services Health
# Purpose: Monitors health of all services
# Description: Checks API, database, cache, queues are running

set -e

echo "🏥 Checking service health..."

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
DB_HOST="${DB_HOST:-localhost}"
REDIS_HOST="${REDIS_HOST:-localhost}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Check API
echo -n "API Health: "
if curl -sf "$API_URL/health" > /dev/null; then
  echo -e "${GREEN}✅ OK${NC}"
else
  echo -e "${RED}❌ FAILED${NC}"
  exit 1
fi

# Check PostgreSQL
echo -n "PostgreSQL: "
if pg_isready -h "$DB_HOST" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ OK${NC}"
else
  echo -e "${RED}❌ FAILED${NC}"
  exit 1
fi

# Check Redis
echo -n "Redis: "
if redis-cli -h "$REDIS_HOST" ping > /dev/null 2>&1; then
  echo -e "${GREEN}✅ OK${NC}"
else
  echo -e "${RED}❌ FAILED${NC}"
  exit 1
fi

# Check disk space
echo -n "Disk Space: "
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
  echo -e "${GREEN}✅ OK ($DISK_USAGE%)${NC}"
else
  echo -e "${RED}⚠️  WARNING ($DISK_USAGE%)${NC}"
fi

# Check memory
echo -n "Memory: "
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ "$MEM_USAGE" -lt 80 ]; then
  echo -e "${GREEN}✅ OK ($MEM_USAGE%)${NC}"
else
  echo -e "${RED}⚠️  WARNING ($MEM_USAGE%)${NC}"
fi

echo "✅ All services healthy!"
