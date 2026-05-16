#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# The One-Way — Database Migration Script
# Safe schema changes with automatic backup
#
# Usage:
#   ./scripts/migrate.sh            # Apply pending migrations
#   ./scripts/migrate.sh backup     # Create backup before migrating
#   ./scripts/migrate.sh status     # Show migration status
#   ./scripts/migrate.sh rollback   # Rollback last migration
#
# Safety: Always creates a backup before any schema change
# ═══════════════════════════════════════════════════════════

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Project paths
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB_DIR="$PROJECT_DIR/db"
DB_FILE="${DATABASE_URL:-file:$DB_DIR/custom.db}"
DB_FILE="${DB_FILE#file:}"
BACKUP_DIR="$DB_DIR/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

log_info()  { echo -e "${BLUE}[migrate]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[migrate]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[migrate]${NC} $1"; }
log_error() { echo -e "${RED}[migrate]${NC} $1"; }

# Ensure directories exist
mkdir -p "$DB_DIR" "$BACKUP_DIR"

# ── Backup ──
create_backup() {
  if [ ! -f "$DB_FILE" ]; then
    log_warn "No database file to backup at $DB_FILE"
    return 0
  fi

  local backup_file="$BACKUP_DIR/backup-$TIMESTAMP.db"
  cp "$DB_FILE" "$backup_file"
  local size
  size=$(du -h "$backup_file" | cut -f1)
  log_ok "Backup created: $backup_file ($size)"

  # Keep only last 10 backups
  ls -t "$BACKUP_DIR"/backup-*.db 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
  return 0
}

# ── Status ──
show_status() {
  log_info "Database: $DB_FILE"
  if [ -f "$DB_FILE" ]; then
    local size
    size=$(du -h "$DB_FILE" | cut -f1)
    log_ok "Size: $size"
    log_ok "Tables: $(sqlite3 "$DB_FILE" ".tables" 2>/dev/null | wc -w || echo 'unknown')"

    echo ""
    log_info "Recent backups:"
    ls -lh "$BACKUP_DIR"/backup-*.db 2>/dev/null | tail -5 || log_warn "No backups found"
  else
    log_warn "Database file does not exist"
  fi
}

# ── Migrate ──
run_migration() {
  log_info "Starting database migration..."
  create_backup

  log_info "Generating Prisma client..."
  cd "$PROJECT_DIR"
  npx prisma generate

  log_info "Applying schema changes..."
  if npx prisma db push --accept-data-loss 2>&1; then
    log_ok "Migration completed successfully"
  else
    log_error "Migration failed! Backup at $BACKUP_DIR/backup-$TIMESTAMP.db"
    exit 1
  fi
}

# ── Rollback ──
rollback() {
  log_warn "Rolling back to last backup..."
  local latest_backup
  latest_backup=$(ls -t "$BACKUP_DIR"/backup-*.db 2>/dev/null | head -1)

  if [ -z "$latest_backup" ]; then
    log_error "No backup found for rollback"
    exit 1
  fi

  log_info "Restoring from: $latest_backup"
  cp "$latest_backup" "$DB_FILE"
  log_ok "Rollback complete"
}

# ── Main ──
case "${1:-migrate}" in
  backup)   create_backup ;;
  status)   show_status ;;
  migrate)  run_migration ;;
  rollback) rollback ;;
  *)
    echo "Usage: $0 {migrate|backup|status|rollback}"
    exit 1
    ;;
esac
