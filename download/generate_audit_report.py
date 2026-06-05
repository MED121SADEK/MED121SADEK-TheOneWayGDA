#!/usr/bin/env python3
"""THEONEWAYGDA - Full Project Audit Report"""
import os, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Image
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.platypus import SimpleDocTemplate
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
import hashlib

# ━━ Fonts ━━
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('CarlitoBold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSerif', '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSerifBold', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuMono', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
registerFontFamily('Carlito', normal='Carlito', bold='CarlitoBold')
registerFontFamily('DejaVuSerif', normal='DejaVuSerif', bold='DejaVuSerifBold')
registerFontFamily('DejaVuMono', normal='DejaVuMono', bold='DejaVuMono')

# ━━ Palette ━━
ACCENT = colors.HexColor('#562cd4')
TEXT_PRIMARY = colors.HexColor('#222426')
TEXT_MUTED = colors.HexColor('#72797e')
BG_SURFACE = colors.HexColor('#e0e4e6')
BG_PAGE = colors.HexColor('#f0f2f3')

TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT = colors.white
TABLE_ROW_EVEN = colors.white
TABLE_ROW_ODD = BG_SURFACE

# ━━ Styles ━━
cover_title = ParagraphStyle('CoverTitle', fontName='DejaVuSerif', fontSize=36, leading=44, alignment=TA_LEFT, textColor=TEXT_PRIMARY)
cover_sub = ParagraphStyle('CoverSub', fontName='DejaVuSerif', fontSize=16, leading=22, alignment=TA_LEFT, textColor=TEXT_MUTED)
cover_meta = ParagraphStyle('CoverMeta', fontName='Carlito', fontSize=11, leading=16, alignment=TA_LEFT, textColor=TEXT_MUTED)
h1 = ParagraphStyle('H1', fontName='DejaVuSerif', fontSize=20, leading=28, spaceBefore=18, spaceAfter=10, textColor=TEXT_PRIMARY)
h2 = ParagraphStyle('H2', fontName='DejaVuSerif', fontSize=15, leading=22, spaceBefore=14, spaceAfter=8, textColor=colors.HexColor('#3b2070'))
h3 = ParagraphStyle('H3', fontName='DejaVuSerif', fontSize=12, leading=18, spaceBefore=10, spaceAfter=6, textColor=TEXT_PRIMARY)
body = ParagraphStyle('Body', fontName='DejaVuSerif', fontSize=10.5, leading=17, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceAfter=6)
body_sm = ParagraphStyle('BodySm', fontName='DejaVuSerif', fontSize=9.5, leading=15, alignment=TA_LEFT, textColor=TEXT_MUTED)
cell_s = ParagraphStyle('Cell', fontName='DejaVuSerif', fontSize=9, leading=13, alignment=TA_LEFT, textColor=TEXT_PRIMARY)
cell_h = ParagraphStyle('CellH', fontName='DejaVuSerif', fontSize=9, leading=13, alignment=TA_CENTER, textColor=colors.white)
cell_c = ParagraphStyle('CellC', fontName='DejaVuSerif', fontSize=9, leading=13, alignment=TA_CENTER, textColor=TEXT_PRIMARY)
caption_s = ParagraphStyle('Caption', fontName='Calibri', fontSize=9, leading=14, alignment=TA_CENTER, textColor=TEXT_MUTED)
bullet_s = ParagraphStyle('Bullet', fontName='DejaVuSerif', fontSize=10.5, leading=17, alignment=TA_LEFT, textColor=TEXT_PRIMARY, leftIndent=18, bulletIndent=6, spaceAfter=4)
red_s = ParagraphStyle('RedBody', fontName='DejaVuSerif', fontSize=10.5, leading=17, alignment=TA_LEFT, textColor=colors.HexColor('#b91c1c'), spaceAfter=4)
green_s = ParagraphStyle('GreenBody', fontName='DejaVuSerif', fontSize=10.5, leading=17, alignment=TA_LEFT, textColor=colors.HexColor('#15803d'), spaceAfter=4)
amber_s = ParagraphStyle('AmberBody', fontName='DejaVuSerif', fontSize=10.5, leading=17, alignment=TA_LEFT, textColor=colors.HexColor('#a16207'), spaceAfter=4)

PAGE_W, PAGE_H = A4
L_MARGIN = 1.0 * inch
R_MARGIN = 1.0 * inch
AVAIL_W = PAGE_W - L_MARGIN - R_MARGIN

class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/><b>%s</b>' % (key, text), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def make_table(headers, rows, col_ratios=None):
    hdr = [Paragraph('<b>%s</b>' % h, cell_h) for h in headers]
    data = [hdr]
    for row in rows:
        data.append([Paragraph(str(c), cell_s) if i == 0 else Paragraph(str(c), cell_c) for i, c in enumerate(row)])
    n = len(headers)
    if col_ratios:
        cw = [r * AVAIL_W for r in col_ratios]
    else:
        cw = [AVAIL_W / n] * n
    t = Table(data, colWidths=cw, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.4, TEXT_MUTED),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

# ━━ Build Document ━━
output_path = '/home/z/my-project/download/THEONEWAYGDA_Full_Audit_Report.pdf'
os.makedirs(os.path.dirname(output_path), exist_ok=True)

doc = TocDocTemplate(output_path, pagesize=A4, leftMargin=L_MARGIN, rightMargin=R_MARGIN, topMargin=0.8*inch, bottomMargin=0.8*inch)

story = []

# ── COVER PAGE ──
story.append(Spacer(1, 120))
story.append(Paragraph('<b>THEONEWAYGDA</b>', cover_title))
story.append(Spacer(1, 8))
story.append(Paragraph('Full Project Audit Report', ParagraphStyle('cs2', fontName='DejaVuSerif', fontSize=22, leading=30, textColor=ACCENT)))
story.append(Spacer(1, 30))
story.append(Paragraph('Comprehensive Technology Stack, Architecture Analysis,<br/>and SaaS Readiness Assessment', cover_sub))
story.append(Spacer(1, 50))

meta_data = [
    ['Project Type', 'AI News & Community Portal (SaaS)'],
    ['Framework', 'Next.js 16.1.3 + React 19 + TypeScript'],
    ['Database', 'Neon PostgreSQL (58 Prisma Models)'],
    ['API Routes', '133'],
    ['Pages', '48'],
    ['Components', '112'],
    ['Audit Date', 'June 6, 2026'],
    ['Auditor', 'Z.ai Automated Audit System'],
]
meta_tbl_data = [[Paragraph('<b>%s</b>' % r[0], cell_s), Paragraph(r[1], cell_s)] for r in meta_data]
meta_tbl = Table(meta_tbl_data, colWidths=[120, 330], hAlign='LEFT')
meta_tbl.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('LINEBELOW', (0, 0), (-1, -1), 0.3, BG_SURFACE),
    ('LINEBELOW', (0, -1), (-1, -1), 0.8, ACCENT),
]))
story.append(meta_tbl)
story.append(Spacer(1, 80))
story.append(Paragraph('Confidential - For Internal Use Only', cover_meta))

