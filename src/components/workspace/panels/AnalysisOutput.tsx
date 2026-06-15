'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  BarChart3, Table2, TrendingUp, PieChart, ClipboardList,
  ShieldCheck, Sparkles, Check, CheckCircle2, AlertTriangle,
  ArrowRight, FileText, Trash2, Download, ChevronRight, Play,
  Loader2,
} from 'lucide-react'
import {
  ChartBar, ChartLine, ChartScatter, ChartPie, ChartHistogram, ChartBoxPlot,
  exportChartAsImage,
} from '@/components/workspace/Charts'
import type { OutputItem } from '@/lib/store'
import type { HandlerHook } from './types'

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
            disabled={h.isValidating}
            className="flex flex-col items-start gap-1.5 p-3 rounded-xl border border-border/50 hover:border-emerald-400/40 hover:bg-emerald-500/5 cursor-pointer transition-all text-left"
          >
            {h.isValidating ? <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
            <div>
              <p className="text-[11px] font-semibold">{h.isValidating ? 'Validating...' : 'Validate'}</p>
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
            disabled={selCount === 0 || h.isTransforming}
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