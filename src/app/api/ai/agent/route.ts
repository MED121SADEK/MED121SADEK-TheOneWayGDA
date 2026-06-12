import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { getTokenFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

import {
  calcFrequencies, calcCrosstabs, calcTTest, calcANOVA,
  calcChiSquare, formatPValue, fmt,
} from '@/lib/stats'

const AGENT_SERVER_TIMEOUT_MS = 50_000 // 50s (less than client 60s)
const AI_STEP_TIMEOUT_MS = 30_000      // Separate timeout for the AI interpretation step
const MAX_REQUEST_BYTES = 10 * 1024 * 1024 // 10MB limit

// ─── Statistical Helpers (server-side) ───

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
  const p25 = sorted[Math.floor(n * 0.25)]
  const p75 = sorted[Math.floor(n * 0.75)]
  const skewness = n > 2 ? (nums.reduce((a, b) => a + ((b - mean) / stddev) ** 3, 0) * n) / ((n - 1) * (n - 2)) : 0
  return { n, mean, median, stddev, min, max, p25, p75, skewness, variance, se: stddev / Math.sqrt(n) }
}

function pearsonCorrelation(x: number[], y: number[]) {
  const pairs: [number, number][] = []
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (typeof x[i] === 'number' && !isNaN(x[i]) && typeof y[i] === 'number' && !isNaN(y[i])) {
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
  const den = Math.sqrt(dx * dy)
  return den === 0 ? 0 : num / den
}

function linearRegression(x: number[], y: number[]) {
  const pairs: [number, number][] = []
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (typeof x[i] === 'number' && !isNaN(x[i]) && typeof y[i] === 'number' && !isNaN(y[i])) {
      pairs.push([x[i], y[i]])
    }
  }
  if (pairs.length < 3) return null
  const n = pairs.length
  const mx = pairs.reduce((a, p) => a + p[0], 0) / n
  const my = pairs.reduce((a, p) => a + p[1], 0) / n
  let ssXY = 0, ssXX = 0
  for (const [px, py] of pairs) {
    ssXY += (px - mx) * (py - my)
    ssXX += (px - mx) ** 2
  }
  if (ssXX === 0) return null
  const slope = ssXY / ssXX
  const intercept = my - slope * mx
  const ssTot = pairs.reduce((a, [, py]) => a + (py - my) ** 2, 0)
  const ssRes = pairs.reduce((a, [px, py]) => a + (py - (slope * px + intercept)) ** 2, 0)
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  return { slope, intercept, r2, n }
}

function getNumericVals(data: Record<string, any[]>, varName: string): number[] {
  return (data[varName] || []).map(v => typeof v === 'string' ? parseFloat(v) : v).filter((v): v is number => typeof v === 'number' && !isNaN(v))
}

