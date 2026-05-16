import { Skeleton } from '@/components/ui/skeleton'

/* ─────────────────────────────────────────────
   Leaderboard Skeleton
   Matches: sticky nav → badges → tabs → filters → table
   ───────────────────────────────────────────── */
export function LeaderboardSkeleton() {
  return (
    <div className="min-h-screen flex flex-col mesh-gradient noise-overlay">
      {/* Nav bar */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Status badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-4 w-36" />
        </div>

        {/* Tabs */}
        <Skeleton className="h-9 w-full sm:w-auto sm:w-[480px]" />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-48 rounded-md" />
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>

        {/* Table Card */}
        <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
          {/* Table header */}
          <div className="border-b border-border/40 bg-muted/30">
            <div className="flex items-center gap-4 py-3 px-4">
              <Skeleton className="size-3.5 rounded" />
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20 hidden lg:block" />
              <Skeleton className="h-3 w-12 flex-1" />
              <Skeleton className="h-3 w-16 hidden md:block" />
              <Skeleton className="h-3 w-12 hidden md:block" />
              <Skeleton className="h-3 w-16 hidden xl:block" />
              <Skeleton className="h-3 w-16 hidden xl:block" />
            </div>
          </div>

          {/* Table rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 py-3 px-4 border-b border-border/20"
            >
              <Skeleton className="size-3.5 rounded" />
              <Skeleton className="h-4 w-5" />
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <Skeleton className={`h-4 w-${32 + (i % 3) * 8} rounded`} />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full hidden lg:block" />
              <Skeleton className="h-6 w-16 rounded-lg flex-1 max-w-[80px]" />
              <Skeleton className="h-5 w-16 rounded-md hidden md:block" />
              <Skeleton className="h-4 w-10 hidden md:block" />
              <Skeleton className="h-4 w-12 hidden xl:block" />
              <Skeleton className="h-4 w-14 hidden xl:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Dashboard Skeleton
   Matches: nav → welcome hero → 4 stat cards → tabs → chart + profile
   ───────────────────────────────────────────── */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen flex flex-col mesh-gradient noise-overlay">
      {/* Nav bar */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Welcome Hero */}
        <div className="hero-gradient rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Skeleton className="size-16 rounded-2xl flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Skeleton className="h-9 w-32 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </div>
        </div>

        {/* Stats Cards (2x2 → 4 cols) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-10" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Skeleton className="h-9 w-full sm:w-auto sm:w-[360px]" />

        {/* Overview Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Weekly Activity Chart */}
          <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4">
            <Skeleton className="h-4 w-32 mb-4" />
            <div className="flex items-end gap-2 h-32">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <Skeleton
                    className="w-full rounded-t-md"
                    style={{ height: `${20 + Math.random() * 80}%` }}
                  />
                  <Skeleton className="h-3 w-6" />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>

          {/* Profile & Skills */}
          <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4">
            <Skeleton className="h-4 w-28 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-40" />
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-14 rounded-full" />
                ))}
              </div>
              <div className="border-t border-border/30 pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-14 rounded-lg" />
                  <Skeleton className="h-14 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Community Skeleton
   Matches: nav → tabs + filters → news banner → post cards feed
   ───────────────────────────────────────────── */
export function CommunitySkeleton() {
  return (
    <div className="min-h-screen flex flex-col mesh-gradient noise-overlay">
      {/* Nav bar */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="h-5 w-44" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Tabs & Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <Skeleton className="h-9 w-full sm:w-auto sm:w-[360px]" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Skeleton className="h-8 flex-1 sm:w-48 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>

        {/* Post Cards Feed */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden"
            >
              {/* Post Header */}
              <div className="px-4 sm:px-5 pt-4 sm:pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                  <Skeleton className="size-7 rounded-md" />
                </div>

                {/* Title & Content */}
                <div className="mt-3 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  {i % 2 === 0 && <Skeleton className="h-4 w-2/3" />}
                </div>

                {/* Image placeholder on some cards */}
                {i % 3 === 0 && (
                  <div className="mt-3 rounded-lg overflow-hidden">
                    <Skeleton className="w-full h-48 rounded-lg" />
                  </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>

              {/* Stats bar */}
              <div className="px-4 sm:px-5 py-2 text-xs text-muted-foreground flex items-center gap-4">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-14" />
              </div>

              {/* Divider */}
              <Skeleton className="h-px w-full" />

              {/* Action buttons */}
              <div className="px-2 sm:px-3 py-1 flex items-center">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="flex-1 flex justify-center">
                    <Skeleton className="h-8 w-16 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Analytics Skeleton
   Matches: nav → hero → tabs → stats cards → chart placeholder
   ───────────────────────────────────────────── */
export function AnalyticsSkeleton() {
  return (
    <div className="min-h-screen flex flex-col mesh-gradient noise-overlay">
      {/* Nav bar */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="h-5 w-36" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Hero Section */}
        <div className="hero-gradient rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/5 pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <Skeleton className="h-5 w-48 rounded-full" />
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>

        {/* Tabs */}
        <Skeleton className="h-9 w-full sm:w-auto sm:w-[380px]" />

        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Activity Chart */}
          <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4 space-y-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-48 rounded-lg" />
            <div className="flex items-end gap-1.5 h-40">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <Skeleton
                    className="w-full rounded-t-sm"
                    style={{ height: `${15 + Math.random() * 75}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Page Popularity */}
          <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4 space-y-3">
            <Skeleton className="h-4 w-40" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity & Feature Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Activity */}
          <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4 space-y-3">
            <Skeleton className="h-4 w-36" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-2.5 w-28" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>

          {/* Feature Usage */}
          <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center justify-center h-48">
              <Skeleton className="size-40 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
