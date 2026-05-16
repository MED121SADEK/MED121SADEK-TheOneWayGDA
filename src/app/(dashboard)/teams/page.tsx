'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, Plus, Globe, Users, Search, Copy, Check,
  Mail, CheckCircle, XCircle, Clock, Loader2, ChevronRight,
  Building2, Shield, Crown, Eye, UserPlus, Sparkles,
  FolderOpen, BarChart3, Workflow, Zap, Star, Settings,
} from 'lucide-react'

/* ─── Types ─── */
interface Team {
  id: string; name: string; description: string | null; slug: string;
  avatar: string | null; ownerId: string; isPublic: boolean; maxMembers: number;
  inviteCode: string; createdAt: string;
  _count?: { members: number; invites: number; sharedItems: number; activity: number }
}

interface TeamInvite {
  id: string; teamId: string; email: string | null; userId: string | null;
  role: string; status: string; message: string | null; createdAt: string; expiresAt: string;
  team?: { name: string; avatar: string | null }
}

/* ─── Helpers ─── */
function getSession() {
  if (typeof window === 'undefined') return null
  try {
    const token = localStorage.getItem('oneway-auth-token')
    const userStr = localStorage.getItem('oneway-user')
    if (!token || !userStr) return null
    return { token, user: JSON.parse(userStr) as { id: string; email: string; name: string | null; role: string } }
  } catch { return null }
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getInitials(name: string | null, email: string): string {
  if (name) return name.split(' ').map(n => n.charAt(0).toUpperCase()).join('').slice(0, 2)
  return email.charAt(0).toUpperCase()
}

const GRADIENTS = [
  'from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-orange-500 to-amber-500',
  'from-emerald-500 to-teal-500', 'from-red-500 to-rose-500', 'from-indigo-500 to-violet-500',
  'from-cyan-500 to-sky-500', 'from-amber-500 to-yellow-500',
]

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}
const stagger = { animate: { transition: { staggerChildren: 0.04 } } }

