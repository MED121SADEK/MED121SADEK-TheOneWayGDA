/* ─── Statistical Functions Library ─── */
/* Pure math implementations — no external dependencies */

// ─── Helper: Gamma function (Lanczos approximation) ───
function lnGamma(z: number): number {
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z)
  }
  z -= 1
  const g = 7
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  let x = c[0]
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i)
  const t2 = z + g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t2) - t2 + Math.log(x)
}

// ─── Regularized Incomplete Beta Function ───
function betaCF(a: number, b: number, x: number): number {
  const maxIter = 200
  const eps = 3e-7
  let qab = a + b
  let qap = a + 1
  let qam = a - 1
  let c = 1
  let d = 1 - qab * x / qap
  if (Math.abs(d) < 1e-30) d = 1e-30
  d = 1 / d
  let h = d
  for (let m = 1; m <= maxIter; m++) {
    let m2 = 2 * m
    // Even step
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < 1e-30) d = 1e-30
    c = 1 + aa / c
    if (Math.abs(c) < 1e-30) c = 1e-30
    d = 1 / d
    h *= d * c
    // Odd step
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < 1e-30) d = 1e-30
    c = 1 + aa / c
    if (Math.abs(c) < 1e-30) c = 1e-30
    d = 1 / d
    let del = d * c
    h *= del
    if (Math.abs(del - 1) < eps) break
  }
  return h
}

function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b)
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta)
  if (x < (a + 1) / (a + b + 2)) {
    return front * betaCF(a, b, x) / a
  } else {
    return 1 - front * betaCF(b, a, 1 - x) / b
  }
}

// ─── P-value from regularized incomplete beta (for F-distribution and chi-square) ───
function pValueFromChiSquare(chiSq: number, df: number): number {
  if (df <= 0) return 1
  const x = chiSq / 2
  const p = df / 2
  return 1 - regularizedIncompleteBeta(p, 0.5, x / (x + 1))
}

function pValueFromF(fStat: number, df1: number, df2: number): number {
  if (df1 <= 0 || df2 <= 0) return 1
  const x = (df1 * fStat) / (df2 + df1 * fStat)
  return 1 - regularizedIncompleteBeta(df1 / 2, df2 / 2, x)
}

// Normal CDF (for T-test, Mann-Whitney, Wilcoxon z-approximation)
function normalCDF(z: number): number {
  // Use error function approximation
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const sign = z < 0 ? -1 : 1
  const absZ = Math.abs(z)
  const t = 1.0 / (1.0 + p * absZ)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ / 2)
  return 0.5 * (1.0 + sign * y)
}

function twoTailedPFromZ(z: number): number {
  return 2 * (1 - normalCDF(Math.abs(z)))
}

// ─── Basic stats helpers ───
function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function variance(arr: number[], ddof = 1): number {
  const m = mean(arr)
  if (arr.length <= ddof) return 0
  return arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - ddof)
}

function stddev(arr: number[], ddof = 1): number {
  return Math.sqrt(variance(arr, ddof))
}

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0)
}

// ─── Rank array (with ties getting average rank) ───
function rankArray(arr: number[]): number[] {
  const indexed = arr.map((v, i) => ({ v, i }))
  const sorted = [...indexed].sort((a, b) => a.v - b.v)
  const ranks = new Array(arr.length)
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j < sorted.length && sorted[j].v === sorted[i].v) j++
    const avgRank = (i + j - 1) / 2 + 1 // 1-based average rank
    for (let k = i; k < j; k++) ranks[sorted[k].i] = avgRank
    i = j
  }
  return ranks
}

// ═══════════════════════════════════════════════════════
// 1. FREQUENCIES
// ═══════════════════════════════════════════════════════
export interface FrequencyResult {
  variableName: string
  totalN: number
  missingN: number
  validN: number
  table: { value: string; frequency: number; percent: number; cumulativePercent: number }[]
  quartiles?: { q1: number; median: number; q3: number }
}

