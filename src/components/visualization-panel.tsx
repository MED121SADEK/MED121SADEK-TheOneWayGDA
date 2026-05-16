'use client'

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart as RechartsBarChart,
  Bar,
  ScatterChart as RechartsScatterChart,
  Scatter,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  ComposedChart,
  Area,
  Rectangle,
} from 'recharts'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Download,
  Image,
  FileText,
  Copy,
  Palette,
  Sun,
  Moon,
  BookOpen,
  Maximize2,
  ScatterChart as ScatterChartIcon,
  Box,
  Activity,
  TableProperties,
  Check,
  Minimize2,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

export type ChartType = 'bar' | 'scatter' | 'line' | 'pie' | 'histogram' | 'box'
export type ThemePreset = 'dark' | 'light' | 'publication'
export type PaletteId = 'vibrant' | 'pastel' | 'earth' | 'ocean' | 'sunset' | 'monochrome'

export interface VisualizationPanelProps {
  analysisType: 'descriptive' | 'correlation' | 'regression' | 'distribution' | 'comparison'
  data: Record<string, any[]>
  results?: Record<string, any>
  variables?: string[]
  className?: string
}

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const COLOR_PALETTES: Record<PaletteId, { name: string; colors: string[]; preview: string[] }> = {
  vibrant: {
    name: 'Vibrant',
    colors: ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'],
    preview: ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'],
  },
  pastel: {
    name: 'Pastel',
    colors: ['#a5b4fc', '#fca5a5', '#6ee7b7', '#fcd34d', '#c4b5fd', '#67e8f9', '#f9a8d4', '#bef264'],
    preview: ['#a5b4fc', '#fca5a5', '#6ee7b7', '#fcd34d', '#c4b5fd', '#67e8f9'],
  },
  earth: {
    name: 'Earth',
    colors: ['#92400e', '#b45309', '#ca8a04', '#65a30d', '#15803d', '#0e7490', '#7c3aed', '#be185d'],
    preview: ['#92400e', '#b45309', '#ca8a04', '#65a30d', '#15803d', '#0e7490'],
  },
  ocean: {
    name: 'Ocean',
    colors: ['#0369a1', '#0891b2', '#059669', '#0d9488', '#4f46e5', '#7c3aed', '#2563eb', '#0284c7'],
    preview: ['#0369a1', '#0891b2', '#059669', '#0d9488', '#4f46e5', '#7c3aed'],
  },
  sunset: {
    name: 'Sunset',
    colors: ['#dc2626', '#ea580c', '#d97706', '#ca8a04', '#e11d48', '#be185d', '#f43f5e', '#f59e0b'],
    preview: ['#dc2626', '#ea580c', '#d97706', '#ca8a04', '#e11d48', '#be185d'],
  },
  monochrome: {
    name: 'Mono',
    colors: ['#18181b', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7', '#f4f4f5'],
    preview: ['#18181b', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8'],
  },
}

const THEME_CONFIGS: Record<ThemePreset, {
  name: string
  icon: React.ElementType
  bg: string
  text: string
  muted: string
  grid: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
  axisText: string
}> = {
  dark: {
    name: 'Dark',
    icon: Moon,
    bg: '#0f172a',
    text: '#e2e8f0',
    muted: '#475569',
    grid: '#1e293b',
    tooltipBg: '#1e293b',
    tooltipBorder: '#334155',
    tooltipText: '#e2e8f0',
    axisText: '#94a3b8',
  },
  light: {
    name: 'Light',
    icon: Sun,
    bg: '#ffffff',
    text: '#1e293b',
    muted: '#94a3b8',
    grid: '#f1f5f9',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e2e8f0',
    tooltipText: '#1e293b',
    axisText: '#64748b',
  },
  publication: {
    name: 'Publication',
    icon: BookOpen,
    bg: '#fefefe',
    text: '#111827',
    muted: '#6b7280',
    grid: '#f3f4f6',
    tooltipBg: '#ffffff',
    tooltipBorder: '#d1d5db',
    tooltipText: '#111827',
    axisText: '#374151',
  },
}

const CHART_TYPE_OPTIONS: { type: ChartType; icon: React.ElementType; label: string }[] = [
  { type: 'bar', icon: BarChart3, label: 'Bar Chart' },
  { type: 'scatter', icon: ScatterChartIcon, label: 'Scatter Plot' },
  { type: 'line', icon: TrendingUp, label: 'Line Chart' },
  { type: 'pie', icon: PieChartIcon, label: 'Pie Chart' },
  { type: 'histogram', icon: Activity, label: 'Histogram' },
  { type: 'box', icon: Box, label: 'Box Plot' },
]

/* ═══════════════════════════════════════════════════════════════
   STATISTICAL UTILITIES
   ═══════════════════════════════════════════════════════════════ */

function numericValues(arr: any[]): number[] {
  return arr.filter((v): v is number => typeof v === 'number' && !isNaN(v))
}

function calcMean(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function calcMedian(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function calcStdDev(nums: number[], mean?: number): number {
  if (nums.length < 2) return 0
  const m = mean ?? calcMean(nums)
  return Math.sqrt(nums.reduce((sum, x) => sum + (x - m) ** 2, 0) / (nums.length - 1))
}

function calcQuantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base])
  }
  return sorted[base]
}

interface BoxPlotStats {
  min: number
  q1: number
  median: number
  q3: number
  max: number
  mean: number
  outliers: number[]
  iqr: number
}

function calcBoxPlotStats(nums: number[]): BoxPlotStats | null {
  if (nums.length < 5) return null
  const sorted = [...nums].sort((a, b) => a - b)
  const q1 = calcQuantile(sorted, 0.25)
  const median = calcQuantile(sorted, 0.5)
  const q3 = calcQuantile(sorted, 0.75)
  const iqr = q3 - q1
  const lowerFence = q1 - 1.5 * iqr
  const upperFence = q3 + 1.5 * iqr
  const whiskerLow = Math.max(sorted[0], lowerFence)
  const whiskerHigh = Math.min(sorted[sorted.length - 1], upperFence)
  const outliers = nums.filter(x => x < lowerFence || x > upperFence)
  return {
    min: whiskerLow,
    q1,
    median,
    q3,
    max: whiskerHigh,
    mean: calcMean(nums),
    outliers,
    iqr,
  }
}

