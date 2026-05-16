'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wand2,
  ArrowRight,
  ArrowLeft,
  BarChart3,
  GitCompare,
  TrendingUp,
  Search,
  Brain,
  Check,
  ChevronRight,
  Sparkles,
  Download,
  Loader2,
  Info,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'

/* ─── STATISTICAL FUNCTIONS (mirrored from page.tsx) ─── */

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

/* ─── T-TEST (Welch's approximate t-test for two independent samples) ─── */

function calcTTest(g1: number[], g2: number[]): {
  t: number; df: number; mean1: number; mean2: number;
  se1: number; se2: number; n1: number; n2: number;
  meanDiff: number; pooledSE: number;
} | null {
  const clean1 = g1.filter(v => typeof v === 'number' && !isNaN(v))
  const clean2 = g2.filter(v => typeof v === 'number' && !isNaN(v))
  if (clean1.length < 2 || clean2.length < 2) return null
  const n1 = clean1.length, n2 = clean2.length
  const mean1 = clean1.reduce((a, b) => a + b, 0) / n1
  const mean2 = clean2.reduce((a, b) => a + b, 0) / n2
  const var1 = clean1.reduce((a, b) => a + (b - mean1) ** 2, 0) / (n1 - 1)
  const var2 = clean2.reduce((a, b) => a + (b - mean2) ** 2, 0) / (n2 - 1)
  const se1 = Math.sqrt(var1 / n1)
  const se2 = Math.sqrt(var2 / n2)
  const pooledSE = Math.sqrt(var1 / n1 + var2 / n2)
  if (pooledSE === 0) return null
  const meanDiff = mean1 - mean2
  const t = meanDiff / pooledSE
  const df = (var1 / n1 + var2 / n2) ** 2 / (
    (var1 / n1) ** 2 / (n1 - 1) + (var2 / n2) ** 2 / (n2 - 1)
  )
  return { t, df, mean1, mean2, se1, se2, n1, n2, meanDiff, pooledSE }
}

/* ─── TYPES ─── */

type AnalysisGoal =
  | 'compare'
  | 'correlate'
  | 'predict'
  | 'describe'
  | 'hypothesis'
  | 'explore'

interface GoalConfig {
  id: AnalysisGoal
  title: string
  description: string
  icon: React.ReactNode
  badge: string
  recommendedTests: string[]
  disabled?: boolean
}

interface VariableInfo {
  name: string
  type: 'numeric' | 'string'
  sample: any
}

interface WizardResult {
  title: string
  output: any
}

/* ─── CONSTANTS ─── */

const GOALS: GoalConfig[] = [
  {
    id: 'compare',
    title: 'Compare two groups',
    description: 'Compare means between two groups (e.g., treatment vs control)',
    icon: <GitCompare className="size-5" />,
    badge: 'Independent t-test',
    recommendedTests: ["Student's t-test", "Welch's t-test", 'Mann-Whitney U'],
  },
  {
    id: 'correlate',
    title: 'Find relationships',
    description: 'Measure the strength of association between variables',
    icon: <TrendingUp className="size-5" />,
    badge: "Pearson's r",
    recommendedTests: ["Pearson's r", 'Spearman ρ', 'Kendall τ'],
  },
  {
    id: 'predict',
    title: 'Predict outcomes',
    description: 'Build a linear regression model to predict one variable from others',
    icon: <BarChart3 className="size-5" />,
    badge: 'Linear Regression',
    recommendedTests: ['Simple Regression', 'Multiple Regression', 'Logistic Regression'],
  },
  {
    id: 'describe',
    title: 'Describe my data',
    description: 'Get summary statistics and distributions for your variables',
    icon: <Search className="size-5" />,
    badge: 'Descriptive Stats',
    recommendedTests: ['Mean, Median, SD', 'Percentiles', 'Distribution Shape'],
  },
  {
    id: 'hypothesis',
    title: 'Test a hypothesis',
    description: 'Test whether a sample mean differs from a hypothesized value',
    icon: <Brain className="size-5" />,
    badge: 'One-Sample t-test',
    recommendedTests: ['One-Sample t-test', 'Chi-Square', 'ANOVA'],
  },
  {
    id: 'explore',
    title: 'Explore patterns',
    description: 'Find hidden structure in your data through clustering and factor analysis',
    icon: <Sparkles className="size-5" />,
    badge: 'Advanced',
    recommendedTests: ['Factor Analysis', 'Cluster Analysis', 'PCA'],
    disabled: true,
  },
]

