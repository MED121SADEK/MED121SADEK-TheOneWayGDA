'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Link2,
  Copy,
  Mail,
  Clock,
  MessageSquare,
  Download,
  FileText,
  Image,
  Share2,
  Eye,
  Edit,
  Lock,
  Calendar,
  Radio,
  Send,
  Check,
  QrCode,
  FileSpreadsheet,
  Layers,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

export interface AnalysisOutput {
  id: string
  title: string
  type: string
  content: any
  timestamp: string
}

export interface ShareReportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  outputs: AnalysisOutput[]
}

/* ═══════════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════════ */

const MOCK_COMMENTS = [
  {
    id: 'c1',
    author: 'Sarah Chen',
    initials: 'SC',
    time: '2 hours ago',
    text: 'The regression coefficients look significant. Have you considered checking for multicollinearity between the predictors?',
  },
  {
    id: 'c2',
    author: 'Mohammed Al-Rashid',
    initials: 'MR',
    time: '4 hours ago',
    text: 'Great descriptive stats output. The distribution skewness suggests we might need a transformation before running parametric tests.',
  },
  {
    id: 'c3',
    author: 'You',
    initials: 'YO',
    time: '6 hours ago',
    text: 'Added the correlation matrix. Strong positive correlation between variables X1 and X2 (r = 0.87). Needs investigation.',
  },
]

const MOCK_ACTIVITY = [
  {
    id: 'a1',
    icon: 'bar-chart',
    text: 'You ran Descriptive Statistics',
    time: '2 min ago',
    color: 'text-emerald-500',
  },
  {
    id: 'a2',
    icon: 'message',
    text: 'Mohammed commented on Regression',
    time: '15 min ago',
    color: 'text-amber-500',
  },
  {
    id: 'a3',
    icon: 'upload',
    text: 'You imported dataset.csv',
    time: '1 hour ago',
    color: 'text-sky-500',
  },
  {
    id: 'a4',
    icon: 'share',
    text: 'Analysis shared with team',
    time: '3 hours ago',
    color: 'text-violet-500',
  },
  {
    id: 'a5',
    icon: 'edit',
    text: 'Sarah edited correlation matrix',
    time: '5 hours ago',
    color: 'text-rose-500',
  },
  {
    id: 'a6',
    icon: 'download',
    text: 'You exported report as PDF',
    time: 'Yesterday',
    color: 'text-orange-500',
  },
]

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function generateShareId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

function ActivityIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'bar-chart':
      return <FileText className={className} />
    case 'message':
      return <MessageSquare className={className} />
    case 'upload':
      return <Download className={className} />
    case 'share':
      return <Share2 className={className} />
    case 'edit':
      return <Edit className={className} />
    case 'download':
      return <FileSpreadsheet className={className} />
    default:
      return <Clock className={className} />
  }
}

