'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  ArrowLeft, Heart, MessageCircle, Bookmark, Repeat2, Share2,
  ExternalLink, Trash2, Send, Clock, Tag, TrendingUp, Link2,
  Loader2, Check, Copy, Mail, Sparkles, Newspaper, Users, Award,
  FileText, Eye, BadgeCheck, MoreHorizontal,
} from 'lucide-react'

/* ─── Types ─── */
interface Post {
  id: string
  type: string
  title: string
  content: string
  author: string
  authorName?: string | null
  imageUrl?: string | null
  sourceUrl?: string | null
  sourceName?: string | null
  tags?: string | null
  likes: number
  comments: number
  reposts: number
  saves: number
  featured: boolean
  createdAt: string
  updatedAt: string
}

interface Comment {
  id: string
  postId: string
  author: string
  authorName?: string | null
  content: string
  createdAt: string
}

interface VerifiedInfo {
  email: string
  displayName: string
  institution?: string | null
  role?: string | null
  badgeType: string
  bio?: string | null
  websiteUrl?: string | null
}

function getSession(): { email: string; name: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const s = localStorage.getItem('oneway-visitor-session')
    if (!s) return null
    return JSON.parse(s)
  } catch { return null }
}

function timeAgo(date: string): string {
  const now = Date.now()
  const d = new Date(date).getTime()
  const diff = now - d
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return []
  try { return JSON.parse(tags) } catch { return [] }
}