/* ─── MAIN PAGE ─── */
export default function TeamsPage() {
  const router = useRouter()
  const { t, locale, setLocale, dir } = useTranslation()
  const session = getSession()

  const [teams, setTeams] = useState<Team[]>([])
  const [publicTeams, setPublicTeams] = useState<Team[]>([])
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('my-teams')
  const [searchTerm, setSearchTerm] = useState('')

  // Create team dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '', avatar: GRADIENTS[0], isPublic: false, maxMembers: 10 })
  const [creating, setCreating] = useState(false)

  // Join by code dialog
  const [joinOpen, setJoinOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinMsg, setJoinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Accept/reject invite
  const [inviteLoading, setInviteLoading] = useState<string | null>(null)

  /* ─── Auth check ─── */
  useEffect(() => {
    if (!session) { router.push('/auth/login'); return }
    Promise.all([fetchTeams(), fetchInvites()])
  }, [router, session])

  /* ─── Data fetchers ─── */
  const fetchTeams = useCallback(async () => {
    if (!session) return
    try {
      const res = await fetch(`/api/teams?token=${session.token}`)
      const json = await res.json()
      if (json.success) {
        const userTeams = (json.data || []).filter((t: Team) => t._count?.members)
        setTeams(userTeams)
        setPublicTeams((json.data || []).filter((t: Team) => t.isPublic && t.ownerId !== session.user.id))
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }, [session])

  const fetchInvites = useCallback(async () => {
    if (!session) return
    try {
      const res = await fetch(`/api/teams?token=${session.token}`)
      const json = await res.json()
      // Invites are fetched per-team; for now we show a placeholder
      // In production, a dedicated /api/teams/invites/me endpoint would exist
    } catch { /* silent */ }
  }, [session])

  /* ─── Create Team ─── */
  const handleCreate = async () => {
    if (!session || !createForm.name.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/teams?token=' + session.token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      const json = await res.json()
      if (json.success) {
        setCreateOpen(false)
        setCreateForm({ name: '', description: '', avatar: GRADIENTS[0], isPublic: false, maxMembers: 10 })
        router.push(`/teams/${json.data.id}`)
      }
    } catch { /* silent */ } finally { setCreating(false) }
  }

  /* ─── Join by Code ─── */
  const handleJoin = async () => {
    if (!session || !joinCode.trim()) return
    setJoining(true)
    setJoinMsg(null)
    try {
      const res = await fetch('/api/teams/join?token=' + session.token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: joinCode.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        setJoinMsg({ type: 'success', text: 'Successfully joined team!' })
        setJoinCode('')
        setTimeout(() => { setJoinOpen(false); setJoinMsg(null); fetchTeams() }, 1200)
      } else {
        setJoinMsg({ type: 'error', text: json.error || 'Failed to join team' })
      }
    } catch {
      setJoinMsg({ type: 'error', text: 'Network error' })
    } finally { setJoining(false) }
  }

  /* ─── Respond to Invite ─── */
  const handleInvite = async (inviteId: string, action: 'accept' | 'reject') => {
    if (!session) return
    setInviteLoading(inviteId)
    try {
      // We need to find which team the invite belongs to
      const invite = invites.find(i => i.id === inviteId)
      if (!invite) return
      const res = await fetch(`/api/teams/${invite.teamId}/invites?token=${session.token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action }),
      })
      const json = await res.json()
      if (json.success) {
        setInvites(prev => prev.filter(i => i.id !== inviteId))
        if (action === 'accept') fetchTeams()
      }
    } catch { /* silent */ } finally { setInviteLoading(null) }
  }

  /* ─── Filtered teams ─── */
  const filteredMyTeams = teams.filter(t =>
    !searchTerm || t.name.toLowerCase().includes(searchTerm.toLowerCase()) || (t.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  )
  const filteredPublicTeams = publicTeams.filter(t =>
    !searchTerm || t.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  /* ─── Copy to clipboard ─── */
  const copyCode = (code: string, teamId: string) => {
    navigator.clipboard.writeText(code)
  }

  if (!session) return null

  return (
    <div className="min-h-screen flex flex-col mesh-gradient noise-overlay" dir={dir}>
      {/* ═══ NAV ═══ */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <ArrowLeft className="size-4" />
            </Link>
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded-lg flex-shrink-0" />
            <span className="text-lg font-bold gradient-text-premium whitespace-nowrap">Teams</span>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                  <UserPlus className="size-3" />Join Team
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Join a Team</DialogTitle>
                  <DialogDescription>Enter the team invite code to join</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Invite Code</Label>
                    <Input placeholder="e.g. a3f8b2c1" value={joinCode} onChange={e => setJoinCode(e.target.value)} className="font-mono" />
                  </div>
                  {joinMsg && (
                    <div className={`text-xs px-3 py-2 rounded-lg ${joinMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {joinMsg.text}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button size="sm" onClick={handleJoin} disabled={joining || !joinCode.trim()}>
                    {joining ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                    Join Team
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-xs gap-1">
                  <Plus className="size-3" />Create Team
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                  <DialogDescription>Set up a collaborative workspace for your team</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Team Name *</Label>
                    <Input placeholder="e.g. Data Science Division" value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Textarea placeholder="What is this team about?" value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} rows={3} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Team Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {GRADIENTS.map(g => (
                        <button key={g} className={`w-8 h-8 rounded-lg bg-gradient-to-br ${g} border-2 transition-all ${createForm.avatar === g ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`} onClick={() => setCreateForm(p => ({ ...p, avatar: g }))} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs">Public Team</Label>
                      <p className="text-[10px] text-muted-foreground">Discoverable in the team directory</p>
                    </div>
                    <Switch checked={createForm.isPublic} onCheckedChange={v => setCreateForm(p => ({ ...p, isPublic: v }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Max Members</Label>
                    <Select value={String(createForm.maxMembers)} onValueChange={v => setCreateForm(p => ({ ...p, maxMembers: parseInt(v) }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[5, 10, 25, 50].map(n => <SelectItem key={n} value={String(n)}>{n} members</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleCreate} disabled={creating || !createForm.name.trim()}>
                    {creating ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                    Create Team
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Select value={locale} onValueChange={(v) => setLocale(v as 'en' | 'fr' | 'ar' | 'zh' | 'es' | 'de' | 'ja' | 'ko')}>
              <SelectTrigger className="h-8 w-20 text-xs">
                <Globe className="size-3 mr-0.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['en', 'fr', 'ar', 'zh', 'es', 'de', 'ja', 'ko'].map(l => (
                  <SelectItem key={l} value={l} className="text-xs">{l.toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </nav>

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="size-8 text-primary animate-spin" /></div>
        ) : (
          <>
            {/* ── Hero ── */}
            <motion.div {...fadeUp} className="hero-gradient rounded-2xl p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/5 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-12 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                    <Building2 className="size-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Collaboration Hub</h1>
                    <p className="text-sm text-muted-foreground">Work together on AI model analyses and workflows</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Users className="size-3.5 text-blue-400" />
                    <span className="text-sm font-medium">{teams.length} Team{teams.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <FolderOpen className="size-3.5 text-purple-400" />
                    <span className="text-sm font-medium">{teams.reduce((a, t) => a + (t._count?.sharedItems || 0), 0)} Shared Resources</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Zap className="size-3.5 text-amber-400" />
                    <span className="text-sm font-medium">{teams.reduce((a, t) => a + (t._count?.members || 0), 0)} Collaborators</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── Search ── */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search teams..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>

            {/* ── Tabs ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                <TabsTrigger value="my-teams" className="gap-1.5 text-xs"><Users className="size-3.5" />My Teams</TabsTrigger>
                <TabsTrigger value="discover" className="gap-1.5 text-xs"><Globe className="size-3.5" />Discover</TabsTrigger>
                <TabsTrigger value="invites" className="gap-1.5 text-xs"><Mail className="size-3.5" />Invites</TabsTrigger>
              </TabsList>

              {/* ── My Teams ── */}
              <TabsContent value="my-teams" className="mt-4">
                {filteredMyTeams.length === 0 ? (
                  <motion.div {...fadeUp}>
                    <Card className="card-premium">
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <Users className="size-12 text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-semibold mb-1">No Teams Yet</h3>
                        <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                          Create a team to start collaborating with colleagues on AI model analyses and workflows.
                        </p>
                        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-3.5 mr-1.5" />Create Your First Team</Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" {...stagger}>
                    <AnimatePresence>
                      {filteredMyTeams.map((team, i) => (
                        <motion.div key={team.id} {...fadeUp} transition={{ ...fadeUp.animate.transition, delay: i * 0.04 }}>
                          <Link href={`/teams/${team.id}`}>
                            <Card className="card-premium hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer group h-full">
                              <CardHeader className="pb-3">
                                <div className="flex items-start gap-3">
                                  <div className={`size-10 rounded-xl bg-gradient-to-br ${team.avatar || GRADIENTS[0]} flex items-center justify-center flex-shrink-0 text-white font-bold text-sm`}>
                                    {team.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <CardTitle className="text-sm truncate group-hover:text-primary transition-colors">{team.name}</CardTitle>
                                      {team.ownerId === session.user.id && (
                                        <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/15 text-amber-400 border-amber-500/25">Owner</Badge>
                                      )}
                                    </div>
                                    {team.description && (
                                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{team.description}</p>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <Users className="size-3" />
                                    <span>{team._count?.members || 0} member{((team._count?.members || 0) !== 1) ? 's' : ''}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <FolderOpen className="size-3" />
                                    <span>{team._count?.sharedItems || 0} shared</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="size-3" />
                                    <span>{timeAgo(team.createdAt)}</span>
                                  </div>
                                </div>
                                <Separator className="my-3" />
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <code className="text-[10px] px-2 py-0.5 rounded bg-muted/50 font-mono">{team.inviteCode}</code>
                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyCode(team.inviteCode, team.id) }} className="text-muted-foreground hover:text-primary"><Copy className="size-3" /></button>
                                  </div>
                                  {team.isPublic && (
                                    <Badge variant="secondary" className="text-[9px] px-1.5"><Globe className="size-2.5 mr-0.5" />Public</Badge>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </TabsContent>

              {/* ── Discover ── */}
              <TabsContent value="discover" className="mt-4">
                {filteredPublicTeams.length === 0 ? (
                  <motion.div {...fadeUp}>
                    <Card className="card-premium">
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <Globe className="size-12 text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-semibold mb-1">No Public Teams</h3>
                        <p className="text-sm text-muted-foreground text-center max-w-sm">
                          No public teams available yet. Create a team and make it public to let others discover it.
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" {...stagger}>
                    <AnimatePresence>
                      {filteredPublicTeams.map((team, i) => (
                        <motion.div key={team.id} {...fadeUp} transition={{ ...fadeUp.animate.transition, delay: i * 0.04 }}>
                          <Card className="card-premium hover:border-primary/30 transition-all h-full">
                            <CardHeader className="pb-3">
                              <div className="flex items-start gap-3">
                                <div className={`size-10 rounded-xl bg-gradient-to-br ${team.avatar || GRADIENTS[0]} flex items-center justify-center flex-shrink-0 text-white font-bold text-sm`}>
                                  {team.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-sm truncate">{team.name}</CardTitle>
                                  {team.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{team.description}</p>}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-3">
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Users className="size-3" />{team._count?.members || 0}</span>
                                <span className="flex items-center gap-1"><FolderOpen className="size-3" />{team._count?.sharedItems || 0}</span>
                              </div>
                              <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => { setJoinCode(team.inviteCode); setJoinOpen(true) }}>
                                <UserPlus className="size-3 mr-1" />Request to Join
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </TabsContent>

              {/* ── Invites ── */}
              <TabsContent value="invites" className="mt-4">
                {invites.length === 0 ? (
                  <motion.div {...fadeUp}>
                    <Card className="card-premium">
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <Mail className="size-12 text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-semibold mb-1">No Pending Invites</h3>
                        <p className="text-sm text-muted-foreground text-center max-w-sm">
                          When team admins invite you, the invitations will appear here.
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div className="space-y-3" {...stagger}>
                    <AnimatePresence>
                      {invites.map(invite => (
                        <motion.div key={invite.id} {...fadeUp}>
                          <Card className="card-premium">
                            <CardContent className="p-4 flex items-center gap-4">
                              <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                <Mail className="size-5 text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{invite.team?.name || 'Team'}</p>
                                {invite.message && <p className="text-xs text-muted-foreground truncate">{invite.message}</p>}
                                <p className="text-[10px] text-muted-foreground mt-0.5">Role: {invite.role} · {timeAgo(invite.createdAt)}</p>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-400 hover:text-emerald-300" disabled={inviteLoading === invite.id} onClick={() => handleInvite(invite.id, 'accept')}>
                                  {inviteLoading === invite.id ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle className="size-3 mr-1" />}
                                  Accept
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-300" disabled={inviteLoading === invite.id} onClick={() => handleInvite(invite.id, 'reject')}>
                                  <XCircle className="size-3 mr-1" />Reject
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}
