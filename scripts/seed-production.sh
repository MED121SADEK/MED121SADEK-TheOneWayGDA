#!/usr/bin/env bash
# ─── THEONEWAYGDA Production Seeding Script ───
# Triggers all seed endpoints after deployment
# Usage: bash scripts/seed-production.sh [BASE_URL]

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
MAX_RETRIES=5
RETRY_DELAY=5

echo "╔══════════════════════════════════════════════╗"
echo "║   THEONEWAYGDA — Production Data Seeding    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Target: $BASE_URL"
echo ""

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
for i in $(seq 1 30); do
  if curl -sf "$BASE_URL/api/health" > /dev/null 2>&1; then
    echo "✅ Server is ready!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Server did not respond after 30s. Aborting."
    exit 1
  fi
  sleep 2
done
echo ""

# Function to call an endpoint with retries
call_endpoint() {
  local name="$1"
  local method="$2"
  local url="$3"
  local data="$4"

  echo "📡 Calling: $name"

  for attempt in $(seq 1 $MAX_RETRIES); do
    local response
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
      response=$(curl -sf -X POST "$url" \
        -H "Content-Type: application/json" \
        -d "$data" 2>&1) || true
    else
      response=$(curl -sf -X GET "$url" 2>&1) || true
    fi

    if [ -n "$response" ]; then
      echo "✅ $name — Success"
      echo "   $response" | head -5
      echo ""
      return 0
    fi

    echo "⚠️  Attempt $attempt/$MAX_RETRIES failed, retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
  done

  echo "❌ $name — Failed after $MAX_RETRIES attempts"
  return 1
}

# 1. Seed Leaderboard (19 AI models with benchmarks, pricing, metrics)
call_endpoint "Leaderboard Seed (19 AI Models)" \
  POST "$BASE_URL/api/leaderboard" \
  '{}' || echo "⚠️  Leaderboard seed may have already run"

# 2. Seed Community (posts + verified researchers)
call_endpoint "Community Seed (Posts + Researchers)" \
  POST "$BASE_URL/api/community/seed" \
  '{}' || echo "⚠️  Community seed may have already run"

# 3. Trigger News Collection
call_endpoint "AI News Collection" \
  GET "$BASE_URL/api/community/news" \
  '' || echo "⚠️  News collection failed"

# 4. Verify results
echo ""
echo "══════════════════════════════════════════════"
echo "📊 Seeding Complete — Verifying Results"
echo "══════════════════════════════════════════════"
echo ""

echo "📈 Leaderboard Status:"
curl -sf "$BASE_URL/api/leaderboard/cron" 2>&1 | head -3 || echo "  Could not fetch status"

echo ""
echo "📰 Community Status:"
curl -sf "$BASE_URL/api/community/seed" 2>&1 | head -5 || echo "  Could not fetch status"

echo ""
echo "✅ All seeding operations completed!"
echo ""
echo "Visit $BASE_URL to see the seeded data:"
echo "  → Leaderboard:  $BASE_URL/leaderboard"
echo "  → Community:    $BASE_URL/community"
echo "  → News Feed:    $BASE_URL/community (news tab)"