function calcHistogramBins(nums: number[], binCount?: number): { bin: string; range: [number, number]; count: number; mid: number }[] {
  if (nums.length === 0) return []
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  if (min === max) {
    return [{ bin: `${min}`, range: [min, max], count: nums.length, mid: min }]
  }
  const nBins = binCount ?? Math.max(5, Math.ceil(Math.sqrt(nums.length)))
  const binWidth = (max - min) / nBins
  const bins: { bin: string; range: [number, number]; count: number; mid: number }[] = []
  for (let i = 0; i < nBins; i++) {
    const lo = min + i * binWidth
    const hi = min + (i + 1) * binWidth
    const count = nums.filter(x => (i === nBins - 1 ? x >= lo && x <= hi : x >= lo && x < hi)).length
    bins.push({
      bin: `${lo.toFixed(1)}-${hi.toFixed(1)}`,
      range: [lo, hi],
      count,
      mid: (lo + hi) / 2,
    })
  }
  return bins
}

function calcLinearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } | null {
  if (x.length < 3) return null
  const n = x.length
  const mx = calcMean(x)
  const my = calcMean(y)
  let ssxy = 0, ssx = 0
  for (let i = 0; i < n; i++) {
    ssxy += (x[i] - mx) * (y[i] - my)
    ssx += (x[i] - mx) ** 2
  }
  if (ssx === 0) return null
  const slope = ssxy / ssx
  const intercept = my - slope * mx
  const ssRes = x.reduce((sum, xi, i) => sum + (y[i] - (slope * xi + intercept)) ** 2, 0)
  const ssTot = y.reduce((sum, yi) => sum + (yi - my) ** 2, 0)
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  return { slope, intercept, r2 }
}

function normalPDF(x: number, mean: number, std: number): number {
  if (std === 0) return 0
  return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / std) ** 2)
}

/* ═══════════════════════════════════════════════════════════════
   CUSTOM TOOLTIP
   ═══════════════════════════════════════════════════════════════ */

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; dataKey?: string }>
  label?: string | number
  themeConfig: typeof THEME_CONFIGS['dark']
  colors: string[]
}

