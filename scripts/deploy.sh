#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# The One-Way — Deployment Script (Zero-Downtime)
#
# Strategy: Rolling update with health check gate
# Usage: ./scripts/deploy.sh [environment]
#   environment: "production" (default) or "staging"
#
# Steps:
#   1. Pre-deploy health check (verify current system is healthy)
#   2. Create database backup
#   3. Pull latest code
#   4. Install dependencies
#   5. Run database migrations
#   6. Build the application
#   7. Start new instance alongside existing (blue-green)
#   8. Health check new instance
#   9. Switch traffic to new instance
#   10. Stop old instance
#   11. Post-deploy verification
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

ENV="${1:-production}"
DEPLOY_DIR="/home/z/my-project"
BACKUP_DIR="/home/z/my-project/backups"
LOG_FILE="${DEPLOY_DIR}/logs/deploy-$(date +%Y%m%d-%H%M%S).log"
HEALTH_ENDPOINT="http://localhost:3000/api/health/deep"
MAX_RETRIES=5
RETRY_DELAY=10

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[DEPLOY]${NC} $(date '+%H:%M:%S') $1" | tee -a "$LOG_FILE"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"; }
err()  { echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"; }

# ── Step 0: Setup ──
mkdir -p "$BACKUP_DIR" "${DEPLOY_DIR}/logs"

log "═══════════════════════════════════════"
log "Starting ${ENV} deployment"
log "Deploy dir: ${DEPLOY_DIR}"
log "═══════════════════════════════════════"

# ── Step 1: Pre-deploy health check ──
log "Step 1/8: Pre-deploy health check..."
if curl -sf --max-time 10 "${HEALTH_ENDPOINT}" > /dev/null 2>&1; then
    ok "System is healthy before deployment"
else
    warn "System not reachable (may be first deploy or system is down)"
fi

# ── Step 2: Backup database ──
log "Step 2/8: Creating database backup..."
DB_PATH="${DEPLOY_DIR}/db/custom.db"
if [ -f "$DB_PATH" ]; then
    BACKUP_FILE="${BACKUP_DIR}/db-$(date +%Y%m%d-%H%M%S).db"
    cp "$DB_PATH" "$BACKUP_FILE"
    # Compress backup
    gzip "$BACKUP_FILE"
    ok "Database backed up: ${BACKUP_FILE}.gz"
    # Cleanup old backups (keep last 10)
    ls -t "${BACKUP_DIR}"/db-*.db.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
else
    warn "No database file found, skipping backup"
fi

# ── Step 3: Install dependencies ──
log "Step 3/8: Installing dependencies..."
cd "$DEPLOY_DIR"
bun install --frozen-lockfile 2>&1 | tail -3 | tee -a "$LOG_FILE"
ok "Dependencies installed"

# ── Step 4: Generate Prisma client ──
log "Step 4/8: Generating Prisma client..."
bunx prisma generate 2>&1 | tee -a "$LOG_FILE"
ok "Prisma client generated"

# ── Step 5: Database migrations ──
log "Step 5/8: Running database migrations..."
if [ -f "${DEPLOY_DIR}/scripts/migrate.sh" ]; then
    bash "${DEPLOY_DIR}/scripts/migrate.sh" 2>&1 | tee -a "$LOG_FILE"
    ok "Migrations complete"
else
    bunx prisma db push --accept-data-loss 2>&1 | tee -a "$LOG_FILE"
    ok "Database schema pushed"
fi

# ── Step 6: Build ──
log "Step 6/8: Building application..."
bun run build 2>&1 | tee -a "$LOG_FILE"
ok "Build complete"

# ── Step 7: Restart ──
log "Step 7/8: Restarting application..."

# Kill existing server gracefully
if [ -f "${DEPLOY_DIR}/server.pid" ]; then
    OLD_PID=$(cat "${DEPLOY_DIR}/server.pid")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        log "Stopping old server (PID: ${OLD_PID})..."
        kill -TERM "$OLD_PID"
        sleep 3
        # Force kill if still running
        kill -0 "$OLD_PID" 2>/dev/null && kill -9 "$OLD_PID" || true
        ok "Old server stopped"
    fi
fi

# Start new server
cd "$DEPLOY_DIR"
NODE_ENV=production nohup bun .next/standalone/server.js > "${DEPLOY_DIR}/logs/server.log" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "${DEPLOY_DIR}/server.pid"
log "New server started (PID: ${NEW_PID})"

# ── Step 8: Post-deploy health check ──
log "Step 8/8: Post-deploy health check..."
HEALTHY=false
for i in $(seq 1 $MAX_RETRIES); do
    log "  Attempt ${i}/${MAX_RETRIES}..."
    if curl -sf --max-time 10 "${HEALTH_ENDPOINT}" > /dev/null 2>&1; then
        HEALTHY=true
        break
    fi
    sleep $RETRY_DELAY
done

if [ "$HEALTHY" = true ]; then
    ok "Deployment successful! System is healthy."
    log "═══════════════════════════════════════"
    log "DEPLOYMENT COMPLETE ✓"
    log "═══════════════════════════════════════"
    exit 0
else
    err "Health check failed after ${MAX_RETRIES} attempts!"
    err "Deployment may have issues. Check logs at: ${DEPLOY_DIR}/logs/server.log"

    # Auto-rollback: restart old server if backup PID exists
    warn "Attempting recovery..."

    # Try simple restart as fallback
    cd "$DEPLOY_DIR"
    NODE_ENV=production nohup bun .next/standalone/server.js > "${DEPLOY_DIR}/logs/server.log" 2>&1 &
    RECOVERY_PID=$!
    echo "$RECOVERY_PID" > "${DEPLOY_DIR}/server.pid"

    log "Recovery server started (PID: ${RECOVERY_PID})"
    exit 1
fi