story.append(PageBreak())

# ── TABLE OF CONTENTS ──
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle(name='TOC1', fontName='DejaVuSerif', fontSize=12, leftIndent=20, leading=22, spaceBefore=6),
    ParagraphStyle(name='TOC2', fontName='DejaVuSerif', fontSize=10, leftIndent=40, leading=18, spaceBefore=2),
]
story.append(Paragraph('<b>Table of Contents</b>', ParagraphStyle('TocTitle', fontName='DejaVuSerif', fontSize=22, leading=30, textColor=TEXT_PRIMARY)))
story.append(Spacer(1, 12))
story.append(toc)
story.append(PageBreak())

# ══════════════════════════════════════════════════════════
# SECTION 1: EXECUTIVE SUMMARY
# ══════════════════════════════════════════════════════════
story.append(heading('1. Executive Summary', h1, 0))
story.append(Paragraph(
    'THEONEWAYGDA is a full-stack AI News and Community Portal built on a modern technology stack comprising '
    'Next.js 16.1.3, React 19, TypeScript, Tailwind CSS 4, Prisma ORM, and Neon PostgreSQL. The project '
    'is an ambitious SaaS platform that aims to provide AI model comparison, benchmark leaderboards, community '
    'interaction, collaborative workspaces, and premium subscription features. With 390 source files spanning '
    '133 API routes, 48 pages, and 112 components across 58 database models, this represents a substantial '
    'codebase that demonstrates significant engineering effort and feature breadth.', body))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'The audit reveals a project that has achieved remarkable scope in its current state. All three user '
    'acceptance methods (Email One-Click, Admin Dashboard, Visitor Management) are fully implemented and '
    'operational. The Stripe payment infrastructure is complete with 7 dedicated files handling checkout sessions, '
    'webhooks, customer portals, and billing management. An 8-language internationalization system supports '
    'English, Arabic, French, Spanish, German, Chinese, Japanese, and Korean with RTL capabilities.', body))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'However, the audit also identifies several critical areas requiring attention before the platform can be '
    'considered production-ready for a real SaaS deployment. These include security vulnerabilities (committed '
    'secrets, weak password hashing), near-zero test coverage, in-memory rate limiting unsuitable for multi-instance '
    'deployments, and several infrastructure gaps that must be addressed for enterprise-grade reliability. The '
    'following sections provide a detailed breakdown of every aspect of the project.', body))

# ══════════════════════════════════════════════════════════
# SECTION 2: TECHNOLOGY STACK
# ══════════════════════════════════════════════════════════
story.append(heading('2. Technology Stack', h1, 0))

story.append(heading('2.1 Core Framework', h2, 1))
story.append(make_table(
    ['Technology', 'Version', 'Role', 'Status'],
    [
        ['Next.js', '16.1.3', 'Full-stack React framework', 'Latest'],
        ['React', '19.0.0', 'UI library', 'Latest'],
        ['TypeScript', '5.x', 'Type-safe development', 'Latest'],
        ['Tailwind CSS', '4.x', 'Utility-first styling', 'Latest'],
        ['Prisma', '6.19.3', 'Database ORM', 'Latest'],
        ['Node.js / Bun', 'Multi', 'Server runtime', 'Active'],
    ],
    [0.20, 0.12, 0.40, 0.28]
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'The core stack is remarkably modern, leveraging the latest versions of every major dependency. '
    'Next.js 16.1.3 uses the new proxy.ts convention (replacing the deprecated middleware.ts), '
    'enabling edge-optimized request handling with Turbopack compilation. The React 19 upgrade '
    'provides access to server components, streaming SSR, and improved concurrent rendering. '
    'TypeScript strict mode ensures type safety across the entire codebase of 387 source files. '
    'Prisma 6 connects to Neon PostgreSQL using both pooled (for edge) and direct (for migrations) '
    'connection strings, providing optimal performance for both read and write operations.', body))