export function calcFrequencies(values: (string | number | null | undefined)[], variableName: string): FrequencyResult {
  const allVals = values ?? []
  const valid = allVals.filter(v => v !== '' && v !== null && v !== undefined)
  const missing = allVals.length - valid.length
  const isNumeric = valid.every(v => typeof v === 'number' || !isNaN(Number(v)))
  const nums = isNumeric ? valid.map(v => Number(v)) : null

  // Build frequency table
  const freqMap = new Map<string, number>()
  for (const v of valid) {
    const key = String(v)
    freqMap.set(key, (freqMap.get(key) || 0) + 1)
  }

  // Sort by value
  const entries = [...freqMap.entries()]
  if (isNumeric && nums) {
    entries.sort((a, b) => Number(a[0]) - Number(b[0]))
  }

  const table: FrequencyResult['table'] = []
  let cumPct = 0
  for (const [value, freq] of entries) {
    const pct = (freq / valid.length) * 100
    cumPct += pct
    table.push({ value, frequency: freq, percent: pct, cumulativePercent: cumPct })
  }

  const result: FrequencyResult = {
    variableName,
    totalN: allVals.length,
    missingN: missing,
    validN: valid.length,
    table,
  }

  // For numeric, also compute quartiles
  if (nums && nums.length >= 4) {
    const sorted = [...nums].sort((a, b) => a - b)
    const q1 = sorted[Math.floor(sorted.length * 0.25)]
    const med = median(nums)
    const q3 = sorted[Math.floor(sorted.length * 0.75)]
    result.quartiles = { q1, median: med, q3 }
  }

  return result
}

// ═══════════════════════════════════════════════════════
// 2. CROSSTABS (Chi-Square Test of Independence)
// ═══════════════════════════════════════════════════════
export interface CrosstabsResult {
  rowVariable: string
  colVariable: string
  contingencyTable: { headers: string[]; rows: { label: string; cells: number[]; total: number }[]; colTotals: number[]; grandTotal: number }
  chiSquare: number
  degreesOfFreedom: number
  pValue: number
  expectedFrequencies: number[][]
  cramersV?: number
}

export function calcCrosstabs(
  rowValues: (string | number | null | undefined)[],
  colValues: (string | number | null | undefined)[],
  rowVariable: string,
  colVariable: string
): CrosstabsResult | null {
  const n = Math.min(rowValues.length, colValues.length)
  if (n < 5) return null

  // Build contingency table
  const rowLabels = new Set<string>()
  const colLabels = new Set<string>()
  const pairs: [string, string][] = []

  for (let i = 0; i < n; i++) {
    const r = rowValues[i]
    const c = colValues[i]
    if (r === '' || r === null || r === undefined || c === '' || c === null || c === undefined) continue
    const rk = String(r)
    const ck = String(c)
    rowLabels.add(rk)
    colLabels.add(ck)
    pairs.push([rk, ck])
  }

  if (rowLabels.size < 2 || colLabels.size < 2) return null

  const rArr = [...rowLabels].sort()
  const cArr = [...colLabels].sort()
  const observed: number[][] = rArr.map(() => cArr.map(() => 0))

  for (const [r, c] of pairs) {
    const ri = rArr.indexOf(r)
    const ci = cArr.indexOf(c)
    observed[ri][ci]++
  }

  const rowTotals = rArr.map((_, ri) => sum(observed[ri]))
  const colTotals = cArr.map((_, ci) => sum(observed.map(r => r[ci])))
  const grandTotal = sum(rowTotals)

  // Expected frequencies
  const expected: number[][] = rArr.map((_, ri) =>
    cArr.map((_, ci) => (rowTotals[ri] * colTotals[ci]) / grandTotal)
  )

  // Chi-square statistic
  let chiSq = 0
  for (let ri = 0; ri < rArr.length; ri++) {
    for (let ci = 0; ci < cArr.length; ci++) {
      if (expected[ri][ci] > 0) {
        chiSq += (observed[ri][ci] - expected[ri][ci]) ** 2 / expected[ri][ci]
      }
    }
  }

  const df = (rArr.length - 1) * (cArr.length - 1)
  const pValue = pValueFromChiSquare(chiSq, df)

  // Cramér's V
  const minDim = Math.min(rArr.length - 1, cArr.length - 1)
  const cramersV = minDim > 0 ? Math.sqrt(chiSq / (grandTotal * minDim)) : 0

  return {
    rowVariable,
    colVariable,
    contingencyTable: {
      headers: cArr,
      rows: rArr.map((label, ri) => ({ label, cells: observed[ri], total: rowTotals[ri] })),
      colTotals,
      grandTotal,
    },
    chiSquare: chiSq,
    degreesOfFreedom: df,
    pValue,
    expectedFrequencies: expected,
    cramersV,
  }
}