// ─── MAIN AGENT ───
export async function POST(request: NextRequest) {
  // Server-side hard timeout for the entire request
  const controller = new AbortController()
  const serverTimeout = setTimeout(() => controller.abort(), AGENT_SERVER_TIMEOUT_MS)

  try {
    // Guard against oversized requests
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_BYTES) {
      clearTimeout(serverTimeout)
      return NextResponse.json({ error: 'Dataset too large for analysis. Please use a smaller dataset (under 10MB).' }, { status: 413 })
    }

    const token = getTokenFromRequest(request)
    const session = token ? await db.userSession.findUnique({ where: { token } }) : null
    if (!session) {
      clearTimeout(serverTimeout)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, variables, goal } = await request.json()

    if (!data || !variables || variables.length === 0) {
      clearTimeout(serverTimeout)
      return NextResponse.json({ error: 'No data provided' }, { status: 400 })
    }

    const zai = await ZAI.create()
    const results: any[] = []

    // Identify variable types
    const numericVars = variables.filter((v: any) => v.type === 'numeric')
    const stringVars = variables.filter((v: any) => v.type === 'string')
    const numericNames = numericVars.map((v: any) => v.name)

    // ─── STEP 1: Data Profiling ───
    const profileRows: string[][] = []
    let totalMissing = 0
    let totalOutliers = 0

    for (const v of variables) {
      const col = data[v.name] || []
      const nonEmpty = col.filter((x: any) => x !== '' && x !== null && x !== undefined)
      const missing = col.length - nonEmpty.length
      totalMissing += missing

      if (v.type === 'numeric') {
        const vals = getNumericVals(data, v.name)
        const stats = calcStats(vals)
        if (stats) {
          // Outlier detection
          const iqr = stats.p75 - stats.p25
          const lower = stats.p25 - 1.5 * iqr
          const upper = stats.p75 + 1.5 * iqr
          const outliers = vals.filter(v => v < lower || v > upper).length
          totalOutliers += outliers

          profileRows.push([
            v.name, 'Numeric', String(col.length), String(missing),
            `${stats.min.toFixed(1)} – ${stats.max.toFixed(1)}`,
            `${stats.mean.toFixed(2)} ± ${stats.stddev.toFixed(2)}`,
            stats.skewness.toFixed(2), String(outliers),
          ])
        }
      } else {
        const unique = new Set(nonEmpty.map(String)).size
        profileRows.push([
          v.name, v.type, String(col.length), String(missing),
          `${unique} unique`, '—', '—', '—',
        ])
      }
    }

    results.push({
      stepId: 'profile',
      title: '📊 Data Profile',
      type: 'table',
      content: {
        headers: ['Variable', 'Type', 'N', 'Missing', 'Range', 'Mean±SD', 'Skew', 'Outliers'],
        rows: profileRows,
      },
    })

    // ─── STEP 2: Descriptive Statistics ───
    if (numericNames.length > 0) {
      const descRows: string[][] = []
      for (const name of numericNames) {
        const vals = getNumericVals(data, name)
        const stats = calcStats(vals)
        if (stats) {
          const ci95 = `${(stats.mean - 1.96 * stats.se).toFixed(3)}–${(stats.mean + 1.96 * stats.se).toFixed(3)}`
          const cv = stats.mean !== 0 ? ((stats.stddev / Math.abs(stats.mean)) * 100).toFixed(1) + '%' : '0%'
          descRows.push([
            name, String(stats.n), stats.mean.toFixed(3), stats.median.toFixed(3),
            stats.stddev.toFixed(3), stats.se.toFixed(4), ci95,
            stats.min.toFixed(2), stats.max.toFixed(2),
            (stats.p75 - stats.p25).toFixed(3), stats.skewness.toFixed(3), cv,
          ])
        }
      }

      results.push({
        stepId: 'descriptive',
        title: '📋 Descriptive Statistics',
        type: 'table',
        content: {
          headers: ['Variable', 'N', 'Mean', 'Median', 'SD', 'SE', '95% CI', 'Min', 'Max', 'IQR', 'Skew', 'CV'],
          rows: descRows,
        },
      })
    }

    // ─── STEP 3: Correlation Matrix ───
    if (numericNames.length >= 2) {
      const vars = numericNames.slice(0, 8)
      const matrix: string[][] = [[''].concat(vars)] as any
      const correlationPairs: { v1: string; v2: string; r: number }[] = []

      for (const v1 of vars) {
        const row: string[] = [v1]
        for (const v2 of vars) {
          if (v1 === v2) { row.push('1.000'); continue }
          const x = getNumericVals(data, v1)
          const y = getNumericVals(data, v2)
          const r = pearsonCorrelation(x, y)
          const rStr = r !== null ? r.toFixed(3) : 'N/A'
          row.push(rStr)
          if (r !== null && r !== 0 && !correlationPairs.find(p => p.v1 === v2 && p.v2 === v1)) {
            correlationPairs.push({ v1, v2, r })
          }
        }
        matrix.push(row)
      }

      results.push({
        stepId: 'correlation',
        title: '🔗 Correlation Matrix',
        type: 'table',
        content: { headers: [''], rows: matrix },
      })

      // Strong correlations
      const strong = correlationPairs.filter(p => Math.abs(p.r) > 0.5).sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
      if (strong.length > 0) {
        results.push({
          stepId: 'strong-correlations',
          title: '⚡ Strong Correlations (|r| > 0.5)',
          type: 'table',
          content: {
            headers: ['Variable 1', 'Variable 2', 'r', 'Strength'],
            rows: strong.map(p => [
              p.v1, p.v2, p.r.toFixed(4),
              Math.abs(p.r) > 0.8 ? 'Very Strong' : Math.abs(p.r) > 0.6 ? 'Strong' : 'Moderate',
            ]),
          },
        })
      }
    }

    // ─── STEP 4: Regression Analysis (find best predictors) ───
    if (numericNames.length >= 2) {
      const targetVar = numericNames[0] // Use first numeric as default target
      const predictorVars = numericNames.slice(1)
      const regressionRows: string[][] = []
      let bestModel: { predictor: string; slope: number; intercept: number; r2: number; r: number } | null = null
      let bestR2 = -1

      for (const pred of predictorVars) {
        const y = getNumericVals(data, targetVar)
        const x = getNumericVals(data, pred)
        const reg = linearRegression(x, y)
        const r = pearsonCorrelation(x, y)
        if (reg && r !== null) {
          regressionRows.push([
            pred, reg.slope.toFixed(4), reg.intercept.toFixed(4),
            r.toFixed(4), reg.r2.toFixed(4), String(reg.n),
          ])
          if (reg.r2 > bestR2) {
            bestR2 = reg.r2
            bestModel = { predictor: pred, ...reg, r }
          }
        }
      }

      if (regressionRows.length > 0) {
        results.push({
          stepId: 'regression',
          title: `📈 Regression Models (${targetVar} as outcome)`,
          type: 'table',
          content: {
            headers: ['Predictor', 'Slope (β)', 'Intercept', 'r', 'R²', 'N'],
            rows: regressionRows.sort((a, b) => parseFloat(b[4]) - parseFloat(a[4])),
          },
        })

        if (bestModel) {
          results.push({
            stepId: 'best-model',
            title: `🏆 Best Predictor: ${bestModel.predictor}`,
            type: 'text',
            content: `The strongest predictor of ${targetVar} is ${bestModel.predictor} (R² = ${bestModel.r2.toFixed(4)}, r = ${bestModel.r.toFixed(4)}). Model: ${targetVar} = ${bestModel.intercept.toFixed(2)} + ${bestModel.slope.toFixed(4)} × ${bestModel.predictor}. This model explains ${(bestModel.r2 * 100).toFixed(1)}% of the variance.`,
          })
        }
      }
    }

    // ─── STEP 5: Group Comparisons (if categorical vars exist) ───
    if (stringVars.length > 0 && numericNames.length > 0) {
      const groupVar = stringVars[0].name
      const testVar = numericNames[0].name

      const groupVals = data[groupVar] || []
      const testVals = data[testVar] || []
      const n = Math.min(groupVals.length, testVals.length)
      const groupMap = new Map<string, number[]>()

      for (let i = 0; i < n; i++) {
        const g = groupVals[i]
        const v = typeof testVals[i] === 'string' ? parseFloat(testVals[i]) : testVals[i]
        if (g && g !== '' && typeof v === 'number' && !isNaN(v)) {
          const key = String(g)
          if (!groupMap.has(key)) groupMap.set(key, [])
          groupMap.get(key)!.push(v)
        }
      }

      if (groupMap.size >= 2) {
        // Run ANOVA
        const groupsObj: Record<string, number[]> = {}
        groupMap.forEach((vals, key) => { groupsObj[key] = vals })
        const anovaResult = calcANOVA(groupsObj)

        if (anovaResult) {
          results.push({
            stepId: 'anova',
            title: `📊 Group Comparison: ${testVar} by ${groupVar}`,
            type: 'table',
            content: {
              headers: ['Source', 'SS', 'df', 'MS', 'F', 'p-value'],
              rows: [
                ['Between Groups', fmt(anovaResult.betweenGroups.ss), String(anovaResult.betweenGroups.df), fmt(anovaResult.betweenGroups.ms), fmt(anovaResult.betweenGroups.f), formatPValue(anovaResult.betweenGroups.pValue)],
                ['Within Groups', fmt(anovaResult.withinGroups.ss), String(anovaResult.withinGroups.df), fmt(anovaResult.withinGroups.ms), '', ''],
                ['Total', fmt(anovaResult.total.ss), String(anovaResult.total.df), '', '', ''],
              ],
            },
          })

          results.push({
            stepId: 'group-stats',
            title: 'Group Statistics',
            type: 'table',
            content: {
              headers: ['Group', 'N', 'Mean', 'Std Dev'],
              rows: anovaResult.groupStats.map(g => [g.name, String(g.n), fmt(g.mean), fmt(g.std)]),
            },
          })

          // Effect size
          results.push({
            stepId: 'effect-size',
            title: 'Effect Sizes',
            type: 'table',
            content: {
              headers: ['Measure', 'Value'],
              rows: [
                ['η² (Eta-squared)', fmt(anovaResult.etaSquared)],
                ['ω² (Omega-squared)', fmt(anovaResult.omegaSquared)],
              ],
            },
          })
        }
      }
    }

    // ─── STEP 6: Frequency Analysis for categorical variables ───
    for (const sv of stringVars.slice(0, 3)) {
      const vals = data[sv.name] || []
      const freq = calcFrequencies(vals, sv.name)
      if (freq && freq.table.length > 0) {
        const topEntries = freq.table.slice(0, 10)
        results.push({
          stepId: `freq-${sv.name}`,
          title: `📋 Frequency: ${sv.name}`,
          type: 'table',
          content: {
            headers: ['Value', 'Frequency', 'Percent', 'Cum. %'],
            rows: topEntries.map(r => [r.value, String(r.frequency), r.percent.toFixed(1), r.cumulativePercent.toFixed(1)]),
          },
        })
      }
    }

    // ─── STEP 7: Anomaly Detection ───
    if (numericNames.length > 0) {
      const anomalyRows: string[][] = []
      for (const name of numericNames) {
        const vals = getNumericVals(data, name)
        if (vals.length < 4) continue
        const sorted = [...vals].sort((a, b) => a - b)
        const q25 = sorted[Math.floor(sorted.length * 0.25)]
        const q75 = sorted[Math.floor(sorted.length * 0.75)]
        const iqr = q75 - q25
        const lower = q25 - 1.5 * iqr
        const upper = q75 + 1.5 * iqr

        const iqrOutliers = vals.filter(v => v < lower || v > upper)
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length
        const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length - 1))
        const zOutliers = sd > 0 ? vals.filter(v => Math.abs((v - mean) / sd) > 3) : []

        if (iqrOutliers.length > 0 || zOutliers.length > 0) {
          anomalyRows.push([
            name, String(iqrOutliers.length), String(zOutliers.length),
            lower.toFixed(2), upper.toFixed(2),
            `${mean.toFixed(2)} ± ${(3 * sd).toFixed(2)}`,
          ])
        }
      }

      if (anomalyRows.length > 0) {
        results.push({
          stepId: 'anomaly',
          title: '🔍 Anomaly Detection',
          type: 'table',
          content: {
            headers: ['Variable', 'IQR Outliers', 'Z-Score Outliers', 'IQR Lower', 'IQR Upper', 'Z-Score Range (±3σ)'],
            rows: anomalyRows,
          },
        })
      }
    }

    // ─── STEP 8: AI Interpretation (with its own timeout) ───
    // Send computed results to LLM for interpretation
    const dataSummary = {
      variables: variables.map((v: any) => ({ name: v.name, type: v.type })),
      rowCount: (() => {
        const dataVal = data as Record<string, any[]>
        return Math.max(0, ...Object.values(dataVal).map(a => (a || []).length))
      })(),
      numericVars: numericNames,
      categoricalVars: stringVars.map((v: any) => v.name),
      totalMissing,
      totalOutliers,
      results: results.map(r => ({
        stepId: r.stepId,
        title: r.title,
        type: r.type,
        content: r.type === 'table' ? { headers: r.content.headers, rowCount: r.content.rows?.length || 0, sampleRows: r.content.rows?.slice(0, 5) || [] } : r.content,
      })),
    }

    const interpretationPrompt = goal
      ? `Analyze this dataset with the specific goal: "${goal}". Provide actionable insights and specific recommendations based on the analysis results.`
      : `You are an expert data scientist. Analyze the following automated analysis results and provide:
1. **Key Findings** (3-5 most important discoveries)
2. **Data Quality Assessment** (any concerns about missing data, outliers, or distributions?)
3. **Statistical Insights** (patterns, relationships, significant differences)
4. **Recommendations** (what should the user investigate or do next?)
5. **Executive Summary** (2-3 sentences for a non-technical audience)

Be specific with numbers. Reference actual variable names and values.`

    // Race the AI interpretation against both the step timeout and the overall server timeout
    let aiInterpretation = 'Analysis complete. Review the statistical results above.'
    try {
      const interpretationPromise = zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are an expert AI data scientist for TheOneWayGDA. You interpret statistical analysis results and provide clear, actionable insights. Always reference specific numbers and variable names. Be thorough but concise. Use markdown formatting with headers, bullet points, and bold for key numbers.`,
          },
          {
            role: 'user',
            content: `${interpretationPrompt}\n\nDataset summary:\n${JSON.stringify(dataSummary, null, 2)}`,
          },
        ],
        max_tokens: 2048,
        temperature: 0.5,
      })

      // Race against both timeouts
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new DOMException('AI interpretation step timed out', 'AbortError')), AI_STEP_TIMEOUT_MS)
      )
      const overallTimeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new DOMException('Overall agent timeout', 'AbortError')), AGENT_SERVER_TIMEOUT_MS)
      )

      const interpretation = await Promise.race([interpretationPromise, timeoutPromise, overallTimeoutPromise])
      aiInterpretation = interpretation.choices?.[0]?.message?.content || aiInterpretation
    } catch (aiError: unknown) {
      // If AI interpretation times out, still return the statistical results
      console.warn('AI interpretation step failed/timed out, returning statistical results only:', aiError instanceof Error ? aiError.message : aiError)
      aiInterpretation = '*AI interpretation timed out. The statistical analysis results above are still valid and complete.*'
    }

    results.push({
      stepId: 'ai-interpretation',
      title: '🤖 AI Analysis Report',
      type: 'text',
      content: aiInterpretation,
    })

    clearTimeout(serverTimeout)
    return NextResponse.json({
      results,
      summary: `Analyzed ${variables.length} variables across ${Object.values(data as Record<string, any[]>).map(a => (a || []).length).reduce((x, y) => Math.max(x, y), 0)} rows. Ran ${results.length} analysis steps including data profiling, descriptive stats, correlation, regression, group comparisons, and anomaly detection.`,
      insightsCount: results.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    clearTimeout(serverTimeout)
    const isAbort = error instanceof DOMException && error.name === 'AbortError'
    const message = isAbort ? 'Analysis timed out on the server. Try with a smaller dataset.' : (error instanceof Error ? error.message : 'Agent analysis failed')
    console.error('AI Agent error:', message)
    return NextResponse.json({ error: message }, { status: isAbort ? 504 : 500 })
  }
}