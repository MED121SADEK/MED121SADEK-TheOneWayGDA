export type SearchSource = 'all' | 'community' | 'news' | 'leaderboard' | 'pages'

export interface SearchFilters {
  sort: 'latest' | 'popular' | 'featured'
  dateRange: 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  tags: string[]
  minLikes: number
  author: string
  customFrom?: string
  customTo?: string
}

export const DATE_RANGE_LABELS: Record<string, string> = {
  all: 'All Time', today: 'Today', week: 'This Week', month: 'This Month',
  quarter: 'Last 3 Months', year: 'This Year', custom: 'Custom Range',
}

export const SOURCE_LABELS: Record<SearchSource, string> = {
  all: 'All Sources', community: 'Community', news: 'News',
  leaderboard: 'AI Leaderboard', pages: 'Pages',
}

export function getDateRange(range: string): { from?: string; to?: string } {
  if (range === 'all') return {}
  const now = new Date()
  const to = now.toISOString().split('T')[0]
  let from: Date
  switch (range) {
    case 'today': from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break
    case 'week': from = new Date(now.getTime() - 7 * 86400000); break
    case 'month': from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()); break
    case 'quarter': from = new Date(now.getTime() - 90 * 86400000); break
    case 'year': from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()); break
    default: return {}
  }
  return { from: from.toISOString().split('T')[0], to }
}
