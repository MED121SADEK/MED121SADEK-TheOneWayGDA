'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, MessageSquare, Clock, Radio, Send, UserPlus,
  Plus, ChevronRight, Reply, RotateCcw, Eye, Edit,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

/* ─── animation helpers (same patterns as page.tsx) ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' as const },
  }),
}
const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
}

/* ─── mock data ─── */

const AVATAR_COLORS = [
  'bg-emerald-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-fuchsia-600',
]

type Role = 'Owner' | 'Editor' | 'Viewer'

interface TeamMember {
  id: string
  name: string
  email: string
  initials: string
  role: Role
  online: boolean
  avatarColor: string
}

const mockMembers: TeamMember[] = [
  { id: '1', name: 'Sarah Chen', email: 'sarah@oneway.io', initials: 'SC', role: 'Owner', online: true, avatarColor: AVATAR_COLORS[0] },
  { id: '2', name: 'Marcus Rivera', email: 'marcus@oneway.io', initials: 'MR', role: 'Editor', online: true, avatarColor: AVATAR_COLORS[1] },
  { id: '3', name: 'Aiko Tanaka', email: 'aiko@oneway.io', initials: 'AT', role: 'Editor', online: false, avatarColor: AVATAR_COLORS[2] },
  { id: '4', name: 'James O\'Brien', email: 'james@oneway.io', initials: 'JO', role: 'Viewer', online: true, avatarColor: AVATAR_COLORS[3] },
]

interface Comment {
  id: string
  author: string
  initials: string
  avatarColor: string
  timestamp: string
  text: string
  replies?: Comment[]
}

const mockComments: Comment[] = [
  {
    id: 'c1',
    author: 'Sarah Chen',
    initials: 'SC',
    avatarColor: AVATAR_COLORS[0],
    timestamp: '2 hours ago',
    text: 'The regression output for the income vs. education model looks solid — R² of 0.73 is quite strong. Should we also control for age?',
    replies: [
      {
        id: 'c1r1',
        author: 'Marcus Rivera',
        initials: 'MR',
        avatarColor: AVATAR_COLORS[1],
        timestamp: '1 hour ago',
        text: 'Good catch. I added `age` as a covariate and the adjusted R² only moved to 0.74, so multicollinearity isn\'t a major concern here.',
      },
    ],
  },
  {
    id: 'c2',
    author: 'Aiko Tanaka',
    initials: 'AT',
    avatarColor: AVATAR_COLORS[2],
    timestamp: '45 min ago',
    text: 'Quick note: the descriptive stats table shows 12 missing values in the `employment_status` column. We might want to handle those before running the ANOVA.',
  },
  {
    id: 'c3',
    author: 'James O\'Brien',
    initials: 'JO',
    avatarColor: AVATAR_COLORS[3],
    timestamp: '20 min ago',
    text: 'I exported the correlation matrix to CSV — the strong negative correlation between `debt` and `savings` (-0.68) matches our hypothesis perfectly.',
  },
]

interface HistoryEntry {
  id: string
  timestamp: string
  author: string
  initials: string
  avatarColor: string
  action: string
  detail: string
}

const mockHistory: HistoryEntry[] = [
  { id: 'h1', timestamp: 'Today, 3:42 PM', author: 'Sarah Chen', initials: 'SC', avatarColor: AVATAR_COLORS[0], action: 'Ran regression analysis', detail: 'income ~ education + age + experience' },
  { id: 'h2', timestamp: 'Today, 3:28 PM', author: 'Marcus Rivera', initials: 'MR', avatarColor: AVATAR_COLORS[1], action: 'Added variable', detail: 'experience (numeric, 486 values)' },
  { id: 'h3', timestamp: 'Today, 2:15 PM', author: 'Aiko Tanaka', initials: 'AT', avatarColor: AVATAR_COLORS[2], action: 'Imported dataset', detail: 'survey_responses_v3.csv (500 rows × 12 columns)' },
  { id: 'h4', timestamp: 'Today, 1:50 PM', author: 'Sarah Chen', initials: 'SC', avatarColor: AVATAR_COLORS[0], action: 'Ran descriptive statistics', detail: 'income, education, age, savings' },
  { id: 'h5', timestamp: 'Yesterday, 5:10 PM', author: 'Marcus Rivera', initials: 'MR', avatarColor: AVATAR_COLORS[1], action: 'Removed 4 rows', detail: 'Duplicate entries detected in survey data' },
  { id: 'h6', timestamp: 'Yesterday, 4:30 PM', author: 'Sarah Chen', initials: 'SC', avatarColor: AVATAR_COLORS[0], action: 'Created workspace', detail: 'Consumer Income Analysis — Project #A-1087' },
]

/* ─── sub-components ─── */