function getPostTypeInfo(type: string): { label: string; icon: any; bg: string; border: string; text: string } {
  switch (type) {
    case 'auto':
      return { label: 'Auto-Published', icon: Sparkles, bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' }
    case 'digest':
      return { label: 'Daily Digest', icon: FileText, bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400' }
    case 'user_highlight':
      return { label: 'Community Pick', icon: Award, bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' }
    case 'news':
      return { label: 'AI News', icon: Newspaper, bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400' }
    default:
      return { label: 'Community', icon: Users, bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' }
  }
}

function getBadgeColor(badgeType: string) {
  switch (badgeType) {
    case 'bot': return { border: 'rgba(99,102,241,0.4)', bg: 'rgba(99,102,241,0.1)', color: '#818cf8', label: 'Bot' }
    case 'institution': return { border: 'rgba(168,85,247,0.4)', bg: 'rgba(168,85,247,0.1)', color: '#c084fc', label: 'Institution' }
    case 'official': return { border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.1)', color: '#60a5fa', label: 'Official' }
    default: return { border: 'rgba(16,185,129,0.4)', bg: 'rgba(16,185,129,0.1)', color: '#34d399', label: 'Verified' }
  }
}

/* ─── MAIN PAGE ─── */
export default function PostDetailPage() {
  const { t, locale, dir } = useTranslation()
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string
  const session = getSession()

  // Post state
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Interaction state
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [hasReposted, setHasReposted] = useState(false)

  // Comments
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  // Verified researcher
  const [verifiedInfo, setVerifiedInfo] = useState<VerifiedInfo | null>(null)

  // Related posts
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([])

  // Share dialog
  const [shareOpen, setShareOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)

  /* ─── Fetch Post ─── */
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/community/posts/${postId}`)
        if (!res.ok) {
          setError('Post not found')
          return
        }
        const data = await res.json()
        setPost(data.post)
      } catch {
        setError('Failed to load post')
      } finally {
        setLoading(false)
      }
    }
    fetchPost()
  }, [postId])

  /* ─── Fetch Interaction State ─── */
  useEffect(() => {
    if (!session || !postId) return
    const fetchInteractions = async () => {
      try {
        const res = await fetch(`/api/community/posts/${postId}/interact?visitorId=${session.email}`)
        const data = await res.json()
        setIsLiked(data.liked || false)
        setIsSaved(data.saved || false)
      } catch { /* silent */ }
    }
    fetchInteractions()
  }, [postId, session])

  /* ─── Fetch Verified Researcher ─── */
  useEffect(() => {
    if (!post?.author) return
    const fetchVerified = async () => {
      try {
        const res = await fetch(`/api/community/verified?email=${post.author}`)
        const data = await res.json()
        if (data.researchers && data.researchers.length > 0) {
          setVerifiedInfo(data.researchers[0])
        }
      } catch { /* silent */ }
    }
    fetchVerified()
  }, [post?.author])

  /* ─── Fetch Comments ─── */
  const fetchComments = useCallback(async () => {
    if (!postId) return
    setCommentsLoading(true)
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`)
      const data = await res.json()
      setComments(data.comments || [])
    } catch { /* silent */ }
    setCommentsLoading(false)
  }, [postId])

  useEffect(() => { fetchComments() }, [fetchComments])

  /* ─── Fetch Related Posts ─── */
  useEffect(() => {
    if (!post) return
    const fetchRelated = async () => {
      try {
        const tags = parseTags(post.tags)
        const searchQuery = post.title.split(' ').slice(0, 3).join(' ')
        const params = new URLSearchParams({
          limit: '5',
          sort: 'popular',
          search: searchQuery,
        })
        const res = await fetch(`/api/community/posts?${params}`)
        const data = await res.json()
        const related = data.posts.filter((p: Post) => p.id !== post.id).slice(0, 4)
        setRelatedPosts(related)
      } catch { /* silent */ }
    }
    fetchRelated()
  }, [post])

  /* ─── Actions ─── */
  const handleLike = async () => {
    if (!session) return
    const action = isLiked ? 'unlike' : 'like'
    setIsLiked(!isLiked)
    setPost(prev => prev ? { ...prev, likes: prev.likes + (isLiked ? -1 : 1) } : null)
    try {
      await fetch(`/api/community/posts/${postId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: session.email, action }),
      })
    } catch { /* revert */ }
  }

  const handleSave = async () => {
    if (!session) return
    const action = isSaved ? 'unsave' : 'save'
    setIsSaved(!isSaved)
    setPost(prev => prev ? { ...prev, saves: prev.saves + (isSaved ? -1 : 1) } : null)
    try {
      await fetch(`/api/community/posts/${postId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: session.email, action }),
      })
    } catch { /* revert */ }
  }

  const handleRepost = async () => {
    if (!session || hasReposted) return
    setHasReposted(true)
    setPost(prev => prev ? { ...prev, reposts: prev.reposts + 1 } : null)
    try {
      await fetch(`/api/community/posts/${postId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: session.email, action: 'repost' }),
      })
    } catch { /* revert */ }
  }

  const handleDelete = async () => {
    if (!session || !post || session.email !== post.author) return
    try {
      const res = await fetch(`/api/community/posts/${postId}?author=${session.email}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/community')
      }
    } catch { /* silent */ }
  }

  /* ─── Comments ─── */
  const submitComment = async () => {
    if (!session || !commentText.trim()) return
    setCommentSubmitting(true)
    const optimisticComment: Comment = {
      id: 'temp-' + Date.now(),
      postId,
      author: session.email,
      authorName: session.name,
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
    }
    setComments(prev => [optimisticComment, ...prev])
    setPost(prev => prev ? { ...prev, comments: prev.comments + 1 } : null)
    setCommentText('')
    try {
      await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: session.email,
          authorName: session.name,
          content: commentText.trim(),
        }),
      })
      fetchComments()
    } catch { /* silent */ }
    setCommentSubmitting(false)
  }

  const submitReply = async (parentId: string) => {
    if (!session || !replyText.trim()) return
    const optimisticComment: Comment = {
      id: 'temp-' + Date.now(),
      postId,
      author: session.email,
      authorName: session.name,
      content: replyText.trim(),
      createdAt: new Date().toISOString(),
    }
    setComments(prev => {
      const idx = prev.findIndex(c => c.id === parentId)
      if (idx >= 0) {
        const updated = [...prev]
        updated.splice(idx + 1, 0, optimisticComment)
        return updated
      }
      return [...prev, optimisticComment]
    })
    setPost(prev => prev ? { ...prev, comments: prev.comments + 1 } : null)
    setReplyText('')
    setReplyingTo(null)
    try {
      await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: session.email,
          authorName: session.name,
          content: replyText.trim(),
          parentId,
        }),
      })
      fetchComments()
    } catch { /* silent */ }
  }

  /* ─── Share ─── */
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/community/${postId}`)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleShareEmail = () => {
    if (!post || !shareEmail.trim()) return
    const subject = encodeURIComponent(`Check this out: ${post.title}`)
    const body = encodeURIComponent(
      `I thought you'd find this interesting:\n\n${post.title}\n\n${post.sourceUrl || `${window.location.origin}/community/${postId}`}\n\n- Shared from TheOneWayGDA`
    )
    window.open(`mailto:${shareEmail.trim()}?subject=${subject}&body=${body}`)
    setShareEmail('')
    setShareOpen(false)
  }

  /* ─── Loading / Error ─── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col mesh-gradient noise-overlay" dir={dir}>
        <nav className="sticky top-0 z-50 nav-premium">
          <div className="max-w-4xl mx-auto flex items-center px-4 sm:px-6 h-14 gap-3">
            <Link href="/community" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
            </Link>
            <span className="text-sm text-muted-foreground">Loading post...</span>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-10 text-primary animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col mesh-gradient noise-overlay" dir={dir}>
        <nav className="sticky top-0 z-50 nav-premium">
          <div className="max-w-4xl mx-auto flex items-center px-4 sm:px-6 h-14 gap-3">
            <Link href="/community" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
            </Link>
            <span className="text-sm text-muted-foreground">Back to Community</span>
          </div>
        </nav>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <Newspaper className="size-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">{error || 'Post not found'}</h2>
          <p className="text-sm text-muted-foreground/70 mb-6">This post may have been deleted or doesn&apos;t exist.</p>
          <Link href="/community">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="size-4" />
              Back to Community
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const postTypeInfo = getPostTypeInfo(post.type)
  const tags = parseTags(post.tags)
  const badgeColor = verifiedInfo ? getBadgeColor(verifiedInfo.badgeType) : null

  return (
    <div className="min-h-screen flex flex-col mesh-gradient noise-overlay" dir={dir}>
      {/* NAV */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
              <span className="text-sm hidden sm:inline">Back</span>
            </button>
            <Separator orientation="vertical" className="h-5" />
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={24} height={24} className="rounded-lg" />
            <span className="text-sm font-semibold gradient-text-premium">Post</span>
          </div>
          <div className="flex items-center gap-2">
            {session && session.email === post.author && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} className="gap-1.5 text-xs">
              <Share2 className="size-3.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Post Type Badge */}
          <div className="mb-4">
            <Badge variant="outline" className={`${postTypeInfo.bg} ${postTypeInfo.border} ${postTypeInfo.text} gap-1.5 text-xs border`}>
              <postTypeInfo.icon className="size-3" />
              {postTypeInfo.label}
            </Badge>
            {post.featured && (
              <Badge variant="outline" className="ml-2 text-xs bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1">
                <TrendingUp className="size-3" />
                Featured
              </Badge>
            )}
          </div>

          {/* Post Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0">
                {verifiedInfo ? (
                  <span className="text-sm font-bold text-primary">
                    {(verifiedInfo.displayName || verifiedInfo.email)[0].toUpperCase()}
                  </span>
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">
                    {(post.authorName || post.author)[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Link href={`/profile/${encodeURIComponent(post.author)}`} className="hover:underline">
                    <span className="text-sm font-semibold">
                      {verifiedInfo ? verifiedInfo.displayName : (post.authorName || post.author.split('@')[0])}
                    </span>
                  </Link>
                  {badgeColor && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        border: `1px solid ${badgeColor.border}`,
                        backgroundColor: badgeColor.bg,
                        color: badgeColor.color,
                      }}
                      title={
                        verifiedInfo?.institution
                          ? `${badgeColor.label === 'Bot' ? 'Official Bot' : badgeColor.label} — ${verifiedInfo.institution}${verifiedInfo.role ? ` · ${verifiedInfo.role}` : ''}`
                          : badgeColor.label
                      }
                    >
                      <BadgeCheck className="size-2.5" />
                      {badgeColor.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{timeAgo(post.createdAt)}</span>
                  <span className="inline-block size-1 rounded-full bg-muted-foreground/40" />
                  <Clock className="size-3" />
                  <span>{new Date(post.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Source link */}
            {post.sourceUrl && (
              <a
                href={post.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline flex-shrink-0"
              >
                <ExternalLink className="size-3" />
                {post.sourceName || 'Source'}
              </a>
            )}
          </div>

          {/* Post Title */}
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-4">
            {post.title}
          </h1>

          {/* Post Content — FULL, no truncation */}
          <div className="max-w-none mb-6">
            <div className="text-sm sm:text-base text-foreground/90 leading-relaxed">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-semibold mt-5 mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-1">{children}</h3>,
                h4: ({ children }) => <h4 className="text-sm font-semibold mt-3 mb-1">{children}</h4>,
                code: ({ className, children }) => {
                  const isBlock = /\n/.test(String(children))
                  if (isBlock) {
                    return <pre className="bg-muted rounded-lg p-3 text-sm font-mono overflow-x-auto mt-3 mb-3"><code>{children}</code></pre>
                  }
                  return <code className="bg-muted rounded px-1.5 py-0.5 text-sm font-mono">{children}</code>
                },
                pre: ({ children }) => <pre className="bg-muted rounded-lg p-3 text-sm font-mono overflow-x-auto mt-3 mb-3">{children}</pre>,
                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{children}</a>,
                ul: ({ children }) => <ul className="list-disc pl-6 mt-2 mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-6 mt-2 mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                blockquote: ({ children }) => <blockquote className="border-l-3 border-border pl-4 italic text-muted-foreground my-3">{children}</blockquote>,
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                hr: () => <hr className="border-border my-4" />,
                table: ({ children }) => <div className="overflow-x-auto my-3"><table className="w-full text-sm border-collapse">{children}</table></div>,
                th: ({ children }) => <th className="border border-border px-3 py-2 bg-muted font-semibold text-left">{children}</th>,
                td: ({ children }) => <td className="border border-border px-3 py-2">{children}</td>,
              }}
            >
              {post.content}
            </ReactMarkdown>
            </div>
          </div>

          {/* Post Image */}
          {post.imageUrl && (
            <div className="mb-6 rounded-xl overflow-hidden border border-border/30">
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full max-h-[500px] object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {tags
                .filter(tag => !['Hidden', 'Flagged'].includes(tag))
                .map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[10px] gap-1 px-2 py-0.5">
                    <Tag className="size-2.5" />
                    {tag}
                  </Badge>
                ))}
            </div>
          )}

          {/* Engagement Stats Bar */}
          <div className="flex items-center gap-5 px-4 py-3 rounded-xl bg-card/60 border border-border/20 text-xs text-muted-foreground mb-6">
            <span className="flex items-center gap-1.5">
              <Eye className="size-3.5" />
              <span className="font-medium text-foreground">{post.likes + post.comments + post.reposts}</span> views
            </span>
            <span className="flex items-center gap-1.5">
              <Heart className="size-3.5 text-rose-400" />
              <span className="font-medium text-foreground">{post.likes}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="size-3.5 text-blue-400" />
              <span className="font-medium text-foreground">{post.comments}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Repeat2 className="size-3.5 text-emerald-400" />
              <span className="font-medium text-foreground">{post.reposts}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Bookmark className="size-3.5 text-amber-400" />
              <span className="font-medium text-foreground">{post.saves}</span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mb-8">
            <Button
              variant={isLiked ? 'default' : 'outline'}
              size="sm"
              onClick={handleLike}
              className={`gap-2 rounded-full text-sm ${isLiked ? 'bg-rose-500/90 hover:bg-rose-600 text-white border-rose-500' : ''}`}
            >
              <Heart className={`size-4 ${isLiked ? 'fill-current' : ''}`} />
              {post.likes > 0 && post.likes}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="gap-2 rounded-full text-sm"
            >
              <MessageCircle className="size-4" />
              {post.comments > 0 && post.comments}
            </Button>
            <Button
              variant={hasReposted ? 'default' : 'outline'}
              size="sm"
              onClick={handleRepost}
              disabled={hasReposted}
              className={`gap-2 rounded-full text-sm ${hasReposted ? 'bg-emerald-500/90 hover:bg-emerald-600 text-white border-emerald-500' : ''}`}
            >
              <Repeat2 className={`size-4 ${hasReposted ? '' : ''}`} />
              {post.reposts > 0 && post.reposts}
            </Button>
            <Button
              variant={isSaved ? 'default' : 'outline'}
              size="sm"
              onClick={handleSave}
              className={`gap-2 rounded-full text-sm ${isSaved ? 'bg-amber-500/90 hover:bg-amber-600 text-white border-amber-500' : ''}`}
            >
              <Bookmark className={`size-4 ${isSaved ? 'fill-current' : ''}`} />
              {post.saves > 0 && post.saves}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareOpen(true)}
              className="gap-2 rounded-full text-sm"
            >
              <Share2 className="size-4" />
            </Button>
          </div>

          {/* Source URL Card */}
          {post.sourceUrl && (
            <a
              href={post.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all mb-8"
            >
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ExternalLink className="size-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {post.sourceName || 'Read the full article'}
                </p>
                <p className="text-xs text-muted-foreground truncate">{post.sourceUrl}</p>
              </div>
              <BadgeCheck className="size-4 text-primary/50 flex-shrink-0" />
            </a>
          )}

          <Separator className="mb-8" />

          {/* Comments Section */}
          <div id="comments-section" className="scroll-mt-20">
            <div className="flex items-center gap-2 mb-6">
              <MessageCircle className="size-5 text-blue-400" />
              <h2 className="text-lg font-semibold">Comments</h2>
              <Badge variant="secondary" className="text-xs">{post.comments}</Badge>
            </div>

            {/* Comment Input */}
            {session ? (
              <div className="mb-6">
                <div className="flex gap-3">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs font-bold text-primary">{session.name[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1">
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Share your thoughts on this post..."
                      rows={3}
                      maxLength={2000}
                      className="rounded-xl resize-none text-sm mb-2"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{commentText.length}/2,000</span>
                      <Button
                        size="sm"
                        onClick={submitComment}
                        disabled={!commentText.trim() || commentSubmitting}
                        className="gap-1.5 rounded-full text-xs"
                      >
                        {commentSubmitting ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Send className="size-3" />
                        )}
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 rounded-xl border border-border/30 bg-muted/20 text-center">
                <p className="text-sm text-muted-foreground">
                  <Link href="/auth/login" className="text-primary hover:underline font-medium">Sign in</Link>
                  {' '}to join the conversation.
                </p>
              </div>
            )}

            {/* Comments List */}
            {commentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 text-muted-foreground animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <MessageCircle className="size-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium mb-1">No comments yet</p>
                <p className="text-xs text-muted-foreground/70">Be the first to share your thoughts on this post.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {comments.map((comment, i) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex gap-3 p-3 rounded-xl bg-card/40 border border-border/20 hover:border-border/40 transition-colors"
                    >
                      <div className="size-8 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-muted-foreground">
                          {(comment.authorName || comment.author)[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold">
                            {comment.authorName || comment.author.split('@')[0]}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(comment.createdAt)}</span>
                        </div>
                        <div className="text-sm text-foreground/85 leading-relaxed">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="m-0">{children}</p>,
                            code: ({ children }) => <code className="bg-muted rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
                            a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{children}</a>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            ul: ({ children }) => <ul className="list-disc pl-5 mt-1 mb-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-5 mt-1 mb-1">{children}</ol>,
                          }}
                        >
                          {comment.content}
                        </ReactMarkdown>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          {session && (
                            <button
                              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                              className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
                            >
                              Reply
                            </button>
                          )}
                        </div>
                        {/* Reply Input */}
                        {replyingTo === comment.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-3 flex gap-2"
                          >
                            <Input
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={`Reply to ${comment.authorName || 'user'}...`}
                              className="rounded-lg text-xs h-8"
                              onKeyDown={(e) => e.key === 'Enter' && submitReply(comment.id)}
                              maxLength={2000}
                            />
                            <Button
                              size="sm"
                              onClick={() => submitReply(comment.id)}
                              disabled={!replyText.trim()}
                              className="h-8 rounded-lg text-xs px-3 gap-1"
                            >
                              <Send className="size-3" />
                            </Button>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          <Separator className="my-8" />

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="size-5 text-primary" />
                <h2 className="text-lg font-semibold">Related Posts</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {relatedPosts.map((rp, i) => {
                  const rpTypeInfo = getPostTypeInfo(rp.type)
                  return (
                    <Link key={rp.id} href={`/community/${rp.id}`} className="group">
                      <div className="p-4 rounded-xl bg-card/60 border border-border/30 hover:border-primary/30 hover:bg-card/90 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={`${rpTypeInfo.bg} ${rpTypeInfo.text} text-[9px] gap-1 border`}>
                            <rpTypeInfo.icon className="size-2.5" />
                            {rpTypeInfo.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(rp.createdAt)}</span>
                        </div>
                        <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors leading-snug mb-2">
                          {rp.title}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Heart className="size-2.5" /> {rp.likes}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="size-2.5" /> {rp.comments}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={(open) => { setShareOpen(open); setCopiedLink(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="size-5 text-primary" />
              Share Post
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground line-clamp-2">
              {post.title.slice(0, 80)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 rounded-xl h-12"
              onClick={handleCopyLink}
            >
              {copiedLink ? (
                <Check className="size-4 text-emerald-500" />
              ) : (
                <Copy className="size-4" />
              )}
              {copiedLink ? 'Link copied!' : 'Copy link to clipboard'}
            </Button>
            <Separator />
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Mail className="size-3.5" /> Share via email
              </label>
              <div className="flex gap-2">
                <Input
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  type="email"
                  className="flex-1 rounded-xl"
                  onKeyDown={(e) => e.key === 'Enter' && handleShareEmail()}
                />
                <Button
                  onClick={handleShareEmail}
                  disabled={!shareEmail.trim()}
                  size="sm"
                  className="rounded-xl gap-1.5"
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
            {post.sourceUrl && (
              <>
                <Separator />
                <a
                  href={post.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <ExternalLink className="size-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{post.sourceName || 'Source'}</p>
                    <p className="text-xs text-muted-foreground truncate">{post.sourceUrl}</p>
                  </div>
                </a>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
