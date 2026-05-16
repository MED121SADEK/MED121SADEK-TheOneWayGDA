'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Copy, Check, Sparkles, Send, MessageSquare } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnalysisType = 'descriptive' | 'correlation' | 'regression' | 'comparison'

interface StatBadge {
  label: string
  value: string
  color: string // tailwind bg-xxx
}

interface InterpretationOutput {
  paragraphs: string[]
  badges: StatBadge[]
  followUpHints: string[]
}

export interface AIInterpretationProps {
  analysisType: AnalysisType
  results: Record<string, any>
  variableNames?: string[]
}

// ---------------------------------------------------------------------------
// Pure-JS heuristic interpreter
// ---------------------------------------------------------------------------

function formatNum(n: number, decimals = 3): string {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 'N/A'
  return n.toFixed(decimals)
}

function pLabel(p: number | undefined): string {
  if (p === undefined || Number.isNaN(p)) return 'unknown'
  if (p < 0.001) return 'p < .001'
  return `p = ${p.toFixed(3)}`
}

function significanceLabel(p: number | undefined): string {
  if (p === undefined || Number.isNaN(p)) return 'with unknown significance'
  return p < 0.05 ? 'statistically significant' : 'not statistically significant'
}

function correlationStrength(r: number): string {
  const abs = Math.abs(r)
  if (abs >= 0.7) return 'strong'
  if (abs >= 0.4) return 'moderate'
  return 'weak'
}

function correlationDirection(r: number): string {
  return r >= 0 ? 'positive' : 'negative'
}

function skewnessLabel(skewness: number | undefined): string {
  if (skewness === undefined || Number.isNaN(skewness)) return 'unknown'
  const abs = Math.abs(skewness)
  const degree = abs < 0.5 ? 'slightly' : abs < 1.0 ? 'moderately' : 'highly'
  const dir = skewness > 0 ? 'positively' : 'negatively'
  return `${degree} ${dir}`
}

function interpretDescriptive(
  results: Record<string, any>,
  _varNames?: string[],
): InterpretationOutput {
  // results may be an array of per-variable stats or a single object
  const entries: Record<string, any>[] = Array.isArray(results) ? results : [results]

  const paragraphs: string[] = []
  const badges: StatBadge[] = []
  const followUpHints: string[] = []

  if (entries.length === 1) {
    const r = entries[0]
    const n = r.n ?? r.N
    const mean = r.mean ?? r.Mean
    const stddev = r.stddev ?? r.SD ?? r['Std Dev'] ?? r['Standard Deviation']
    const min = r.min ?? r.Min
    const max = r.max ?? r.Max
    const median = r.median ?? r.Median
    const skewness = r.skewness ?? r.Skewness

    const varName = r.variable ?? _varNames?.[0] ?? 'this variable'

    paragraphs.push(
      `Your dataset contains ${n ?? '?'} observations for ${varName}. ` +
        (mean !== undefined
          ? `The mean is ${formatNum(mean)} `
          : '') +
        (stddev !== undefined
          ? `with a standard deviation of ${formatNum(stddev)}. `
          : '.') +
        (min !== undefined && max !== undefined
          ? `The data ranges from ${formatNum(min, 2)} to ${formatNum(max, 2)}. `
          : '') +
        (median !== undefined
          ? `The median (${formatNum(median)}) ${
              mean !== undefined
                ? mean > median
                  ? 'is lower than the mean, suggesting the data may be right-skewed.'
                  : mean < median
                    ? 'is higher than the mean, suggesting the data may be left-skewed.'
                    : 'equals the mean, indicating a roughly symmetric distribution.'
                : ''
            } `
          : '') +
        (skewness !== undefined
          ? `The distribution is ${skewnessLabel(skewness)} skewed (skewness = ${formatNum(skewness)}).`
          : ''),
    )

    badges.push(
      { label: 'N', value: String(n ?? '?'), color: 'bg-slate-500/15 text-slate-300' },
      { label: 'Mean', value: formatNum(mean ?? 0), color: 'bg-blue-500/15 text-blue-300' },
      { label: 'SD', value: formatNum(stddev ?? 0), color: 'bg-amber-500/15 text-amber-300' },
    )
    if (skewness !== undefined) {
      badges.push({
        label: 'Skew',
        value: formatNum(skewness),
        color: 'bg-purple-500/15 text-purple-300',
      })
    }
  } else {
    // Multi-variable descriptive summary
    paragraphs.push(
      `Descriptive statistics were computed for ${entries.length} variable${entries.length > 1 ? 's' : ''}: ` +
        entries.map((e) => e.variable ?? 'Variable').join(', ') +
        '. Key findings are summarized below.',
    )

    for (const r of entries) {
      const name = r.variable ?? 'Variable'
      const mean = r.mean ?? r.Mean
      const stddev = r.stddev ?? r.SD ?? r['Std Dev']
      const n = r.n ?? r.N

      if (mean !== undefined) {
        paragraphs.push(
          `**${name}** (${n ?? '?'} obs): Mean = ${formatNum(mean)}, SD = ${formatNum(stddev ?? 0)}, Range = [${formatNum(r.min ?? 0, 2)}, ${formatNum(r.max ?? 0, 2)}].`,
        )
        badges.push({
          label: name,
          value: `μ=${formatNum(mean)}`,
          color: 'bg-blue-500/15 text-blue-300',
        })
      }
    }
  }

  followUpHints.push(
    'What does the distribution look like?',
    'Are there any outliers?',
    'How does this compare to the other variables?',
  )

  return { paragraphs, badges, followUpHints }
}