story.append(heading('2.2 UI Component Library', h2, 1))
story.append(make_table(
    ['Library', 'Purpose', 'Component Count'],
    [
        ['shadcn/ui (Radix)', 'Accessible UI primitives', '54 components'],
        ['Framer Motion', 'Animations & transitions', 'Used globally'],
        ['Lucide React', 'Icon system', '100+ icons used'],
        ['Recharts', 'Data visualization', 'Dashboard charts'],
        ['React Hook Form', 'Form state management', 'Validation'],
        ['Zustand', 'Client state management', 'Global store'],
        ['TanStack Query/Table', 'Data fetching & tables', 'Server state'],
        ['Sonner', 'Toast notifications', 'UI feedback'],
        ['cmdk', 'Command palette', 'Quick actions'],
    ],
    [0.25, 0.40, 0.35]
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'The UI layer is built on shadcn/ui, which provides 54 pre-built accessible components based on Radix UI '
    'primitives. These are not installed as an npm dependency but rather copied into the project under '
    'src/components/ui/, giving full control over styling and behavior. Framer Motion handles all animations '
    'including page transitions, micro-interactions, and the EmailGate modal. The design system follows a '
    'consistent dark/light theme using CSS custom properties and Tailwind CSS 4 utility classes.', body))

story.append(heading('2.3 Database & ORM', h2, 1))
story.append(make_table(
    ['Component', 'Details'],
    [
        ['Database', 'Neon PostgreSQL (Serverless, eu-central-1)'],
        ['Connection Pool', 'PgBouncer (pooled) + Direct (migrations)'],
        ['ORM', 'Prisma 6.19.3 with 58 models'],
        ['Schema Lines', '1,220 lines of Prisma DSL'],
        ['Seeded Records', '414 records across 12 tables'],
        ['Relations', 'One-to-many, many-to-many, self-referential'],
    ],
    [0.25, 0.75]
))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'The database architecture spans 58 Prisma models organized into logical domains: core user management, '
    'community posts and interactions, AI models and leaderboard, copilot and automation, workflow engine, '
    'team collaboration, arena battles, portfolio management, and certification. The schema uses a mix of '
    'CUID and auto-increment IDs, supports soft-deletion patterns through status fields, and includes '
    'comprehensive timestamp tracking (createdAt, updatedAt, lastSeen). Relationships include standard '
    'one-to-many (User to TeamMember), many-to-many through join tables (ArenaBattle to ArenaVote), and '
    'self-referential patterns for hierarchical data.', body))

story.append(heading('2.4 Backend & Infrastructure Libraries', h2, 1))
story.append(make_table(
    ['Library', 'Version', 'Purpose'],
    [
        ['Stripe', '22.2.0', 'Payment processing & subscriptions'],
        ['Nodemailer', '7.0.13', 'Transactional email (Gmail SMTP)'],
        ['Zod', '4.0.2', 'Schema validation'],
        ['Sharp', '0.34.3', 'Image optimization'],
        ['date-fns', '4.1.0', 'Date formatting & manipulation'],
        ['jsPDF', '4.2.1', 'PDF generation'],
        ['PapaParse', '5.5.3', 'CSV parsing'],
        ['z-ai-web-dev-sdk', '0.0.17', 'AI model integration SDK'],
    ],
    [0.25, 0.15, 0.60]
))
story.append(Spacer(1, 6))

# ══════════════════════════════════════════════════════════
# SECTION 3: ARCHITECTURE ANALYSIS
# ══════════════════════════════════════════════════════════
story.append(heading('3. Architecture Analysis', h1, 0))

story.append(heading('3.1 Project Structure', h2, 1))
story.append(make_table(
    ['Directory', 'File Count', 'Purpose'],
    [
        ['src/app/api/', '133', 'API routes (REST, GET/POST/PATCH/DELETE)'],
        ['src/app/(dashboard)/', '12', 'Dashboard pages with AuthGuard'],
        ['src/app/admin/', '3', 'Admin management pages'],
        ['src/app/auth/', '4', 'Authentication pages'],
        ['src/app/ai/', '6', 'AI platform pages'],
        ['src/app/community/', '6', 'Community features'],
        ['src/components/', '112', 'UI + custom components'],
        ['src/lib/', '36', 'Utility libraries and modules'],
        ['src/hooks/', '17', 'Custom React hooks'],
        ['prisma/', '5+', 'Schema, migrations, seeds'],
        ['scripts/', '8', 'Deploy & operations scripts'],
    ],
    [0.30, 0.15, 0.55]
))

story.append(heading('3.2 API Route Architecture', h2, 1))
story.append(Paragraph(
    'The API layer consists of 133 route files organized across 15 functional domains. Each route file '
    'exports standard HTTP method handlers (GET, POST, PATCH, DELETE) using Next.js Route Handlers. The '
    'architecture follows a consistent pattern: request validation, authentication check, database operation '
    'via Prisma, and JSON response. Error handling is uniform with try/catch blocks returning appropriate '
    'HTTP status codes (400 for validation, 401 for auth, 404 for not found, 429 for rate limiting, 500 '
    'for server errors). The API supports both Bearer token authentication (via Authorization header) and '
    'ADMIN_SECRET-based auth (for visitor management endpoints).', body))
