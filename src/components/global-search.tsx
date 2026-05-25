'use client'

import React, { Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Search, Newspaper, Users, LayoutDashboard, Star, Clock, Trash2,
  ArrowRight, Loader2, TrendingUp, Trophy, FileText, SlidersHorizontal,
  X, ChevronDown, Sparkles,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SearchSource } from '@/hooks/useSearchFilters'

/* ─── Types ─── */
interface SearchResult {
  id: string
  title: string
  description?: string
  type: string
  likes?: number
  createdAt?: string
  sourceUrl?: string | null
  sourceName?: string | null
  path?: string
}

interface UnifiedSearchResponse {
  query: string
  results: {
    community: SearchResult[]
    news: SearchResult[]
    leaderboard: SearchResult[]
    pages: SearchResult[]
  }
  total: number
}

/* ─── Constants ─── */
const STORAGE_KEY = 'oneway-recent-searches'
const MAX_RECENT = 10

const SOURCE_TABS: { key: SearchSource; label: string; icon: typeof Search }[] = [
  { key: 'all', label: 'All', icon: Search },
  { key: 'community', label: 'Community', icon: Users },
  { key: 'news', label: 'News', icon: Newspaper },
  { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { key: 'pages', label: 'Pages', icon: FileText },
]

const SORT_OPTIONS = [{ value: 'latest', label: 'Latest' }, { value: 'popular', label: 'Popular' }]
const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' }, { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' }, { value: 'year', label: 'This Year' },
]

const QUICK_LINKS = [
  { label: 'Community Feed', icon: Newspaper, path: '/community' },
  { label: 'Trending Posts', icon: TrendingUp, path: '/community?sort=popular' },
  { label: 'Workspace', icon: LayoutDashboard, path: '/workspace' },
  { label: 'AI Leaderboard', icon: Trophy, path: '/leaderboard' },
  { label: 'Analytics', icon: LayoutDashboard, path: '/analytics' },
]

const POPULAR_TOPICS = [
  { label: 'AI & Machine Learning', tag: 'AI', icon: Star },
  { label: 'Research Papers', tag: 'Research', icon: Newspaper },
  { label: 'Innovation & Tools', tag: 'Innovation', icon: Users },
  { label: 'Foundation Models', tag: 'Foundation Models', icon: Sparkles },
]

function getSourceIcon(type: string) {
  switch (type) {
    case 'community': return Users
    case 'news': return Newspaper
    case 'leaderboard': return Trophy
    case 'page': return FileText
    default: return Search
  }
}

function getSourceBadgeColor(type: string): string {
  switch (type) {
    case 'news': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'community': return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
    case 'leaderboard': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'page': return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
    default: return ''
  }
}

/* ─── LocalStorage helpers ─── */
function readRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function persistRecentSearch(query: string) {
  if (typeof window === 'undefined') return
  const recent = readRecentSearches().filter(s => s.toLowerCase() !== query.toLowerCase())
  recent.unshift(query)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

function removeRecentSearch(term: string) {
  if (typeof window === 'undefined') return
  const recent = readRecentSearches().filter(s => s.toLowerCase() !== term.toLowerCase())
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
}

function clearAllRecentSearches() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/* ─── Active Filter Pill ─── */
function ActiveFilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs text-primary"
    >
      <span>{label}</span>
      <button onClick={e => { e.stopPropagation(); onRemove() }}
        className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
        aria-label={`Remove ${label} filter`}>
        <X className="size-2.5" />
      </button>
    </motion.div>
  )
}

/* ─── Main Component (Suspense wrapper) ─── */
export function GlobalSearch() {
  return (
    <Suspense fallback={null}>
      <GlobalSearchInner />
    </Suspense>
  )
}