// ═══════════════════════════════════════════════════════
// 3. INDEPENDENT SAMPLES T-TEST (Welch's)
// ═══════════════════════════════════════════════════════
export interface TTestResult {
  group1Name: string
  group2Name: string
  mean1: number
  mean2: number
  std1: number
  std2: number
  n1: number
  n2: number
  meanDifference: number
  stdErrorDifference: number
  tStatistic: number
  degreesOfFreedom: number
  pValue: number
  cohensD: number
}

export function calcTTest(
  group1: (number | string | null | undefined)[],
  group2: (number | string | null | undefined)[],
  group1Name = 'Group 1',
  group2Name = 'Group 2'
): TTestResult | null {
  const nums1 = group1.filter(v => v !== '' && v !== null && v !== undefined).map(v => Number(v)).filter(v => !isNaN(v))
  const nums2 = group2.filter(v => v !== '' && v !== null && v !== undefined).map(v => Number(v)).filter(v => !isNaN(v))

  if (nums1.length < 2 || nums2.length < 2) return null

  const n1 = nums1.length
  const n2 = nums2.length
  const m1 = mean(nums1)
  const m2 = mean(nums2)
  const s1 = stddev(nums1)
  const s2 = stddev(nums2)
  const se1 = s1 * s1 / n1
  const se2 = s2 * s2 / n2

  // Welch's t-test
  const meanDiff = m1 - m2
  const seDiff = Math.sqrt(se1 + se2)
  if (seDiff === 0) return null

  const t = meanDiff / seDiff

  // Welch-Satterthwaite degrees of freedom
  const num = (se1 + se2) ** 2
  const den = se1 ** 2 / (n1 - 1) + se2 ** 2 / (n2 - 1)
  const df = den === 0 ? n1 + n2 - 2 : num / den

  // P-value (two-tailed) using t-distribution via regularized incomplete beta
  // This is accurate for all sample sizes, not just large n
  const x = df / (df + t * t)
  const pValue = 2 * regularizedIncompleteBeta(df / 2, 0.5, x)

  // Cohen's d (pooled)
  const pooledSD = Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2))
  const cohensD = pooledSD === 0 ? 0 : meanDiff / pooledSD

  return {
    group1Name, group2Name,
    mean1: m1, mean2: m2,
    std1: s1, std2: s2,
    n1, n2,
    meanDifference: meanDiff,
    stdErrorDifference: seDiff,
    tStatistic: t,
    degreesOfFreedom: df,
    pValue,
    cohensD,
  }
}

// ═══════════════════════════════════════════════════════
// 4. ONE-WAY ANOVA
// ═══════════════════════════════════════════════════════
export interface ANOVAResult {
  groupName: string
  betweenGroups: { ss: number; df: number; ms: number; f: number; pValue: number }
  withinGroups: { ss: number; df: number; ms: number }
  total: { ss: number; df: number }
  etaSquared: number
  omegaSquared: number
  groupStats: { name: string; n: number; mean: number; std: number }[]
  grandMean: number
}

