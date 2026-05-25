'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import {
  BookOpen, BarChart3, ClipboardList, TrendingUp, MessageSquare,
  Eye, Brain, Beaker, Lightbulb, FileText, Award, Zap, Newspaper,
  Users, Globe, Layers, Compass, Sparkles, Database, Code,
  ArrowLeft,
} from 'lucide-react'

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

/* ─── Icon Mapping ─── */
const iconMap: Record<string, any> = {
  BookOpen, BarChart3, ClipboardList, TrendingUp, MessageSquare,
  Eye, Brain, Beaker, Lightbulb, FileText, Award, Zap, Newspaper,
  Users, Globe, Layers, Compass, Sparkles, Database, Code,
}

/* ─── Color Mapping ─── */
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

/* ─── MAIN PAGE ─── */
export default function CollectionsPage() {
  const { t, dir } = useTranslation()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await fetch('/api/community/collections')
        const data = await res.json()
        setCollections(data.collections || [])
      } catch {
        /* silent */
      } finally {
        setLoading(false)
      }
    }
    fetchCollections()
  }, [])

  const featured = collections.filter(c => c.featured)
  const nonFeatured = collections.filter(c => !c.featured)

  /* ─── Loading Skeleton ─── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col mesh-gradient noise-overlay" dir={dir}>
        <nav className="sticky top-0 z-50 nav-premium">
          <div className="max-w-5xl mx-auto flex items-center px-4 sm:px-6 h-14 gap-3">
            <Link href="/community" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
            </Link>
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded-lg" />
            <span className="text-lg font-bold gradient-text-premium">Collections</span>
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
            <span className="text-lg font-bold gradient-text-premium">Collections</span>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Thematic Collections</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Explore curated collections of posts organized by topic, method, and research area.
            Each collection brings together the best community knowledge.
          </p>
        </motion.div>

        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Layers className="size-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">No collections yet</h3>
            <p className="text-sm text-muted-foreground/70 max-w-sm">
              Collections will be created as the community grows and topics emerge.
            </p>
          </div>
        ) : (
          <>
            {/* Featured Collections - Hero Grid */}
            {featured.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="size-5 text-amber-400" />
                  <h2 className="text-lg font-semibold">Featured Collections</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {featured.map((collection, i) => {
                    const colors = getColor(collection.color)
                    const IconComponent = getIcon(collection.icon)
                    return (
                      <motion.div
                        key={collection.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <Link href={`/community/collections/${collection.slug}`} className="block group">
                          <div className={`relative p-6 rounded-2xl ${colors.bg} border ${colors.border} hover:border-opacity-60 transition-all h-full`}>
                            <div className="flex items-start gap-4">
                              <div className={`size-12 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                                <IconComponent className={`size-6 ${colors.icon}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className={`text-base font-semibold ${colors.text} group-hover:underline decoration-offset-2 mb-1`}>
                                  {collection.title}
                                </h3>
                                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                                  {collection.description}
                                </p>
                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                  <span className={`px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium`}>
                                    {collection.postCount} posts
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className={`absolute top-3 right-3`}>
                              <Badge className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                                Featured
                              </Badge>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* All Collections - Regular Grid */}
            {nonFeatured.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="size-5 text-primary" />
                  <h2 className="text-lg font-semibold">All Collections</h2>
                  <span className="text-xs text-muted-foreground">({nonFeatured.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nonFeatured.map((collection, i) => {
                    const colors = getColor(collection.color)
                    const IconComponent = getIcon(collection.icon)
                    return (
                      <motion.div
                        key={collection.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (featured.length + i) * 0.05 }}
                      >
                        <Link href={`/community/collections/${collection.slug}`} className="block group">
                          <div className={`p-5 rounded-xl ${colors.bg} border ${colors.border} hover:border-opacity-60 transition-all h-full`}>
                            <div className="flex items-start gap-3">
                              <div className={`size-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                                <IconComponent className={`size-5 ${colors.icon}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className={`text-sm font-semibold ${colors.text} group-hover:underline decoration-offset-2 mb-1`}>
                                  {collection.title}
                                </h3>
                                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                                  {collection.description}
                                </p>
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  {collection.postCount} posts
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}


