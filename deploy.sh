#!/bin/bash
# ═══════════════════════════════════════════════════════════
# THEONEWAYGDA — Vercel Deployment Script
# Sets environment variables, deploys to production,
# configures DNS, and verifies Google Search Console
# ═══════════════════════════════════════════════════════════
set -euo pipefail

# ── Configuration ──
PROJECT_NAME="theonewaygda"
DOMAIN="theonewaygda.com"
VERCEL_ORG_ID="team_uN0mdwb9lvmBnwZE0Tr0prNa"
VERCEL_PROJECT_ID="prj_A8xjgWJs2jbCyTsngvZVhSef0BAk"
ENVIRONMENT="production"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  THEONEWAYGDA — Vercel Deployment & DNS Configuration     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Check Prerequisites ──
echo "━━━ Step 1: Checking prerequisites ━━━"
command -v vercel >/dev/null 2>&1 || { echo "❌ Vercel CLI not found. Install with: npm i -g vercel"; exit 1; }
echo "✅ Vercel CLI found"

if [ -z "${VERCEL_TOKEN:-}" ]; then
    echo "⚠️  VERCEL_TOKEN not set. Will use interactive login."
    echo "   To use a token instead, run: export VERCEL_TOKEN=your-token"
fi
echo ""

# ── Step 2: Link Project ──
echo "━━━ Step 2: Linking to Vercel project ━━━"
mkdir -p .vercel
cat > .vercel/project.json << EOF
{
  "orgId": "$VERCEL_ORG_ID",
  "projectId": "$VERCEL_PROJECT_ID"
}
EOF
echo "✅ Project linked to $PROJECT_NAME ($VERCEL_PROJECT_ID)"
echo ""

# ── Step 3: Set Environment Variables ──
echo "━━━ Step 3: Setting Vercel environment variables ━━━"

# Helper function to set env var
set_env() {
    local key="$1"
    local value="$2"
    local sensitive="$3"  # "yes" for sensitive, "no" for non-sensitive
    
    echo "$value" | vercel env rm "$key" "$ENVIRONMENT" "$PROJECT_NAME" 2>/dev/null || true
    echo "$value" | vercel env add "$key" "$ENVIRONMENT" "$PROJECT_NAME" -s 2>/dev/null && \
        echo "  ✅ $key" || \
        echo "  ⚠️  $key (may need manual setup)"
}

# Core Variables
echo "--- Core Variables ---"
NEXTAUTH_SECRET=$(openssl rand -base64 32)
set_env "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET" "yes"
set_env "NEXTAUTH_URL" "https://$DOMAIN" "no"

# Database (PostgreSQL required for Vercel)
# NOTE: Update these to your actual Vercel Postgres or external PG credentials
set_env "DATABASE_URL" "postgres://default:placeholder@host:5432/db?sslmode=require" "yes"
set_env "DIRECT_DATABASE_URL" "postgres://default:placeholder@host:5432/db?sslmode=require" "yes"

# Edge Config (from .env.vercel)
set_env "EDGE_CONFIG" "https://edge-config.vercel.com/ecfg_v1h7tl7r72ak3dqwnsbvtxbmatcj?token=0c598614-7fe2-4819-8c76-4c1c71493ab6" "yes"

# Google Search Console
set_env "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION" "google465d22e5febc4e42.html" "no"

# Optional: Uncomment and fill these
# set_env "GITHUB_ID" "your-github-oauth-id" "yes"
# set_env "GITHUB_SECRET" "your-github-oauth-secret" "yes"
# set_env "GOOGLE_CLIENT_ID" "your-google-client-id" "yes"
# set_env "GOOGLE_CLIENT_SECRET" "your-google-client-secret" "yes"
# set_env "ZAI_API_KEY" "your-zai-api-key" "yes"
# set_env "STRIPE_SECRET_KEY" "your-stripe-secret-key" "yes"
# set_env "STRIPE_WEBHOOK_SECRET" "your-stripe-webhook-secret" "yes"
# set_env "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "your-stripe-publishable-key" "no"
# set_env "SMTP_HOST" "smtp.gmail.com" "no"
# set_env "SMTP_PORT" "587" "no"
# set_env "SMTP_USER" "your-email@gmail.com" "yes"
# set_env "SMTP_PASSWORD" "your-email-password" "yes"
# set_env "REDIS_URL" "redis://localhost:6379" "yes"

