'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft, UserCheck, Clock, XCircle, Search,
  CheckCircle2, AlertTriangle, Users, Loader2, Mail, Calendar,
  Shield, LogOut, MailWarning, MailCheck, Send, Settings, Lock,
  Languages, ChevronDown, ChevronUp, BarChart3,
} from 'lucide-react'

interface PendingUser {
  id: string
  email: string
  name: string | null
  createdAt: string
}

interface RejectedUser extends PendingUser {
  updatedAt: string
}

interface EmailStatus {
  configured: boolean
  provider: string
  providerLabel?: string
  mode: string
  message: string
  adminEmail: string
}

interface LangStatItem {
  code: string
  label: string
  flag: string
  count: number
  percentage: number
}

interface LanguageStats {
  preferredLanguage: LangStatItem[]
  proficientLanguages: LangStatItem[]
  pendingLanguages: LangStatItem[]
  monthlyBreakdown: Record<string, Record<string, number>>
  summary: {
    totalActive: number
    totalPending: number
    multiLanguageUsers: number
    avgLanguagesPerUser: number
    uniqueLanguagesUsed: number
  }
}

export default function AdminApprovalsPage() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')

  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [rejectedUsers, setRejectedUsers] = useState<RejectedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null)
  const [testEmailLoading, setTestEmailLoading] = useState(false)
  const [langStats, setLangStats] = useState<LanguageStats | null>(null)
  const [langStatsLoading, setLangStatsLoading] = useState(false)
  const [showLangStats, setShowLangStats] = useState(false)

  // Check existing session on mount
  useEffect(() => {
    const session = localStorage.getItem('oneway-admin-session')
    const token = localStorage.getItem('oneway-admin-token')
    if (session === 'authenticated' && token) {
      setPassword(token)
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = async () => {
    if (!password.trim()) return
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (res.ok && data.token) {
        localStorage.setItem('oneway-admin-session', 'authenticated')
        localStorage.setItem('oneway-admin-token', data.token)
        setPassword(data.token)
        setIsAuthenticated(true)
        setAuthError('')
      } else {
        setAuthError('Invalid password.')
      }
    } catch {
      setAuthError('Network error.')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setPassword('')
    localStorage.removeItem('oneway-admin-session')
    localStorage.removeItem('oneway-admin-token')
  }

  // Auth header helper
  const getHeaders = () => {
    const token = localStorage.getItem('oneway-admin-token') || password
    return { 'x-admin-token': token }
  }

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/approvals', {
        headers: getHeaders(),
      })
      if (!res.ok) {
        if (res.status === 401) {
          handleLogout()
          return
        }
        return
      }
      const data = await res.json()
      setPendingUsers(data.pending || [])
      setRejectedUsers(data.rejected || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [password])

  const fetchLangStats = useCallback(async () => {
    setLangStatsLoading(true)
    try {
      const res = await fetch('/api/admin/language-stats', { headers: getHeaders() })
      if (res.ok) {
        const data = await res.json()
        setLangStats(data)
      }
    } catch { /* silent */ }
    finally { setLangStatsLoading(false) }
  }, [password])

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers()
      fetchLangStats()
      fetch('/api/admin/test-email')
        .then(res => res.json())
        .then(data => setEmailStatus(data))
        .catch(() => {})
    }
  }, [isAuthenticated, fetchUsers, fetchLangStats])

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const handleTestEmail = async () => {
    setTestEmailLoading(true)
    try {
      const res = await fetch('/api/admin/test-email', { method: 'POST' })
      const data = await res.json()
      if (res.ok) showToast('success', data.message)
      else showToast('error', data.error || 'Test failed')
    } catch {
      showToast('error', 'Network error')
    } finally {
      setTestEmailLoading(false)
    }
  }

  const handleApprove = async (userId: string, userName: string) => {
    setActionLoading(userId)
    try {
      const res = await fetch(`/api/admin/approvals/${userId}/approve`, {
        method: 'POST',
        headers: getHeaders(),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('success', data.message)
        fetchUsers()
      } else {
        showToast('error', data.error || 'Failed to approve')
      }
    } catch {
      showToast('error', 'Network error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (userId: string) => {
    const reason = prompt('Reason for rejection (optional):')
    if (reason === null) return

    setActionLoading(userId)
    try {
      const res = await fetch(`/api/admin/approvals/${userId}/reject`, {
        method: 'POST',
        headers: {
          ...getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason || 'Application did not meet our requirements.' }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('success', data.message)
        fetchUsers()
      } else {
        showToast('error', data.error || 'Failed to reject')
      }
    } catch {
      showToast('error', 'Network error')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredPending = pendingUsers.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredRejected = rejectedUsers.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  // ── Login Screen ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-gradient noise-overlay px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Shield className="size-7 text-primary" />
              </div>
              <CardTitle className="text-xl">Admin Access</CardTitle>
              <CardDescription>Enter your admin password to manage access requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Admin password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setAuthError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="pl-10"
                  autoFocus
                />
              </div>
              {authError && <p className="text-xs text-rose-400 text-center">{authError}</p>}
              <Button onClick={handleLogin} className="w-full" disabled={!password.trim()}>
                Unlock
              </Button>
              <div className="flex justify-center gap-4">
                <Link href="/admin/visitors" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Visitor Management
                </Link>
                <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Homepage
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ── Main Dashboard ──
  return (
    <div className="min-h-screen mesh-gradient noise-overlay">
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'
          }`}
        >
          {toast.message}
        </motion.div>
      )}

      {/* Nav */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-4">
            <Link href="/admin/visitors" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
              <span className="text-xs hidden sm:inline">Admin</span>
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded-lg" />
              <span className="font-bold gradient-text-premium text-sm">TheOneWayGDA</span>
            </Link>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
            <LogOut className="size-4 mr-1.5" />
            <span className="text-xs">Logout</span>
          </Button>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Users className="size-6 text-primary" />
              Access Requests
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Review and manage user access applications</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1.5 text-xs gap-1.5">
              <Clock className="size-3 text-amber-500" />
              {pendingUsers.length} Pending
            </Badge>
            <Badge variant="outline" className="px-3 py-1.5 text-xs gap-1.5">
              <XCircle className="size-3 text-rose-400" />
              {rejectedUsers.length} Rejected
            </Badge>
          </div>
        </div>

        {/* Email Status */}
        {emailStatus && !emailStatus.configured && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-4 px-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <MailWarning className="size-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-200">Email notifications not configured</p>
                    <p className="text-xs text-muted-foreground mt-1">Set <code className="bg-amber-500/10 px-1.5 py-0.5 rounded text-amber-300 text-[11px] font-mono">RESEND_API_KEY</code> in your .env</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {emailStatus && emailStatus.configured && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <MailCheck className="size-4 text-emerald-500" />
              <span className="text-xs text-emerald-300 font-medium">Email active</span>
              <span className="text-xs text-muted-foreground">({emailStatus.providerLabel || emailStatus.provider})</span>
            </div>
            <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground" onClick={handleTestEmail} disabled={testEmailLoading}>
              {testEmailLoading ? <Loader2 className="size-3 animate-spin mr-1" /> : <Send className="size-3 mr-1" />}
              Test Email
            </Button>
          </div>
        )}

        {/* Language Analytics */}
        <Card>
          <CardHeader className="pb-2 cursor-pointer select-none" onClick={() => setShowLangStats(!showLangStats)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Languages className="size-5 text-blue-400" />
                Language Analytics
              </CardTitle>
              <div className="flex items-center gap-3">
                {langStats && !showLangStats && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{langStats.summary.totalActive} active</span>
                    <span className="text-muted-foreground/30">|</span>
                    <span className="text-xs text-muted-foreground">{langStats.summary.totalPending} pending</span>
                    <span className="text-muted-foreground/30">|</span>
                    <span className="text-xs text-muted-foreground">{langStats.summary.uniqueLanguagesUsed} languages</span>
                  </div>
                )}
                {showLangStats ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
          {showLangStats && (
            <CardContent className="pt-0 space-y-5">
              {langStatsLoading ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
              ) : langStats ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 p-3 text-center">
                      <p className="text-2xl font-bold text-blue-400">{langStats.summary.totalActive}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Active Users</p>
                    </div>
                    <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-3 text-center">
                      <p className="text-2xl font-bold text-amber-400">{langStats.summary.totalPending}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Pending</p>
                    </div>
                    <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-400">{langStats.summary.multiLanguageUsers}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Multi-Lang</p>
                    </div>
                    <div className="rounded-xl bg-purple-500/5 border border-purple-500/15 p-3 text-center">
                      <p className="text-2xl font-bold text-purple-400">{langStats.summary.avgLanguagesPerUser}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Avg Langs</p>
                    </div>
                  </div>

                  {/* Preferred Language Distribution */}
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                      <BarChart3 className="size-3.5 text-blue-400" />
                      Preferred Language Distribution
                    </h4>
                    <div className="space-y-2">
                      {langStats.preferredLanguage.map((lang) => (
                        <div key={lang.code} className="flex items-center gap-3">
                          <span className="text-lg w-8 text-center flex-shrink-0">{lang.flag}</span>
                          <span className="text-xs font-medium w-24 truncate flex-shrink-0">{lang.label}</span>
                          <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500/60 to-blue-400/60 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(lang.percentage, 1)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right flex-shrink-0">{lang.count}</span>
                          <span className="text-[10px] text-muted-foreground/60 w-10 text-right flex-shrink-0">{lang.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Proficient Languages (secondary) */}
                  {langStats.proficientLanguages.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                        <BarChart3 className="size-3.5 text-emerald-400" />
                        Proficient Languages (All Users)
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {langStats.proficientLanguages.map((lang) => (
                          <div key={lang.code} className="flex items-center gap-1.5 rounded-full border border-border/30 bg-card/60 px-3 py-1.5">
                            <span>{lang.flag}</span>
                            <span className="text-xs font-medium">{lang.label}</span>
                            <span className="text-[10px] text-muted-foreground">({lang.count})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending Users Languages */}
                  {langStats.pendingLanguages.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                        <BarChart3 className="size-3.5 text-amber-400" />
                        Pending Users by Language
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {langStats.pendingLanguages.map((lang) => (
                          <div key={lang.code} className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1.5">
                            <span>{lang.flag}</span>
                            <span className="text-xs font-medium">{lang.label}</span>
                            <span className="text-[10px] text-amber-300">{lang.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No language data available yet.</p>
              )}
            </CardContent>
          )}
        </Card>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        {/* Pending Requests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="size-5 text-amber-500" />
              Pending Applications
            </CardTitle>
            <CardDescription>
              {filteredPending.length} user{filteredPending.length !== 1 ? 's' : ''} waiting for review
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : filteredPending.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 className="size-10 text-emerald-500/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{searchQuery ? 'No matching results' : 'No pending requests!'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPending.map((user) => (
                  <motion.div key={user.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/40 p-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="size-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                        <UserCheck className="size-5 text-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{user.name || 'No name provided'}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail className="size-3" /><span className="truncate">{user.email}</span>
                        </p>
                        <p className="text-xs text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                          <Calendar className="size-3" />Applied {formatDate(user.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 sm:self-center">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleApprove(user.id, user.name || user.email)} disabled={actionLoading === user.id}>
                        {actionLoading === user.id ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="size-3.5 mr-1.5" />}
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                        onClick={() => handleReject(user.id)} disabled={actionLoading === user.id}>
                        <XCircle className="size-3.5 mr-1.5" />Reject
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rejected Requests */}
        {filteredRejected.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <XCircle className="size-5 text-rose-400" />
                Rejected Applications
              </CardTitle>
              <CardDescription>{filteredRejected.length} previously rejected</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredRejected.map((user) => (
                  <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/30 bg-card/30 p-4 opacity-70">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="size-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                        <XCircle className="size-5 text-rose-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{user.name || 'No name'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        <p className="text-xs text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                          <Calendar className="size-3" />Rejected {formatDate(user.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="bg-emerald-600/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                      onClick={() => handleApprove(user.id, user.name || user.email)} disabled={actionLoading === user.id}>
                      {actionLoading === user.id ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <AlertTriangle className="size-3.5 mr-1.5" />}
                      Revoke & Approve
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}