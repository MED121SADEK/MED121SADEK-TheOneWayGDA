'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, ArrowLeft, Heart, MessageCircle, Repeat2, Bookmark, ExternalLink, TrendingUp, Sparkles, Newspaper, Users, Award, FileText, Clock, BookOpen, BarChart3, ClipboardList, Eye, Brain, Beaker, Lightbulb, Zap, Globe, Layers, Compass, Database, Code, MessageSquare } from 'lucide-react'

/* ─── Types ─── */
interface Collection {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  color: string
  postCount: number
  featured: boolean
  createdAt: string
}

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

const iconMap: Record<string, any> = {
  BookOpen, BarChart3, ClipboardList, TrendingUp, MessageSquare,
  Eye, Sparkles, Brain, Beaker, Lightbulb, FileText, Award, Zap,
  Newspaper, Users, Globe, Layers, Compass, Database, Code,
}

const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: 'text-blue-500' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', icon: 'text-purple-500' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: 'text-emerald-500' },
  sky: { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400', icon: 'text-sky-500' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: 'text-amber-500' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', icon: 'text-rose-500' },
  primary: { bg: 'bg-primary/10', border: 'border-primary/30', text: 'text-primary', icon: 'text-primary' },
}

function getColor(colorKey: string) {
  return colorMap[colorKey] || colorMap.primary
}

function getIcon(iconName: string) {
  return iconMap[iconName] || Layers
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

/* ─── MAIN PAGE ─── */
export default function CollectionDetailPage() {
  const { t, dir } = useTranslation()
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [collection, setCollection] = useState<Collection | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const res = await fetch(`/api/community/collections/${slug}`)
        if (!res.ok) {
          setError('Collection not found')
          return
        }
        const data = await res.json()
        setCollection(data.collection)
        setPosts(data.posts || [])
      } catch {
        setError('Failed to load collection')
      } finally {
        setLoading(false)
      }
    }
    fetchCollection()
  }, [slug])

  /* ─── Loading / Error ─── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col mesh-gradient noise-overlay" dir={dir}>
        <nav className="sticky top-0 z-50 nav-premium">
          <div className="max-w-4xl mx-auto flex items-center px-4 sm:px-6 h-14 gap-3">
            <Link href="/community/collections" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
            </Link>
            <span className="text-sm text-muted-foreground">Loading collection...</span>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-10 text-primary animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen flex flex-col mesh-gradient noise-overlay" dir={dir}>
        <nav className="sticky top-0 z-50 nav-premium">
          <div className="max-w-4xl mx-auto flex items-center px-4 sm:px-6 h-14 gap-3">
            <Link href="/community/collections" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
            </Link>
            <span className="text-sm text-muted-foreground">Back to Collections</span>
          </div>
        </nav>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <Award className="size-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">{error || 'Collection not found'}</h2>
          <p className="text-sm text-muted-foreground/70 mb-6">This collection may have been removed or doesn&apos;t exist.</p>
          <Link href="/community/collections">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="size-4" />
              Back to Collections
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const colors = getColor(collection.color)
  const IconComponent = getIcon(collection.icon)

  return (
    <div className="min-h-screen flex flex-col mesh-gradient noise-overlay" dir={dir}>
      {/* NAV */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
          <div className="flex items-center gap-3">
            <Link href="/community/collections" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
              <span className="text-sm hidden sm:inline">Collections</span>
            </Link>
            <Separator orientation="vertical" className="h-5" />
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={24} height={24} className="rounded-lg" />
            <span className="text-sm font-semibold gradient-text-premium">Collection</span>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Collection Header */}
          <div className={`rounded-2xl ${colors.bg} border ${colors.border} p-6 mb-8`}>
            <div className="flex items-start gap-4">
              <div className={`size-14 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                <IconComponent className={`size-7 ${colors.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-2xl font-bold">{collection.title}</h1>
                  {collection.featured && (
                    <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/30 gap-0.5">
                      <Sparkles className="size-2.5" />
                      Featured
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {collection.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="size-3.5" />
                    <span className="font-medium text-foreground">{collection.postCount}</span> posts
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" />
                    Updated {timeAgo(collection.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Posts */}
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="size-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No posts in this collection yet</h3>
              <p className="text-sm text-muted-foreground/70 max-w-sm">
                Posts will appear here as they are added to this collection.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="size-5 text-primary" />
                <h2 className="text-lg font-semibold">Posts in this Collection</h2>
                <Badge variant="secondary" className="text-xs">{posts.length}</Badge>
              </div>
              <AnimatePresence>
                {posts.map((post, i) => {
                  const typeInfo = getPostTypeInfo(post.type)
                  const TypeIcon = typeInfo.icon
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
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                            {truncate(post.content, 200)}
                          </p>
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
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
