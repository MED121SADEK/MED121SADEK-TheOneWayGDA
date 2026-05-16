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

  // Form states
  const [chatInput, setChatInput] = useState('')

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
  }, [store, t, getNumericVals])

  const handleRunCorrelation = useCallback(() => {
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
      content: { headers: [''], rows: matrix },
      timestamp: new Date().toISOString(),
    })
    store.addSyntax(`CORRELATIONS /VARIABLES=${vars.join(' ')}`)
  }, [store, t, getNumericVals])

  const handleRunRegression = useCallback(() => {
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
  }, [store, t, getNumericVals])

  const handleRunFrequencies = useCallback(() => {
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
  }, [crosstabRowVar, crosstabColVar, store])

  const handleRunTTest = useCallback(() => {
    if (!ttestGroupVar || !ttestValueVar) return
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
    if (groups.length < 2) return
    const [g1Name, g1Vals] = groups[0]
    const [g2Name, g2Vals] = groups[1]
    const result = calcTTest(g1Vals, g2Vals, g1Name, g2Name)
    if (!result) return
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
  }, [store])

  const handleRunNonparametric = useCallback(() => {
    if (!nonparamVar1 || !nonparamVar2) return
    if (nonparamType === 'mann-whitney') {
      const v1 = getNumericVals(nonparamVar1)
      const v2 = getNumericVals(nonparamVar2)
      const result = calcMannWhitney(v1, v2)
      if (!result) return
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
      if (!result) return
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

  const handleExportPDF = useCallback(() => {
    generateQuickReport(store.outputs, store.currentProject?.name)
  }, [store.outputs, store.currentProject?.name])

  const handleSendChat = useCallback(async () => {
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
  }
}
