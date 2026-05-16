'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation, localeNames, type Locale } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft, Globe, BarChart3, FolderOpen, Workflow, Zap,
  Clock, TrendingUp, Activity, Settings, LogOut, Plus,
  FileText, Bot, Brain, Sparkles, ChevronRight, Loader2,
  Database, Shield, Star, Target, Trophy, Users, Building2,
  Medal, MessageSquare, Crown, Hash,
} from 'lucide-react'

/* ─── Types ─── */
interface UserData {
  id: string
  email: string
  name: string | null
  role: string
  bio: string | null
  company: string | null
  location: string | null
  website: string | null
  skills: string | null
  isOnboarded: boolean
  createdAt: string
  lastSeen: string
  _count?: { activities: number }
}

interface ActivityItem {
  id: string
  type: string
  details: string | null
  createdAt: string
}

interface UserStats {
  totalActivities: number
  loginCount: number
  analysisCount: number
  projectCount: number
  workflowCount: number
  automationCount: number
  reportCount: number
  weeklyActivity: { date: string; count: number }[]
}

interface LeaderboardEntry {
  id: string
  name: string
  provider: string
  normalizedScore: number
  score: number
  maxScore: number
  modelType: string
}

interface CommunityPost {
  id: string
  title: string
  content: string | null
  author: string
  authorName: string | null
  type: string
  likes: number
  comments: number
  createdAt: string
  tags: string | null
}

interface PlatformStats {
  totalModels: number
  totalPosts: number
  activeTeams: number
}

/* ─── Helpers ─── */
function getSession(): { token: string; user: UserData } | null {
  if (typeof window === 'undefined') return null
  try {
    const token = localStorage.getItem('oneway-auth-token')
    const userStr = localStorage.getItem('oneway-user')
    if (!token || !userStr) return null
    return { token, user: JSON.parse(userStr) }
  } catch {
    return null
  }
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'login': return { icon: LogOut, color: 'text-emerald-400 bg-emerald-500/10', label: 'Login' }
    case 'project_created': return { icon: FolderOpen, color: 'text-blue-400 bg-blue-500/10', label: 'Project Created' }
    case 'analysis_run': return { icon: BarChart3, color: 'text-purple-400 bg-purple-500/10', label: 'Analysis Run' }
    case 'report_generated': return { icon: FileText, color: 'text-sky-400 bg-sky-500/10', label: 'Report Generated' }
    case 'workflow_executed': return { icon: Workflow, color: 'text-orange-400 bg-orange-500/10', label: 'Workflow Executed' }
    case 'automation_triggered': return { icon: Zap, color: 'text-amber-400 bg-amber-500/10', label: 'Automation' }
    case 'profile_updated': return { icon: Settings, color: 'text-pink-400 bg-pink-500/10', label: 'Profile Updated' }
    default: return { icon: Activity, color: 'text-muted-foreground bg-muted/30', label: type }
  }
}

