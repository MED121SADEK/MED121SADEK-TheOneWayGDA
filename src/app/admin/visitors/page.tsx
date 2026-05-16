'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation, Locale, localeNames } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Globe, Shield, Users, Mail, Search, Check, X, Trash2, Download, StickyNote, LogOut, Clock, MapPin, Languages, Filter, Lock, Loader2, AlertCircle } from 'lucide-react'

// ── Constants ────────────────────────────────────────────────────────────────

const VISITOR_TYPE_ICONS: Record<string, string> = {
  researcher: '🔬',
  student: '🎓',
  professional: '💼',
  enterprise: '🏢',
  developer: '💻',
  educator: '📚',
  general: '🌐',
}

const VISITOR_TYPE_COLORS: Record<string, string> = {
  researcher: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  student: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  professional: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  enterprise: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  developer: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  educator: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  general: 'bg-muted text-muted-foreground border-border/30',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  accepted: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  accepted: <Check className="h-3 w-3" />,
  rejected: <X className="h-3 w-3" />,
}

// ── Types ───────────────────────────────────────────────────────────────────

interface Visitor {
  id: string
  email: string
  name: string | null
  visitorType: string
  status: string
  ipAddress: string | null
  userAgent: string | null
  path: string | null
  notes: string | null
  country: string | null
  language: string | null
  createdAt: string
  lastSeen: string | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface TypeStats {
  total: number
  pending: number
  accepted: number
  rejected: number
}

interface Stats {
  [key: string]: TypeStats
}

// ── Animation Variants ──────────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function exportCSV(visitors: Visitor[], filename = 'visitors-export.csv') {
  const headers = ['Name', 'Email', 'Type', 'Status', 'Country', 'Language', 'IP Address', 'Notes', 'Created At', 'Last Seen']
  const rows = visitors.map(v => [
    v.name || '',
    v.email,
    v.visitorType,
    v.status,
    v.country || '',
    v.language || '',
    v.ipAddress || '',
    v.notes || '',
    v.createdAt,
    v.lastSeen || '',
  ])
  const csv = [headers, ...rows].map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function AdminVisitorsPage() {
  const { t, locale, setLocale, dir } = useTranslation()

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Data state
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [stats, setStats] = useState<Stats>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [noteModal, setNoteModal] = useState<{ open: boolean; visitor: Visitor | null }>({ open: false, visitor: null })
  const [noteText, setNoteText] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)

  // ── Session Management ──────────────────────────────────────────────────

  useEffect(() => {
    const session = localStorage.getItem('oneway-admin-session')
    const pw = localStorage.getItem('oneway-admin-pw')
    if (session === 'authenticated' && pw) {
      setPassword(pw)
      setIsAuthenticated(true)
      // Restore cookie for middleware (may have expired)
      document.cookie = 'oneway-admin-token=' + encodeURIComponent(pw) + ';path=/;max-age=86400;SameSite=Strict'
    }
  }, [])