export function calcANOVA(groups: Record<string, (number | string | null | undefined)[]>): ANOVAResult | null {
  const entries = Object.entries(groups)
  if (entries.length < 2) return null

  const validGroups: { name: string; values: number[] }[] = entries.map(([name, vals]) => ({
    name,
    values: vals.filter(v => v !== '' && v !== null && v !== undefined).map(v => Number(v)).filter(v => !isNaN(v)),
  })).filter(g => g.values.length >= 2)

  if (validGroups.length < 2) return null

  const allValues = validGroups.flatMap(g => g.values)
  const N = allValues.length
  const grandMean = mean(allValues)

  // SS Between
  let ssBetween = 0
  for (const g of validGroups) {
    ssBetween += g.values.length * (mean(g.values) - grandMean) ** 2
  }

  // SS Within
  let ssWithin = 0
  for (const g of validGroups) {
    const m = mean(g.values)
    ssWithin += g.values.reduce((a, v) => a + (v - m) ** 2, 0)
  }

  // SS Total
  const ssTotal = ssBetween + ssWithin

  const dfBetween = validGroups.length - 1
  const dfWithin = N - validGroups.length
  const dfTotal = N - 1

  const msBetween = dfBetween > 0 ? ssBetween / dfBetween : 0
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 0

  const f = msWithin === 0 ? 0 : msBetween / msWithin
  const pValue = dfBetween > 0 && dfWithin > 0 ? pValueFromF(f, dfBetween, dfWithin) : 1

  const etaSquared = ssTotal > 0 ? ssBetween / ssTotal : 0
  const omegaSquared = ssTotal > 0 ? (ssBetween - dfBetween * msWithin) / (ssTotal + msWithin) : 0

  const groupStats = validGroups.map(g => ({
    name: g.name,
    n: g.values.length,
    mean: mean(g.values),
    std: stddev(g.values),
  }))

  return {
    groupName: 'ANOVA',
    betweenGroups: { ss: ssBetween, df: dfBetween, ms: msBetween, f, pValue },
    withinGroups: { ss: ssWithin, df: dfWithin, ms: msWithin },
    total: { ss: ssTotal, df: dfTotal },
    etaSquared,
    omegaSquared,
    groupStats,
    grandMean,
  }
}

// ═══════════════════════════════════════════════════════
// 5. CHI-SQUARE TEST
// ═══════════════════════════════════════════════════════
export interface ChiSquareResult {
  chiSquare: number
  degreesOfFreedom: number
  pValue: number
  observed: number[]
  expected: number[]
  residuals: number[]
}

export function calcChiSquare(
  observedRaw: number[],
  expectedRaw?: number[]
): ChiSquareResult | null {
  const observed = observedRaw.filter(v => !isNaN(v) && v >= 0)
  if (observed.length < 2) return null

  const total = sum(observed)
  if (total === 0) return null

  let expected: number[]
  if (expectedRaw) {
    expected = expectedRaw.slice(0, observed.length)
  } else {
    // Uniform distribution
    expected = observed.map(() => total / observed.length)
  }

  let chiSq = 0
  const residuals: number[] = []
  for (let i = 0; i < observed.length; i++) {
    const exp = expected[i] || 0
    chiSq += (observed[i] - exp) ** 2 / Math.max(exp, 0.0001)
    residuals.push(exp > 0 ? (observed[i] - exp) / Math.sqrt(exp) : 0)
  }

  const df = observed.length - 1
  const pValue = pValueFromChiSquare(chiSq, df)

  return { chiSquare: chiSq, degreesOfFreedom: df, pValue, observed, expected, residuals }
}

// ═══════════════════════════════════════════════════════
// 6a. MANN-WHITNEY U TEST
// ═══════════════════════════════════════════════════════
export interface MannWhitneyResult {
  uStatistic: number
  meanRank1: number
  meanRank2: number
  n1: number
  n2: number
  zValue: number
  pValue: number
  r: number // effect size
}

