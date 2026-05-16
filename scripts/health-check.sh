#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# The One-Way — Health Check Script
#
# Performs comprehensive health checks against the running application.
# Usage: ./scripts/health-check.sh [--deep]
#   --deep: Run deep health check (includes database, AI, disk)
#
# Exit codes:
#   0: All checks passed
#   1: Some checks failed
#   2: System is unhealthy
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

BASE_URL="http://localhost:3000"
DEEP=false

for arg in "$@"; do
    case $arg in
        --deep) DEEP=true ;;
    esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; FAILED=1; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }

echo "═══════════════════════════════════════"
echo "Health Check — $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════"
FAILED=0

# ── Check 1: Server is responding ──
echo ""
echo "── Server ──"
if curl -sf --max-time 5 "${BASE_URL}/" > /dev/null 2>&1; then
    pass "Server is responding"
else
    fail "Server is not responding on ${BASE_URL}"
    echo ""
    echo "System is UNHEALTHY"
    exit 2
fi

# ── Check 2: Health API ──
echo ""
echo "── Health API ──"
HEALTH=$(curl -sf --max-time 10 "${BASE_URL}/api/health" 2>/dev/null || echo '{}')
STATUS=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "error")

if [ "$STATUS" = "healthy" ] || [ "$STATUS" = "ok" ]; then
    pass "Health status: ${STATUS}"
else
    warn "Health status: ${STATUS}"
fi

# ── Check 3: API endpoints ──
echo ""
echo "── API Endpoints ──"
ENDPOINTS=(
    "/api/health:Health API"
    "/api/leaderboard:Leaderboard"
    "/api/metrics:Metrics"
)

for endpoint_info in "${ENDPOINTS[@]}"; do
    ENDPOINT="${endpoint_info%%:*}"
    NAME="${endpoint_info#*:}"
    if curl -sf --max-time 5 "${BASE_URL}${ENDPOINT}" > /dev/null 2>&1; then
        pass "${NAME} (${ENDPOINT})"
    else
        fail "${NAME} (${ENDPOINT}) — no response"
    fi
done

# ── Check 4: Deep health (optional) ──
if [ "$DEEP" = true ]; then
    echo ""
    echo "── Deep Health Check ──"
    DEEP_HEALTH=$(curl -sf --max-time 15 "${BASE_URL}/api/health/deep" 2>/dev/null || echo '{}')

    # Database check
    DB_STATUS=$(echo "$DEEP_HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('checks',{}).get('database',{}).get('status','unknown'))" 2>/dev/null || echo "error")
    if [ "$DB_STATUS" = "healthy" ] || [ "$DB_STATUS" = "connected" ]; then
        pass "Database: ${DB_STATUS}"
    else
        fail "Database: ${DB_STATUS}"
    fi

    # Memory check
    MEM_PERCENT=$(echo "$DEEP_HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('checks',{}).get('memory',{}).get('percentUsed','?'))" 2>/dev/null || echo "?")
    if [ "$MEM_PERCENT" != "?" ]; then
        if [ "$MEM_PERCENT" -lt 80 ]; then
            pass "Memory: ${MEM_PERCENT}% used"
        elif [ "$MEM_PERCENT" -lt 95 ]; then
            warn "Memory: ${MEM_PERCENT}% used (high)"
        else
            fail "Memory: ${MEM_PERCENT}% used (critical)"
        fi
    fi

    # Response time
    RESPONSE_TIME=$(echo "$DEEP_HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('responseTime','?'))" 2>/dev/null || echo "?")
    pass "Response time: ${RESPONSE_TIME}"
fi

# ── Check 5: System resources ──
echo ""
echo "── System Resources ──"
CPU_LOAD=$(cat /proc/loadavg 2>/dev/null | awk '{print $1,$2,$3}' || echo "unavailable")
if [ "$CPU_LOAD" != "unavailable" ]; then
    pass "CPU load: ${CPU_LOAD}"
fi

MEM_AVAILABLE=$(free -m 2>/dev/null | awk 'NR==2{printf "%dMB free / %dMB total", $7, $2}' || echo "unavailable")
if [ "$MEM_AVAILABLE" != "unavailable" ]; then
    pass "Memory: ${MEM_AVAILABLE}"
fi

DISK_USAGE=$(df -h /home 2>/dev/null | awk 'NR==2{printf "%s used / %s total (%s)", $3, $2, $5}' || echo "unavailable")
if [ "$DISK_USAGE" != "unavailable" ]; then
    pass "Disk: ${DISK_USAGE}"
fi

# ── Check 6: Process ──
echo ""
echo "── Process ──"
if [ -f "/home/z/my-project/server.pid" ]; then
    PID=$(cat /home/z/my-project/server.pid)
    if kill -0 "$PID" 2>/dev/null; then
        pass "Server process running (PID: ${PID})"
    else
        fail "Server process not running (stale PID: ${PID})"
    fi
else
    warn "No PID file found"
fi

# ── Summary ──
echo ""
echo "═══════════════════════════════════════"
if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}All checks passed! System is healthy.${NC}"
    exit 0
else
    echo -e "${YELLOW}Some checks failed. Review output above.${NC}"
    exit 1
fi