  const handleLogin = useCallback(async () => {
    if (!password.trim()) {
      setLoginError('Please enter the admin password.')
      return
    }
    setLoginLoading(true)
    setLoginError('')
    try {
      const res = await fetch('/api/visitors?limit=1', {
        headers: { Authorization: `Bearer ${password}` },
      })
      if (res.ok) {
        setIsAuthenticated(true)
        localStorage.setItem('oneway-admin-session', 'authenticated')
        localStorage.setItem('oneway-admin-pw', password)
        // Set cookie for middleware auth check
        document.cookie = 'oneway-admin-token=' + encodeURIComponent(password) + ';path=/;max-age=86400;SameSite=Strict'
      } else {
        setLoginError('Invalid password. Access denied.')
      }
    } catch {
      setLoginError('Network error. Please check your connection.')
    } finally {
      setLoginLoading(false)
    }
  }, [password])

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false)
    setPassword('')
    localStorage.removeItem('oneway-admin-session')
    localStorage.removeItem('oneway-admin-pw')
    // Clear cookie for middleware
    document.cookie = 'oneway-admin-token=;path=/;max-age=0'
  }, [])

  // ── Data Fetching ──────────────────────────────────────────────────────

  const fetchVisitors = useCallback(async () => {
    const pw = localStorage.getItem('oneway-admin-pw') || password
    if (!pw) return

    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', String(pagination.page))
      params.set('limit', String(pagination.limit))
      if (sortBy) params.set('sortBy', sortBy)
      if (sortOrder) params.set('sortOrder', sortOrder)
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter && typeFilter !== 'all') params.set('visitorType', typeFilter)
      if (searchQuery) params.set('search', searchQuery)

      const res = await fetch(`/api/visitors?${params.toString()}`, {
        headers: { Authorization: `Bearer ${pw}` },
      })
      if (!res.ok) {
        if (res.status === 401) {
          handleLogout()
          return
        }
        throw new Error('Failed to fetch visitors')
      }
      const data = await res.json()
      setVisitors(data.visitors || [])
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 })
      setStats(data.stats || {})
      setSelectedIds(new Set())
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message || 'Failed to load visitor data.')
    } finally {
      setLoading(false)
    }
  }, [password, pagination.page, pagination.limit, statusFilter, typeFilter, searchQuery, sortBy, sortOrder, handleLogout])

  useEffect(() => {
    if (isAuthenticated) {
      fetchVisitors()
    }
  }, [isAuthenticated, fetchVisitors])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
      setPagination(prev => ({ ...prev, page: 1 }))
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // ── Actions ────────────────────────────────────────────────────────────

  const getPw = () => { if (typeof window === 'undefined') return password; return localStorage.getItem('oneway-admin-pw') || password }
  const pw = password

  const updateVisitor = useCallback(async (id: string, data: Partial<Visitor>) => {
    try {
      const res = await fetch('/api/visitors', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pw}`,
        },
        body: JSON.stringify({ id, ...data }),
      })
      if (res.ok) {
        await fetchVisitors()
      }
    } catch {
      // silent fail — data will refresh on next load
    }
  }, [pw, fetchVisitors])

  const deleteVisitor = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/visitors?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${pw}` },
      })
      if (res.ok) {
        await fetchVisitors()
      }
    } catch {
      // silent fail
    }
  }, [pw, fetchVisitors])

  const bulkUpdate = useCallback(async (ids: string[], status: string) => {
    try {
      const res = await fetch('/api/visitors', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pw}`,
        },
        body: JSON.stringify({ bulkIds: ids, bulkStatus: status }),
      })
      if (res.ok) {
        await fetchVisitors()
      }
    } catch {
      // silent fail
    }
  }, [pw, fetchVisitors])

  const handleSaveNote = useCallback(async () => {
    if (!noteModal.visitor) return
    setNoteSaving(true)
    await updateVisitor(noteModal.visitor.id, { notes: noteText })
    setNoteSaving(false)
    setNoteModal({ open: false, visitor: null })
    setNoteText('')
  }, [noteModal.visitor, noteText, updateVisitor])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === visitors.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(visitors.map(v => v.id)))
    }
  }, [selectedIds.size, visitors])

  // ── Computed Values ────────────────────────────────────────────────────

  const allStats = Object.values(stats).reduce(
    (acc, s) => ({
      total: acc.total + s.total,
      pending: acc.pending + s.pending,
      accepted: acc.accepted + s.accepted,
      rejected: acc.rejected + s.rejected,
    }),
    { total: 0, pending: 0, accepted: 0, rejected: 0 },
  )

  const typeEntries = Object.entries(stats).sort(([, a], [, b]) => b.total - a.total)
  const totalTypeCount = typeEntries.reduce((acc, [, s]) => acc + s.total, 0)

  // ── LOGIN SCREEN ───────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div className="mesh-gradient min-h-screen flex items-center justify-center p-4" dir={dir}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-md"
        >
          <Card className="border-border/20 shadow-2xl bg-card/80 backdrop-blur-xl">
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-6">
                {/* Shield Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full scale-150" />
                  <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                    <Shield className="h-10 w-10 text-primary" />
                  </div>
                </motion.div>

                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <h1 className="text-2xl font-bold gradient-text-premium">Admin Dashboard</h1>
                  <p className="text-sm text-muted-foreground">
                    Enter your password to access the visitor management panel.
                  </p>
                </motion.div>

                {/* Password Input */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="w-full space-y-4"
                >
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Enter admin password..."
                      value={password}
                      onChange={e => { setPassword(e.target.value); setLoginError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                      className="pl-10 h-12 bg-muted/50 border-border/50 focus:border-primary/50"
                      autoFocus
                    />
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {loginError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                      >
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {loginError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Login Button */}
                  <Button
                    onClick={handleLogin}
                    disabled={loginLoading}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
                  >
                    {loginLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <Shield className="h-5 w-5 mr-2" />
                    )}
                    {loginLoading ? 'Authenticating...' : 'Access Dashboard'}
                  </Button>
                </motion.div>

                {/* Back Link */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Site
                  </Link>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ── ADMIN DASHBOARD ────────────────────────────────────────────────────

  return (
    <div className="mesh-gradient min-h-screen flex flex-col" dir={dir}>
      {/* ── Sticky Nav ──────────────────────────────────────────────────── */}
      <nav className="nav-premium sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Back + Logo + Title */}
            <div className="flex items-center gap-3">
              <Link href="/" className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary-foreground" />
                </div>
                <h1 className="text-lg font-bold gradient-text-premium whitespace-nowrap">
                  {t('brand.name')} Admin
                </h1>
              </div>
              <div className="sm:hidden">
                <h1 className="text-base font-bold gradient-text-premium">Admin</h1>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <div className="relative">
                <Select
                  value={locale}
                  onValueChange={(val) => setLocale(val as Locale)}
                >
                  <SelectTrigger className="w-auto h-9 gap-1.5 bg-muted/40 border-border/50 text-xs px-2">
                    <Globe className="h-3.5 w-3.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {localeNames.map(loc => (
                      <SelectItem key={loc} value={loc} className="text-xs">
                        {t(`lang.${loc}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Export CSV */}
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs bg-muted/40 border-border/50 hover:bg-muted/60"
                onClick={() => visitors.length > 0 && exportCSV(visitors)}
                disabled={visitors.length === 0}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>

              {/* Logout */}
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={handleLogout}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* ── Summary Cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: 'Total Visitors', value: allStats.total, icon: <Users className="h-5 w-5" />, color: 'text-foreground', bg: 'bg-muted/40', border: 'border-border/30' },
              { label: 'Pending', value: allStats.pending, icon: <Clock className="h-5 w-5" />, color: 'text-amber-500', bg: 'bg-amber-500/5', border: 'border-amber-500/20' },
              { label: 'Accepted', value: allStats.accepted, icon: <Check className="h-5 w-5" />, color: 'text-emerald-500', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20' },
              { label: 'Rejected', value: allStats.rejected, icon: <X className="h-5 w-5" />, color: 'text-red-500', bg: 'bg-red-500/5', border: 'border-red-500/20' },
            ].map((card, i) => (
              <motion.div key={card.label} variants={fadeInUp} transition={{ delay: i * 0.05 }}>
                <Card className={`${card.bg} border ${card.border}`}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                        <p className={`text-2xl sm:text-3xl font-bold stat-animate ${card.color}`}>
                          {loading ? '—' : card.value.toLocaleString()}
                        </p>
                      </div>
                      <div className={`p-2.5 rounded-xl ${card.bg} ${card.border} border`}>
                        <div className={card.color}>{card.icon}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* ── Visitor Type Distribution Bar ──────────────────────────── */}
          {typeEntries.length > 0 && (
            <motion.div variants={fadeInUp}>
              <Card className="bg-card/60 border-border/20">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Visitor Type Distribution</h3>
                  </div>
                  {/* Bar */}
                  <div className="flex h-3 rounded-full overflow-hidden bg-muted/50 mb-3">
                    {typeEntries.map(([type, s]) => {
                      if (s.total === 0) return null
                      const pct = totalTypeCount > 0 ? (s.total / totalTypeCount) * 100 : 0
                      const typeColorMap: Record<string, string> = {
                        researcher: 'bg-purple-500',
                        student: 'bg-blue-500',
                        professional: 'bg-emerald-500',
                        enterprise: 'bg-amber-500',
                        developer: 'bg-cyan-500',
                        educator: 'bg-pink-500',
                        general: 'bg-muted-foreground',
                      }
                      return (
                        <motion.div
                          key={type}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                          className={`${typeColorMap[type] || 'bg-muted-foreground'} transition-all`}
                          title={`${type}: ${s.total}`}
                        />
                      )
                    })}
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-2">
                    {typeEntries.map(([type, s]) => (
                      <div
                        key={type}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-default hover:opacity-80 transition-opacity"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <span>{VISITOR_TYPE_ICONS[type] || '🌐'}</span>
                        <span className="capitalize">{type}</span>
                        <span className="text-muted-foreground">({s.total})</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Filters Bar ────────────────────────────────────────────── */}
          <motion.div variants={fadeInUp}>
            <Card className="bg-card/60 border-border/20">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or country..."
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                      className="pl-9 h-10 bg-muted/40 border-border/50 text-sm"
                    />
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {/* Status */}
                    <Select value={statusFilter} onValueChange={val => { setStatusFilter(val); setPagination(p => ({ ...p, page: 1 })) }}>
                      <SelectTrigger className="w-[130px] h-10 bg-muted/40 border-border/50 text-sm">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Type */}
                    <Select value={typeFilter} onValueChange={val => { setTypeFilter(val); setPagination(p => ({ ...p, page: 1 })) }}>
                      <SelectTrigger className="w-[140px] h-10 bg-muted/40 border-border/50 text-sm">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {Object.keys(VISITOR_TYPE_ICONS).map(type => (
                          <SelectItem key={type} value={type}>
                            <span className="flex items-center gap-1.5">
                              {VISITOR_TYPE_ICONS[type]} <span className="capitalize">{type}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Sort */}
                    <Select value={`${sortBy}-${sortOrder}`} onValueChange={val => {
                      const [by, order] = val.split('-') as [string, string]
                      setSortBy(by)
                      setSortOrder(order)
                    }}>
                      <SelectTrigger className="w-[150px] h-10 bg-muted/40 border-border/50 text-sm">
                        <SelectValue placeholder="Sort" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdAt-desc">Newest First</SelectItem>
                        <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                        <SelectItem value="name-asc">Name A-Z</SelectItem>
                        <SelectItem value="name-desc">Name Z-A</SelectItem>
                        <SelectItem value="email-asc">Email A-Z</SelectItem>
                        <SelectItem value="email-desc">Email Z-A</SelectItem>
                        <SelectItem value="status-asc">Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Bulk Actions Bar ───────────────────────────────────────── */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-primary">
                          {selectedIds.size} selected
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs underline text-primary/70 hover:text-primary"
                          onClick={toggleSelectAll}
                        >
                          {selectedIds.size === visitors.length ? 'Deselect All' : 'Select All'}
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20"
                          onClick={() => { bulkUpdate(Array.from(selectedIds), 'accepted') }}
                        >
                          <Check className="h-3.5 w-3.5" /> Bulk Accept
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 text-xs bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                          onClick={() => { bulkUpdate(Array.from(selectedIds), 'rejected') }}
                        >
                          <X className="h-3.5 w-3.5" /> Bulk Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Error State ────────────────────────────────────────────── */}
          {error && !loading && (
            <motion.div variants={fadeInUp}>
              <Card className="bg-red-500/5 border-red-500/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                  <p className="text-sm text-red-500">{error}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-8 text-xs text-red-500 hover:bg-red-500/10"
                    onClick={fetchVisitors}
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Loading Skeleton ───────────────────────────────────────── */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          )}

          {/* ── Visitors List ──────────────────────────────────────────── */}
          {!loading && !error && visitors.length === 0 && (
            <motion.div variants={scaleIn} className="text-center py-16">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-1">No visitors found</h3>
              <p className="text-sm text-muted-foreground/60">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters to see more results.'
                  : 'Visitor registrations will appear here.'}
              </p>
            </motion.div>
          )}

          {!loading && !error && visitors.length > 0 && (
            <motion.div variants={fadeInUp} className="space-y-2">
              {/* Header Row (desktop) */}
              <div className="hidden lg:grid lg:grid-cols-[auto,1fr,120px,100px,100px,80px,80px,120px,auto] gap-3 items-center px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="w-5">
                  <Checkbox
                    checked={selectedIds.size === visitors.length && visitors.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </div>
                <div>Visitor</div>
                <div>Type</div>
                <div>Status</div>
                <div>Country</div>
                <div>Lang</div>
                <div>Registered</div>
                <div>Notes</div>
                <div className="text-right">Actions</div>
              </div>

              {/* Visitor Rows */}
              <AnimatePresence mode="popLayout">
                {visitors.map((visitor, idx) => (
                  <motion.div
                    key={visitor.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2, delay: idx * 0.02 }}
                    layout
                  >
                    <Card
                      className={`group transition-all duration-200 border ${
                        expandedId === visitor.id
                          ? 'border-primary/30 shadow-lg shadow-primary/5 bg-primary/[0.02]'
                          : selectedIds.has(visitor.id)
                            ? 'border-primary/20 bg-primary/[0.01]'
                            : 'border-border/15 bg-card/60 hover:border-border/30 hover:bg-card/80'
                      }`}
                    >
                      {/* Main Row */}
                      <div
                        className="grid grid-cols-1 lg:grid-cols-[auto,1fr,120px,100px,100px,80px,80px,120px,auto] gap-2 lg:gap-3 items-center p-4 cursor-pointer"
                        onClick={() => setExpandedId(expandedId === visitor.id ? null : visitor.id)}
                      >
                        {/* Checkbox */}
                        <div className="hidden lg:block w-5" onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(visitor.id)}
                            onCheckedChange={() => toggleSelect(visitor.id)}
                          />
                        </div>

                        {/* Name / Email */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Mobile checkbox */}
                          <div className="lg:hidden" onClick={e => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(visitor.id)}
                              onCheckedChange={() => toggleSelect(visitor.id)}
                            />
                          </div>
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary/70">
                              {(visitor.name || visitor.email)?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {visitor.name || 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <Mail className="h-3 w-3 shrink-0" />
                              {visitor.email}
                            </p>
                          </div>
                        </div>

                        {/* Type Badge */}
                        <div className="hidden lg:flex">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              VISITOR_TYPE_COLORS[visitor.visitorType] || VISITOR_TYPE_COLORS.general
                            }`}
                          >
                            <span className="text-sm">{VISITOR_TYPE_ICONS[visitor.visitorType] || '🌐'}</span>
                            <span className="capitalize">{visitor.visitorType}</span>
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="hidden lg:flex">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              STATUS_COLORS[visitor.status] || STATUS_COLORS.pending
                            }`}
                          >
                            {STATUS_ICONS[visitor.status]}
                            <span className="capitalize">{visitor.status}</span>
                          </span>
                        </div>

                        {/* Country */}
                        <div className="hidden lg:block text-xs text-muted-foreground truncate">
                          {visitor.country || '—'}
                        </div>

                        {/* Language */}
                        <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground">
                          <Languages className="h-3 w-3" />
                          {visitor.language || '—'}
                        </div>

                        {/* Date */}
                        <div className="hidden lg:block text-xs text-muted-foreground">
                          {new Date(visitor.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>

                        {/* Notes indicator */}
                        <div className="hidden lg:block">
                          {visitor.notes ? (
                            <span className="inline-flex items-center gap-1 text-xs text-primary/70">
                              <StickyNote className="h-3.5 w-3.5" />
                              Note
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={e => e.stopPropagation()}
                        >
                          {/* Mobile type + status */}
                          <div className="lg:hidden flex items-center gap-1.5 mr-auto">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${VISITOR_TYPE_COLORS[visitor.visitorType] || VISITOR_TYPE_COLORS.general}`}>
                              {VISITOR_TYPE_ICONS[visitor.visitorType]} {visitor.visitorType}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[visitor.status] || STATUS_COLORS.pending}`}>
                              <span className="capitalize">{visitor.status}</span>
                            </span>
                          </div>

                          {visitor.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                onClick={() => updateVisitor(visitor.id, { status: 'accepted' })}
                                title="Accept"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                onClick={() => updateVisitor(visitor.id, { status: 'rejected' })}
                                title="Reject"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {visitor.status === 'accepted' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                              onClick={() => updateVisitor(visitor.id, { status: 'pending' })}
                              title="Revert to Pending"
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                          )}
                          {visitor.status === 'rejected' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                              onClick={() => updateVisitor(visitor.id, { status: 'pending' })}
                              title="Revert to Pending"
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => {
                              setNoteModal({ open: true, visitor })
                              setNoteText(visitor.notes || '')
                            }}
                            title="Add Note"
                          >
                            <StickyNote className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                            onClick={() => deleteVisitor(visitor.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {expandedId === visitor.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-0">
                              <div className="border-t border-border/10 pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <DetailItem
                                  icon={<Clock className="h-3.5 w-3.5" />}
                                  label="Registered"
                                  value={formatDate(visitor.createdAt)}
                                />
                                <DetailItem
                                  icon={<Clock className="h-3.5 w-3.5" />}
                                  label="Last Seen"
                                  value={formatDate(visitor.lastSeen)}
                                />
                                <DetailItem
                                  icon={<MapPin className="h-3.5 w-3.5" />}
                                  label="IP Address"
                                  value={visitor.ipAddress || '—'}
                                />
                                <DetailItem
                                  icon={<MapPin className="h-3.5 w-3.5" />}
                                  label="Country"
                                  value={visitor.country || '—'}
                                />
                                <DetailItem
                                  icon={<Languages className="h-3.5 w-3.5" />}
                                  label="Language"
                                  value={visitor.language || '—'}
                                />
                                <DetailItem
                                  icon={<Globe className="h-3.5 w-3.5" />}
                                  label="Referrer / Path"
                                  value={visitor.path || '—'}
                                />
                                <DetailItem
                                  icon={<Mail className="h-3.5 w-3.5" />}
                                  label="Email"
                                  value={visitor.email}
                                  full={true}
                                />
                                {visitor.userAgent && (
                                  <DetailItem
                                    icon={<Users className="h-3.5 w-3.5" />}
                                    label="User Agent"
                                    value={visitor.userAgent}
                                    full={true}
                                  />
                                )}
                                {visitor.notes && (
                                  <DetailItem
                                    icon={<StickyNote className="h-3.5 w-3.5" />}
                                    label="Notes"
                                    value={visitor.notes}
                                    full={true}
                                  />
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* ── Pagination ──────────────────────────────────────────────── */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs bg-muted/30 border-border/50"
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                    >
                      Previous
                    </Button>
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum: number
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i
                      } else {
                        pageNum = pagination.page - 2 + i
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={pagination.page === pageNum ? 'default' : 'outline'}
                          size="sm"
                          className={`h-8 w-8 p-0 text-xs ${pagination.page === pageNum ? 'bg-primary text-primary-foreground' : 'bg-muted/30 border-border/50'}`}
                          onClick={() => setPagination(p => ({ ...p, page: pageNum }))}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                    {pagination.totalPages > 5 && pagination.page < pagination.totalPages - 2 && (
                      <span className="text-xs text-muted-foreground px-1">...</span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs bg-muted/30 border-border/50"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* ── Note Modal ─────────────────────────────────────────────────── */}
      <Dialog
        open={noteModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setNoteModal({ open: false, visitor: null })
            setNoteText('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-card border-border/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-primary" />
              Add Note
            </DialogTitle>
            <DialogDescription>
              {noteModal.visitor && (
                <>
                  For <span className="font-medium text-foreground">{noteModal.visitor.name || noteModal.visitor.email}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Write a note about this visitor..."
            className="min-h-[120px] bg-muted/40 border-border/50 text-sm"
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-muted/40 border-border/50"
              onClick={() => {
                setNoteModal({ open: false, visitor: null })
                setNoteText('')
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleSaveNote}
              disabled={noteSaving}
            >
              {noteSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Check className="h-4 w-4 mr-1.5" />
              )}
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Detail Item Component ───────────────────────────────────────────────────

function DetailItem({
  icon,
  label,
  value,
  full = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  full?: boolean
}) {
  return (
    <div className={`bg-muted/30 rounded-lg p-3 border border-border/10 ${full ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-medium break-all">{value || '—'}</p>
    </div>
  )
}
