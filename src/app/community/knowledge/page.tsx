'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Loader2, ArrowLeft, Search, ThumbsUp, Clock, ExternalLink, BookOpen, Lightbulb, FileText, ClipboardList, Compass, BarChart3 } from 'lucide-react'

/* ─── Types ─── */
interface KnowledgeItem {
  id: string
  type: string
  title: string
  content: string
  author: string
  authorName?: string | null
  upvotes: number
  postId?: string | null
  createdAt: string
  updatedAt: string
}

/* ─── Helpers ─── */
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

function getTypeInfo(type: string): { label: string; icon: any; bg: string; text: string; border: string } {
  switch (type) {
    case 'FAQ':
      return { label: 'FAQ', icon: ClipboardList, bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30' }
    case 'Guide':
      return { label: 'Guide', icon: BookOpen, bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' }
    case 'Tip':
      return { label: 'Tip', icon: Lightbulb, bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' }
    case 'Method':
      return { label: 'Method', icon: Compass, bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' }
    case 'Summary':
      return { label: 'Summary', icon: BarChart3, bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' }
    default:
      return { label: type, icon: FileText, bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30' }
  }
}

/* ─── MAIN PAGE ─── */
export default function KnowledgePage() {
  const { t, dir } = useTranslation()
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const fetchKnowledge = async () => {
      try {
        const res = await fetch('/api/community/knowledge')
        const data = await res.json()
        setItems(data.items || [])
      } catch {
        /* silent */
      } finally {
        setLoading(false)
      }
    }
    fetchKnowledge()
  }, [])

  const filteredItems = useMemo(() => {
    let result = items
    if (activeTab !== 'all') {
      result = result.filter(item => item.type === activeTab)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q)
      )
    }
    return result
  }, [items, activeTab, searchQuery])

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col mesh-gradient noise-overlay" dir={dir}>
        <nav className="sticky top-0 z-50 nav-premium">
          <div className="max-w-5xl mx-auto flex items-center px-4 sm:px-6 h-14 gap-3">
            <Link href="/community" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
            </Link>
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded-lg" />
            <span className="text-lg font-bold gradient-text-premium">Knowledge Base</span>
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
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
          <div className="flex items-center gap-3">
            <Link href="/community" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
            </Link>
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded-lg" />
            <span className="text-lg font-bold gradient-text-premium">Knowledge Base</span>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Community-curated knowledge items including FAQs, guides, tips, methods, and summaries
            from the best discussions.
          </p>
        </motion.div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full sm:w-auto">
              <TabsTrigger value="all" className="gap-1.5 text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="FAQ" className="gap-1.5 text-xs">
                FAQ
              </TabsTrigger>
              <TabsTrigger value="Guide" className="gap-1.5 text-xs">
                Guides
              </TabsTrigger>
              <TabsTrigger value="Tip" className="gap-1.5 text-xs">
                Tips
              </TabsTrigger>
              <TabsTrigger value="Method" className="gap-1.5 text-xs">
                Methods
              </TabsTrigger>
              <TabsTrigger value="Summary" className="gap-1.5 text-xs">
                Summaries
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge..."
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 px-3 py-2 rounded-lg bg-card/40 border border-border/20 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="size-3 text-primary" />
            <span className="font-medium text-foreground">{items.length}</span> knowledge items
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="size-3 text-emerald-400" />
            <span className="font-medium text-foreground">{items.reduce((a, i) => a + i.upvotes, 0)}</span> total upvotes
          </span>
        </div>

        {/* Items */}
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="size-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              {searchQuery ? 'No matching knowledge items' : 'No knowledge items yet'}
            </h3>
            <p className="text-sm text-muted-foreground/70 max-w-sm">
              {searchQuery
                ? 'Try adjusting your search terms.'
                : 'Knowledge items will appear as the community converts valuable discussions into knowledge.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, i) => {
                const typeInfo = getTypeInfo(item.type)
                const TypeIcon = typeInfo.icon
                const isExpanded = expandedId === item.id

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: i * 0.03 }}
                    className={`rounded-xl bg-card/60 border transition-all cursor-pointer ${
                      isExpanded ? `${typeInfo.bg} ${typeInfo.border} border-opacity-40` : 'border-border/30 hover:border-border/50'
                    }`}
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`size-8 rounded-lg ${typeInfo.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <TypeIcon className={`size-4 ${typeInfo.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className={`${typeInfo.bg} ${typeInfo.text} ${typeInfo.border} text-[9px] gap-1 border`}>
                              <TypeIcon className="size-2.5" />
                              {typeInfo.label}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {item.authorName || item.author.split('@')[0]}
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                              <Clock className="size-2.5" />
                              {timeAgo(item.createdAt)}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold leading-snug mb-1">
                            {item.title}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {isExpanded ? item.content : truncate(item.content, 200)}
                          </p>

                          {/* Expanded content shows metadata */}
                          <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="size-3" />
                              {item.upvotes} upvotes
                            </span>
                            {item.postId && (
                              <Link
                                href={`/community/${item.postId}`}
                                className="flex items-center gap-1 text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="size-3" />
                                View originating post
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded full content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Separator />
                          <div className="px-4 py-4 pt-2">
                            <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
                              {item.content}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
