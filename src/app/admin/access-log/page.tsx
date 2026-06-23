'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft, Search, FileText, Globe, Users, Clock, MapPin,
  Eye, Trash2, Download, Loader2, LogOut, BarChart3, Activity,
  Monitor, ExternalLink, Filter,
} from 'lucide-react'

/* ─── Types ─── */
interface LogEntry {
  id: string
  email: string | null
  name: string | null
  path: string
  method: string
  userAgent: string | null
  ipAddress: string | null
  country: string | null
  city: string | null
  language: string | null
  referrer: string | null
  duration: number | null
  createdAt: string
}

interface TopItem {
  path?: string
  country?: string
  count: number
}

interface Summary {
  totalLogs: number
  uniqueVisitors: number
  topPaths: TopItem[]
  topCountries: TopItem[]
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

/* ─── Helpers ─── */
const COUNTRY_FLAGS: Record<string, string> = {
  US: '\u{1F1FA}\u{1F1F8}', GB: '\u{1F1EC}\u{1F1E7}', FR: '\u{1F1EB}\u{1F1F7}',
  DE: '\u{1F1E9}\u{1F1EA}', JP: '\u{1F1EF}\u{1F1F5}', CN: '\u{1F1E8}\u{1F1F3}',
  KR: '\u{1F1F0}\u{1F1F7}', IN: '\u{1F1EE}\u{1F1F3}', BR: '\u{1F1E7}\u{1F1F7}',
  ES: '\u{1F1EA}\u{1F1F8}', SA: '\u{1F1F8}\u{1F1E6}', AE: '\u{1F1E6}\u{1F1EA}',
  CA: '\u{1F1E8}\u{1F1E6}', AU: '\u{1F1E6}\u{1F1FA}', MA: '\u{1F1F2}\u{1F1E6}',
  TR: '\u{1F1F9}\u{1F1F7}', RU: '\u{1F1F7}\u{1F1FA}', MX: '\u{1F1F2}\u{1F1FD}',
  EG: '\u{1F1EA}\u{1F1EC}', DZ: '\u{1F1E9}\u{1F1FF}', TN: '\u{1F1F9}\u{1F1F3}',
  IT: '\u{1F1EE}\u{1F1F9}', NL: '\u{1F1F3}\u{1F1F1}', SE: '\u{1F1F8}\u{1F1EA}',
  PL: '\u{1F1F5}\u{1F1F1}', SG: '\u{1F1F8}\u{1F1EC}', ID: '\u{1F1EE}\u{1F1E9}',
}

function getFlag(code: string | null): string {
  if (!code) return '\u{1F30D}'
  return COUNTRY_FLAGS[code.toUpperCase()] || '\u{1F30D}'
}

function formatTimeAgo(date: string): string {
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '-'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

function parseUserAgent(ua: string | null): { browser: string; os: string } {
  if (!ua) return { browser: '-', os: '-' }
  let browser = 'Unknown'
  let os = 'Unknown'

  if (ua.includes('Edg/')) browser = 'Edge'
  else if (ua.includes('Chrome/')) browser = 'Chrome'
  else if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari'

  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac OS')) os = 'macOS'
  else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

  return { browser, os }
}

/* ─── MAIN PAGE ─── */
export default function AccessLogPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Data
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 })
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isLogsLoading, setIsLogsLoading] = useState(true)

  // Filters
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [pathFilter, setPathFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const getHeaders = useCallback(() => ({
    'x-admin-token': localStorage.getItem('oneway-admin-token') || password,
  }), [password])

  // ── Auth ──
  useEffect(() => {
    const saved = localStorage.getItem('oneway-admin-token')
    if (saved) {
      setPassword(saved)
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          localStorage.setItem('oneway-admin-token', passwordInput)
          setPassword(passwordInput)
          setIsAuthenticated(true)
        }
      }
    } catch { /* silent */ }
    setIsLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('oneway-admin-token')
    setPassword('')
    setIsAuthenticated(false)
  }

  // ── Fetch logs ──
  const fetchLogs = useCallback(async (page = 1) => {
    setIsLogsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
      })
      if (searchQuery) params.set('search', searchQuery)
      if (countryFilter) params.set('country', countryFilter)
      if (pathFilter) params.set('path', pathFilter)

      const res = await fetch(`/api/admin/access-log?${params}`, { headers: getHeaders() })
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setPagination(data.pagination || { page: 1, limit: 50, total: 0, pages: 0 })
        setSummary(data.summary || null)
      }
    } catch { /* silent */ }
    setIsLogsLoading(false)
  }, [searchQuery, countryFilter, pathFilter, getHeaders])

  useEffect(() => {
    if (isAuthenticated) fetchLogs()
  }, [isAuthenticated, fetchLogs])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // ── Purge old logs ──
  const purgeOldLogs = async (days: number) => {
    const before = new Date()
    before.setDate(before.getDate() - days)
    try {
      await fetch(`/api/admin/access-log?before=${before.toISOString()}`, {
        method: 'DELETE',
        headers: getHeaders(),
      })
      fetchLogs(pagination.page)
    } catch { /* silent */ }
  }

  // ── Export CSV ──
  const exportCSV = () => {
    if (logs.length === 0) return
    const header = 'Time,Email,Name,Path,IP,Country,Language,Browser,OS,Duration,Referrer'
    const rows = logs.map(l => {
      const { browser, os } = parseUserAgent(l.userAgent)
      return [
        new Date(l.createdAt).toISOString(),
        l.email || '',
        l.name || '',
        l.path,
        l.ipAddress || '',
        l.country || '',
        l.language || '',
        browser,
        os,
        l.duration ?? '',
        l.referrer || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `access-log-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Auth Gate ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col mesh-gradient noise-overlay">
        <nav className="sticky top-0 z-50 nav-premium">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded-lg" />
              <span className="font-bold gradient-text-premium text-sm">TheOneWayGDA</span>
            </Link>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="w-full max-w-sm card-premium">
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Activity className="size-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold">Access Log</h2>
                <p className="text-xs text-muted-foreground mt-1">Admin authentication required</p>
              </div>
              <form onSubmit={e => { e.preventDefault(); handleLogin() }} className="space-y-3">
                <Input
                  type="password"
                  placeholder="Admin password"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="h-10"
                />
                <Button type="submit" className="w-full" disabled={isLoading || !passwordInput}>
                  {isLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ── Main UI ──
  return (
    <div className="min-h-screen flex flex-col mesh-gradient noise-overlay">
      {/* Nav */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-4">
            <Link href="/admin/approvals" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
              <span className="text-xs hidden sm:inline">Admin</span>
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded-lg" />
              <span className="font-bold gradient-text-premium text-sm">TheOneWayGDA</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/visitors">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                <Users className="size-3.5 mr-1" /> Visitors
              </Button>
            </Link>
            <Link href="/admin/approvals">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                <FileText className="size-3.5 mr-1" /> Approvals
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="size-6 text-primary" />
              Site Access Log
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every page visit, with visitor identity, location, and time spent
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={logs.length === 0}>
              <Download className="size-3.5 mr-1.5" /> Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => purgeOldLogs(90)}
            >
              <Trash2 className="size-3.5 mr-1.5" /> Purge 90d
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="card-premium bg-card/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Eye className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold">{summary.totalLogs.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Views</p>
                </div>
              </CardContent>
            </Card>
            <Card className="card-premium bg-card/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Users className="size-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-lg font-bold">{summary.uniqueVisitors.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Unique Visitors</p>
                </div>
              </CardContent>
            </Card>
            <Card className="card-premium bg-card/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Globe className="size-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-bold">{summary.topCountries.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Countries</p>
                </div>
              </CardContent>
            </Card>
            <Card className="card-premium bg-card/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="size-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-lg font-bold">{summary.topPaths.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Unique Pages</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Top Paths & Countries Row */}
        {summary && (summary.topPaths.length > 0 || summary.topCountries.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Top Pages */}
            {summary.topPaths.length > 0 && (
              <Card className="card-premium bg-card/50">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="size-3.5" /> Top Pages
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-1.5">
                  {summary.topPaths.slice(0, 5).map((p) => {
                    const pct = summary.totalLogs > 0 ? Math.round((p.count / summary.totalLogs) * 100) : 0
                    return (
                      <div key={p.path} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-mono truncate">{p.path}</span>
                            <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">{p.count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}
            {/* Top Countries */}
            {summary.topCountries.length > 0 && (
              <Card className="card-premium bg-card/50">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="size-3.5" /> Top Countries
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-1.5">
                  {summary.topCountries.slice(0, 5).map((c) => {
                    const pct = summary.totalLogs > 0 ? Math.round((c.count / summary.totalLogs) * 100) : 0
                    return (
                      <div key={c.country} className="flex items-center gap-2">
                        <span className="text-sm">{getFlag(c.country)}</span>
                        <span className="text-xs font-medium w-10">{c.country}</span>
                        <div className="flex-1">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{c.count} ({pct}%)</span>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Filters */}
        <Card className="card-premium bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search email, name, IP..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="h-9 pl-9 text-sm bg-muted/40 border-border/50"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="size-3.5 mr-1" />
                Filters
                {(countryFilter || pathFilter) && (
                  <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[9px]">
                    {[countryFilter, pathFilter].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    {summary?.topCountries && summary.topCountries.length > 0 && (
                      <Select value={countryFilter} onValueChange={v => { setCountryFilter(v === '__all__' ? '' : v) }}>
                        <SelectTrigger className="w-[160px] h-9 text-sm bg-muted/40 border-border/50">
                          <MapPin className="size-3.5 mr-1 text-muted-foreground" />
                          <SelectValue placeholder="Country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All Countries</SelectItem>
                          {summary.topCountries.map(c => (
                            <SelectItem key={c.country} value={c.country || ''}>
                              {getFlag(c.country)} {c.country || 'Unknown'} ({c.count})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {summary?.topPaths && summary.topPaths.length > 0 && (
                      <Select value={pathFilter} onValueChange={v => { setPathFilter(v === '__all__' ? '' : v) }}>
                        <SelectTrigger className="w-[200px] h-9 text-sm bg-muted/40 border-border/50">
                          <FileText className="size-3.5 mr-1 text-muted-foreground" />
                          <SelectValue placeholder="Page path" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All Pages</SelectItem>
                          {summary.topPaths.map(p => (
                            <SelectItem key={p.path} value={p.path}>
                              {p.path} ({p.count})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Log Table */}
        <Card className="card-premium bg-card/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3">Time</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3">Visitor</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3">Page</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3 hidden lg:table-cell">Location</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3 hidden md:table-cell">Device</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3">Duration</th>
                </tr>
              </thead>
              <tbody>
                {isLogsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <Loader2 className="size-6 text-primary animate-spin mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Loading access logs...</p>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <Eye className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No access logs yet</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Logs will appear as visitors browse the site</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log, i) => {
                    const { browser, os } = parseUserAgent(log.userAgent)
                    return (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.02, 0.5) }}
                        className="border-b border-border/20 hover:bg-muted/20 transition-colors"
                      >
                        {/* Time */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground">{formatTimeAgo(log.createdAt)}</span>
                          </div>
                        </td>

                        {/* Visitor */}
                        <td className="px-4 py-3">
                          {log.email ? (
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{log.name || log.email}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{log.email}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/60 italic">Anonymous</span>
                          )}
                        </td>

                        {/* Page */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-primary truncate max-w-[200px]">{log.path}</span>
                            {log.referrer && !log.referrer.includes('theonewaygda') && (
                              <ExternalLink className="size-3 text-muted-foreground/40 flex-shrink-0" title={log.referrer} />
                            )}
                          </div>
                          {log.language && (
                            <span className="text-[9px] text-muted-foreground uppercase">{log.language}</span>
                          )}
                        </td>

                        {/* Location */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{getFlag(log.country)}</span>
                            <span className="text-xs text-muted-foreground">{log.country || '-'}</span>
                            {log.ipAddress && (
                              <span className="text-[10px] text-muted-foreground/50 font-mono ml-1">{log.ipAddress}</span>
                            )}
                          </div>
                        </td>

                        {/* Device */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Monitor className="size-3 flex-shrink-0" />
                            <span>{browser}</span>
                            <span className="text-muted-foreground/40">/</span>
                            <span>{os}</span>
                          </div>
                        </td>

                        {/* Duration */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className={`text-xs font-mono ${log.duration && log.duration >= 30 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                            {formatDuration(log.duration)}
                          </span>
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline" size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchLogs(pagination.page - 1)}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground px-3">
              Page {pagination.page} of {pagination.pages}
              <span className="ml-2 text-muted-foreground/60">({pagination.total} logs)</span>
            </span>
            <Button
              variant="outline" size="sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchLogs(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}