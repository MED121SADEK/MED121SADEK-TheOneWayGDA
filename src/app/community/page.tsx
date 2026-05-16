'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation, Locale, localeNames } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  Globe, Search, Plus, Heart, MessageCircle, Bookmark,
  Repeat2, Share2, ExternalLink, Trash2, Send, ChevronDown,
  ChevronUp, X, Newspaper, Users, Flame, Clock, Tag,
  TrendingUp, Link2, Image as ImageIcon, Filter, Loader2,
  MoreHorizontal, ArrowLeft, Sparkles, Check, Copy,
  Mail, RefreshCw, Bell, Pin,
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

function truncate(text: string, len: number): string {
  if (text.length <= len) return text
  return text.slice(0, len) + '...'
}

/* ─── MAIN PAGE ─── */
export default function CommunityPage() {
  const { t, locale, setLocale, dir } = useTranslation()
  const session = getSession()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [sortOrder, setSortOrder] = useState('latest')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const observerRef = useRef<HTMLDivElement>(null)

  // Composer state
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerTitle, setComposerTitle] = useState('')
  const [composerContent, setComposerContent] = useState('')
  const [composerImageUrl, setComposerImageUrl] = useState('')
  const [composerLink, setComposerLink] = useState('')
  const [composerSubmitting, setComposerSubmitting] = useState(false)

  // Comment state
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({})
  const [commentsLoading, setCommentsLoading] = useState<string | null>(null)

  // Interaction state (client-side cache)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set())

  // Share dialog
  const [shareDialogPost, setShareDialogPost] = useState<Post | null>(null)
  const [shareEmail, setShareEmail] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)

  // News fetching
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsFetchedAt, setNewsFetchedAt] = useState<string | null>(null)

  /* ─── Fetch Posts ─── */
  const fetchPosts = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: '15',
        sort: sortOrder,
      })
      if (activeTab !== 'saved') params.set('type', activeTab === 'all' ? 'all' : activeTab)
      if (searchQuery) params.set('search', searchQuery)

      const res = await fetch(`/api/community/posts?${params}`)
      const data = await res.json()

      if (append) {
        setPosts(prev => [...prev, ...data.posts])
      } else {
        setPosts(data.posts)
      }
      setHasMore(data.pagination.page < data.pagination.pages)
    } catch (err) {
      console.error('Fetch posts error:', err)
    }
  }, [activeTab, sortOrder, searchQuery])

  useEffect(() => {
    setLoading(true)
    setPage(1)
    fetchPosts(1, false).finally(() => setLoading(false))
  }, [activeTab, sortOrder, searchQuery, fetchPosts])

  // Infinite scroll
  useEffect(() => {
    if (!observerRef.current || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1
          setPage(nextPage)
          fetchPosts(nextPage, true)
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(observerRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading, page, fetchPosts])

  // Fetch user interactions for visible posts
  useEffect(() => {
    if (!session || posts.length === 0) return
    const fetchInteractions = async () => {
      try {
        const results = await Promise.all(
          posts.slice(0, 20).map(async (post) => {
            const res = await fetch(`/api/community/posts/${post.id}/interact?visitorId=${session.email}`)
            return { postId: post.id, ...(await res.json()) }
          })
        )
        const liked = new Set<string>()
        const saved = new Set<string>()
        results.forEach(r => {
          if (r.liked) liked.add(r.postId)
          if (r.saved) saved.add(r.postId)
        })
        setLikedPosts(liked)
        setSavedPosts(saved)
      } catch { /* silent */ }
    }
    fetchInteractions()
  }, [posts, session])

  /* ─── Actions ─── */
  const handleLike = async (postId: string) => {
    if (!session) return
    const isLiked = likedPosts.has(postId)
    const action = isLiked ? 'unlike' : 'like'
    setLikedPosts(prev => {
      const next = new Set(prev)
      isLiked ? next.delete(postId) : next.add(postId)
      return next
    })
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, likes: p.likes + (isLiked ? -1 : 1) } : p
    ))
    try {
      await fetch(`/api/community/posts/${postId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: session.email, action }),
      })
    } catch { /* revert silently */ }
  }

  const handleSave = async (postId: string) => {
    if (!session) return
    const isSaved = savedPosts.has(postId)
    const action = isSaved ? 'unsave' : 'save'
    setSavedPosts(prev => {
      const next = new Set(prev)
      isSaved ? next.delete(postId) : next.add(postId)
      return next
    })
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, saves: p.saves + (isSaved ? -1 : 1) } : p
    ))
    try {
      await fetch(`/api/community/posts/${postId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: session.email, action }),
      })
    } catch { /* revert silently */ }
  }

  const handleRepost = async (postId: string) => {
    if (!session) return
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, reposts: p.reposts + 1 } : p
    ))
    try {
      await fetch(`/api/community/posts/${postId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: session.email, action: 'repost' }),
      })
    } catch { /* revert silently */ }
  }

  const handleDelete = async (postId: string, author: string) => {
    if (!session || session.email !== author) return
    setPosts(prev => prev.filter(p => p.id !== postId))
    try {
      await fetch(`/api/community/posts/${postId}?author=${session.email}`, { method: 'DELETE' })
    } catch { /* silent */ }
  }

  /* ─── Comments ─── */
  const toggleComments = async (postId: string) => {
    if (commentingPostId === postId) {
      setCommentingPostId(null)
      return
    }
    setCommentingPostId(postId)
    if (!commentsMap[postId]) {
      setCommentsLoading(postId)
      try {
        const res = await fetch(`/api/community/posts/${postId}/comments`)
        const data = await res.json()
        setCommentsMap(prev => ({ ...prev, [postId]: data.comments }))
      } catch { /* silent */ }
      setCommentsLoading(null)
    }
  }

  const submitComment = async (postId: string) => {
    if (!session || !commentText.trim()) return
    const optimisticComment: Comment = {
      id: 'temp-' + Date.now(),
      postId,
      author: session.email,
      authorName: session.name,
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
    }
    setCommentsMap(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), optimisticComment],
    }))
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, comments: p.comments + 1 } : p
    ))
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
    } catch { /* silent */ }
  }

  /* ─── Composer ─── */
  const handleSubmitPost = async () => {
    if (!session || !composerTitle.trim() || !composerContent.trim()) return
    setComposerSubmitting(true)
    try {
      const tags = ['Community']
      if (composerLink) tags.push('Link')
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: composerTitle.trim(),
          content: composerContent.trim(),
          author: session.email,
          authorName: session.name,
          imageUrl: composerImageUrl.trim() || null,
          sourceUrl: composerLink.trim() || null,
          tags,
        }),
      })
      const data = await res.json()
      if (res.ok && data.post) {
        setPosts(prev => [data.post, ...prev])
        setComposerTitle('')
        setComposerContent('')
        setComposerImageUrl('')
        setComposerLink('')
        setComposerOpen(false)
      }
    } catch { /* silent */ }
    setComposerSubmitting(false)
  }

  /* ─── News Refresh ─── */
  const handleRefreshNews = async () => {
    setNewsLoading(true)
    try {
      const res = await fetch('/api/community/news')
      const data = await res.json()
      setNewsFetchedAt(data.fetchedAt)
      // Refresh posts
      setPage(1)
      await fetchPosts(1, false)
    } catch { /* silent */ }
    setNewsLoading(false)
  }

  /* ─── Share ─── */
  const handleCopyLink = (post: Post) => {
    const url = post.sourceUrl || `${window.location.origin}/community?post=${post.id}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleShareEmail = () => {
    if (!shareDialogPost || !shareEmail.trim()) return
    const subject = encodeURIComponent(`Check this out: ${shareDialogPost.title}`)
    const body = encodeURIComponent(
      `I thought you'd find this interesting:\n\n${shareDialogPost.title}\n\n${shareDialogPost.sourceUrl || ''}\n\n- Shared from TheOneWayGDA`
    )
    window.open(`mailto:${shareEmail.trim()}?subject=${subject}&body=${body}`)
    setShareDialogPost(null)
    setShareEmail('')
  }

  /* ─── Saved Posts Filter ─── */
  const filteredPosts = activeTab === 'saved'
    ? posts.filter(p => savedPosts.has(p.id))
    : posts

  /* ─── RENDER ─── */
  return (
    <div className="min-h-screen flex flex-col mesh-gradient noise-overlay" dir={dir}>
      {/* NAV */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
            </Link>
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded-lg" />
            <span className="text-lg font-bold gradient-text-premium">{t('community.navTitle') || 'AI News & Community'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshNews}
              disabled={newsLoading}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`size-3.5 ${newsLoading ? 'animate-spin' : ''}`} />
              {t('community.refreshNews') || 'Fetch News'}
            </Button>
            <Button
              size="sm"
              onClick={() => setComposerOpen(true)}
              className="gap-1.5 rounded-full"
            >
              <Plus className="size-3.5" />
              {t('community.newPost') || 'Post'}
            </Button>
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <Globe className="size-3 mr-0.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {localeNames.map(l => (
                  <SelectItem key={l} value={l} className="text-xs">{t(`lang.${l}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Tabs & Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full sm:w-auto">
              <TabsTrigger value="all" className="gap-1.5 text-xs">
                <Flame className="size-3.5" />
                {t('community.all') || 'All'}
              </TabsTrigger>
              <TabsTrigger value="news" className="gap-1.5 text-xs">
                <Newspaper className="size-3.5" />
                {t('community.news') || 'AI News'}
              </TabsTrigger>
              <TabsTrigger value="community" className="gap-1.5 text-xs">
                <Users className="size-3.5" />
                {t('community.community') || 'Community'}
              </TabsTrigger>
              <TabsTrigger value="saved" className="gap-1.5 text-xs">
                <Bookmark className="size-3.5" />
                {t('community.saved') || 'Saved'}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setSearchQuery(searchInput)}
                placeholder={t('community.searchPlaceholder') || 'Search posts...'}
                className="pl-8 h-8 text-xs w-full sm:w-48"
              />
            </div>
            {/* Sort */}
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest" className="text-xs">
                  <Clock className="size-3 mr-1 inline" />
                  {t('community.latest') || 'Latest'}
                </SelectItem>
                <SelectItem value="popular" className="text-xs">
                  <TrendingUp className="size-3 mr-1 inline" />
                  {t('community.popular') || 'Popular'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* News fetched banner */}
        {newsFetchedAt && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-2 text-xs text-muted-foreground bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2"
          >
            <Sparkles className="size-3.5 text-emerald-500" />
            <span>{t('community.newsUpdated') || 'AI News updated'}: {new Date(newsFetchedAt).toLocaleString()}</span>
          </motion.div>
        )}

        {/* Feed */}
        {loading && posts.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 text-primary animate-spin" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Newspaper className="size-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              {activeTab === 'saved'
                ? (t('community.noSaved') || 'No saved posts yet')
                : (t('community.noPosts') || 'No posts yet')
              }
            </h3>
            <p className="text-sm text-muted-foreground/70 max-w-sm">
              {activeTab === 'news'
                ? (t('community.noNewsDesc') || 'Click "Fetch News" to load the latest AI news.')
                : (t('community.noPostsDesc') || 'Be the first to share something with the community!')
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredPosts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <PostCard
                    post={post}
                    session={session}
                    isLiked={likedPosts.has(post.id)}
                    isSaved={savedPosts.has(post.id)}
                    commentsOpen={commentingPostId === post.id}
                    comments={commentsMap[post.id] || []}
                    commentsLoading={commentsLoading === post.id}
                    commentText={commentText}
                    onLike={() => handleLike(post.id)}
                    onSave={() => handleSave(post.id)}
                    onRepost={() => handleRepost(post.id)}
                    onDelete={() => handleDelete(post.id, post.author)}
                    onToggleComments={() => toggleComments(post.id)}
                    onCommentTextChange={setCommentText}
                    onSubmitComment={() => submitComment(post.id)}
                    onShare={() => setShareDialogPost(post)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Infinite scroll sentinel */}
            {hasMore && <div ref={observerRef} className="py-8 flex justify-center">
              <Loader2 className="size-6 text-muted-foreground animate-spin" />
            </div>}
          </div>
        )}
      </div>

      {/* Post Composer Dialog */}
      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-primary" />
              {t('community.createPost') || 'Create Post'}
            </DialogTitle>
            <DialogDescription>
              {t('community.createPostDesc') || 'Share your thoughts, discoveries, or questions with the AI community.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                {t('community.postTitle') || 'Title'}
              </label>
              <Input
                value={composerTitle}
                onChange={(e) => setComposerTitle(e.target.value)}
                placeholder={t('community.postTitlePlaceholder') || 'What\'s on your mind?'}
                maxLength={300}
                className="rounded-xl"
              />
              <span className="text-xs text-muted-foreground mt-1 block">{composerTitle.length}/300</span>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                {t('community.postContent') || 'Content'}
              </label>
              <Textarea
                value={composerContent}
                onChange={(e) => setComposerContent(e.target.value)}
                placeholder={t('community.postContentPlaceholder') || 'Share details, links, insights...'}
                rows={5}
                maxLength={10000}
                className="rounded-xl resize-none"
              />
              <span className="text-xs text-muted-foreground mt-1 block">{composerContent.length}/10,000</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="size-3.5" /> {t('community.imageUrl') || 'Image URL'}
                </label>
                <Input
                  value={composerImageUrl}
                  onChange={(e) => setComposerImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <Link2 className="size-3.5" /> {t('community.linkUrl') || 'Link URL'}
                </label>
                <Input
                  value={composerLink}
                  onChange={(e) => setComposerLink(e.target.value)}
                  placeholder="https://..."
                  className="rounded-xl text-xs"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposerOpen(false)}>
              {t('community.cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={handleSubmitPost}
              disabled={composerSubmitting || !composerTitle.trim() || !composerContent.trim()}
              className="gap-1.5"
            >
              {composerSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              {t('community.publish') || 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={!!shareDialogPost} onOpenChange={() => { setShareDialogPost(null); setCopiedLink(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="size-5 text-primary" />
              {t('community.sharePost') || 'Share Post'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {shareDialogPost && truncate(shareDialogPost.title, 80)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 rounded-xl h-12"
              onClick={() => handleCopyLink(shareDialogPost!)}
            >
              {copiedLink ? (
                <Check className="size-4 text-emerald-500" />
              ) : (
                <Copy className="size-4" />
              )}
              {copiedLink
                ? (t('community.linkCopied') || 'Link copied!')
                : (t('community.copyLink') || 'Copy link to clipboard')
              }
            </Button>
            <Separator />
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Mail className="size-3.5" /> {t('community.shareViaEmail') || 'Share via email'}
              </label>
              <div className="flex gap-2">
                <Input
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder={t('community.colleagueEmail') || 'colleague@example.com'}
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
            {shareDialogPost?.sourceUrl && (
              <>
                <Separator />
                <a
                  href={shareDialogPost.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <ExternalLink className="size-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{shareDialogPost.sourceName || 'Source'}</p>
                    <p className="text-xs text-muted-foreground truncate">{shareDialogPost.sourceUrl}</p>
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

/* ─── Post Card Component ─── */
function PostCard({
  post,
  session,
  isLiked,
  isSaved,
  commentsOpen,
  comments,
  commentsLoading,
  commentText,
  onLike,
  onSave,
  onRepost,
  onDelete,
  onToggleComments,
  onCommentTextChange,
  onSubmitComment,
  onShare,
}: {
  post: Post
  session: { email: string; name: string } | null
  isLiked: boolean
  isSaved: boolean
  commentsOpen: boolean
  comments: Comment[]
  commentsLoading: boolean
  commentText: string
  onLike: () => void
  onSave: () => void
  onRepost: () => void
  onDelete: () => void
  onToggleComments: () => void
  onCommentTextChange: (v: string) => void
  onSubmitComment: () => void
  onShare: () => void
}) {
  const tags = parseTags(post.tags)
  const isOwnPost = session && session.email === post.author
  const displayName = post.authorName || post.author.split('@')[0]

  return (
    <div className={`rounded-xl border bg-card/80 backdrop-blur-sm overflow-hidden transition-all hover:border-border/80 ${post.featured ? 'border-primary/30 shadow-sm shadow-primary/5' : 'border-border/40'}`}>
      {/* Header */}
      <div className="px-4 sm:px-5 pt-4 sm:pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className={`size-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
              post.type === 'news'
                ? 'bg-primary/10 text-primary'
                : 'bg-accent/20 text-accent'
            }`}>
              {post.type === 'news' ? (
                <Sparkles className="size-4" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">{displayName}</span>
                {post.featured && (
                  <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px] border-primary/30 text-primary bg-primary/5">
                    <Pin className="size-2.5" /> Featured
                  </Badge>
                )}
                {post.type === 'news' && (
                  <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px] border-blue-500/30 text-blue-400 bg-blue-500/5">
                    <Newspaper className="size-2.5" /> AI News
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{timeAgo(post.createdAt)}</span>
                {post.sourceName && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <ExternalLink className="size-2.5" />
                      {post.sourceName}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {isOwnPost && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>

        {/* Title & Content */}
        <div className="mt-3">
          <h3 className="text-base font-semibold leading-snug">{post.title}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            {post.content.length > 300 ? (
              <>
                {truncate(post.content, 300)}
                {post.sourceUrl && (
                  <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1 inline-flex items-center gap-0.5">
                    Read more <ExternalLink className="size-3" />
                  </a>
                )}
              </>
            ) : (
              post.content
            )}
          </p>
        </div>

        {/* Image */}
        {post.imageUrl && (
          <div className="mt-3 rounded-lg overflow-hidden border border-border/30">
            <img src={post.imageUrl} alt="" className="w-full h-48 object-cover" loading="lazy" />
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0 rounded-full">
                <Tag className="size-2.5 mr-0.5" />{tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="px-4 sm:px-5 py-2 text-xs text-muted-foreground flex items-center gap-4">
        {post.likes > 0 && <span>{post.likes} {post.likes === 1 ? 'like' : 'likes'}</span>}
        {post.comments > 0 && <span>{post.comments} {post.comments === 1 ? 'comment' : 'comments'}</span>}
        {post.reposts > 0 && <span>{post.reposts} {post.reposts === 1 ? 'repost' : 'reposts'}</span>}
      </div>

      <Separator className="opacity-50" />

      {/* Action buttons */}
      <div className="px-2 sm:px-3 py-1 flex items-center">
        <button
          onClick={onLike}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
            isLiked
              ? 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/15'
              : 'text-muted-foreground hover:text-rose-500 hover:bg-muted/50'
          }`}
        >
          <Heart className={`size-4 ${isLiked ? 'fill-current' : ''}`} />
          <span className="hidden sm:inline">{isLiked ? 'Liked' : 'Like'}</span>
        </button>
        <button
          onClick={onToggleComments}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
            commentsOpen
              ? 'text-primary bg-primary/10 hover:bg-primary/15'
              : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
          }`}
        >
          <MessageCircle className="size-4" />
          <span className="hidden sm:inline">{commentsOpen ? 'Hide' : 'Comment'}</span>
        </button>
        <button
          onClick={onRepost}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/5 transition-all"
        >
          <Repeat2 className="size-4" />
          <span className="hidden sm:inline">Repost</span>
        </button>
        <button
          onClick={onSave}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
            isSaved
              ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/15'
              : 'text-muted-foreground hover:text-amber-500 hover:bg-muted/50'
          }`}
        >
          <Bookmark className={`size-4 ${isSaved ? 'fill-current' : ''}`} />
          <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
        </button>
        <button
          onClick={onShare}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-blue-500 hover:bg-blue-500/5 transition-all"
        >
          <Share2 className="size-4" />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      {/* Comments section */}
      <AnimatePresence>
        {commentsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Separator className="opacity-50" />
            <div className="px-4 sm:px-5 py-3 space-y-3">
              {commentsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto">
                  {comments.map(comment => (
                    <div key={comment.id} className="flex gap-2.5">
                      <div className="size-7 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-accent">
                        {(comment.authorName || comment.author.split('@')[0]).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{comment.authorName || comment.author.split('@')[0]}</span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm text-foreground/90 mt-0.5 leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment input */}
              {session ? (
                <div className="flex gap-2 pt-2 border-t border-border/30">
                  <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-primary">
                    {session.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={commentText}
                      onChange={(e) => onCommentTextChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && onSubmitComment()}
                      placeholder="Write a comment..."
                      className="h-8 text-xs rounded-lg"
                      maxLength={2000}
                    />
                    <Button
                      size="icon"
                      className="size-8 rounded-lg flex-shrink-0"
                      onClick={onSubmitComment}
                      disabled={!commentText.trim()}
                    >
                      <Send className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30">
                  Please enter the platform to comment.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
