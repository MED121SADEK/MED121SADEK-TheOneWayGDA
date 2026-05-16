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
  FileSpreadsheet, Play,
} from 'lucide-react'
import {
  ChartBar, ChartScatter, ChartPie, ChartHistogram, ChartBoxPlot,
  exportChartAsImage,
} from '@/components/workspace/Charts'
import type { OutputItem } from '@/lib/store'

export type HandlerHook = ReturnType<typeof import('@/hooks/useWorkspaceHandlers').useWorkspaceHandlers>

/* ─── Panel 1: AI Assistant ─── */
export function AIPanel(h: HandlerHook) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin" style={{ contain: 'layout style paint' }}>
        {h.store.chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <p className="text-sm text-muted-foreground">{h.t('ai.welcome')}</p>
          </div>
        )}
        {h.store.chatMessages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'ai' && (
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-purple-400" />
              </div>
            )}
            <div className={cn(
              'max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed',
              msg.role === 'user'
                ? 'bg-primary/10 text-foreground'
                : 'bg-muted/50 text-foreground',
            )}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
          </div>
        ))}
        {h.store.isAiTyping && (
          <div className="flex gap-2 items-start">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="flex items-center gap-1 px-3 py-2 bg-muted/50 rounded-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={h.chatEndRef} />
      </div>
      <div className="flex-shrink-0 border-t border-border/50 p-3">
        <div className="flex gap-2">
          <Input
            value={h.chatInput}
            onChange={(e) => h.setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && h.handleSendChat()}
            placeholder={h.t('ai.placeholder')}
            className="text-xs h-9"
          />
          <Button size="sm" className="h-9 px-3 bg-purple-600 hover:bg-purple-700" onClick={h.handleSendChat} disabled={!h.chatInput.trim() || h.store.isAiTyping}>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
        {h.store.chatMessages.length > 0 && (
          <Button variant="ghost" size="sm" className="mt-2 text-[10px] text-muted-foreground h-6" onClick={() => h.store.clearChat()}>
            Clear Chat
          </Button>
        )}
      </div>
    </div>
  )
}

/* ─── Panel 2: Data Import ─── */
export function ImportPanel(h: HandlerHook) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full scrollbar-thin" style={{ contain: 'layout style paint' }}>
      <div
        className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors border-border hover:border-teal-400/50 hover:bg-teal-500/5"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json"
          className="hidden"
          onChange={h.handleFileUpload}
        />
        <Upload className="w-8 h-8 mx-auto mb-3 text-teal-400" />
        <p className="text-sm font-medium text-foreground">{h.t('import.dragDrop')}</p>
        <p className="text-xs text-muted-foreground mt-1">{h.t('import.supportedFormats')}</p>
      </div>

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

