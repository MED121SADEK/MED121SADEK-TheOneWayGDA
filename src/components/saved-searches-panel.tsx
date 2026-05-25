'use client'

import type { SearchFilters } from '@/hooks/useSearchFilters'
import type { SavedSearchItem } from '@/hooks/useSavedSearches'

interface SavedSearchesPanelProps {
  savedSearches: Array<{ id: string; name: string; filters: string; useCount: number; createdAt: string }>
  loading?: boolean
  canSave?: boolean
  hasActiveFilters?: boolean
  filterSummary?: string
  currentFilters?: SearchFilters
  onSave: (name: string, filters: SearchFilters) => Promise<boolean>
  onDelete: (id: string) => void
  onApply: (filters: SearchFilters) => void
  parseFilters: (saved: SavedSearchItem) => SearchFilters | null
}

export function SavedSearchesPanel(_props: SavedSearchesPanelProps) {
  return null
}
