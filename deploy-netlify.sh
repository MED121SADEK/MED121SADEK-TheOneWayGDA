#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Direct deploy to Netlify via API (no GitHub needed)
# Usage:  ./deploy-netlify.sh YOUR_NETLIFY_SITE_ID YOUR_NETLIFY_AUTH_TOKEN
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

SITE_ID="${1:?Usage: ./deploy-netlify.sh SITE_ID AUTH_TOKEN}"
AUTH_TOKEN="${2:?Usage: ./deploy-netlify.sh SITE_ID AUTH_TOKEN}"

echo "📦 Creating deploy zip (excluding node_modules, .git, .env)..."
zip -r /tmp/netlify-deploy.zip . \
  -x "node_modules/*" \
  -x ".git/*" \
  -x ".env" \
  -x ".env.local" \
  -x ".env.*.local" \
  -x "tool-results/*" \
  -x ".next/cache/*" \
  -q

echo "📏 Zip size: $(du -sh /tmp/netlify-deploy.zip | cut -f1)"

echo "🚀 Uploading to Netlify..."
RESPONSE=$(curl -s \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/zip" \
  --data-binary "@/tmp/netlify-deploy.zip" \
  "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys")

DEPLOY_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "$RESPONSE" | head -c 200)

echo "✅ Deploy created: $DEPLOY_ID"
echo "🌐 Check: https://app.netlify.com/sites/$SITE_ID/deploys/$DEPLOY_ID"

# Clean up
rm -f /tmp/netlify-deploy.zip