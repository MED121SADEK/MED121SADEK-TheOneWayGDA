#!/usr/bin/env bash
# ─── THEONEWAYGDA Vercel Deployment Helper ───
# Guides through deployment to Vercel

set -euo pipefail

echo "╔══════════════════════════════════════════════╗"
echo "║   THEONEWAYGDA — Vercel Deploy Helper       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Step 1: Verify build
echo "📦 Step 1/4: Verifying build..."
npm run build
echo "✅ Build successful!"
echo ""

# Step 2: Lint check
echo "🔍 Step 2/4: Running lint check..."
npx eslint src/ --max-warnings 0
echo "✅ No lint errors!"
echo ""

# Step 3: Git commit
echo "📝 Step 3/4: Committing changes..."
git add -A
if git diff --cached --quiet; then
  echo "✅ No changes to commit"
else
  git commit -m "fix: code quality improvements + enhanced seed data"
  echo "✅ Changes committed"
fi
echo ""

# Step 4: Push instructions
echo "🚀 Step 4/4: Push to trigger Vercel deployment"
echo ""
echo "Run the following commands:"
echo "  git push origin main"
echo ""
echo "After Vercel deploys, seed your production data:"
echo "  bash scripts/seed-production.sh https://theonewaygda.vercel.app"
echo ""
echo "══════════════════════════════════════════════"
