'use client'

import React, { useRef } from 'react'
import { toPng } from 'html-to-image'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QQPlotProps {
  values: number[]
  title?: string
}

// Approximate inverse of standard normal CDF (Beasley-Springer-Moro algorithm)
function normalQuantile(p: number): number {
  if (p <= 0) return -4
  if (p >= 1) return 4
  if (p < 0.5) return -normalQuantile(1 - p)

  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00,
  ]
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01,
    -1.328068155288572e+01,
  ]
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00,
  ]
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00]

  const pLow = 0.02425
  const pHigh = 1 - pLow

  let q: number, r: number

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  } else if (p <= pHigh) {
    q = p - 0.5
    r = q * q
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p))
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
}

export function QQPlot({ values, title }: QQPlotProps) {
  const ref = useRef<HTMLDivElement>(null)

  const validNums = values.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v)).sort((a, b) => a - b)
  if (validNums.length < 5) return null

  const n = validNums.length
  const points: { x: number; y: number }[] = []

  for (let i = 0; i < n; i++) {
    const p = (i + 0.5) / n
    const theoretical = normalQuantile(p)
    points.push({ x: theoretical, y: validNums[i] })
  }

  // Calculate bounds for axes
  const xMin = Math.min(points[0].x, -3.5)
  const xMax = Math.max(points[points.length - 1].x, 3.5)
  const yMin = points[0].y - 0.5
  const yMax = points[points.length - 1].y + 0.5
  const xRange = xMax - xMin || 1
  const yRange = yMax - yMin || 1

  const padLeft = 55
  const padRight = 20
  const padTop = 15
  const padBottom = 40
  const chartW = 340
  const chartH = 260
  const totalW = padLeft + chartW + padRight
  const totalH = padTop + chartH + padBottom

  const sx = (v: number) => padLeft + ((v - xMin) / xRange) * chartW
  const sy = (v: number) => padTop + (1 - (v - yMin) / yRange) * chartH

  const exportImage = () => {
    if (!ref.current) return
    toPng(ref.current, { backgroundColor: '#fff', pixelRatio: 2 })
      .then(dataUrl => {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `${title || 'qq-plot'}.png`
        a.click()
      })
      .catch(() => {})
  }

  // Generate axis ticks
  const xTicks = [-3, -2, -1, 0, 1, 2, 3].filter(v => v >= xMin && v <= xMax)
  const yStep = Math.max(0.5, Math.ceil(yRange / 6 * 2) / 2)
  const yStart = Math.ceil(yMin / yStep) * yStep
  const yTicks: number[] = []
  for (let v = yStart; v <= yMax; v += yStep) yTicks.push(v)

  return (
    <div ref={ref} className="bg-white dark:bg-zinc-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        {title && <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{title}</p>}
        <Button size="sm" variant="ghost" className="h-6 text-[10px] ml-auto" onClick={exportImage}>
          <Download className="size-3" /> PNG
        </Button>
      </div>
      <svg width="100%" viewBox={`0 0 ${totalW} ${totalH}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {xTicks.map(v => (
          <line key={`gx-${v}`} x1={sx(v)} y1={padTop} x2={sx(v)} y2={padTop + chartH} stroke="#e5e7eb" strokeWidth="0.5" />
        ))}
        {yTicks.map(v => (
          <line key={`gy-${v}`} x1={padLeft} y1={sy(v)} x2={padLeft + chartW} y2={sy(v)} stroke="#e5e7eb" strokeWidth="0.5" />
        ))}

        {/* Reference line (y = x scaled) */}
        <line
          x1={sx(Math.max(xMin, yMin))}
          y1={sy(Math.max(xMin, yMin))}
          x2={sx(Math.min(xMax, yMax))}
          y2={sy(Math.min(xMax, yMax))}
          stroke="#9ca3af"
          strokeWidth="1.5"
          strokeDasharray="6 3"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r="3"
            fill="#3b82f6"
            fillOpacity="0.6"
            stroke="#2563eb"
            strokeWidth="0.5"
          />
        ))}

        {/* X axis */}
        <line x1={padLeft} y1={padTop + chartH} x2={padLeft + chartW} y2={padTop + chartH} stroke="#374151" strokeWidth="1" />
        {xTicks.map(v => (
          <text key={`xt-${v}`} x={sx(v)} y={padTop + chartH + 16} textAnchor="middle" fontSize="10" fill="#6b7280">
            {v}
          </text>
        ))}
        <text x={padLeft + chartW / 2} y={totalH - 4} textAnchor="middle" fontSize="11" fill="#374151">Theoretical Quantiles</text>

        {/* Y axis */}
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + chartH} stroke="#374151" strokeWidth="1" />
        {yTicks.map(v => (
          <text key={`yt-${v}`} x={padLeft - 8} y={sy(v) + 4} textAnchor="end" fontSize="10" fill="#6b7280">
            {v.toFixed(1)}
          </text>
        ))}
        <text x={12} y={padTop + chartH / 2} textAnchor="middle" fontSize="11" fill="#374151" transform={`rotate(-90, 12, ${padTop + chartH / 2})`}>
          Sample Quantiles
        </text>

        {/* N label */}
        <text x={padLeft + chartW - 5} y={padTop + 12} textAnchor="end" fontSize="10" fill="#9ca3af" fontStyle="italic">
          N = {n}
        </text>
      </svg>
    </div>
  )
}