function interpretCorrelation(
  results: Record<string, any>,
  varNames?: string[],
): InterpretationOutput {
  const paragraphs: string[] = []
  const badges: StatBadge[] = []
  const followUpHints: string[] = []

  // The page stores a correlation matrix, but individual results may have r/p
  const r = results.r ?? results['correlation coefficient']
  const p = results.p ?? results['p-value'] ?? results.pValue
  const n = results.n ?? results.N

  const v1 = varNames?.[0] ?? 'Variable 1'
  const v2 = varNames?.[1] ?? 'Variable 2'

  if (r !== undefined) {
    paragraphs.push(
      `The correlation between ${v1} and ${v2} is r = ${formatNum(r)} (${correlationStrength(r)}, ${correlationDirection(r)}). ` +
        `This relationship is ${significanceLabel(p)}${p !== undefined ? ` (${pLabel(p)}).` : '.'}`,
    )

    if (Math.abs(r) >= 0.7) {
      paragraphs.push(
        `This is a ${correlationDirection(r)} and ${correlationStrength(r)} correlation, suggesting a ${Math.abs(r) >= 0.9 ? 'very robust' : 'substantial'} linear relationship between the two variables.`,
      )
    } else if (Math.abs(r) >= 0.4) {
      paragraphs.push(
        `The moderate correlation suggests there is a meaningful but not overwhelming linear relationship between the variables.`,
      )
    } else {
      paragraphs.push(
        `The weak correlation indicates little to no linear relationship between the variables.`,
      )
    }

    badges.push(
      { label: 'r', value: formatNum(r), color: 'bg-blue-500/15 text-blue-300' },
      {
        label: 'Strength',
        value: correlationStrength(r),
        color: 'bg-purple-500/15 text-purple-300',
      },
      { label: 'Direction', value: correlationDirection(r), color: 'bg-amber-500/15 text-amber-300' },
    )

    if (p !== undefined) {
      badges.push({
        label: p < 0.05 ? 'Significant' : 'Not Significant',
        value: pLabel(p),
        color: p < 0.05 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300',
      })
    }
  } else if (results.matrix) {
    // Correlation matrix interpretation
    const vars = results.matrix[0]
    paragraphs.push(
      `A correlation matrix was computed for ${vars.length} variables: ${vars.join(', ')}.`,
    )
    // Find strongest correlation
    let maxR = 0
    let maxPair = ''
    for (let i = 1; i < results.matrix.length; i++) {
      for (let j = i; j < results.matrix[i].length; j++) {
        const val = parseFloat(results.matrix[i][j])
        if (!isNaN(val) && Math.abs(val) > Math.abs(maxR)) {
          maxR = val
          maxPair = `${results.matrix[i][0]} & ${results.matrix[0][j]}`
        }
      }
    }
    if (maxPair) {
      paragraphs.push(
        `The strongest correlation found is between ${maxPair} (r = ${formatNum(maxR)}).`,
      )
      badges.push({
        label: 'Strongest',
        value: `r=${formatNum(maxR)}`,
        color: 'bg-blue-500/15 text-blue-300',
      })
    }
  }

  followUpHints.push(
    'Does a scatter plot confirm this relationship?',
    'Could there be a confounding variable?',
    'What would a regression model look like?',
  )

  return { paragraphs, badges, followUpHints }
}

