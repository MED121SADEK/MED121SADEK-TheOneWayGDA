#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# The One-Way — Database Backup Script
#
# Creates compressed backups of the SQLite database with rotation.
# Usage: ./scripts/backup.sh [--keep N]
#   --keep N: Keep last N backups (default: 10)
#
# Backups are stored in: /home/z/my-project/backups/
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

DB_PATH="/home/z/my-project/db/custom.db"
BACKUP_DIR="/home/z/my-project/backups"
KEEP=10

# Parse arguments
for arg in "$@"; do
    case $arg in
        --keep) KEEP="${2:-10}"; shift 2 ;;
        --keep=*) KEEP="${arg#*=}"; shift ;;
    esac
done

mkdir -p "$BACKUP_DIR"

echo "═══════════════════════════════════════"
echo "Database Backup — $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════"

if [ ! -f "$DB_PATH" ]; then
    echo "ERROR: Database file not found: ${DB_PATH}"
    exit 1
fi

# Create backup filename
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/db-${TIMESTAMP}.db"

# Check database integrity before backup
echo "Checking database integrity..."
INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>/dev/null || echo "corrupt")

if [ "$INTEGRITY" != "ok" ]; then
    echo "WARNING: Database integrity check failed: ${INTEGRITY}"
    echo "Creating backup anyway (may be corrupted)..."
else
    echo "Database integrity: OK"
fi

# Copy and compress
echo "Creating backup..."
cp "$DB_PATH" "$BACKUP_FILE"
gzip "$BACKUP_FILE"

BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
echo "Backup created: ${BACKUP_FILE}.gz (${BACKUP_SIZE})"

# Show database stats
TABLE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "?")
ROW_COUNT=$(sqlite3 "$DB_PATH" "SELECT SUM(sqlite_count) FROM (SELECT COUNT(*) as sqlite_count FROM sqlite_master WHERE type='table');" 2>/dev/null || echo "?")
DB_SIZE=$(du -h "$DB_PATH" | cut -f1)

echo ""
echo "Database stats:"
echo "  Size: ${DB_SIZE}"
echo "  Tables: ${TABLE_COUNT}"

# Rotate old backups
echo ""
echo "Rotating old backups (keeping last ${KEEP})..."
ls -t "${BACKUP_DIR}"/db-*.db.gz 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r file; do
    echo "  Removing: $(basename "$file")"
    rm -f "$file"
done

# List current backups
echo ""
echo "Current backups:"
ls -lh "${BACKUP_DIR}"/db-*.db.gz 2>/dev/null | tail -5

echo ""
echo "Backup complete!"
