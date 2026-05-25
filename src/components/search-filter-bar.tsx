'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  SlidersHorizontal, X, Calendar, Tag, User, Heart,
  ChevronDown, ChevronUp, RotateCcw, Clock, Flame,
  Sparkles, Award, Bookmark,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { SavedSearchesPanel } from '@/components/saved-searches-panel'
import type { SavedSearchItem } from '@/hooks/useSavedSearches'
import type { SearchFilters } from '@/hooks/useSearchFilters'

/* ─── Config ─── */
const DATE_PRESETS: { key: SearchFilters['dateRange']; label: string; icon?: typeof Clock }[] = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week', icon: Clock },
  { key: 'month', label: 'This Month' },
  { key: 'quarter', label: '3 Months' },
  { key: 'year', label: 'This Year' },
]

const TAG_OPTIONS = [
  { key: 'AI', label: 'AI', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { key: 'Research', label: 'Research', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { key: 'Innovation', label: 'Innovation', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { key: 'Tutorial', label: 'Tutorial', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { key: 'News', label: 'News', color: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
  { key: 'Community', label: 'Community', color: 'bg-teal-500/10 text-teal-400 border-teal-500/30' },
]

const SORT_OPTIONS: { key: SearchFilters['sort']; label: string; icon: typeof Flame }[] = [
  { key: 'latest', label: 'Latest', icon: Clock },
  { key: 'popular', label: 'Popular', icon: Flame },
  { key: 'featured', label: 'Featured', icon: Sparkles },
]

/* ─── Props ─── */
interface SearchFilterBarProps {
  filters: SearchFilters
  onToggleTag: (tag: string) => void
  onUpdateFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void
  onResetFilters: () => void
  activeCount: number
  hasActiveFilters: boolean
  filterSummary: string
  savedSearches?: SavedSearchItem[]
  savedSearchesLoading?: boolean
  canSave?: boolean
  onSaveSearch?: (name: string, filters: SearchFilters) => Promise<boolean>
  onDeleteSavedSearch?: (id: string) => void
  onApplySavedSearch?: (filters: SearchFilters) => void
  onParseSavedFilters?: (saved: SavedSearchItem) => SearchFilters | null
  className?: string
}

/* ─── Component ─── */
export function SearchFilterBar({
  filters,
  onToggleTag,
  onUpdateFilter,
  onResetFilters,
  activeCount,
  hasActiveFilters,
  filterSummary,
  savedSearches = [],
  savedSearchesLoading = false,
  canSave = false,
  onSaveSearch,
  onDeleteSavedSearch,
  onApplySavedSearch,
  onParseSavedFilters,
  className,
}: SearchFilterBarProps) {
  const [expanded, setExpanded] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  return (
    <div className={cn('space-y-3', className)} role="search" aria-label="Filter search results">
      {/* ── Saved Searches (collapsible) ── */}
      {showSaved && onSaveSearch && onApplySavedSearch && onParseSavedFilters && onDeleteSavedSearch && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="overflow-hidden"
        >
          <SavedSearchesPanel
            savedSearches={savedSearches}
            loading={savedSearchesLoading}
            canSave={canSave}
            hasActiveFilters={hasActiveFilters}
            filterSummary={filterSummary}
            currentFilters={filters}
            onSave={onSaveSearch}
            onDelete={onDeleteSavedSearch}
            onApply={onApplySavedSearch}
            parseFilters={onParseSavedFilters}
          />
        </motion.div>
      )}
      {/* ── Main filter row: Sort + Date + Expand toggle ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Sort selector */}
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5 border border-border/30" role="group" aria-label="Sort by">
          {SORT_OPTIONS.map(opt => {
            const isActive = filters.sort === opt.key
            const Icon = opt.icon
            return (
              <button
                key={opt.key}
                onClick={() => onUpdateFilter('sort', opt.key)}
                aria-pressed={isActive}
                aria-label={`Sort by ${opt.label}`}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                  isActive
                    ? 'bg-card text-foreground shadow-sm border border-border/50'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3" />
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* Date range presets */}
        <div className="flex items-center gap-1 overflow-x-auto" role="group" aria-label="Date range">
          <Calendar className="size-3 text-muted-foreground flex-shrink-0 ml-1" />
          {DATE_PRESETS.map(preset => (
            <button
              key={preset.key}
              onClick={() => onUpdateFilter('dateRange', preset.key)}
              aria-pressed={filters.dateRange === preset.key}
              className={cn(
                'px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all',
                filters.dateRange === preset.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Active filter count badge + expand/collapse */}
        <div className="flex items-center gap-1.5">
          {hasActiveFilters && (
            <Badge
              variant="secondary"
              className="text-[10px] h-5 px-1.5 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={onResetFilters}
              title="Clear all filters"
              role="button"
              aria-label={`${activeCount} active filters. Click to clear all.`}
            >
              {activeCount} active
              <X className="size-2.5 ml-0.5" />
            </Badge>
          )}

          {/* Saved searches toggle */}
          {onSaveSearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSaved(prev => !prev)}
              className={cn(
                'h-7 px-2 gap-1 text-xs',
                showSaved && 'bg-muted/50',
                savedSearches.length > 0 && !showSaved && 'text-primary',
              )}
            >
              <Bookmark className="size-3" />
              <span className="hidden sm:inline">Saved</span>
              {savedSearches.length > 0 && (
                <span className="text-[9px] bg-primary/15 text-primary px-1 rounded-full">{savedSearches.length}</span>
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(prev => !prev)}
            aria-expanded={expanded}
            aria-controls="advanced-filters-panel"
            className={cn(
              'h-7 px-2 gap-1 text-xs',
              expanded && 'bg-muted/50',
              hasActiveFilters && 'text-primary',
            )}
          >
            <SlidersHorizontal className="size-3" />
            Filters
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>
        </div>
      </div>

      {/* ── Active filter pills ── */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-1.5 flex-wrap"
        >
          {filters.tags.map(tag => {
            const tagConfig = TAG_OPTIONS.find(t => t.key === tag)
            return (
              <FilterPill
                key={tag}
                icon={<Tag className="size-3" />}
                label={tag}
                colorClass={tagConfig?.color || ''}
                onRemove={() => onToggleTag(tag)}
              />
            )
          })}
          {filters.dateRange !== 'all' && (
            <FilterPill
              icon={<Calendar className="size-3" />}
              label={DATE_PRESETS.find(p => p.key === filters.dateRange)?.label || filters.dateRange}
              onRemove={() => onUpdateFilter('dateRange', 'all')}
            />
          )}
          {filters.minLikes > 0 && (
            <FilterPill
              icon={<Heart className="size-3" />}
              label={`${filters.minLikes}+ likes`}
              onRemove={() => onUpdateFilter('minLikes', 0)}
            />
          )}
          {filters.author && (
            <FilterPill
              icon={<User className="size-3" />}
              label={filters.author}
              onRemove={() => onUpdateFilter('author', '')}
            />
          )}
          <button
            onClick={onResetFilters}
            aria-label="Clear all filters"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-destructive transition-colors"
          >
            <RotateCcw className="size-2.5" />
            Clear all
          </button>
        </motion.div>
      )}

      {/* ── Expanded advanced filters ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div id="advanced-filters-panel" className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-card/40 border border-border/30">
              {/* Tags multi-select */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Tag className="size-3 text-primary" />
                  Topics
                </label>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Topic filters">
                  {TAG_OPTIONS.map(tag => {
                    const isSelected = filters.tags.includes(tag.key)
                    return (
                      <button
                        key={tag.key}
                        onClick={() => onToggleTag(tag.key)}
                        aria-pressed={isSelected}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all',
                          isSelected
                            ? tag.color
                            : 'bg-muted/20 text-muted-foreground hover:text-foreground border-transparent hover:border-border/50',
                        )}
                      >
                        {tag.label}
                        {isSelected && <X className="size-2.5" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Min likes slider */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Heart className="size-3 text-rose-400" />
                  Minimum Likes
                  {filters.minLikes > 0 && (
                    <span className="text-primary font-bold">{filters.minLikes}</span>
                  )}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={5}
                    value={filters.minLikes}
                    onChange={(e) => onUpdateFilter('minLikes', parseInt(e.target.value, 10))}
                    aria-label="Minimum likes slider"
                    className="flex-1 h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={9999}
                    value={filters.minLikes || ''}
                    onChange={(e) => onUpdateFilter('minLikes', parseInt(e.target.value, 10) || 0)}
                    placeholder="0"
                    className="w-16 h-7 text-xs text-center rounded-lg"
                  />
                </div>
              </div>

              {/* Author filter */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <User className="size-3 text-blue-400" />
                  Author
                </label>
                <Input
                  value={filters.author}
                  onChange={(e) => onUpdateFilter('author', e.target.value)}
                  placeholder="Filter by author email..."
                  className="h-8 text-xs rounded-lg"
                />
              </div>

              {/* Custom date range (only shown when 'custom' selected) */}
              {filters.dateRange === 'custom' && (
                <div className="sm:col-span-3 space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="size-3 text-amber-400" />
                    Custom Date Range
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={filters.customFrom}
                      onChange={(e) => onUpdateFilter('customFrom', e.target.value)}
                      className="h-8 text-xs rounded-lg flex-1"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="date"
                      value={filters.customTo}
                      onChange={(e) => onUpdateFilter('customTo', e.target.value)}
                      className="h-8 text-xs rounded-lg flex-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Filter Pill (active tag chip) ─── */
function FilterPill({
  icon,
  label,
  colorClass,
  onRemove,
}: {
  icon: React.ReactNode
  label: string
  colorClass?: string
  onRemove: () => void
}) {
  return (
    <span
      role="group"
      aria-label={`Active filter: ${label}`}
      className={cn(
        'inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[11px] font-medium border transition-all',
        colorClass || 'bg-primary/10 text-primary border-primary/20',
      )}
    >
      {icon}
      {label}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        aria-label={`Remove ${label} filter`}
        className="ml-0.5 p-0.5 rounded-full hover:bg-foreground/10 transition-colors"
      >
        <X className="size-2.5" />
      </button>
    </span>
  )
}