export function calcMannWhitney(
  group1: (number | string | null | undefined)[],
  group2: (number | string | null | undefined)[]
): MannWhitneyResult | null {
  const nums1 = group1.filter(v => v !== '' && v !== null && v !== undefined).map(v => Number(v)).filter(v => !isNaN(v))
  const nums2 = group2.filter(v => v !== '' && v !== null && v !== undefined).map(v => Number(v)).filter(v => !isNaN(v))

  if (nums1.length < 2 || nums2.length < 2) return null

  const n1 = nums1.length
  const n2 = nums2.length
  const all = [...nums1, ...nums2]
  const ranks = rankArray(all)

  const rankSum1 = sum(ranks.slice(0, n1))
  const rankSum2 = sum(ranks.slice(n1))

  const meanRank1 = rankSum1 / n1
  const meanRank2 = rankSum2 / n2

  // U statistics
  const u1 = rankSum1 - (n1 * (n1 + 1)) / 2
  const u2 = rankSum2 - (n2 * (n2 + 1)) / 2
  const u = Math.min(u1, u2)

  // Normal approximation with tie correction
  const N = n1 + n2
  const meanU = (n1 * n2) / 2

  // Count ties for variance correction
  const freq = new Map<number, number>()
  for (const v of all) freq.set(v, (freq.get(v) || 0) + 1)
  let tieCorrection = 0
  for (const count of freq.values()) {
    if (count > 1) tieCorrection += count ** 3 - count
  }
  tieCorrection = tieCorrection / (N * (N - 1))

  const varU = (n1 * n2 / 12) * ((N + 1) - tieCorrection)
  const stdU = varU > 0 ? Math.sqrt(varU) : 1

  const z = (u - meanU) / stdU
  const pValue = twoTailedPFromZ(z)

  // Effect size r
  const r = Math.abs(z) / Math.sqrt(N)

  return { uStatistic: u, meanRank1, meanRank2, n1, n2, zValue: z, pValue, r }
}

// ═══════════════════════════════════════════════════════
// 6b. WILCOXON SIGNED-RANK TEST
// ═══════════════════════════════════════════════════════
export interface WilcoxonResult {
  wStatistic: number
  meanRankPositive: number
  meanRankNegative: number
  n: number
  nZero: number
  zValue: number
  pValue: number
  r: number // effect size
}

export function calcWilcoxon(
  sample1: (number | string | null | undefined)[],
  sample2: (number | string | null | undefined)[]
): WilcoxonResult | null {
  const pairs: [number, number][] = []
  for (let i = 0; i < Math.min(sample1.length, sample2.length); i++) {
    const v1 = sample1[i]
    const v2 = sample2[i]
    if (v1 === '' || v1 === null || v1 === undefined || v2 === '' || v2 === null || v2 === undefined) continue
    const n1 = Number(v1)
    const n2 = Number(v2)
    if (!isNaN(n1) && !isNaN(n2)) pairs.push([n1, n2])
  }

  if (pairs.length < 5) return null

  // Compute differences
  const diffs: number[] = []
  let nZero = 0
  for (const [a, b] of pairs) {
    const d = a - b
    if (d === 0) {
      nZero++
    } else {
      diffs.push(d)
    }
  }

  if (diffs.length < 5) return null

  const n = diffs.length

  // Rank absolute differences
  const absDiffs = diffs.map(Math.abs)
  const ranks = rankArray(absDiffs)

  // Split into positive and negative
  let wPos = 0
  let posCount = 0
  let wNeg = 0
  let negCount = 0
  for (let i = 0; i < n; i++) {
    if (diffs[i] > 0) {
      wPos += ranks[i]
      posCount++
    } else {
      wNeg += ranks[i]
      negCount++
    }
  }

  const w = Math.min(wPos, wNeg)
  const meanRankPositive = posCount > 0 ? wPos / posCount : 0
  const meanRankNegative = negCount > 0 ? wNeg / negCount : 0

  // Normal approximation with tie correction
  const meanW = n * (n + 1) / 4

  // Tie correction
  const freq = new Map<number, number>()
  for (const v of absDiffs) freq.set(v, (freq.get(v) || 0) + 1)
  let tieCorrection = 0
  for (const count of freq.values()) {
    if (count > 1) tieCorrection += count ** 3 - count
  }
  tieCorrection = tieCorrection / 48

  const varW = (n * (n + 1) * (2 * n + 1)) / 24 - tieCorrection
  const stdW = varW > 0 ? Math.sqrt(varW) : 1

  // Continuity correction
  const z = (w - meanW) / stdW
  const pValue = twoTailedPFromZ(z)

  // Effect size r (using positive-ranks W)
  const r = Math.abs(z) / Math.sqrt(n)

  return {
    wStatistic: w,
    meanRankPositive,
    meanRankNegative,
    n,
    nZero,
    zValue: z,
    pValue,
    r,
  }
}