function GlobalSearchInner() {
  const router = useRouter()
  const urlParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [recentVersion, setRecentVersion] = useState(0)
  const [searchResults, setSearchResults] = useState<UnifiedSearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeSource, setActiveSource] = useState<SearchSource>('all')
  const [sort, setSort] = useState<'latest' | 'popular'>('latest')
  const [dateRange, setDateRange] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const recentSearches = useMemo(() => {
    void recentVersion
    return readRecentSearches()
  }, [recentVersion])

  const activeFilterPills = useMemo(() => {
    const pills: { label: string; onReset: () => void }[] = []
    if (activeSource !== 'all') {
      const tab = SOURCE_TABS.find(t => t.key === activeSource)
      pills.push({ label: `Source: ${tab?.label || activeSource}`, onReset: () => setActiveSource('all') })
    }
    if (sort !== 'latest') pills.push({ label: `Sort: Popular`, onReset: () => setSort('latest') })
    if (dateRange !== 'all') {
      const dr = DATE_RANGE_OPTIONS.find(d => d.value === dateRange)
      pills.push({ label: `Date: ${dr?.label || dateRange}`, onReset: () => setDateRange('all') })
    }
    return pills
  }, [activeSource, sort, dateRange])

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen) {
      const q = urlParams.get('q')
      setQuery(q || '')
      setSearchResults(null)
      setLoading(false)
      setRecentVersion(v => v + 1)
    }
  }, [urlParams])

  const fetchResults = useCallback(async (q: string, source: SearchSource, s: string, dr: string) => {
    if (!q.trim()) { setSearchResults(null); setLoading(false); return }
    setLoading(true)
    try {
      const params = new URLSearchParams({ q: q.trim(), source, sort: s, limit: '5' })
      if (dr !== 'all') params.set('dateRange', dr)
      const res = await fetch(`/api/search?${params}`)
      const data = await res.json()
      setSearchResults(data)
    } catch { setSearchResults(null) }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      debounceRef.current = setTimeout(() => { setSearchResults(null); setLoading(false) }, 0)
      return
    }
    debounceRef.current = setTimeout(() => fetchResults(query, activeSource, sort, dateRange), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, activeSource, sort, dateRange, fetchResults])

  const executeSearch = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return
    persistRecentSearch(searchTerm.trim())
    setRecentVersion(v => v + 1)
    setOpen(false)
    const params = new URLSearchParams()
    params.set('q', searchTerm.trim())
    if (sort !== 'latest') params.set('sort', sort)
    if (dateRange !== 'all') params.set('dateRange', dateRange)
    if (activeSource !== 'all' && activeSource !== 'pages') params.set('type', activeSource)
    router.push(`/community?${params.toString()}`)
  }, [router, sort, dateRange, activeSource])

  const handleResultClick = useCallback((result: SearchResult) => {
    persistRecentSearch(query.trim())
    setRecentVersion(v => v + 1)
    setOpen(false)
    if (result.sourceUrl) window.open(result.sourceUrl, '_blank', 'noopener,noreferrer')
    else if (result.path) router.push(result.path)
  }, [query, router])

  const resetAllFilters = useCallback(() => {
    setActiveSource('all'); setSort('latest'); setDateRange('all')
  }, [])

  const hasActiveFilters = activeFilterPills.length > 0

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange} title="Global Search" description="Search posts, news, models, and pages...">
      <CommandInput placeholder="Search community, news, models, pages..." value={query} onValueChange={setQuery} />

      {/* Category Tabs */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/50 overflow-x-auto scrollbar-none">
        {SOURCE_TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeSource === tab.key
          return (
            <button key={tab.key} onClick={() => setActiveSource(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <Icon className="size-3" />{tab.label}
            </button>
          )
        })}
      </div>

      {/* Filter Toggle + Active Pills */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30">
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <button className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors ${hasActiveFilters ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <SlidersHorizontal className="size-3" />Filters
              {hasActiveFilters && <Badge variant="secondary" className="ml-0.5 size-4 p-0 text-[10px] justify-center">{activeFilterPills.length}</Badge>}
              <ChevronDown className={`size-3 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 pb-1.5">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Sort:</span>
                {SORT_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setSort(opt.value as 'latest' | 'popular')}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${sort === opt.value ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-muted'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Date:</span>
                {DATE_RANGE_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setDateRange(opt.value)}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${dateRange === opt.value ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-muted'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
        <AnimatePresence>
          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none ml-auto">
              {activeFilterPills.map(pill => <ActiveFilterPill key={pill.label} label={pill.label} onRemove={pill.onReset} />)}
              <button onClick={resetAllFilters} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">Clear all</button>
            </div>
          )}
        </AnimatePresence>
      </div>

      <CommandList className="max-h-[400px]">
        <CommandEmpty>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Searching across sources...</span>
            </div>
          ) : query.trim() ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <Search className="size-6 text-muted-foreground/30" />
              <span className="text-sm text-muted-foreground">No results found for &quot;{query}&quot;</span>
              <Button variant="link" size="sm" onClick={() => executeSearch(query)} className="mt-1 text-primary">Search community for &quot;{query}&quot;</Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6">
              <Search className="size-6 text-muted-foreground/30" />
              <span className="text-sm text-muted-foreground">Type to search across all sources...</span>
              <span className="text-[10px] text-muted-foreground/60">Community · News · AI Models · Pages</span>
            </div>
          )}
        </CommandEmpty>

        {/* Default State (no query) */}
        {!query.trim() && (
          <>
            <CommandGroup heading="Quick Links">
              {QUICK_LINKS.map(link => (
                <CommandItem key={link.path + link.label} onSelect={() => { setOpen(false); router.push(link.path) }}>
                  <link.icon className="size-4 text-muted-foreground" /><span>{link.label}</span>
                  <CommandShortcut><ArrowRight className="size-3" /></CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            {recentSearches.length > 0 && (
              <CommandGroup heading="Recent Searches">
                {recentSearches.slice(0, 5).map(term => (
                  <CommandItem key={term} value={term} onSelect={() => executeSearch(term)}>
                    <Clock className="size-4 text-muted-foreground" /><span className="flex-1 truncate">{term}</span>
                    <button onClick={e => { e.stopPropagation(); removeRecentSearch(term); setRecentVersion(v => v + 1) }}
                      className="ml-2 p-0.5 rounded hover:bg-muted transition-colors" aria-label={`Remove ${term}`}>
                      <Trash2 className="size-3 text-muted-foreground/50 hover:text-destructive" />
                    </button>
                  </CommandItem>
                ))}
                <CommandItem onSelect={() => { clearAllRecentSearches(); setRecentVersion(v => v + 1) }}>
                  <Trash2 className="size-4 text-muted-foreground" /><span className="text-muted-foreground">Clear all recent searches</span>
                </CommandItem>
              </CommandGroup>
            )}
            <CommandSeparator />
            <CommandGroup heading="Popular Topics">
              {POPULAR_TOPICS.map(topic => (
                <CommandItem key={topic.tag} onSelect={() => executeSearch(topic.tag)}>
                  <topic.icon className="size-4" /><span>{topic.label}</span>
                  <CommandShortcut>{topic.tag}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Search Results (with query) */}
        {query.trim() && searchResults && (
          <>
            {searchResults.results.community.length > 0 && (
              <><CommandGroup heading="Community Posts">
                {searchResults.results.community.map(post => {
                  const Icon = getSourceIcon(post.type)
                  return (
                    <CommandItem key={`c-${post.id}`} value={post.title} onSelect={() => handleResultClick(post)}>
                      <Icon className="size-4 text-teal-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{post.title}</p>
                        {post.description && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{post.description}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getSourceBadgeColor('community')}`}>Community</Badge>
                          {post.likes && post.likes > 0 && <span className="text-[10px] text-muted-foreground">{post.likes} likes</span>}
                        </div>
                      </div>
                      <ArrowRight className="size-3 text-muted-foreground flex-shrink-0" />
                    </CommandItem>
                  )
                })}
              </CommandGroup><CommandSeparator /></>
            )}
            {searchResults.results.news.length > 0 && (
              <><CommandGroup heading="News">
                {searchResults.results.news.map(item => {
                  const Icon = getSourceIcon(item.type)
                  return (
                    <CommandItem key={`n-${item.id}`} value={item.title} onSelect={() => handleResultClick(item)}>
                      <Icon className="size-4 text-emerald-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.title}</p>
                        {item.description && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.description}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getSourceBadgeColor('news')}`}>News</Badge>
                          {item.sourceName && <span className="text-[10px] text-muted-foreground">{item.sourceName}</span>}
                        </div>
                      </div>
                      <ArrowRight className="size-3 text-muted-foreground flex-shrink-0" />
                    </CommandItem>
                  )
                })}
              </CommandGroup><CommandSeparator /></>
            )}
            {searchResults.results.leaderboard.length > 0 && (
              <><CommandGroup heading="AI Models">
                {searchResults.results.leaderboard.map(model => {
                  const Icon = getSourceIcon(model.type)
                  return (
                    <CommandItem key={`lb-${model.id}`} value={model.title} onSelect={() => handleResultClick(model)}>
                      <Icon className="size-4 text-amber-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{model.title}</p>
                        {model.description && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{model.description}</p>}
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 mt-1 ${getSourceBadgeColor('leaderboard')}`}>AI Model</Badge>
                      </div>
                      <ArrowRight className="size-3 text-muted-foreground flex-shrink-0" />
                    </CommandItem>
                  )
                })}
              </CommandGroup><CommandSeparator /></>
            )}
            {searchResults.results.pages.length > 0 && (
              <><CommandGroup heading="Pages">
                {searchResults.results.pages.map(page => {
                  const Icon = getSourceIcon(page.type)
                  return (
                    <CommandItem key={`p-${page.id}`} value={page.title} onSelect={() => handleResultClick(page)}>
                      <Icon className="size-4 text-violet-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{page.title}</p>
                        {page.description && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{page.description}</p>}
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 mt-1 ${getSourceBadgeColor('page')}`}>Page</Badge>
                      </div>
                      <ArrowRight className="size-3 text-muted-foreground flex-shrink-0" />
                    </CommandItem>
                  )
                })}
              </CommandGroup><CommandSeparator /></>
            )}
            <CommandItem onSelect={() => executeSearch(query)}>
              <Search className="size-4 text-primary" />
              <span className="text-primary font-medium">Search all for &quot;{query}&quot;</span>
              <CommandShortcut>Enter</CommandShortcut>
            </CommandItem>
          </>
        )}

        {/* Footer hint */}
        {!query.trim() && (
          <><CommandSeparator />
            <div className="px-3 py-2 text-[10px] text-muted-foreground border-t border-border/50 flex items-center justify-between">
              <span>Search across <span className="text-emerald-600 dark:text-emerald-400 font-medium">community</span>, <span className="text-emerald-600 dark:text-emerald-400 font-medium">news</span>, <span className="text-amber-600 dark:text-amber-400 font-medium">models</span> & <span className="text-violet-600 dark:text-violet-400 font-medium">pages</span></span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground"><span className="text-xs">&#8984;</span>K</kbd>
            </div>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
