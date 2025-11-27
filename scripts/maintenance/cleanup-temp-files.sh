#!/bin/bash
# Cleanup Temporary Files
# Purpose: Removes old temporary files and cache
# Description: Cleans up uploads, logs, cache to free disk space

set -e

echo "🧹 Cleaning up temporary files..."

# Configuration
TEMP_DIR="/tmp/bharatcart"
UPLOADS_DIR="./public/uploads"
LOGS_DIR="./logs"
CACHE_DIR="./.next/cache"
DAYS_OLD=7

# Clean temp directory
if [ -d "$TEMP_DIR" ]; then
  echo "🗑️  Removing files older than $DAYS_OLD days from $TEMP_DIR..."
  find "$TEMP_DIR" -type f -mtime +$DAYS_OLD -delete
  echo "✅ Cleaned temp directory"
fi

# Clean old uploads
if [ -d "$UPLOADS_DIR/temp" ]; then
  echo "🗑️  Removing temporary uploads..."
  find "$UPLOADS_DIR/temp" -type f -mtime +1 -delete
  echo "✅ Cleaned temporary uploads"
fi

# Clean old logs
if [ -d "$LOGS_DIR" ]; then
  echo "🗑️  Removing logs older than 30 days..."
  find "$LOGS_DIR" -name "*.log" -type f -mtime +30 -delete
  echo "✅ Cleaned old logs"
fi

# Clean Next.js cache
if [ -d "$CACHE_DIR" ]; then
  echo "🗑️  Clearing Next.js cache..."
  rm -rf "$CACHE_DIR"
  echo "✅ Cleared Next.js cache"
fi

# Clean npm cache
echo "🗑️  Cleaning npm cache..."
npm cache clean --force

# Clean Docker unused resources
if command -v docker &> /dev/null; then
  echo "🗑️  Cleaning Docker unused resources..."
  docker system prune -f --volumes
  echo "✅ Cleaned Docker resources"
fi

echo "✅ Cleanup complete!"