function interpretRegression(
  results: Record<string, any>,
  varNames?: string[],
): InterpretationOutput {
  const paragraphs: string[] = []
  const badges: StatBadge[] = []
  const followUpHints: string[] = []

  const slope = results.slope ?? results.Slope
  const intercept = results.intercept ?? results.Intercept
  const r2 = results.r2 ?? results['R²'] ?? results['R-squared']
  const r = results.r ?? results.R
  const n = results.n ?? results.N
  const p = results.p ?? results['p-value'] ?? results.pValue

  const outcome = varNames?.[0] ?? 'Y'
  const predictor = varNames?.[1] ?? 'X'

  if (slope !== undefined) {
    const r2Pct = r2 !== undefined ? `${(r2 * 100).toFixed(1)}%` : 'an unknown amount of'

    paragraphs.push(
      `Your regression model explains ${r2Pct} of the variance in ${outcome}. ` +
        `For every 1-unit increase in ${predictor}, ${outcome} changes by ${formatNum(slope)} units. ` +
        `The model is ${significanceLabel(p)}${p !== undefined ? ` (${pLabel(p)}).` : '.'}`,
    )

    // Interpret R² strength
    if (r2 !== undefined) {
      if (r2 >= 0.7) {
        paragraphs.push(
          `With an R² of ${formatNum(r2)}, this model captures a large proportion of the variability in the outcome — a strong fit.`,
        )
      } else if (r2 >= 0.4) {
        paragraphs.push(
          `The R² of ${formatNum(r2)} indicates a moderate fit. The predictor explains some variance, but other factors likely also play a role.`,
        )
      } else {
        paragraphs.push(
          `The low R² (${formatNum(r2)}) suggests the predictor alone does not explain much of the variability. Consider additional predictors or a different model.`,
        )
      }
    }

    // Intercept context
    if (intercept !== undefined) {
      paragraphs.push(
        `When ${predictor} equals zero, the predicted value of ${outcome} is ${formatNum(intercept)} (the y-intercept).`,
      )
    }

    // Direction of relationship
    if (slope > 0) {
      paragraphs.push(`There is a positive relationship — as ${predictor} increases, ${outcome} tends to increase.`)
    } else {
      paragraphs.push(`There is a negative relationship — as ${predictor} increases, ${outcome} tends to decrease.`)
    }

    badges.push(
      {
        label: 'R²',
        value: r2 !== undefined ? formatNum(r2) : 'N/A',
        color: 'bg-blue-500/15 text-blue-300',
      },
      { label: 'Slope', value: formatNum(slope), color: 'bg-amber-500/15 text-amber-300' },
      { label: 'Intercept', value: formatNum(intercept ?? 0), color: 'bg-purple-500/15 text-purple-300' },
      { label: 'N', value: String(n ?? '?'), color: 'bg-slate-500/15 text-slate-300' },
    )

    if (p !== undefined) {
      badges.push({
        label: p < 0.05 ? 'Significant' : 'Not Significant',
        value: pLabel(p),
        color: p < 0.05 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300',
      })
    }
  }

  followUpHints.push(
    'Are the regression assumptions met?',
    'What are the residuals like?',
    'Would adding more predictors improve the model?',
  )

  return { paragraphs, badges, followUpHints }
}

