'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Shield, Eye, EyeOff, Flag, Star, Trash2, RefreshCw, Send, Activity,
  AlertTriangle, CheckCircle, XCircle, Clock, Heart, MessageCircle,
  Repeat2, Bookmark, Search, ChevronDown, ChevronUp, Loader2,
  Sparkles, FileText, Award, Newspaper, Users, Zap, BarChart3, Rss,
  Filter, Play, Ban, Globe, Megaphone,
} from 'lucide-react'

/* ─── Types ─── */
interface DashboardStats {
  totalPosts: number
  postsPerHour: number
  postsLast24h: number
  autoPostsLast24h: number
  userPostsLast24h: number
  totalEngagement24h: number
  flaggedPosts: number
  hiddenPosts: number
  featuredPosts: number
  uniqueAuthors7d: number
}

interface CronJob {
  name: string
  type: string
  status: string
  interval: string
  lastRun: string | null
  nextRun: string | null
  lastError: string | null
  runCount: number
  isStale: boolean
  timeSinceLastRun: number | null
}

interface Post {
  id: string
  type: string
  title: string
  content: string
  author: string
  authorName?: string | null
  tags?: string | null
  likes: number
  comments: number
  reposts: number
  saves: number
  featured: boolean
  createdAt: string
}

/* ─── Helpers ─── */
function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return []
  try { return JSON.parse(tags) } catch { return [] }
}

function getSession() {
  if (typeof window === 'undefined') return null
  try {
    const token = localStorage.getItem('oneway-auth-token')
    const userStr = localStorage.getItem('oneway-user')
    if (!token) return null
    const user = userStr ? JSON.parse(userStr) : null
    return { token, user }
  } catch { return null }
}

function authHeaders(): Record<string, string> {
  const s = getSession()
  return s?.token ? { Authorization: `Bearer ${s.token}` } : {}
}