// ═══════════════════════════════════════════════════════
// UTILITY: Format p-value
// ═══════════════════════════════════════════════════════
export function formatPValue(p: number): string {
  if (p < 0.001) return p < 0.0001 ? '< .0001' : p.toExponential(2)
  return p.toFixed(4)
}

// ═══════════════════════════════════════════════════════
// UTILITY: Format number
// ═══════════════════════════════════════════════════════
export function fmt(v: number, decimals = 4): string {
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(decimals)
}

// ═══════════════════════════════════════════════════════
// 7. MULTIPLE LINEAR REGRESSION (OLS)
// ═══════════════════════════════════════════════════════
export interface MultipleRegressionResult {
  coefficients: number[]
  r2: number
  adjustedR2: number
  fStat: number
  pValue: number
  n: number
  k: number
}

export function calcMultipleRegression(
  yArr: number[],
  xMat: number[][]
): MultipleRegressionResult | null {
  const n = yArr.length
  const k = xMat.length // number of predictors
  if (n <= k + 1) return null

  // Simple OLS: solve (X'X)^-1 X'y
  // X matrix: n × (k+1) with intercept column
  const X: number[][] = []
  for (let i = 0; i < n; i++) {
    X.push([1, ...xMat.map(col => col[i] || 0)])
  }

  // X'X matrix
  const XtX: number[][] = Array(k + 1).fill(null).map(() => Array(k + 1).fill(0))
  for (let i = 0; i <= k; i++) {
    for (let j = 0; j <= k; j++) {
      for (let r = 0; r < n; r++) {
        XtX[i][j] += X[r][i] * X[r][j]
      }
    }
  }

  // X'y vector
  const Xty: number[] = Array(k + 1).fill(0)
  for (let i = 0; i <= k; i++) {
    for (let r = 0; r < n; r++) {
      Xty[i] += X[r][i] * yArr[r]
    }
  }

  // Solve using Gaussian elimination
  const aug = XtX.map((row, i) => [...row, Xty[i]])
  for (let col = 0; col <= k; col++) {
    // Find pivot
    let maxVal = Math.abs(aug[col][col])
    let maxRow = col
    for (let row = col + 1; row <= k; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col])
        maxRow = row
      }
    }
    ;[aug[col], aug[maxRow]] = [aug[maxRow], aug[col]]
    if (Math.abs(aug[col][col]) < 1e-10) continue
    for (let row = col + 1; row <= k; row++) {
      const factor = aug[row][col] / aug[col][col]
      for (let j = col; j <= k + 1; j++) {
        aug[row][j] -= factor * aug[col][j]
      }
    }
  }

  const coefficients: number[] = Array(k + 1).fill(0)
  for (let i = k; i >= 0; i--) {
    coefficients[i] = aug[i][k + 1]
    for (let j = i + 1; j <= k; j++) {
      coefficients[i] -= aug[i][j] * coefficients[j]
    }
    coefficients[i] /= aug[i][i]
  }

  // Calculate R²
  const yMean = yArr.reduce((a, b) => a + b, 0) / n
  let ssTot = 0, ssRes = 0
  for (let i = 0; i < n; i++) {
    let predicted = coefficients[0]
    for (let j = 0; j < k; j++) predicted += coefficients[j + 1] * (xMat[j][i] || 0)
    ssRes += (yArr[i] - predicted) ** 2
    ssTot += (yArr[i] - yMean) ** 2
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  const adjustedR2 = 1 - (1 - r2) * (n - 1) / (n - k - 1)

  // F-statistic
  const msReg = ((ssTot - ssRes) / k)
  const msRes = ssRes / (n - k - 1)
  const fStat = msRes === 0 ? 0 : msReg / msRes

  // Approximate p-value from F
  const pValue = 1 - regularizedIncompleteBeta(k / 2, (n - k - 1) / 2, (k * fStat) / (k * fStat + n - k - 1))

  return { coefficients, r2, adjustedR2, fStat, pValue, n, k }
}

/* ─── Inline Statistical Engine (extracted from useWorkspaceHandlers) ─── */
export function calcStats(values: number[]) {
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

export function calcCorrelation(x: number[], y: number[]): { r: number; n: number } | null {
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

export function calcRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number; n: number } | null {
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