function CustomTooltip({ active, payload, label, themeConfig, colors }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg px-3 py-2 shadow-xl border text-xs backdrop-blur-sm"
      style={{
        backgroundColor: themeConfig.tooltipBg,
        borderColor: themeConfig.tooltipBorder,
        color: themeConfig.tooltipText,
      }}
    >
      {label !== undefined && (
        <p className="font-semibold mb-1" style={{ color: themeConfig.tooltipText }}>
          {String(label)}
        </p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ backgroundColor: entry.color || colors[i % colors.length] }}
          />
          <span className="opacity-80">{entry.name || entry.dataKey || 'Value'}:</span>
          <span className="font-mono font-semibold" style={{ color: themeConfig.tooltipText }}>
            {typeof entry.value === 'number' ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   CHART TYPE SELECTOR
   ═══════════════════════════════════════════════════════════════ */

function ChartTypeSelector({
  activeType,
  onSelect,
  themeConfig,
}: {
  activeType: ChartType
  onSelect: (t: ChartType) => void
  themeConfig: typeof THEME_CONFIGS['dark']
}) {
  return (
    <div className="flex items-center gap-1">
      {CHART_TYPE_OPTIONS.map(({ type, icon: Icon, label }) => (
        <Button
          key={type}
          size="icon"
          variant="ghost"
          className={cn(
            'h-8 w-8 transition-all',
            activeType === type
              ? 'text-primary shadow-sm scale-105'
              : 'opacity-50 hover:opacity-100'
          )}
          style={{
            backgroundColor: activeType === type ? `${themeConfig.tooltipBg}22` : undefined,
          }}
          onClick={() => onSelect(type)}
          title={label}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   THEME TOGGLE
   ═══════════════════════════════════════════════════════════════ */

function ThemeToggle({
  theme,
  onChange,
  themeConfig,
}: {
  theme: ThemePreset
  onChange: (t: ThemePreset) => void
  themeConfig: typeof THEME_CONFIGS['dark']
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ backgroundColor: `${themeConfig.tooltipBg}44` }}>
      {(Object.keys(THEME_CONFIGS) as ThemePreset[]).map((key) => {
        const cfg = THEME_CONFIGS[key]
        const Icon = cfg.icon
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              'h-7 w-7 rounded-md flex items-center justify-center transition-all',
              theme === key ? 'bg-primary/20 text-primary shadow-sm' : 'opacity-50 hover:opacity-100'
            )}
            title={cfg.name}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PALETTE SELECTOR
   ═══════════════════════════════════════════════════════════════ */

function PaletteSelector({
  palette,
  onChange,
  themeConfig,
}: {
  palette: PaletteId
  onChange: (p: PaletteId) => void
  themeConfig: typeof THEME_CONFIGS['dark']
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Color Palette"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs font-semibold">Color Palette</DropdownMenuLabel>
        {(Object.keys(COLOR_PALETTES) as PaletteId[]).map((key) => (
          <DropdownMenuItem
            key={key}
            onClick={() => onChange(key)}
            className={cn('flex items-center gap-3 cursor-pointer py-2', palette === key && 'bg-accent')}
          >
            <div className="flex gap-0.5">
              {COLOR_PALETTES[key].preview.map((c, i) => (
                <span key={i} className="h-4 w-3 rounded-sm first:rounded-l-md last:rounded-r-md" style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs">{COLOR_PALETTES[key].name}</span>
              {palette === key && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ═══════════════════════════════════════════════════════════════
   EXPORT DROPDOWN
   ═══════════════════════════════════════════════════════════════ */

function ExportDropdown({
  chartRef,
  title,
  chartData,
}: {
  chartRef: React.RefObject<HTMLDivElement | null>
  title: string
  chartData: Record<string, any>[]
}) {
  const [copied, setCopied] = useState(false)

  const exportCSV = useCallback(() => {
    if (chartData.length === 0) return
    const headers = Object.keys(chartData[0])
    const csvRows = [headers.join(',')]
    for (const row of chartData) {
      csvRows.push(headers.map(h => {
        const val = row[h]
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`
        }
        return val
      }).join(','))
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, `${title || 'chart'}.csv`)
  }, [chartData, title])

  const exportSVG = useCallback(() => {
    const svgEl = chartRef.current?.querySelector('svg.recharts-surface') as SVGElement | null
    if (!svgEl) return
    const clone = svgEl.cloneNode(true) as SVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const svgData = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8;' })
    downloadBlob(blob, `${title || 'chart'}.svg`)
  }, [chartRef, title])

  const exportPNG = useCallback(() => {
    const svgEl = chartRef.current?.querySelector('svg.recharts-surface') as SVGElement | null
    if (!svgEl) return
    const clone = svgEl.cloneNode(true) as SVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const svgData = new XMLSerializer().serializeToString(clone)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8;' })
    const url = URL.createObjectURL(svgBlob)
    const img = new window.Image()
    img.onload = () => {
      const scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth * scale
      canvas.height = img.naturalHeight * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, `${title || 'chart'}.png`)
        URL.revokeObjectURL(url)
      }, 'image/png')
    }
    img.src = url
  }, [chartRef, title])

  const copyChart = useCallback(() => {
    const svgEl = chartRef.current?.querySelector('svg.recharts-surface') as SVGElement | null
    if (!svgEl) return
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const svgData = new XMLSerializer().serializeToString(svgEl)
    navigator.clipboard.writeText(svgData).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [chartRef])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={exportPNG} className="cursor-pointer gap-2.5">
          <Image className="h-4 w-4" />
          <span>Export as PNG</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportSVG} className="cursor-pointer gap-2.5">
          <FileText className="h-4 w-4" />
          <span>Export as SVG</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportCSV} className="cursor-pointer gap-2.5">
          <TableProperties className="h-4 w-4" />
          <span>Export as CSV</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyChart} className="cursor-pointer gap-2.5">
          <Copy className="h-4 w-4" />
          <span>{copied ? 'Copied!' : 'Copy Chart'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ═══════════════════════════════════════════════════════════════
   EDITABLE TITLE
   ═══════════════════════════════════════════════════════════════ */

function EditableTitle({
  value,
  onChange,
  themeConfig,
}: {
  value: string
  onChange: (v: string) => void
  themeConfig: typeof THEME_CONFIGS['dark']
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  useEffect(() => {
    setDraft(value)
  }, [value])

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false)
          if (draft.trim()) onChange(draft.trim())
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setEditing(false)
            if (draft.trim()) onChange(draft.trim())
          }
          if (e.key === 'Escape') {
            setEditing(false)
            setDraft(value)
          }
        }}
        className="text-lg font-bold bg-transparent border-b-2 border-primary outline-none px-1 py-0 w-full max-w-md"
        style={{ color: themeConfig.text }}
      />
    )
  }

  return (
    <h3
      className="text-lg font-bold cursor-pointer hover:opacity-70 transition-opacity truncate max-w-md px-1 py-0"
      style={{ color: themeConfig.text }}
      onClick={() => setEditing(true)}
      title="Click to edit title"
    >
      {value}
    </h3>
  )
}

/* ═══════════════════════════════════════════════════════════════
   EDITABLE AXIS LABEL
   ═══════════════════════════════════════════════════════════════ */

function EditableAxisLabel({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  useEffect(() => {
    setDraft(value)
  }, [value])

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false)
          if (draft.trim()) onChange(draft.trim())
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setEditing(false)
            if (draft.trim()) onChange(draft.trim())
          }
          if (e.key === 'Escape') {
            setEditing(false)
            setDraft(value)
          }
        }}
        className={cn("text-xs bg-transparent border-b border-primary outline-none px-1 py-0 w-24", className)}
      />
    )
  }

  return (
    <span
      className={cn("text-xs cursor-pointer hover:opacity-70 transition-opacity underline decoration-dotted underline-offset-2", className)}
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      {value}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════════
   DATA PREPARATION HELPERS
   ═══════════════════════════════════════════════════════════════ */

function prepareDataForCharts(
  data: Record<string, any[]>,
  variables: string[],
  analysisType: VisualizationPanelProps['analysisType'],
  results?: Record<string, any>
): {
  chartData: Record<string, any>[]
  barData: Record<string, any>[]
  scatterData: Record<string, any>[]
  lineData: Record<string, any>[]
  pieData: Record<string, any>[]
  histData: { bin: string; range: [number, number]; count: number; mid: number }[]
  boxData: { group: string; stats: BoxPlotStats }[]
  variableNames: { x: string; y: string }
} {
  const vars = variables && variables.length > 0 ? variables : Object.keys(data)
  const numericVars = vars.filter(v => numericValues(data[v] || []).length > 0)
  const allVars = vars.length > 0 ? vars : numericVars.length > 0 ? numericVars : ['value']
  const xVar = allVars[0] || 'x'
  const yVar = allVars[1] || allVars[0] || 'y'

  // Bar data - aggregate means or frequencies
  const barData: Record<string, any>[] = []
  if (analysisType === 'comparison' || analysisType === 'descriptive') {
    numericVars.slice(0, 8).forEach(v => {
      const vals = numericValues(data[v] || [])
      barData.push({
        name: v.length > 12 ? v.slice(0, 12) + '…' : v,
        fullName: v,
        mean: vals.length > 0 ? parseFloat(calcMean(vals).toFixed(3)) : 0,
        median: vals.length > 0 ? parseFloat(calcMedian(vals).toFixed(3)) : 0,
        count: vals.length,
        stddev: vals.length > 1 ? parseFloat(calcStdDev(vals).toFixed(3)) : 0,
      })
    })
  }

  // Scatter data
  const scatterData: Record<string, any>[] = []
  if (numericVars.length >= 2) {
    const xVals = numericValues(data[xVar] || [])
    const yVals = numericValues(data[yVar] || [])
    const len = Math.min(xVals.length, yVals.length, 200)
    for (let i = 0; i < len; i++) {
      scatterData.push({ x: xVals[i], y: yVals[i], index: i })
    }
  } else if (numericVars.length === 1) {
    const vals = numericValues(data[numericVars[0]] || []).slice(0, 200)
    vals.forEach((v, i) => scatterData.push({ x: i, y: v, index: i }))
  }

  // Line data - time series style
  const lineData: Record<string, any>[] = []
  if (numericVars.length >= 1) {
    const maxLen = Math.max(...numericVars.slice(0, 4).map(v => numericValues(data[v] || []).length), 0)
    const sampleLen = Math.min(maxLen, 100)
    for (let i = 0; i < sampleLen; i++) {
      const row: Record<string, any> = { index: i + 1 }
      numericVars.slice(0, 4).forEach(v => {
        const vals = numericValues(data[v] || [])
        row[v.length > 10 ? v.slice(0, 10) + '…' : v] = i < vals.length ? vals[i] : null
      })
      lineData.push(row)
    }
  }

  // Pie data - categorical frequency
  const pieData: Record<string, any>[] = []
  const primaryVar = numericVars[0] || allVars[0]
  if (primaryVar) {
    const rawValues = data[primaryVar] || []
    const freq: Record<string, number> = {}
    rawValues.forEach(v => {
      const key = String(v ?? 'missing')
      freq[key] = (freq[key] || 0) + 1
    })
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12)
    sorted.forEach(([name, value]) => {
      pieData.push({
        name: name.length > 18 ? name.slice(0, 18) + '…' : name,
        fullName: name,
        value,
      })
    })
  }

  // Histogram data
  const histData = numericVars.length > 0
    ? calcHistogramBins(numericValues(data[numericVars[0]] || []))
    : []

  // Box plot data
  const boxData: { group: string; stats: BoxPlotStats }[] = []
  numericVars.slice(0, 6).forEach(v => {
    const vals = numericValues(data[v] || [])
    const stats = calcBoxPlotStats(vals)
    if (stats) boxData.push({ group: v.length > 12 ? v.slice(0, 12) + '…' : v, stats })
  })

  // Generic chart data for CSV export
  const chartData = barData.length > 0 ? barData : scatterData.length > 0 ? scatterData : pieData.length > 0 ? pieData : histData.map(h => ({ bin: h.bin, count: h.count }))

  return {
    chartData,
    barData,
    scatterData,
    lineData,
    pieData,
    histData,
    boxData,
    variableNames: { x: xVar, y: yVar },
  }
}

/* ═══════════════════════════════════════════════════════════════
   INDIVIDUAL CHART COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

/* ─── BAR CHART ─── */
function BarChartView({
  data,
  colors,
  themeConfig,
  xAxisLabel,
  yAxisLabel,
  onAxisLabelChange,
}: {
  data: Record<string, any>[]
  colors: string[]
  themeConfig: typeof THEME_CONFIGS['dark']
  xAxisLabel: string
  yAxisLabel: string
  onAxisLabelChange: (axis: 'x' | 'y', label: string) => void
}) {
  if (data.length === 0) {
    return <EmptyState themeConfig={themeConfig} />
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 30 }}>
        <defs>
          {data.map((_, i) => (
            <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors[i % colors.length]} stopOpacity={0.9} />
              <stop offset="100%" stopColor={colors[i % colors.length]} stopOpacity={0.5} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={themeConfig.grid} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: themeConfig.axisText }}
          axisLine={{ stroke: themeConfig.muted }}
          tickLine={{ stroke: themeConfig.muted }}
          label={{
            value: xAxisLabel,
            position: 'insideBottom',
            offset: -15,
            style: { fontSize: 11, fill: themeConfig.axisText },
          }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: themeConfig.axisText }}
          axisLine={{ stroke: themeConfig.muted }}
          tickLine={{ stroke: themeConfig.muted }}
          label={{
            value: yAxisLabel,
            angle: -90,
            position: 'insideLeft',
            offset: 10,
            style: { fontSize: 11, fill: themeConfig.axisText },
          }}
        />
        <RechartsTooltip content={<CustomTooltip themeConfig={themeConfig} colors={colors} />} cursor={{ fill: `${themeConfig.grid}88` }} />
        <RechartsLegend wrapperStyle={{ fontSize: 11, color: themeConfig.axisText }} />
        <Bar dataKey="mean" radius={[4, 4, 0, 0]} animationDuration={1200} animationEasing="ease-out">
          {data.map((_, i) => (
            <Cell key={i} fill={`url(#barGrad${i})`} />
          ))}
        </Bar>
        <Bar dataKey="median" fill={colors[1 % colors.length]} fillOpacity={0.4} radius={[4, 4, 0, 0]} animationDuration={1200} animationEasing="ease-out" begin={300} />
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}

/* ─── SCATTER PLOT ─── */
function ScatterChartView({
  data,
  colors,
  themeConfig,
  xAxisLabel,
  yAxisLabel,
  onAxisLabelChange,
  showRegression,
  results,
  xVarName,
  yVarName,
}: {
  data: Record<string, any>[]
  colors: string[]
  themeConfig: typeof THEME_CONFIGS['dark']
  xAxisLabel: string
  yAxisLabel: string
  onAxisLabelChange: (axis: 'x' | 'y', label: string) => void
  showRegression: boolean
  results?: Record<string, any>
  xVarName: string
  yVarName: string
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const regression = useMemo(() => {
    if (!showRegression || data.length < 3) return null
    const xs = data.map(d => d.x)
    const ys = data.map(d => d.y)
    if (results?.slope !== undefined && results?.intercept !== undefined) {
      return { slope: results.slope, intercept: results.intercept, r2: results.r2 ?? 0 }
    }
    return calcLinearRegression(xs, ys)
  }, [showRegression, data, results])

  const regLine = useMemo(() => {
    if (!regression || data.length === 0) return []
    const { slope, intercept } = regression
    const xMin = Math.min(...data.map(d => d.x))
    const xMax = Math.max(...data.map(d => d.x))
    return [
      { x: xMin, y: slope * xMin + intercept },
      { x: xMax, y: slope * xMax + intercept },
    ]
  }, [regression, data])

  if (data.length === 0) {
    return <EmptyState themeConfig={themeConfig} />
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={350}>
        <RechartsScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={themeConfig.grid} />
          <XAxis
            dataKey="x"
            type="number"
            tick={{ fontSize: 11, fill: themeConfig.axisText }}
            axisLine={{ stroke: themeConfig.muted }}
            tickLine={{ stroke: themeConfig.muted }}
            name={xVarName}
            label={{
              value: xAxisLabel,
              position: 'insideBottom',
              offset: -15,
              style: { fontSize: 11, fill: themeConfig.axisText },
            }}
          />
          <YAxis
            dataKey="y"
            type="number"
            tick={{ fontSize: 11, fill: themeConfig.axisText }}
            axisLine={{ stroke: themeConfig.muted }}
            tickLine={{ stroke: themeConfig.muted }}
            name={yVarName}
            label={{
              value: yAxisLabel,
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              style: { fontSize: 11, fill: themeConfig.axisText },
            }}
          />
          <RechartsTooltip
            content={<CustomTooltip themeConfig={themeConfig} colors={colors} />}
            cursor={{ strokeDasharray: '3 3', stroke: themeConfig.muted }}
          />
          <RechartsLegend wrapperStyle={{ fontSize: 11 }} />
          {regression && regLine.length === 2 && (
            <Line
              data={regLine}
              dataKey="y"
              name={`Regression (R²=${regression.r2.toFixed(3)})`}
              stroke={colors[1]}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              legendType="none"
            />
          )}
          <Scatter
            data={data}
            fill={colors[0]}
            fillOpacity={0.7}
            animationDuration={800}
            onMouseDown={(_, index) => setActiveIndex(index === activeIndex ? null : index)}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={i === activeIndex ? colors[2] || colors[0] : colors[0]}
                fillOpacity={i === activeIndex ? 1 : 0.6}
                stroke={i === activeIndex ? themeConfig.text : 'transparent'}
                strokeWidth={i === activeIndex ? 2 : 0}
                r={i === activeIndex ? 8 : 5}
              />
            ))}
          </Scatter>
        </RechartsScatterChart>
      </ResponsiveContainer>
      {showRegression && regression && (
        <div className="absolute top-2 right-8 text-[10px] px-2 py-1 rounded-md backdrop-blur-sm" style={{ backgroundColor: themeConfig.tooltipBg, color: themeConfig.tooltipText, border: `1px solid ${themeConfig.tooltipBorder}` }}>
          R² = {regression.r2.toFixed(4)} · y = {regression.intercept.toFixed(2)} + {regression.slope.toFixed(2)}x
        </div>
      )}
    </div>
  )
}

/* ─── LINE CHART ─── */
function LineChartView({
  data,
  colors,
  themeConfig,
  yAxisLabel,
}: {
  data: Record<string, any>[]
  colors: string[]
  themeConfig: typeof THEME_CONFIGS['dark']
  yAxisLabel: string
  xAxisLabel?: string
  onAxisLabelChange?: (axis: 'x' | 'y', label: string) => void
}) {
  if (data.length === 0) {
    return <EmptyState themeConfig={themeConfig} />
  }

  const keys = Object.keys(data[0]).filter(k => k !== 'index')

  return (
    <ResponsiveContainer width="100%" height={350}>
      <RechartsLineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
        <defs>
          {keys.map((key, i) => (
            <linearGradient key={key} id={`areaGrad${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors[i % colors.length]} stopOpacity={0.3} />
              <stop offset="100%" stopColor={colors[i % colors.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={themeConfig.grid} />
        <XAxis
          dataKey="index"
          tick={{ fontSize: 11, fill: themeConfig.axisText }}
          axisLine={{ stroke: themeConfig.muted }}
          tickLine={{ stroke: themeConfig.muted }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: themeConfig.axisText }}
          axisLine={{ stroke: themeConfig.muted }}
          tickLine={{ stroke: themeConfig.muted }}
          label={{
            value: yAxisLabel,
            angle: -90,
            position: 'insideLeft',
            offset: 10,
            style: { fontSize: 11, fill: themeConfig.axisText },
          }}
        />
        <RechartsTooltip content={<CustomTooltip themeConfig={themeConfig} colors={colors} />} />
        <RechartsLegend wrapperStyle={{ fontSize: 11, color: themeConfig.axisText }} />
        {keys.map((key, i) => (
          <React.Fragment key={key}>
            <Area
              type="monotone"
              dataKey={key}
              stroke={colors[i % colors.length]}
              fill={`url(#areaGrad${i})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              animationDuration={1200}
            />
            <Line
              type="monotone"
              dataKey={key}
              stroke={colors[i % colors.length]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, stroke: themeConfig.tooltipBg, strokeWidth: 2, fill: colors[i % colors.length] }}
              animationDuration={1200}
              animationEasing="ease-out"
            />
          </React.Fragment>
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}

/* ─── PIE / DONUT CHART ─── */
function PieChartView({
  data,
  colors,
  themeConfig,
}: {
  data: Record<string, any>[]
  colors: string[]
  themeConfig: typeof THEME_CONFIGS['dark']
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const total = useMemo(() => data.reduce((s, d) => s + (d.value || 0), 0), [data])

  if (data.length === 0) {
    return <EmptyState themeConfig={themeConfig} />
  }

  return (
    <div className="flex items-center">
      <ResponsiveContainer width="60%" height={350}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            paddingAngle={2}
            dataKey="value"
            animationDuration={1000}
            animationEasing="ease-out"
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={colors[i % colors.length]}
                stroke={i === activeIndex ? themeConfig.text : 'transparent'}
                strokeWidth={i === activeIndex ? 2 : 0}
                opacity={activeIndex === null || activeIndex === i ? 1 : 0.5}
              />
            ))}
          </Pie>
          <RechartsTooltip
            content={<CustomTooltip themeConfig={themeConfig} colors={colors} />}
          />
          {/* Center label for donut hole */}
          <text
            x="50%"
            y="45%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={themeConfig.text}
            fontSize={24}
            fontWeight="bold"
          >
            {total.toLocaleString()}
          </text>
          <text
            x="50%"
            y="58%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={themeConfig.muted}
            fontSize={11}
          >
            Total
          </text>
        </RechartsPieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1.5 w-[38%] max-h-80 overflow-y-auto pr-2">
        {data.map((item, i) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
          return (
            <div
              key={i}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all cursor-pointer',
                activeIndex === i && 'bg-accent scale-[1.02]'
              )}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
              <span className="flex-1 truncate" style={{ color: themeConfig.text }} title={item.fullName || item.name}>
                {item.name}
              </span>
              <span className="font-mono font-semibold" style={{ color: themeConfig.text }}>
                {item.value}
              </span>
              <span className="text-[10px] opacity-60 w-10 text-right">
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── HISTOGRAM ─── */
function HistogramView({
  data,
  histData,
  colors,
  themeConfig,
  yAxisLabel,
  showNormalCurve,
  numericVarName,
}: {
  data: Record<string, any>[]
  histData: { bin: string; range: [number, number]; count: number; mid: number }[]
  colors: string[]
  themeConfig: typeof THEME_CONFIGS['dark']
  yAxisLabel: string
  showNormalCurve: boolean
  numericVarName: string
}) {
  const normalCurve = useMemo(() => {
    if (!showNormalCurve || data.length === 0) return []
    const nums = data.map(d => {
      const keys = Object.keys(d)
      const numKey = keys.find(k => typeof d[k] === 'number')
      return numKey ? d[numKey] : 0
    })
    const vals = numericValues(nums)
    if (vals.length < 5) return []
    const mean = calcMean(vals)
    const std = calcStdDev(vals, mean)
    if (std === 0) return []
    const nBins = histData.length
    const min = histData[0]?.range[0] ?? Math.min(...vals)
    const max = histData[nBins - 1]?.range[1] ?? Math.max(...vals)
    const step = (max - min) / (nBins * 4)
    const points: Record<string, any>[] = []
    const maxCount = Math.max(...histData.map(h => h.count), 1)
    const binWidth = (max - min) / nBins
    const scaleFactor = maxCount / (binWidth * normalPDF(mean, mean, std))
    for (let x = min; x <= max; x += step) {
      points.push({
        x: parseFloat(x.toFixed(2)),
        y: parseFloat((normalPDF(x, mean, std) * scaleFactor).toFixed(2)),
      })
    }
    return points
  }, [showNormalCurve, data, histData])

  if (histData.length === 0) {
    return <EmptyState themeConfig={themeConfig} />
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={histData} margin={{ top: 20, right: 30, left: 10, bottom: 30 }}>
        <defs>
          <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors[0]} stopOpacity={0.85} />
            <stop offset="100%" stopColor={colors[0]} stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={themeConfig.grid} />
        <XAxis
          dataKey="bin"
          tick={{ fontSize: 9, fill: themeConfig.axisText }}
          axisLine={{ stroke: themeConfig.muted }}
          tickLine={{ stroke: themeConfig.muted }}
          interval={Math.max(0, Math.floor(histData.length / 10) - 1)}
          label={{
            value: numericVarName,
            position: 'insideBottom',
            offset: -15,
            style: { fontSize: 11, fill: themeConfig.axisText },
          }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: themeConfig.axisText }}
          axisLine={{ stroke: themeConfig.muted }}
          tickLine={{ stroke: themeConfig.muted }}
          label={{
            value: yAxisLabel,
            angle: -90,
            position: 'insideLeft',
            offset: 10,
            style: { fontSize: 11, fill: themeConfig.axisText },
          }}
        />
        <RechartsTooltip
          content={<CustomTooltip themeConfig={themeConfig} colors={colors} />}
          cursor={{ fill: `${themeConfig.grid}88` }}
        />
        <Bar dataKey="count" fill="url(#histGrad)" radius={[2, 2, 0, 0]} animationDuration={1000} />
        {showNormalCurve && normalCurve.length > 0 && (
          <Line
            data={normalCurve}
            dataKey="y"
            stroke={colors[2] || '#ef4444'}
            strokeWidth={2}
            strokeDasharray="4 2"
            dot={false}
            name="Normal Curve"
            type="monotone"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

/* ─── BOX PLOT ─── */
function BoxPlotView({
  data,
  colors,
  themeConfig,
}: {
  data: { group: string; stats: BoxPlotStats }[]
  colors: string[]
  themeConfig: typeof THEME_CONFIGS['dark']
}) {
  if (data.length === 0) {
    return <EmptyState themeConfig={themeConfig} />
  }

  const allValues = data.flatMap(d => [d.stats.min, d.stats.max, ...d.stats.outliers])
  const globalMin = Math.min(...allValues)
  const globalMax = Math.max(...allValues)
  const padding = (globalMax - globalMin) * 0.1 || 1
  const yMin = globalMin - padding
  const yMax = globalMax + padding

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={themeConfig.grid} />
        <XAxis
          dataKey="group"
          tick={{ fontSize: 11, fill: themeConfig.axisText }}
          axisLine={{ stroke: themeConfig.muted }}
          tickLine={{ stroke: themeConfig.muted }}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 11, fill: themeConfig.axisText }}
          axisLine={{ stroke: themeConfig.muted }}
          tickLine={{ stroke: themeConfig.muted }}
        />
        <RechartsTooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]?.payload) return null
            const d = payload[0].payload
            const s = d.stats
            return (
              <div
                className="rounded-lg px-3 py-2 shadow-xl border text-xs"
                style={{ backgroundColor: themeConfig.tooltipBg, borderColor: themeConfig.tooltipBorder, color: themeConfig.tooltipText }}
              >
                <p className="font-semibold mb-1">{d.group}</p>
                <div className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between gap-6"><span>Min:</span><span className="font-mono">{s.min.toFixed(2)}</span></div>
                  <div className="flex justify-between gap-6"><span>Q1:</span><span className="font-mono">{s.q1.toFixed(2)}</span></div>
                  <div className="flex justify-between gap-6"><span>Median:</span><span className="font-mono">{s.median.toFixed(2)}</span></div>
                  <div className="flex justify-between gap-6"><span>Q3:</span><span className="font-mono">{s.q3.toFixed(2)}</span></div>
                  <div className="flex justify-between gap-6"><span>Max:</span><span className="font-mono">{s.max.toFixed(2)}</span></div>
                  <div className="flex justify-between gap-6"><span>Mean:</span><span className="font-mono">{s.mean.toFixed(2)}</span></div>
                  {s.outliers.length > 0 && (
                    <div className="flex justify-between gap-6"><span>Outliers:</span><span className="font-mono">{s.outliers.length}</span></div>
                  )}
                </div>
              </div>
            )
          }}
        />
        {/* Custom box plot rendering using ReferenceArea and ReferenceLine */}
        {data.map((item, i) => {
          const { stats } = item
          const xPos = (i / data.length) * 100 + 50 / data.length
          return (
            <React.Fragment key={i}>
              {/* Box (Q1 to Q3) */}
              <ReferenceArea
                y1={stats.q1}
                y2={stats.q3}
                fill={colors[i % colors.length]}
                fillOpacity={0.3}
                ifOverflow="extendDomain"
                shape={(props: any) => {
                  const { x, y, width, height } = props
                  return (
                    <rect
                      x={typeof x === 'number' ? x - 15 : x}
                      y={y}
                      width={30}
                      height={Math.abs(height)}
                      fill={colors[i % colors.length]}
                      fillOpacity={0.25}
                      stroke={colors[i % colors.length]}
                      strokeWidth={1.5}
                      rx={2}
                    />
                  )
                }}
              />
              {/* Median line */}
              <ReferenceLine
                y={stats.median}
                stroke={colors[i % colors.length]}
                strokeWidth={2.5}
                strokeDasharray=""
              />
              {/* Whisker lines */}
              <ReferenceLine
                y={stats.min}
                stroke={colors[i % colors.length]}
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
              <ReferenceLine
                y={stats.max}
                stroke={colors[i % colors.length]}
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
            </React.Fragment>
          )
        })}
        {/* Scatter outlier dots */}
        {data.map((item, i) => (
          <Scatter
            key={`outliers-${i}`}
            name={`${item.group} outliers`}
            data={item.stats.outliers.map(o => ({ x: i, y: o, group: item.group }))}
            fill={colors[i % colors.length]}
            shape={(props: any) => {
              const { cx, cy } = props
              return (
                <circle
                  cx={typeof cx === 'number' ? cx : 0}
                  cy={typeof cy === 'number' ? cy : 0}
                  r={4}
                  fill={colors[i % colors.length]}
                  fillOpacity={0.7}
                  stroke={colors[i % colors.length]}
                  strokeWidth={1}
                />
              )
            }}
          />
        ))}
        {/* Mean dots */}
        {data.map((item, i) => (
          <Scatter
            key={`mean-${i}`}
            name={`${item.group} mean`}
            data={[{ x: i, y: item.stats.mean, group: item.group }]}
            fill={colors[i % colors.length]}
            shape={(props: any) => {
              const { cx, cy } = props
              return (
                <g>
                  <line
                    x1={typeof cx === 'number' ? cx - 6 : -6}
                    y1={typeof cy === 'number' ? cy : 0}
                    x2={typeof cx === 'number' ? cx + 6 : 6}
                    y2={typeof cy === 'number' ? cy : 0}
                    stroke={colors[i % colors.length]}
                    strokeWidth={2}
                  />
                </g>
              )
            }}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

/* ═══════════════════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════════════════ */

function EmptyState({ themeConfig }: { themeConfig: typeof THEME_CONFIGS['dark'] }) {
  return (
    <div className="flex flex-col items-center justify-center h-[350px] gap-3 opacity-60">
      <BarChart3 className="h-12 w-12" style={{ color: themeConfig.muted }} />
      <p className="text-sm" style={{ color: themeConfig.muted }}>
        No data available for this chart type
      </p>
      <p className="text-xs" style={{ color: themeConfig.muted }}>
        Add numeric data variables to generate visualizations
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   FULLSCREEN OVERLAY
   ═══════════════════════════════════════════════════════════════ */

function FullscreenOverlay({
  isExpanded,
  onToggle,
  themeConfig,
  children,
}: {
  isExpanded: boolean
  onToggle: () => void
  themeConfig: typeof THEME_CONFIGS['dark']
  children: React.ReactNode
}) {
  if (!isExpanded) return <>{children}</>

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ backgroundColor: themeConfig.bg + 'ee' }}
        onClick={onToggle}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden"
          style={{
            backgroundColor: themeConfig.bg,
            border: `1px solid ${themeConfig.tooltipBorder}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4">
            <span className="text-sm font-medium" style={{ color: themeConfig.text }}>
              Fullscreen View
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggle}
            >
              <Minimize2 className="h-4 w-4" style={{ color: themeConfig.text }} />
            </Button>
          </div>
          <div className="px-4 pb-4" style={{ minHeight: '60vh' }}>
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ═══════════════════════════════════════════════════════════════
   DEFAULT CHART DATA FOR DEMO
   ═══════════════════════════════════════════════════════════════ */

const DEMO_DATA: Record<string, any[]> = {
  Age: [23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49, 51, 53, 55, 57, 59, 61, 28, 32, 36, 40, 44, 48, 52, 56, 30, 34, 38, 42, 46, 50, 54, 58],
  Score: [72, 78, 81, 85, 79, 88, 92, 87, 91, 76, 83, 95, 89, 82, 77, 90, 94, 86, 80, 73, 84, 88, 93, 75, 81, 96, 87, 79, 82, 90, 85, 78, 91, 83, 86, 89],
  Hours: [2, 3, 2.5, 4, 3.5, 5, 4.5, 3, 4, 2, 3.5, 5.5, 4, 3, 2.5, 5, 6, 4.5, 3.5, 2, 3, 4.5, 5, 2.5, 3, 6, 4, 3.5, 3, 5, 4, 3, 5.5, 3.5, 4, 4.5],
  Income: [3200, 3500, 3800, 4200, 4000, 4800, 5200, 4600, 5000, 3600, 4100, 5500, 4900, 4300, 3700, 5100, 5400, 4500, 3900, 3300, 4200, 4700, 5300, 3400, 3800, 5600, 4600, 3900, 4000, 5100, 4400, 3700, 5200, 4100, 4500, 4800],
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export function VisualizationPanel({
  analysisType,
  data,
  results,
  variables,
  className,
}: VisualizationPanelProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)

  // State
  const [chartType, setChartType] = useState<ChartType>(() => {
    switch (analysisType) {
      case 'correlation':
      case 'regression':
        return 'scatter'
      case 'distribution':
        return 'histogram'
      case 'comparison':
        return 'box'
      default:
        return 'bar'
    }
  })
  const [theme, setTheme] = useState<ThemePreset>('dark')
  const [palette, setPalette] = useState<PaletteId>('vibrant')
  const [title, setTitle] = useState(() => {
    switch (analysisType) {
      case 'descriptive': return 'Descriptive Statistics'
      case 'correlation': return 'Correlation Analysis'
      case 'regression': return 'Regression Analysis'
      case 'distribution': return 'Distribution Analysis'
      case 'comparison': return 'Group Comparison'
      default: return 'Data Visualization'
    }
  })
  const [xAxisLabel, setXAxisLabel] = useState('Categories')
  const [yAxisLabel, setYAxisLabel] = useState('Values')
  const [showRegression, setShowRegression] = useState(true)
  const [showNormalCurve, setShowNormalCurve] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  // Derived
  const themeConfig = THEME_CONFIGS[theme]
  const colors = COLOR_PALETTES[palette].colors

  // Use demo data if no real data
  const effectiveData = useMemo(() => {
    const hasData = Object.values(data).some(arr => arr && arr.length > 0)
    return hasData ? data : DEMO_DATA
  }, [data])

  const effectiveVars = useMemo(() => {
    if (variables && variables.length > 0) return variables
    return Object.keys(effectiveData)
  }, [variables, effectiveData])

  // Prepare chart data
  const prepared = useMemo(
    () => prepareDataForCharts(effectiveData, effectiveVars, analysisType, results),
    [effectiveData, effectiveVars, analysisType, results]
  )

  // Auto-set axis labels from variable names
  useEffect(() => {
    if (prepared.variableNames.x && prepared.variableNames.y) {
      setXAxisLabel(prepared.variableNames.x)
      setYAxisLabel(prepared.variableNames.y)
    }
  }, [prepared.variableNames])

  // Auto-switch chart type based on available data
  useEffect(() => {
    if (analysisType === 'correlation' || analysisType === 'regression') {
      if (prepared.scatterData.length < 3) setChartType('bar')
    }
  }, [analysisType, prepared.scatterData.length])

  // Current chart data for CSV export
  const currentChartData = useMemo(() => {
    switch (chartType) {
      case 'bar': return prepared.barData
      case 'scatter': return prepared.scatterData
      case 'line': return prepared.lineData
      case 'pie': return prepared.pieData
      case 'histogram': return prepared.histData.map(h => ({ bin: h.bin, count: h.count }))
      case 'box': return prepared.boxData.map(b => ({ group: b.group, ...b.stats }))
      default: return prepared.chartData
    }
  }, [chartType, prepared])

  const renderChart = useCallback(() => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChartView
            data={prepared.barData}
            colors={colors}
            themeConfig={themeConfig}
            xAxisLabel={xAxisLabel}
            yAxisLabel={yAxisLabel}
            onAxisLabelChange={(axis, label) => axis === 'x' ? setXAxisLabel(label) : setYAxisLabel(label)}
          />
        )
      case 'scatter':
        return (
          <ScatterChartView
            data={prepared.scatterData}
            colors={colors}
            themeConfig={themeConfig}
            xAxisLabel={xAxisLabel}
            yAxisLabel={yAxisLabel}
            onAxisLabelChange={(axis, label) => axis === 'x' ? setXAxisLabel(label) : setYAxisLabel(label)}
            showRegression={showRegression}
            results={results}
            xVarName={prepared.variableNames.x}
            yVarName={prepared.variableNames.y}
          />
        )
      case 'line':
        return (
          <LineChartView
            data={prepared.lineData}
            colors={colors}
            themeConfig={themeConfig}
            yAxisLabel={yAxisLabel}
          />
        )
      case 'pie':
        return (
          <PieChartView
            data={prepared.pieData}
            colors={colors}
            themeConfig={themeConfig}
          />
        )
      case 'histogram':
        return (
          <HistogramView
            data={prepared.histData.map(h => ({ value: h.count }))}
            histData={prepared.histData}
            colors={colors}
            themeConfig={themeConfig}
            yAxisLabel={yAxisLabel}
            showNormalCurve={showNormalCurve}
            numericVarName={prepared.variableNames.x}
          />
        )
      case 'box':
        return (
          <BoxPlotView
            data={prepared.boxData}
            colors={colors}
            themeConfig={themeConfig}
          />
        )
      default:
        return <EmptyState themeConfig={themeConfig} />
    }
  }, [
    chartType, prepared, colors, themeConfig, xAxisLabel, yAxisLabel,
    showRegression, showNormalCurve, results,
  ])

  return (
    <FullscreenOverlay
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      themeConfig={themeConfig}
    >
      <Card
        className={cn(
          'overflow-hidden transition-all duration-300',
          isExpanded && 'border-0 shadow-none',
          className
        )}
        style={{
          backgroundColor: isExpanded ? 'transparent' : themeConfig.bg,
          borderColor: isExpanded ? 'transparent' : themeConfig.tooltipBorder,
        }}
      >
        {/* Header */}
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <EditableTitle value={title} onChange={setTitle} themeConfig={themeConfig} />
            <CardAction>
              <div className="flex items-center gap-1">
                {/* Fullscreen toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isExpanded
                    ? <Minimize2 className="h-4 w-4" style={{ color: themeConfig.text }} />
                    : <Maximize2 className="h-4 w-4" style={{ color: themeConfig.text }} />
                  }
                </Button>

                {/* Theme toggle */}
                <ThemeToggle theme={theme} onChange={setTheme} themeConfig={themeConfig} />

                {/* Palette selector */}
                <PaletteSelector palette={palette} onChange={setPalette} themeConfig={themeConfig} />

                {/* Export dropdown */}
                <ExportDropdown
                  chartRef={chartContainerRef}
                  title={title}
                  chartData={currentChartData}
                />
              </div>
            </CardAction>
          </div>
        </CardHeader>

        {/* Toolbar: Chart type selector + options */}
        <div
          className="px-6 pb-2 flex items-center justify-between flex-wrap gap-2"
        >
          <ChartTypeSelector
            activeType={chartType}
            onSelect={setChartType}
            themeConfig={themeConfig}
          />

          <div className="flex items-center gap-2">
            {/* Scatter options */}
            {chartType === 'scatter' && (
              <label className="flex items-center gap-1.5 cursor-pointer text-xs" style={{ color: themeConfig.axisText }}>
                <input
                  type="checkbox"
                  checked={showRegression}
                  onChange={(e) => setShowRegression(e.target.checked)}
                  className="rounded border-gray-400"
                />
                Regression Line
              </label>
            )}

            {/* Histogram options */}
            {chartType === 'histogram' && (
              <label className="flex items-center gap-1.5 cursor-pointer text-xs" style={{ color: themeConfig.axisText }}>
                <input
                  type="checkbox"
                  checked={showNormalCurve}
                  onChange={(e) => setShowNormalCurve(e.target.checked)}
                  className="rounded border-gray-400"
                />
                Normal Curve
              </label>
            )}

            {/* Axis label editors for cartesian charts */}
            {['bar', 'scatter', 'line', 'histogram'].includes(chartType) && (
              <div className="hidden md:flex items-center gap-3 ml-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase tracking-wider opacity-40" style={{ color: themeConfig.axisText }}>X:</span>
                  <EditableAxisLabel value={xAxisLabel} onChange={setXAxisLabel} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase tracking-wider opacity-40" style={{ color: themeConfig.axisText }}>Y:</span>
                  <EditableAxisLabel value={yAxisLabel} onChange={setYAxisLabel} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chart Area */}
        <CardContent className="pt-0 pb-4" ref={chartContainerRef}>
          <AnimatePresence mode="wait">
            <motion.div
              key={chartType}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {renderChart()}
            </motion.div>
          </AnimatePresence>

          {/* Data summary footer */}
          {prepared.chartData.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="mt-3 pt-3 flex items-center justify-between text-[10px]"
              style={{ borderTop: `1px solid ${themeConfig.grid}`, color: themeConfig.muted }}
            >
              <span>{currentChartData.length} data points · {effectiveVars.length} variable(s)</span>
              <span>{CHART_TYPE_OPTIONS.find(o => o.type === chartType)?.label} · {THEME_CONFIGS[theme].name} · {COLOR_PALETTES[palette].name}</span>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </FullscreenOverlay>
  )
}

export default VisualizationPanel