echo ""
echo "⚠️  IMPORTANT: Update DATABASE_URL and DIRECT_DATABASE_URL with your"
echo "   actual Vercel Postgres credentials before deploying."
echo "   Go to: https://vercel.com/theonewaygda/stores → Postgres → Connection String"
echo ""

# ── Step 4: Deploy to Production ──
echo "━━━ Step 4: Deploying to production ━━━"
vercel --prod --yes 2>&1
echo ""

# ── Step 5: Configure DNS ──
echo "━━━ Step 5: Configuring DNS for $DOMAIN ━━━"
echo ""
echo "To complete DNS setup, add these records at your domain registrar:"
echo ""
echo "  ┌──────────────────────────────────────────────────────────┐"
echo "  │  Type   │  Name      │  Value                            │"
echo "  ├─────────┼────────────┼───────────────────────────────────┤"
echo "  │  CNAME  │  @         │  cname.vercel-dns.com            │"
echo "  │  CNAME  │  www       │  cname.vercel-dns.com            │"
echo "  └─────────┴────────────┴──────────────────────────────────┘"
echo ""
echo "If your registrar doesn't support CNAME at apex (@), use A records:"
echo ""
echo "  ┌──────────────────────────────────────────────────────────┐"
echo "  │  Type   │  Name      │  Value                            │"
echo "  ├─────────┼────────────┼───────────────────────────────────┤"
echo "  │  A      │  @         │  76.76.21.21                      │"
echo "  │  A      │  @         │  76.76.21.21                      │"
echo "  │  CNAME  │  www       │  cname.vercel-dns.com            │"
echo "  └─────────┴────────────┴──────────────────────────────────┘"
echo ""
echo "Also add these TXT records for email/security:"
echo "  ┌──────────────────────────────────────────────────────────┐"
echo "  │  Type   │  Name      │  Value                            │"
echo "  ├─────────┼────────────┼───────────────────────────────────┤"
echo "  │  TXT    │  @         │  v=spf1 include:vercel-dns.com ~all│"
echo "  │  TXT    │  _dmarc    │  v=DMARC1; p=none; rua=...       │"
echo "  └─────────┴────────────┴──────────────────────────────────┘"
echo ""

# ── Step 6: Add Domain to Vercel ──
echo "━━━ Step 6: Adding domain to Vercel ━━━"
vercel domains add "$DOMAIN" 2>&1 || echo "  ⚠️  Domain may already be added"
vercel domains add "www.$DOMAIN" 2>&1 || echo "  ⚠️  Domain may already be added"
echo ""

# ── Step 7: Google Search Console Verification ──
echo "━━━ Step 7: Google Search Console ━━━"
echo ""
echo "Google Search Console verification is set up via multiple methods:"
echo ""
echo "  1. ✅ HTML file verification: /google465d22e5febc4e42.html"
echo "  2. ✅ Meta tag: NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION env var"
echo "  3. ✅ Sitemap: https://$DOMAIN/sitemap.xml"
echo "  4. ✅ robots.txt: dynamic with sitemap reference"
echo ""
echo "After deployment, submit your sitemap at:"
echo "  https://search.google.com/search-console → Sitemaps → Add"
echo "  URL: https://$DOMAIN/sitemap.xml"
echo ""
echo "For DNS TXT record verification (alternative method), add:"
echo "  TXT  @  google-site-verification=google465d22e5febc4e42.html"
echo ""

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ Deployment script complete!                            ║"
echo "║                                                            ║"
echo "║  Next steps:                                               ║"
echo "║  1. Update DATABASE_URL with Vercel Postgres credentials   ║"
echo "║  2. Configure DNS at your domain registrar                  ║"
echo "║  3. Run: vercel --prod                                    ║"
echo "║  4. Verify at: https://theonewaygda.com                     ║"
echo "║  5. Submit sitemap to Google Search Console                ║"
echo "╚══════════════════════════════════════════════════════════╝"