function Avatar({ initials, color, size = 'md', pulse = false }: { initials: string; color: string; size?: 'sm' | 'md'; pulse?: boolean }) {
  const sizeClass = size === 'sm' ? 'size-6 text-[10px]' : 'size-8 text-xs'
  return (
    <div className="relative flex-shrink-0">
      {pulse && (
        <span className="absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
      )}
      <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center font-semibold text-white select-none`}>
        {initials}
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: Role }) {
  const variantMap: Record<Role, { label: string; className: string }> = {
    Owner: { label: 'Owner', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
    Editor: { label: 'Editor', className: 'bg-violet-500/15 text-violet-400 border-violet-500/25' },
    Viewer: { label: 'Viewer', className: 'bg-muted/60 text-muted-foreground border-border/50' },
  }
  const v = variantMap[role]
  return <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full border ${v.className}`}>{v.label}</span>
}

/* ─── Live editing indicator ─── */

function LiveIndicator({ members }: { members: TeamMember[] }) {
  const activeMembers = members.filter(m => m.online)
  return (
    <motion.div
      variants={fadeUp}
      custom={0}
      initial="hidden"
      animate="visible"
      className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/15"
    >
      <div className="flex items-center gap-1.5">
        <Radio className="size-3.5 text-emerald-400 animate-pulse" />
        <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Live</span>
      </div>
      <div className="flex items-center gap-1">
        {activeMembers.map((m) => (
          <div key={m.id} className="relative">
            <div className={`${m.avatarColor} size-6 rounded-full flex items-center justify-center text-[9px] font-semibold text-white ring-2 ring-background`}>
              {m.initials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 size-2 bg-emerald-400 rounded-full border border-background animate-pulse" />
          </div>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        <span className="text-emerald-400 font-medium">{activeMembers.length}</span> users editing now
      </span>
    </motion.div>
  )
}

/* ─── Team tab ─── */

function TeamTab() {
  const [inviteEmail, setInviteEmail] = useState('')

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      {/* Invite member */}
      <motion.div variants={fadeUp} custom={0}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <UserPlus className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Invite by email..."
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="h-8 text-xs pl-8 bg-card/50 border-primary/15 focus:border-primary/30"
            />
          </div>
          <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90 gap-1.5">
            <Send className="size-3" />
            Invite
          </Button>
        </div>
      </motion.div>

      <Separator className="opacity-40" />

      {/* Members list */}
      <ScrollArea className="max-h-64">
        <div className="space-y-1.5 pr-2">
          {mockMembers.map((member, i) => (
            <motion.div
              key={member.id}
              variants={fadeUp}
              custom={i + 1}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-card/40 border border-primary/10 hover:border-primary/25 hover:bg-card/60 transition-all cursor-default group"
            >
              <Avatar initials={member.initials} color={member.avatarColor} pulse={member.online} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{member.name}</span>
                  {member.online && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Online
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
              </div>
              <RoleBadge role={member.role} />
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </Button>
            </motion.div>
          ))}
        </div>
      </ScrollArea>

      {/* Quick stats */}
      <motion.div variants={fadeUp} custom={6} className="grid grid-cols-3 gap-2 pt-1">
        <div className="text-center p-2 rounded-lg bg-card/30 border border-border/30">
          <p className="text-sm font-semibold text-foreground">{mockMembers.length}</p>
          <p className="text-[10px] text-muted-foreground">Members</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-card/30 border border-border/30">
          <p className="text-sm font-semibold text-emerald-400">{mockMembers.filter(m => m.online).length}</p>
          <p className="text-[10px] text-muted-foreground">Online</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-card/30 border border-border/30">
          <p className="text-sm font-semibold text-violet-400">{mockMembers.filter(m => m.role === 'Editor').length}</p>
          <p className="text-[10px] text-muted-foreground">Editors</p>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Comments tab ─── */

function CommentItem({ comment, depth = 0 }: { comment: Comment; depth?: number }) {
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const indent = depth > 0 ? 'ml-8' : ''

  return (
    <motion.div variants={fadeUp} custom={0} className={`${indent} space-y-2`}>
      <div className="flex gap-2.5">
        <Avatar initials={comment.initials} color={comment.avatarColor} size="sm" />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">{comment.author}</span>
            <span className="text-[10px] text-muted-foreground">{comment.timestamp}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{comment.text}</p>
          <div className="flex items-center gap-3 pt-0.5">
            <button
              onClick={() => setShowReply(!showReply)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Reply className="size-3" />
              Reply
            </button>
          </div>

          {/* Reply input */}
          <AnimatePresence>
            {showReply && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 pt-1.5">
                  <Input
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="h-7 text-[11px] bg-card/50 border-primary/10 focus:border-primary/25"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="h-7 w-7 p-0 bg-primary hover:bg-primary/90"
                    onClick={() => { setReplyText(''); setShowReply(false) }}
                  >
                    <Send className="size-3" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3 border-l border-primary/10 pl-4 ml-1">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </motion.div>
  )
}

function CommentsTab() {
  const [newComment, setNewComment] = useState('')

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Context badge */}
      <motion.div variants={fadeUp} custom={0}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MessageSquare className="size-3.5" />
          <span>
            <span className="font-medium text-foreground">{mockComments.length}</span> comments on{' '}
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-primary/20 text-primary/80">
              Regression Analysis — income model
            </Badge>
          </span>
        </div>
      </motion.div>

      <Separator className="opacity-40" />

      {/* Comment thread */}
      <ScrollArea className="max-h-72">
        <motion.div variants={stagger} className="space-y-4 pr-2">
          {mockComments.map((comment, i) => (
            <motion.div key={comment.id} variants={fadeUp} custom={i + 1}>
              <CommentItem comment={comment} />
              {i < mockComments.length - 1 && <Separator className="mt-4 opacity-30" />}
            </motion.div>
          ))}
        </motion.div>
      </ScrollArea>

      {/* Add comment */}
      <motion.div variants={fadeUp} custom={5}>
        <Separator className="opacity-40 mb-3" />
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder="Add a comment about this analysis..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="h-8 text-xs pr-20 bg-card/50 border-primary/15 focus:border-primary/30"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-3" />
              </Button>
              <Button size="sm" className="h-6 px-2 text-[10px] bg-primary hover:bg-primary/90 gap-1">
                <Send className="size-2.5" />
                Post
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── History tab ─── */

function HistoryTab() {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-1"
    >
      <ScrollArea className="max-h-80">
        <div className="relative pr-3">
          {/* Timeline line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/30 via-primary/15 to-transparent" />

          <div className="space-y-3">
            {mockHistory.map((entry, i) => (
              <motion.div
                key={entry.id}
                variants={fadeUp}
                custom={i}
                className="relative flex gap-3 pl-1 group"
              >
                {/* Timeline dot */}
                <div className="relative z-10 mt-1.5 flex-shrink-0">
                  <div className={`${i === 0 ? 'bg-primary ring-4 ring-primary/15' : 'bg-muted-foreground/40'} size-[10px] rounded-full`} />
                </div>

                {/* Content card */}
                <div className="flex-1 p-2.5 rounded-lg bg-card/40 border border-primary/10 hover:border-primary/25 hover:bg-card/60 transition-all min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-foreground">{entry.action}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate font-mono">{entry.detail}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Avatar initials={entry.initials} color={entry.avatarColor} size="sm" />
                        <span className="text-[10px] text-muted-foreground">{entry.author}</span>
                        <span className="text-[10px] text-muted-foreground/60">·</span>
                        <span className="text-[10px] text-muted-foreground/60">{entry.timestamp}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 gap-1"
                    >
                      <RotateCcw className="size-3" />
                      Restore
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Footer summary */}
      <motion.div variants={fadeUp} custom={6} className="pt-2">
        <Separator className="opacity-40 mb-2" />
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{mockHistory.length} revisions in this session</span>
          <button className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors">
            View full history
            <ChevronRight className="size-3" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Main export ─── */

type CollabTab = 'team' | 'comments' | 'history'

const TAB_CONFIG: { key: CollabTab; icon: typeof Users; label: string }[] = [
  { key: 'team', icon: Users, label: 'Team' },
  { key: 'comments', icon: MessageSquare, label: 'Comments' },
  { key: 'history', icon: Clock, label: 'History' },
]

export function CollaborationPanel() {
  const [activeTab, setActiveTab] = useState<CollabTab>('team')

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/30 transition-all shadow-lg">
      <CardHeader className="pb-0 gap-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Collaboration</h3>
          </div>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-primary/20 text-primary/80">
            <Eye className="size-2.5 mr-1" />
            Workspace shared
          </Badge>
        </div>

        {/* Live indicator */}
        <LiveIndicator members={mockMembers} />

        {/* Tab bar (same pattern as workspace tab bar) */}
        <div className="flex items-center gap-1 pt-1">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <tab.icon className="size-3.5" />
              {tab.label}
              {tab.key === 'comments' && (
                <span className="size-4 rounded-full bg-primary/15 text-primary text-[10px] flex items-center justify-center font-medium">
                  {mockComments.length}
                </span>
              )}
              {tab.key === 'history' && (
                <span className="size-4 rounded-full bg-muted/60 text-muted-foreground text-[10px] flex items-center justify-center font-medium">
                  {mockHistory.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <AnimatePresence mode="wait">
          {activeTab === 'team' && (
            <motion.div
              key="team"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <TeamTab />
            </motion.div>
          )}
          {activeTab === 'comments' && (
            <motion.div
              key="comments"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <CommentsTab />
            </motion.div>
          )}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <HistoryTab />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
