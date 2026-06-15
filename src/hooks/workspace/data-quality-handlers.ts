'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { calcStats } from '@/lib/stats'

interface DataQualityHandlersDeps {
  store: any
  getNumericVals: (varName: string) => number[]
  isValidating: boolean
  isCleaning: boolean
  isTransforming: boolean
  setIsValidating: (v: boolean) => void
  setIsCleaning: (v: boolean) => void
  setIsTransforming: (v: boolean) => void
  setCleanDialogOpen: (v: boolean) => void
}

export function useDataQualityHandlers(deps: DataQualityHandlersDeps) {
  const {
    store, getNumericVals,
    isValidating, isCleaning, isTransforming,
    setIsValidating, setIsCleaning, setIsTransforming, setCleanDialogOpen,
  } = deps

  const [validationResults, setValidationResults] = useState<{
    issues: { row?: number; column: string; severity: 'error' | 'warning' | 'info'; message: string }[]
    stats: { totalRows: number; missingCells: number; outliers: number; duplicates: number; emptyCols: string[] }
  } | null>(null)

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
    const rowCount = Math.max(0, ...Object.values(data).map((a: unknown) => (a as any[]).length))
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
    const rowCount = Math.max(0, ...Object.values(data).map((a: unknown) => (a as any[]).length))
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

  return {
    validationResults, setValidationResults,
    handleValidate,
    handleClean,
    handleTransformZScore,
    handleTransformNormalize,
    handleTransformLog,
    handleAutoProfile,
  }
}