story.append(Spacer(1, 6))
story.append(make_table(
    ['Domain', 'Routes', 'Auth Method'],
    [
        ['Authentication', '9', 'Email + password (SHA-256)'],
        ['Admin Management', '6', 'Session token + Admin role'],
        ['AI Core', '3', 'Bearer token'],
        ['AI Automations', '8', 'Bearer token'],
        ['AI Copilot', '3', 'Bearer token'],
        ['AI Extensions', '5', 'Bearer token'],
        ['AI Governance', '2', 'Bearer token'],
        ['Arena', '3', 'Public / Bearer'],
        ['Billing / Stripe', '2', 'Stripe webhook signature'],
        ['Community', '28', 'Public / Bearer'],
        ['Leaderboard', '7', 'Public (cached)'],
        ['Teams', '8', 'Bearer token'],
        ['Visitor Management', '2', 'ADMIN_SECRET Bearer'],
        ['Workflow', '6', 'Bearer token'],
        ['Health / System', '7', 'Public'],
    ],
    [0.30, 0.15, 0.55]
))

story.append(heading('3.3 Authentication & Authorization', h2, 1))
story.append(Paragraph(
    'The platform implements a dual-layer authentication system. The first layer is visitor-level access '
    'control via the EmailGate component, which blocks all non-admin, non-auth pages until the visitor email '
    'is approved (status: "accepted"). The second layer is user-level authentication via email/password login '
    'at /auth/login, which creates session tokens stored in both localStorage and the UserSession database '
    'table. Admin users (role: "admin") can access the /admin/approvals dashboard to approve or reject '
    'pending user registrations. A third auth method uses ADMIN_SECRET for the /admin/visitors page, which '
    'manages visitor records directly. Password hashing uses SHA-256 with random salts and timing-safe '
    'comparison, which is functional but not the industry-standard bcrypt/argon2 approach.', body))

story.append(heading('3.4 Payment Architecture (Stripe)', h2, 1))
story.append(Paragraph(
    'The Stripe payment system is fully implemented across 7 files covering the complete subscription '
    'lifecycle. The infrastructure supports three plans: Free (no cost), Pro ($19/month), and Enterprise '
    '(custom pricing). Checkout sessions are created server-side with configurable price IDs, success and '
    'cancel URLs, and optional trial periods. Webhook handlers process four event types: '
    'checkout.session.completed, customer.subscription.created, customer.subscription.updated, and '
    'customer.subscription.deleted. The customer portal allows subscribers to manage their billing directly. '
    'The Stripe client is lazy-loaded as a singleton to prevent build-time key requirement errors, a common '
    'issue in Next.js serverless deployments. Currently, Stripe environment variables are configured as '
    'optional and will need real keys for production use.', body))

# ══════════════════════════════════════════════════════════
# SECTION 4: DATABASE SCHEMA
# ══════════════════════════════════════════════════════════
story.append(heading('4. Database Schema Overview', h1, 0))
story.append(Paragraph(
    'The Prisma schema defines 58 models across approximately 1,220 lines of declarative DSL. The models '
    'are organized into logical domains covering the full scope of the SaaS platform, from user management '
    'and authentication to AI model benchmarking, community features, team collaboration, and payment '
    'processing. Below is a categorized summary of all models.', body))
story.append(Spacer(1, 8))

story.append(make_table(
    ['Domain', 'Models', 'Key Relationships'],
    [
        ['Core', 'User, Visitor, Project, CronJob', 'User -> Session, Activity, Teams'],
        ['Community', 'CommunityPost, PostComment, PostInteraction, UserFollow, TopicFollow', 'Post -> Comments, Interactions'],
        ['AI / Leaderboard', 'AiModel, BenchmarkScore, ModelPricing, LiveMetric, LeaderboardSnapshot', 'Model -> Scores, Pricing, Metrics'],
        ['AI Copilot', 'AiConversation, AutomationRule, AutomationLog, AiSuggestion, AiAuditLog', 'Conversation -> Logs'],
        ['Workflow', 'WorkflowPipeline, DecisionRecord', 'Pipeline -> Decisions'],
        ['Teams', 'Team, TeamMember, TeamInvite, TeamShare, TeamActivity, TeamComment', 'Team -> Members, Invites, Shares'],
        ['Arena', 'ArenaBattle, ArenaVote', 'Battle -> Votes'],
        ['Portfolio', 'ModelPortfolio, PortfolioHolding, PortfolioAlert', 'Portfolio -> Holdings, Alerts'],
        ['Copilot Studio', 'CustomCopilot, CopilotReview, CopilotInstall', 'Copilot -> Reviews, Installs'],
        ['Auth / Monetization', 'ApiKey, UsageRecord, Subscription, Notification, UserSession, UserActivity', 'User -> Keys, Usage, Sub'],
        ['Community Content', 'ThematicCollection, KnowledgeItem, SharedWorkflow, BenchmarkConfig', 'Collection -> Items'],
        ['Monitoring', 'AppErrorLog, DeployLog', 'Standalone logging tables'],
        ['Other', 'VerifiedResearcher, Certification, BenchmarkSubmission, ProtocolVersion, SavedSearch, AnalysisRun', 'Various domain-specific'],
    ],
    [0.18, 0.42, 0.40]
))
story.append(Spacer(1, 8))
story.append(Paragraph(
    'The schema design follows Prisma best practices with explicit relations, composite unique constraints '
    'where needed, and consistent timestamp tracking. The User model serves as the central entity, connecting '
    'to sessions, activities, API keys, usage records, subscriptions, and team memberships. The AiModel model '
    'is the backbone of the leaderboard system, linking to benchmark scores, pricing data, and live metrics. '
    'The community domain is particularly rich with posts, comments, interactions, collections, and knowledge '
    'items supporting a full social platform experience.', body))

