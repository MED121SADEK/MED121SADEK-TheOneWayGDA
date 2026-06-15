'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table2, Plus, Trash2, Variable,
} from 'lucide-react'
import type { HandlerHook } from './types'

/* ─── Panel 3: Data Editor ─── */
export function DataEditorPanel(h: HandlerHook) {
  const vars = h.store.variables
  const data = h.store.data
  const rows = h.rowCount

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 bg-muted/20 flex-shrink-0">
        <Badge variant="outline" className="text-[10px]">{vars.length} variables</Badge>
        <Badge variant="outline" className="text-[10px]">{rows} rows</Badge>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => h.store.addRow()}>
          <Plus className="w-3 h-3 mr-1" />Row
        </Button>
        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => rows > 0 && h.store.deleteRow(rows - 1)} disabled={rows === 0}>
          <Trash2 className="w-3 h-3 mr-1" />Row
        </Button>
      </div>
      <div className="flex-1 overflow-auto scrollbar-thin" style={{ contain: 'layout style paint' }}>
        {vars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Table2 className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">No data imported yet</p>
            <p className="text-[10px] text-muted-foreground mt-1">Go to Data Import to get started</p>
          </div>
        ) : (
          <div className="min-w-full">
            {/* Header row */}
            <div className="flex sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b border-border/50">
              <div className="w-10 flex-shrink-0 border-r border-border/50 text-center text-[9px] text-muted-foreground py-1.5 font-medium">#</div>
              {vars.map((v) => (
                <div
                  key={v.id}
                  className={cn(
                    'flex-1 min-w-24 border-r border-border/50 last:border-r-0 px-2 py-1.5 flex items-center gap-1 cursor-pointer transition-colors',
                    h.store.selectedVariables.includes(v.name) ? 'bg-blue-500/10' : 'hover:bg-muted/50',
                  )}
                  onClick={() => h.store.toggleVariableSelection(v.name)}
                >
                  <input
                    type="checkbox"
                    checked={h.store.selectedVariables.includes(v.name)}
                    onChange={() => h.store.toggleVariableSelection(v.name)}
                    className="w-3 h-3 accent-blue-500"
                  />
                  <span className="text-[10px] font-semibold truncate">{v.name}</span>
                  <Badge variant="outline" className="text-[8px] px-1 py-0 ml-auto">{v.type}</Badge>
                </div>
              ))}
            </div>
            {/* Data rows */}
            {Array.from({ length: Math.min(rows, 100) }, (_, i) => (
              <div key={i} className="flex border-b border-border/20 hover:bg-muted/20 transition-colors">
                <div className="w-10 flex-shrink-0 border-r border-border/50 text-center text-[9px] text-muted-foreground py-1.5">{i + 1}</div>
                {vars.map((v) => {
                  const cellVal = data[v.name]?.[i] ?? ''
                  return (
                    <div key={v.id} className="flex-1 min-w-24 border-r border-border/30 last:border-r-0 px-1 py-0.5">
                      <input
                        className="w-full text-[11px] bg-transparent border-0 outline-none focus:bg-muted/50 rounded px-1 py-1 focus:ring-1 focus:ring-blue-500/30 text-foreground"
                        value={String(cellVal)}
                        onChange={(e) => {
                          const newData = { ...h.store.data }
                          const col = [...(newData[v.name] || [])]
                          col[i] = v.type === 'numeric' ? (parseFloat(e.target.value) || 0) : e.target.value
                          newData[v.name] = col
                          h.store.setData(newData)
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
            {rows > 100 && (
              <div className="px-4 py-2 text-[10px] text-muted-foreground text-center">
                Showing 100 of {rows} rows
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Panel 6: Variables ─── */
export function VariablesPanel(h: HandlerHook) {
  const typeColors: Record<string, string> = {
    numeric: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    string: 'bg-green-500/10 text-green-400 border-green-500/20',
    date: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    currency: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  }

  return (
    <div className="p-4 overflow-y-auto h-full scrollbar-thin" style={{ contain: 'layout style paint' }}>
      <div className="flex items-center justify-between mb-3">
        <Badge variant="outline" className="text-[10px]">
          {h.store.variables.length} variables
        </Badge>
        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => h.setNewVarDialogOpen(true)}>
          <Plus className="w-3 h-3 mr-1" />Add
        </Button>
      </div>
      {h.store.variables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Variable className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">No variables defined</p>
          <p className="text-[10px] text-muted-foreground mt-1">Import data or add variables manually</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {h.store.variables.map((v) => (
            <div
              key={v.id}
              className={cn(
                'flex items-center gap-2 p-2.5 rounded-lg border transition-colors cursor-pointer',
                h.store.selectedVariables.includes(v.name)
                  ? 'border-pink-500/30 bg-pink-500/5'
                  : 'border-border/40 hover:border-pink-400/30 hover:bg-muted/30',
              )}
              onClick={() => h.store.toggleVariableSelection(v.name)}
            >
              <input
                type="checkbox"
                checked={h.store.selectedVariables.includes(v.name)}
                onChange={() => h.store.toggleVariableSelection(v.name)}
                className="w-3 h-3 accent-pink-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold truncate">{v.name}</p>
                <p className="text-[9px] text-muted-foreground">{v.label}</p>
              </div>
              <Badge variant="outline" className={cn('text-[8px] px-1.5 py-0', typeColors[v.type] || 'bg-muted text-muted-foreground')}>
                {v.type}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); h.store.deleteVariable(v.id) }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}