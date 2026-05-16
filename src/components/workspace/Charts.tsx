'use client'

import React, { useRef, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { toPng } from 'html-to-image'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

const CHART_COLORS = [
  'oklch(0.62 0.22 262.881)',  // purple
  'oklch(0.72 0.15 175)',      // teal
  'oklch(0.65 0.20 340)',      // rose
  'oklch(0.75 0.18 80)',       // amber
  'oklch(0.70 0.15 145)',      // green
  'oklch(0.68 0.20 30)',       // orange
  'oklch(0.60 0.20 300)',      // violet
  'oklch(0.75 0.15 60)',       // yellow
]

export function exportChartAsImage(ref: React.RefObject<HTMLDivElement | null>, filename = 'chart.png') {
  if (!ref.current) return
  toPng(ref.current, { backgroundColor: '#fff', pixelRatio: 2 })
    .then(dataUrl => {
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = filename
      a.click()
    })
    .catch(() => {})
}

/* ─── Bar Chart ─── */
interface BarChartDataItem {
  name: string
  [key: string]: string | number
}

export function ChartBar({
  data,
  bars,
  title,
}: {
  data: BarChartDataItem[]
  bars: { key: string; color?: string; label?: string }[]
  title?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref} className="bg-white rounded-lg p-3">
      {title && <p className="text-xs font-semibold text-gray-700 mb-2">{title}</p>}
      <div className="flex justify-end mb-1">
        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => exportChartAsImage(ref, `${title || 'bar-chart'}.png`)}>
          <Download className="size-3" /> PNG
        </Button>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {bars.map((bar, i) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              fill={bar.color || CHART_COLORS[i % CHART_COLORS.length]}
              name={bar.label || bar.key}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ─── Line Chart ─── */
interface LineChartDataItem {
  name: string
  [key: string]: string | number
}

export function ChartLine({
  data,
  lines,
  title,
}: {
  data: LineChartDataItem[]
  lines: { key: string; color?: string; label?: string }[]
  title?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref} className="bg-white rounded-lg p-3">
      {title && <p className="text-xs font-semibold text-gray-700 mb-2">{title}</p>}
      <div className="flex justify-end mb-1">
        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => exportChartAsImage(ref, `${title || 'line-chart'}.png`)}>
          <Download className="size-3" /> PNG
        </Button>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {lines.map((line, i) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color || CHART_COLORS[i % CHART_COLORS.length]}
              name={line.label || line.key}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ─── Scatter Plot (with optional regression line) ─── */
export function ChartScatter({
  data,
  xKey,
  yKey,
  title,
  regression,
}: {
  data: { x: number; y: number }[]
  xKey?: string
  yKey?: string
  title?: string
  regression?: { slope: number; intercept: number }
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Build regression line data
  const regData = regression && data.length > 1
    ? (() => {
        const xs = data.map(d => d.x)
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        return [
          { x: minX, y: regression.slope * minX + regression.intercept },
          { x: maxX, y: regression.slope * maxX + regression.intercept },
        ]
      })()
    : []

  return (
    <div ref={ref} className="bg-white rounded-lg p-3">
      {title && <p className="text-xs font-semibold text-gray-700 mb-2">{title}</p>}
      <div className="flex justify-end mb-1">
        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => exportChartAsImage(ref, `${title || 'scatter'}.png`)}>
          <Download className="size-3" /> PNG
        </Button>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="x" name={xKey || 'X'} tick={{ fontSize: 11 }} />
          <YAxis dataKey="y" name={yKey || 'Y'} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name={title || 'Data'} data={data} fill={CHART_COLORS[0]} />
          {regData.length === 2 && (
            <Line
              type="linear"
              dataKey="y"
              data={regData}
              stroke={CHART_COLORS[1]}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              name="Regression"
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ─── Pie Chart ─── */
export function ChartPie({
  data,
  title,
}: {
  data: { name: string; value: number }[]
  title?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref} className="bg-white rounded-lg p-3">
      {title && <p className="text-xs font-semibold text-gray-700 mb-2">{title}</p>}
      <div className="flex justify-end mb-1">
        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => exportChartAsImage(ref, `${title || 'pie-chart'}.png`)}>
          <Download className="size-3" /> PNG
        </Button>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ─── Histogram ─── */
export function ChartHistogram({
  values,
  bins = 10,
  title,
  color,
}: {
  values: number[]
  bins?: number
  title?: string
  color?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const validNums = values.filter(v => typeof v === 'number' && !isNaN(v))
  if (validNums.length < 2) return null

  const min = Math.min(...validNums)
  const max = Math.max(...validNums)
  const range = max - min || 1
  const binWidth = range / bins

  const histogramData = Array.from({ length: bins }, (_, i) => {
    const lower = min + i * binWidth
    const upper = lower + binWidth
    const label = lower.toFixed(1) + '-' + upper.toFixed(1)
    const count = validNums.filter(v => v >= lower && (i === bins - 1 ? v <= upper : v < upper)).length
    return { name: label, count }
  })

  return (
    <div ref={ref} className="bg-white rounded-lg p-3">
      {title && <p className="text-xs font-semibold text-gray-700 mb-2">{title}</p>}
      <div className="flex justify-end mb-1">
        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => exportChartAsImage(ref, `${title || 'histogram'}.png`)}>
          <Download className="size-3" /> PNG
        </Button>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={histogramData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(bins / 6) - 1)} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="count" fill={color || CHART_COLORS[0]} name="Frequency" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ─── Box Plot (manual implementation using Recharts) ─── */
export function ChartBoxPlot({
  groups,
  title,
}: {
  groups: { name: string; values: number[] }[]
  title?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Compute box plot stats per group
  const boxData = groups.map(g => {
    const sorted = [...g.values].sort((a, b) => a - b)
    const n = sorted.length
    if (n === 0) return null
    const q1 = sorted[Math.floor(n * 0.25)]
    const median = sorted[Math.floor(n * 0.5)]
    const q3 = sorted[Math.floor(n * 0.75)]
    const min = sorted[0]
    const max = sorted[n - 1]
    const iqr = q3 - q1
    const whiskerLow = Math.max(min, q1 - 1.5 * iqr)
    const whiskerHigh = Math.min(max, q3 + 1.5 * iqr)
    return { name: g.name, min, q1, median, q3, max, whiskerLow, whiskerHigh, mean: g.values.reduce((a, b) => a + b, 0) / n }
  }).filter(Boolean) as NonNullable<ReturnType<typeof boxData>>[number][]

  if (boxData.length === 0) return null

  const globalMin = Math.min(...boxData.map(d => d.min))
  const globalMax = Math.max(...boxData.map(d => d.max))
  const range = globalMax - globalMin || 1
  const chartH = 280
  const pad = 40

  const yScale = (v: number) => pad + (1 - (v - globalMin) / range) * (chartH - 2 * pad)

  return (
    <div ref={ref} className="bg-white rounded-lg p-3">
      {title && <p className="text-xs font-semibold text-gray-700 mb-2">{title}</p>}
      <div className="flex justify-end mb-1">
        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => exportChartAsImage(ref, `${title || 'boxplot'}.png`)}>
          <Download className="size-3" /> PNG
        </Button>
      </div>
      <svg width="100%" viewBox={`0 0 ${Math.max(400, boxData.length * 80 + 60)} ${chartH + 20}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(p => {
          const val = globalMin + p * range
          const y = yScale(val)
          return (
            <g key={p}>
              <line x1="40" y1={y} x2={boxData.length * 80 + 50} y2={y} stroke="#e5e7eb" strokeDasharray="3 3" />
              <text x="35" y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">{val.toFixed(1)}</text>
            </g>
          )
        })}
        {/* Boxes */}
        {boxData.map((d, i) => {
          const cx = 60 + i * 80
          const bw = 50
          const x1 = cx - bw / 2
          const x2 = cx + bw / 2
          return (
            <g key={d.name}>
              {/* Whiskers */}
              <line x1={cx} y1={yScale(d.whiskerLow)} x2={cx} y2={yScale(d.q1)} stroke="#374151" strokeWidth="1.5" />
              <line x1={cx} y1={yScale(d.q3)} x2={cx} y2={yScale(d.whiskerHigh)} stroke="#374151" strokeWidth="1.5" />
              <line x1={x1 + 5} y1={yScale(d.whiskerLow)} x2={x2 - 5} y2={yScale(d.whiskerLow)} stroke="#374151" strokeWidth="1.5" />
              <line x1={x1 + 5} y1={yScale(d.whiskerHigh)} x2={x2 - 5} y2={yScale(d.whiskerHigh)} stroke="#374151" strokeWidth="1.5" />
              {/* Box */}
              <rect x={x1} y={yScale(d.q3)} width={bw} height={Math.max(1, yScale(d.q1) - yScale(d.q3))}
                fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.25} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth="2" rx="2" />
              {/* Median */}
              <line x1={x1} y1={yScale(d.median)} x2={x2} y2={yScale(d.median)} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth="2.5" />
              {/* Mean dot */}
              <circle cx={cx} cy={yScale(d.mean)} r="3" fill={CHART_COLORS[i % CHART_COLORS.length]} />
              {/* Label */}
              <text x={cx} y={chartH + 10} textAnchor="middle" fontSize="10" fill="#374151">{d.name}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// Helper to create scatter data from store data
export function makeScatterData(x: number[], y: number[]): { x: number; y: number }[] {
  const data: { x: number; y: number }[] = []
  const n = Math.min(x.length, y.length, 200)
  for (let i = 0; i < n; i++) {
    if (typeof x[i] === 'number' && !isNaN(x[i]) && typeof y[i] === 'number' && !isNaN(y[i])) {
      data.push({ x: x[i], y: y[i] })
    }
  }
  return data
}

// Helper to create frequency data for bar chart
export function makeFrequencyBarData(values: (string | number | null | undefined)[]): { name: string; count: number }[] {
  const freq = new Map<string, number>()
  for (const v of values) {
    if (v === '' || v === null || v === undefined) continue
    const key = String(v)
    freq.set(key, (freq.get(key) || 0) + 1)
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([name, count]) => ({ name, count }))
}

// Helper to create pie chart data
export function makePieData(values: (string | number | null | undefined)[]): { name: string; value: number }[] {
  return makeFrequencyBarData(values).slice(0, 10)
}