const STEP_TITLES = [
  'Choose Your Goal',
  'Select Variables',
  'Review & Run',
  'Results & Interpretation',
]

/* ─── HELPERS ─── */

function inferVariableType(data: Record<string, any[]>, varName: string): 'numeric' | 'string' {
  const values = data[varName] || []
  const sample = values.slice(0, 20).filter(v => v !== null && v !== undefined && v !== '')
  if (sample.length === 0) return 'string'
  const numericCount = sample.filter(v => {
    if (typeof v === 'number') return !isNaN(v)
    return !isNaN(parseFloat(String(v)))
  }).length
  return numericCount / sample.length > 0.8 ? 'numeric' : 'string'
}

function toNumberArray(data: Record<string, any[]>, varName: string): number[] {
  return (data[varName] || []).map(v =>
    typeof v === 'number' ? v : parseFloat(String(v))
  ).filter(v => typeof v === 'number' && !isNaN(v))
}

function describeCorrelationStrength(r: number): string {
  const abs = Math.abs(r)
  if (abs >= 0.9) return 'very strong'
  if (abs >= 0.7) return 'strong'
  if (abs >= 0.5) return 'moderate'
  if (abs >= 0.3) return 'weak'
  return 'very weak'
}

function describeR2(r2: number): string {
  const pct = Math.round(r2 * 100)
  if (pct >= 80) return 'an excellent'
  if (pct >= 60) return 'a good'
  if (pct >= 40) return 'a moderate'
  if (pct >= 20) return 'a modest'
  return 'a low'
}

/* ─── ANIMATION VARIANTS ─── */

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
  }),
}

/* ─── MAIN COMPONENT ─── */

export interface AnalysisWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variables: string[]
  data: Record<string, any[]>
  onAddOutput: (output: any) => void
}