function getExpiryDate(days: number | null): string {
  if (!days) return 'Never expires'
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/* ═══════════════════════════════════════════════════════════════
   SHARE TAB
   ═══════════════════════════════════════════════════════════════ */

function ShareTab() {
  const [shareLink] = useState(() => `https://theoneway.app/analysis/${generateShareId()}`)
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<'view' | 'edit'>('view')
  const [expiry, setExpiry] = useState<string>('7')
  const [invites, setInvites] = useState<{ email: string; permission: string }[]>([])

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }, [shareLink])

  const handleSendInvite = useCallback(() => {
    if (!email.trim()) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address')
      return
    }
    setInvites(prev => [...prev, { email: email.trim(), permission }])
    toast.success(`Invite sent to ${email.trim()}`)
    setEmail('')
  }, [email, permission])

  const expiryDays = expiry === 'never' ? null : parseInt(expiry, 10)
  const expiryDate = getExpiryDate(expiryDays)

  return (
    <div className="space-y-5">
      {/* Shareable Link */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Shareable Link
        </Label>
        <div className="flex gap-2 mt-1.5">
          <div className="relative flex-1">
            <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              readOnly
              value={shareLink}
              className="h-9 text-xs pl-8 pr-3 font-mono bg-muted/30"
            />
          </div>
          <Button
            variant={copied ? 'default' : 'outline'}
            size="sm"
            className="h-9 gap-1.5 text-xs min-w-[90px]"
            onClick={handleCopyLink}
          >
            {copied ? (
              <><Check className="size-3.5" /> Copied!</>
            ) : (
              <><Copy className="size-3.5" /> Copy Link</>
            )}
          </Button>
        </div>
      </div>

      <Separator />

      {/* QR Code Placeholder */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          QR Code
        </Label>
        <div className="mt-1.5 flex items-center gap-4">
          <div className="size-28 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center bg-muted/20 gap-1.5 shrink-0">
            <QrCode className="size-8 text-muted-foreground/60" />
            <span className="text-[10px] text-muted-foreground font-medium">QR Code</span>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Scan this QR code to quickly open the shared analysis on any device.
            </p>
            <Badge variant="outline" className="text-[10px] gap-1">
              <Lock className="size-3" />
              Secure &amp; encrypted
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      {/* Email Invite */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Invite by Email
        </Label>
        <div className="flex gap-2 mt-1.5">
          <div className="relative flex-1">
            <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="colleague@university.edu"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
              className="h-9 text-xs pl-8"
            />
          </div>
          <Button
            size="sm"
            className="h-9 gap-1.5 text-xs min-w-[100px]"
            onClick={handleSendInvite}
            disabled={!email.trim()}
          >
            <Send className="size-3.5" /> Send Invite
          </Button>
        </div>
        {invites.length > 0 && (
          <div className="mt-2.5 space-y-1.5 max-h-24 overflow-y-auto">
            {invites.map((inv, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-muted/30 rounded-md px-2.5 py-1.5">
                <Check className="size-3 text-emerald-500 shrink-0" />
                <span className="truncate">{inv.email}</span>
                <Badge variant="outline" className="text-[10px] ml-auto shrink-0">
                  {inv.permission === 'view' ? (
                    <><Eye className="size-2.5 mr-0.5" /> Can View</>
                  ) : (
                    <><Edit className="size-2.5 mr-0.5" /> Can Edit</>
                  )}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Permissions & Expiry */}
      <div className="grid grid-cols-2 gap-4">
        {/* Permissions */}
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Permissions
          </Label>
          <RadioGroup
            value={permission}
            onValueChange={v => setPermission(v as 'view' | 'edit')}
            className="mt-1.5 space-y-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="view" id="perm-view" className="size-3.5" />
              <Label htmlFor="perm-view" className="text-xs font-normal cursor-pointer flex items-center gap-1.5">
                <Eye className="size-3.5 text-muted-foreground" /> Can View
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="edit" id="perm-edit" className="size-3.5" />
              <Label htmlFor="perm-edit" className="text-xs font-normal cursor-pointer flex items-center gap-1.5">
                <Edit className="size-3.5 text-muted-foreground" /> Can Edit
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Expiry */}
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <Calendar className="size-3 mr-1 inline" />
            Link Expiry
          </Label>
          <Select value={expiry} onValueChange={setExpiry}>
            <SelectTrigger className="h-9 text-xs w-full mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="never">Never</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
            <Clock className="size-3" />
            Expires: {expiryDate}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   EXPORT TAB
   ═══════════════════════════════════════════════════════════════ */

function ExportTab({ outputs }: { outputs: AnalysisOutput[] }) {
  const [exporting, setExporting] = useState<string | null>(null)

  const handleExport = useCallback(
    async (format: string) => {
      setExporting(format)
      // Simulate async export
      await new Promise(resolve => setTimeout(resolve, 1200))
      setExporting(null)
      toast.success(`Exported successfully as ${format.toUpperCase()}`)
    },
    []
  )

  const handleExportAll = useCallback(async () => {
    setExporting('all')
    await new Promise(resolve => setTimeout(resolve, 2000))
    setExporting(null)
    toast.success(`Exported ${outputs.length} outputs successfully`)
  }, [outputs.length])

  const exportOptions = [
    {
      id: 'pdf',
      label: 'Export as PDF',
      desc: 'Full analysis report with charts and tables',
      icon: FileText,
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/15',
    },
    {
      id: 'csv',
      label: 'Export as CSV',
      desc: 'Raw data tables in spreadsheet format',
      icon: FileSpreadsheet,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15',
    },
    {
      id: 'png',
      label: 'Export as PNG',
      desc: 'Chart snapshots for presentations',
      icon: Image,
      color: 'text-sky-500',
      bgColor: 'bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/15',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Individual export options */}
      <div className="grid gap-2.5">
        {exportOptions.map(opt => {
          const Icon = opt.icon
          const isLoading = exporting === opt.id
          return (
            <Card
              key={opt.id}
              className={`border transition-colors cursor-pointer ${opt.bgColor}`}
              onClick={() => !isLoading && handleExport(opt.id)}
            >
              <CardContent className="p-3.5 flex items-center gap-3">
                <div
                  className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${opt.bgColor} border`}
                >
                  {isLoading ? (
                    <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Icon className={`size-4 ${opt.color}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
                </div>
                <Download className={`size-4 text-muted-foreground shrink-0 ${isLoading ? 'opacity-0' : ''}`} />
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Separator />

      {/* Export all */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Layers className="size-4 text-muted-foreground" />
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bulk Export
          </Label>
        </div>
        <Card className="border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 transition-colors cursor-pointer"
          onClick={() => !exporting && handleExportAll()}
        >
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="size-9 rounded-lg flex items-center justify-center shrink-0 bg-violet-500/10 border border-violet-500/20">
              {exporting === 'all' ? (
                <div className="size-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="size-4 text-violet-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">Export All Outputs</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {outputs.length} output{outputs.length !== 1 ? 's' : ''} — full report as PDF
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0">
              PDF + CSV
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Output summary */}
      {outputs.length > 0 && (
        <>
          <Separator />
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Available Outputs
            </Label>
            <div className="mt-1.5 space-y-1 max-h-28 overflow-y-auto">
              {outputs.map((out, i) => (
                <div key={out.id} className="flex items-center gap-2 text-xs bg-muted/30 rounded-md px-2.5 py-1.5">
                  <Badge variant="secondary" className="text-[10px] w-5 h-5 justify-center p-0 shrink-0">
                    {i + 1}
                  </Badge>
                  <span className="truncate font-medium">{out.title}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto shrink-0">
                    {out.type}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   COMMENTS TAB
   ═══════════════════════════════════════════════════════════════ */

function CommentsTab({ outputs }: { outputs: AnalysisOutput[] }) {
  const [selectedOutput, setSelectedOutput] = useState(outputs[0]?.id || '')
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState(MOCK_COMMENTS)

  const handleSendComment = useCallback(() => {
    if (!commentText.trim()) return
    const newComment = {
      id: `c-${Date.now()}`,
      author: 'You',
      initials: 'YO',
      time: 'Just now',
      text: commentText.trim(),
    }
    setComments(prev => [newComment, ...prev])
    setCommentText('')
    toast.success('Comment added')
  }, [commentText])

  const selectedOutputTitle = outputs.find(o => o.id === selectedOutput)?.title

  return (
    <div className="space-y-4">
      {/* Output selector */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Commenting on
        </Label>
        <Select value={selectedOutput} onValueChange={setSelectedOutput}>
          <SelectTrigger className="h-9 text-xs w-full mt-1.5">
            <MessageSquare className="size-3.5 text-muted-foreground mr-1.5" />
            <SelectValue placeholder="Select an output..." />
          </SelectTrigger>
          <SelectContent>
            {outputs.map(out => (
              <SelectItem key={out.id} value={out.id} className="text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{out.type}</Badge>
                  {out.title}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedOutputTitle && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Showing comments for: <span className="font-medium text-foreground">{selectedOutputTitle}</span>
          </p>
        )}
      </div>

      <Separator />

      {/* Comment input */}
      <div>
        <div className="flex gap-2">
          <Textarea
            placeholder="Write a comment..."
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendComment()
            }}
            className="min-h-[60px] text-xs resize-none"
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground">
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Ctrl+Enter</kbd> to send
          </span>
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs px-3"
            onClick={handleSendComment}
            disabled={!commentText.trim()}
          >
            <Send className="size-3" /> Send
          </Button>
        </div>
      </div>

      <Separator />

      {/* Comments list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Comments ({comments.length})
          </Label>
          <Badge variant="secondary" className="text-[10px]">Latest</Badge>
        </div>
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {comments.map(comment => (
            <div
              key={comment.id}
              className="flex gap-2.5 bg-muted/20 rounded-lg p-3 border border-border/50 hover:bg-muted/30 transition-colors"
            >
              {/* Avatar */}
              <div className="size-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-[11px] font-bold text-white">{comment.initials}</span>
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold">{comment.author}</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="size-2.5" />
                    {comment.time}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{comment.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ACTIVITY TAB
   ═══════════════════════════════════════════════════════════════ */

function ActivityTab() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Activity
        </Label>
        <Badge variant="outline" className="text-[10px] gap-1">
          <Radio className="size-2.5" />
          Live
        </Badge>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-0.5">
          {MOCK_ACTIVITY.map((activity, i) => (
            <div key={activity.id} className="flex items-start gap-3 py-2 group">
              {/* Icon circle */}
              <div className="size-[31px] rounded-full bg-background border border-border flex items-center justify-center shrink-0 z-10 group-hover:border-primary/30 transition-colors">
                <ActivityIcon
                  type={activity.icon}
                  className={`size-3.5 ${activity.color}`}
                />
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-xs leading-relaxed">{activity.text}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                  <Clock className="size-2.5" />
                  {activity.time}
                </p>
              </div>
              {/* Dot */}
              {i === 0 && (
                <Badge className="text-[9px] bg-emerald-500 text-white border-0 shrink-0">
                  New
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="text-center py-2">
        <p className="text-[11px] text-muted-foreground">
          Showing recent activity from this session
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export function ShareReport({ open, onOpenChange, outputs }: ShareReportProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Share2 className="size-4.5 text-primary" />
            Share Analysis &amp; Export Report
          </DialogTitle>
          <DialogDescription className="text-xs">
            Share your analysis with collaborators or export results in multiple formats.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <Tabs defaultValue="share" className="w-full">
          <div className="px-5 pb-3">
            <TabsList className="w-full h-9 grid grid-cols-4">
              <TabsTrigger value="share" className="gap-1.5 text-xs">
                <Link2 className="size-3.5" />
                <span className="hidden sm:inline">Share</span>
              </TabsTrigger>
              <TabsTrigger value="export" className="gap-1.5 text-xs">
                <Download className="size-3.5" />
                <span className="hidden sm:inline">Export</span>
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-1.5 text-xs">
                <MessageSquare className="size-3.5" />
                <span className="hidden sm:inline">Comments</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5 text-xs">
                <Clock className="size-3.5" />
                <span className="hidden sm:inline">Activity</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab content with scrolling */}
          <div className="max-h-[420px] overflow-y-auto px-5 pb-5">
            <TabsContent value="share" className="mt-0">
              <ShareTab />
            </TabsContent>

            <TabsContent value="export" className="mt-0">
              <ExportTab outputs={outputs} />
            </TabsContent>

            <TabsContent value="comments" className="mt-0">
              <CommentsTab outputs={outputs} />
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <ActivityTab />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default ShareReport
