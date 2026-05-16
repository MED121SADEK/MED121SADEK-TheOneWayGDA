'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft, Globe, Users, Copy, Check, Settings, Share2,
  Plus, Mail, UserPlus, UserMinus, Crown, Shield, Eye,
  Clock, Loader2, ChevronRight, Pin, MessageSquare, Send,
  FolderOpen, BarChart3, Workflow, Zap, Bot, Beaker,
  FileText, Star, Trash2, MoreVertical, ExternalLink,
  Activity, Building2, Palette,
} from 'lucide-react'

/* ─── Types ─── */
interface TeamData {
  id: string; name: string; description: string | null; slug: string;
  avatar: string | null; ownerId: string; isPublic: boolean; maxMembers: number;
  inviteCode: string; settings: string | null; createdAt: string;
  members?: TeamMember[]; _count?: { members: number; invites: number; sharedItems: number; activity: number }
}

interface TeamMember {
  id: string; userId: string; role: string; nickname: string | null; joinedAt: string; lastActive: string;
  user: { id: string; email: string; name: string | null; role: string }
}

interface TeamShareItem {
  id: string; sharedBy: string; resourceType: string; resourceId: string;
  resourceName: string; description: string | null; permissions: string;
  isPinned: boolean; createdAt: string; updatedAt: string;
}

interface TeamActivityItem {
  id: string; userId: string; userName: string | null; type: string;
  details: string | null; createdAt: string;
}

interface TeamCommentItem {
  id: string; shareId: string | null; userId: string; userName: string | null;
  content: string; editedAt: string | null; createdAt: string; updatedAt: string;
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

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-red-500',
  'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-teal-500',
  'bg-cyan-500', 'bg-indigo-500',
]
function getAvatarColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'owner': return <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/15 text-amber-400 border-amber-500/25 gap-0.5"><Crown className="size-2.5" />Owner</Badge>
    case 'admin': return <Badge className="text-[9px] px-1.5 py-0 bg-blue-500/15 text-blue-400 border-blue-500/25 gap-0.5"><Shield className="size-2.5" />Admin</Badge>
    case 'member': return <Badge className="text-[9px] px-1.5 py-0 bg-primary/15 text-primary border-primary/25">Member</Badge>
    case 'viewer': return <Badge className="text-[9px] px-1.5 py-0 bg-muted/50 text-muted-foreground border-border/30 gap-0.5"><Eye className="size-2.5" />Viewer</Badge>
    default: return <Badge variant="secondary" className="text-[9px]">{role}</Badge>
  }
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'member_joined': return { icon: UserPlus, color: 'text-emerald-400 bg-emerald-500/10', label: 'joined the team' }
    case 'member_left': return { icon: UserMinus, color: 'text-red-400 bg-red-500/10', label: 'left the team' }
    case 'invite_sent': return { icon: Mail, color: 'text-blue-400 bg-blue-500/10', label: 'sent an invite' }
    case 'invite_accepted': return { icon: Check, color: 'text-emerald-400 bg-emerald-500/10', label: 'accepted an invite' }
    case 'resource_shared': return { icon: Share2, color: 'text-purple-400 bg-purple-500/10', label: 'shared a resource' }
    case 'resource_created': return { icon: Plus, color: 'text-cyan-400 bg-cyan-500/10', label: 'created a resource' }
    case 'comment_added': return { icon: MessageSquare, color: 'text-amber-400 bg-amber-500/10', label: 'added a comment' }
    case 'team_updated': return { icon: Settings, color: 'text-gray-400 bg-gray-500/10', label: 'updated team settings' }
    default: return { icon: Activity, color: 'text-muted-foreground bg-muted/30', label: type }
  }
}

function getResourceIcon(type: string) {
  switch (type) {
    case 'workflow': return { icon: Workflow, color: 'text-orange-400 bg-orange-500/10' }
    case 'analysis': return { icon: BarChart3, color: 'text-purple-400 bg-purple-500/10' }
    case 'project': return { icon: FolderOpen, color: 'text-blue-400 bg-blue-500/10' }
    case 'benchmark_config': return { icon: Beaker, color: 'text-cyan-400 bg-cyan-500/10' }
    case 'template': return { icon: FileText, color: 'text-emerald-400 bg-emerald-500/10' }
    default: return { icon: FileText, color: 'text-muted-foreground bg-muted/30' }
  }
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}
const stagger = { animate: { transition: { staggerChildren: 0.04 } } }