function interpretComparison(
  results: Record<string, any>,
  varNames?: string[],
): InterpretationOutput {
  const paragraphs: string[] = []
  const badges: StatBadge[] = []
  const followUpHints: string[] = []

  const mean1 = results.mean1 ?? results.M1 ?? results['Group 1 Mean']
  const mean2 = results.mean2 ?? results.M2 ?? results['Group 2 Mean']
  const sd1 = results.sd1 ?? results.SD1 ?? results['Group 1 SD']
  const sd2 = results.sd2 ?? results.SD2 ?? results['Group 2 SD']
  const n1 = results.n1 ?? results.N1 ?? results['Group 1 N']
  const n2 = results.n2 ?? results.N2 ?? results['Group 2 N']
  const t = results.t ?? results['t-statistic'] ?? results.tStat
  const p = results.p ?? results['p-value'] ?? results.pValue
  const df = results.df ?? results.DF
  const cohensD = results.cohensD ?? results["Cohen's d"] ?? results.effectSize

  const group1 = varNames?.[0] ?? 'Group 1'
  const group2 = varNames?.[1] ?? 'Group 2'

  paragraphs.push(
    `${group1} (M = ${formatNum(mean1 ?? 0)}, SD = ${formatNum(sd1 ?? 0)}) vs ${group2} (M = ${formatNum(mean2 ?? 0)}, SD = ${formatNum(sd2 ?? 0)}). `,
  )

  const diff = (mean1 ?? 0) - (mean2 ?? 0)
  paragraphs.push(`The mean difference is ${formatNum(Math.abs(diff))} units (${group1} is ${diff > 0 ? 'higher' : 'lower'}). `)

  paragraphs.push(
    `This difference is ${significanceLabel(p)}${p !== undefined ? ` (${pLabel(p)}).` : '.'}`,
  )

  if (t !== undefined) {
    paragraphs.push(
      `The test statistic is t${df !== undefined ? `(${df})` : ''} = ${formatNum(t)}.`,
    )
  }

  if (cohensD !== undefined) {
    const absD = Math.abs(cohensD)
    let effectDesc = 'negligible'
    if (absD >= 0.8) effectDesc = 'large'
    else if (absD >= 0.5) effectDesc = 'medium'
    else if (absD >= 0.2) effectDesc = 'small'

    paragraphs.push(
      `The effect size (Cohen's d = ${formatNum(cohensD)}) indicates a ${effectDesc} practical effect.`,
    )

    badges.push({
      label: "Cohen's d",
      value: formatNum(cohensD),
      color: 'bg-purple-500/15 text-purple-300',
    })
  }

  badges.push(
    {
      label: group1,
      value: `M=${formatNum(mean1 ?? 0)}`,
      color: 'bg-blue-500/15 text-blue-300',
    },
    {
      label: group2,
      value: `M=${formatNum(mean2 ?? 0)}`,
      color: 'bg-amber-500/15 text-amber-300',
    },
    { label: 'N', value: `${n1 ?? '?'} / ${n2 ?? '?'}`, color: 'bg-slate-500/15 text-slate-300' },
  )

  if (p !== undefined) {
    badges.push({
      label: p < 0.05 ? 'Significant' : 'Not Significant',
      value: pLabel(p),
      color: p < 0.05 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300',
    })
  }

  followUpHints.push(
    'What is the effect size?',
    'Are the assumptions of the test met?',
    'What would a non-parametric test show?',
  )

  return { paragraphs, badges, followUpHints }
}

/**
 * Pure-JS heuristic interpreter – no API call needed.
 * Takes analysis results and produces a natural-language interpretation.
 */
export function interpretResults(
  analysisType: AnalysisType,
  results: Record<string, any>,
  variableNames?: string[],
): InterpretationOutput {
  switch (analysisType) {
    case 'descriptive':
      return interpretDescriptive(results, variableNames)
    case 'correlation':
      return interpretCorrelation(results, variableNames)
    case 'regression':
      return interpretRegression(results, variableNames)
    case 'comparison':
      return interpretComparison(results, variableNames)
    default: {
      const _exhaustive: never = analysisType
      return { paragraphs: [], badges: [], followUpHints: [] }
    }
  }
}

// ---------------------------------------------------------------------------
// Mock follow-up answers
// ---------------------------------------------------------------------------