function truncate(text: string, len: number): string {
  return text.length <= len ? text : text.slice(0, len) + '...'
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'auto': return { label: 'Auto', icon: Sparkles, cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' }
    case 'digest': return { label: 'Digest', icon: FileText, cls: 'bg-violet-500/10 text-violet-400 border-violet-500/30' }
    case 'user_highlight': return { label: 'Picks', icon: Award, cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' }
    case 'news': return { label: 'News', icon: Newspaper, cls: 'bg-sky-500/10 text-sky-400 border-sky-500/30' }
    default: return { label: 'Community', icon: Users, cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' }
  }
}

function getStatusBadge(tags: string[]) {
  if (tags.includes('Flagged')) return { label: 'Flagged', cls: 'bg-red-500/10 text-red-400 border-red-500/30' }
  if (tags.includes('Hidden')) return { label: 'Hidden', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/30' }
  return null
}

/* ─── MAIN PAGE ─── */
export default function AdminCommunityPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [cronSummary, setCronSummary] = useState<{ total: number; healthy: number; warning: number; failed: number; stale: number } | null>(null)
  const [categoryBreakdown, setCategoryBreakdown] = useState<{ category: string; count: number }[]>([])
  const [typeBreakdown, setTypeBreakdown] = useState<{ type: string; count: number }[]>([])
  const [topAuthors, setTopAuthors] = useState<{ author: string; count: number }[]>([])

  // Posts
  const [posts, setPosts] = useState<Post[]>([])
  const [postPagination, setPostPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set())

  // UI
  const [loading, setLoading] = useState(true)
  const [cronExpanded, setCronExpanded] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/community', { headers: authHeaders() })
      const data = await res.json()
      setStats(data.stats)
      setCronJobs(data.cronHealth?.jobs || [])
      setCronSummary(data.cronHealth?.summary || null)
      setCategoryBreakdown(data.categoryBreakdown || [])
      setTypeBreakdown(data.typeBreakdown || [])
      setTopAuthors(data.topAuthors || [])
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    }
  }, [])

  const fetchPosts = useCallback(async (page: number = 1) => {
    setLoadingPosts(true)
    try {
      const params = new URLSearchParams({
        section: 'posts',
        type: typeFilter,
        status: statusFilter,
        page: String(page),
        limit: '20',
        sortBy,
        sortOrder: 'desc',
      })
      if (searchQuery) params.set('search', searchQuery)
      const res = await fetch(`/api/admin/community?${params}`, { headers: authHeaders() })
      const data = await res.json()
      setPosts(data.posts || [])
      setPostPagination(data.pagination || { page: 1, pages: 1, total: 0 })
    } catch (err) {
      console.error('Posts fetch error:', err)
    }
    setLoadingPosts(false)
  }, [typeFilter, statusFilter, searchQuery, sortBy])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchDashboard(), fetchPosts(1)]).finally(() => setLoading(false))
  }, [fetchDashboard, fetchPosts])

  useEffect(() => {
    setSelectedPosts(new Set())
  }, [statusFilter, typeFilter])

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  /* ─── Moderation Actions ─── */
  const moderate = async (action: string, postIds: string[], data?: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/admin/community', {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, postIds, data }),
      })
      const result = await res.json()
      if (result.success) {
        showToast('success', result.message)
        fetchDashboard()
        fetchPosts(postPagination.page)
        setSelectedPosts(new Set())
      } else {
        showToast('error', result.error || 'Action failed')
      }
    } catch {
      showToast('error', 'Request failed')
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedPosts(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedPosts.size === posts.length) {
      setSelectedPosts(new Set())
    } else {
      setSelectedPosts(new Set(posts.map(p => p.id)))
    }
  }

  /* ─── Trigger Actions ─── */
  const triggerAction = async (trigger: string) => {
    const labels: Record<string, string> = {
      publish: 'Publish News', highlights: 'Highlights',
      digest: 'Daily Digest', monitor: 'Monitor', seed: 'Seed', catchup: 'Catch-up',
    }
    setActionLoading(trigger)
    try {
      const res = await fetch(`/api/admin/community?trigger=${trigger}`, {
        method: 'POST',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', `${labels[trigger]} triggered successfully`)
        setTimeout(() => { fetchDashboard(); fetchPosts(1) }, 2000)
      } else {
        showToast('error', `${labels[trigger]} failed: ${data.error || 'Unknown error'}`)
      }
    } catch {
      showToast('error', 'Trigger failed')
    }
    setActionLoading(null)
  }

  /* ─── RENDER ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    )
  }

  const maxCatCount = Math.max(...categoryBreakdown.map(c => c.count), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="size-6 text-primary" />
            Community Admin
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Moderate posts, monitor cron jobs, and manage the always-on publishing engine.
          </p>
        </div>
        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
          <CheckCircle className="size-3 mr-1" />
          System Active
        </Badge>
      </div>

      {/* ─── Section 1: Stats Overview ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Activity className="size-4 text-blue-400" />}
          label="Total Posts"
          value={stats?.totalPosts || 0}
          sub={`${stats?.postsPerHour || 0}/hour`}
          accent="blue"
        />
        <StatCard
          icon={<AlertTriangle className="size-4 text-amber-400" />}
          label="Needs Attention"
          value={(stats?.flaggedPosts || 0) + (stats?.hiddenPosts || 0)}
          sub={`${stats?.flaggedPosts || 0} flagged, ${stats?.hiddenPosts || 0} hidden`}
          accent="amber"
        />
        <StatCard
          icon={<Rss className="size-4 text-emerald-400" />}
          label="Published (24h)"
          value={stats?.postsLast24h || 0}
          sub={`${stats?.autoPostsLast24h || 0} auto / ${stats?.userPostsLast24h || 0} community`}
          accent="emerald"
        />
        <StatCard
          icon={<Heart className="size-4 text-rose-400" />}
          label="Engagement (24h)"
          value={stats?.totalEngagement24h || 0}
          sub={`${stats?.uniqueAuthors7d || 0} authors (7d)`}
          accent="rose"
        />
      </div>

      {/* Quick Trigger Buttons */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground self-center mr-1 font-medium">Triggers:</span>
        {[
          { key: 'publish', label: 'Publish News', icon: Send, color: 'text-blue-400' },
          { key: 'highlights', label: 'Highlights', icon: Award, color: 'text-amber-400' },
          { key: 'digest', label: 'Daily Digest', icon: FileText, color: 'text-violet-400' },
          { key: 'monitor', label: 'Run Monitor', icon: Activity, color: 'text-emerald-400' },
          { key: 'catchup', label: 'Catch-up', icon: RefreshCw, color: 'text-sky-400' },
        ].map(t => (
          <Button
            key={t.key}
            variant="outline"
            size="sm"
            className={`gap-1.5 text-xs ${actionLoading === t.key ? 'opacity-50' : ''}`}
            onClick={() => triggerAction(t.key)}
            disabled={!!actionLoading}
          >
            {actionLoading === t.key ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <t.icon className={`size-3 ${t.color}`} />
            )}
            {t.label}
          </Button>
        ))}
      </div>

      {/* ─── Section 2: Cron Health ─── */}
      <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
        <button
          onClick={() => setCronExpanded(!cronExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Cron Jobs</span>
            {cronSummary && (
              <div className="flex gap-1.5 ml-2">
                {cronSummary.healthy > 0 && (
                  <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    {cronSummary.healthy} OK
                  </Badge>
                )}
                {cronSummary.warning > 0 && (
                  <Badge className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                    {cronSummary.warning} warn
                  </Badge>
                )}
                {cronSummary.failed > 0 && (
                  <Badge className="text-[9px] bg-red-500/10 text-red-400 border-red-500/30">
                    {cronSummary.failed} fail
                  </Badge>
                )}
                {cronSummary.stale > 0 && (
                  <Badge className="text-[9px] bg-orange-500/10 text-orange-400 border-orange-500/30">
                    {cronSummary.stale} stale
                  </Badge>
                )}
              </div>
            )}
          </div>
          <ChevronDown className={`size-4 text-muted-foreground transition-transform ${cronExpanded ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {cronExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border/30">
                {cronJobs.length === 0 ? (
                  <p className="p-4 text-xs text-muted-foreground">No cron jobs recorded yet. They will appear after the first scheduled run.</p>
                ) : (
                  <div className="divide-y divide-border/20">
                    {cronJobs.map(job => (
                      <div
                        key={job.name}
                        className={`flex items-center gap-3 px-4 py-3 text-xs ${
                          job.isStale ? 'bg-amber-500/5 border-l-2 border-l-amber-500/50' : ''
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          job.status === 'completed' || job.status === 'idle' ? 'bg-emerald-400' :
                          job.status === 'warning' ? 'bg-amber-400' :
                          job.status === 'failed' ? 'bg-red-400' :
                          'bg-muted-foreground'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{job.name}</span>
                            <Badge variant="outline" className="text-[9px]">{job.interval}</Badge>
                            {job.isStale && <AlertTriangle className="size-3 text-amber-400" />}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-muted-foreground">
                            <span>Last: {job.lastRun ? timeAgo(job.lastRun) : 'never'}</span>
                            <span>Next: {job.nextRun ? timeAgo(job.nextRun) : '—'}</span>
                            <span>Runs: {job.runCount}</span>
                          </div>
                          {job.lastError && (
                            <p className="text-red-400/80 mt-1 truncate max-w-md">{truncate(job.lastError, 100)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Section 3: Post Management ─── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          Post Management
        </h2>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Status tabs */}
          <div className="flex gap-1 bg-muted/20 rounded-lg p-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'flagged', label: 'Flagged' },
              { key: 'hidden', label: 'Hidden' },
              { key: 'featured', label: 'Featured' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  statusFilter === tab.key
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="community">Community</SelectItem>
              <SelectItem value="news">News</SelectItem>
              <SelectItem value="digest">Digest</SelectItem>
              <SelectItem value="user_highlight">Highlights</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setSearchQuery(searchInput) } }}
              placeholder="Search posts..."
              className="pl-8 h-8 text-xs"
            />
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Latest</SelectItem>
              <SelectItem value="likes">Most Liked</SelectItem>
              <SelectItem value="comments">Most Comments</SelectItem>
              <SelectItem value="reposts">Most Reposts</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions */}
        {selectedPosts.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20"
          >
            <span className="text-xs font-medium text-primary">{selectedPosts.size} selected</span>
            <div className="flex gap-1.5 ml-auto">
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => moderate('hide', [...selectedPosts])}>
                <EyeOff className="size-3" /> Hide
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => moderate('feature', [...selectedPosts])}>
                <Star className="size-3" /> Feature
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => moderate('delete', [...selectedPosts])}>
                <Trash2 className="size-3" /> Delete
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setSelectedPosts(new Set())}>
                Clear
              </Button>
            </div>
          </motion.div>
        )}

        {/* Posts List */}
        {loadingPosts ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 text-muted-foreground animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Shield className="size-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No posts match your filters.</p>
          </div>
        ) : (
          <>
            {/* Select all header */}
            <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-muted-foreground font-medium">
              <input
                type="checkbox"
                checked={selectedPosts.size === posts.length && posts.length > 0}
                onChange={selectAll}
                className="rounded border-border"
              />
              <span className="flex-1">{postPagination.total} posts</span>
              <span>Page {postPagination.page}/{postPagination.pages}</span>
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {posts.map((post) => {
                  const typeBadge = getTypeBadge(post.type)
                  const statusBadge = getStatusBadge(parseTags(post.tags))
                  const tags = parseTags(post.tags)
                  const isSelected = selectedPosts.has(post.id)
                  const TypeIcon = typeBadge.icon

                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`rounded-lg border p-3 transition-all ${
                        isSelected
                          ? 'border-primary/40 bg-primary/5'
                          : post.featured
                          ? 'border-amber-500/20 bg-amber-500/5'
                          : 'border-border/40 bg-card/30 hover:bg-card/60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(post.id)}
                          className="mt-1 rounded border-border"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <Badge className={`text-[9px] border ${typeBadge.cls}`}>
                              <TypeIcon className="size-2.5 mr-0.5" />
                              {typeBadge.label}
                            </Badge>
                            {statusBadge && (
                              <Badge className={`text-[9px] border ${statusBadge.cls}`}>
                                {statusBadge.label}
                              </Badge>
                            )}
                            {post.featured && <Star className="size-3 text-amber-400 fill-amber-400" />}
                            {tags.includes('Evergreen') && (
                              <Badge className="text-[9px] bg-green-500/10 text-green-400 border-green-500/30 border">Evergreen</Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(post.createdAt)}</span>
                          </div>
                          <p className="text-sm font-medium leading-snug mb-1 line-clamp-2">{post.title}</p>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span>{post.authorName || post.author.split('@')[0]}</span>
                            <span className="flex items-center gap-0.5"><Heart className="size-2.5" /> {post.likes}</span>
                            <span className="flex items-center gap-0.5"><MessageCircle className="size-2.5" /> {post.comments}</span>
                            <span className="flex items-center gap-0.5"><Repeat2 className="size-2.5" /> {post.reposts}</span>
                            <span className="flex items-center gap-0.5"><Bookmark className="size-2.5" /> {post.saves}</span>
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          {tags.includes('Hidden') ? (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-xs" title="Unhide" onClick={() => moderate('unhide', [post.id])}>
                              <Eye className="size-3" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-xs" title="Hide" onClick={() => moderate('hide', [post.id])}>
                              <EyeOff className="size-3" />
                            </Button>
                          )}
                          {tags.includes('Flagged') ? (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-xs" title="Unflag" onClick={() => moderate('unflag', [post.id])}>
                              <Flag className="size-3" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-xs text-amber-400" title="Flag" onClick={() => moderate('flag', [post.id], { reason: 'Admin flagged' })}>
                              <Flag className="size-3" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className={`h-6 w-6 p-0 text-xs ${post.featured ? 'text-amber-400' : ''}`} title={post.featured ? 'Unfeature' : 'Feature'} onClick={() => moderate(post.featured ? 'unfeature' : 'feature', [post.id])}>
                            <Star className={`size-3 ${post.featured ? 'fill-amber-400' : ''}`} />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10" title="Delete" onClick={() => moderate('delete', [post.id])}>
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {postPagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                  disabled={postPagination.page <= 1}
                  onClick={() => fetchPosts(postPagination.page - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {postPagination.page} of {postPagination.pages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                  disabled={postPagination.page >= postPagination.pages}
                  onClick={() => fetchPosts(postPagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Section 4: Category & Author Breakdown ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Breakdown */}
        <div className="rounded-xl border border-border/50 bg-card/30 p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" />
            Category Breakdown (7d)
          </h3>
          {categoryBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground">No data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {categoryBreakdown.map(cat => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{cat.category}</span>
                    <span className="text-muted-foreground">{cat.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(cat.count / maxCatCount) * 100}%` }}
                      transition={{ duration: 0.5 }}
                      className={`h-full rounded-full ${
                        cat.category === 'AI' ? 'bg-blue-500' :
                        cat.category === 'Research' ? 'bg-purple-500' :
                        'bg-amber-500'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Authors */}
        <div className="rounded-xl border border-border/50 bg-card/30 p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            Top Authors (7d)
          </h3>
          {topAuthors.length === 0 ? (
            <p className="text-xs text-muted-foreground">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {topAuthors.map((a, i) => (
                <div key={a.author} className="flex items-center gap-2 text-xs">
                  <span className="w-4 text-right font-bold text-muted-foreground">#{i + 1}</span>
                  <span className="flex-1 truncate font-medium">{a.author}</span>
                  <Badge variant="outline" className="text-[9px]">{a.count} posts</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Section 5: Type Breakdown ─── */}
      {typeBreakdown.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/30 p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" />
            Post Type Distribution
          </h3>
          <div className="flex flex-wrap gap-2">
            {typeBreakdown.map(t => {
              const badge = getTypeBadge(t.type)
              return (
                <Badge key={t.type} className={`text-xs border px-3 py-1 ${badge.cls}`}>
                  {badge.label}: {t.count}
                </Badge>
              )
            })}
          </div>
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg border text-sm font-medium shadow-lg ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="size-4 inline mr-1.5" /> : <XCircle className="size-4 inline mr-1.5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Stat Card ─── */
function StatCard({
  icon, label, value, sub, accent,
}: {
  icon: React.ReactNode
  label: string
  value: number
  sub: string
  accent: string
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/30 p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  )
}