function getRankStyle(rank: number) {
  switch (rank) {
    case 1: return { icon: Crown, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' }
    case 2: return { icon: Medal, color: 'text-slate-300', bg: 'bg-slate-400/10', border: 'border-slate-400/20' }
    case 3: return { icon: Medal, color: 'text-amber-600', bg: 'bg-amber-700/10', border: 'border-amber-700/20' }
    default: return { icon: Hash, color: 'text-muted-foreground', bg: 'bg-muted/30', border: 'border-border/30' }
  }
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
}

/* ─── MAIN PAGE ─── */
export default function DashboardPage() {
  const router = useRouter()
  const { t, locale, setLocale, dir } = useTranslation()
  const [user, setUser] = useState<UserData | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  /* ─── Platform data ─── */
  const [platformStats, setPlatformStats] = useState<PlatformStats>({ totalModels: 0, totalPosts: 0, activeTeams: 0 })
  const [topModels, setTopModels] = useState<LeaderboardEntry[]>([])
  const [recentPosts, setRecentPosts] = useState<CommunityPost[]>([])
  const [platformLoading, setPlatformLoading] = useState(true)

  /* ─── Auth check + data ─── */
  useEffect(() => {
    const session = getSession()
    if (!session) return
    setUser(session.user)
    fetchStats(session.token)
    fetchActivities(session.token)
    fetchPlatformData()
  }, [])

  const fetchStats = useCallback(async (token: string) => {
    try {
      const res = await fetch(`/api/auth/stats?token=${token}`)
      if (!res.ok) return
      const data = await res.json()
      setStats(data.stats)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  const fetchActivities = useCallback(async (token: string) => {
    try {
      const res = await fetch(`/api/auth/activity?token=${token}&limit=10`)
      if (!res.ok) return
      const data = await res.json()
      setActivities(data.activities || [])
    } catch { /* silent */ }
  }, [])

  const fetchPlatformData = useCallback(async () => {
    try {
      const [lbRes, postsRes] = await Promise.all([
        fetch('/api/leaderboard?benchmark=GPQA&limit=5&sort=score&order=desc'),
        fetch('/api/community/posts?limit=5&sort=latest'),
      ])

      const [lbData, postsData] = await Promise.all([lbRes.json(), postsRes.json()])

      if (lbData?.leaderboard) {
        const top5 = lbData.leaderboard.slice(0, 5)
        setTopModels(top5)
        setPlatformStats(prev => ({
          ...prev,
          totalModels: lbData.meta?.totalModels || lbData.leaderboard.length,
        }))
      }

      if (postsData?.posts) {
        setRecentPosts(postsData.posts.slice(0, 5))
        setPlatformStats(prev => ({
          ...prev,
          totalPosts: postsData.pagination?.total || postsData.posts.length,
        }))
      }
    } catch { /* silent */ } finally {
      setPlatformLoading(false)
    }
  }, [])

  /* ─── Logout ─── */
  const handleLogout = async () => {
    const session = getSession()
    if (session) {
      await fetch(`/api/auth/logout?token=${session.token}`, { method: 'POST' }).catch(() => {})
    }
    localStorage.removeItem('oneway-auth-token')
    localStorage.removeItem('oneway-user')
    router.push('/')
  }

  /* ─── Weekly chart data ─── */
  const weeklyData = useMemo(() => {
    if (!stats?.weeklyActivity) return []
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const map = new Map<string, number>()
    stats.weeklyActivity.forEach((w: { date: string; count: number }) => {
      const d = new Date(w.date)
      const key = days[d.getDay()]
      map.set(key, (map.get(key) || 0) + w.count)
    })
    return days.map((day) => ({ day, count: map.get(day) || 0 }))
  }, [stats])

  const maxWeekly = Math.max(...weeklyData.map((d: { count: number }) => d.count), 1)

  /* ─── Initials avatar ─── */
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n.charAt(0).toUpperCase()).join('').slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || 'U'

  const roleColor = user?.role === 'admin'
    ? 'bg-rose-500/15 text-rose-400 border-rose-500/25'
    : user?.role === 'pro'
    ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
    : 'bg-primary/15 text-primary border-primary/25'

  if (!user) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6" dir={dir}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Welcome Section ── */}
            <motion.div {...fadeUp} className="hero-gradient rounded-2xl p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/5 pointer-events-none" />
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="size-16 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-bold">
                      Welcome back, {String(user.name || user.email.split('@')[0])}
                    </h1>
                    <Badge variant="outline" className={`text-xs px-2 py-0 border ${roleColor}`}>
                      {String(user.role).charAt(0).toUpperCase() + String(user.role).slice(1)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {user.email} · Last seen {timeAgo(String(user.lastSeen))}
                  </p>
                  {user.company && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Target className="size-3" /> {String(user.company)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" className="gap-1.5" onClick={() => router.push('/workflow/new')}>
                    <Plus className="size-3.5" />New Workflow
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => router.push('/leaderboard')}>
                    <Star className="size-3.5" />Leaderboard
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* ── Platform Stats Cards ── */}
            <motion.div className="grid grid-cols-2 sm:grid-cols-3 gap-3" {...stagger}>
              <AnimatePresence>
                {[
                  { icon: Trophy, label: 'AI Models Tracked', value: platformStats.totalModels, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                  { icon: MessageSquare, label: 'Community Posts', value: platformStats.totalPosts, color: 'text-teal-400', bg: 'bg-teal-500/10' },
                  { icon: Users, label: 'Active Teams', value: platformStats.activeTeams, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                ].map((stat, i) => (
                  <motion.div key={stat.label} {...fadeUp} transition={{ ...fadeUp.animate.transition, delay: i * 0.05 }}>
                    <Card className="card-premium p-4 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                          {platformLoading ? (
                            <Loader2 className={`size-5 ${stat.color} animate-spin`} />
                          ) : (
                            <stat.icon className={`size-5 ${stat.color}`} />
                          )}
                        </div>
                        <div>
                          <p className="text-xl font-bold">{platformLoading ? '—' : String(stat.value)}</p>
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* ── Personal Stats Cards ── */}
            <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3" {...stagger}>
              <AnimatePresence>
                {[
                  { icon: FolderOpen, label: 'Projects', value: stats?.projectCount || 0, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { icon: BarChart3, label: 'Analyses', value: stats?.analysisCount || 0, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                  { icon: Workflow, label: 'Workflows', value: stats?.workflowCount || 0, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                  { icon: Zap, label: 'Automations', value: stats?.automationCount || 0, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                ].map((stat, i) => (
                  <motion.div key={stat.label} {...fadeUp} transition={{ ...fadeUp.animate.transition, delay: i * 0.05 }}>
                    <Card className="card-premium p-4 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                          <stat.icon className={`size-5 ${stat.color}`} />
                        </div>
                        <div>
                          <p className="text-xl font-bold">{String(stat.value)}</p>
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* ── Platform Content: Leaderboard Top 5 + Community Posts ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top 5 Leaderboard */}
              <motion.div {...fadeUp} transition={{ ...fadeUp.animate.transition, delay: 0.1 }}>
                <Card className="card-premium h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Trophy className="size-4 text-amber-400" />
                        Top 5 Models (GPQA)
                      </CardTitle>
                      <Link href="/leaderboard">
                        <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-muted-foreground hover:text-primary">
                          View Full <ChevronRight className="size-3" />
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {platformLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="size-5 text-primary animate-spin" />
                      </div>
                    ) : topModels.length === 0 ? (
                      <div className="text-center py-8">
                        <Database className="size-6 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">No leaderboard data yet</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {topModels.map((model, index) => {
                          const rank = index + 1
                          const rankStyle = getRankStyle(rank)
                          const RankIcon = rankStyle.icon
                          return (
                            <div
                              key={model.id}
                              className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-muted/30 transition-colors group"
                            >
                              <div className={`size-7 rounded-lg ${rankStyle.bg} ${rankStyle.border} border flex items-center justify-center flex-shrink-0`}>
                                <RankIcon className={`size-3.5 ${rankStyle.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                  {model.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground">{model.provider} · {model.modelType}</p>
                              </div>
                              <Badge variant="outline" className="text-xs font-mono px-2 py-0 flex-shrink-0 border-primary/20 text-primary">
                                {model.normalizedScore.toFixed(1)}%
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recent Community Posts */}
              <motion.div {...fadeUp} transition={{ ...fadeUp.animate.transition, delay: 0.15 }}>
                <Card className="card-premium h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MessageSquare className="size-4 text-teal-400" />
                        Recent Community
                      </CardTitle>
                      <Link href="/community">
                        <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-muted-foreground hover:text-primary">
                          Visit <ChevronRight className="size-3" />
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {platformLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="size-5 text-primary animate-spin" />
                      </div>
                    ) : recentPosts.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="size-6 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">No community posts yet</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {recentPosts.map((post) => (
                          <Link
                            key={post.id}
                            href={`/community`}
                            className="flex items-start gap-3 py-2 px-2.5 rounded-lg hover:bg-muted/30 transition-colors group"
                          >
                            <div className="size-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <MessageSquare className="size-3.5 text-teal-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                {post.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-muted-foreground">
                                  {post.authorName || post.author?.split('@')[0] || 'Anonymous'}
                                </span>
                                <span className="text-[10px] text-muted-foreground/50">·</span>
                                <span className="text-[10px] text-muted-foreground">{timeAgo(post.createdAt)}</span>
                                {(post.likes || post.comments) && (
                                  <>
                                    <span className="text-[10px] text-muted-foreground/50">·</span>
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                      {post.likes > 0 && <>{post.likes}♥</>}
                                      {post.likes > 0 && post.comments > 0 && ' '}
                                      {post.comments > 0 && <>{post.comments}💬</>}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* ── Tabs ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                <TabsTrigger value="overview" className="gap-1.5 text-xs">
                  <Activity className="size-3.5" />Overview
                </TabsTrigger>
                <TabsTrigger value="activity" className="gap-1.5 text-xs">
                  <Clock className="size-3.5" />Activity
                </TabsTrigger>
                <TabsTrigger value="quick" className="gap-1.5 text-xs">
                  <Sparkles className="size-3.5" />Quick Actions
                </TabsTrigger>
              </TabsList>

              {/* ── Overview Tab ── */}
              <TabsContent value="overview" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Weekly Activity Chart */}
                  <motion.div {...fadeUp}>
                    <Card className="card-premium">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingUp className="size-4 text-primary" />
                          Weekly Activity
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-end gap-2 h-32">
                          {weeklyData.map((d: { day: string; count: number }) => (
                            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                              <div
                                className="w-full rounded-t-md bg-primary/80 hover:bg-primary transition-colors min-h-[4px]"
                                style={{ height: `${Math.max((d.count / maxWeekly) * 100, 4)}%` }}
                              />
                              <span className="text-[10px] text-muted-foreground">{d.day}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Total: {stats?.totalActivities || 0} actions</span>
                          <span>{stats?.loginCount || 0} logins</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Skills & Info */}
                  <motion.div {...fadeUp} transition={{ ...fadeUp.animate.transition, delay: 0.1 }}>
                    <Card className="card-premium h-full">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Brain className="size-4 text-primary" />
                          Profile & Skills
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {user.bio && (
                          <p className="text-sm text-muted-foreground leading-relaxed">{String(user.bio)}</p>
                        )}
                        {user.location && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Globe className="size-3" /> {String(user.location)}
                          </div>
                        )}
                        {user.skills && (
                          <div className="flex flex-wrap gap-1.5">
                            {JSON.parse(String(user.skills)).map((skill: string) => (
                              <Badge key={skill} variant="secondary" className="text-[10px]">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {!user.skills && (
                          <div className="text-center py-6">
                            <Sparkles className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">
                              No skills added yet. Go to Settings to add your expertise.
                            </p>
                            <Button variant="link" size="sm" className="text-xs mt-1" onClick={() => router.push('/settings')}>
                              Add Skills <ChevronRight className="size-3" />
                            </Button>
                          </div>
                        )}
                        <Separator />
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-muted/30 border border-border/30 p-2 text-center">
                            <p className="text-muted-foreground">Member since</p>
                            <p className="font-medium">{new Date(String(user.createdAt)).toLocaleDateString()}</p>
                          </div>
                          <div className="rounded-lg bg-muted/30 border border-border/30 p-2 text-center">
                            <p className="text-muted-foreground">Reports</p>
                            <p className="font-medium">{stats?.reportCount || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </TabsContent>

              {/* ── Activity Tab ── */}
              <TabsContent value="activity" className="mt-4">
                <motion.div {...fadeUp}>
                  <Card className="card-premium">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="size-4 text-primary" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {activities.length === 0 ? (
                        <div className="text-center py-10">
                          <Activity className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No activity yet. Start exploring!</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {activities.map((activity: ActivityItem) => {
                            const { icon: ActIcon, color, label } = getActivityIcon(activity.type)
                            return (
                              <div key={activity.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                                <div className={`size-8 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                                  <ActIcon className="size-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{label}</p>
                                  {activity.details && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {String(activity.details).slice(0, 80)}
                                    </p>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  {timeAgo(String(activity.createdAt))}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* ── Quick Actions Tab ── */}
              <TabsContent value="quick" className="mt-4">
                <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-4" {...stagger}>
                  {[
                    { icon: FolderOpen, title: 'New Project', desc: 'Create a new data analysis project', href: '/workspace', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                    { icon: Workflow, title: 'Start Workflow', desc: 'Launch an AI-guided analysis pipeline', href: '/workflow/new', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
                    { icon: Bot, title: 'AI Copilot', desc: 'Get AI-powered suggestions and insights', href: '/ai', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
                    { icon: Trophy, title: 'Leaderboard', desc: 'Compare AI models and benchmarks', href: '/leaderboard', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                    { icon: Building2, title: 'Teams', desc: 'Collaborate with your team on analyses', href: '/teams', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
                    { icon: Shield, title: 'Community', desc: 'Browse shared workflows and templates', href: '/community', color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
                    { icon: Settings, title: 'Settings', desc: 'Manage your profile and preferences', href: '/settings', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
                  ].map((action, i) => (
                    <motion.div key={action.title} {...fadeUp} transition={{ ...fadeUp.animate.transition, delay: i * 0.04 }}>
                      <Link href={action.href}>
                        <Card className="card-premium hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer group h-full">
                          <CardContent className="p-5 flex items-center gap-4">
                            <div className={`size-12 rounded-xl ${action.color} border flex items-center justify-center flex-shrink-0`}>
                              <action.icon className="size-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{action.title}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
                            </div>
                            <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </TabsContent>
            </Tabs>
          </>
        )}
    </div>
  )
}
