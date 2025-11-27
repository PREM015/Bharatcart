#!/bin/bash
# Export Analytics Events
# Purpose: Exports event data to CSV/JSON for analysis
# Description: Queries database and generates analytics export files

set -e

echo "🔄 Exporting analytics events..."

# Configuration
OUTPUT_DIR="./analytics-exports"
DATE=$(date +%Y-%m-%d)
DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-bharatcart}"
DB_USER="${DB_USER:-postgres}"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Export page views
echo "📊 Exporting page views..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\COPY (
  SELECT 
    timestamp,
    user_id,
    page_url,
    referrer,
    user_agent
  FROM page_views
  WHERE DATE(timestamp) = CURRENT_DATE - INTERVAL '1 day'
  ORDER BY timestamp DESC
) TO '$OUTPUT_DIR/page_views_$DATE.csv' CSV HEADER"

# Export events
echo "📊 Exporting custom events..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\COPY (
  SELECT 
    timestamp,
    user_id,
    event_name,
    event_properties,
    session_id
  FROM events
  WHERE DATE(timestamp) = CURRENT_DATE - INTERVAL '1 day'
  ORDER BY timestamp DESC
) TO '$OUTPUT_DIR/events_$DATE.csv' CSV HEADER"

# Export conversions
echo "📊 Exporting conversions..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\COPY (
  SELECT 
    timestamp,
    user_id,
    order_id,
    total_amount,
    items_count
  FROM orders
  WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
  ORDER BY timestamp DESC
) TO '$OUTPUT_DIR/conversions_$DATE.csv' CSV HEADER"

echo "✅ Export complete! Files saved to $OUTPUT_DIR"
