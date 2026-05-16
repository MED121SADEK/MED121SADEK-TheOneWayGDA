#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# The One-Way — Setup Script
#
# First-time setup and environment verification.
# Usage: ./scripts/setup.sh
#
# Steps:
#   1. Check prerequisites (bun, node, git)
#   2. Create .env from template
#   3. Install dependencies
#   4. Initialize database
#   5. Generate Prisma client
#   6. Create required directories
#   7. Verify build
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

DEPLOY_DIR="/home/z/my-project"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[SETUP]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "══════════════════════════════════════════════"
echo "  The One-Way — First-Time Setup"
echo "══════════════════════════════════════════════"
echo ""

# ── Step 1: Prerequisites ──
log "Checking prerequisites..."

# Check bun
if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun --version)
    ok "Bun ${BUN_VERSION}"
else
    err "Bun not found. Install from: https://bun.sh"
    exit 1
fi

# Check node
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    ok "Node.js ${NODE_VERSION}"
else
    warn "Node.js not found (optional, bun is primary runtime)"
fi

# Check git
if command -v git &> /dev/null; then
    ok "Git $(git --version | awk '{print $3}')"
else
    warn "Git not found"
fi

# Check sqlite3
if command -v sqlite3 &> /dev/null; then
    ok "SQLite3 $(sqlite3 --version | awk '{print $1}')"
else
    warn "SQLite3 CLI not found (database will still work via Prisma)"
fi

# ── Step 2: Environment ──
log "Setting up environment..."
if [ ! -f "${DEPLOY_DIR}/.env" ]; then
    if [ -f "${DEPLOY_DIR}/.env.example" ]; then
        cp "${DEPLOY_DIR}/.env.example" "${DEPLOY_DIR}/.env"
        # Generate a random admin secret
        RANDOM_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "change-me-$(date +%s)")
        sed -i.bak "s/change-me-to-a-strong-secret/${RANDOM_SECRET}/" "${DEPLOY_DIR}/.env"
        rm -f "${DEPLOY_DIR}/.env.bak"
        ok ".env created from template with random ADMIN_SECRET"
    else
        err ".env.example not found"
        exit 1
    fi
else
    ok ".env already exists"
fi

# ── Step 3: Directories ──
log "Creating required directories..."
for dir in logs backups db upload; do
    mkdir -p "${DEPLOY_DIR}/${dir}"
    ok "Created: ${dir}/"
done

# ── Step 4: Dependencies ──
log "Installing dependencies..."
cd "$DEPLOY_DIR"
if [ -f "bun.lock" ]; then
    bun install --frozen-lockfile 2>&1 | tail -3
    ok "Dependencies installed"
else
    bun install 2>&1 | tail -3
    ok "Dependencies installed (lock file generated)"
fi

# ── Step 5: Database ──
log "Initializing database..."
bunx prisma generate 2>&1 | tail -1
bunx prisma db push --skip-generate 2>&1 | tail -3
ok "Database initialized"

# ── Step 6: Build ──
log "Building application..."
bun run build 2>&1 | tail -5
ok "Build complete"

# ── Step 7: Make scripts executable ──
log "Setting script permissions..."
chmod +x scripts/*.sh 2>/dev/null || true
ok "Scripts are executable"

# ── Summary ──
echo ""
echo "══════════════════════════════════════════════"
echo -e "${GREEN}  Setup Complete!${NC}"
echo ""
echo "  Next steps:"
echo "    1. Review .env and configure as needed"
echo "    2. Start development: bun run dev"
echo "    3. Start production:  bun run start"
echo "    4. Deploy:            ./scripts/deploy.sh"
echo ""
echo "  Useful scripts:"
echo "    ./scripts/health-check.sh --deep"
echo "    ./scripts/backup.sh"
echo "    ./scripts/migrate.sh"
echo "══════════════════════════════════════════════"
echo ""