/* ─── Panel 4: Analysis Center ─── */
export function AnalysisPanel(h: HandlerHook) {
  const analyses = [
    { icon: BarChart3, name: h.t('analysis.descriptive'), desc: 'Mean, Median, SD, etc.', action: h.handleRunDescriptive, disabled: h.store.selectedVariables.length === 0 },
    { icon: TrendingUp, name: h.t('analysis.correlation'), desc: 'Pearson correlation matrix', action: h.handleRunCorrelation, disabled: h.store.selectedVariables.length < 2 },
    { icon: PieChart, name: h.t('analysis.regression'), desc: 'Linear regression', action: h.handleRunRegression, disabled: h.store.selectedVariables.length < 2 },
    { icon: ClipboardList, name: h.t('analysis.frequencies'), desc: 'Frequency tables', action: h.handleRunFrequencies, disabled: h.store.selectedVariables.length === 0 },
    { icon: Table2, name: h.t('analysis.crosstabs'), desc: 'Contingency tables', action: () => h.setCrosstabsDialogOpen(true), disabled: h.store.variables.length < 2 },
    { icon: BarChart3, name: h.t('analysis.ttest'), desc: 'Independent t-test', action: () => h.setTtestDialogOpen(true), disabled: h.store.variables.length < 2 },
    { icon: BarChart3, name: h.t('analysis.anova'), desc: 'One-way ANOVA', action: () => h.setAnovaDialogOpen(true), disabled: h.store.variables.length < 2 },
    { icon: BarChart3, name: h.t('analysis.chisquare'), desc: 'Chi-square test', action: h.handleRunChiSquare, disabled: h.store.selectedVariables.length === 0 },
  ]

  const advanced = [
    { icon: BarChart3, name: 'Mann-Whitney U', desc: 'Nonparametric comparison', action: () => { h.setNonparamType('mann-whitney'); h.setNonparamDialogOpen(true) } },
    { icon: BarChart3, name: 'Wilcoxon', desc: 'Signed-rank test', action: () => { h.setNonparamType('wilcoxon'); h.setNonparamDialogOpen(true) } },
    { icon: ShieldCheck, name: h.t('validate.title'), desc: 'Check data quality', action: () => h.setValidateDialogOpen(true) },
    { icon: Sparkles, name: h.t('clean.title'), desc: 'Auto-clean dataset', action: () => h.setCleanDialogOpen(true) },
  ]

  return (
    <div className="p-4 overflow-y-auto h-full scrollbar-thin" style={{ contain: 'layout style paint' }}>
      {h.store.selectedVariables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">Select variables in the Data Editor first</p>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="text-[10px] text-muted-foreground mr-1">Selected:</span>
          {h.store.selectedVariables.map((v) => (
            <Badge key={v} variant="outline" className="text-[10px] bg-orange-500/10 text-orange-400 border-orange-500/20">
              {v}
            </Badge>
          ))}
        </div>
      )}

      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Core Analyses</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {analyses.map((a) => (
          <button
            key={a.name}
            disabled={a.disabled}
            onClick={a.action}
            className={cn(
              'flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all',
              a.disabled
                ? 'border-border/30 opacity-40 cursor-not-allowed'
                : 'border-border/50 hover:border-orange-400/40 hover:bg-orange-500/5 cursor-pointer',
            )}
          >
            <a.icon className={cn('w-4 h-4', a.disabled ? 'text-muted-foreground' : 'text-orange-400')} />
            <div>
              <p className="text-[11px] font-semibold">{a.name}</p>
              <p className="text-[9px] text-muted-foreground">{a.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Advanced</p>
      <div className="grid grid-cols-2 gap-2">
        {advanced.map((a) => (
          <button
            key={a.name}
            onClick={a.action}
            className="flex flex-col items-start gap-1.5 p-3 rounded-xl border border-border/50 hover:border-orange-400/40 hover:bg-orange-500/5 cursor-pointer transition-all text-left"
          >
            <a.icon className="w-4 h-4 text-orange-400/70" />
            <div>
              <p className="text-[11px] font-semibold">{a.name}</p>
              <p className="text-[9px] text-muted-foreground">{a.desc}</p>
            </div>
          </button>
        ))}
      </div>
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
        return <ChartScatter data={c.data} slope={c.slope} intercept={c.intercept} dv={c.dv} iv={c.iv} />
      case 'histogram':
        return <ChartHistogram values={c.values} title={c.title} />
      case 'pie':
        return <ChartPie data={c.data} title={c.title} />
      case 'bar':
        return <ChartBar data={c.data} title={c.title} />
      case 'boxplot':
        return <ChartBoxPlot groups={c.groups} title={c.title} />
      case 'line':
        return <></>
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
            onClick={() => exportChartAsImage(chartId)}
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
  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full scrollbar-thin" style={{ contain: 'layout style paint' }}>
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          h.scanFile ? 'border-cyan-400 bg-cyan-50/10' : 'border-border hover:border-cyan-400/50 hover:bg-cyan-500/5',
        )}
        onClick={() => h.fileInputRef.current?.click()}
      >
        <input
          ref={h.fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.tiff"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) {
              h.setScanFile(f)
              const reader = new FileReader()
              reader.onload = (ev) => h.setScanPreview(ev.target?.result as string)
              reader.readAsDataURL(f)
            }
          }}
        />
        {h.store.scanState === 'processing' ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">{h.t('scan.processing')}</p>
          </div>
        ) : h.scanPreview ? (
          <div className="flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={h.scanPreview} alt="Preview" className="max-h-40 rounded-lg shadow-sm" />
            <p className="text-[10px] text-muted-foreground">{h.scanFile?.name}</p>
          </div>
        ) : (
          <>
            <ScanLine className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
            <p className="text-sm font-medium">{h.t('scan.dragDrop')}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{h.t('scan.supportedFormats')}</p>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs" disabled={!h.scanFile || h.store.scanState === 'processing'} onClick={async () => {
          if (!h.scanFile) return
          h.store.setScanState('processing')
          const formData = new FormData()
          formData.append('file', h.scanFile)
          try {
            const res = await fetch('/api/scan', { method: 'POST', body: formData })
            const data = await res.json()
            if (data.fields || data.tables) {
              h.store.setScanResults({ fields: data.fields || [], tables: data.tables || [], rawText: data.rawText || '', summary: data.summary || '' })
            } else if (data.error) {
              h.store.setScanState('error')
            }
          } catch {
            h.store.setScanState('error')
          }
        }}>
          {h.store.scanState === 'processing' ? h.t('scan.processing') : h.t('scan.title')}
        </Button>
        {h.store.scanState === 'done' && h.store.scanResults && (
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => { h.store.importScanResults(h.store.scanResults!); h.setScanDialogOpen(false) }}>
            <Check className="w-3.5 h-3.5 mr-1" />{h.t('scan.approve')}
          </Button>
        )}
      </div>

      {/* Batch */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => h.batchInputRef.current?.click()}>
          <FolderOpen className="w-3 h-3 mr-1" />{h.t('scan.batch')}
        </Button>
        <input ref={h.batchInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" multiple className="hidden" onChange={async (e) => {
          const files = Array.from(e.target.files || [])
          files.forEach(f => h.store.addToBatchQueue({ id: Date.now().toString(36) + Math.random().toString(36).slice(2), name: f.name, status: 'pending' }))
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