# ══════════════════════════════════════════════════════════
# SECTION 5: SECURITY AUDIT
# ══════════════════════════════════════════════════════════
story.append(heading('5. Security Audit', h1, 0))

story.append(heading('5.1 Implemented Security Features', h2, 1))
story.append(make_table(
    ['Feature', 'Implementation', 'Location'],
    [
        ['WAF', 'SQL injection, XSS, path traversal blocking', 'proxy.ts / security.ts'],
        ['Rate Limiting', 'Per-IP, 4 tiers (30-300 req/min)', 'proxy.ts / security.ts'],
        ['CSRF Protection', 'HMAC token generation + verification', 'security.ts / email.ts'],
        ['Input Sanitization', 'Script tag, JS URI, iframe removal', 'security.ts'],
        ['Security Headers', 'X-Frame-Options, CSP, nosniff', 'next.config.ts / proxy.ts'],
        ['Auth', 'SHA-256 password hash + timing-safe compare', 'auth.ts'],
        ['Session Tokens', '48-byte random hex tokens', 'auth.ts'],
        ['Email Security', 'HMAC-signed action tokens (24h expiry)', 'email.ts'],
        ['Admin Protection', 'Cookie-based token check', 'proxy.ts (page-level)'],
        ['Robot Blocking', 'GPTBot, CCBot, ChatGPT-User blocked', 'robots.ts'],
        ['Payload Guard', '4 tiers (10KB-50MB)', 'security.ts'],
        ['Env Validation', 'Required vars checked at startup', 'env.ts'],
    ],
    [0.22, 0.48, 0.30]
))

story.append(heading('5.2 Critical Security Issues', h2, 1))
story.append(Paragraph(
    '<b>CRITICAL - Committed Secrets in .env:</b> The .env file is tracked in version control and contains '
    'real Neon PostgreSQL database credentials, ADMIN_SECRET set to a weak password (Admin@123456), and '
    'the EMAIL_ACTION_SECRET HMAC key. This represents a major security vulnerability. Any contributor '
    'with repository access can extract production database credentials and gain full database access. '
    'This must be resolved immediately by adding .env to .gitignore, rotating all exposed credentials, '
    'and using a secrets management solution for production deployments.', red_s))
story.append(Paragraph(
    '<b>HIGH - SHA-256 Password Hashing:</b> The auth.ts module uses a custom SHA-256 + salt implementation '
    'instead of industry-standard bcrypt, scrypt, or argon2. While functional with timing-safe comparison, '
    'SHA-256 is a fast hash designed for data integrity, not password storage. It lacks the computational '
    'hardness that makes brute-force attacks impractical. Migration to bcrypt or argon2id is strongly '
    'recommended before accepting real user registrations.', red_s))
story.append(Paragraph(
    '<b>HIGH - In-Memory Rate Limiting:</b> Rate limiting uses an in-memory Map that resets on every server '
    'restart or redeployment. In a multi-instance deployment (Vercel serverless, Docker swarm), each instance '
    'maintains its own rate limit state, effectively multiplying the allowed request rate by the number of '
    'instances. A Redis-based or Upstash Redis rate limiter is needed for production.', red_s))
story.append(Paragraph(
    '<b>MEDIUM - Weak ADMIN_SECRET:</b> The ADMIN_SECRET is set to "Admin@123456" which is only 12 characters '
    'and uses a common dictionary word. The env.ts validator warns about secrets shorter than 16 characters '
    'but does not block startup. For a production SaaS, this should be a minimum 32-character random string.', amber_s))

# ══════════════════════════════════════════════════════════
# SECTION 6: FEATURE INVENTORY
# ══════════════════════════════════════════════════════════
story.append(heading('6. Feature Inventory', h1, 0))

story.append(heading('6.1 Implemented Features', h2, 1))
story.append(make_table(
    ['Feature', 'Status', 'Coverage'],
    [
        ['User Registration & Login', 'Complete', 'Register, Login, Forgot/Reset Password'],
        ['EmailGate Visitor System', 'Complete', '3 acceptance methods operational'],
        ['Email One-Click Approval', 'Complete', 'HMAC-signed 24h links'],
        ['Admin Approvals Dashboard', 'Complete', 'Session-based auth, approve/reject'],
        ['Visitor Management Panel', 'Complete', 'Search, filter, bulk actions, CSV export'],
        ['AI Model Leaderboard', 'Complete', 'Benchmarks, comparisons, live metrics'],
        ['AI Arena (Blind Voting)', 'Complete', 'Side-by-side model comparison'],
        ['Community Posts & Comments', 'Complete', 'Full social platform'],
        ['Community Collections & Knowledge', 'Complete', 'Curated content, knowledge base'],
        ['Team Collaboration', 'Complete', 'Members, invites, shares, comments'],
        ['AI Copilot / Chat', 'Complete', 'Conversation, memory, suggestions'],
        ['AI Automations & Workflows', 'Complete', 'Rules, chains, batch processing'],
        ['AI Extensions & SDK', 'Complete', 'Registry, webhooks, hooks'],
        ['AI Governance & Policies', 'Complete', 'Compliance, usage tags, audit'],
        ['Portfolio Management', 'Complete', 'Holdings, alerts, tracking'],
        ['Copilot Studio', 'Complete', 'Create, review, install custom copilots'],
        ['Certifications', 'Complete', 'AI certification system'],
        ['Workspace / Analysis', 'Complete', 'Charts, QQ plots, heatmaps, reports'],
        ['Stripe Payments', 'Complete', 'Checkout, webhooks, portal, billing'],
        ['i18n (8 Languages)', 'Complete', 'EN, AR, FR, ES, DE, ZH, JA, KO + RTL'],
        ['GDPR Consent', 'Complete', 'Cookie consent banner'],
        ['Push Notifications', 'Complete', 'Permission + push support'],
        ['Search (Global)', 'Complete', 'Full-text search with saved searches'],
        ['Vercel Cron Jobs', 'Complete', '10 scheduled tasks (leaderboard, news, etc.)'],
    ],
    [0.28, 0.12, 0.60]
))

