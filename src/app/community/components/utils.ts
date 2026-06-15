import {
  Sparkles, FileText, Award, Newspaper, Users,
} from 'lucide-react'
import type { Post } from './types'

/** Get the visitor session from localStorage */
export function getSession(): { email: string; name: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const s = localStorage.getItem('oneway-visitor-session')
    if (!s) return null
    return JSON.parse(s)
  } catch { return null }
}

/** Relative time formatter: "3m ago", "2d ago", etc. */
export function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

/** Safely parse JSON tags field into string[] */
export function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return []
  try { return JSON.parse(tags) } catch { return [] }
}

/** Truncate text with "..." */
export function truncate(text: string, len: number): string {
  if (text.length <= len) return text
  return text.slice(0, len) + '...'
}

/** Post type visual metadata */
export function getPostTypeInfo(type: string): { label: string; icon: any; bg: string; border: string; text: string } {
  switch (type) {
    case 'auto':
      return { label: 'Auto', icon: Sparkles, bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' }
    case 'digest':
      return { label: 'Daily Digest', icon: FileText, bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400' }
    case 'user_highlight':
      return { label: 'Community Picks', icon: Award, bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' }
    case 'news':
      return { label: 'AI News', icon: Newspaper, bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400' }
    default:
      return { label: 'Community', icon: Users, bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' }
  }
}

/** Map tags to a category string */
export function getCategoryFromTags(tags: string[]): string {
  if (tags.includes('Research')) return 'Research'
  if (tags.includes('Innovation')) return 'Innovation'
  return 'AI'
}

/** Card border styling based on post type */
export function getCardClass(post: Post): string {
  if (post.type === 'digest') return 'border-violet-500/30 shadow-sm shadow-violet-500/5'
  if (post.type === 'user_highlight') return 'border-amber-500/30 shadow-sm shadow-amber-500/5'
  if (post.type === 'auto') return 'border-blue-500/20 shadow-sm shadow-blue-500/3'
  if (post.featured) return 'border-primary/30 shadow-sm shadow-primary/5'
  return 'border-border/40'
}