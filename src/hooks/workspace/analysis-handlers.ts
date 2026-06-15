'use client'

import { useCallback } from 'react'
import {
  calcStats, calcCorrelation, calcRegression, sum,
  calcFrequencies, calcCrosstabs, calcTTest, calcANOVA,
  calcChiSquare, calcMannWhitney, calcWilcoxon,
  formatPValue, fmt,
} from '@/lib/stats'
import {
  makeScatterData, makeFrequencyBarData, makePieData,
} from '@/components/workspace/Charts'

interface AnalysisHandlersDeps {
  store: any
  t: (key: string) => string
  getNumericVals: (varName: string) => number[]
  crosstabRowVar: string
  crosstabColVar: string
  ttestGroupVar: string
  ttestValueVar: string
  anovaGroupVar: string
  anovaValueVar: string
  nonparamType: 'mann-whitney' | 'wilcoxon'
  nonparamVar1: string
  nonparamVar2: string
  setCrosstabsDialogOpen: (v: boolean) => void
  setTtestDialogOpen: (v: boolean) => void
  setAnovaDialogOpen: (v: boolean) => void
  setNonparamDialogOpen: (v: boolean) => void
}

export function useAnalysisHandlers(deps: AnalysisHandlersDeps) {
  const {
    store, t, getNumericVals,
    crosstabRowVar, crosstabColVar,
    ttestGroupVar, ttestValueVar,
    anovaGroupVar, anovaValueVar,
    nonparamType, nonparamVar1, nonparamVar2,
    setCrosstabsDialogOpen, setTtestDialogOpen, setAnovaDialogOpen, setNonparamDialogOpen,
  } = deps

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
  }, [crosstabRowVar, crosstabColVar, store, setCrosstabsDialogOpen])

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
  }, [ttestGroupVar, ttestValueVar, store, setTtestDialogOpen])

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
  }, [anovaGroupVar, anovaValueVar, store, setAnovaDialogOpen])

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
  }, [nonparamVar1, nonparamVar2, nonparamType, store, getNumericVals, setNonparamDialogOpen])

  return {
    handleRunDescriptive,
    handleRunCorrelation,
    handleRunRegression,
    handleRunFrequencies,
    handleRunCrosstabs,
    handleRunTTest,
    handleRunANOVA,
    handleRunChiSquare,
    handleRunNonparametric,
  }
}