export function AnalysisWizard({
  open,
  onOpenChange,
  variables,
  data,
  onAddOutput,
}: AnalysisWizardProps) {
  /* ── State ── */
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [selectedGoal, setSelectedGoal] = useState<AnalysisGoal | null>(null)
  const [selectedDepVar, setSelectedDepVar] = useState<string | null>(null)
  const [selectedIndepVars, setSelectedIndepVars] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<WizardResult | null>(null)

  /* ── Derived data ── */
  const variableInfos = useMemo<VariableInfo[]>(() => {
    return variables.map(name => ({
      name,
      type: inferVariableType(data, name),
      sample: (data[name] || [])[0],
    }))
  }, [variables, data])

  const numericVars = useMemo(
    () => variableInfos.filter(v => v.type === 'numeric'),
    [variableInfos],
  )

  const stringVars = useMemo(
    () => variableInfos.filter(v => v.type === 'string'),
    [variableInfos],
  )

  const goalConfig = useMemo(
    () => GOALS.find(g => g.id === selectedGoal),
    [selectedGoal],
  )

  /* ── Navigation ── */
  const goNext = useCallback(() => {
    setDirection(1)
    setStep(s => Math.min(s + 1, 3))
  }, [])

  const goBack = useCallback(() => {
    setDirection(-1)
    setStep(s => Math.max(s - 1, 0))
  }, [])

  const reset = useCallback(() => {
    setStep(0)
    setSelectedGoal(null)
    setSelectedDepVar(null)
    setSelectedIndepVars([])
    setIsRunning(false)
    setResult(null)
  }, [])

  /* ── Variable selection logic ── */
  const toggleIndepVar = useCallback(
    (varName: string) => {
      setSelectedIndepVars(prev =>
        prev.includes(varName)
          ? prev.filter(v => v !== varName)
          : [...prev, varName],
      )
    },
    [],
  )

  const canProceedFromStep2 = useMemo(() => {
    if (!selectedGoal) return false
    switch (selectedGoal) {
      case 'compare':
        return selectedDepVar !== null && selectedIndepVars.length === 1 && stringVars.some(v => v.name === selectedIndepVars[0])
      case 'correlate':
        return selectedIndepVars.length >= 2
      case 'predict':
        return selectedDepVar !== null && selectedIndepVars.length >= 1
      case 'describe':
        return selectedIndepVars.length >= 1
      case 'hypothesis':
        return selectedDepVar !== null
      default:
        return false
    }
  }, [selectedGoal, selectedDepVar, selectedIndepVars, stringVars])

  /* ── Run analysis ── */
  const runAnalysis = useCallback(async () => {
    if (!selectedGoal || !goalConfig) return
    setIsRunning(true)

    // Simulate a brief delay for UX
    await new Promise(resolve => setTimeout(resolve, 800))

    let title = ''
    let output: any = null

    switch (selectedGoal) {
      case 'describe': {
        title = 'Descriptive Statistics'
        const rows = selectedIndepVars.map(vName => {
          const vals = toNumberArray(data, vName)
          const stats = calcStats(vals)
          return stats
            ? [vName, stats.n, stats.mean.toFixed(3), stats.median.toFixed(3), stats.stddev.toFixed(3), stats.min.toFixed(2), stats.max.toFixed(2), stats.skewness.toFixed(3), stats.kurtosis.toFixed(3)]
            : [vName, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A']
        })
        output = {
          headers: ['Variable', 'N', 'Mean', 'Median', 'Std Dev', 'Min', 'Max', 'Skewness', 'Kurtosis'],
          rows,
        }
        break
      }

      case 'correlate': {
        title = `Correlation Matrix (${selectedIndepVars.join(' × ')})`
        const vars = selectedIndepVars.slice(0, 6)
        const matrix: string[][] = [vars]
        for (const v1 of vars) {
          const row: string[] = [v1]
          for (const v2 of vars) {
            if (v1 === v2) {
              row.push('1.000')
              continue
            }
            const x = toNumberArray(data, v1)
            const y = toNumberArray(data, v2)
            const corr = calcCorrelation(x, y)
            row.push(corr ? corr.r.toFixed(3) : 'N/A')
          }
          matrix.push(row)
        }
        output = { headers: [''], rows: matrix }
        break
      }

      case 'predict': {
        if (!selectedDepVar || selectedIndepVars.length < 1) break
        const dvName = selectedDepVar
        const ivName = selectedIndepVars[0]
        const x = toNumberArray(data, ivName)
        const y = toNumberArray(data, dvName)
        const reg = calcRegression(x, y)
        const corr = calcCorrelation(x, y)
        if (!reg || !corr) break
        title = `Regression: ${dvName} ~ ${ivName}`
        output = {
          headers: ['Statistic', 'Value'],
          rows: [
            ['Intercept (α)', reg.intercept.toFixed(4)],
            ['Slope (β)', reg.slope.toFixed(4)],
            ['R (Correlation)', corr.r.toFixed(4)],
            ['R² (Explained)', reg.r2.toFixed(4)],
            ['N', String(reg.n)],
            ['Equation', `${dvName} = ${reg.intercept.toFixed(2)} + ${reg.slope.toFixed(2)} × ${ivName}`],
          ],
          regression: { ...reg, r: corr.r, dvName, ivName, x: x.slice(0, 50), y: y.slice(0, 50) },
        }
        break
      }

      case 'compare': {
        if (!selectedDepVar || selectedIndepVars.length < 1) break
        const depValues = toNumberArray(data, selectedDepVar)
        const groupVar = selectedIndepVars[0]
        const groupValues = (data[groupVar] || [])
        const groups: Record<string, number[]> = {}
        const len = Math.min(depValues.length, groupValues.length)
        for (let i = 0; i < len; i++) {
          const key = String(groupValues[i])
          if (!groups[key]) groups[key] = []
          groups[key].push(depValues[i])
        }
        const groupNames = Object.keys(groups)
        const g1 = groups[groupNames[0]] || []
        const g2 = groups[groupNames[1]] || []
        const s1 = calcStats(g1)
        const s2 = calcStats(g2)
        const ttest = calcTTest(g1, g2)
        title = `Group Comparison: ${selectedDepVar} by ${groupVar}`
        output = {
          headers: ['Statistic', `${groupNames[0]}`, `${groupNames[1]}`],
          rows: [
            ['N', String(g1.length), String(g2.length)],
            ['Mean', s1?.mean.toFixed(3) ?? 'N/A', s2?.mean.toFixed(3) ?? 'N/A'],
            ['Std Dev', s1?.stddev.toFixed(3) ?? 'N/A', s2?.stddev.toFixed(3) ?? 'N/A'],
            ['Median', s1?.median.toFixed(3) ?? 'N/A', s2?.median.toFixed(3) ?? 'N/A'],
            ['Min', s1?.min.toFixed(2) ?? 'N/A', s2?.min.toFixed(2) ?? 'N/A'],
            ['Max', s1?.max.toFixed(2) ?? 'N/A', s2?.max.toFixed(2) ?? 'N/A'],
            ...(ttest
              ? [
                  ['Mean Diff', ttest.meanDiff.toFixed(4), ''],
                  ['t-statistic', ttest.t.toFixed(4), ''],
                  ['df (approx)', ttest.df.toFixed(2), ''],
                  ['SE', ttest.pooledSE.toFixed(4), ''],
                ]
              : []),
          ],
          ttest,
          depVarName: selectedDepVar,
          groupVarName: groupVar,
          group1Name: groupNames[0],
          group2Name: groupNames[1],
        }
        break
      }

      case 'hypothesis': {
        if (!selectedDepVar) break
        const vals = toNumberArray(data, selectedDepVar)
        const stats = calcStats(vals)
        if (!stats) break
        const se = stats.stddev / Math.sqrt(stats.n)
        const tStat = (stats.mean - 0) / se
        title = `One-Sample t-Test: ${selectedDepVar} (μ₀ = 0)`
        output = {
          headers: ['Statistic', 'Value'],
          rows: [
            ['Sample Mean', stats.mean.toFixed(4)],
            ['Hypothesized Mean (μ₀)', '0'],
            ['Std Dev', stats.stddev.toFixed(4)],
            ['Std Error', se.toFixed(4)],
            ['t-statistic', tStat.toFixed(4)],
            ['df', String(stats.n - 1)],
            ['N', String(stats.n)],
          ],
          stats,
          tStat,
          se,
          depVarName: selectedDepVar,
        }
        break
      }
    }

    setIsRunning(false)
    if (output) {
      const res = { title, output }
      setResult(res)
      setDirection(1)
      setStep(3)
    }
  }, [selectedGoal, goalConfig, data, selectedDepVar, selectedIndepVars])

  /* ── Generate AI-style interpretation ── */
  const aiInterpretation = useMemo(() => {
    if (!result || !selectedGoal) return ''
    const { title, output } = result

    switch (selectedGoal) {
      case 'describe': {
        const lines: string[] = []
        for (const row of output.rows) {
          const [name, n, mean, median, sd, skew] = row
          const skewNum = parseFloat(skew)
          const skewDesc = skewNum > 1 ? 'positively skewed' : skewNum < -1 ? 'negatively skewed' : 'approximately symmetric'
          lines.push(
            `• **${name}** (n=${n}): Mean = ${mean}, SD = ${sd}. The distribution is ${skewDesc}.`,
          )
        }
        return lines.join('\n')
      }

      case 'correlate': {
        if (output.rows.length < 3) return 'Not enough variables for interpretation.'
        const lines: string[] = []
        const vars = output.rows[0]
        for (let i = 1; i < output.rows.length; i++) {
          for (let j = 1; j <= i; j++) {
            const r = parseFloat(output.rows[i][j])
            if (isNaN(r) || i === j) continue
            const strength = describeCorrelationStrength(r)
            const direction = r > 0 ? 'positive' : 'negative'
            lines.push(
              `• **${vars[i - 1]}** and **${vars[j - 1]}** show a ${strength} ${direction} correlation (r = ${r.toFixed(3)}).`,
            )
          }
        }
        return lines.join('\n')
      }

      case 'predict': {
        const reg = output.regression
        if (!reg) return 'Unable to generate interpretation.'
        const r2Pct = Math.round(reg.r2 * 100)
        const r2Desc = describeR2(reg.r2)
        const strength = describeCorrelationStrength(reg.r)
        const dir = reg.r >= 0 ? 'positive' : 'negative'
        const line = `Your regression explains ${r2Pct}% of the variance — ${r2Desc} fit. ` +
          `**${reg.ivName}** has a ${strength} ${dir} relationship with **${reg.dvName}** ` +
          `(β = ${reg.slope.toFixed(2)}, r = ${reg.r.toFixed(3)}). ` +
          `The model equation is: **${reg.dvName} = ${reg.intercept.toFixed(2)} + ${reg.slope.toFixed(2)} × ${reg.ivName}**. ` +
          `Based on N = ${reg.n} observations.`
        return line
      }

      case 'compare': {
        const ttest = output.ttest
        if (!ttest) return 'Unable to compute the t-test. Check that both groups have sufficient data.'
        const absT = Math.abs(ttest.t)
        const significant = absT > 1.96
        const line = `The mean of **${output.group1Name}** (${ttest.mean1.toFixed(2)}) ` +
          `${ttest.mean1 > ttest.mean2 ? 'exceeds' : 'is lower than'} ` +
          `the mean of **${output.group2Name}** (${ttest.mean2.toFixed(2)}) ` +
          `by ${Math.abs(ttest.meanDiff).toFixed(2)} units. ` +
          `The t-statistic is ${ttest.t.toFixed(3)} with approximately ${ttest.df.toFixed(1)} degrees of freedom. ` +
          (significant
            ? `This difference **appears statistically significant** at α = 0.05.`
            : `This difference **does not reach statistical significance** at α = 0.05.`)
        return line
      }

      case 'hypothesis': {
        const stats = output.stats
        if (!stats) return 'Unable to generate interpretation.'
        const absT = Math.abs(output.tStat)
        const significant = absT > 2.0
        const line = `The sample mean of **${output.depVarName}** is ${stats.mean.toFixed(4)} (SD = ${stats.stddev.toFixed(4)}, n = ${stats.n}). ` +
          `Testing against the null hypothesis μ₀ = 0, the t-statistic is ${output.tStat.toFixed(3)} with ${stats.n - 1} degrees of freedom. ` +
          (significant
            ? `This result **appears statistically significant** at α = 0.05, suggesting the mean is different from 0.`
            : `This result **does not reach statistical significance** at α = 0.05, failing to reject the null hypothesis.`)
        return line
      }

      default:
        return 'Interpretation not available for this analysis type.'
    }
  }, [result, selectedGoal])

  /* ── Export results ── */
  const handleExport = useCallback(() => {
    if (!result) return
    const { title, output } = result

    onAddOutput({
      id: Date.now().toString(36),
      title,
      type: 'table',
      content: output,
      timestamp: new Date().toISOString(),
    })

    // Also export regression chart if applicable
    if (output.regression) {
      const reg = output.regression
      onAddOutput({
        id: (Date.now() + 1).toString(36),
        title: `Scatter Plot (${reg.dvName} vs ${reg.ivName})`,
        type: 'chart',
        content: {
          dv: reg.dvName,
          iv: reg.ivName,
          x: reg.x,
          y: reg.y,
          slope: reg.slope,
          intercept: reg.intercept,
        },
        timestamp: new Date().toISOString(),
      })
    }
  }, [result, onAddOutput])

  /* ── Close handler resets state ── */
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) reset()
      onOpenChange(newOpen)
    },
    [onOpenChange, reset],
  )

  /* ── Step validation ── */
  const canGoNext = useMemo(() => {
    switch (step) {
      case 0:
        return selectedGoal !== null
      case 1:
        return canProceedFromStep2
      case 2:
        return true
      default:
        return false
    }
  }, [step, selectedGoal, canProceedFromStep2])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[88vh] p-0 gap-0 overflow-hidden">
        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-3">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Wand2 className="size-4 text-primary" />
              <span className="gradient-text">Analysis Wizard</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Follow the guided steps to run a statistical analysis — no coding required.
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mt-3">
            {STEP_TITLES.map((label, i) => (
              <div key={label} className="flex items-center gap-1 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    if (i < step) {
                      setDirection(i < step ? -1 : 1)
                      setStep(i)
                    }
                  }}
                  className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors px-1.5 py-0.5 rounded-md ${
                    i === step
                      ? 'text-primary'
                      : i < step
                        ? 'text-muted-foreground hover:text-foreground cursor-pointer'
                        : 'text-muted-foreground/40'
                  }`}
                >
                  <span
                    className={`flex items-center justify-center size-5 rounded-full text-[10px] font-bold shrink-0 ${
                      i < step
                        ? 'bg-primary/20 text-primary'
                        : i === step
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {i < step ? <Check className="size-3" /> : i + 1}
                  </span>
                  <span className="hidden sm:inline truncate">{label}</span>
                </button>
                {i < STEP_TITLES.length - 1 && (
                  <ChevronRight className="size-3 text-muted-foreground/30 shrink-0" />
                )}
              </div>
            ))}
          </div>

          <Separator className="mt-3" />
        </div>

        {/* ── Body ── */}
        <ScrollArea className="max-h-[58vh]">
          <div className="px-6 py-4 min-h-[320px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                {/* ── STEP 0: Choose Goal ── */}
                {step === 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground mb-3">
                      What would you like to achieve?
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {GOALS.map(goal => {
                        const isSelected = selectedGoal === goal.id
                        return (
                          <Card
                            key={goal.id}
                            className={`cursor-pointer transition-all duration-200 border-2 ${
                              isSelected
                                ? 'border-primary/60 bg-primary/5 shadow-sm shadow-primary/10'
                                : 'border-border/50 hover:border-border hover:bg-muted/30'
                            } ${goal.disabled ? 'opacity-50 pointer-events-none' : ''}`}
                            onClick={() => {
                              if (!goal.disabled) setSelectedGoal(goal.id)
                            }}
                          >
                            <CardContent className="p-3.5">
                              <div className="flex items-start gap-3">
                                <div
                                  className={`shrink-0 flex items-center justify-center size-9 rounded-lg ${
                                    isSelected
                                      ? 'bg-primary/15 text-primary'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {goal.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium leading-tight">
                                      {goal.title}
                                    </span>
                                    {goal.disabled && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        Soon
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                    {goal.description}
                                  </p>
                                  <div className="mt-2">
                                    <Badge
                                      variant={isSelected ? 'default' : 'secondary'}
                                      className="text-[10px] px-1.5 py-0 font-normal"
                                    >
                                      {goal.badge}
                                    </Badge>
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="shrink-0 text-primary">
                                    <Check className="size-4" />
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── STEP 1: Select Variables ── */}
                {step === 1 && goalConfig && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Select variables for &ldquo;{goalConfig.title}&rdquo;
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Pick the variables you want to analyze.{' '}
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {goalConfig.badge}
                        </Badge>
                      </p>
                    </div>

                    {/* Dependent Variable (for compare, predict, hypothesis) */}
                    {(selectedGoal === 'compare' || selectedGoal === 'predict' || selectedGoal === 'hypothesis') && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {selectedGoal === 'compare' ? 'Test Variable' : selectedGoal === 'predict' ? 'Outcome (Dependent)' : 'Test Variable'}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="size-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-[200px]">
                              {selectedGoal === 'predict'
                                ? 'The variable you want to predict (must be numeric)'
                                : 'The numeric variable to test or compare across groups'}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
                          {numericVars.map(v => {
                            const isSelected = selectedDepVar === v.name
                            return (
                              <button
                                key={v.name}
                                type="button"
                                onClick={() => setSelectedDepVar(v.name)}
                                className={`flex items-center justify-between gap-1.5 text-xs px-2.5 py-2 rounded-md border transition-colors ${
                                  isSelected
                                    ? 'border-primary/50 bg-primary/10 text-primary font-medium'
                                    : 'border-border/50 hover:border-border hover:bg-muted/50'
                                }`}
                              >
                                <span className="truncate">{v.name}</span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                                  {v.type === 'numeric' ? '#' : 'Abc'}
                                </Badge>
                              </button>
                            )
                          })}
                        </div>
                        {numericVars.length === 0 && (
                          <p className="text-[11px] text-muted-foreground italic">
                            No numeric variables available. Import numeric data first.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Grouping Variable (for compare) */}
                    {selectedGoal === 'compare' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">Grouping Variable</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="size-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-[200px]">
                              A categorical variable with exactly 2 groups to compare (e.g., Male/Female, Treatment/Control)
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto pr-1">
                          {stringVars.map(v => {
                            const isSelected = selectedIndepVars.includes(v.name)
                            return (
                              <button
                                key={v.name}
                                type="button"
                                onClick={() => {
                                  if (!isSelected) {
                                    setSelectedIndepVars([v.name])
                                  } else {
                                    setSelectedIndepVars([])
                                  }
                                }}
                                className={`flex items-center justify-between gap-1.5 text-xs px-2.5 py-2 rounded-md border transition-colors ${
                                  isSelected
                                    ? 'border-primary/50 bg-primary/10 text-primary font-medium'
                                    : 'border-border/50 hover:border-border hover:bg-muted/50'
                                }`}
                              >
                                <span className="truncate">{v.name}</span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                                  Abc
                                </Badge>
                              </button>
                            )
                          })}
                        </div>
                        {stringVars.length === 0 && (
                          <p className="text-[11px] text-muted-foreground italic">
                            No categorical variables found. Your grouping variable should contain text values like &quot;Group A&quot; / &quot;Group B&quot;.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Independent / Multiple Variables (for correlate, predict, describe) */}
                    {(selectedGoal === 'correlate' || selectedGoal === 'predict' || selectedGoal === 'describe') && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {selectedGoal === 'predict' ? 'Predictor(s) (Independent)' : selectedGoal === 'correlate' ? 'Variables to Correlate' : 'Variables to Analyze'}
                          </span>
                          {selectedGoal === 'correlate' && (
                            <span className="text-[10px] text-muted-foreground">
                              (select 2–6)
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
                          {numericVars.map(v => {
                            const isSelected = selectedIndepVars.includes(v.name)
                            const isDisabled = selectedGoal === 'correlate' && !isSelected && selectedIndepVars.length >= 6
                            return (
                              <button
                                key={v.name}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => toggleIndepVar(v.name)}
                                className={`flex items-center justify-between gap-1.5 text-xs px-2.5 py-2 rounded-md border transition-colors ${
                                  isSelected
                                    ? 'border-primary/50 bg-primary/10 text-primary font-medium'
                                    : isDisabled
                                      ? 'border-border/30 text-muted-foreground/40 cursor-not-allowed'
                                      : 'border-border/50 hover:border-border hover:bg-muted/50'
                                }`}
                              >
                                <span className="truncate">{v.name}</span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                                  #
                                </Badge>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Smart suggestions */}
                    {variableInfos.length > 0 && (
                      <div className="rounded-md bg-muted/30 border border-border/30 p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Sparkles className="size-3 text-primary" />
                          <span className="text-[11px] font-semibold text-muted-foreground">Smart Suggestion</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {selectedGoal === 'compare' && numericVars.length > 0 && stringVars.length > 0 && (
                            <>
                              Try selecting <strong>{numericVars[0].name}</strong> as the test variable and{' '}
                              <strong>{stringVars[0].name}</strong> as the grouping variable.
                            </>
                          )}
                          {selectedGoal === 'correlate' && numericVars.length >= 2 && (
                            <>
                              Select any {Math.min(6, numericVars.length)} of your {numericVars.length} numeric variables to generate a correlation matrix.
                            </>
                          )}
                          {selectedGoal === 'predict' && numericVars.length >= 2 && (
                            <>
                              Pick <strong>{numericVars[0].name}</strong> as the outcome and{' '}
                              <strong>{numericVars[1]?.name}</strong> as a predictor to build a regression model.
                            </>
                          )}
                          {selectedGoal === 'describe' && numericVars.length > 0 && (
                            <>
                              Select your numeric variables to get comprehensive descriptive statistics including skewness and kurtosis.
                            </>
                          )}
                          {selectedGoal === 'hypothesis' && numericVars.length > 0 && (
                            <>
                              Select a numeric variable to test if its mean is significantly different from zero.
                            </>
                          )}
                          {numericVars.length === 0 && (
                            <>Import numeric data to run this analysis. Currently, no numeric variables are detected.</>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── STEP 2: Review & Run ── */}
                {step === 2 && goalConfig && (
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-foreground">Review your analysis configuration</p>

                    <Card className="border-border/50">
                      <CardContent className="p-4 space-y-3">
                        {/* Goal */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Goal</span>
                          <div className="flex items-center gap-1.5">
                            {goalConfig.icon}
                            <span className="text-xs font-medium">{goalConfig.title}</span>
                          </div>
                        </div>

                        <Separator className="!my-2" />

                        {/* Selected Variables */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Variables</span>
                          <div className="flex flex-wrap gap-1 justify-end">
                            {selectedDepVar && (
                              <Badge variant="secondary" className="text-[10px]">
                                {selectedDepVar}
                                <span className="ml-1 text-muted-foreground">(DV)</span>
                              </Badge>
                            )}
                            {selectedIndepVars.map(v => (
                              <Badge key={v} variant="secondary" className="text-[10px]">
                                {v}
                                {selectedGoal !== 'compare' && (
                                  <span className="ml-1 text-muted-foreground">(IV)</span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <Separator className="!my-2" />

                        {/* Recommended Test */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Recommended Test</span>
                          <Badge className="text-[10px]">{goalConfig.badge}</Badge>
                        </div>

                        <Separator className="!my-2" />

                        {/* Data Summary */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Observations</span>
                          <span className="text-xs font-medium">
                            {(() => {
                              const sampleVar = selectedDepVar || selectedIndepVars[0]
                              if (!sampleVar) return 'N/A'
                              return `${(data[sampleVar] || []).length} rows`
                            })()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Expected output */}
                    <div className="rounded-md bg-muted/30 border border-border/30 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles className="size-3 text-primary" />
                        <span className="text-[11px] font-semibold text-muted-foreground">Expected Output</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {selectedGoal === 'describe' &&
                          'A summary table with N, Mean, Median, Standard Deviation, Min, Max, Skewness, and Kurtosis for each selected variable.'}
                        {selectedGoal === 'correlate' &&
                          `A ${Math.min(6, selectedIndepVars.length)}×${Math.min(6, selectedIndepVars.length)} correlation matrix showing Pearson r values for all variable pairs.`}
                        {selectedGoal === 'predict' &&
                          'A regression summary table with intercept, slope (β), R, R², and the prediction equation. A scatter plot will also be generated.'}
                        {selectedGoal === 'compare' &&
                          'A group comparison table with means, standard deviations, medians, and the t-test results including t-statistic and degrees of freedom.'}
                        {selectedGoal === 'hypothesis' &&
                          'A one-sample t-test summary with the sample mean, standard error, t-statistic, and significance assessment against μ₀ = 0.'}
                      </p>
                    </div>

                    {/* Run button */}
                    <div className="flex justify-center pt-2">
                      <Button
                        onClick={runAnalysis}
                        disabled={isRunning}
                        className="px-8"
                        size="lg"
                      >
                        {isRunning ? (
                          <>
                            <Loader2 className="size-4 mr-2 animate-spin" />
                            Running Analysis...
                          </>
                        ) : (
                          <>
                            <BarChart3 className="size-4 mr-2" />
                            Run Analysis
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: Results ── */}
                {step === 3 && result && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground gradient-text">
                        {result.title}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="default" className="text-[10px]">
                          <Check className="size-3 mr-1" />
                          Complete
                        </Badge>
                      </div>
                    </div>

                    {/* Results Table */}
                    <Card className="border-border/50">
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                {(result.output.headers || []).map((h: string, i: number) => (
                                  <TableHead
                                    key={i}
                                    className={`text-[11px] font-semibold h-9 px-3 ${i === 0 ? 'text-muted-foreground' : 'text-foreground'}`}
                                  >
                                    {h || result.output.rows[0]?.[0] || ''}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {result.output.rows.map((row: string[], ri: number) => (
                                <TableRow key={ri} className="hover:bg-muted/30">
                                  {(result.output.headers[0] === '' && ri === 0
                                    ? row
                                    : row
                                  ).map((cell: string, ci: number) => (
                                    <TableCell
                                      key={ci}
                                      className={`text-[11px] px-3 py-1.5 ${ci === 0 ? 'font-medium text-muted-foreground' : 'font-mono'}`}
                                    >
                                      {cell}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>

                    {/* AI Interpretation */}
                    <Card className="border-primary/20 bg-primary/[0.03]">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className="flex items-center justify-center size-6 rounded-md bg-primary/15">
                            <Sparkles className="size-3.5 text-primary" />
                          </div>
                          <span className="text-xs font-semibold text-foreground">AI Interpretation</span>
                        </div>
                        <div className="text-[12px] text-muted-foreground leading-relaxed whitespace-pre-line">
                          {aiInterpretation}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex items-center gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={reset}>
                        <Wand2 className="size-3.5 mr-1.5" />
                        New Analysis
                      </Button>
                      <Button size="sm" onClick={handleExport}>
                        <Download className="size-3.5 mr-1.5" />
                        Export to Output
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* ── Footer Navigation ── */}
        {step < 3 && (
          <div className="px-6 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              disabled={step === 0}
              className="text-xs"
            >
              <ArrowLeft className="size-3.5 mr-1" />
              Back
            </Button>
            <span className="text-[11px] text-muted-foreground">
              Step {step + 1} of {STEP_TITLES.length}
            </span>
            {step < 2 && (
              <Button
                size="sm"
                onClick={goNext}
                disabled={!canGoNext}
                className="text-xs"
              >
                Next
                <ArrowRight className="size-3.5 ml-1" />
              </Button>
            )}
            {step === 2 && (
              <Button
                size="sm"
                onClick={runAnalysis}
                disabled={isRunning}
                className="text-xs"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="size-3.5 mr-1 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <BarChart3 className="size-3.5 mr-1" />
                    Run Analysis
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
