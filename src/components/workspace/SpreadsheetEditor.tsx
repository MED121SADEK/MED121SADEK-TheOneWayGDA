'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus, Trash2, ArrowUp, ArrowDown, Undo2, Redo2,
  Filter, X, ChevronDown, Search,
} from 'lucide-react'
import type { HandlerHook } from './WorkspacePanels'

interface SpreadsheetEditorProps {
  h: HandlerHook
}

interface HistoryEntry {
  varName: string
  row: number
  prevValue: any
  newValue: any
}

const ROWS_PER_PAGE = 100

export function SpreadsheetEditor({ h }: SpreadsheetEditorProps) {
  const vars = h.store.variables
  const data = h.store.data
  const totalRows = h.rowCount

  // Cell selection state
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [editCell, setEditCell] = useState<{ row: number; col: number } | null>(null)
  const editRef = useRef<HTMLInputElement>(null)

  // Sorting state
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Filter state
  const [filterCol, setFilterCol] = useState<number | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterChecks, setFilterChecks] = useState<Set<string>>(new Set())

  // Virtual scroll state
  const [scrollOffset, setScrollOffset] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Undo/Redo
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Scroll position tracking
  const [scrollTop, setScrollTop] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  // Get filtered and sorted row indices
  const displayRows = useMemo(() => {
    let rows = Array.from({ length: totalRows }, (_, i) => i)

    // Apply filter
    if (filterCol !== null && filterChecks.size > 0) {
      const vName = vars[filterCol]?.name
      if (vName) {
        rows = rows.filter(i => {
          const val = String(data[vName]?.[i] ?? '')
          return filterChecks.has(val)
        })
      }
    }

    // Apply sort
    if (sortCol !== null) {
      const vName = vars[sortCol]?.name
      if (vName) {
        const col = data[vName] || []
        rows = [...rows].sort((a, b) => {
          const va = col[a] ?? ''
          const vb = col[b] ?? ''
          const na = typeof va === 'number' && !isNaN(va) ? va : parseFloat(va)
          const nb = typeof vb === 'number' && !isNaN(vb) ? vb : parseFloat(vb)
          if (!isNaN(na) && !isNaN(nb)) return sortDir === 'asc' ? na - nb : nb - na
          return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
        })
      }
    }

    return rows
  }, [totalRows, filterCol, filterChecks, sortCol, sortDir, vars, data])

  // Get unique values for filter
  const uniqueValues = useMemo(() => {
    if (filterCol === null) return []
    const vName = vars[filterCol]?.name
    if (!vName) return []
    const vals = data[vName] || []
    const unique = [...new Set(vals.map(v => String(v ?? '')))]
    return unique.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }, [filterCol, vars, data])

  // Undo/Redo helpers
  const pushHistory = useCallback((entry: HistoryEntry) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), entry].slice(-50))
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }, [historyIndex])

  const undo = useCallback(() => {
    if (historyIndex < 0) return
    const entry = history[historyIndex]
    if (!entry) return
    h.store.setCellValue(entry.varName, entry.row, entry.prevValue)
    setHistoryIndex(historyIndex - 1)
  }, [historyIndex, history, h.store])

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const entry = history[historyIndex + 1]
    if (!entry) return
    h.store.setCellValue(entry.varName, entry.row, entry.newValue)
    setHistoryIndex(historyIndex + 1)
  }, [historyIndex, history, h.store])

  useEffect(() => { setCanUndo(historyIndex >= 0) }, [historyIndex])
  useEffect(() => { setCanRedo(historyIndex < history.length - 1) }, [historyIndex, history.length])

  // Cell value getter
  const getCellValue = (rowIdx: number, colIdx: number): any => {
    if (colIdx >= vars.length) return ''
    return data[vars[colIdx].name]?.[rowIdx] ?? ''
  }

  // Cell value setter
  const setCellValue = (rowIdx: number, colIdx: number, value: any) => {
    if (colIdx >= vars.length) return
    const vName = vars[colIdx].name
    const prev = data[vName]?.[rowIdx]
    const vDef = vars[colIdx]
    const parsed = vDef.type === 'numeric' ? (parseFloat(value) || 0) : value
    if (prev !== parsed) {
      pushHistory({ varName: vName, row: rowIdx, prevValue: prev, newValue: parsed })
      h.store.setCellValue(vName, rowIdx, parsed)
    }
  }

  // Keyboard handlers
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!activeCell) return

    const { row, col } = activeCell

    // Undo/Redo shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); return }

    if (isEditing) {
      if (e.key === 'Enter') {
        e.preventDefault()
        setCellValue(editCell?.row ?? row, editCell?.col ?? col, editValue)
        setIsEditing(false)
        setEditCell(null)
        setActiveCell({ row: row + 1, col })
      } else if (e.key === 'Tab') {
        e.preventDefault()
        setCellValue(editCell?.row ?? row, editCell?.col ?? col, editValue)
        setIsEditing(false)
        setEditCell(null)
        setActiveCell({ row, col: col + (e.shiftKey ? -1 : 1) })
      } else if (e.key === 'Escape') {
        setIsEditing(false)
        setEditCell(null)
      }
      return
    }

    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); setActiveCell({ row: Math.max(0, row - 1), col }); break
      case 'ArrowDown': e.preventDefault(); setActiveCell({ row: Math.min(totalRows - 1, row + 1), col }); break
      case 'ArrowLeft': e.preventDefault(); setActiveCell({ row, col: Math.max(0, col - 1) }); break
      case 'ArrowRight': e.preventDefault(); setActiveCell({ row, col: Math.min(vars.length - 1, col + 1) }); break
      case 'Enter':
        e.preventDefault()
        const val = getCellValue(displayRows[row], col)
        setEditValue(String(val ?? ''))
        setIsEditing(true)
        setEditCell({ row: displayRows[row], col })
        break
      case 'Tab':
        e.preventDefault()
        setActiveCell({ row, col: col + (e.shiftKey ? -1 : 1) })
        break
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        if (row < displayRows.length && col < vars.length) {
          setCellValue(displayRows[row], col, '')
        }
        break
      case 'Home':
        e.preventDefault()
        setActiveCell({ row, col: 0 })
        break
      case 'End':
        e.preventDefault()
        setActiveCell({ row, col: vars.length - 1 })
        break
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault()
          const actualRow = displayRows[row] ?? 0
          setEditValue(e.key)
          setIsEditing(true)
          setEditCell({ row: actualRow, col: activeCell.col })
        }
    }
  }, [activeCell, isEditing, editValue, editCell, displayRows, totalRows, vars.length, undo, redo, getCellValue, setCellValue])

  // Scroll handler for virtual rendering
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
      setScrollLeft(containerRef.current.scrollLeft)
    }
  }, [])

  // Start editing when double-clicking
  const handleCellDoubleClick = useCallback((rowIdx: number, colIdx: number) => {
    const actualRow = displayRows[rowIdx]
    const val = getCellValue(actualRow, colIdx)
    setEditValue(String(val ?? ''))
    setIsEditing(true)
    setEditCell({ row: actualRow, col: colIdx })
  }, [displayRows, getCellValue])

  // Auto-focus edit input
  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus()
      editRef.current.select()
    }
  }, [isEditing])

  // Reset filter when column changes
  useEffect(() => {
    if (filterCol !== null) {
      const vName = vars[filterCol]?.name
      if (vName) {
        setFilterChecks(new Set((data[vName] || []).map(v => String(v ?? ''))))
      }
    }
  }, [filterCol, vars, data])

  const visibleStart = Math.max(0, Math.floor(scrollTop / 28) - 5)
  const visibleEnd = Math.min(displayRows.length, visibleStart + ROWS_PER_PAGE + 10)
  const visibleRows = displayRows.slice(visibleStart, visibleEnd)

  // Sort handler
  const handleSort = (colIdx: number) => {
    if (sortCol === colIdx) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(colIdx)
      setSortDir('asc')
    }
    setFilterCol(null)
    setFilterOpen(false)
  }

  if (vars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18" /></svg>
        </div>
        <p className="text-xs text-muted-foreground">No data imported yet</p>
        <p className="text-[10px] text-muted-foreground mt-1">Go to Data Import to get started</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/30 bg-muted/20 flex-shrink-0 overflow-x-auto">
        <Badge variant="outline" className="text-[9px] flex-shrink-0">{vars.length} vars</Badge>
        <Badge variant="outline" className="text-[9px] flex-shrink-0">{totalRows} rows</Badge>
        {(filterCol !== null || sortCol !== null) && (
          <Badge variant="secondary" className="text-[9px] bg-blue-500/10 text-blue-400 flex-shrink-0">
            {sortCol !== null ? `Sorted: ${vars[sortCol]?.name}` : `Filtered`}
          </Badge>
        )}
        <div className="flex-1" />
        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <Undo2 className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
          <Redo2 className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5" onClick={() => h.store.addRow()}>
          <Plus className="w-3 h-3 mr-0.5" />Row
        </Button>
        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5" onClick={() => activeCell && displayRows[activeCell.row] != null && h.store.deleteRow(displayRows[activeCell.row])} disabled={!activeCell || displayRows.length === 0}>
          <Trash2 className="w-3 h-3 mr-0.5" />Row
        </Button>
        {(sortCol !== null || filterCol !== null) && (
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5 text-orange-400" onClick={() => { setSortCol(null); setFilterCol(null); setFilterOpen(false) }}>
            <X className="w-3 h-3 mr-0.5" />Clear
          </Button>
        )}
      </div>

      {/* Data grid */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto scrollbar-thin"
        onScroll={handleScroll}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{ contain: 'layout style paint' }}
      >
        <div style={{ minWidth: `${vars.length * 120 + 50}px`, minHeight: '100%' }}>
          {/* Header row */}
          <div className="flex sticky top-0 z-20 bg-muted/90 backdrop-blur-sm border-b border-border/50" style={{ transform: `translateX(-${scrollLeft}px)` }}>
            {/* Row number header */}
            <div className="w-10 flex-shrink-0 border-r border-border/50 flex items-center justify-center sticky left-0 bg-muted/90 backdrop-blur-sm z-30">
              <span className="text-[9px] text-muted-foreground font-medium">#</span>
            </div>
            {vars.map((v, ci) => (
              <div
                key={v.id}
                className={cn(
                  'flex-1 min-w-[100px] border-r border-border/30 last:border-r-0 px-1 py-1.5 flex items-center gap-1 cursor-pointer select-none transition-colors relative',
                  ci === sortCol ? 'bg-blue-500/10' : 'hover:bg-muted/50',
                  activeCell?.col === ci ? 'bg-blue-500/5' : '',
                )}
                onClick={(e) => {
                  if (e.detail === 2) { handleSort(ci) }
                  else { setFilterCol(filterCol === ci && filterOpen ? null : ci); setFilterOpen(filterCol !== ci || !filterOpen) }
                }}
                style={{ transform: `translateX(${scrollLeft}px)` }}
              >
                <span className="text-[10px] font-semibold truncate flex-1">{v.name}</span>
                {ci === sortCol && (
                  <span className="text-[9px] text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
                <Badge variant="outline" className="text-[7px] px-0.5 py-0 opacity-60">{v.type === 'numeric' ? '#' : v.type === 'string' ? 'Aa' : v.type === 'date' ? '◆' : '$'}</Badge>
                {/* Filter dropdown */}
                {filterOpen && filterCol === ci && (
                  <div
                    className="absolute top-full left-0 mt-1 w-52 bg-popover border rounded-lg shadow-lg z-50 p-2 max-h-48 overflow-y-auto"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold">Filter: {v.name}</span>
                      <Button size="sm" variant="ghost" className="h-5 text-[9px]" onClick={() => { setFilterCol(null); setFilterOpen(false) }}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex gap-1 mb-1.5">
                      <Button size="sm" variant="outline" className="h-5 text-[9px] flex-1" onClick={() => {
                        const all = new Set(uniqueValues)
                        setFilterChecks(all)
                      }}>All</Button>
                      <Button size="sm" variant="outline" className="h-5 text-[9px] flex-1" onClick={() => setFilterChecks(new Set())}>None</Button>
                    </div>
                    {uniqueValues.map(val => (
                      <label key={val} className="flex items-center gap-1.5 py-0.5 cursor-pointer hover:bg-muted/50 rounded px-1">
                        <input
                          type="checkbox"
                          className="w-3 h-3 accent-blue-500"
                          checked={filterChecks.has(val)}
                          onChange={() => {
                            setFilterChecks(prev => {
                              const next = new Set(prev)
                              if (next.has(val)) next.delete(val)
                              else next.add(val)
                              return next
                            })
                          }}
                        />
                        <span className="text-[10px] truncate">{val || '(empty)'}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Data rows */}
          <div style={{ height: `${displayRows.length * 28}px` }}>
            {/* Top spacer */}
            <div style={{ height: `${visibleStart * 28}px` }} />

            {visibleRows.map((rowIdx, visIdx) => {
              const isActive = activeCell?.row === visIdx + visibleStart
              return (
                <div
                  key={rowIdx}
                  className={cn(
                    'flex border-b border-border/15 hover:bg-muted/20 transition-colors',
                    isActive && 'bg-blue-500/5',
                  )}
                  style={{ height: 28 }}
                >
                  {/* Row number */}
                  <div className={cn(
                    'w-10 flex-shrink-0 border-r border-border/50 flex items-center justify-center text-[9px] sticky left-0 z-10',
                    isActive ? 'bg-blue-500/10 font-semibold text-blue-600' : 'text-muted-foreground bg-background',
                  )}>
                    {rowIdx + 1}
                  </div>
                  {/* Cells */}
                  {vars.map((v, ci) => {
                    const cellActive = isActive && activeCell?.col === ci
                    const editActive = isEditing && editCell?.row === rowIdx && editCell?.col === ci
                    const cellVal = data[v.name]?.[rowIdx]

                    return (
                      <div
                        key={v.id}
                        className={cn(
                          'flex-1 min-w-[100px] border-r border-border/20 last:border-r-0 px-1 flex items-center',
                          cellActive && !editActive && 'ring-1 ring-inset ring-blue-500',
                          editActive && 'ring-2 ring-inset ring-blue-500 bg-white',
                          v.type === 'numeric' && 'justify-end',
                        )}
                        onClick={() => setActiveCell({ row: visIdx + visibleStart, col: ci })}
                        onDoubleClick={() => handleCellDoubleClick(visIdx + visibleStart, ci)}
                      >
                        {editActive ? (
                          <input
                            ref={editRef}
                            className="w-full text-[11px] bg-transparent border-0 outline-none px-1 py-0 text-black"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => {
                              e.stopPropagation()
                              handleKeyDown(e as any)
                            }}
                          />
                        ) : (
                          <span className={cn(
                            'text-[11px] truncate w-full px-0.5',
                            cellVal === '' || cellVal === null || cellVal === undefined ? 'text-muted-foreground/30' : 'text-foreground',
                          )}>
                            {cellVal === '' || cellVal === null || cellVal === undefined ? '' : String(cellVal)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* Bottom spacer */}
            <div style={{ height: `${(displayRows.length - visibleEnd) * 28}px` }} />
          </div>

          {displayRows.length < totalRows && (
            <div className="px-4 py-2 text-[10px] text-muted-foreground text-center border-t border-border/20">
              Showing {displayRows.length} of {totalRows} rows
              {sortCol !== null && ` · Sorted by ${vars[sortCol]?.name} (${sortDir})`}
              {filterCol !== null && ` · Filtered`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
