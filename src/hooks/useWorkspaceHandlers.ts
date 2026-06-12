'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { useAppStore } from '@/lib/store'
import {
  calcFrequencies, calcCrosstabs, calcTTest, calcANOVA,
  calcChiSquare, calcMannWhitney, calcWilcoxon,
  formatPValue, fmt,
} from '@/lib/stats'
import {
  makeScatterData, makeFrequencyBarData, makePieData,
} from '@/components/workspace/Charts'
import { generateQuickReport } from '@/components/workspace/ReportGenerator'

/* ─── Inline Statistical Engine ─── */
function calcStats(values: number[]) {
  const nums = values.filter(v => typeof v === 'number' && !isNaN(v))
  if (nums.length === 0) return null
  const n = nums.length
  const s = nums.reduce((a, b) => a + b, 0)
  const mean = s / n
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
  return { n, sum: s, mean, median, mode, variance, stddev, min, max, range: max - min, skewness, kurtosis, p25, p50, p75 }
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

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0)
}

/* ─── Hook ─── */
export function useWorkspaceHandlers() {
  const { t } = useTranslation()
  const store = useAppStore()

  // Dialog states
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareLink, setShareLink] = useState('')
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [newVarDialogOpen, setNewVarDialogOpen] = useState(false)
  const [newVarName, setNewVarName] = useState('')
  const [newVarType, setNewVarType] = useState<'numeric' | 'string' | 'date' | 'currency'>('numeric')
  const [scanDialogOpen, setScanDialogOpen] = useState(false)
  const [cleanDialogOpen, setCleanDialogOpen] = useState(false)
  const [validateDialogOpen, setValidateDialogOpen] = useState(false)
  const [scanFile, setScanFile] = useState<File | null>(null)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [editedFields, setEditedFields] = useState<Record<string, string>>({})
  const [nonparamDialogOpen, setNonparamDialogOpen] = useState(false)
  const [nonparamType, setNonparamType] = useState<'mann-whitney' | 'wilcoxon'>('mann-whitney')
  const [nonparamVar1, setNonparamVar1] = useState('')
  const [nonparamVar2, setNonparamVar2] = useState('')
  const [crosstabsDialogOpen, setCrosstabsDialogOpen] = useState(false)
  const [crosstabRowVar, setCrosstabRowVar] = useState('')
  const [crosstabColVar, setCrosstabColVar] = useState('')
  const [ttestDialogOpen, setTtestDialogOpen] = useState(false)
  const [ttestGroupVar, setTtestGroupVar] = useState('')
  const [ttestValueVar, setTtestValueVar] = useState('')
  const [anovaDialogOpen, setAnovaDialogOpen] = useState(false)
  const [anovaGroupVar, setAnovaGroupVar] = useState('')
  const [anovaValueVar, setAnovaValueVar] = useState('')

  // Validation state
  const [validationResults, setValidationResults] = useState<{
    issues: { row?: number; column: string; severity: 'error' | 'warning' | 'info'; message: string }[]
    stats: { totalRows: number; missingCells: number; outliers: number; duplicates: number; emptyCols: string[] }
  } | null>(null)

  // Form states
  const [chatInput, setChatInput] = useState('')

  // Computation loading states
  const [isValidating, setIsValidating] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const [isTransforming, setIsTransforming] = useState(false)

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const batchInputRef = useRef<HTMLInputElement>(null)

  // Set workspace view on mount
  useEffect(() => {
    store.setView('workspace')
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [store.chatMessages, store.isAiTyping])

  const getNumericVals = useCallback((varName: string): number[] => {
    return (store.data[varName] || []).map(v => typeof v === 'string' ? parseFloat(v) : v).filter((v): v is number => typeof v === 'number' && !isNaN(v))
  }, [store.data])

  const handleImportCSV = useCallback(() => {
    if (!importText.trim()) return
    store.importCSV(importText.trim())
    setImportDialogOpen(false)
    setImportText('')
  }, [importText, store])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    store.importFile(file)
    setImportDialogOpen(false)
  }, [store])

  const handleExportCSV = useCallback(() => {
    const csv = store.exportCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${store.currentProject?.name || 'data'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [store])

  const handleExportJSON = useCallback(() => {
    const json = store.exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'project.json'
    a.click()
  }, [store])

  const handleAddVariable = useCallback(() => {
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
  }, [newVarName, newVarType, store])

  const handleRunDescriptive = useCallback(() => {
    const results: any[] = []
    for (const varName of store.selectedVariables) {
      const vals = getNumericVals(varName)
      const stats = calcStats(vals)
      if (stats) {
        const se = stats.stddev / Math.sqrt(stats.n)
        const ci95_lower = stats.mean - 1.96 * se
        const ci95_upper = stats.mean + 1.96 * se
        const cv = stats.mean !== 0 ? (stats.stddev / Math.abs(stats.mean)) * 100 : 0
        results.push({
          variable: varName,
          n: stats.n,
          mean: stats.mean?.toFixed(3),
          median: stats.median,
          stddev: stats.stddev?.toFixed(3),
          se: se.toFixed(3),
          ci95: `${ci95_lower.toFixed(3)}–${ci95_upper.toFixed(3)}`,
          min: stats.min,
          max: stats.max,
          iqr: (stats.p75 - stats.p25).toFixed(3),
          skewness: stats.skewness?.toFixed(3),
          kurtosis: stats.kurtosis?.toFixed(3),
          cv: cv.toFixed(1) + '%',
          sum: stats.sum?.toFixed(2),
        })
      }
    }
    if (results.length === 0) {
      store.addOutput({
        id: Date.now().toString(36),
        title: 'Descriptive Statistics',
        type: 'text',
        content: `No descriptive statistics could be computed. This usually means the selected variables contain no valid numeric values. Try selecting numeric-type variables from the Data Editor. Selected: ${store.selectedVariables.join(', ') || 'none'}.`,
        timestamp: new Date().toISOString(),
      })
      return
    }
    store.addOutput({
      id: Date.now().toString(36),
      title: t('analysis.descriptive'),
      type: 'table',
      content: {
        headers: ['Variable', 'N', 'Mean', 'Median', 'SD', 'SE', '95% CI', 'Min', 'Max', 'IQR', 'Skew', 'Kurt', 'CV'],
        rows: results.map(r => [r.variable, r.n, r.mean, r.median, r.stddev, r.se, r.ci95, r.min, r.max, r.iqr, r.skewness, r.kurtosis, r.cv]),
      },
      timestamp: new Date().toISOString(),
    })
    store.addSyntax(`DESCRIPTIVES VARIABLES=${store.selectedVariables.join(' ')}`)
  }, [store, t, getNumericVals])

  const handleRunCorrelation = useCallback(() => {
    if (store.selectedVariables.length < 2) {
      store.addOutput({ id: Date.now().toString(36), title: 'Correlation', type: 'text', content: 'Correlation requires at least 2 numeric variables. Please select 2 or more numeric variables in the Data Editor and try again.', timestamp: new Date().toISOString() })
      return
    }
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
      content: { headers: [''], rows: matrix },
      timestamp: new Date().toISOString(),
    })
    store.addSyntax(`CORRELATIONS /VARIABLES=${vars.join(' ')}`)
  }, [store, t, getNumericVals])

  const handleRunRegression = useCallback(() => {
    if (store.selectedVariables.length < 2) {
      store.addOutput({ id: Date.now().toString(36), title: 'Regression', type: 'text', content: 'Regression requires at least 2 numeric variables (first = dependent, second = independent). Please select 2 or more numeric variables and try again.', timestamp: new Date().toISOString() })
      return
    }
    const dv = store.selectedVariables[0]
    const iv = store.selectedVariables[1]
    const x = getNumericVals(iv)
    const y = getNumericVals(dv)
    const reg = calcRegression(x, y)
    const corr = calcCorrelation(x, y)
    if (!reg || !corr) {
      store.addOutput({ id: Date.now().toString(36), title: 'Regression', type: 'text', content: `Could not compute regression for ${dv} ~ ${iv}. Ensure both variables have at least 3 valid numeric values and the independent variable (${iv}) has some variation (not all the same value).`, timestamp: new Date().toISOString() })
      return
    }
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
  }, [store, t, getNumericVals])

  const handleRunFrequencies = useCallback(() => {
    if (store.selectedVariables.length === 0) {
      store.addOutput({ id: Date.now().toString(36), title: 'Frequencies', type: 'text', content: 'No variables selected. Please select at least one variable in the Data Editor to generate frequency tables.', timestamp: new Date().toISOString() })
      return
    }
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
        const pieData = makePieData(vals)
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
  }, [store, getNumericVals])

  const handleRunCrosstabs = useCallback(() => {
    if (!crosstabRowVar || !crosstabColVar) {
      store.addOutput({ id: Date.now().toString(36), title: 'Crosstabs', type: 'text', content: 'Please select both a Row variable and a Column variable to generate a contingency table.', timestamp: new Date().toISOString() })
      return
    }
    const rowVals = store.data[crosstabRowVar] || []
    const colVals = store.data[crosstabColVar] || []
    const result = calcCrosstabs(rowVals, colVals, crosstabRowVar, crosstabColVar)
    if (!result) {
      store.addOutput({ id: Date.now().toString(36), title: 'Crosstabs', type: 'text', content: `Could not build crosstabs for ${crosstabRowVar} x ${crosstabColVar}. Ensure both variables have at least 5 valid observations with at least 2 categories each.`, timestamp: new Date().toISOString() })
      return
    }
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
  }, [crosstabRowVar, crosstabColVar, store])

  const handleRunTTest = useCallback(() => {
    if (!ttestGroupVar || !ttestValueVar) {
      store.addOutput({ id: Date.now().toString(36), title: 'T-Test', type: 'text', content: 'Please select both a Grouping variable and a Test variable. The grouping variable should be categorical (e.g., Male/Female) and the test variable should be numeric.', timestamp: new Date().toISOString() })
      return
    }
    const groupVals = store.data[ttestGroupVar] || []
    const valueVals = store.data[ttestValueVar] || []
    const n = Math.min(groupVals.length, valueVals.length)
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
    if (groups.length < 2) {
      store.addOutput({ id: Date.now().toString(36), title: 'T-Test', type: 'text', content: `T-Test requires exactly 2 groups in the grouping variable (${ttestGroupVar}). Found ${groups.length} group(s): ${groups.map(g => `${g[0]} (n=${g[1].length})`).join(', ') || 'none'}. Select a different grouping variable with exactly 2 categories.`, timestamp: new Date().toISOString() })
      return
    }
    const [g1Name, g1Vals] = groups[0]
    const [g2Name, g2Vals] = groups[1]
    const result = calcTTest(g1Vals, g2Vals, g1Name, g2Name)
    if (!result) {
      store.addOutput({ id: Date.now().toString(36), title: 'T-Test', type: 'text', content: `Could not compute T-Test. Ensure the grouping variable (${ttestGroupVar}) has exactly 2 groups, each with at least 2 numeric values in the test variable (${ttestValueVar}). Groups found: ${groups.map(g => `${g[0]} (n=${g[1].length})`).join(', ')}.`, timestamp: new Date().toISOString() })
      return
    }
    store.addOutput({
      id: Date.now().toString(36),
      title: 'Independent Samples T-Test',
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
  }, [ttestGroupVar, ttestValueVar, store])

  const handleRunANOVA = useCallback(() => {
    if (!anovaGroupVar || !anovaValueVar) {
      store.addOutput({ id: Date.now().toString(36), title: 'ANOVA', type: 'text', content: 'Please select both a Grouping variable and a Test variable. The grouping variable should be categorical (with 2+ groups) and the test variable should be numeric.', timestamp: new Date().toISOString() })
      return
    }
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
    if (!result) {
      store.addOutput({ id: Date.now().toString(36), title: 'ANOVA', type: 'text', content: `Could not compute ANOVA. Ensure the grouping variable has 2+ groups, each with at least 2 valid numeric values. Groups found: ${Object.entries(groupMap).map(([k, v]) => `${k} (n=${v.length})`).join(', ')}.`, timestamp: new Date().toISOString() })
      return
    }
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
    store.addOutput({
      id: (Date.now() + 3).toString(36),
      title: `Box Plot: ${anovaValueVar} by ${anovaGroupVar}`,
      type: 'chart',
      content: {
        chartType: 'boxplot',
        groups: result.groupStats.map(g => ({
          name: g.name,
          values: groupMap[g.name] || [],
        })),
        title: `${anovaValueVar} by ${anovaGroupVar}`,
      },
      timestamp: new Date().toISOString(),
    })
    store.addSyntax(`ONEWAY ${anovaValueVar} BY ${anovaGroupVar}`)
    setAnovaDialogOpen(false)
  }, [anovaGroupVar, anovaValueVar, store])

  const handleRunChiSquare = useCallback(() => {
    if (store.selectedVariables.length === 0) {
      store.addOutput({ id: Date.now().toString(36), title: 'Chi-Square', type: 'text', content: 'No variable selected. Please select at least one variable to run the Chi-Square goodness-of-fit test.', timestamp: new Date().toISOString() })
      return
    }
    const varName = store.selectedVariables[0]
    const vals = store.data[varName] || []
    const freq = calcFrequencies(vals, varName)
    if (!freq || freq.table.length < 2) {
      store.addOutput({ id: Date.now().toString(36), title: 'Chi-Square', type: 'text', content: `Chi-Square test requires at least 2 categories in ${varName}. Only ${freq?.table.length || 0} categories found.`, timestamp: new Date().toISOString() })
      return
    }
    const observed = freq.table.map(r => r.frequency)
    const result = calcChiSquare(observed)
    if (!result) {
      store.addOutput({ id: Date.now().toString(36), title: 'Chi-Square', type: 'text', content: 'Chi-Square computation failed. Ensure the data contains valid frequency counts.', timestamp: new Date().toISOString() })
      return
    }
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
  }, [store])

  const handleRunNonparametric = useCallback(() => {
    if (!nonparamVar1 || !nonparamVar2) {
      store.addOutput({ id: Date.now().toString(36), title: nonparamType === 'mann-whitney' ? 'Mann-Whitney U' : 'Wilcoxon', type: 'text', content: 'Please select two variables to run this nonparametric test.', timestamp: new Date().toISOString() })
      return
    }
    if (nonparamType === 'mann-whitney') {
      const v1 = getNumericVals(nonparamVar1)
      const v2 = getNumericVals(nonparamVar2)
      const result = calcMannWhitney(v1, v2)
      if (!result) {
        store.addOutput({ id: Date.now().toString(36), title: 'Mann-Whitney U', type: 'text', content: `Could not compute Mann-Whitney U test. Ensure both ${nonparamVar1} (n=${v1.length}) and ${nonparamVar2} (n=${v2.length}) have at least 2 valid numeric values each.`, timestamp: new Date().toISOString() })
        return
      }
      store.addOutput({
        id: Date.now().toString(36),
        title: 'Mann-Whitney U Test',
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
      const v1 = store.data[nonparamVar1] || []
      const v2 = store.data[nonparamVar2] || []
      const result = calcWilcoxon(v1, v2)
      if (!result) {
        store.addOutput({ id: Date.now().toString(36), title: 'Wilcoxon', type: 'text', content: `Could not compute Wilcoxon signed-rank test. Ensure both variables are paired (same length) and have at least 5 valid paired differences. ${nonparamVar1}: ${v1.length} values, ${nonparamVar2}: ${v2.length} values.`, timestamp: new Date().toISOString() })
        return
      }
      store.addOutput({
        id: Date.now().toString(36),
        title: 'Wilcoxon Signed-Rank Test',
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
  }, [nonparamVar1, nonparamVar2, nonparamType, store, getNumericVals])

  /* ─── Data Validation (non-blocking) ─── */
  const handleValidate = useCallback(() => {
    if (isValidating) return
    setIsValidating(true)

    // Defer heavy computation to next tick so UI can show loading state
    setTimeout(() => {
      try {
        const data = store.data
        const variables = store.variables
    const issues: { row?: number; column: string; severity: 'error' | 'warning' | 'info'; message: string }[] = []
    let missingCells = 0
    let outlierCount = 0
    let typeErrors = 0
    const emptyCols: string[] = []

    for (const v of variables) {
      const col = data[v.name] || []
      let colMissing = 0
      const values: number[] = []

      for (let i = 0; i < col.length; i++) {
        const val = col[i]
        if (val === '' || val === null || val === undefined) {
          colMissing++
          missingCells++
          issues.push({ row: i + 1, column: v.name, severity: 'warning', message: 'Missing value' })
        } else if (v.type === 'numeric' && typeof val === 'string' && isNaN(parseFloat(val))) {
          typeErrors++
          issues.push({ row: i + 1, column: v.name, severity: 'error', message: `Non-numeric value "${val}" in numeric column` })
        } else if (v.type === 'numeric') {
          const num = typeof val === 'string' ? parseFloat(val) : val
          if (typeof num === 'number' && !isNaN(num)) values.push(num)
        }
      }

      if (colMissing === col.length && col.length > 0) {
        emptyCols.push(v.name)
        issues.push({ column: v.name, severity: 'error', message: 'Entire column is empty' })
      }

      // Check outliers using IQR method
      if (values.length >= 4) {
        const sorted = [...values].sort((a, b) => a - b)
        const q1 = sorted[Math.floor(sorted.length * 0.25)]
        const q3 = sorted[Math.floor(sorted.length * 0.75)]
        const iqr = q3 - q1
        const lower = q1 - 1.5 * iqr
        const upper = q3 + 1.5 * iqr
        for (let i = 0; i < col.length; i++) {
          const val = col[i]
          const num = typeof val === 'string' ? parseFloat(val) : val
          if (typeof num === 'number' && !isNaN(num) && (num < lower || num > upper)) {
            outlierCount++
            if (issues.length < 50) {
              issues.push({ row: i + 1, column: v.name, severity: 'info', message: `Potential outlier: ${num} (range: ${lower.toFixed(1)}\u2013${upper.toFixed(1)})` })
            }
          }
        }
      }
    }

    // Check duplicate rows
    const rowCount = Math.max(0, ...Object.values(data).map(a => a.length))
    let duplicates = 0
    const seen = new Set<string>()
    for (let i = 0; i < rowCount; i++) {
      const key = variables.map(v => String(data[v.name]?.[i] ?? '')).join('|')
      if (seen.has(key)) {
        duplicates++
        if (issues.length < 50) {
          issues.push({ row: i + 1, column: '*', severity: 'warning', message: 'Duplicate row' })
        }
      }
      seen.add(key)
    }

    const totalIssues = issues.length
    const result = {
      issues: issues.slice(0, 50),
      stats: { totalRows: rowCount, missingCells, outliers: outlierCount, duplicates, emptyCols },
    }
    setValidationResults(result)

    // ── ALSO produce OutputPanel results so the user sees something ──
    // 1) Summary table
    const errors = issues.filter(i => i.severity === 'error')
    const warnings = issues.filter(i => i.severity === 'warning')
    const infos = issues.filter(i => i.severity === 'info')
    const healthScore = Math.max(0, 100 - (errors.length * 15 + warnings.length * 5 + infos.length * 1))
    const overallStatus = healthScore >= 80 ? 'Good' : healthScore >= 50 ? 'Needs Attention' : 'Poor'

    store.addOutput({
      id: Date.now().toString(36),
      title: 'Data Validation Report',
      type: 'table',
      content: {
        headers: ['Metric', 'Value'],
        rows: [
          ['Overall Health', `${healthScore}/100 (${overallStatus})`],
          ['Total Rows', String(rowCount)],
          ['Variables', String(variables.length)],
          ['Total Issues', String(totalIssues)],
          ['Errors', String(errors.length)],
          ['Warnings', String(warnings.length)],
          ['Info (Outliers)', String(infos.length)],
          ['Missing Cells', String(missingCells)],
          ['Type Mismatches', String(typeErrors)],
          ['Duplicate Rows', String(duplicates)],
          ['Empty Columns', emptyCols.length > 0 ? emptyCols.join(', ') : 'None'],
        ],
      },
      timestamp: new Date().toISOString(),
    })

    // 2) Issues detail table (top 30)
    if (issues.length > 0) {
      store.addOutput({
        id: (Date.now() + 1).toString(36),
        title: `Validation Issues (${Math.min(30, issues.length)} of ${totalIssues})`,
        type: 'table',
        content: {
          headers: ['Severity', 'Row', 'Column', 'Message'],
          rows: issues.slice(0, 30).map(i => [
            i.severity.toUpperCase(),
            i.row ? String(i.row) : '-',
            i.column,
            i.message,
          ]),
        },
        timestamp: new Date().toISOString(),
      })
    } else {
      store.addOutput({
        id: (Date.now() + 1).toString(36),
        title: 'Validation Result',
        type: 'text',
        content: 'All checks passed. Your data looks clean with no issues detected.',
        timestamp: new Date().toISOString(),
      })
    }

    store.addSyntax(`DATA VALIDATION /VARIABLES=ALL`)
      } finally {
        setIsValidating(false)
      }
    }, 0)
  }, [store.data, store.variables, isValidating])

  /* ─── Data Cleaning (non-blocking) ─── */
  const handleClean = useCallback(() => {
    if (isCleaning) return
    setIsCleaning(true)
    setCleanDialogOpen(false)

    setTimeout(() => {
      try {
    const data: Record<string, any[]> = {}
    for (const k of Object.keys(store.data)) data[k] = [...store.data[k]]
    const variables = [...store.variables]
    let trimmedCount = 0
    let filledCount = 0

    for (const v of variables) {
      const col = [...(data[v.name] || [])]

      for (let i = 0; i < col.length; i++) {
        if (typeof col[i] === 'string') {
          const trimmed = col[i].trim()
          if (trimmed !== col[i]) {
            col[i] = trimmed
            trimmedCount++
          }
        }
      }

      // Fill missing values: mean for numeric, mode for string
      if (v.type === 'numeric') {
        const nums = col.filter((x): x is number => typeof x === 'number' && !isNaN(x))
        const mean = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
        for (let i = 0; i < col.length; i++) {
          if (col[i] === '' || col[i] === null || col[i] === undefined) {
            col[i] = parseFloat(mean.toFixed(2))
            filledCount++
          }
        }
      } else {
        const nonEmpty = col.filter(x => x !== '' && x !== null && x !== undefined)
        const freq = new Map<string, number>()
        nonEmpty.forEach(x => freq.set(String(x), (freq.get(String(x)) || 0) + 1))
        let mode = ''
        let maxFreq = 0
        freq.forEach((count, val) => { if (count > maxFreq) { maxFreq = count; mode = val } })
        for (let i = 0; i < col.length; i++) {
          if (col[i] === '' || col[i] === null || col[i] === undefined) {
            col[i] = mode
            filledCount++
          }
        }
      }

      data[v.name] = col
    }

    // Remove duplicate rows
    const rowCount = Math.max(0, ...Object.values(data).map(a => a.length))
    const keepIndices: number[] = []
    const seen = new Set<string>()
    for (let i = 0; i < rowCount; i++) {
      const key = variables.map(v => String(data[v.name]?.[i] ?? '')).join('|')
      if (!seen.has(key)) {
        seen.add(key)
        keepIndices.push(i)
      }
    }

    const removedRows = rowCount - keepIndices.length
    if (keepIndices.length < rowCount) {
      for (const v of variables) {
        data[v.name] = keepIndices.map(i => data[v.name][i])
      }
    }

    store.setData(data)

    // Detailed cleaning report
    const newRowCount = Math.max(0, ...Object.values(data).map(a => a.length))
    store.addOutput({
      id: Date.now().toString(36),
      title: 'Data Cleaning Report',
      type: 'table',
      content: {
        headers: ['Metric', 'Before', 'After', 'Change'],
        rows: [
          ['Total Rows', String(rowCount), String(newRowCount), removedRows > 0 ? `${removedRows} removed` : 'No change'],
          ['Whitespace Trimmed', '-', String(trimmedCount), trimmedCount > 0 ? `${trimmedCount} cells` : 'None needed'],
          ['Missing Values Filled', '-', String(filledCount), filledCount > 0 ? `${filledCount} cells` : 'None found'],
          ['Duplicate Rows', '-', '-', removedRows > 0 ? `${removedRows} removed` : 'None found'],
        ],
      },
      timestamp: new Date().toISOString(),
    })

    if (trimmedCount === 0 && filledCount === 0 && removedRows === 0) {
      store.addOutput({
        id: (Date.now() + 1).toString(36),
        title: 'Cleaning Result',
        type: 'text',
        content: 'Your data was already clean. No changes were made. Whitespace was already trimmed, no missing values found, and no duplicate rows detected.',
        timestamp: new Date().toISOString(),
      })
    } else {
      const changes: string[] = []
      if (trimmedCount > 0) changes.push(`Trimmed whitespace in ${trimmedCount} cells`)
      if (filledCount > 0) changes.push(`Filled ${filledCount} missing values (mean for numeric, mode for text)`)
      if (removedRows > 0) changes.push(`Removed ${removedRows} duplicate rows`)
      store.addOutput({
        id: (Date.now() + 1).toString(36),
        title: 'Cleaning Summary',
        type: 'text',
        content: `Data cleaning applied successfully. ${changes.join('. ')}. The dataset now has ${newRowCount} rows across ${variables.length} variables. You can re-run Validate to confirm the data is now clean.`,
        timestamp: new Date().toISOString(),
      })
    }

    setCleanDialogOpen(false)
    store.addSyntax(`DATA CLEANING /TRIM /FILL_MISSING /REMOVE_DUPLICATES`)
      } finally {
        setIsCleaning(false)
      }
    }, 0)
  }, [store, isCleaning])

  /* ─── Data Transformations (non-blocking) ─── */
  const handleTransformZScore = useCallback(() => {
    if (isTransforming) return
    setIsTransforming(true)
    // Snapshot current state to avoid stale closures
    const dataSnap: Record<string, any[]> = {}
    for (const k of Object.keys(store.data)) dataSnap[k] = [...store.data[k]]
    const selectedVars = [...store.selectedVariables]

    setTimeout(() => {
      try {
        const data: Record<string, any[]> = { ...dataSnap }
        const createdVars: string[] = []

        for (const varName of selectedVars) {
          const vals = (data[varName] || []).map((v: any) => typeof v === 'string' ? parseFloat(v) : v).filter((v: any): v is number => typeof v === 'number' && !isNaN(v))
          if (vals.length < 2) continue
          const m = vals.reduce((a, b) => a + b, 0) / vals.length
          const s = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / (vals.length - 1))
          if (s === 0) continue
          const col = data[varName] || []
          const newName = `z_${varName}`
          data[newName] = col.map(v => {
            const n = typeof v === 'string' ? parseFloat(v) : v
            return typeof n === 'number' && !isNaN(n) ? parseFloat(((n - m) / s).toFixed(4)) : ''
          })
          store.addVariable({
            id: Date.now().toString(36) + varName,
            name: newName,
            type: 'numeric',
            label: `Z-score of ${varName}`,
            width: 10, decimals: 4, missing: '', values: {},
          })
          createdVars.push(varName)
        }

        store.setData(data)
        store.addOutput({
          id: Date.now().toString(36),
          title: 'Z-Score Transformation',
          type: 'table',
          content: {
            headers: ['Original', 'Transformed', 'Formula'],
            rows: createdVars.map(v => [v, `z_${v}`, '(x − mean) / SD']),
          },
          timestamp: new Date().toISOString(),
        })
        store.addSyntax(`COMPUTE z_*= (var - MEAN(var)) / SD(var)`)
      } finally {
        setIsTransforming(false)
      }
    }, 0)
  }, [store, isTransforming])

  const handleTransformNormalize = useCallback(() => {
    if (isTransforming) return
    setIsTransforming(true)
    const dataSnap: Record<string, any[]> = {}
    for (const k of Object.keys(store.data)) dataSnap[k] = [...store.data[k]]
    const selectedVars = [...store.selectedVariables]

    setTimeout(() => {
      try {
        const data: Record<string, any[]> = { ...dataSnap }
        const createdVars: string[] = []

        for (const varName of selectedVars) {
          const vals = (data[varName] || []).map((v: any) => typeof v === 'string' ? parseFloat(v) : v).filter((v: any): v is number => typeof v === 'number' && !isNaN(v))
          if (vals.length < 2) continue
          const min = Math.min(...vals)
          const max = Math.max(...vals)
          const range = max - min
          if (range === 0) continue
          const col = data[varName] || []
          const newName = `norm_${varName}`
          data[newName] = col.map(v => {
            const n = typeof v === 'string' ? parseFloat(v) : v
            return typeof n === 'number' && !isNaN(n) ? parseFloat(((n - min) / range).toFixed(4)) : ''
          })
          store.addVariable({
            id: Date.now().toString(36) + varName,
            name: newName,
            type: 'numeric',
            label: `Normalized ${varName}`,
            width: 10, decimals: 4, missing: '', values: {},
          })
          createdVars.push(varName)
        }

        store.setData(data)
        store.addOutput({
          id: Date.now().toString(36),
          title: 'Min-Max Normalization (0–1)',
          type: 'table',
          content: {
            headers: ['Original', 'Transformed', 'Formula'],
            rows: createdVars.map(v => [v, `norm_${v}`, '(x − min) / (max − min)']),
          },
          timestamp: new Date().toISOString(),
        })
        store.addSyntax(`COMPUTE norm_*= (var - MIN(var)) / (MAX(var) - MIN(var))`)
      } finally {
        setIsTransforming(false)
      }
    }, 0)
  }, [store, isTransforming])

  const handleTransformLog = useCallback(() => {
    if (isTransforming) return
    setIsTransforming(true)
    const dataSnap: Record<string, any[]> = {}
    for (const k of Object.keys(store.data)) dataSnap[k] = [...store.data[k]]
    const selectedVars = [...store.selectedVariables]

    setTimeout(() => {
      try {
        const data: Record<string, any[]> = { ...dataSnap }
        const createdVars: string[] = []

        for (const varName of selectedVars) {
          const col = data[varName] || []
          const newName = `log_${varName}`
          data[newName] = col.map(v => {
            const n = typeof v === 'string' ? parseFloat(v) : v
            return typeof n === 'number' && !isNaN(n) && n > 0 ? parseFloat(Math.log(n).toFixed(4)) : ''
          })
          store.addVariable({
            id: Date.now().toString(36) + varName,
            name: newName,
            type: 'numeric',
            label: `Log(${varName})`,
            width: 10, decimals: 4, missing: '', values: {},
          })
          createdVars.push(varName)
        }

        store.setData(data)
        store.addOutput({
          id: Date.now().toString(36),
          title: 'Log Transformation',
          type: 'table',
          content: {
            headers: ['Original', 'Transformed', 'Formula'],
            rows: createdVars.map(v => [v, `log_${v}`, 'ln(x)']),
          },
          timestamp: new Date().toISOString(),
        })
        store.addSyntax(`COMPUTE log_*= LN(var)`)
      } finally {
        setIsTransforming(false)
      }
    }, 0)
  }, [store, isTransforming])

  /* ─── Auto Data Profile ─── */
  const handleAutoProfile = useCallback(() => {
    if (store.variables.length === 0) return
    const rows: string[][] = []
    for (const v of store.variables) {
      const col = store.data[v.name] || []
      const nonEmpty = col.filter(x => x !== '' && x !== null && x !== undefined)
      const missing = col.length - nonEmpty.length
      const stats = v.type === 'numeric' ? calcStats(getNumericVals(v.name)) : null

      rows.push([
        v.name,
        v.type,
        String(col.length),
        String(nonEmpty.length),
        String(missing),
        stats ? `${stats.min}–${stats.max}` : `${new Set(nonEmpty.map(String)).size} unique`,
        stats ? `${stats.mean.toFixed(2)} ± ${stats.stddev.toFixed(2)}` : '—',
      ])
    }
    store.addOutput({
      id: Date.now().toString(36),
      title: 'Data Profile Summary',
      type: 'table',
      content: {
        headers: ['Variable', 'Type', 'N', 'Valid', 'Missing', 'Range/Unique', 'Mean±SD'],
        rows,
      },
      timestamp: new Date().toISOString(),
    })
  }, [store, getNumericVals])

  // Auto-profile when new data is imported (debounced, single-fire, stable deps)
  const prevVarCountRef = useRef(store.variables.length)
  const profileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Use a ref for the profile function to avoid it being a dependency that triggers re-runs
  const handleAutoProfileRef = useRef(handleAutoProfile)
  handleAutoProfileRef.current = handleAutoProfile
  useEffect(() => {
    const prevCount = prevVarCountRef.current
    const currentCount = store.variables.length
    // Only auto-profile when variables INCREASE (new import), not on every data change
    if (currentCount > 0 && currentCount > prevCount) {
      prevVarCountRef.current = currentCount
      // Clear any pending profile timer to prevent cascading
      if (profileTimerRef.current) clearTimeout(profileTimerRef.current)
      profileTimerRef.current = setTimeout(() => handleAutoProfileRef.current(), 300)
    } else {
      prevVarCountRef.current = currentCount
    }
    return () => {
      if (profileTimerRef.current) clearTimeout(profileTimerRef.current)
    }
  }, [store.variables.length])

  const handleExportPDF = useCallback(() => {
    generateQuickReport(store.outputs, store.currentProject?.name)
  }, [store.outputs, store.currentProject?.name])

  /* ─── AI Agent Auto-Analysis (with timeout) ─── */
  const agentAbortRef = useRef<AbortController | null>(null)

  const handleCancelAgent = useCallback(() => {
    if (agentAbortRef.current) {
      agentAbortRef.current.abort()
      agentAbortRef.current = null
    }
    store.setAgentStatus('idle')
    store.addOutput({
      id: Date.now().toString(36),
      title: 'AI Agent Cancelled',
      type: 'text',
      content: 'The AI analysis was cancelled by the user. Any results already computed are still available above.',
      timestamp: new Date().toISOString(),
    })
  }, [store])

  const handleRunAgentAnalysis = useCallback(async (goal?: string) => {
    if (store.variables.length === 0) return

    // Cancel any previous in-flight request
    if (agentAbortRef.current) agentAbortRef.current.abort()
    const controller = new AbortController()
    agentAbortRef.current = controller

    const AGENT_TIMEOUT_MS = 60_000 // 60 seconds hard limit
    const timeoutId = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS)

    store.setAgentStatus('planning')

    store.addOutput({
      id: Date.now().toString(36),
      title: 'AI Agent: Starting Analysis...',
      type: 'text',
      content: 'The AI Agent is analyzing your dataset. This may take a moment.',
      timestamp: new Date().toISOString(),
    })

    try {
      const res = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          data: store.data,
          variables: store.variables,
          goal: goal || undefined,
        }),
      })

      if (!res.ok) throw new Error(`Agent request failed (${res.status})`)

      const data = await res.json()
      clearTimeout(timeoutId)

      for (const result of (data.results || [])) {
        store.addOutput({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          title: result.title,
          type: result.type || 'text',
          content: result.content,
          timestamp: new Date().toISOString(),
        })
      }

      store.setAgentStatus('done')
      store.addAgentResults(data.results || [])
      store.addSyntax(`AI AGENT ANALYSIS${goal ? `: ${goal}` : ''}`)
    } catch (error) {
      clearTimeout(timeoutId)
      store.setAgentStatus('error')
      const isTimeout = error instanceof DOMException && error.name === 'AbortError'
      const msg = isTimeout
        ? `Analysis timed out after ${AGENT_TIMEOUT_MS / 1000}s. The dataset may be too large or the AI service is slow. Try with fewer variables or try again.`
        : `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
      store.addOutput({
        id: Date.now().toString(36),
        title: 'AI Agent Error',
        type: 'text',
        content: msg,
        timestamp: new Date().toISOString(),
      })
    } finally {
      agentAbortRef.current = null
    }
  }, [store])

  /* ─── AI Chat (with timeout) ─── */
  const chatAbortRef = useRef<AbortController | null>(null)

  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim()) return

    // Cancel any previous in-flight chat request
    if (chatAbortRef.current) chatAbortRef.current.abort()
    const controller = new AbortController()
    chatAbortRef.current = controller

    const CHAT_TIMEOUT_MS = 30_000 // 30 seconds hard limit
    const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS)

    const userMsg = { id: Date.now().toString(36), role: 'user' as const, content: chatInput.trim(), timestamp: new Date().toISOString() }
    store.addChatMessage(userMsg)
    setChatInput('')
    store.setAiTyping(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [...store.chatMessages, userMsg].map(m => ({ role: m.role, content: m.content })),
          data: store.data,
          variables: store.variables,
        }),
      })
      const data = await res.json()
      clearTimeout(timeoutId)
      const aiContent = data.choices?.[0]?.message?.content || data.error || 'Sorry, I could not process your request.'
      store.addChatMessage({ id: (Date.now() + 1).toString(36), role: 'ai', content: aiContent, timestamp: new Date().toISOString() })
    } catch (error) {
      clearTimeout(timeoutId)
      const isTimeout = error instanceof DOMException && error.name === 'AbortError'
      store.addChatMessage({
        id: (Date.now() + 1).toString(36),
        role: 'ai',
        content: isTimeout ? 'Response timed out. The AI service may be busy. Please try again.' : 'Network error. Please try again.',
        timestamp: new Date().toISOString(),
      })
    } finally {
      store.setAiTyping(false)
      chatAbortRef.current = null
    }
  }, [chatInput, store])

  const rowCount = store.variables.length > 0 ? Math.max(0, ...Object.values(store.data).map(a => a.length)) : 0

  return {
    // Store
    store,
    t,
    rowCount,

    // Dialog states
    shareDialogOpen, setShareDialogOpen,
    shareEmail, setShareEmail,
    shareLink, setShareLink,
    importDialogOpen, setImportDialogOpen,
    importText, setImportText,
    newVarDialogOpen, setNewVarDialogOpen,
    newVarName, setNewVarName,
    newVarType, setNewVarType,
    scanDialogOpen, setScanDialogOpen,
    cleanDialogOpen, setCleanDialogOpen,
    validateDialogOpen, setValidateDialogOpen,
    scanFile, setScanFile,
    scanPreview, setScanPreview,
    editedFields, setEditedFields,
    nonparamDialogOpen, setNonparamDialogOpen,
    nonparamType, setNonparamType,
    nonparamVar1, setNonparamVar1,
    nonparamVar2, setNonparamVar2,
    crosstabsDialogOpen, setCrosstabsDialogOpen,
    crosstabRowVar, setCrosstabRowVar,
    crosstabColVar, setCrosstabColVar,
    ttestDialogOpen, setTtestDialogOpen,
    ttestGroupVar, setTtestGroupVar,
    ttestValueVar, setTtestValueVar,
    anovaDialogOpen, setAnovaDialogOpen,
    anovaGroupVar, setAnovaGroupVar,
    anovaValueVar, setAnovaValueVar,

    // Form states
    chatInput, setChatInput,

    // Refs
    chatEndRef,
    fileInputRef,
    batchInputRef,

    // Validation & Cleaning
    validationResults, setValidationResults,
    isValidating, isCleaning, isTransforming,
    handleValidate,
    handleClean,

    // Transformations
    handleTransformZScore,
    handleTransformNormalize,
    handleTransformLog,

    // Auto Profile
    handleAutoProfile,

    // Handlers
    handleImportCSV,
    handleFileUpload,
    handleExportCSV,
    handleExportJSON,
    handleAddVariable,
    getNumericVals,
    handleRunDescriptive,
    handleRunCorrelation,
    handleRunRegression,
    handleRunFrequencies,
    handleRunCrosstabs,
    handleRunTTest,
    handleRunANOVA,
    handleRunChiSquare,
    handleRunNonparametric,
    handleExportPDF,
    handleSendChat,
    handleRunAgentAnalysis,
    handleCancelAgent,
  }
}
