'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation, localeNames, Locale } from '@/lib/i18n'
import { useAppStore } from '@/lib/store'
import type { Variable, OutputItem } from '@/lib/store'
import {
  calcFrequencies, calcCrosstabs, calcTTest, calcANOVA,
  calcChiSquare, calcMannWhitney, calcWilcoxon,
  formatPValue, fmt,
} from '@/lib/stats'
import {
  ChartBar, ChartScatter, ChartPie, ChartHistogram, ChartBoxPlot, ChartLine,
  makeScatterData, makeFrequencyBarData, makePieData,
  exportChartAsImage,
} from '@/components/workspace/Charts'
import { generateQuickReport } from '@/components/workspace/ReportGenerator'

import { Button } from '@/components/ui/button'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Brain, WifiOff, RefreshCw, ScanLine, Users,
  Sparkles, Play, Menu, Check, X, BarChart3, ArrowRight,
  Zap, Star, ChevronRight, Globe, Save, FolderOpen, Share2,
  Download, Upload, Plus, Trash2, Edit3, Table2, Variable, Terminal,
  Send, Bot, User, FileText, Copy, ChevronDown, Languages,
  Database, TrendingUp, PieChart, FileSpreadsheet, ClipboardList, PenLine, ShieldCheck,
  Mail, ExternalLink,
} from 'lucide-react'
import { UpdateBanner } from '@/components/update-banner'

/* ─── Statistical Engine (kept inline for compatibility) ─── */
function calcStats(values: number[]) {
  const nums = values.filter(v => typeof v === 'number' && !isNaN(v))
  if (nums.length === 0) return null
  const n = nums.length
  const sum = nums.reduce((a, b) => a + b, 0)
  const mean = sum / n
  const sorted = [...nums].sort((a, b) => a - b)
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (n > 1 ? n - 1 : 1)
  const stddev = Math.sqrt(variance)
  const min = sorted[0]
  const max = sorted[n - 1]
  const freq: Record<number, number> = {}
  nums.forEach(v => { freq[v] = (freq[v] || 0) + 1 })
  const maxFreq = Math.max(...Object.values(freq))
  const mode = nums.find(v => freq[v] === maxFreq)
  const skewness = n > 2 ? (nums.reduce((a, b) => a + ((b - mean) / stddev) ** 3, 0) * n) / ((n - 1) * (n - 2)) : 0
  const kurtosis = n > 3 ? (nums.reduce((a, b) => a + ((b - mean) / stddev) ** 4, 0) * n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) - 3 * (n - 1) ** 2 / ((n - 2) * (n - 3)) : 0
  const p25 = sorted[Math.floor(n * 0.25)]
  const p50 = sorted[Math.floor(n * 0.5)]
  const p75 = sorted[Math.floor(n * 0.75)]
  return { n, sum, mean, median, mode, variance, stddev, min, max, range: max - min, skewness, kurtosis, p25, p50, p75 }
}

function calcCorrelation(x: number[], y: number[]): { r: number; n: number } | null {
  const pairs: [number, number][] = []
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (typeof x[i] === 'number' && typeof y[i] === 'number' && !isNaN(x[i]) && !isNaN(y[i])) {
      pairs.push([x[i], y[i]])
    }
  }
  if (pairs.length < 3) return null
  const n = pairs.length
  const mx = pairs.reduce((a, p) => a + p[0], 0) / n
  const my = pairs.reduce((a, p) => a + p[1], 0) / n
  let num = 0, dx = 0, dy = 0
  for (const [px, py] of pairs) {
    num += (px - mx) * (py - my)
    dx += (px - mx) ** 2
    dy += (py - my) ** 2
  }
  const r = dx === 0 || dy === 0 ? 0 : num / Math.sqrt(dx * dy)
  return { r, n }
}

function calcRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number; n: number } | null {
  const pairs: [number, number][] = []
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (typeof x[i] === 'number' && typeof y[i] === 'number' && !isNaN(x[i]) && !isNaN(y[i])) {
      pairs.push([x[i], y[i]])
    }
  }
  if (pairs.length < 3) return null
  const n = pairs.length
  const mx = pairs.reduce((a, p) => a + p[0], 0) / n
  const my = pairs.reduce((a, p) => a + p[1], 0) / n
  let num = 0, den = 0
  for (const [px, py] of pairs) {
    num += (px - mx) * (py - my)
    den += (px - mx) ** 2
  }
  if (den === 0) return null
  const slope = num / den
  const intercept = my - slope * mx
  const ssRes = pairs.reduce((a, [px, py]) => a + (py - (slope * px + intercept)) ** 2, 0)
  const ssTot = pairs.reduce((a, [, py]) => a + (py - my) ** 2, 0)
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  return { slope, intercept, r2, n }
}

