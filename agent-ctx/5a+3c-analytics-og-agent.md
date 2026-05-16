---
Task ID: 5a+3c
Agent: Analytics & OG Agent
Task: Enhanced Real-Time Analytics Dashboard + OG Image Generation

Work Log:
- Read and analyzed existing analytics page at src/app/(dashboard)/analytics/page.tsx
- Read existing analytics API route at src/app/api/analytics/route.ts (POST for analysis, GET for listing)
- Created src/lib/analytics-engine.ts — Client-side analytics collection engine:
  - Tracks: page views, feature usage, navigation patterns, time on page, session starts
  - AnalyticsEngine.init() — starts tracking with visibility change listener, popstate/SPA navigation detection
  - AnalyticsEngine.trackPageView(page) — records page view with session ID and referrer
  - AnalyticsEngine.trackEvent(event, data) — records custom events (feature usage tracked with "feature:" prefix)
  - AnalyticsEngine.getDashboardData() — aggregates all localStorage data into DashboardData:
    - Total page views, unique pages, session duration, bounce rate, growth rate
    - Page popularity ranking (top 10)
    - Feature usage breakdown (for pie chart, top 8)
    - Hourly activity pattern (last 24h, bar chart data)
    - Top navigation paths (top 8)
    - Recent activity feed (last 20 events)
    - Quick insights data for AI-generated cards
  - All data in localStorage with 7-day retention, max 10,000 events
  - Batch flush to server every 5 seconds via PATCH /api/analytics
  - AnalyticsEngine.exportJSON() for data export
  - AnalyticsEngine.destroy() for cleanup

- Created src/components/analytics-widgets.tsx — Full dashboard widget system:
  - StatsCards: 4 animated metric cards (Page Views, Active Features, Avg Session, Growth Rate)
    - Animated number counters with ease-out cubic interpolation
    - Change indicators (green up / red down arrows with percentage)
    - Color-coded icons per metric
  - ActivityChart: Recharts BarChart showing hourly page views & events (last 24h)
    - Uses ChartContainer with proper config for theme-aware colors
    - XAxis with 3-hour intervals, YAxis with compact width
  - PagePopularity: Animated horizontal bar chart of most visited pages
    - Gradient bars with staggered animation
    - Max height with scrollbar overflow
  - FeatureUsage: Donut/pie chart using Recharts PieChart
    - 8-color palette, inner radius 50px for donut effect
    - Total interactions counter + legend grid
  - RecentActivity: Live scrolling feed with type-specific icons
    - Live badge with pulsing indicator
    - Page view / feature use / navigation type icons
    - Max height with scrollbar
  - QuickInsights: AI-powered insight cards with contextual data:
    - Most visited page, bounce rate warnings, growth surges
    - Feature diversity, navigation patterns, session time
  - NavigationPaths: Top page transition paths with flow visualization
  - AnalyticsDashboard: Main export component combining all widgets
    - Auto-refresh every 30 seconds
    - Manual refresh + Export JSON buttons
    - Responsive grid layout (lg:grid-cols-2, lg:grid-cols-3)
  - All widgets use Card/card-premium, Badge, Framer Motion animations

- Enhanced src/app/api/analytics/route.ts:
  - GET /api/analytics?mode=dashboard — new aggregation endpoint
    - Returns: totalRuns, todayRuns, growthRate, typeBreakdown, avgDurationMs, recentAnalyses
  - PATCH /api/analytics — new client analytics event receiver
    - Accepts batched events array
    - Returns { received, status: 'ok' }
  - Preserved all existing POST/GET functionality

- Updated src/app/(dashboard)/analytics/page.tsx:
  - Added Dashboard tab as default (3 tabs: Dashboard, New Analysis, History)
  - Added AnalyticsPageTracker component to initialize engine on mount
  - Imported AnalyticsEngine and AnalyticsDashboard
  - Added LayoutDashboard icon to tabs
  - Fixed useEffect to use async pattern (avoid lint set-state-in-effect warning)

- Created src/app/api/og/route.ts — Dynamic OG Image Generation:
  - Uses Next.js built-in ImageResponse (no external packages needed)
  - Edge runtime for fast response
  - GET endpoint with query params: ?type=...&title=...&description=...
  - 4 type variants with unique color schemes:
    - home: sky blue (#38bdf8) — AI Model Comparison & Leaderboard
    - leaderboard: emerald (#34d399) — Model Leaderboard
    - community: orange (#fb923c) — Community Hub
    - workspace: violet (#c084fc) — AI Workspace
  - Design features:
    - Dark gradient background per type
    - Subtle grid pattern overlay
    - Accent glow orbs (top-right, bottom-left)
    - Logo placeholder with "G" + "TheOneWayGDA" branding
    - Type badge pill in top-right
    - Large title + description in center
    - Stats row at bottom (200+ AI Models, 50K+ Evaluations, 10K+ Community)
    - Decorative accent gradient line
  - Standard OG size: 1200x630

OG Image Metadata (document for layout.tsx integration):
- Route: /api/og?type={type}&title={title}&description={description}
- Types: 'home' | 'leaderboard' | 'community' | 'workspace'
- Default: /api/og?type=home (if no params, shows "TheOneWayGDA" + generic description)
- Suggested metadata in layout.tsx:
  - openGraph.images: [{ url: '/api/og?type=home', width: 1200, height: 630, alt: 'TheOneWayGDA' }]
  - twitter.card: 'summary_large_image'

Stage Summary:
- Files Created: 3 (analytics-engine.ts, analytics-widgets.tsx, api/og/route.ts)
- Files Modified: 2 (api/analytics/route.ts, analytics/page.tsx)
- Lint Status: No new errors (pre-existing errors in developers/page.tsx and settings/page.tsx)
- Dev Server: Compiling successfully
- New Features:
  - Real-time analytics dashboard with 6 widget types
  - Client-side analytics engine with 7-day localStorage retention
  - Server-side analytics event collection endpoint
  - Dynamic OG image generation with 4 type variants
