'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation, Locale, localeNames } from '@/lib/i18n'
import { CommunityChatbot } from '@/components/community-chatbot'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Globe, Search, Plus, Heart, MessageCircle, Bookmark,
  Repeat2, ExternalLink, Loader2, ArrowLeft, Sparkles,
  RefreshCw, Pin, Zap, Brain, Beaker, Lightbulb,
  FileText, Award, Activity, Rss, Flame, Clock, Newspaper, Users,
} from 'lucide-react'

// ─── Extracted modules ───
import type { Post, Comment, VerifiedInfo } from './components/types'
import {
  getSession, timeAgo, parseTags,
} from './components/utils'
import { PostCard } from './components/post-card'
import { PostComposerDialog } from './components/post-composer-dialog'
import { ShareDialog } from './components/share-dialog'

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
  const [repostedPosts, setRepostedPosts] = useState<Set<string>>(new Set())

  // Share dialog
  const [shareDialogPost, setShareDialogPost] = useState<Post | null>(null)
  const [shareEmail, setShareEmail] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)

  // News fetching
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsFetchedAt, setNewsFetchedAt] = useState<string | null>(null)

  // Category filter (AI | Research | Innovation)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Topic following
  const [followedTopics, setFollowedTopics] = useState<string[]>([])

  // Verified researchers cache
  const [verifiedMap, setVerifiedMap] = useState<Record<string, VerifiedInfo>>({})

  /* ─── Fetch Verified Researchers ─── */
  useEffect(() => {
    const fetchVerified = async () => {
      try {
        const res = await fetch('/api/community/verified')
        const data = await res.json()
        if (data.researchers) {
          const map: Record<string, VerifiedInfo> = {}
          data.researchers.forEach((r: VerifiedInfo) => { map[r.email] = r })
          setVerifiedMap(map)
        }
      } catch { /* silent */ }
    }
    fetchVerified()
  }, [])

  /* ─── Fetch Posts ─── */
  const fetchPosts = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: '15', sort: sortOrder })
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
        const reposted = new Set<string>()
        results.forEach(r => {
          if (r.liked) liked.add(r.postId)
          if (r.saved) saved.add(r.postId)
          if (r.reposted) reposted.add(r.postId)
        })
        setLikedPosts(liked)
        setSavedPosts(saved)
        setRepostedPosts(reposted)
      } catch { /* silent */ }
    }
    fetchInteractions()
  }, [posts, session])

  /* ─── Actions ─── */
  const handleLike = async (postId: string) => {
    if (!session) return
    const isLiked = likedPosts.has(postId)
    const action = isLiked ? 'unlike' : 'like'
    setLikedPosts(prev => { const n = new Set(prev); isLiked ? n.delete(postId) : n.add(postId); return n })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes + (isLiked ? -1 : 1) } : p))
    try {
      await fetch(`/api/community/posts/${postId}/interact`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: session.email, action }),
      })
    } catch { /* revert silently */ }
  }

  const handleSave = async (postId: string) => {
    if (!session) return
    const isSaved = savedPosts.has(postId)
    const action = isSaved ? 'unsave' : 'save'
    setSavedPosts(prev => { const n = new Set(prev); isSaved ? n.delete(postId) : n.add(postId); return n })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, saves: p.saves + (isSaved ? -1 : 1) } : p))
    try {
      await fetch(`/api/community/posts/${postId}/interact`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: session.email, action }),
      })
    } catch { /* revert silently */ }
  }

  const handleRepost = async (postId: string) => {
    if (!session || repostedPosts.has(postId)) return
    setRepostedPosts(prev => { const n = new Set(prev); n.add(postId); return n })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, reposts: p.reposts + 1 } : p))
    try {
      await fetch(`/api/community/posts/${postId}/interact`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: session.email, action: 'repost' }),
      })
    } catch { /* revert silently */ }
  }

  const handleDelete = async (postId: string, author: string) => {
    if (!session || session.email !== author) return
    setPosts(prev => prev.filter(p => p.id !== postId))
    try { await fetch(`/api/community/posts/${postId}?author=${session.email}`, { method: 'DELETE' }) } catch { /* silent */ }
  }

  /* ─── Comments ─── */
  const toggleComments = async (postId: string) => {
    if (commentingPostId === postId) { setCommentingPostId(null); return }
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
      id: 'temp-' + Date.now(), postId, author: session.email,
      authorName: session.name, content: commentText.trim(), createdAt: new Date().toISOString(),
    }
    setCommentsMap(prev => ({ ...prev, [postId]: [...(prev[postId] || []), optimisticComment] }))
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: p.comments + 1 } : p))
    setCommentText('')
    try {
      await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: session.email, authorName: session.name, content: commentText.trim() }),
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: composerTitle.trim(), content: composerContent.trim(),
          author: session.email, authorName: session.name,
          imageUrl: composerImageUrl.trim() || null, sourceUrl: composerLink.trim() || null, tags,
        }),
      })
      const data = await res.json()
      if (res.ok && data.post) {
        setPosts(prev => [data.post, ...prev])
        setComposerTitle(''); setComposerContent(''); setComposerImageUrl(''); setComposerLink('')
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
      setPage(1); await fetchPosts(1, false)
    } catch { /* silent */ }
    setNewsLoading(false)
  }

  /* ─── Fetch Topic Follows ─── */
  useEffect(() => {
    if (!session) return
    const fetchTopics = async () => {
      try {
        const res = await fetch(`/api/community/topics?visitorId=${session.email}`)
        const data = await res.json()
        if (data.topics) setFollowedTopics(data.topics)
      } catch { /* silent */ }
    }
    fetchTopics()
  }, [session])

  /* ─── Seed Portal on First Visit ─── */
  useEffect(() => {
    const seeded = localStorage.getItem('oneway-community-seeded')
    if (!seeded) {
      fetch('/api/community/seed', { method: 'POST' }).then(() => {
        localStorage.setItem('oneway-community-seeded', 'true')
        setPage(1); fetchPosts(1, false)
      }).catch(() => { /* silent */ })
    }
  }, [])

  /* ─── Share ─── */
  const handleCopyLink = (post: Post) => {
    navigator.clipboard.writeText(`${window.location.origin}/community/${post.id}`)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }
  const handleShareEmail = () => {
    if (!shareDialogPost || !shareEmail.trim()) return
    const subject = encodeURIComponent(`Check this out: ${shareDialogPost.title}`)
    const body = encodeURIComponent(`I thought you'd find this interesting:\n\n${shareDialogPost.title}\n\n${shareDialogPost.sourceUrl || ''}\n\n- Shared from TheOneWayGDA`)
    window.open(`mailto:${shareEmail.trim()}?subject=${subject}&body=${body}`)
    setShareDialogPost(null); setShareEmail('')
  }

  /* ─── Derived Data ─── */
  const filteredPosts = (() => {
    let result = activeTab === 'saved' ? posts.filter(p => savedPosts.has(p.id)) : posts
    if (categoryFilter !== 'all') {
      result = result.filter(p => parseTags(p.tags).includes(categoryFilter))
    }
    return result
  })()
  const pinnedDigest = posts.find(p => p.type === 'digest' && p.featured)
  const communityPicks = posts.filter(p => p.type === 'user_highlight' && p.featured)
  const topStories = posts
    .filter(p => !['digest', 'user_highlight'].includes(p.type) && (p.featured || p.likes >= 3))
    .sort((a, b) => b.likes - a.likes).slice(0, 5)
  const totalStats = posts.reduce((acc, p) => ({
    likes: acc.likes + (p.likes || 0), comments: acc.comments + (p.comments || 0),
    reposts: acc.reposts + (p.reposts || 0), saves: acc.saves + (p.saves || 0),
  }), { likes: 0, comments: 0, reposts: 0, saves: 0 })
  const feedPosts = filteredPosts.filter(p => !(p.type === 'digest' && p.featured))

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
            <Button variant="outline" size="sm" onClick={handleRefreshNews} disabled={newsLoading} className="gap-1.5 text-xs">
              <RefreshCw className={`size-3.5 ${newsLoading ? 'animate-spin' : ''}`} />
              {t('community.refreshNews') || 'Fetch News'}
            </Button>
            <Button size="sm" onClick={() => setComposerOpen(true)} className="gap-1.5 rounded-full">
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
              <TabsTrigger value="all" className="gap-1.5 text-xs"><Flame className="size-3.5" />{t('community.all') || 'All'}</TabsTrigger>
              <TabsTrigger value="news" className="gap-1.5 text-xs"><Newspaper className="size-3.5" />{t('community.news') || 'AI News'}</TabsTrigger>
              <TabsTrigger value="community" className="gap-1.5 text-xs"><Users className="size-3.5" />{t('community.community') || 'Community'}</TabsTrigger>
              <TabsTrigger value="saved" className="gap-1.5 text-xs"><Bookmark className="size-3.5" />{t('community.saved') || 'Saved'}</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setSearchQuery(searchInput)}
                placeholder={t('community.searchPlaceholder') || 'Search posts...'}
                className="pl-8 h-8 text-xs w-full sm:w-48"
              />
            </div>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="latest" className="text-xs"><Clock className="size-3 mr-1 inline" />{t('community.latest') || 'Latest'}</SelectItem>
                <SelectItem value="popular" className="text-xs"><Zap className="size-3 mr-1 inline" />{t('community.popular') || 'Popular'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* News fetched banner */}
        {newsFetchedAt && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-2 text-xs text-muted-foreground bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
            <Sparkles className="size-3.5 text-emerald-500" />
            <span>{t('community.newsUpdated') || 'AI News updated'}: {new Date(newsFetchedAt).toLocaleString()}</span>
          </motion.div>
        )}

        {/* Category Filter */}
        {activeTab !== 'saved' && (
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            {[
              { key: 'all', label: 'All Topics', icon: Flame, color: '' },
              { key: 'AI', label: 'AI', icon: Brain, color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
              { key: 'Research', label: 'Research', icon: Beaker, color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
              { key: 'Innovation', label: 'Innovation', icon: Lightbulb, color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
            ].map(cat => (
              <button key={cat.key} onClick={() => setCategoryFilter(cat.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                  categoryFilter === cat.key
                    ? cat.color || 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-muted/20 text-muted-foreground hover:text-foreground border-transparent'
                }`}>
                <cat.icon className="size-3" />
                {cat.label}
                {cat.key !== 'all' && followedTopics.includes(cat.key) && <Zap className="size-2.5 text-primary" />}
              </button>
            ))}
          </div>
        )}

        {/* Live engagement bar */}
        {activeTab === 'all' && !searchQuery && (
          <div className="flex items-center gap-4 mb-4 px-3 py-2 rounded-lg bg-card/40 border border-border/20 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Activity className="size-3 text-emerald-500" /> <span className="font-medium text-foreground">{posts.length}</span> posts</span>
            <span className="flex items-center gap-1"><Heart className="size-3 text-rose-400" /> <span className="font-medium text-foreground">{totalStats.likes}</span></span>
            <span className="flex items-center gap-1"><MessageCircle className="size-3 text-blue-400" /> <span className="font-medium text-foreground">{totalStats.comments}</span></span>
            <span className="flex items-center gap-1"><Repeat2 className="size-3 text-emerald-400" /> <span className="font-medium text-foreground">{totalStats.reposts}</span></span>
            <span className="flex items-center gap-1"><Bookmark className="size-3 text-amber-400" /> <span className="font-medium text-foreground">{totalStats.saves}</span></span>
            <span className="ml-auto flex items-center gap-1 text-emerald-500"><Rss className="size-3" /> Auto-publishing active</span>
          </div>
        )}

        {/* Pinned Daily Digest */}
        {pinnedDigest && activeTab !== 'saved' && !searchQuery && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-indigo-500/10 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-500/10 border-b border-violet-500/20">
              <FileText className="size-4 text-violet-400" />
              <h3 className="text-sm font-bold text-violet-300">Daily Digest</h3>
              <Pin className="size-3 text-violet-400 ml-0.5" />
              <Badge className="ml-auto text-[9px] bg-violet-500/20 text-violet-300 border-violet-500/30 hover:bg-violet-500/30">Pinned</Badge>
              <span className="text-[10px] text-muted-foreground">{timeAgo(pinnedDigest.createdAt)}</span>
            </div>
            <div className="px-4 py-3">
              <h4 className="text-sm font-semibold mb-1.5">{pinnedDigest.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-6">{pinnedDigest.content}</p>
              <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><Heart className="size-3" /> {pinnedDigest.likes}</span>
                <span className="flex items-center gap-1"><MessageCircle className="size-3" /> {pinnedDigest.comments}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Community Picks Banner */}
        {communityPicks.length > 0 && activeTab === 'all' && categoryFilter === 'all' && !searchQuery && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-rose-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className="size-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-amber-300">Community Picks</h3>
              <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/20">Top Posts</Badge>
            </div>
            <div className="space-y-2">
              {communityPicks.slice(0, 2).map(pick => (
                <div key={pick.id} className="flex gap-3 p-2.5 rounded-lg bg-card/60 border border-border/30">
                  <div className="size-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Award className="size-4 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium line-clamp-2 leading-snug">{pick.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span>{pick.likes} likes</span><span>{pick.comments} comments</span><span>{timeAgo(pick.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Top Stories Banner */}
        {activeTab === 'all' && categoryFilter === 'all' && !searchQuery && topStories.length >= 3 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-blue-500/5 to-purple-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Top Stories</h3>
              <Badge variant="outline" className="text-[9px] bg-primary/5 text-primary border-primary/20">Trending</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topStories.slice(0, 3).map((post, i) => (
                <a key={post.id} href={post.sourceUrl || '#'} target="_blank" rel="noopener noreferrer"
                  className="group flex gap-2.5 p-2.5 rounded-lg bg-card/60 hover:bg-card/90 border border-border/30 hover:border-primary/30 transition-all">
                  <span className="text-xs font-bold text-primary/40 flex-shrink-0 w-4 text-right">#{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors leading-snug">{post.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      {post.likes > 0 && <span>{post.likes} likes</span>}
                      <span>{timeAgo(post.createdAt)}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </motion.div>
        )}

        {/* Feed */}
        {loading && posts.length === 0 ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="size-8 text-primary animate-spin" /></div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Newspaper className="size-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              {activeTab === 'saved' ? (t('community.noSaved') || 'No saved posts yet') : (t('community.noPosts') || 'No posts yet')}
            </h3>
            <p className="text-sm text-muted-foreground/70 max-w-sm">
              {activeTab === 'news'
                ? (t('community.noNewsDesc') || 'Click "Fetch News" to load the latest AI news.')
                : (t('community.noPostsDesc') || 'Be the first to share something with the community!')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {feedPosts.map((post, i) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ delay: i * 0.03 }}>
                  <PostCard
                    post={post} session={session}
                    isLiked={likedPosts.has(post.id)} isSaved={savedPosts.has(post.id)}
                    commentsOpen={commentingPostId === post.id}
                    comments={commentsMap[post.id] || []} commentsLoading={commentsLoading === post.id}
                    commentText={commentText}
                    onLike={() => handleLike(post.id)} onSave={() => handleSave(post.id)}
                    onRepost={() => handleRepost(post.id)} onDelete={() => handleDelete(post.id, post.author)}
                    onToggleComments={() => toggleComments(post.id)}
                    onCommentTextChange={setCommentText} onSubmitComment={() => submitComment(post.id)}
                    onShare={() => setShareDialogPost(post)}
                    verifiedInfo={verifiedMap[post.author] || null}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {hasMore && <div ref={observerRef} className="py-8 flex justify-center"><Loader2 className="size-6 text-muted-foreground animate-spin" /></div>}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <PostComposerDialog
        open={composerOpen} onOpenChange={setComposerOpen}
        title={composerTitle} onTitleChange={setComposerTitle}
        content={composerContent} onContentChange={setComposerContent}
        imageUrl={composerImageUrl} onImageUrlChange={setComposerImageUrl}
        link={composerLink} onLinkChange={setComposerLink}
        submitting={composerSubmitting} onSubmit={handleSubmitPost} t={t}
      />
      <ShareDialog
        post={shareDialogPost} onClose={() => { setShareDialogPost(null); setCopiedLink(false) }}
        copiedLink={copiedLink} email={shareEmail} onEmailChange={setShareEmail}
        onCopyLink={() => handleCopyLink(shareDialogPost!)} onShareEmail={handleShareEmail} t={t}
      />

      <CommunityChatbot />
    </div>
  )
}