story.append(heading('6.2 Pages Inventory', h2, 1))
story.append(Paragraph(
    'The application contains 48 distinct pages organized across multiple route groups. The marketing pages '
    '(home, about, company, leaderboard, directory, tutorials, updates) are statically generated for optimal '
    'performance. The dashboard pages (under the (dashboard) route group) are protected by an AuthGuard that '
    'verifies the session token from localStorage. Admin pages handle their own authentication at the page '
    'level, bypassing the middleware block that was previously causing access issues.', body))

# ══════════════════════════════════════════════════════════
# SECTION 7: INTERNATIONALIZATION
# ══════════════════════════════════════════════════════════
story.append(heading('7. Internationalization', h1, 0))
story.append(Paragraph(
    'The platform implements a custom React Context-based i18n system (not using the installed next-intl package). '
    'It supports 8 languages with 300+ translation keys per language: English (en), Arabic (ar), French (fr), '
    'Spanish (es), German (de), Chinese (zh), Japanese (ja), and Korean (ko). Arabic includes full RTL '
    '(right-to-left) support with automatic direction switching. Translation coverage spans the entire user '
    'experience including navigation, hero sections, features, pricing, workspace, AI assistant, community, '
    'GDPR consent, EmailGate forms, and legal pages. The language can be switched dynamically from any page '
    'using the globe selector component, with the preference persisted in localStorage.', body))

# ══════════════════════════════════════════════════════════
# SECTION 8: CI/CD AND INFRASTRUCTURE
# ══════════════════════════════════════════════════════════
story.append(heading('8. CI/CD and Infrastructure', h1, 0))

story.append(heading('8.1 GitHub Actions Workflows', h2, 1))
story.append(Paragraph(
    'The project includes two GitHub Actions workflow files. The CI pipeline (.github/workflows/ci.yml) '
    'executes five stages: code quality (TypeScript check + ESLint), build verification (Prisma generate + '
    'push + Next.js build), security audit (npm audit, hardcoded secrets scan, .env check), database schema '
    'validation (Prisma validate + format + generate), and API route verification. The CD pipeline '
    '(.github/workflows/cd.yml) builds a multi-arch Docker image, deploys to staging via SSH with health '
    'checks and smoke tests, and includes a manual gate for production deployment with pre-deploy backup, '
    'SSH deploy, deep health check, and smoke tests.', body))

story.append(heading('8.2 Docker Configuration', h2, 1))
story.append(Paragraph(
    'The Docker setup includes a multi-stage Dockerfile (deps, builder, runner stages), docker-compose.yml '
    'for app + Caddy reverse proxy, docker-compose.prod.yml for production overrides, and docker-compose.dev.yml '
    'for development. The container runs as a non-root user (oneway:nodejs) with a health check endpoint. '
    'Caddy provides automatic HTTPS termination. The Next.js standalone output mode is used for optimal '
    'container image size.', body))

story.append(heading('8.3 Vercel Deployment', h2, 1))
story.append(Paragraph(
    'The vercel.json configuration defines 10 cron jobs for scheduled tasks including daily benchmark refresh, '
    'AI news collection (3 daily shifts), community content publishing, engagement highlights, and health '
    'monitoring. The project is linked to Vercel with a deployment token available. Environment variables '
    'need to be configured in the Vercel dashboard before deployment can proceed. The custom domain '
    'theonewaygda.com needs DNS configuration for full deployment.', body))

# ══════════════════════════════════════════════════════════
# SECTION 9: TESTING STATUS
# ══════════════════════════════════════════════════════════
story.append(heading('9. Testing Status', h1, 0))
story.append(Paragraph(
    '<b>Current test coverage is critically low.</b> The project has only 4 test files covering utility '
    'functions, i18n translations, error tracking, and recommendation engine logic. There are no tests '
    'for any of the 133 API routes, 112 components, authentication flows, payment processing, or database '
    'operations. The Vitest framework is configured with jsdom environment and React plugin support, but the '
    'test script is missing from package.json and no test step exists in the CI pipeline. This represents '
    'a significant risk for a production SaaS deployment.', red_s))
story.append(Spacer(1, 6))
story.append(make_table(
    ['Area', 'Test Files', 'Coverage Assessment'],
    [
        ['API Routes (133)', '0', 'No route tests exist'],
        ['Components (112)', '0', 'No component tests exist'],
        ['Auth Flows', '0', 'No login/register/approval tests'],
        ['Payment/Stripe', '0', 'No payment flow tests'],
        ['Database Operations', '0', 'No Prisma/DB integration tests'],
        ['Utility Libraries', '4', 'Partial (utils, i18n, errors, recommendations)'],
        ['E2E / Integration', '0', 'No Playwright/Cypress tests'],
    ],
    [0.30, 0.15, 0.55]
))