const GRADIENTS = [
  'from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-orange-500 to-amber-500',
  'from-emerald-500 to-teal-500', 'from-red-500 to-rose-500', 'from-indigo-500 to-violet-500',
]

/* ─── MAIN PAGE ─── */
export default function TeamDetailPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.id as string
  const { t, locale, setLocale, dir } = useTranslation()
  const session = getSession()

  const [team, setTeam] = useState<TeamData | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [shares, setShares] = useState<TeamShareItem[]>([])
  const [activities, setActivities] = useState<TeamActivityItem[]>([])
  const [comments, setComments] = useState<TeamCommentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [shareFilter, setShareFilter] = useState('all')

  // Share dialog
  const [shareOpen, setShareOpen] = useState(false)
  const [shareForm, setShareForm] = useState({ resourceType: 'workflow', resourceId: '', resourceName: '', description: '', permissions: '["view"]' })
  const [sharing, setSharing] = useState(false)

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member', message: '' })
  const [inviting, setInviting] = useState(false)

  // Comment input per share
  const [commentText, setCommentText] = useState('')
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null)
  const [submittingComment, setSubmittingComment] = useState(false)

  // Copy feedback
  const [copiedCode, setCopiedCode] = useState(false)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  /* ─── Auth check ─── */
  useEffect(() => {
    if (!session) { router.push('/auth/login'); return }
    fetchTeam()
  }, [router, session, teamId])

  /* ─── Data fetchers ─── */
  const fetchTeam = useCallback(async () => {
    if (!session) return
    setLoading(true)
    try {
      const [teamRes, membersRes, sharesRes, activityRes] = await Promise.all([
        fetch(`/api/teams/${teamId}?token=${session.token}`),
        fetch(`/api/teams/${teamId}/members?token=${session.token}`),
        fetch(`/api/teams/${teamId}/shares?token=${session.token}`),
        fetch(`/api/teams/${teamId}/activity?token=${session.token}&limit=30&offset=0`),
      ])
      const [teamJson, membersJson, sharesJson, activityJson] = await Promise.all([
        teamRes.json(), membersRes.json(), sharesRes.json(), activityRes.json(),
      ])
      if (teamJson.success) setTeam(teamJson.data)
      if (membersJson.success) setMembers(membersJson.data || [])
      if (sharesJson.success) setShares(sharesJson.data || [])
      if (activityJson.success) setActivities(activityJson.data || [])
    } catch { /* silent */ } finally { setLoading(false) }
  }, [session, teamId])

  /* ─── My role ─── */
  const myMember = members.find(m => m.userId === session?.user.id)
  const myRole = myMember?.role || 'viewer'
  const isOwnerOrAdmin = myRole === 'owner' || myRole === 'admin'
  const isOwner = myRole === 'owner'

  /* ─── Share resource ─── */
  const handleShare = async () => {
    if (!session || !shareForm.resourceName.trim()) return
    setSharing(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/shares?token=${session.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shareForm),
      })
      const json = await res.json()
      if (json.success) {
        setShareOpen(false)
        setShareForm({ resourceType: 'workflow', resourceId: '', resourceName: '', description: '', permissions: '["view"]' })
        fetchTeam()
      }
    } catch { /* silent */ } finally { setSharing(false) }
  }

  /* ─── Invite member ─── */
  const handleInvite = async () => {
    if (!session || !inviteForm.email.trim()) return
    setInviting(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/invites?token=${session.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      })
      const json = await res.json()
      if (json.success) {
        setInviteOpen(false)
        setInviteForm({ email: '', role: 'member', message: '' })
        fetchTeam()
      }
    } catch { /* silent */ } finally { setInviting(false) }
  }

  /* ─── Update member role ─── */
  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!session) return
    try {
      const res = await fetch(`/api/teams/${teamId}/members?token=${session.token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })
      if (res.ok) fetchTeam()
    } catch { /* silent */ }
  }

  /* ─── Remove member ─── */
  const handleRemoveMember = async (userId: string) => {
    if (!session) return
    try {
      const res = await fetch(`/api/teams/${teamId}/members?token=${session.token}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) { setDeleteConfirm(null); fetchTeam() }
    } catch { /* silent */ }
  }

  /* ─── Delete share ─── */
  const handleDeleteShare = async (shareId: string) => {
    if (!session) return
    try {
      const res = await fetch(`/api/teams/${teamId}/shares?token=${session.token}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId }),
      })
      if (res.ok) fetchTeam()
    } catch { /* silent */ }
  }

  /* ─── Toggle pin ─── */
  const handleTogglePin = async (shareId: string, pinned: boolean) => {
    if (!session) return
    try {
      const res = await fetch(`/api/teams/${teamId}/shares?token=${session.token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId, isPinned: !pinned }),
      })
      if (res.ok) fetchTeam()
    } catch { /* silent */ }
  }

  /* ─── Submit comment ─── */
  const handleSubmitComment = async (shareId: string) => {
    if (!session || !commentText.trim()) return
    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/comments?token=${session.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText, shareId }),
      })
      const json = await res.json()
      if (json.success) {
        setCommentText('')
        fetchTeam()
      }
    } catch { /* silent */ } finally { setSubmittingComment(false) }
  }

  /* ─── Copy invite code ─── */
  const handleCopyCode = () => {
    if (!team) return
    navigator.clipboard.writeText(team.inviteCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  /* ─── Leave team ─── */
  const handleLeaveTeam = async () => {
    if (!session) return
    try {
      const res = await fetch(`/api/teams/${teamId}/members?token=${session.token}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id }),
      })
      if (res.ok) router.push('/teams')
    } catch { /* silent */ }
  }

  /* ─── Filtered shares ─── */
  const filteredShares = shares
    .filter(s => shareFilter === 'all' || s.resourceType === shareFilter)
    .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))

  if (!session) return null
  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="size-8 text-primary animate-spin" /></div>
  if (!team) return <div className="flex items-center justify-center py-32"><p className="text-muted-foreground">Team not found</p></div>

  const initials = getInitials(team.name, team.slug)

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6" dir={dir}>
        {/* ── Team Hero ── */}
        <motion.div {...fadeUp} className="hero-gradient rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/5 pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start gap-5">
            <div className={`size-16 rounded-2xl bg-gradient-to-br ${team.avatar || GRADIENTS[0]} flex items-center justify-center text-2xl font-bold text-white flex-shrink-0`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold">{team.name}</h1>
              {team.description && <p className="text-sm text-muted-foreground mt-1">{team.description}</p>}
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Users className="size-3" />{team._count?.members || members.length} members
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <FolderOpen className="size-3" />{team._count?.sharedItems || shares.length} shared
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Activity className="size-3" />{team._count?.activity || activities.length} activities
                </Badge>
                {team.isPublic && (
                  <Badge variant="outline" className="text-[10px] gap-1 text-emerald-400 border-emerald-500/25">
                    <Globe className="size-3" />Public
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <Button size="sm" className="gap-1.5" onClick={() => setShareOpen(true)}>
                <Share2 className="size-3.5" />Share Resource
              </Button>
              {isOwnerOrAdmin && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="size-3.5" />Invite Member
                </Button>
              )}
            </div>
          </div>

          {/* Invite Code */}
          <div className="relative z-10 mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black/20 border border-white/10 w-fit">
            <span className="text-xs text-muted-foreground">Invite Code:</span>
            <code className="text-sm font-mono font-bold tracking-wider text-primary">{team.inviteCode}</code>
            <button onClick={handleCopyCode} className="ml-1 text-muted-foreground hover:text-primary transition-colors">
              {copiedCode ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
            </button>
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="overview" className="gap-1.5 text-xs"><Activity className="size-3.5" />Overview</TabsTrigger>
            <TabsTrigger value="resources" className="gap-1.5 text-xs"><FolderOpen className="size-3.5" />Resources</TabsTrigger>
            <TabsTrigger value="members" className="gap-1.5 text-xs"><Users className="size-3.5" />Members</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5 text-xs"><Clock className="size-3.5" />Activity</TabsTrigger>
          </TabsList>

          {/* ═══ Overview Tab ═══ */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Quick Stats */}
              <motion.div {...fadeUp}>
                <Card className="card-premium">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Star className="size-4 text-primary" />Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 grid grid-cols-2 gap-3">
                    {[
                      { label: 'Members', value: members.length, icon: Users, color: 'text-blue-400 bg-blue-500/10' },
                      { label: 'Resources', value: shares.length, icon: FolderOpen, color: 'text-purple-400 bg-purple-500/10' },
                      { label: 'Comments', value: comments.length, icon: MessageSquare, color: 'text-amber-400 bg-amber-500/10' },
                      { label: 'Activities', value: activities.length, icon: Activity, color: 'text-emerald-400 bg-emerald-500/10' },
                    ].map(stat => (
                      <div key={stat.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/20">
                        <div className={`size-9 rounded-lg ${stat.color} flex items-center justify-center flex-shrink-0`}>
                          <stat.icon className="size-4" />
                        </div>
                        <div>
                          <p className="text-lg font-bold">{stat.value}</p>
                          <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recent Activity */}
              <motion.div {...fadeUp} transition={{ ...fadeUp.animate.transition, delay: 0.1 }}>
                <Card className="card-premium h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2"><Clock className="size-4 text-primary" />Recent Activity</CardTitle>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setActiveTab('activity')}>View all <ChevronRight className="size-3" /></Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {activities.length === 0 ? (
                      <div className="text-center py-8">
                        <Activity className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">No activity yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activities.slice(0, 5).map(act => {
                          const { icon: ActIcon, color } = getActivityIcon(act.type)
                          return (
                            <div key={act.id} className="flex items-center gap-3 py-1.5">
                              <div className={`size-7 rounded-md ${color} flex items-center justify-center flex-shrink-0`}>
                                <ActIcon className="size-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs"><span className="font-medium">{act.userName || 'Someone'}</span> <span className="text-muted-foreground">{getActivityIcon(act.type).label}</span></p>
                              </div>
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(act.createdAt)}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Team Members Preview */}
            <motion.div {...fadeUp} transition={{ ...fadeUp.animate.transition, delay: 0.15 }}>
              <Card className="card-premium">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2"><Users className="size-4 text-primary" />Team Members</CardTitle>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setActiveTab('members')}>Manage <ChevronRight className="size-3" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {members.slice(0, 8).map(m => (
                      <div key={m.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/20 border border-border/20">
                        <div className={`size-6 rounded-full ${getAvatarColor(m.user.email)} flex items-center justify-center text-[10px] font-bold text-white`}>
                          {getInitials(m.user.name, m.user.email)}
                        </div>
                        <span className="text-xs font-medium truncate max-w-[120px]">{m.nickname || m.user.name || m.user.email.split('@')[0]}</span>
                      </div>
                    ))}
                    {members.length > 8 && (
                      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted/20 border border-border/20">
                        <span className="text-xs text-muted-foreground">+{members.length - 8} more</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ═══ Shared Resources Tab ═══ */}
          <TabsContent value="resources" className="mt-4 space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {['all', 'workflow', 'analysis', 'project', 'benchmark_config', 'template'].map(type => (
                <Button key={type} variant={shareFilter === type ? 'default' : 'outline'} size="sm" className="h-7 text-[10px] capitalize" onClick={() => setShareFilter(type)}>
                  {type === 'all' ? 'All' : type.replace('_', ' ')}
                </Button>
              ))}
            </div>

            {filteredShares.length === 0 ? (
              <motion.div {...fadeUp}>
                <Card className="card-premium">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <FolderOpen className="size-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold mb-1">No Shared Resources</h3>
                    <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">Share workflows, analyses, and projects with your team to collaborate effectively.</p>
                    <Button size="sm" onClick={() => setShareOpen(true)}><Plus className="size-3.5 mr-1.5" />Share Resource</Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" {...stagger}>
                <AnimatePresence>
                  {filteredShares.map((share, i) => {
                    const { icon: ResIcon, color } = getResourceIcon(share.resourceType)
                    const perms = JSON.parse(share.permissions || '["view"]')
                    return (
                      <motion.div key={share.id} {...fadeUp} transition={{ ...fadeUp.animate.transition, delay: i * 0.04 }}>
                        <Card className={`card-premium hover:border-primary/30 transition-all h-full ${share.isPinned ? 'ring-1 ring-primary/20' : ''}`}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className={`size-9 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                                  <ResIcon className="size-4" />
                                </div>
                                <div className="min-w-0">
                                  <CardTitle className="text-sm truncate">{share.resourceName}</CardTitle>
                                  <Badge variant="secondary" className="text-[9px] mt-0.5 capitalize">{share.resourceType.replace('_', ' ')}</Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {share.isPinned && <Pin className="size-3 text-primary" />}
                                {isOwnerOrAdmin && (
                                  <button onClick={() => handleTogglePin(share.id, share.isPinned)} className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-primary">
                                    <Pin className="size-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0 space-y-3">
                            {share.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{share.description}</p>
                            )}
                            <div className="flex items-center gap-1 flex-wrap">
                              {perms.map((p: string) => (
                                <Badge key={p} variant="outline" className="text-[9px] capitalize">{p}</Badge>
                              ))}
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="size-3" />{timeAgo(share.createdAt)}</span>
                              <div className="flex gap-1">
                                {isOwnerOrAdmin && (
                                  <button onClick={() => { if (confirm('Remove this shared resource?')) handleDeleteShare(share.id) }} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                                    <Trash2 className="size-3" />
                                  </button>
                                )}
                                <button onClick={() => setSelectedShareId(selectedShareId === share.id ? null : share.id)} className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-primary">
                                  <MessageSquare className="size-3" />
                                </button>
                              </div>
                            </div>

                            {/* Inline comments */}
                            <AnimatePresence>
                              {selectedShareId === share.id && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="space-y-2 pt-2 border-t border-border/30">
                                    <Input placeholder="Add a comment..." value={selectedShareId === share.id ? commentText : ''} onChange={e => { setSelectedShareId(share.id); setCommentText(e.target.value) }} className="h-8 text-xs" onKeyDown={e => { if (e.key === 'Enter' && commentText.trim()) handleSubmitComment(share.id) }} />
                                    <Button size="sm" variant="ghost" className="h-7 text-[10px] ml-auto" disabled={submittingComment || !commentText.trim()} onClick={() => handleSubmitComment(share.id)}>
                                      {submittingComment ? <Loader2 className="size-3 animate-spin mr-1" /> : <Send className="size-3 mr-1" />}
                                      Comment
                                    </Button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>

          {/* ═══ Members Tab ═══ */}
          <TabsContent value="members" className="mt-4 space-y-4">
            {/* Invite code banner */}
            <motion.div {...fadeUp} className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/20">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Mail className="size-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Invite via Code</p>
                  <p className="text-xs text-muted-foreground">Share this code with anyone to let them join</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-3 py-1 rounded bg-background/50 font-mono text-sm font-bold text-primary">{team.inviteCode}</code>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleCopyCode}>
                  {copiedCode ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copiedCode ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </motion.div>

            {/* Members list */}
            <motion.div {...fadeUp} className="space-y-2">
              {members.map((member, i) => {
                const isSelf = member.userId === session.user.id
                return (
                  <Card key={member.id} className="card-premium">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`size-10 rounded-full ${getAvatarColor(member.user.email)} flex items-center justify-center font-bold text-sm text-white flex-shrink-0`}>
                        {getInitials(member.user.name, member.user.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{member.nickname || member.user.name || member.user.email.split('@')[0]}</p>
                          {isSelf && <Badge variant="outline" className="text-[9px]">You</Badge>}
                          {getRoleBadge(member.role)}
                        </div>
                        <p className="text-xs text-muted-foreground">{member.user.email}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Joined {timeAgo(member.joinedAt)} · Active {timeAgo(member.lastActive)}</p>
                      </div>
                      {isOwnerOrAdmin && !isSelf && member.role !== 'owner' && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Select value={member.role} onValueChange={v => handleRoleChange(member.userId, v)}>
                            <SelectTrigger className="h-7 w-24 text-[10px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          <Dialog open={deleteConfirm === member.userId} onOpenChange={open => setDeleteConfirm(open ? member.userId : null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                <Trash2 className="size-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-sm">
                              <DialogHeader>
                                <DialogTitle>Remove Member</DialogTitle>
                                <DialogDescription>Are you sure you want to remove {member.user.name || member.user.email} from the team?</DialogDescription>
                              </DialogHeader>
                              <DialogFooter className="gap-2">
                                <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRemoveMember(member.userId)}>Remove</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </motion.div>
          </TabsContent>

          {/* ═══ Activity Tab ═══ */}
          <TabsContent value="activity" className="mt-4">
            <motion.div {...fadeUp}>
              <Card className="card-premium">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Clock className="size-4 text-primary" />Team Activity</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {activities.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No activity recorded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {activities.map(act => {
                        const { icon: ActIcon, color, label } = getActivityIcon(act.type)
                        let detail = ''
                        if (act.details) {
                          try {
                            const d = JSON.parse(act.details)
                            detail = d.resourceName || d.targetName || d.message || ''
                          } catch { detail = act.details }
                        }
                        return (
                          <div key={act.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className={`size-8 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                              <ActIcon className="size-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">
                                <span className="font-medium">{act.userName || 'Someone'}</span>
                                {' '}
                                <span className="text-muted-foreground">{label}</span>
                                {detail && <span className="text-muted-foreground"> — <span className="text-primary/80">{detail}</span></span>}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(act.createdAt)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

      {/* ═══ SHARE RESOURCE DIALOG ═══ */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share Resource with Team</DialogTitle>
            <DialogDescription>Share a workflow, analysis, or project with your team members</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Resource Type</Label>
              <Select value={shareForm.resourceType} onValueChange={v => setShareForm(p => ({ ...p, resourceType: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="workflow">Workflow</SelectItem>
                  <SelectItem value="analysis">Analysis</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="benchmark_config">Benchmark Config</SelectItem>
                  <SelectItem value="template">Template</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Resource Name *</Label>
              <Input placeholder="e.g. Q4 Sales Analysis Pipeline" value={shareForm.resourceName} onChange={e => setShareForm(p => ({ ...p, resourceName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Resource ID (optional)</Label>
              <Input placeholder="e.g. clxyz123abc" value={shareForm.resourceId} onChange={e => setShareForm(p => ({ ...p, resourceId: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea placeholder="What is this resource about?" value={shareForm.description} onChange={e => setShareForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Permissions</Label>
              <div className="flex flex-wrap gap-2">
                {['view', 'edit', 'fork'].map(perm => {
                  const perms = JSON.parse(shareForm.permissions)
                  const active = perms.includes(perm)
                  return (
                    <button key={perm} onClick={() => {
                      const newPerms = active ? perms.filter((p: string) => p !== perm) : [...perms, perm]
                      setShareForm(p => ({ ...p, permissions: JSON.stringify(newPerms) }))
                    }} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${active ? 'bg-primary/15 text-primary border-primary/25' : 'bg-muted/30 text-muted-foreground border-border/30 hover:border-primary/20'}`}>
                      {perm.charAt(0).toUpperCase() + perm.slice(1)}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShareOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleShare} disabled={sharing || !shareForm.resourceName.trim()}>
              {sharing ? <Loader2 className="size-3 animate-spin mr-1" /> : <Share2 className="size-3 mr-1" />}
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ INVITE MEMBER DIALOG ═══ */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Send an invitation to join this team</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Email Address *</Label>
              <Input type="email" placeholder="colleague@company.com" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Select value={inviteForm.role} onValueChange={v => setInviteForm(p => ({ ...p, role: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Personal Message (optional)</Label>
              <Textarea placeholder="Hey, join our data science team!" value={inviteForm.message} onChange={e => setInviteForm(p => ({ ...p, message: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleInvite} disabled={inviting || !inviteForm.email.trim()}>
              {inviting ? <Loader2 className="size-3 animate-spin mr-1" /> : <Mail className="size-3 mr-1" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
