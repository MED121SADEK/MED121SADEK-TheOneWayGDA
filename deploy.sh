#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# One-command deploy to Netlify
# Usage:  ./deploy.sh YOUR_GITHUB_PAT_TOKEN
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

TOKEN="${1:?Usage: ./deploy.sh YOUR_GITHUB_PERSONAL_ACCESS_TOKEN}"
REPO="MED121SADEK/MED121SADEK-TheOneWayGDA"

echo "🔄 Configuring git credentials..."
git remote set-url origin "https://${TOKEN}@github.com/${REPO}.git"

echo "🚀 Pushing to GitHub..."
git push origin HEAD

echo "✅ Pushed! Netlify will auto-build and deploy."
echo "📦 Check your Netlify dashboard for build progress."
echo "🌐 Your site will be live at your Netlify URL shortly."

# Reset remote URL to remove token from .git/config
git remote set-url origin "https://github.com/${REPO}.git"
echo "🔒 Token removed from local git config."