# ══════════════════════════════════════════════════════════
# SECTION 10: SaaS READINESS GAP ANALYSIS
# ══════════════════════════════════════════════════════════
story.append(heading('10. SaaS Readiness: Steps to Production', h1, 0))
story.append(Paragraph(
    'This section outlines all the steps required to transform THEONEWAYGDA from its current development '
    'state into a production-ready SaaS platform. Each step is categorized by priority and estimated effort.', body))

story.append(heading('10.1 Critical Security Fixes (Must Do First)', h2, 1))
story.append(make_table(
    ['Step', 'Action', 'Effort'],
    [
        ['1', 'Remove .env from git, rotate all credentials (DB URL, ADMIN_SECRET, HMAC key)', '2 hours'],
        ['2', 'Set up .gitignore for .env, create .env.example with placeholders', '30 min'],
        ['3', 'Migrate password hashing from SHA-256 to bcrypt or argon2id', '4 hours'],
        ['4', 'Replace in-memory rate limiting with Redis (Upstash or similar)', '4 hours'],
        ['5', 'Set ADMIN_SECRET to a 32+ character random string', '15 min'],
        ['6', 'Configure ADMIN_EMAIL_APP_PASSWORD for real email delivery', '1 hour'],
    ],
    [0.08, 0.72, 0.20]
))

story.append(heading('10.2 Infrastructure Setup', h2, 1))
story.append(make_table(
    ['Step', 'Action', 'Effort'],
    [
        ['7', 'Configure Vercel environment variables (all 20+ vars)', '1 hour'],
        ['8', 'Set Stripe API keys (publishable + secret) in Vercel env', '30 min'],
        ['9', 'Configure DNS for theonewaygda.com (A/CNAME records)', '1 hour'],
        ['10', 'Verify Google Search Console with domain verification', '30 min'],
        ['11', 'Set up error monitoring (re-enable Sentry or use alternative)', '2 hours'],
        ['12', 'Configure real Gmail App Password for transactional emails', '30 min'],
        ['13', 'Enable Vercel cron jobs (verify all 10 schedules)', '1 hour'],
        ['14', 'Set up SSL/HTTPS (automatic via Vercel or Caddy)', '30 min'],
    ],
    [0.08, 0.72, 0.20]
))

story.append(heading('10.3 Testing and Quality Assurance', h2, 1))
story.append(make_table(
    ['Step', 'Action', 'Effort'],
    [
        ['15', 'Add "test" script to package.json', '15 min'],
        ['16', 'Write unit tests for critical auth flows (login, register, approve)', '8 hours'],
        ['17', 'Write integration tests for all 3 acceptance methods', '6 hours'],
        ['18', 'Write Stripe webhook handler tests', '4 hours'],
        ['19', 'Write API route tests for visitor management endpoints', '4 hours'],
        ['20', 'Add test step to CI pipeline', '1 hour'],
        ['21', 'Set up E2E tests with Playwright for critical user flows', '12 hours'],
    ],
    [0.08, 0.72, 0.20]
))

story.append(heading('10.4 Production Hardening', h2, 1))
story.append(make_table(
    ['Step', 'Action', 'Effort'],
    [
        ['22', 'Implement proper session management (server-side, httpOnly cookies)', '6 hours'],
        ['23', 'Add rate limiting per-user (not just per-IP) for authenticated routes', '3 hours'],
        ['24', 'Implement CSRF protection on all state-changing API routes', '4 hours'],
        ['25', 'Add request logging and monitoring (APM tool integration)', '4 hours'],
        ['26', 'Set up automated database backups (Neon point-in-time or pg_dump)', '2 hours'],
        ['27', 'Implement data retention policies and GDPR data export/deletion', '6 hours'],
        ['28', 'Create Terms of Service and Privacy Policy pages (legal review)', '8 hours'],
        ['29', 'Add uptime monitoring (UptimeRobot or similar)', '1 hour'],
        ['30', 'Set up staging environment for pre-production testing', '4 hours'],
    ],
    [0.08, 0.72, 0.20]
))

story.append(heading('10.5 Scaling and Performance', h2, 1))
story.append(make_table(
    ['Step', 'Action', 'Effort'],
    [
        ['31', 'Replace in-memory cache with Redis for shared state across instances', '4 hours'],
        ['32', 'Implement CDN for static assets (images, JS, CSS)', '2 hours'],
        ['33', 'Add database query optimization and indexing review', '4 hours'],
        ['34', 'Implement WebSocket for real-time features (notifications, arena)', '8 hours'],
        ['35', 'Add image optimization pipeline (sharp, WebP conversion)', '4 hours'],
        ['36', 'Implement lazy loading and code splitting for heavy pages', '6 hours'],
    ],
    [0.08, 0.72, 0.20]
))

story.append(heading('10.6 Feature Completeness', h2, 1))
story.append(make_table(
    ['Step', 'Action', 'Effort'],
    [
        ['37', 'Remove dead dependencies (next-intl, next-auth if unused)', '1 hour'],
        ['38', 'Clean up duplicate i18n files (i18n.tsx, i18n_new.tsx, .bak)', '2 hours'],
        ['39', 'Enable Sentry error monitoring (currently disabled)', '2 hours'],
        ['40', 'Complete mini-services architecture (currently empty)', '20+ hours'],
        ['41', 'Integrate WebSocket examples into live features', '8 hours'],
        ['42', 'Add user onboarding flow and guided tour', '6 hours'],
        ['43', 'Implement billing usage meters and quota enforcement', '8 hours'],
        ['44', 'Add multi-tenancy support for Enterprise plan', '16+ hours'],
    ],
    [0.08, 0.72, 0.20]
))