/* ─── MAIN WORKSPACE PAGE ─── */
export default function WorkspacePage() {
  const { t, locale, setLocale, dir } = useTranslation()
  const store = useAppStore()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareLink, setShareLink] = useState('')
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [newVarDialogOpen, setNewVarDialogOpen] = useState(false)
  const [newVarName, setNewVarName] = useState('')
  const [newVarType, setNewVarType] = useState<'numeric' | 'string' | 'date' | 'currency'>('numeric')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [scanDialogOpen, setScanDialogOpen] = useState(false)
  const [cleanDialogOpen, setCleanDialogOpen] = useState(false)
  const [validateDialogOpen, setValidateDialogOpen] = useState(false)
  const [scanFile, setScanFile] = useState<File | null>(null)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [editedFields, setEditedFields] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const batchInputRef = useRef<HTMLInputElement>(null)

  // Nonparametric dialog
  const [nonparamDialogOpen, setNonparamDialogOpen] = useState(false)
  const [nonparamType, setNonparamType] = useState<'mann-whitney' | 'wilcoxon'>('mann-whitney')
  const [nonparamVar1, setNonparamVar1] = useState('')
  const [nonparamVar2, setNonparamVar2] = useState('')

  // Crosstabs dialog
  const [crosstabsDialogOpen, setCrosstabsDialogOpen] = useState(false)
  const [crosstabRowVar, setCrosstabRowVar] = useState('')
  const [crosstabColVar, setCrosstabColVar] = useState('')

  // T-Test dialog
  const [ttestDialogOpen, setTtestDialogOpen] = useState(false)
  const [ttestGroupVar, setTtestGroupVar] = useState('')
  const [ttestValueVar, setTtestValueVar] = useState('')

  // ANOVA dialog
  const [anovaDialogOpen, setAnovaDialogOpen] = useState(false)
  const [anovaGroupVar, setAnovaGroupVar] = useState('')
  const [anovaValueVar, setAnovaValueVar] = useState('')

  // Set workspace view on mount
  useEffect(() => {
    store.setView('workspace')
  }, [])

  const handleImportCSV = () => {
    if (!importText.trim()) return
    store.importCSV(importText.trim())
    setImportDialogOpen(false)
    setImportText('')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    store.importFile(file)
    setImportDialogOpen(false)
  }

  const handleExportCSV = () => {
    const csv = store.exportCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${store.currentProject?.name || 'data'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleAddVariable = () => {
    if (!newVarName.trim()) return
    store.addVariable({
      id: Date.now().toString(36),
      name: newVarName.trim(),
      type: newVarType,
      label: newVarName.trim(),
      width: 8,
      decimals: newVarType === 'numeric' ? 2 : 0,
      missing: '',
      values: {},
    })
    setNewVarName('')
    setNewVarDialogOpen(false)
  }

  const getNumericVals = (varName: string): number[] => {
    return (store.data[varName] || []).map(v => typeof v === 'string' ? parseFloat(v) : v).filter((v): v is number => typeof v === 'number' && !isNaN(v))
  }

  // ─── Handler: Descriptive Statistics ───
  const handleRunDescriptive = () => {
    const results: any[] = []
    for (const varName of store.selectedVariables) {
      const vals = getNumericVals(varName)
      const stats = calcStats(vals)
      if (stats) results.push({ variable: varName, ...stats })
    }
    if (results.length === 0) return
    store.addOutput({
      id: Date.now().toString(36),
      title: t('analysis.descriptive'),
      type: 'table',
      content: { headers: ['Variable', 'N', 'Mean', 'Median', 'Std Dev', 'Min', 'Max', 'Sum'], rows: results.map(r => [r.variable, r.n, r.mean?.toFixed(3), r.median, r.stddev?.toFixed(3), r.min, r.max, r.sum?.toFixed(2)]) },
      timestamp: new Date().toISOString(),
    })
    store.addSyntax(`DESCRIPTIVES VARIABLES=${store.selectedVariables.join(' ')}`)
    store.setWorkspaceTab('output')
  }

  // ─── Handler: Correlation ───
  const handleRunCorrelation = () => {
    if (store.selectedVariables.length < 2) return
    const vars = store.selectedVariables.slice(0, 5)
    const matrix: string[][] = [vars]
    for (const v1 of vars) {
      const row: string[] = [v1]
      for (const v2 of vars) {
        if (v1 === v2) { row.push('1.000'); continue }
        const x = getNumericVals(v1)
        const y = getNumericVals(v2)
        const result = calcCorrelation(x, y)
        row.push(result?.r.toFixed(3) ?? 'N/A')
      }
      matrix.push(row)
    }
    store.addOutput({
      id: Date.now().toString(36),
      title: t('analysis.correlation'),
      type: 'table',
      content: { headers: [''] , rows: matrix },
      timestamp: new Date().toISOString(),
    })
    store.addSyntax(`CORRELATIONS /VARIABLES=${vars.join(' ')}`)
    store.setWorkspaceTab('output')
  }

  // ─── Handler: Regression ───
  const handleRunRegression = () => {
    if (store.selectedVariables.length < 2) return
    const dv = store.selectedVariables[0]
    const iv = store.selectedVariables[1]
    const x = getNumericVals(iv)
    const y = getNumericVals(dv)
    const reg = calcRegression(x, y)
    const corr = calcCorrelation(x, y)
    if (!reg || !corr) return
    store.addOutput({
      id: Date.now().toString(36),
      title: t('analysis.regression') + ` (${dv} ~ ${iv})`,
      type: 'table',
      content: {
        headers: ['Statistic', 'Value'],
        rows: [
          ['Intercept', reg.intercept.toFixed(4)],
          ['Slope', reg.slope.toFixed(4)],
          ['R', corr.r.toFixed(4)],
          ['R²', reg.r2.toFixed(4)],
          ['N', String(reg.n)],
          ['Equation', `${dv} = ${reg.intercept.toFixed(2)} + ${reg.slope.toFixed(2)} × ${iv}`],
        ],
      },
      timestamp: new Date().toISOString(),
    })
    store.addOutput({
      id: (Date.now() + 1).toString(36),
      title: `Scatter Plot (${dv} vs ${iv})`,
      type: 'chart',
      content: { chartType: 'scatter', dv, iv, data: makeScatterData(x, y), slope: reg.slope, intercept: reg.intercept },
      timestamp: new Date().toISOString(),
    })
    store.addSyntax(`REGRESSION /DEPENDENT=${dv} /METHOD=ENTER ${iv}`)
    store.setWorkspaceTab('output')
  }

  // ─── Handler: Frequencies ───
  const handleRunFrequencies = () => {
    if (store.selectedVariables.length === 0) return
    for (const varName of store.selectedVariables) {
      const vals = store.data[varName] || []
      const result = calcFrequencies(vals, varName)
      const rows: string[][] = result.table.map(r => [
        r.value, String(r.frequency), r.percent.toFixed(1), r.cumulativePercent.toFixed(1),
      ])
      rows.push(['Total', String(result.validN), '100.0', ''])
      if (result.missingN > 0) rows.push(['Missing', String(result.missingN), '', ''])

      store.addOutput({
        id: Date.now().toString(36) + varName,
        title: `Frequencies: ${varName}`,
        type: 'table',
        content: { headers: ['Value', 'Frequency', 'Percent', 'Cum. %'], rows },
        timestamp: new Date().toISOString(),
      })

      // Add chart
      const barData = makeFrequencyBarData(vals)
      const pieData = makePieData(vals)
      const isNumeric = result.table.length > 5
      const varData = store.variables.find(v => v.name === varName)
      if (isNumeric && varData?.type === 'numeric') {
        store.addOutput({
          id: (Date.now() + 2).toString(36) + varName,
          title: `Distribution: ${varName}`,
          type: 'chart',
          content: { chartType: 'histogram', values: getNumericVals(varName), title: varName },
          timestamp: new Date().toISOString(),
        })
      } else {
        store.addOutput({
          id: (Date.now() + 2).toString(36) + varName,
          title: `Pie Chart: ${varName}`,
          type: 'chart',
          content: { chartType: 'pie', data: pieData, title: varName },
          timestamp: new Date().toISOString(),
        })
      }
    }
    store.addSyntax(`FREQUENCIES VARIABLES=${store.selectedVariables.join(' ')}`)
    store.setWorkspaceTab('output')
  }

  // ─── Handler: Crosstabs ───
  const handleRunCrosstabs = () => {
    if (!crosstabRowVar || !crosstabColVar) return
    const rowVals = store.data[crosstabRowVar] || []
    const colVals = store.data[crosstabColVar] || []
    const result = calcCrosstabs(rowVals, colVals, crosstabRowVar, crosstabColVar)
    if (!result) return

    const headers = [result.rowVariable + ' \\ ' + result.colVariable, ...result.contingencyTable.headers, 'Total']
    const rows: string[][] = result.contingencyTable.rows.map(r => [
      r.label, ...r.cells.map(String), String(r.total),
    ])
    rows.push(['Total', ...result.contingencyTable.colTotals.map(String), String(result.contingencyTable.grandTotal)])

    store.addOutput({
      id: Date.now().toString(36),
      title: `Crosstabs: ${crosstabRowVar} × ${crosstabColVar}`,
      type: 'table',
      content: { headers, rows },
      timestamp: new Date().toISOString(),
    })
    store.addOutput({
      id: (Date.now() + 1).toString(36),
      title: `Chi-Square Test for ${crosstabRowVar} × ${crosstabColVar}`,
      type: 'table',
      content: {
        headers: ['Statistic', 'Value'],
        rows: [
          ['Pearson Chi-Square', fmt(result.chiSquare)],
          ['Degrees of Freedom', String(result.degreesOfFreedom)],
          ['P-value', formatPValue(result.pValue)],
          ["Cramér's V", fmt(result.cramersV || 0)],
          ['N', String(result.contingencyTable.grandTotal)],
        ],
      },
      timestamp: new Date().toISOString(),
    })
    store.addSyntax(`CROSSTABS /TABLES=${crosstabRowVar} BY ${crosstabColVar} /STATISTIC=CHISQ`)
    setCrosstabsDialogOpen(false)
    store.setWorkspaceTab('output')
  }

  // ─── Handler: T-Test ───
  const handleRunTTest = () => {
    if (!ttestGroupVar || !ttestValueVar) return
    const groupVals = store.data[ttestGroupVar] || []
    const valueVals = store.data[ttestValueVar] || []
    const n = Math.min(groupVals.length, valueVals.length)

    // Split into groups by unique values
    const groupMap = new Map<string, number[]>()
    for (let i = 0; i < n; i++) {
      const g = groupVals[i]
      const v = typeof valueVals[i] === 'string' ? parseFloat(valueVals[i]) : valueVals[i]
      if (g === '' || g === null || g === undefined || typeof v !== 'number' || isNaN(v)) continue
      const key = String(g)
      if (!groupMap.has(key)) groupMap.set(key, [])
      groupMap.get(key)!.push(v)
    }

    const groups = [...groupMap.entries()]
    if (groups.length < 2) return
    const [g1Name, g1Vals] = groups[0]
    const [g2Name, g2Vals] = groups[1]
    const result = calcTTest(g1Vals, g2Vals, g1Name, g2Name)
    if (!result) return

    store.addOutput({
      id: Date.now().toString(36),
      title: `Independent Samples T-Test`,
      type: 'table',
      content: {
        headers: ['Statistic', 'Value'],
        rows: [
          ['Group 1', `${result.group1Name} (n=${result.n1})`],
          ['Group 1 Mean', fmt(result.mean1)],
          ['Group 1 Std Dev', fmt(result.std1)],
          ['Group 2', `${result.group2Name} (n=${result.n2})`],
          ['Group 2 Mean', fmt(result.mean2)],
          ['Group 2 Std Dev', fmt(result.std2)],
          ['Mean Difference', fmt(result.meanDifference)],
          ['Std Error Difference', fmt(result.stdErrorDifference)],
          ['t-statistic', fmt(result.tStatistic)],
          ['Degrees of Freedom', fmt(result.degreesOfFreedom)],
          ['P-value (two-tailed)', formatPValue(result.pValue)],
          ["Cohen's d", fmt(result.cohensD)],
        ],
      },
      timestamp: new Date().toISOString(),
    })

    // Box plot chart
    store.addOutput({
      id: (Date.now() + 1).toString(36),
      title: `Box Plot: ${ttestValueVar} by ${ttestGroupVar}`,
      type: 'chart',
      content: {
        chartType: 'boxplot',
        groups: [
          { name: result.group1Name, values: g1Vals },
          { name: result.group2Name, values: g2Vals },
        ],
        title: `${ttestValueVar} by ${ttestGroupVar}`,
      },
      timestamp: new Date().toISOString(),
    })
    store.addSyntax(`T-TEST GROUPS=${ttestGroupVar} /VARIABLES=${ttestValueVar}`)
    setTtestDialogOpen(false)
    store.setWorkspaceTab('output')
  }

  // ─── Handler: ANOVA ───
  const handleRunANOVA = () => {
    if (!anovaGroupVar || !anovaValueVar) return
    const groupVals = store.data[anovaGroupVar] || []
    const valueVals = store.data[anovaValueVar] || []
    const n = Math.min(groupVals.length, valueVals.length)

    const groupMap: Record<string, number[]> = {}
    for (let i = 0; i < n; i++) {
      const g = groupVals[i]
      const v = typeof valueVals[i] === 'string' ? parseFloat(valueVals[i]) : valueVals[i]
      if (g === '' || g === null || g === undefined || typeof v !== 'number' || isNaN(v)) continue
      const key = String(g)
      if (!groupMap[key]) groupMap[key] = []
      groupMap[key].push(v)
    }

    const result = calcANOVA(groupMap)
    if (!result) return

    store.addOutput({
      id: Date.now().toString(36),
      title: 'One-Way ANOVA',
      type: 'table',
      content: {
        headers: ['Source', 'SS', 'df', 'MS', 'F', 'p-value'],
        rows: [
          ['Between Groups', fmt(result.betweenGroups.ss), String(result.betweenGroups.df), fmt(result.betweenGroups.ms), fmt(result.betweenGroups.f), formatPValue(result.betweenGroups.pValue)],
          ['Within Groups', fmt(result.withinGroups.ss), String(result.withinGroups.df), fmt(result.withinGroups.ms), '', ''],
          ['Total', fmt(result.total.ss), String(result.total.df), '', '', ''],
        ],
      },
      timestamp: new Date().toISOString(),
    })

    store.addOutput({
      id: (Date.now() + 1).toString(36),
      title: 'Group Statistics',
      type: 'table',
      content: {
        headers: ['Group', 'N', 'Mean', 'Std Dev'],
        rows: result.groupStats.map(g => [g.name, String(g.n), fmt(g.mean), fmt(g.std)]),
      },
      timestamp: new Date().toISOString(),
    })

    store.addOutput({
      id: (Date.now() + 2).toString(36),
      title: 'Effect Sizes',
      type: 'table',
      content: {
        headers: ['Measure', 'Value'],
        rows: [
          ['η² (Eta-squared)', fmt(result.etaSquared)],
          ['ω² (Omega-squared)', fmt(result.omegaSquared)],
        ],
      },
      timestamp: new Date().toISOString(),
    })

    // Box plot
    store.addOutput({
      id: (Date.now() + 3).toString(36),
      title: `Box Plot: ${anovaValueVar} by ${anovaGroupVar}`,
      type: 'chart',
      content: {
        chartType: 'boxplot',
        groups: result.groupStats.map(g => {
          const groupData = groupMap[g.name] || []
          return { name: g.name, values: groupData }
        }),
        title: `${anovaValueVar} by ${anovaGroupVar}`,
      },
      timestamp: new Date().toISOString(),
    })
    store.addSyntax(`ONEWAY ${anovaValueVar} BY ${anovaGroupVar}`)
    setAnovaDialogOpen(false)
    store.setWorkspaceTab('output')
  }

  // ─── Handler: Chi-Square Goodness of Fit ───
  const handleRunChiSquare = () => {
    if (store.selectedVariables.length === 0) return
    const varName = store.selectedVariables[0]
    const vals = store.data[varName] || []
    const freq = calcFrequencies(vals, varName)
    if (!freq || freq.table.length < 2) return

    const observed = freq.table.map(r => r.frequency)
    const result = calcChiSquare(observed)
    if (!result) return

    store.addOutput({
      id: Date.now().toString(36),
      title: `Chi-Square Goodness of Fit: ${varName}`,
      type: 'table',
      content: {
        headers: ['Category', 'Observed', 'Expected', 'Residual'],
        rows: result.observed.map((o, i) => [
          freq.table[i]?.value || `Cat ${i + 1}`,
          String(o),
          fmt(result.expected[i]),
          fmt(result.residuals[i]),
        ]),
      },
      timestamp: new Date().toISOString(),
    })
    store.addOutput({
      id: (Date.now() + 1).toString(36),
      title: 'Chi-Square Test Summary',
      type: 'table',
      content: {
        headers: ['Statistic', 'Value'],
        rows: [
          ['Chi-Square', fmt(result.chiSquare)],
          ['Degrees of Freedom', String(result.degreesOfFreedom)],
          ['P-value', formatPValue(result.pValue)],
          ['Total N', String(sum(result.observed))],
        ],
      },
      timestamp: new Date().toISOString(),
    })
    store.addSyntax(`NPAR TESTS /CHISQUARE=${varName}`)
    store.setWorkspaceTab('output')
  }

  // ─── Handler: Nonparametric Tests ───
  const handleRunNonparametric = () => {
    if (!nonparamVar1 || !nonparamVar2) return

    if (nonparamType === 'mann-whitney') {
      const v1 = getNumericVals(nonparamVar1)
      const v2 = getNumericVals(nonparamVar2)
      const result = calcMannWhitney(v1, v2)
      if (!result) return

      store.addOutput({
        id: Date.now().toString(36),
        title: `Mann-Whitney U Test`,
        type: 'table',
        content: {
          headers: ['Statistic', 'Value'],
          rows: [
            ['Group 1', `${nonparamVar1} (n=${result.n1})`],
            ['Group 2', `${nonparamVar2} (n=${result.n2})`],
            ['Mean Rank (Group 1)', fmt(result.meanRank1)],
            ['Mean Rank (Group 2)', fmt(result.meanRank2)],
            ['U Statistic', fmt(result.uStatistic)],
            ['Z-value', fmt(result.zValue)],
            ['P-value (two-tailed)', formatPValue(result.pValue)],
            ['Effect Size r', fmt(result.r)],
          ],
        },
        timestamp: new Date().toISOString(),
      })
      store.addSyntax(`NPAR TESTS /M-W=${nonparamVar1} ${nonparamVar2}`)
    } else {
      // Wilcoxon signed-rank
      const v1 = store.data[nonparamVar1] || []
      const v2 = store.data[nonparamVar2] || []
      const result = calcWilcoxon(v1, v2)
      if (!result) return

      store.addOutput({
        id: Date.now().toString(36),
        title: `Wilcoxon Signed-Rank Test`,
        type: 'table',
        content: {
          headers: ['Statistic', 'Value'],
          rows: [
            ['Variable 1', nonparamVar1],
            ['Variable 2', nonparamVar2],
            ['N (non-zero diffs)', String(result.n)],
            ['N (ties)', String(result.nZero)],
            ['Mean Rank (Positive)', fmt(result.meanRankPositive)],
            ['Mean Rank (Negative)', fmt(result.meanRankNegative)],
            ['W Statistic', fmt(result.wStatistic)],
            ['Z-value', fmt(result.zValue)],
            ['P-value (two-tailed)', formatPValue(result.pValue)],
            ['Effect Size r', fmt(result.r)],
          ],
        },
        timestamp: new Date().toISOString(),
      })
      store.addSyntax(`NPAR TESTS /WILCOXON=${nonparamVar1} ${nonparamVar2}`)
    }

    setNonparamDialogOpen(false)
    store.setWorkspaceTab('output')
  }

  // ─── Handler: Export PDF ───
  const handleExportPDF = () => {
    generateQuickReport(store.outputs, store.currentProject?.name)
  }

  // ─── Handler: Send Chat ───
  const handleSendChat = async () => {
    if (!chatInput.trim()) return
    const userMsg = { id: Date.now().toString(36), role: 'user' as const, content: chatInput.trim(), timestamp: new Date().toISOString() }
    store.addChatMessage(userMsg)
    setChatInput('')
    store.setAiTyping(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...store.chatMessages, userMsg].map(m => ({ role: m.role, content: m.content })),
          data: store.data,
          variables: store.variables,
        }),
      })
      const data = await res.json()
      const aiContent = data.choices?.[0]?.message?.content || 'Sorry, I could not process your request.'
      store.addChatMessage({ id: (Date.now() + 1).toString(36), role: 'ai', content: aiContent, timestamp: new Date().toISOString() })
    } catch {
      store.addChatMessage({ id: (Date.now() + 1).toString(36), role: 'ai', content: 'Network error. Please try again.', timestamp: new Date().toISOString() })
    }
    store.setAiTyping(false)
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [store.chatMessages, store.isAiTyping])

  const rowCount = store.variables.length > 0 ? Math.max(0, ...Object.values(store.data).map(a => a.length)) : 0

  // Helper: sum for chi-square
  function sum(arr: number[]): number { return arr.reduce((a, b) => a + b, 0) }

  return (
    <div className="h-screen flex flex-col" dir={dir}>
      <UpdateBanner />
      {/* Workspace Navbar */}
      <nav className="h-12 border-b border-border/50 bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 flex-shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded" />
            <span className="font-bold gradient-text text-sm hidden sm:inline">{t('brand.name')}</span>
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <span className="text-sm font-medium text-muted-foreground truncate max-w-48">{store.currentProject?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <Languages className="size-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {localeNames.map((l) => (
                <SelectItem key={l} value={l} className="text-xs">{t(`lang.${l}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { store.saveProject() }}>
            <Save className="size-3.5" /> {t('workspace.save')}
          </Button>
          <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 text-xs">
                <Share2 className="size-3.5" /> {t('workspace.share')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('share.title')}</DialogTitle><DialogDescription>{t('share.description')}</DialogDescription></DialogHeader>
              <div className="flex gap-2">
                <Input placeholder={t('share.email')} value={shareEmail} onChange={e => setShareEmail(e.target.value)} />
                <Button onClick={() => setShareEmail('')}>{t('share.addEmail')}</Button>
              </div>
              <Separator />
              <div><p className="text-sm font-medium mb-2">{t('share.link')}</p>
                <div className="flex gap-2"><Input readOnly value={shareLink || `https://TheOneWayGDA.app/share/${store.currentProject?.id}`} /><Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`https://TheOneWayGDA.app/share/${store.currentProject?.id}`) }}><Copy className="size-3.5" /> {t('share.copyLink')}</Button></div>
              </div>
              <DialogFooter><Button onClick={() => setShareDialogOpen(false)}>{t('workspace.close')}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Scan & Fill */}
          <Dialog open={scanDialogOpen} onOpenChange={(open) => { setScanDialogOpen(open); if (!open) { setScanFile(null); setScanPreview(null); setEditedFields({}) } }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white">
                <ScanLine className="size-3.5" /> {t('scan.title')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><ScanLine className="size-5 text-teal-500" />{t('scan.title')}</DialogTitle><DialogDescription>{t('scan.batchDesc')}</DialogDescription></DialogHeader>
              <div className="space-y-4">
                <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${scanFile ? 'border-teal-400 bg-teal-50/50' : 'border-border hover:border-teal-300 hover:bg-muted/30'}`} onClick={() => fileInputRef.current?.click()}>
                  <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.tiff" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) { setScanFile(f); const reader = new FileReader(); reader.onload = (ev) => setScanPreview(ev.target?.result as string); reader.readAsDataURL(f) }
                  }} />
                  {store.scanState === 'processing' ? (
                    <div className="flex flex-col items-center gap-2"><div className="size-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /><p className="text-sm text-muted-foreground">{t('scan.processing')}</p></div>
                  ) : scanPreview ? (
                    <div className="flex flex-col items-center gap-2"><img src={scanPreview} alt="Preview" className="max-h-48 rounded-lg shadow-sm" /><p className="text-xs text-muted-foreground">{scanFile?.name}</p></div>
                  ) : (
                    <><Upload className="size-8 mx-auto mb-2 text-muted-foreground" /><p className="text-sm text-muted-foreground">{t('scan.dragDrop')}</p><p className="text-xs text-muted-foreground mt-1">{t('scan.supportedFormats')}</p></>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => batchInputRef.current?.click()}><FolderOpen className="size-3.5" />{t('scan.batch')}</Button>
                  <input ref={batchInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" multiple className="hidden" onChange={async (e) => {
                    const files = Array.from(e.target.files || [])
                    files.forEach(f => store.addToBatchQueue({ id: Date.now().toString(36) + Math.random().toString(36).slice(2), name: f.name, status: 'pending' }))
                  }} />
                  {store.batchQueue.length > 0 && <span className="text-xs text-muted-foreground">{store.batchQueue.length} files queued</span>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" disabled={!scanFile || store.scanState === 'processing'} onClick={async () => {
                    if (!scanFile) return
                    store.setScanState('processing')
                    const formData = new FormData()
                    formData.append('file', scanFile)
                    try {
                      const res = await fetch('/api/scan', { method: 'POST', body: formData })
                      const data = await res.json()
                      if (data.fields || data.tables) {
                        store.setScanResults({ fields: data.fields || [], tables: data.tables || [], rawText: data.rawText || '', summary: data.summary || '' })
                      } else if (data.error) { store.setScanState('error') }
                    } catch { store.setScanState('error') }
                  }}>{store.scanState === 'processing' ? t('scan.processing') : t('scan.title')}</Button>
                  {store.scanState === 'done' && store.scanResults && (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { store.importScanResults(store.scanResults!); setScanDialogOpen(false) }}><Check className="size-3.5" />{t('scan.approve')}</Button>
                  )}
                </div>
                {store.scanState === 'done' && store.scanResults && (
                  <div className="space-y-4">
                    {store.scanResults.summary && <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{store.scanResults.summary}</p>}
                    {store.scanResults.fields.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">{t('scan.extracted')} ({store.scanResults.fields.length})</p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {store.scanResults.fields.map((f: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
                              <Badge variant="outline" className="text-[10px] w-16 justify-center shrink-0">{f.type || 'text'}</Badge>
                              <span className="text-xs font-medium w-28 truncate">{f.label}</span>
                              <input className="flex-1 text-xs bg-background border rounded px-2 py-1" value={editedFields[f.label] ?? f.value} onChange={e => setEditedFields(p => ({ ...p, [f.label]: e.target.value }))} />
                              <Badge variant={f.confidence > 0.8 ? 'default' : 'secondary'} className={`text-[10px] ${f.confidence > 0.8 ? 'bg-emerald-500 text-white' : f.confidence > 0.5 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'}`}>{Math.round((f.confidence || 0.5) * 100)}%</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {store.scanResults.tables.map((tbl: any, ti: number) => (
                      <div key={ti}>
                        <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1"><Table2 className="size-3" />{t('scan.tableDetected')} - {tbl.rows.length} {t('scan.rowsExtracted')}</p>
                        <div className="overflow-x-auto max-h-40 overflow-y-auto border rounded-lg">
                          <table className="w-full text-xs border-collapse">
                            <thead className="sticky top-0 bg-muted/80"><tr>{tbl.headers.map((h: string, hi: number) => <th key={hi} className="border px-2 py-1 text-left font-medium bg-muted/60">{h}</th>)}</tr></thead>
                            <tbody>{tbl.rows.slice(0, 20).map((row: string[], ri: number) => <tr key={ri} className="hover:bg-muted/30">{row.map((cell: string, ci: number) => <td key={ci} className="border px-2 py-1">{cell}</td>)}</tr>)}</tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {store.scanHistory.length > 0 && (
                  <div><p className="text-xs font-semibold mb-2">{t('scan.history')}</p><div className="space-y-1 max-h-24 overflow-y-auto">{store.scanHistory.slice(-5).reverse().map((s: any, i: number) => <div key={i} className="text-xs text-muted-foreground bg-muted/30 rounded p-1.5">{s.summary || `${s.fields.length} fields, ${s.tables.length} tables`}</div>)}</div></div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="h-8 text-xs"><Download className="size-3.5" /> {t('workspace.export')} <ChevronDown className="size-3" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportCSV}><FileSpreadsheet className="size-4" /> CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { const json = store.exportJSON(); const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'project.json'; a.click() }}><FileText className="size-4" /> JSON</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}><FileText className="size-4" /> Export PDF Report</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Analysis */}
        <aside className="w-56 border-r border-border/50 bg-card/50 flex flex-col flex-shrink-0 overflow-y-auto hidden md:flex">
          <div className="p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('workspace.analysis')}</p>
            <div className="space-y-1">
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={handleRunDescriptive} disabled={store.selectedVariables.length === 0}><BarChart3 className="size-3.5 mr-2" />{t('analysis.descriptive')}</Button>
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={handleRunCorrelation} disabled={store.selectedVariables.length < 2}><TrendingUp className="size-3.5 mr-2" />{t('analysis.correlation')}</Button>
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={handleRunRegression} disabled={store.selectedVariables.length < 2}><PieChart className="size-3.5 mr-2" />{t('analysis.regression')}</Button>
              <Separator className="my-2" />
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={handleRunFrequencies} disabled={store.selectedVariables.length === 0}><ClipboardList className="size-3.5 mr-2" />{t('analysis.frequencies')}</Button>
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" disabled={store.variables.length < 2} onClick={() => setCrosstabsDialogOpen(true)}><Table2 className="size-3.5 mr-2" />{t('analysis.crosstabs')}</Button>
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" disabled={store.variables.length < 2} onClick={() => setTtestDialogOpen(true)}><FileText className="size-3.5 mr-2" />{t('analysis.ttest')}</Button>
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" disabled={store.variables.length < 2} onClick={() => setAnovaDialogOpen(true)}><Database className="size-3.5 mr-2" />{t('analysis.anova')}</Button>
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={handleRunChiSquare} disabled={store.selectedVariables.length < 1}><BarChart3 className="size-3.5 mr-2" />{t('analysis.chisquare')}</Button>
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" disabled={store.variables.length < 2} onClick={() => setNonparamDialogOpen(true)}><PenLine className="size-3.5 mr-2" />{t('analysis.nonparametric')}</Button>
            </div>
          </div>
          <div className="p-3 border-t border-border/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('scan.title')}</p>
            <div className="space-y-1">
              <Dialog open={cleanDialogOpen} onOpenChange={setCleanDialogOpen}>
                <DialogTrigger asChild><Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" disabled={store.variables.length === 0}><Sparkles className="size-3.5 mr-2 text-teal-500" />{t('clean.title')}</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="size-5 text-teal-500" />{t('clean.title')}</DialogTitle><DialogDescription>AI-powered data cleaning</DialogDescription></DialogHeader>
                  <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={store.variables.length === 0} onClick={async () => {
                    const res = await fetch('/api/clean', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: store.data, variables: store.variables }) })
                    const result = await res.json()
                    if (result.cleanedData) {
                      store.setData(result.cleanedData)
                      store.setCleaningStats(result.stats)
                      store.addSyntax(`DATA CLEANING: ${result.stats.totalRows} rows, ${result.stats.cleanedCells} cleaned`)
                      store.addOutput({ id: Date.now().toString(36), title: t('clean.title'), type: 'table', content: { headers: ['Metric', 'Value'], rows: [['Rows Processed', result.stats.totalRows], ['Cells Cleaned', result.stats.cleanedCells], ['Outliers Detected', result.stats.outliers], ['Duplicates Found', result.stats.duplicates], ['Missing Imputed', result.stats.missing]] }, timestamp: new Date().toISOString() })
                    }
                  }}>{t('clean.start')}</Button>
                  {store.cleaningStats && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center"><p className="text-lg font-bold text-emerald-600">{store.cleaningStats.cleanedCells}</p><p className="text-[10px] text-muted-foreground">{t('clean.fixes')}</p></div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center"><p className="text-lg font-bold text-amber-600">{store.cleaningStats.outliers}</p><p className="text-[10px] text-muted-foreground">{t('clean.outliers')}</p></div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center"><p className="text-lg font-bold text-red-600">{store.cleaningStats.duplicates}</p><p className="text-[10px] text-muted-foreground">{t('clean.duplicates')}</p></div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
              <Dialog open={validateDialogOpen} onOpenChange={setValidateDialogOpen}>
                <DialogTrigger asChild><Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" disabled={store.variables.length === 0}><Check className="size-3.5 mr-2 text-emerald-500" />{t('validate.title')}</Button></DialogTrigger>
                <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="flex items-center gap-2"><Check className="size-5 text-emerald-500" />{t('validate.title')}</DialogTitle><DialogDescription>Smart data validation</DialogDescription></DialogHeader>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={store.variables.length === 0} onClick={async () => {
                    const res = await fetch('/api/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: store.data, variables: store.variables }) })
                    const result = await res.json()
                    store.setValidationIssues(result.issues || [])
                    if (result.valid) { store.addOutput({ id: Date.now().toString(36), title: t('clean.validated'), type: 'text', content: 'All data passed validation checks.', timestamp: new Date().toISOString() }) }
                  }}>{t('validate.start')}</Button>
                  {store.validationIssues && store.validationIssues.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <div className="flex gap-2 text-xs mb-2">
                        <Badge className="bg-red-100 text-red-700 border-red-200">{store.validationIssues.filter((i: any) => i.severity === 'error').length} {t('validate.errors')}</Badge>
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">{store.validationIssues.filter((i: any) => i.severity === 'warning').length} {t('validate.warnings')}</Badge>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {store.validationIssues.slice(0, 50).map((issue: any, i: number) => (
                          <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded-lg ${issue.severity === 'error' ? 'bg-red-50 border border-red-100' : issue.severity === 'warning' ? 'bg-amber-50 border border-amber-100' : 'bg-blue-50 border border-blue-100'}`}>
                            <span className="font-medium shrink-0">Row {issue.row}:</span>
                            <div><p className="font-medium">{issue.message}</p><p className="text-muted-foreground">{issue.suggestion}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {store.validationIssues && store.validationIssues.length === 0 && (
                    <div className="text-center py-4"><Check className="size-8 mx-auto text-emerald-500 mb-2" /><p className="text-sm text-muted-foreground">{t('validate.noIssues')}</p></div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="mt-auto p-3 border-t border-border/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('workspace.import')}</p>
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild><Button variant="outline" size="sm" className="w-full text-xs h-8"><Upload className="size-3.5 mr-1" />CSV</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t('import.title')}</DialogTitle></DialogHeader>
                <p className="text-xs text-muted-foreground">{t('import.supportedFormats')}</p>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t('import.dragDrop')}</p>
                  <input type="file" accept=".csv,.xlsx,.json" onChange={handleFileUpload} className="mt-3 text-xs" />
                </div>
                <Textarea placeholder="Or paste CSV data here..." value={importText} onChange={e => setImportText(e.target.value)} className="h-32 text-xs font-mono" />
                <DialogFooter><Button onClick={handleImportCSV}>{t('workspace.import')}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <div className="h-10 border-b border-border/50 flex items-center px-2 gap-1 flex-shrink-0 bg-card/30">
            {[
              { key: 'data' as const, icon: Table2, label: t('workspace.dataView') },
              { key: 'variables' as const, icon: Variable, label: t('workspace.variableView') },
              { key: 'output' as const, icon: BarChart3, label: t('workspace.output') },
              { key: 'syntax' as const, icon: Terminal, label: t('workspace.syntax') },
            ].map(tab => (
              <button key={tab.key} onClick={() => store.setWorkspaceTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${store.workspaceTab === tab.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                <tab.icon className="size-3.5" />{tab.label}
              </button>
            ))}
            <div className="flex-1" />
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => store.addRow()}><Plus className="size-3" />{t('workspace.newProject')}</Button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto">
            {/* DATA VIEW */}
            {store.workspaceTab === 'data' && (
              <div className="overflow-auto h-full">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                    <tr>
                      <th className="border border-border/50 px-2 py-1.5 text-left text-muted-foreground font-medium w-12 bg-muted/60">#</th>
                      {store.variables.map(v => (
                        <th key={v.id} className={`border border-border/50 px-2 py-1.5 text-left font-medium min-w-[100px] ${store.selectedVariables.includes(v.name) ? 'bg-primary/10 text-primary' : 'bg-muted/60'}`}>
                          <button className="flex items-center gap-1" onClick={() => store.toggleVariableSelection(v.name)}>
                            {store.selectedVariables.includes(v.name) && <Check className="size-3" />}
                            {v.name}
                          </button>
                        </th>
                      ))}
                      <th className="border border-border/50 px-1 py-1.5 w-8 bg-muted/60">
                        <Dialog open={newVarDialogOpen} onOpenChange={setNewVarDialogOpen}>
                          <DialogTrigger asChild><button><Plus className="size-3" /></button></DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>{t('workspace.newProject')}</DialogTitle></DialogHeader>
                            <div className="space-y-3">
                              <div><p className="text-xs font-medium mb-1">Name</p><Input value={newVarName} onChange={e => setNewVarName(e.target.value)} placeholder="variable_name" className="text-sm" /></div>
                              <div><p className="text-xs font-medium mb-1">Type</p>
                                <Select value={newVarType} onValueChange={(v: any) => setNewVarType(v)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="numeric">{t('var.numeric')}</SelectItem>
                                    <SelectItem value="string">{t('var.string')}</SelectItem>
                                    <SelectItem value="date">{t('var.date')}</SelectItem>
                                    <SelectItem value="currency">{t('var.currency')}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter><Button onClick={handleAddVariable}>{t('workspace.confirm')}</Button></DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.max(rowCount, 1) }, (_, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-muted/30">
                        <td className="border border-border/50 px-2 py-1 text-muted-foreground">{rowIdx + 1}</td>
                        {store.variables.map(v => (
                          <td key={v.id} className="border border-border/50 px-1 py-0.5">
                            <input type="text" value={store.data[v.name]?.[rowIdx] ?? '' ?? ''} onChange={e => store.setCellValue(v.name, rowIdx, v.type === 'numeric' ? (parseFloat(e.target.value) || e.target.value) : e.target.value)}
                              className="w-full px-1 py-1 bg-transparent text-xs outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/30 rounded" />
                          </td>
                        ))}
                        <td className="border border-border/50 px-1 py-0.5 text-center text-muted-foreground">
                          <button onClick={() => store.deleteRow(rowIdx)} className="hover:text-destructive"><Trash2 className="size-3" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* VARIABLE VIEW */}
            {store.workspaceTab === 'variables' && (
              <div className="overflow-auto h-full">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                    <tr>
                      {['Name', 'Type', 'Label', 'Width', 'Decimals', 'Missing', 'Values'].map(h => (
                        <th key={h} className="border border-border/50 px-3 py-2 text-left font-medium bg-muted/60">{h}</th>
                      ))}
                      <th className="border border-border/50 px-2 py-2 w-10 bg-muted/60"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {store.variables.map(v => (
                      <tr key={v.id} className="hover:bg-muted/30">
                        <td className="border border-border/50 px-3 py-1.5 font-medium">{v.name}</td>
                        <td className="border border-border/50 px-3 py-1.5"><Badge variant="outline" className="text-[10px] px-1.5">{v.type}</Badge></td>
                        <td className="border border-border/50 px-3 py-1.5"><input value={v.label} onChange={e => store.updateVariable(v.id, { label: e.target.value })} className="w-full bg-transparent text-xs outline-none" /></td>
                        <td className="border border-border/50 px-3 py-1.5"><input type="number" value={v.width} onChange={e => store.updateVariable(v.id, { width: parseInt(e.target.value) || 8 })} className="w-12 bg-transparent text-xs outline-none" /></td>
                        <td className="border border-border/50 px-3 py-1.5"><input type="number" value={v.decimals} onChange={e => store.updateVariable(v.id, { decimals: parseInt(e.target.value) || 0 })} className="w-12 bg-transparent text-xs outline-none" /></td>
                        <td className="border border-border/50 px-3 py-1.5"><input value={v.missing} onChange={e => store.updateVariable(v.id, { missing: e.target.value })} className="w-full bg-transparent text-xs outline-none" /></td>
                        <td className="border border-border/50 px-3 py-1.5 text-muted-foreground">{Object.keys(v.values).length}</td>
                        <td className="border border-border/50 px-2 py-1.5 text-center"><button onClick={() => store.deleteVariable(v.id)} className="hover:text-destructive"><Trash2 className="size-3" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* OUTPUT VIEW */}
            {store.workspaceTab === 'output' && (
              <div className="p-4 space-y-4 overflow-auto h-full">
                {store.outputs.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <BarChart3 className="size-12 mb-3 opacity-30" />
                    <p className="text-sm">{t('output.noOutput')}</p>
                  </div>
                )}
                {store.outputs.map(out => (
                  <Card key={out.id} className="overflow-hidden">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{out.title}</CardTitle>
                        <span className="text-[10px] text-muted-foreground">{new Date(out.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      {/* Table output */}
                      {out.type === 'table' && out.content?.rows && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr>{out.content.headers.map((h: string, i: number) => <th key={i} className="border border-border/50 px-3 py-1.5 text-left font-medium bg-muted/50">{h}</th>)}</tr>
                            </thead>
                            <tbody>
                              {out.content.rows.map((row: string[], ri: number) => (
                                <tr key={ri} className="hover:bg-muted/30">
                                  {row.map((cell: string, ci: number) => <td key={ci} className="border border-border/50 px-3 py-1.5">{cell}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Text output */}
                      {out.type === 'text' && out.content && (
                        <p className="text-sm text-muted-foreground">{String(out.content)}</p>
                      )}

                      {/* Chart output - Recharts */}
                      {out.type === 'chart' && out.content && (
                        (() => {
                          const c = out.content
                          if (c.chartType === 'scatter') {
                            return <ChartScatter data={c.data || []} xKey={c.iv} yKey={c.dv} title={c.dv ? `${c.dv} vs ${c.iv}` : out.title} regression={c.slope != null ? { slope: c.slope, intercept: c.intercept } : undefined} />
                          }
                          if (c.chartType === 'histogram') {
                            return <ChartHistogram values={c.values || []} title={c.title || out.title} />
                          }
                          if (c.chartType === 'pie') {
                            return <ChartPie data={c.data || []} title={c.title || out.title} />
                          }
                          if (c.chartType === 'boxplot') {
                            return <ChartBoxPlot groups={c.groups || []} title={c.title || out.title} />
                          }
                          if (c.chartType === 'bar') {
                            return <ChartBar data={c.data || []} bars={c.bars || [{ key: 'count' }]} title={c.title || out.title} />
                          }
                          if (c.chartType === 'line') {
                            return <ChartLine data={c.data || []} lines={c.lines || [{ key: 'value' }]} title={c.title || out.title} />
                          }
                          // Fallback for old scatter format
                          if (c.x && c.y) {
                            const scatterData = makeScatterData(c.x, c.y)
                            return <ChartScatter data={scatterData} xKey={c.iv} yKey={c.dv} title={out.title} regression={c.slope != null ? { slope: c.slope, intercept: c.intercept } : undefined} />
                          }
                          return <p className="text-xs text-muted-foreground">Unsupported chart type</p>
                        })()
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* SYNTAX VIEW */}
            {store.workspaceTab === 'syntax' && (
              <div className="p-4 font-mono text-xs text-muted-foreground space-y-1 overflow-auto h-full">
                <p className="text-foreground font-medium mb-3">* Syntax History</p>
                {store.syntaxHistory.length === 0 && <p>No syntax recorded yet.</p>}
                {store.syntaxHistory.map((s, i) => <p key={i} className="py-1">{s}</p>)}
              </div>
            )}
          </div>
        </main>

        {/* Right Panel - AI Assistant */}
        <aside className="w-80 border-l border-border/50 bg-card/30 flex flex-col flex-shrink-0 hidden lg:flex">
          <div className="p-3 border-b border-border/50 flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold">{t('workspace.aiAssistant')}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {store.chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Bot className="size-10 mb-2 text-primary/50" />
                <p className="text-xs text-muted-foreground leading-relaxed">{t('ai.welcome')}</p>
              </div>
            )}
            {store.chatMessages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && <div className="flex-shrink-0 size-6 rounded-md bg-primary/10 flex items-center justify-center"><Bot className="size-3 text-primary" /></div>}
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-md'}`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && <div className="flex-shrink-0 size-6 rounded-md bg-accent/20 flex items-center justify-center"><User className="size-3 text-accent" /></div>}
              </div>
            ))}
            {store.isAiTyping && (
              <div className="flex gap-2 items-center"><div className="size-6 rounded-md bg-primary/10 flex items-center justify-center"><Bot className="size-3 text-primary" /></div><div className="bg-muted rounded-xl px-3 py-2 text-xs"><span className="animate-pulse">{t('ai.thinking')}</span></div></div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-border/50">
            <div className="flex gap-2">
              <Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={t('ai.placeholder')} className="text-xs h-8" onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendChat()} />
              <Button size="sm" className="h-8 w-8 p-0" onClick={handleSendChat} disabled={store.isAiTyping}><Send className="size-3.5" /></Button>
            </div>
          </div>
        </aside>
      </div>

      {/* ─── DIALOGS ─── */}

      {/* Crosstabs Dialog */}
      <Dialog open={crosstabsDialogOpen} onOpenChange={setCrosstabsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('analysis.crosstabs')}</DialogTitle><DialogDescription>Select row and column variables</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><p className="text-xs font-medium mb-1">Row Variable</p>
              <Select value={crosstabRowVar} onValueChange={setCrosstabRowVar}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{store.variables.map(v => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><p className="text-xs font-medium mb-1">Column Variable</p>
              <Select value={crosstabColVar} onValueChange={setCrosstabColVar}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{store.variables.map(v => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleRunCrosstabs} disabled={!crosstabRowVar || !crosstabColVar}>Run</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* T-Test Dialog */}
      <Dialog open={ttestDialogOpen} onOpenChange={setTtestDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('analysis.ttest')}</DialogTitle><DialogDescription>Independent samples t-test: select a grouping variable and a test variable</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><p className="text-xs font-medium mb-1">Grouping Variable (categorical)</p>
              <Select value={ttestGroupVar} onValueChange={setTtestGroupVar}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{store.variables.map(v => <SelectItem key={v.name} value={v.name}>{v.name} ({v.type})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><p className="text-xs font-medium mb-1">Test Variable (numeric)</p>
              <Select value={ttestValueVar} onValueChange={setTtestValueVar}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{store.variables.filter(v => v.type === 'numeric').map(v => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleRunTTest} disabled={!ttestGroupVar || !ttestValueVar}>Run</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ANOVA Dialog */}
      <Dialog open={anovaDialogOpen} onOpenChange={setAnovaDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('analysis.anova')}</DialogTitle><DialogDescription>One-Way ANOVA: select a factor (group) and dependent variable</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><p className="text-xs font-medium mb-1">Factor Variable (grouping)</p>
              <Select value={anovaGroupVar} onValueChange={setAnovaGroupVar}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{store.variables.map(v => <SelectItem key={v.name} value={v.name}>{v.name} ({v.type})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><p className="text-xs font-medium mb-1">Dependent Variable (numeric)</p>
              <Select value={anovaValueVar} onValueChange={setAnovaValueVar}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{store.variables.filter(v => v.type === 'numeric').map(v => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleRunANOVA} disabled={!anovaGroupVar || !anovaValueVar}>Run</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nonparametric Dialog */}
      <Dialog open={nonparamDialogOpen} onOpenChange={setNonparamDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('analysis.nonparametric')}</DialogTitle><DialogDescription>Select test type and variables</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><p className="text-xs font-medium mb-1">Test Type</p>
              <Select value={nonparamType} onValueChange={(v: any) => setNonparamType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mann-whitney">Mann-Whitney U (Independent)</SelectItem>
                  <SelectItem value="wilcoxon">Wilcoxon Signed-Rank (Paired)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><p className="text-xs font-medium mb-1">Variable 1</p>
              <Select value={nonparamVar1} onValueChange={setNonparamVar1}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{store.variables.filter(v => v.type === 'numeric').map(v => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><p className="text-xs font-medium mb-1">Variable 2 {nonparamType === 'mann-whitney' ? '(independent group)' : '(paired)'}</p>
              <Select value={nonparamVar2} onValueChange={setNonparamVar2}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{store.variables.filter(v => v.type === 'numeric').map(v => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleRunNonparametric} disabled={!nonparamVar1 || !nonparamVar2}>Run</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
