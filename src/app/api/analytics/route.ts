import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'

// POST /api/analytics — Run analysis
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    const session = token ? await db.userSession.findUnique({ where: { token } }) : null

    const body = await request.json()
    const { name, type, variables, dataRows } = body

    if (!name || !type || !variables) {
      return NextResponse.json({ error: 'Name, type, and variables are required' }, { status: 400 })
    }

    const startTime = Date.now()

    // Run the statistical computation
    const result = computeAnalysis(type, variables, dataRows || [])
    const chartData = generateChartData(type, variables, result)

    const analysis = await db.analysisRun.create({
      data: {
        userId: session?.userId || null,
        name,
        type,
        inputData: JSON.stringify({ variables, rowCount: (dataRows || []).length }),
        config: JSON.stringify({ variableNames: variables }),
        result: JSON.stringify(result),
        chartData: JSON.stringify(chartData),
        summary: generateSummary(type, result, variables),
        status: 'completed',
        durationMs: Date.now() - startTime,
        aiModel: 'builtin',
      },
    })

    return NextResponse.json({ analysis })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/analytics — List analyses
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    const session = token ? await db.userSession.findUnique({ where: { token } }) : null

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const type = searchParams.get('type')

    const where = session?.userId ? { userId: session.userId, ...(type ? { type } : {}) } : (type ? { type } : {})

    const analyses = await db.analysisRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ analyses })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch analyses'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ═══ Statistical Computation Engine ═══

function computeAnalysis(type: string, variables: string[], dataRows: Record<string, string | number>[]) {
  if (dataRows.length === 0) return { error: 'No data provided' }

  switch (type) {
    case 'descriptive': return computeDescriptive(variables, dataRows)
    case 'correlation': return computeCorrelation(variables, dataRows)
    case 'regression': return computeRegression(variables, dataRows)
    case 'inferential': return computeInferential(variables, dataRows)
    default: return computeDescriptive(variables, dataRows)
  }
}

function getNumericValues(rows: Record<string, string | number>[], varName: string): number[] {
  return rows
    .map((r) => {
      const v = r[varName]
      const n = Number(v)
      return isNaN(n) ? null : n
    })
    .filter((v): v is number => v !== null)
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0
  const m = mean(arr)
  const variance = arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1)
  return Math.sqrt(variance)
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function skewness(arr: number[]): number {
  if (arr.length < 3) return 0
  const n = arr.length
  const m = mean(arr)
  const s = stdDev(arr)
  if (s === 0) return 0
  return (n / ((n - 1) * (n - 2))) * arr.reduce((sum, x) => sum + ((x - m) / s) ** 3, 0)
}

function kurtosis(arr: number[]): number {
  if (arr.length < 4) return 0
  const n = arr.length
  const m = mean(arr)
  const s = stdDev(arr)
  if (s === 0) return 0
  const k = arr.reduce((sum, x) => sum + ((x - m) / s) ** 4, 0)
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * k - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3))
}

function computeDescriptive(variables: string[], rows: Record<string, string | number>[]) {
  const results: Record<string, Record<string, number>> = {}
  for (const v of variables) {
    const values = getNumericValues(rows, v)
    if (values.length === 0) continue
    const sorted = [...values].sort((a, b) => a - b)
    const q1Idx = Math.floor(values.length * 0.25)
    const q3Idx = Math.floor(values.length * 0.75)
    results[v] = {
      count: values.length,
      mean: parseFloat(mean(values).toFixed(4)),
      stdDev: parseFloat(stdDev(values).toFixed(4)),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: parseFloat(median(values).toFixed(4)),
      q1: sorted[q1Idx],
      q3: sorted[q3Idx],
      skewness: parseFloat(skewness(values).toFixed(4)),
      kurtosis: parseFloat(kurtosis(values).toFixed(4)),
      sum: parseFloat(values.reduce((a, b) => a + b, 0).toFixed(4)),
      variance: parseFloat(String(stdDev(values) ** 2 === 0 ? 0 : (stdDev(values) ** 2).toFixed(4))),
    }
  }
  return { type: 'descriptive', variables, rowCount: rows.length, results }
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n < 3) return 0
  const mx = mean(x.slice(0, n))
  const my = mean(y.slice(0, n))
  let num = 0, denX = 0, denY = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx
    const dy = y[i] - my
    num += dx * dy
    denX += dx * dx
    denY += dy * dy
  }
  const den = Math.sqrt(denX * denY)
  return den === 0 ? 0 : num / den
}

function computeCorrelation(variables: string[], rows: Record<string, string | number>[]) {
  const pairs: Record<string, { r: number; n: number; p: number }> = {}
  for (let i = 0; i < variables.length; i++) {
    for (let j = i + 1; j < variables.length; j++) {
      const x = getNumericValues(rows, variables[i])
      const y = getNumericValues(rows, variables[j])
      const n = Math.min(x.length, y.length)
      const r = pearsonCorrelation(x, y)
      // Approximate p-value using t-distribution approximation
      const t = r * Math.sqrt((n - 2) / Math.max(0, 1 - r * r))
      const p = n > 2 ? Math.max(0, 1 - Math.abs(Math.min(1, t / (n - 1)))) : 1
      pairs[`${variables[i]} vs ${variables[j]}`] = {
        r: parseFloat(r.toFixed(4)),
        n,
        p: parseFloat(p.toFixed(6)),
      }
    }
  }
  return { type: 'correlation', variables, rowCount: rows.length, pairs }
}