# ══════════════════════════════════════════════════════════
# SECTION 11: PERFORMANCE ANALYSIS
# ══════════════════════════════════════════════════════════
story.append(heading('11. Performance Analysis', h1, 0))
story.append(Paragraph(
    'The project implements several performance optimizations. An in-memory MemoryCache with TTL-based '
    'expiry provides fast access to frequently requested data: leaderboard data cached for 15 minutes, '
    'pricing for 1 hour, benchmarks for 30 minutes, and metrics for 5 minutes. The Next.js standalone '
    'output mode produces optimized server bundles. Sharp is installed for server-side image optimization. '
    'API routes set Cache-Control: no-store to prevent stale data. Dynamic imports and lazy loading wrappers '
    'are available for heavy components. The build system uses Turbopack for fast compilation (14.4s in '
    'the latest build). Static pages (marketing, auth forms, legal) are pre-rendered at build time.', body))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'Areas for improvement include: the in-memory cache does not persist across serverless function '
    'invocations (each cold start rebuilds the cache), the API response caching layer could benefit from '
    'a distributed cache, and the lack of image CDN means all image processing happens server-side. '
    'For a production deployment on Vercel, implementing edge caching with proper cache headers for public '
    'API endpoints (leaderboard, models) would significantly reduce cold-start latency.', body))

# ══════════════════════════════════════════════════════════
# SECTION 12: DEPENDENCY AUDIT
# ══════════════════════════════════════════════════════════
story.append(heading('12. Dependency Audit', h1, 0))
story.append(Paragraph(
    'All 43 production dependencies and 9 dev dependencies are at their latest stable versions. The '
    'major framework packages (Next.js 16, React 19, Prisma 6) represent cutting-edge technology choices. '
    'Two notable observations: next-intl (v4.3.4) and next-auth (v4.24.11) are installed as dependencies '
    'but the project uses custom implementations instead (a custom React Context i18n system and custom '
    'auth with SHA-256 hashing). These represent dead dependencies that could be removed to reduce '
    'bundle size and attack surface. The xlsx package (v0.18.5) is community-maintained as the SheetJS '
    'library moved to a commercial license model. For long-term maintenance, consider migrating to '
    'exceljs for Excel export functionality.', body))

# ══════════════════════════════════════════════════════════
# SECTION 13: EMAIL SYSTEM
# ══════════════════════════════════════════════════════════
story.append(heading('13. Email System', h1, 0))
story.append(Paragraph(
    'The email system is implemented in src/lib/email.ts (359 lines) using Nodemailer with Gmail SMTP. '
    'It includes 5 email functions with professional HTML templates: admin access request notifications '
    '(with one-click approve/reject links), user approval welcome emails, user rejection notifications, '
    'password reset emails with 1-hour expiry tokens, and visitor registration notifications. The system '
    'falls back to jsonTransport in development mode, logging email content to console instead of sending. '
    'All action tokens are HMAC-signed with SHA-256 using the EMAIL_ACTION_SECRET, providing tamper-proof '
    'links with 24-hour expiry. Currently, ADMIN_EMAIL_APP_PASSWORD is not configured, so all emails are '
    'in DEV mode (console logging only). For production, a Gmail App Password must be set.', body))

# ══════════════════════════════════════════════════════════
# SECTION 14: SUMMARY AND RECOMMENDATIONS
# ══════════════════════════════════════════════════════════
story.append(heading('14. Summary and Recommendations', h1, 0))
story.append(Paragraph(
    'THEONEWAYGDA represents an impressively ambitious project with a feature set that rivals established '
    'AI comparison platforms. The codebase demonstrates strong engineering practices including type safety '
    '(TypeScript strict mode), consistent error handling, comprehensive security middleware, professional '
    'UI design with shadcn/ui, multi-language support, and a well-organized monorepo structure. The '
    '133 API routes, 48 pages, and 58 database models provide a solid foundation for a production SaaS.', body))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'However, the project is currently at a "feature-complete prototype" stage rather than a '
    '"production-ready SaaS" stage. The most critical gaps are: committed secrets exposing production '
    'credentials, weak password hashing (SHA-256 instead of bcrypt), near-zero test coverage, in-memory '
    'rate limiting unsuitable for production, and missing email delivery configuration. Addressing the 44 '
    'steps outlined in Section 10 would transform this prototype into a reliable, secure, and scalable '
    'SaaS platform ready for real users.', body))
story.append(Spacer(1, 6))
story.append(Paragraph(
    '<b>Priority Action Plan (First 2 Weeks):</b> Remove .env from version control and rotate all credentials '
    '(Day 1). Migrate password hashing to bcrypt (Day 2-3). Configure Vercel environment variables and deploy '
    '(Day 4). Set up Gmail App Password for real email delivery (Day 5). Write critical auth and payment '
    'tests (Day 6-10). Replace in-memory rate limiting with Redis (Day 11-12). Configure monitoring and '
    'backups (Day 13-14). This two-week sprint would address the most critical production blockers and '
    'bring the platform to a minimum viable SaaS standard.', body))

# ━━ Build ━━
doc.multiBuild(story)
print(f'Report generated: {output_path}')
