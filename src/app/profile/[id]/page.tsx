'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, Heart, MessageCircle, Repeat2, Bookmark, ExternalLink,
  Newspaper, Users, Award, Sparkles, FileText, Loader2, Calendar,
  TrendingUp, BadgeCheck, Mail, Globe as GlobeIcon,
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

interface VerifiedInfo {
  email: string
  displayName: string
  institution?: string | null
  role?: string | null
  badgeType: string
  bio?: string | null
  websiteUrl?: string | null
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

function getPostTypeInfo(type: string) {
  switch (type) {
    case 'auto': return { label: 'Auto', icon: Sparkles, bg: 'bg-blue-500/10', text: 'text-blue-400' }
    case 'digest': return { label: 'Digest', icon: FileText, bg: 'bg-violet-500/10', text: 'text-violet-400' }
    case 'user_highlight': return { label: 'Pick', icon: Award, bg: 'bg-amber-500/10', text: 'text-amber-400' }
    case 'news': return { label: 'News', icon: Newspaper, bg: 'bg-sky-500/10', text: 'text-sky-400' }
    default: return { label: 'Community', icon: Users, bg: 'bg-emerald-500/10', text: 'text-emerald-400' }
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
export default function UserProfilePage() {
  const { t, dir } = useTranslation()
  const params = useParams()
  const router = useRouter()
  const userId = decodeURIComponent(params.id as string)

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('posts')
  const [verifiedInfo, setVerifiedInfo] = useState<VerifiedInfo | null>(null)

  // Profile data derived from posts & verified info
  const [displayName, setDisplayName] = useState(userId)
  const [totalPosts, setTotalPosts] = useState(0)
  const [totalLikes, setTotalLikes] = useState(0)
  const [totalComments, setTotalComments] = useState(0)
  const [totalReposts, setTotalReposts] = useState(0)
  const [earliestPost, setEarliestPost] = useState<string | null>(null)

  /* ─── Fetch Posts by Author ─── */
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      try {
        // Fetch all posts by this author
        let allPosts: Post[] = []
        let page = 1
        let hasMore = true
        while (hasMore) {
          const res = await fetch(`/api/community/posts?author=${encodeURIComponent(userId)}&page=${page}&limit=50&sort=latest`)
          const data = await res.json()
          allPosts = [...allPosts, ...(data.posts || [])]
          hasMore = data.pagination ? data.pagination.page < data.pagination.pages : false
          page++
          if (page > 10) break // Safety: max 500 posts
        }
        setPosts(allPosts)

        // Compute stats
        const stats = allPosts.reduce((acc, p) => ({
          likes: acc.likes + (p.likes || 0),
          comments: acc.comments + (p.comments || 0),
          reposts: acc.reposts + (p.reposts || 0),
        }), { likes: 0, comments: 0, reposts: 0 })
        setTotalLikes(stats.likes)
        setTotalComments(stats.comments)
        setTotalReposts(stats.reposts)
        setTotalPosts(allPosts.length)

        if (allPosts.length > 0) {
          // Find earliest post and display name
          const sorted = [...allPosts].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          setEarliestPost(sorted[0].createdAt)
          if (allPosts[0].authorName) {
            setDisplayName(allPosts[0].authorName)
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [userId])

  /* ─── Fetch Verified Info ─── */
  useEffect(() => {
    const fetchVerified = async () => {
      try {
        const res = await fetch(`/api/community/verified?email=${encodeURIComponent(userId)}`)
        const data = await res.json()
        if (data.researchers && data.researchers.length > 0) {
          setVerifiedInfo(data.researchers[0])
          setDisplayName(data.researchers[0].displayName)
        }
      } catch { /* silent */ }
    }
    fetchVerified()
  }, [userId])

  /* ─── Computed ─── */
  const featuredPosts = posts.filter(p => p.featured || p.type === 'user_highlight')
  const popularPosts = [...posts].sort((a, b) => b.likes - a.likes).slice(0, 10)
  const recentPosts = [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const badgeColor = verifiedInfo ? getBadgeColor(verifiedInfo.badgeType) : null

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col mesh-gradient noise-overlay" dir={dir}>
        <nav className="sticky top-0 z-50 nav-premium">
          <div className="max-w-4xl mx-auto flex items-center px-4 sm:px-6 h-14 gap-3">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
              <span className="text-sm">Back</span>
            </button>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-10 text-primary animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col mesh-gradient noise-overlay" dir={dir}>
      {/* NAV */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
              <span className="text-sm hidden sm:inline">Back</span>
            </button>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-sm font-semibold gradient-text-premium">Profile</span>
          </div>
          <Image src="/images/logo.png" alt="TheOneWayGDA" width={24} height={24} className="rounded-lg" />
        </div>
      </nav>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Profile Header */}
          <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden mb-6">
            {/* Banner */}
            <div className="h-32 sm:h-40 bg-gradient-to-r from-primary/20 via-primary/10 to-blue-500/20 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(var(--primary),0.15),transparent_60%)]" />
            </div>

            <div className="px-6 pb-6">
              {/* Avatar + Name */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
                <div className="size-24 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 border-4 border-background flex items-center justify-center flex-shrink-0 shadow-lg">
                  {verifiedInfo ? (
                    <span className="text-2xl font-bold text-primary">
                      {verifiedInfo.displayName[0].toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-2xl font-bold text-muted-foreground">
                      {displayName[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 pt-2 sm:pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold">{displayName}</h1>
                    {badgeColor && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          border: `1px solid ${badgeColor.border}`,
                          backgroundColor: badgeColor.bg,
                          color: badgeColor.color,
                        }}
                        title={
                          verifiedInfo?.institution
                            ? `${badgeColor.label} — ${verifiedInfo.institution}${verifiedInfo.role ? ` · ${verifiedInfo.role}` : ''}`
                            : badgeColor.label
                        }
                      >
                        <BadgeCheck className="size-3" />
                        {badgeColor.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="size-3" />
                      {userId}
                    </span>
                    {verifiedInfo?.institution && (
                      <span className="flex items-center gap-1">
                        <GlobeIcon className="size-3" />
                        {verifiedInfo.institution}
                        {verifiedInfo.role && ` · ${verifiedInfo.role}`}
                      </span>
                    )}
                  </div>
                </div>
                {verifiedInfo?.websiteUrl && (
                  <a
                    href={verifiedInfo.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="size-3" />
                    Website
                  </a>
                )}
              </div>

              {/* Bio */}
              {(verifiedInfo?.bio || earliestPost) && (
                <div className="mt-4">
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {verifiedInfo?.bio || `Community member sharing insights on AI, Research, and Innovation.`}
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border/30">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{totalPosts}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Posts</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-rose-400">{totalLikes}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Likes</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-400">{totalComments}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Comments</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-400">{totalReposts}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reposts</p>
                </div>
                {earliestPost && (
                  <div className="text-center ml-auto">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="size-3" />
                      Active since {new Date(earliestPost).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Posts Section */}
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Newspaper className="size-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No posts yet</h3>
              <p className="text-sm text-muted-foreground/70">This user hasn&apos;t published any posts in the community.</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="posts" className="gap-1.5 text-xs">
                  <FileText className="size-3.5" />
                  All Posts ({totalPosts})
                </TabsTrigger>
                {featuredPosts.length > 0 && (
                  <TabsTrigger value="featured" className="gap-1.5 text-xs">
                    <Award className="size-3.5" />
                    Featured ({featuredPosts.length})
                  </TabsTrigger>
                )}
                <TabsTrigger value="popular" className="gap-1.5 text-xs">
                  <TrendingUp className="size-3.5" />
                  Popular
                </TabsTrigger>
              </TabsList>

              <TabsContent value="posts">
                <PostList posts={recentPosts} />
              </TabsContent>

              {featuredPosts.length > 0 && (
                <TabsContent value="featured">
                  <PostList posts={featuredPosts} />
                </TabsContent>
              )}

              <TabsContent value="popular">
                <PostList posts={popularPosts} />
              </TabsContent>
            </Tabs>
          )}
        </motion.div>
      </div>
    </div>
  )
}

/* ─── Post List Component ─── */
function PostList({ posts }: { posts: Post[] }) {
  return (
    <div className="space-y-3">
      {posts.map((post, i) => {
        const typeInfo = getPostTypeInfo(post.type)
        const TypeIcon = typeInfo.icon
        const tags = parseTags(post.tags)
        return (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Link href={`/community/${post.id}`} className="block group">
              <div className="p-4 rounded-xl bg-card/60 border border-border/30 hover:border-primary/30 hover:bg-card/90 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={`${typeInfo.bg} ${typeInfo.text} text-[9px] gap-1 border`}>
                    <TypeIcon className="size-2.5" />
                    {typeInfo.label}
                  </Badge>
                  {post.featured && (
                    <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/30 gap-0.5">
                      <TrendingUp className="size-2" />
                      Featured
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(post.createdAt)}</span>
                </div>
                <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors mb-1.5">
                  {post.title}
                </h3>
                <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="m-0">{children}</p>,
                    code: ({ children }) => <code className="bg-muted rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{children}</a>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  }}
                >
                  {truncate(post.content, 200)}
                </ReactMarkdown>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Heart className="size-3" /> {post.likes}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="size-3" /> {post.comments}</span>
                  <span className="flex items-center gap-1"><Repeat2 className="size-3" /> {post.reposts}</span>
                  {post.sourceUrl && (
                    <a
                      href={post.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="size-3" />
                      {post.sourceName || 'Source'}
                    </a>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
