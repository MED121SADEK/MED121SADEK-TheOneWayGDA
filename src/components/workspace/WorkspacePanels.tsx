'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Brain, Database, Table2, BarChart3, FileText, Variable,
  ScanLine, Terminal, Send, Bot, User, Upload, Plus, Trash2,
  Edit3, Copy, ChevronRight, TrendingUp, PieChart, ClipboardList,
  ShieldCheck, Sparkles, Check, X, FolderOpen, Download,
  FileSpreadsheet, Play, Zap, Target, Layers, Loader2, AlertTriangle,
  ArrowRight, CheckCircle2,
} from 'lucide-react'
import { useState, useCallback } from 'react'
import {
  ChartBar, ChartLine, ChartScatter, ChartPie, ChartHistogram, ChartBoxPlot,
  exportChartAsImage,
} from '@/components/workspace/Charts'
import type { OutputItem } from '@/lib/store'

export type HandlerHook = ReturnType<typeof import('@/hooks/useWorkspaceHandlers').useWorkspaceHandlers>

/* ─── Panel 1: AI Assistant ─── */
export function AIPanel(h: HandlerHook) {
  const [agentGoal, setAgentGoal] = useState('')
  const isAgentActive = h.store.agentStatus !== 'idle' && h.store.agentStatus !== 'done' && h.store.agentStatus !== 'error'

  return (
    <div className="flex flex-col h-full">
      {/* Agent Section */}
      <div className="flex-shrink-0 border-b border-border/50 p-3 bg-gradient-to-br from-purple-500/5 to-violet-500/5">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-[11px] font-semibold">AI Agent</span>
          {isAgentActive && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-purple-400">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              {h.store.agentStatus === 'planning' ? 'Planning...' : h.store.agentStatus === 'analyzing' ? 'Analyzing...' : 'Interpreting...'}
            </span>
          )}
          {h.store.agentStatus === 'done' && (
            <span className="ml-auto text-[10px] text-emerald-400">✓ Complete</span>
          )}
          {h.store.agentStatus === 'error' && (
            <span className="ml-auto text-[10px] text-red-400">✗ Failed</span>
          )}
        </div>

        <div className="flex gap-1.5 mb-2">
          <input
            className="flex-1 text-[10px] bg-background border border-border/50 rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-purple-500/30 text-foreground placeholder:text-muted-foreground"
            placeholder="Goal: e.g., Find patterns..."
            value={agentGoal}
            onChange={e => setAgentGoal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !isAgentActive && h.store.variables.length > 0 && h.handleRunAgentAnalysis(agentGoal || undefined)}
          />
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={() => h.handleRunAgentAnalysis(agentGoal || undefined)}
            disabled={h.store.variables.length === 0 || isAgentActive}
            className="flex-1 flex items-center justify-center gap-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-medium rounded-md py-1.5 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            Auto-Analyze
          </button>
        </div>

        <div className="flex gap-1 mt-2">
          {[
            { label: 'Full Analysis', goal: 'Run a comprehensive analysis of all variables', icon: Zap },
            { label: 'Patterns', goal: 'Find patterns and relationships in the data', icon: Target },
            { label: 'Groups', goal: 'Compare groups and find significant differences', icon: Layers },
          ].map(q => (
            <button
              key={q.label}
              onClick={() => { setAgentGoal(q.goal); h.handleRunAgentAnalysis(q.goal) }}
              disabled={h.store.variables.length === 0 || isAgentActive}
              className="text-[9px] px-2 py-1 rounded bg-muted/50 hover:bg-muted border border-border/30 disabled:opacity-30 transition-colors flex items-center gap-0.5"
            >
              <q.icon className="w-2.5 h-2.5" />
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Section */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin" style={{ contain: 'layout style paint' }}>
        {h.store.chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Bot className="w-6 h-6 text-purple-400/40 mb-1.5" />
            <p className="text-[10px] text-muted-foreground">{h.t('ai.welcome')}</p>
          </div>
        )}
        {h.store.chatMessages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-1.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'ai' && (
              <div className="w-5 h-5 rounded-md bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-2.5 h-2.5 text-purple-400" />
              </div>
            )}
            <div className={cn(
              'max-w-[85%] rounded-lg px-2.5 py-1.5 text-[10px] leading-relaxed',
              msg.role === 'user' ? 'bg-primary/10 text-foreground' : 'bg-muted/50 text-foreground',
            )}>
              {msg.content}
            </div>
          </div>
        ))}
        {h.store.isAiTyping && (
          <div className="flex gap-1.5 items-start">
            <div className="w-5 h-5 rounded-md bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-2.5 h-2.5 text-purple-400" />
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-muted/50 rounded-lg">
              <div className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={h.chatEndRef} />
      </div>

      {/* Chat Input */}
      <div className="flex-shrink-0 border-t border-border/50 p-2.5">
        <div className="flex gap-1.5">
          <Input
            value={h.chatInput}
            onChange={(e) => h.setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && h.handleSendChat()}
            placeholder={h.t('ai.placeholder')}
            className="text-[10px] h-7"
          />
          <Button size="sm" className="h-7 px-2.5 bg-purple-600 hover:bg-purple-700" onClick={h.handleSendChat} disabled={!h.chatInput.trim() || h.store.isAiTyping}>
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Panel 2: Data Import ─── */
export function ImportPanel(h: HandlerHook) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')

  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
  const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.json', '.tsv']

  const validateAndProcessFile = (file: File) => {
    setImportError('')
    setImportSuccess('')

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setImportError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 50MB.`)
      return
    }
    if (file.size === 0) {
      setImportError('File is empty.')
      return
    }

    // Validate extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setImportError(`Unsupported file type "${ext}". Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`)
      return
    }

    try {
      h.store.importFile(file)
      setImportSuccess(`Imported "${file.name}" (${(file.size / 1024).toFixed(1)}KB)`)
    } catch (err) {
      setImportError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    validateAndProcessFile(files[0])
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full scrollbar-thin" style={{ contain: 'layout style paint' }}>
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          dragOver ? 'border-teal-400 bg-teal-500/10 scale-[1.01]' : 'border-border hover:border-teal-400/50 hover:bg-teal-500/5'
        )}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json,.tsv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) validateAndProcessFile(file)
            // Reset input so same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = ''
          }}
        />
        {dragOver ? (
          <>
            <Download className="w-8 h-8 mx-auto mb-3 text-teal-400" />
            <p className="text-sm font-medium text-teal-400">Drop your file here</p>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 mx-auto mb-3 text-teal-400" />
            <p className="text-sm font-medium text-foreground">{h.t('import.dragDrop')}</p>
            <p className="text-xs text-muted-foreground mt-1">{h.t('import.supportedFormats')}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Max 50MB</p>
          </>
        )}
      </div>

      {importError && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-[10px] text-red-400">
          <X className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Import Error</p>
            <p>{importError}</p>
          </div>
          <button onClick={() => setImportError('')} className="ml-auto flex-shrink-0 hover:text-red-300">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      {importSuccess && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 text-[10px] text-emerald-400">
          <Check className="w-3 h-3" />
          <span>{importSuccess}</span>
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Paste CSV Data</p>
        <Textarea
          value={h.importText}
          onChange={(e) => h.setImportText(e.target.value)}
          placeholder="Name,Age,Score&#10;Alice,25,89&#10;Bob,30,92"
          className="text-xs min-h-24 font-mono"
        />
        <Button size="sm" className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs" onClick={h.handleImportCSV} disabled={!h.importText.trim()}>
          <Database className="w-3.5 h-3.5 mr-1.5" />
          Import CSV
        </Button>
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Quick Templates</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'Sample Survey', data: 'Respondent,Age,Gender,Satisfaction,Income\n1,25,Male,4,45000\n2,30,Female,5,52000\n3,22,Male,3,38000\n4,35,Female,4,61000\n5,28,Male,5,48000\n6,40,Female,3,72000\n7,33,Male,4,55000\n8,27,Female,5,42000' },
            { name: 'Student Grades', data: 'Student,Math,Science,English,History\nAlice,85,92,88,76\nBob,78,85,90,82\nCarol,92,88,76,95\nDave,65,72,88,70\nEve,88,95,82,90' },
            { name: 'Sales Data', data: 'Month,Revenue,Profit,Customers\nJan,45000,12000,320\nFeb,52000,15000,380\nMar,48000,11000,350\nApr,61000,18000,420\nMay,55000,14000,390' },
          ].map((tpl) => (
            <Button
              key={tpl.name}
              variant="outline"
              size="sm"
              className="text-[10px] h-8 justify-start"
              onClick={() => { h.store.importCSV(tpl.data) }}
            >
              <FileSpreadsheet className="w-3 h-3 mr-1.5" />
              {tpl.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

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

/* ─── Panel 4: Analysis Center (Self-Contained) ─── */
export function AnalysisPanel(h: HandlerHook) {
  const [lastRun, setLastRun] = useState<string | null>(null)
  const [lastRunTime, setLastRunTime] = useState<number>(0)
  const [inlineMode, setInlineMode] = useState<string | null>(null) // for dialog-based tools
  const [dialogVars, setDialogVars] = useState<{ var1: string; var2: string }>({ var1: '', var2: '' })

  const hasData = h.store.variables.length > 0
  const hasSelection = h.store.selectedVariables.length > 0
  const selCount = h.store.selectedVariables.length

  const runTool = useCallback((name: string, action: () => void) => {
    setLastRun(name)
    setLastRunTime(Date.now())
    action()
  }, [])

  const selectAllNumeric = () => {
    const numeric = h.store.variables.filter(v => v.type === 'numeric').map(v => v.name)
    h.store.setSelectedVariables(numeric)
  }

  const selectAll = () => {
    h.store.setSelectedVariables(h.store.variables.map(v => v.name))
  }

  const runInlineAnalysis = useCallback((type: string) => {
    if (!dialogVars.var1 || !dialogVars.var2) return
    if (type === 'crosstabs') {
      h.setCrosstabRowVar(dialogVars.var1)
      h.setCrosstabColVar(dialogVars.var2)
      h.handleRunCrosstabs()
    } else if (type === 'ttest') {
      h.setTtestGroupVar(dialogVars.var1)
      h.setTtestValueVar(dialogVars.var2)
      h.handleRunTTest()
    } else if (type === 'anova') {
      h.setAnovaGroupVar(dialogVars.var1)
      h.setAnovaValueVar(dialogVars.var2)
      h.handleRunANOVA()
    } else if (type === 'mann-whitney') {
      h.setNonparamType('mann-whitney')
      h.setNonparamVar1(dialogVars.var1)
      h.setNonparamVar2(dialogVars.var2)
      h.handleRunNonparametric()
    } else if (type === 'wilcoxon') {
      h.setNonparamType('wilcoxon')
      h.setNonparamVar1(dialogVars.var1)
      h.setNonparamVar2(dialogVars.var2)
      h.handleRunNonparametric()
    }
    setLastRun(type)
    setLastRunTime(Date.now())
    setInlineMode(null)
  }, [dialogVars, h])

  // No data at all
  if (!hasData) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400/40 mb-3" />
        <p className="text-sm font-medium text-foreground">No Data Loaded</p>
        <p className="text-xs text-muted-foreground mt-1">Import a CSV or Excel file first, then come back here.</p>
        <Button size="sm" className="mt-3 text-xs" variant="outline" onClick={() => h.store.setView('workspace')}>
          <ArrowRight className="w-3 h-3 mr-1" />Go to Import Panel
        </Button>
      </div>
    )
  }

  // Has data but no selection — show guidance
  if (!hasSelection && !inlineMode) {
    return (
      <div className="p-4 space-y-3 overflow-y-auto h-full scrollbar-thin" style={{ contain: 'layout style paint' }}>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
          <p className="text-xs font-semibold text-amber-400 mb-1">Step 1: Select Variables</p>
          <p className="text-[10px] text-muted-foreground mb-2">Click checkboxes in the Data Editor to pick variables for analysis.</p>
          <div className="flex gap-1.5 justify-center">
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={selectAllNumeric}>
              <Check className="w-3 h-3 mr-1" />Select All Numeric
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={selectAll}>
              <Check className="w-3 h-3 mr-1" />Select All
            </Button>
          </div>
        </div>

        <Separator />

        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Available Tools ({h.store.variables.length} variables loaded)</p>

        <div className="grid grid-cols-2 gap-1.5">
          {[
            { name: 'Descriptive', need: 1 },
            { name: 'Correlation', need: 2 },
            { name: 'Regression', need: 2 },
            { name: 'Frequencies', need: 1 },
            { name: 'Crosstabs', need: 2 },
            { name: 'T-Test', need: 2 },
            { name: 'ANOVA', need: 2 },
            { name: 'Chi-Square', need: 1 },
            { name: 'Mann-Whitney', need: 2 },
            { name: 'Wilcoxon', need: 2 },
            { name: 'Validate', need: 0 },
            { name: 'Clean', need: 0 },
          ].map(t => (
            <div key={t.name} className="flex items-center gap-1.5 p-2 rounded-lg border border-border/30 opacity-50">
              <BarChart3 className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{t.name}</span>
              {t.need > 0 && <span className="text-[8px] text-amber-400 ml-auto">need {t.need}</span>}
            </div>
          ))}
        </div>

        {/* Tools that don't need selection */}
        <Separator />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Available Now</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { h.handleValidate(); setLastRun('Validate'); setLastRunTime(Date.now()) }}
            className="flex flex-col items-start gap-1.5 p-3 rounded-xl border border-border/50 hover:border-emerald-400/40 hover:bg-emerald-500/5 cursor-pointer transition-all text-left"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-[11px] font-semibold">Validate</p>
              <p className="text-[9px] text-muted-foreground">Check data quality</p>
            </div>
          </button>
          <button
            onClick={() => runTool('Clean', () => h.setCleanDialogOpen(true))}
            className="flex flex-col items-start gap-1.5 p-3 rounded-xl border border-border/50 hover:border-purple-400/40 hover:bg-purple-500/5 cursor-pointer transition-all text-left"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <div>
              <p className="text-[11px] font-semibold">Clean</p>
              <p className="text-[9px] text-muted-foreground">Auto-clean dataset</p>
            </div>
          </button>
        </div>
      </div>
    )
  }

  // Inline dialog mode for 2-variable tools
  if (inlineMode) {
    const vars = h.store.variables
    return (
      <div className="p-4 space-y-3 overflow-y-auto h-full scrollbar-thin">
        <button onClick={() => setInlineMode(null)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
          <ChevronRight className="w-3 h-3 rotate-180" /> Back to tools
        </button>
        <p className="text-xs font-semibold">{inlineMode === 'crosstabs' ? 'Crosstabs' : inlineMode === 'ttest' ? 'T-Test' : inlineMode === 'anova' ? 'ANOVA' : inlineMode === 'mann-whitney' ? 'Mann-Whitney U' : 'Wilcoxon'}</p>
        <p className="text-[10px] text-muted-foreground">Select two variables:</p>

        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-[10px] font-medium">{inlineMode === 'ttest' || inlineMode === 'anova' ? 'Grouping Variable' : 'Row / Variable 1'}</label>
            <select
              className="w-full text-xs bg-background border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-orange-500/30"
              value={dialogVars.var1}
              onChange={e => setDialogVars(p => ({ ...p, var1: e.target.value }))}
            >
              <option value="">-- Select --</option>
              {vars.map(v => <option key={v.name} value={v.name}>{v.name} ({v.type})</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium">{inlineMode === 'ttest' || inlineMode === 'anova' ? 'Test Variable' : 'Column / Variable 2'}</label>
            <select
              className="w-full text-xs bg-background border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-orange-500/30"
              value={dialogVars.var2}
              onChange={e => setDialogVars(p => ({ ...p, var2: e.target.value }))}
            >
              <option value="">-- Select --</option>
              {vars.map(v => <option key={v.name} value={v.name}>{v.name} ({v.type})</option>)}
            </select>
          </div>
        </div>

        <Button
          className="w-full text-xs"
          disabled={!dialogVars.var1 || !dialogVars.var2}
          onClick={() => runInlineAnalysis(inlineMode)}
        >
          <Play className="w-3 h-3 mr-1" />Run Analysis
        </Button>
      </div>
    )
  }

  // Full analysis panel with selected variables
  const coreAnalyses = [
    { icon: BarChart3, name: h.t('analysis.descriptive'), desc: 'Mean, Median, SD, CI, Skew', action: () => runTool('Descriptive', h.handleRunDescriptive) },
    { icon: TrendingUp, name: h.t('analysis.correlation'), desc: 'Pearson r matrix', action: () => runTool('Correlation', h.handleRunCorrelation), minSel: 2 },
    { icon: PieChart, name: h.t('analysis.regression'), desc: 'Linear regression', action: () => runTool('Regression', h.handleRunRegression), minSel: 2 },
    { icon: ClipboardList, name: h.t('analysis.frequencies'), desc: 'Freq tables + charts', action: () => runTool('Frequencies', h.handleRunFrequencies) },
    { icon: BarChart3, name: h.t('analysis.chisquare'), desc: 'Goodness-of-fit test', action: () => runTool('Chi-Square', h.handleRunChiSquare) },
  ]

  const twoVarTools = [
    { id: 'crosstabs', icon: Table2, name: h.t('analysis.crosstabs'), desc: 'Contingency tables' },
    { id: 'ttest', icon: BarChart3, name: h.t('analysis.ttest'), desc: 'Independent t-test' },
    { id: 'anova', icon: BarChart3, name: h.t('analysis.anova'), desc: 'One-way ANOVA' },
    { id: 'mann-whitney', icon: BarChart3, name: 'Mann-Whitney U', desc: 'Nonparametric test' },
    { id: 'wilcoxon', icon: BarChart3, name: 'Wilcoxon', desc: 'Signed-rank test' },
  ]

  const dataTools = [
    { icon: ShieldCheck, name: h.t('validate.title'), desc: 'Check data quality', action: () => { h.handleValidate(); setInlineMode(null); setLastRun('Validate'); setLastRunTime(Date.now()) } },
    { icon: Sparkles, name: h.t('clean.title'), desc: 'Auto-clean dataset', action: () => runTool('Clean', () => h.setCleanDialogOpen(true)) },
  ]

  const outputCount = h.store.outputs.length

  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full scrollbar-thin" style={{ contain: 'layout style paint' }}>
      {/* Selection bar */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-muted-foreground mr-1">Selected: <b className="text-orange-400">{selCount}</b></span>
        {h.store.selectedVariables.slice(0, 4).map(v => (
          <Badge key={v} variant="outline" className="text-[9px] bg-orange-500/10 text-orange-400 border-orange-500/20">
            {v}
          </Badge>
        ))}
        {selCount > 4 && <span className="text-[9px] text-muted-foreground">+{selCount - 4} more</span>}
        <button onClick={selectAllNumeric} className="text-[9px] text-blue-400 hover:underline ml-auto">Select all numeric</button>
      </div>

      {/* Last run confirmation */}
      {lastRun && Date.now() - lastRunTime < 3000 && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 animate-fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] text-emerald-400 font-medium">{lastRun} completed</span>
          <span className="text-[9px] text-muted-foreground ml-auto">{outputCount} results total</span>
        </div>
      )}

      {/* Core Analyses */}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Core Analyses</p>
      <div className="grid grid-cols-2 gap-2">
        {coreAnalyses.map(a => {
          const disabled = (a.minSel ? selCount < a.minSel : selCount === 0)
          return (
            <button
              key={a.name}
              disabled={disabled}
              onClick={a.action}
              className={cn(
                'flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all',
                disabled
                  ? 'border-border/30 opacity-40 cursor-not-allowed'
                  : 'border-border/50 hover:border-orange-400/40 hover:bg-orange-500/5 cursor-pointer active:scale-[0.98]',
              )}
            >
              <a.icon className={cn('w-4 h-4', disabled ? 'text-muted-foreground' : 'text-orange-400')} />
              <div>
                <p className="text-[11px] font-semibold">{a.name}</p>
                <p className="text-[9px] text-muted-foreground">{a.desc}</p>
              </div>
              {!disabled && <Play className="w-2.5 h-2.5 text-orange-400/50 ml-auto" />}
            </button>
          )
        })}
      </div>

      {/* Two-Variable Tests */}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Two-Variable Tests</p>
      <div className="grid grid-cols-2 gap-2">
        {twoVarTools.map(t => (
          <button
            key={t.id}
            onClick={() => { setDialogVars({ var1: h.store.selectedVariables[0] || '', var2: h.store.selectedVariables[1] || '' }); setInlineMode(t.id) }}
            className="flex flex-col items-start gap-1.5 p-3 rounded-xl border border-border/50 hover:border-orange-400/40 hover:bg-orange-500/5 cursor-pointer transition-all text-left active:scale-[0.98]"
          >
            <t.icon className="w-4 h-4 text-orange-400/70" />
            <div>
              <p className="text-[11px] font-semibold">{t.name}</p>
              <p className="text-[9px] text-muted-foreground">{t.desc}</p>
            </div>
            <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/40 ml-auto" />
          </button>
        ))}
      </div>

      {/* Data Quality */}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data Quality</p>
      <div className="grid grid-cols-2 gap-2">
        {dataTools.map(a => (
          <button
            key={a.name}
            onClick={a.action}
            className="flex flex-col items-start gap-1.5 p-3 rounded-xl border border-border/50 hover:border-teal-400/40 hover:bg-teal-500/5 cursor-pointer transition-all text-left active:scale-[0.98]"
          >
            <a.icon className="w-4 h-4 text-teal-400" />
            <div>
              <p className="text-[11px] font-semibold">{a.name}</p>
              <p className="text-[9px] text-muted-foreground">{a.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Transform */}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transform</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: TrendingUp, name: 'Z-Score', desc: 'Standardize (x-u)/s', action: () => runTool('Z-Score', h.handleTransformZScore) },
          { icon: TrendingUp, name: 'Normalize', desc: 'Min-Max 0-1', action: () => runTool('Normalize', h.handleTransformNormalize) },
          { icon: TrendingUp, name: 'Log Transform', desc: 'Natural log ln(x)', action: () => runTool('Log', h.handleTransformLog) },
        ].map(a => (
          <button
            key={a.name}
            disabled={selCount === 0}
            onClick={a.action}
            className={cn(
              'flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all',
              selCount === 0
                ? 'border-border/30 opacity-40 cursor-not-allowed'
                : 'border-border/50 hover:border-teal-400/40 hover:bg-teal-500/5 cursor-pointer active:scale-[0.98]',
            )}
          >
            <a.icon className={cn('w-4 h-4', selCount === 0 ? 'text-muted-foreground' : 'text-teal-400')} />
            <div>
              <p className="text-[11px] font-semibold">{a.name}</p>
              <p className="text-[9px] text-muted-foreground">{a.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Output summary at bottom */}
      {outputCount > 0 && (
        <div className="bg-muted/20 rounded-lg p-2.5 flex items-center gap-2 border border-border/30">
          <FileText className="w-3.5 h-3.5 text-green-400" />
          <span className="text-[10px] text-foreground font-medium">{outputCount} results in Output panel</span>
          <span className="text-[9px] text-muted-foreground ml-auto">Switch to Output to view</span>
        </div>
      )}
    </div>
  )
}

/* ─── Panel 5: Output Viewer ─── */
function OutputTable({ item }: { item: OutputItem }) {
  if (item.type !== 'table' || !item.content) return null
  const { headers = [], rows = [] } = item.content as { headers?: string[]; rows?: string[][] }
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-[10px] border-collapse">
        <thead className="sticky top-0">
          <tr className="bg-muted/60">
            {headers.map((h, i) => (
              <th key={i} className="border px-2 py-1.5 text-left font-semibold text-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-muted/20">
              {row.map((cell, ci) => (
                <td key={ci} className="border px-2 py-1 text-muted-foreground whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OutputChart({ item }: { item: OutputItem }) {
  if (item.type !== 'chart' || !item.content) return null
  const c = item.content as any
  const chartId = `chart-${item.id}`

  const renderChart = () => {
    switch (c.chartType) {
      case 'scatter':
        return <ChartScatter data={c.data} title={c.title} />
      case 'histogram':
        return <ChartHistogram values={c.values} title={c.title} />
      case 'pie':
        return <ChartPie data={c.data} title={c.title} />
      case 'bar':
        return <ChartBar data={c.data} title={c.title} bars={[]} />
      case 'boxplot':
        return <ChartBoxPlot groups={c.groups} title={c.title} />
      case 'line':
        return <ChartLine data={c.data || []} lines={c.lines || []} title={c.title} />
      default:
        return <p className="text-xs text-muted-foreground">Unknown chart type</p>
    }
  }

  return (
    <Card className="border-border/50">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold truncate">{item.title}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => exportChartAsImage(chartId as unknown as React.RefObject<HTMLDivElement>)}
          >
            <Download className="w-3 h-3" />
          </Button>
        </div>
        <div id={chartId} className="w-full">
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  )
}

export function OutputPanel(h: HandlerHook) {
  return (
    <div className="p-4 overflow-y-auto h-full scrollbar-thin" style={{ contain: 'layout style paint' }}>
      <div className="flex items-center justify-between mb-3">
        <Badge variant="outline" className="text-[10px]">{h.store.outputs.length} results</Badge>
        {h.store.outputs.length > 0 && (
          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive" onClick={() => h.store.clearOutputs()}>
            <Trash2 className="w-3 h-3 mr-1" />Clear All
          </Button>
        )}
      </div>
      {h.store.outputs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">{h.t('output.noOutput')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {h.store.outputs.map((item) => (
            <div key={item.id} className="animate-fade-in">
              {item.type === 'text' && (
                <div className="rounded-lg bg-purple-500/5 border border-purple-500/10 p-3">
                  <p className="text-[10px] font-semibold mb-1.5 text-purple-400">{item.title}</p>
                  <div className="text-[10px] text-foreground leading-relaxed whitespace-pre-wrap">{item.content}</div>
                </div>
              )}
              {item.type === 'table' && (
                <div className="mb-1">
                  <p className="text-[10px] font-semibold mb-1">{item.title}</p>
                  <OutputTable item={item} />
                </div>
              )}
              {item.type === 'chart' && <OutputChart item={item} />}
            </div>
          ))}
        </div>
      )}
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

/* ─── Panel 7: Scan & OCR ─── */
export function ScanPanel(h: HandlerHook) {
  const [dragOver, setDragOver] = useState(false)
  const [scanError, setScanError] = useState('')

  const MAX_SCAN_SIZE = 20 * 1024 * 1024 // 20MB
  const SCAN_ACCEPTED = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff']

  const validateScanFile = (file: File): string | null => {
    if (file.size > MAX_SCAN_SIZE) return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 20MB.`
    if (file.size === 0) return 'File is empty.'
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!SCAN_ACCEPTED.includes(ext)) return `Unsupported type. Accepted: ${SCAN_ACCEPTED.join(', ')}`
    return null
  }

  const processScanFile = (file: File) => {
    setScanError('')
    const err = validateScanFile(file)
    if (err) { setScanError(err); return }
    h.setScanFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => h.setScanPreview(ev.target?.result as string)
    reader.onerror = () => setScanError('Failed to read file.')
    reader.readAsDataURL(file)
  }

  const handleScanDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) processScanFile(files[0])
  }

  const handleScanDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }
  const handleScanDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOver(false) }

  const handleScanSubmit = async () => {
    if (!h.scanFile) return
    setScanError('')
    h.store.setScanState('processing')

    const formData = new FormData()
    formData.append('file', h.scanFile)

    if (h.scanFile.name.toLowerCase().endsWith('.pdf')) {
      formData.append('templateHint', 'PDF document')
    }

    try {
      const res = await fetch('/api/scan', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setScanError(data.error || `Scan failed (HTTP ${res.status})`)
        h.store.setScanState('error')
        return
      }

      if (data.fields && data.fields.length > 0) {
        h.store.setScanResults(data as any)
      } else if (data.rawText && data.rawText.length > 10) {
        h.store.setScanResults({
          ...data,
          fields: [{ label: 'Raw Text', value: data.rawText.slice(0, 500), confidence: 0.5, type: 'string' }],
          summary: data.summary || 'Document text extracted. Review the raw text below.',
        } as any)
      } else {
        setScanError('Could not extract structured data from this document. The content may be unclear, handwritten, or image-based. Try uploading a clearer scan or a different file format.')
        h.store.setScanState('error')
      }
    } catch (err) {
      setScanError(`Network error: ${err instanceof Error ? err.message : 'Connection failed'}`)
      h.store.setScanState('error')
    }
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full scrollbar-thin" style={{ contain: 'layout style paint' }}>
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          h.scanFile ? 'border-cyan-400 bg-cyan-50/10' : dragOver ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]' : 'border-border hover:border-cyan-400/50 hover:bg-cyan-500/5'
        )}
        onClick={() => h.fileInputRef.current?.click()}
        onDrop={handleScanDrop}
        onDragOver={handleScanDragOver}
        onDragLeave={handleScanDragLeave}
      >
        <input
          ref={h.fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.tiff"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) processScanFile(f)
            if (h.fileInputRef.current) h.fileInputRef.current.value = ''
          }}
        />
        {h.store.scanState === 'processing' ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Analyzing document with AI...</p>
            <p className="text-[10px] text-muted-foreground/60">This may take 10-30 seconds for complex documents</p>
          </div>
        ) : h.scanPreview ? (
          <div className="flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={h.scanPreview} alt="Preview" className="max-h-40 rounded-lg shadow-sm" />
            <p className="text-[10px] text-muted-foreground">{h.scanFile?.name} ({((h.scanFile?.size || 0) / 1024).toFixed(1)}KB)</p>
          </div>
        ) : (
          <>
            <ScanLine className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
            <p className="text-sm font-medium">{h.t('scan.dragDrop')}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{h.t('scan.supportedFormats')}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Max 20MB - Drag and drop or click</p>
          </>
        )}
      </div>

      {scanError && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-[10px] text-red-400">
          <X className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Scan Error</p>
            <p>{scanError}</p>
          </div>
          <button onClick={() => setScanError('')} className="ml-auto flex-shrink-0 hover:text-red-300">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs" disabled={!h.scanFile || h.store.scanState === 'processing'} onClick={handleScanSubmit}>
          {h.store.scanState === 'processing' ? 'Analyzing...' : h.t('scan.title')}
        </Button>
        {h.store.scanState === 'done' && h.store.scanResults && (
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => { h.store.importScanResults(h.store.scanResults!); h.setScanDialogOpen(false) }}>
            <Check className="w-3.5 h-3.5 mr-1" />{h.t('scan.approve')}
          </Button>
        )}
      </div>

      {/* Raw text fallback when fields are limited */}
      {h.store.scanState === 'done' && h.store.scanResults && h.store.scanResults.rawText && h.store.scanResults.fields.length <= 2 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-amber-400">Extracted Text (raw)</p>
          <div className="max-h-32 overflow-y-auto bg-muted/20 rounded-lg p-2 text-[10px] text-muted-foreground whitespace-pre-wrap">
            {h.store.scanResults.rawText.slice(0, 2000)}
          </div>
          <p className="text-[9px] text-muted-foreground/60">AI had difficulty parsing structured fields from this document. You can copy the raw text or re-upload a clearer version.</p>
        </div>
      )}

      {/* Batch Scan */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => h.batchInputRef.current?.click()}>
          <FolderOpen className="w-3 h-3 mr-1" />{h.t('scan.batch')}
        </Button>
        <input ref={h.batchInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" multiple className="hidden" onChange={async (e) => {
          const files = Array.from(e.target.files || [])
          for (const f of files) {
            const err = validateScanFile(f)
            if (err) continue
            h.store.addToBatchQueue({ id: Date.now().toString(36) + Math.random().toString(36).slice(2), name: f.name, status: 'pending' })
          }
          if (h.batchInputRef.current) h.batchInputRef.current.value = ''
        }} />
        {h.store.batchQueue.length > 0 && <span className="text-[10px] text-muted-foreground">{h.store.batchQueue.length} files queued</span>}
      </div>

      {/* Results */}
      {h.store.scanState === 'done' && h.store.scanResults && h.store.scanResults.fields.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold">{h.t('scan.extracted')} ({h.store.scanResults.fields.length})</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {h.store.scanResults.fields.map((f: any, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-muted/20 rounded-lg p-2 text-[10px]">
                <Badge variant="outline" className="text-[8px] w-12 justify-center shrink-0">{f.type || 'text'}</Badge>
                <span className="font-medium w-20 truncate">{f.label}</span>
                <input className="flex-1 text-[10px] bg-background border rounded px-1.5 py-0.5 min-w-0" value={h.editedFields[f.label] ?? f.value} onChange={e => h.setEditedFields(p => ({ ...p, [f.label]: e.target.value }))} />
                <Badge variant={f.confidence > 0.8 ? 'default' : 'secondary'} className={cn('text-[8px]', f.confidence > 0.8 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white')}>
                  {Math.round((f.confidence || 0.5) * 100)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {h.store.scanHistory.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold mb-1.5">{h.t('scan.history')}</p>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {h.store.scanHistory.slice(-5).reverse().map((s: any, i: number) => (
              <div key={i} className="text-[10px] text-muted-foreground bg-muted/20 rounded p-1.5">{s.summary || `${s.fields.length} fields, ${s.tables.length} tables`}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Panel 8: Syntax & Reports ─── */
export function SyntaxPanel(h: HandlerHook) {
  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full scrollbar-thin" style={{ contain: 'layout style paint' }}>
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-7 text-[10px] bg-amber-600 hover:bg-amber-700 text-white" onClick={h.handleExportPDF}>
          <FileText className="w-3 h-3 mr-1" />Export PDF
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={h.handleExportCSV}>
          <FileSpreadsheet className="w-3 h-3 mr-1" />CSV
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={h.handleExportJSON}>
          <Download className="w-3 h-3 mr-1" />JSON
        </Button>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Syntax History</p>
          <Badge variant="outline" className="text-[9px]">{h.store.syntaxHistory.length}</Badge>
        </div>
        {h.store.syntaxHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Terminal className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">No syntax generated yet</p>
            <p className="text-[10px] text-muted-foreground mt-1">Run analyses to generate SPSS syntax</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {h.store.syntaxHistory.map((syntax, i) => (
              <div key={i} className="flex items-start gap-2 bg-muted/20 rounded-lg p-2.5 group">
                <ChevronRight className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                <code className="flex-1 text-[10px] font-mono text-foreground/80 break-all">{syntax}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground flex-shrink-0"
                  onClick={() => navigator.clipboard.writeText(syntax)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