function mockFollowUp(question: string, analysisType: AnalysisType): string {
  const q = question.toLowerCase()

  if (q.includes('outlier')) {
    return 'Based on the standard deviation and range, potential outliers would be values more than 3 standard deviations from the mean. Consider using a box plot or z-scores to identify specific data points that may be unusually extreme.'
  }
  if (q.includes('distribution') || q.includes('normal')) {
    return 'To assess normality, you should check the skewness and kurtosis values. A skewness close to 0 and kurtosis close to 3 suggests approximate normality. A Shapiro-Wilk or Kolmogorov-Smirnov test could provide a formal assessment.'
  }
  if (q.includes('confound') || q.includes('third variable')) {
    return 'A confounding variable could influence both variables and create a spurious correlation. Consider running a partial correlation controlling for potential confounders, or use multiple regression to isolate the unique effect of each predictor.'
  }
  if (q.includes('residual') || q.includes('assumption')) {
    return 'Key regression assumptions include: linearity (check residual vs. fitted plots), homoscedasticity (constant variance of residuals), normality of residuals (Q-Q plot), and independence of observations. Violations may require transformations or robust methods.'
  }
  if (q.includes('effect size') || q.includes('practical')) {
    return 'Effect size measures the magnitude of the difference, independent of sample size. For t-tests, Cohen\'s d is commonly used: 0.2 (small), 0.5 (medium), 0.8 (large). For regression, R² itself is an effect size measure.'
  }
  if (q.includes('scatter') || q.includes('plot') || q.includes('visual')) {
    return 'A scatter plot would help visualize the relationship between the variables. Look for linearity, outliers, and the overall pattern. The regression line on the plot shows the best-fit linear trend.'
  }

  // Generic responses
  const genericByType: Record<AnalysisType, string> = {
    descriptive:
      'Good question! For descriptive statistics, you might want to explore the data further by looking at frequency distributions, percentiles, or visualizations like histograms and box plots.',
    correlation:
      'Interesting point! When interpreting correlations, remember that correlation does not imply causation. The observed relationship could be due to a third variable or bidirectional causality.',
    regression:
      'Great question! In regression analysis, you might consider checking for multicollinearity, influential points (Cook\'s distance), and whether the relationship is truly linear.',
    comparison:
      'Good thinking! When comparing groups, consider whether the groups are independent or paired, and whether the data meets the assumptions of the parametric test you\'re using.',
  }

  return genericByType[analysisType]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AIInterpretation({
  analysisType,
  results,
  variableNames,
}: AIInterpretationProps) {
  const [copied, setCopied] = useState(false)
  const [followUpInput, setFollowUpInput] = useState('')
  const [followUpHistory, setFollowUpHistory] = useState<{ q: string; a: string }[]>([])
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [answeringFollowUp, setAnsweringFollowUp] = useState(false)

  const interpretation = useMemo(
    () => interpretResults(analysisType, results, variableNames),
    [analysisType, results, variableNames],
  )

  // Derive a stable key from inputs to track when results change
  const loadKey = useMemo(
    () => `${analysisType}-${JSON.stringify(results)}-${variableNames?.join(',')}`,
    [analysisType, results, variableNames],
  )

  // Simulated loading state (1.5s sparkle animation) — no synchronous setState in effect
  const [resolvedKey, setResolvedKey] = useState<string | null>(null)
  const loading = resolvedKey !== loadKey

  useEffect(() => {
    const timer = setTimeout(() => setResolvedKey(loadKey), 1500)
    return () => clearTimeout(timer)
  }, [loadKey])

  const handleCopy = useCallback(async () => {
    const text = interpretation.paragraphs.join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [interpretation])

  const handleSendFollowUp = useCallback(() => {
    if (!followUpInput.trim()) return
    const question = followUpInput.trim()
    setFollowUpInput('')
    setAnsweringFollowUp(true)

    // Simulate a brief "thinking" delay
    setTimeout(() => {
      const answer = mockFollowUp(question, analysisType)
      setFollowUpHistory((prev) => [...prev, { q: question, a: answer }])
      setAnsweringFollowUp(false)
    }, 800)
  }, [followUpInput, analysisType])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSendFollowUp()
      }
    },
    [handleSendFollowUp],
  )

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  // Sparkle particle positions (deterministic)
  const sparkles = [
    { top: '12%', left: '15%', delay: 0 },
    { top: '8%', left: '55%', delay: 0.15 },
    { top: '22%', left: '85%', delay: 0.3 },
    { top: '45%', left: '92%', delay: 0.1 },
    { top: '70%', left: '80%', delay: 0.25 },
    { top: '85%', left: '50%', delay: 0.2 },
    { top: '75%', left: '10%', delay: 0.35 },
    { top: '55%', left: '5%', delay: 0.05 },
  ]

  return (
    <Card className="relative overflow-hidden bg-gradient-to-r from-primary/5 to-accent/5 border-primary/10">
      {/* Sparkle animation overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-10"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {sparkles.map((s, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{ top: s.top, left: s.left }}
                initial={{ opacity: 0, scale: 0, rotate: 0 }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.2, 1, 0.5], rotate: [0, 180, 360] }}
                transition={{ duration: 1.6, delay: s.delay, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.3 }}
              >
                <Sparkles className="size-5 text-primary/70" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="size-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">AI Interpretation</CardTitle>
            <CardDescription className="text-xs">
              {analysisType === 'descriptive' && 'Descriptive Statistics Summary'}
              {analysisType === 'correlation' && 'Correlation Analysis Summary'}
              {analysisType === 'regression' && 'Regression Analysis Summary'}
              {analysisType === 'comparison' && 'Group Comparison Summary'}
            </CardDescription>
          </div>
        </div>
        <CardAction>
          {!loading && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
              <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
                {copied ? (
                  <>
                    <Check className="size-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Copy Summary</span>
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </CardAction>
      </CardHeader>

      {/* Content */}
      <CardContent className="space-y-4">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-9/12" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* Badges */}
              {interpretation.badges.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {interpretation.badges.map((badge, i) => (
                    <motion.div
                      key={`${badge.label}-${i}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-1 text-xs font-medium">
                        <span className="text-muted-foreground">{badge.label}:</span>
                        <span className={`rounded-md px-1.5 py-0.5 ${badge.color}`}>
                          {badge.value}
                        </span>
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Paragraphs */}
              <div className="space-y-3">
                {interpretation.paragraphs.map((text, i) => (
                  <motion.p
                    key={i}
                    className="text-sm leading-relaxed text-foreground/90"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                  >
                    {text.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                      part.startsWith('**') && part.endsWith('**') ? (
                        <strong key={j} className="font-semibold text-foreground">
                          {part.slice(2, -2)}
                        </strong>
                      ) : (
                        <span key={j}>{part}</span>
                      ),
                    )}
                  </motion.p>
                ))}
              </div>

              {/* Follow-up Q&A history */}
              {followUpHistory.length > 0 && (
                <div className="space-y-3 border-t border-border/50 pt-3">
                  {followUpHistory.map((item, i) => (
                    <motion.div
                      key={i}
                      className="space-y-2 rounded-lg bg-muted/40 p-3"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-start gap-2">
                        <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        <p className="text-sm font-medium text-foreground">{item.q}</p>
                      </div>
                      <p className="pl-5.5 text-sm leading-relaxed text-foreground/80">{item.a}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Answering indicator */}
              {answeringFollowUp && (
                <motion.div
                  className="flex items-center gap-2 text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex gap-1">
                    <span className="inline-block size-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:0ms]" />
                    <span className="inline-block size-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:150ms]" />
                    <span className="inline-block size-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:300ms]" />
                  </div>
                  <span className="text-xs">Analyzing your question…</span>
                </motion.div>
              )}

              {/* Follow-up toggle / input */}
              {!loading && (
                <div className="border-t border-border/50 pt-3">
                  {!showFollowUp ? (
                    <div className="flex flex-wrap gap-1.5">
                      {interpretation.followUpHints.slice(0, 3).map((hint, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setFollowUpInput(hint)
                            setShowFollowUp(true)
                          }}
                          className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                        >
                          {hint}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowFollowUp(true)}
                        className="rounded-full border border-dashed border-primary/30 px-3 py-1 text-xs text-primary/70 transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                      >
                        Ask a question…
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={followUpInput}
                        onChange={(e) => setFollowUpInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a follow-up question about these results…"
                        className="flex-1 text-sm"
                        disabled={answeringFollowUp}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleSendFollowUp}
                        disabled={!followUpInput.trim() || answeringFollowUp}
                        className="shrink-0"
                      >
                        <Send className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

export default AIInterpretation