function computeRegression(variables: string[], rows: Record<string, string | number>[]) {
  if (variables.length < 2) return { error: 'Regression requires at least 2 variables (dependent and independent)' }
  const depVar = variables[0]
  const indepVars = variables.slice(1)
  const results: Record<string, Record<string, number>> = {}

  for (const indep of indepVars) {
    const y = getNumericValues(rows, depVar)
    const x = getNumericValues(rows, indep)
    const n = Math.min(x.length, y.length)
    if (n < 3) continue

    const mx = mean(x.slice(0, n))
    const my = mean(y.slice(0, n))
    let ssXY = 0, ssXX = 0, ssYY = 0
    for (let i = 0; i < n; i++) {
      ssXY += (x[i] - mx) * (y[i] - my)
      ssXX += (x[i] - mx) ** 2
      ssYY += (y[i] - my) ** 2
    }

    const slope = ssXX === 0 ? 0 : ssXY / ssXX
    const intercept = my - slope * mx
    const r2 = ssYY === 0 ? 0 : (ssXY ** 2) / (ssXX * ssYY)
    const r = ssYY === 0 ? 0 : ssXY / Math.sqrt(ssXX * ssYY)

    // Standard error
    const residuals: number[] = []
    for (let i = 0; i < n; i++) {
      residuals.push(y[i] - (intercept + slope * x[i]))
    }
    const se = Math.sqrt(residuals.reduce((s, e) => s + e * e, 0) / Math.max(1, n - 2))

    results[`${depVar} ~ ${indep}`] = {
      slope: parseFloat(slope.toFixed(4)),
      intercept: parseFloat(intercept.toFixed(4)),
      r2: parseFloat(r2.toFixed(4)),
      r: parseFloat(r.toFixed(4)),
      se: parseFloat(se.toFixed(4)),
      n,
      fStat: n > 2 ? parseFloat(((r2 / (1 - r2)) * (n - 2)).toFixed(4)) : 0,
    }
  }

  return { type: 'regression', dependentVariable: depVar, independentVariables: indepVars, rowCount: rows.length, results }
}

function computeInferential(variables: string[], rows: Record<string, string | number>[]) {
  // Basic inferential: one-sample t-test approximation for each variable against mean=0
  const results: Record<string, Record<string, number>> = {}
  for (const v of variables) {
    const values = getNumericValues(rows, v)
    if (values.length < 3) continue
    const m = mean(values)
    const s = stdDev(values)
    const n = values.length
    const se = s / Math.sqrt(n)
    const tStat = se === 0 ? 0 : m / se
    const df = n - 1
    // Approximate p-value
    const p = Math.max(0, Math.min(1, 2 * (1 - normalCDF(Math.abs(tStat)))))
    results[v] = {
      tStat: parseFloat(tStat.toFixed(4)),
      df,
      pValue: parseFloat(p.toFixed(6)),
      mean: parseFloat(m.toFixed(4)),
      stdError: parseFloat(se.toFixed(4)),
      ci95_lower: parseFloat((m - 1.96 * se).toFixed(4)),
      ci95_upper: parseFloat((m + 1.96 * se).toFixed(4)),
      n,
    }
  }
  return { type: 'inferential', variables, rowCount: rows.length, results }
}

function normalCDF(x: number): number {
  // Approximation
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2)
  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  return 0.5 * (1.0 + sign * y)
}

function generateChartData(type: string, variables: string[], result: Record<string, unknown>): Record<string, unknown> {
  if (type === 'descriptive') {
    const results = (result as { results: Record<string, Record<string, number>> }).results
    return {
      type: 'bar',
      datasets: Object.entries(results).map(([name, stats]) => ({
        name,
        mean: stats.mean,
        stdDev: stats.stdDev,
        median: stats.median,
      })),
    }
  }
  if (type === 'correlation') {
    const pairs = (result as { pairs: Record<string, { r: number }> }).pairs
    return {
      type: 'heatmap',
      labels: variables,
      matrix: Object.entries(pairs).map(([key, val]) => ({ pair: key, r: val.r })),
    }
  }
  if (type === 'regression') {
    const results = (result as { results: Record<string, Record<string, number>> }).results
    return {
      type: 'scatter',
      datasets: Object.entries(results).map(([name, stats]) => ({
        name,
        r2: stats.r2,
        slope: stats.slope,
        intercept: stats.intercept,
      })),
    }
  }
  return { type: 'summary', message: 'Analysis completed' }
}

function generateSummary(type: string, result: Record<string, unknown>, variables: string[]): string {
  if (type === 'descriptive') {
    const results = (result as { results: Record<string, Record<string, number>> }).results
    const lines = Object.entries(results).map(([name, stats]) =>
      `${name}: mean=${stats.mean}, SD=${stats.stdDev}, range=[${stats.min}, ${stats.max}]`
    )
    return `Descriptive statistics computed for ${variables.join(', ')}. ${lines.join('. ')}.`
  }
  if (type === 'correlation') {
    const pairs = (result as { pairs: Record<string, { r: number; p: number }> }).pairs
    const strong = Object.entries(pairs).filter(([, v]) => Math.abs(v.r) > 0.7)
    return `Correlation analysis across ${variables.length} variables. ${strong.length} strong correlations found (|r| > 0.7).`
  }
  if (type === 'regression') {
    const results = (result as { results: Record<string, Record<string, number>> }).results
    const best = Object.entries(results).sort(([, a], [, b]) => b.r2 - a.r2)[0]
    return best ? `Best regression model: ${best[0]} with R-squared = ${best[1].r2}.` : 'Regression completed.'
  }
  return `${type} analysis completed for ${variables.length} variable(s).`
}
