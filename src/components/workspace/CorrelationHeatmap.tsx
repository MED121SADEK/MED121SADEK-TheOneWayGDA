'use client'

import React, { useRef } from 'react'
import { toPng } from 'html-to-image'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CorrelationHeatmapProps {
  matrix: number[][]
  variables: string[]
  title?: string
}

function valueToColor(v: number): string {
  // -1 = deep blue, 0 = white/gray, +1 = deep red
  const clamped = Math.max(-1, Math.min(1, v))
  if (clamped >= 0) {
    const intensity = Math.round(clamped * 180)
    return `rgb(${200 + Math.round(clamped * 55)}, ${200 - intensity}, ${200 - intensity})`
  } else {
    const intensity = Math.round(-clamped * 180)
    return `rgb(${200 - intensity}, ${200 - intensity}, ${200 + Math.round(-clamped * 55)})`
  }
}

function valueToTextColor(v: number): string {
  const abs = Math.abs(v)
  if (abs > 0.6) return '#ffffff'
  return '#1f2937'
}

export function CorrelationHeatmap({ matrix, variables, title }: CorrelationHeatmapProps) {
  const ref = useRef<HTMLDivElement>(null)
  const n = variables.length
  if (n === 0 || matrix.length === 0) return null

  const cellSize = Math.min(48, Math.max(32, 320 / n))
  const labelWidth = 70
  const topPadding = labelWidth + 10
  const width = labelWidth + n * cellSize + 40
  const height = topPadding + n * cellSize + 50

  const exportImage = () => {
    if (!ref.current) return
    toPng(ref.current, { backgroundColor: '#fff', pixelRatio: 2 })
      .then(dataUrl => {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `${title || 'correlation-heatmap'}.png`
        a.click()
      })
      .catch(() => {})
  }

  return (
    <div ref={ref} className="bg-white dark:bg-zinc-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        {title && <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{title}</p>}
        <Button size="sm" variant="ghost" className="h-6 text-[10px] ml-auto" onClick={exportImage}>
          <Download className="size-3" /> PNG
        </Button>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Column headers (rotated) */}
        {variables.map((name, i) => (
          <g key={`col-${i}`}>
            <text
              x={labelWidth + i * cellSize + cellSize / 2}
              y={labelWidth}
              textAnchor="end"
              fontSize="10"
              fill="#374151"
              transform={`rotate(-45, ${labelWidth + i * cellSize + cellSize / 2}, ${labelWidth})`}
            >
              {name.length > 10 ? name.slice(0, 9) + '…' : name}
            </text>
          </g>
        ))}

        {/* Row labels + cells */}
        {variables.map((name, row) => (
          <g key={`row-${row}`}>
            <text
              x={labelWidth - 5}
              y={topPadding + row * cellSize + cellSize / 2 + 4}
              textAnchor="end"
              fontSize="10"
              fill="#374151"
            >
              {name.length > 10 ? name.slice(0, 9) + '…' : name}
            </text>
            {variables.map((_, col) => {
              const v = matrix[row]?.[col] ?? 0
              const x = labelWidth + col * cellSize
              const y = topPadding + row * cellSize
              return (
                <g key={`cell-${row}-${col}`}>
                  <rect
                    x={x + 1}
                    y={y + 1}
                    width={cellSize - 2}
                    height={cellSize - 2}
                    rx="3"
                    fill={valueToColor(v)}
                    stroke="#e5e7eb"
                    strokeWidth="0.5"
                  />
                  <text
                    x={x + cellSize / 2}
                    y={y + cellSize / 2 + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="500"
                    fill={valueToTextColor(v)}
                  >
                    {v.toFixed(2)}
                  </text>
                </g>
              )
            })}
          </g>
        ))}

        {/* Color legend */}
        <defs>
          <linearGradient id="heatmap-legend" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgb(20, 20, 200)" />
            <stop offset="50%" stopColor="rgb(200, 200, 200)" />
            <stop offset="100%" stopColor="rgb(200, 20, 20)" />
          </linearGradient>
        </defs>
        <rect
          x={labelWidth}
          y={topPadding + n * cellSize + 15}
          width={n * cellSize}
          height={12}
          rx="3"
          fill="url(#heatmap-legend)"
        />
        <text x={labelWidth} y={topPadding + n * cellSize + 38} textAnchor="start" fontSize="9" fill="#6b7280">-1.0</text>
        <text x={labelWidth + n * cellSize / 2} y={topPadding + n * cellSize + 38} textAnchor="middle" fontSize="9" fill="#6b7280">0.0</text>
        <text x={labelWidth + n * cellSize} y={topPadding + n * cellSize + 38} textAnchor="end" fontSize="9" fill="#6b7280">+1.0</text>
      </svg>
    </div>
  )
}
