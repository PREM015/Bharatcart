#!/bin/bash
# Compress Log Files
# Purpose: Compresses old log files to save disk space
# Description: Archives logs older than 7 days with gzip

set -e

echo "📦 Compressing log files..."

LOGS_DIR="${LOGS_DIR:-./logs}"
DAYS_OLD=7

# Find and compress old log files
find "$LOGS_DIR" -name "*.log" -type f -mtime +$DAYS_OLD ! -name "*.gz" | while read -r logfile; do
  echo "Compressing: $logfile"
  gzip "$logfile"
done

echo "✅ Log compression complete!"

# Show disk space saved
du -sh "$LOGS_DIR"
