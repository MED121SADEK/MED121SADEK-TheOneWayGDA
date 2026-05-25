'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SearchFilters } from './useSearchFilters'

export interface SavedSearchItem {
  id: string
  visitorId: string
  userId?: string | null
  name: string
  filters: string // JSON string
  useCount: number
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'oneway-visitor-session'

function getVisitorId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (!s) return null
    return JSON.parse(s).email || null
  } catch {
    return null
  }
}

export function useSavedSearches() {
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([])
  const [loading, setLoading] = useState(false)

  const visitorId = getVisitorId()

  // Fetch saved searches
  const fetchSaved = useCallback(async () => {
    if (!visitorId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/search/saved?visitorId=${encodeURIComponent(visitorId)}`)
      const data = await res.json()
      if (data.saved) setSavedSearches(data.saved)
    } catch { /* silent */ }
    setLoading(false)
  }, [visitorId])

  useEffect(() => {
    fetchSaved()
  }, [fetchSaved])

  // Save a new search
  const saveSearch = useCallback(async (name: string, filters: SearchFilters): Promise<boolean> => {
    if (!visitorId) return false
    try {
      const res = await fetch('/api/search/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, name, filters }),
      })
      if (res.ok) {
        await fetchSaved()
        return true
      }
    } catch { /* silent */ }
    return false
  }, [visitorId, fetchSaved])

  // Delete a saved search
  const deleteSearch = useCallback(async (id: string) => {
    if (!visitorId) return
    try {
      await fetch(`/api/search/saved?id=${id}&visitorId=${encodeURIComponent(visitorId)}`, {
        method: 'DELETE',
      })
      setSavedSearches(prev => prev.filter(s => s.id !== id))
    } catch { /* silent */ }
  }, [visitorId])

  // Parse filters from a saved search
  const parseFilters = useCallback((saved: SavedSearchItem): SearchFilters | null => {
    try {
      return JSON.parse(saved.filters)
    } catch {
      return null
    }
  }, [])

  return {
    savedSearches,
    loading,
    saveSearch,
    deleteSearch,
    parseFilters,
    refetch: fetchSaved,
    canSave: !!visitorId,
  }
}
