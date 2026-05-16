'use client'

import React, { useState, useMemo, useCallback } from 'react'
import jsPDF from 'jspdf'
import {
  FileText,
  Download,
  Eye,
  Settings,
  Check,
  ChevronRight,
  Printer,
  BookOpen,
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ── Types ──────────────────────────────────────────────────────────────────

interface AnalysisOutput {
  id: string
  title: string
  type: string
  content: any
  timestamp: string
}

interface ReportConfig {
  title: string
  author: string
  date: string
  format: 'apa' | 'standard' | 'brief'
  includeAIInterpretation: boolean
  includeCharts: boolean
  selectedOutputIds: Set<string>
}

type FormatOption = 'apa' | 'standard' | 'brief'

// ── Props ──────────────────────────────────────────────────────────────────

interface ReportGeneratorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  outputs: AnalysisOutput[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<FormatOption, string> = {
  apa: 'APA 7th Edition',
  standard: 'Standard',
  brief: 'Brief',
}

const FORMAT_DESCRIPTIONS: Record<FormatOption, string> = {
  apa: 'Full APA-formatted academic report with running head, title page, abstract placeholder, and proper section headings.',
  standard: 'Clean professional report with clear sections, tables, and summaries.',
  brief: 'Compact one-page summary with key findings only.',
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

/** Detect key statistics from output rows for highlighting */
function extractKeyStats(output: AnalysisOutput): string[] {
  const keys: string[] = []
  if (!output.content?.rows) return keys

  for (const row of output.content.rows) {
    if (Array.isArray(row) && row.length >= 2) {
      const label = String(row[0]).toLowerCase()
      if (
        label.includes('r²') ||
        label.includes('r-squared') ||
        label.includes('p-value') ||
        label.includes('p value') ||
        label.includes('significance') ||
        label.includes('f-statistic') ||
        label.includes('t-statistic') ||
        label.includes('chi-square') ||
        label.includes('equation')
      ) {
        keys.push(`${row[0]}: ${row[1]}`)
      }
    }
  }
  return keys
}

/** Compute dynamic column widths to fit page */
function computeColumnWidths(
  headers: string[],
  rows: string[][],
  maxWidth: number,
): number[] {
  const minColW = 20
  const padding = 4
  const usableWidth = maxWidth - 40

  // Find max width needed per column
  const colWidths = headers.map((h, ci) => {
    let maxLen = String(h).length
    for (const row of rows.slice(0, 20)) {
      if (row[ci] !== undefined) {
        maxLen = Math.max(maxLen, String(row[ci]).length)
      }
    }
    return Math.max(minColW, maxLen * 2.5 + padding)
  })

  // Scale down if total exceeds usable width
  const totalWidth = colWidths.reduce((a, b) => a + b, 0)
  if (totalWidth > usableWidth) {
    const scale = usableWidth / totalWidth
    return colWidths.map(w => Math.max(minColW, w * scale))
  }
  return colWidths
}

// ── PDF Generator ──────────────────────────────────────────────────────────

function generatePDF(config: ReportConfig, outputs: AnalysisOutput[]) {
  const selectedOutputs = outputs.filter(o => config.selectedOutputIds.has(o.id))
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // ── Title Page ───────────────────────────────────────────────────────────
  if (config.format !== 'brief') {
    let y = 60
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text('Generated by The One-Way', pageWidth / 2, y, { align: 'center' })
    y += 20

    // Title
    doc.setFontSize(26)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    const titleLines = doc.splitTextToSize(config.title || 'Statistical Analysis Report', pageWidth - 60)
    for (const line of titleLines) {
      doc.text(line, pageWidth / 2, y, { align: 'center' })
      y += 12
    }
    y += 10

    // Separator line
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.5)
    doc.line(60, y, pageWidth - 60, y)
    y += 15

    // Author & date
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text(config.author || 'The One-Way', pageWidth / 2, y, { align: 'center' })
    y += 10
    doc.setFontSize(12)
    doc.text(config.date, pageWidth / 2, y, { align: 'center' })
    y += 10

    // Format badge
    doc.setFontSize(10)
    doc.setTextColor(150, 150, 150)
    doc.text(`Format: ${FORMAT_LABELS[config.format]}`, pageWidth / 2, y, { align: 'center' })
    y += 10

    // Analysis count
    doc.text(`${selectedOutputs.length} analysis${selectedOutputs.length !== 1 ? 'es' : ''} included`, pageWidth / 2, y, { align: 'center' })
  } else {
    // Brief: compact header
    let y = 20
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text(config.title || 'Statistical Analysis Report', 20, y, { align: 'left' })
    y += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text(`${config.author || 'The One-Way'}  •  ${config.date}  •  The One-Way`, 20, y, { align: 'left' })
    y += 5
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(20, y, pageWidth - 20, y)
  }

  // ── Method / Overview Section ────────────────────────────────────────────
  if (selectedOutputs.length > 0) {
    doc.addPage()
    let y = 20

    // Section heading
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text(config.format === 'apa' ? 'Method' : 'Analyses Performed', 20, y)
    y += 10

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)

    const methodText =
      config.format === 'apa'
        ? `A total of ${selectedOutputs.length} statistical ${selectedOutputs.length === 1 ? 'analysis' : 'analyses'} ${selectedOutputs.length === 1 ? 'was' : 'were'} conducted using The One-Way statistical analysis platform. The following ${selectedOutputs.length === 1 ? 'analysis' : 'analyses'} ${selectedOutputs.length === 1 ? 'is' : 'are'} reported: ${selectedOutputs.map((o, i) => `${o.title}${config.format === 'apa' && i === selectedOutputs.length - 1 ? '.' : ','}`).join(' ')}`
        : `The following ${selectedOutputs.length} ${selectedOutputs.length === 1 ? 'analysis was' : 'analyses were'} conducted:`

    const methodLines = doc.splitTextToSize(methodText, pageWidth - 40)
    for (const line of methodLines) {
      doc.text(line, 20, y)
      y += 6
    }

    y += 5

    // List of analyses
    if (config.format !== 'apa') {
      for (const output of selectedOutputs) {
        doc.setFontSize(10)
        doc.setTextColor(80, 80, 80)
        doc.text(`• ${output.title} (${formatDate(output.timestamp)})`, 25, y)
        y += 6
      }
    }

    y += 5

    // ── Results Section ────────────────────────────────────────────────────
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Results', 20, y)
    y += 12

    // Process each output
    for (let oi = 0; oi < selectedOutputs.length; oi++) {
      const output = selectedOutputs[oi]

      // Check page space
      if (y > pageHeight - 60) {
        doc.addPage()
        y = 20
      }

      // Analysis sub-heading
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(40, 40, 40)
      const subLines = doc.splitTextToSize(`${oi + 1}. ${output.title}`, pageWidth - 40)
      for (const line of subLines) {
        doc.text(line, 20, y)
        y += 7
      }
      y += 3

      // Table (if headers and rows exist)
      if (output.content?.headers && output.content?.rows) {
        const headers: string[] = output.content.headers
        const rows: string[][] = output.content.rows.map((r: any) =>
          Array.isArray(r) ? r.map(String) : [String(r)],
        )
        const maxRows = config.format === 'brief' ? 10 : 20
        const displayRows = rows.slice(0, maxRows)

        const colWidths = computeColumnWidths(headers, displayRows, pageWidth)

        // Table header background
        let tx = 20
        const headerHeight = 8
        doc.setFillColor(240, 240, 240)
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.1)
        for (let ci = 0; ci < headers.length; ci++) {
          doc.rect(tx, y - 4, colWidths[ci], headerHeight, 'FD')
          tx += colWidths[ci]
        }

        // Header text
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(40, 40, 40)
        tx = 20
        for (let ci = 0; ci < headers.length; ci++) {
          const cellText = headers[ci].substring(0, 25)
          doc.text(cellText, tx + 2, y + 1)
          tx += colWidths[ci]
        }
        y += headerHeight + 1

        // Rows
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        for (let ri = 0; ri < displayRows.length; ri++) {
          if (y > pageHeight - 30) {
            doc.addPage()
            y = 20
          }

          const row = displayRows[ri]
          const isAlt = ri % 2 === 1

          if (isAlt) {
            tx = 20
            for (let ci = 0; ci < headers.length; ci++) {
              doc.setFillColor(248, 248, 248)
              doc.rect(tx, y - 4, colWidths[ci], 7, 'F')
              tx += colWidths[ci]
            }
          }

          // Grid lines
          tx = 20
          doc.setDrawColor(220, 220, 220)
          for (let ci = 0; ci < headers.length; ci++) {
            doc.rect(tx, y - 4, colWidths[ci], 7, 'S')
            tx += colWidths[ci]
          }

          doc.setTextColor(60, 60, 60)
          tx = 20
          for (let ci = 0; ci < headers.length; ci++) {
            const cellText = ci < row.length ? row[ci].substring(0, 30) : ''
            doc.text(cellText, tx + 2, y + 1)
            tx += colWidths[ci]
          }
          y += 7
        }

        // Show truncated notice
        if (rows.length > maxRows) {
          doc.setFontSize(8)
          doc.setTextColor(150, 150, 150)
          doc.text(`... ${rows.length - maxRows} more rows truncated`, 20, y + 2)
          y += 6
        }

        y += 6
      } else if (output.content) {
        // Non-table content — try to render as text
        const textContent =
          typeof output.content === 'string'
            ? output.content
            : JSON.stringify(output.content, null, 2)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        const lines = doc.splitTextToSize(textContent.substring(0, 500), pageWidth - 40)
        for (const line of lines.slice(0, 15)) {
          if (y > pageHeight - 30) {
            doc.addPage()
            y = 20
          }
          doc.text(line, 20, y)
          y += 5
        }
        y += 6
      }

      // Key statistics highlight box
      const keyStats = extractKeyStats(output)
      if (keyStats.length > 0 && config.format !== 'brief') {
        if (y > pageHeight - 40) {
          doc.addPage()
          y = 20
        }

        doc.setFillColor(245, 247, 250)
        doc.setDrawColor(200, 210, 230)
        const boxHeight = keyStats.length * 5 + 10
        doc.roundedRect(22, y - 3, pageWidth - 44, boxHeight, 2, 2, 'FD')

        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(80, 100, 140)
        doc.text('Key Statistics', 26, y + 2)
        y += 7

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        for (const stat of keyStats) {
          doc.text(`• ${stat}`, 26, y)
          y += 5
        }
        y += 6
      }

      y += 4
    }

    // ── Discussion Section ─────────────────────────────────────────────────
    if (config.format !== 'brief') {
      if (y > pageHeight - 50) {
        doc.addPage()
        y = 20
      }

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text('Discussion', 20, y)
      y += 10

      doc.setFontSize(11)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(120, 120, 120)

      if (config.includeAIInterpretation) {
        const discussionText =
          'AI interpretation of these results would appear here. This section provides context for the statistical findings, discusses practical significance, identifies limitations, and suggests directions for further research.'
        const discLines = doc.splitTextToSize(discussionText, pageWidth - 40)
        for (const line of discLines) {
          if (y > pageHeight - 30) {
            doc.addPage()
            y = 20
          }
          doc.text(line, 20, y)
          y += 6
        }
      } else {
        const placeholderText =
          'Interpretation and discussion of results. Enable "Include AI Interpretation" to generate automated discussion of findings.'
        const placeholderLines = doc.splitTextToSize(placeholderText, pageWidth - 40)
        for (const line of placeholderLines) {
          if (y > pageHeight - 30) {
            doc.addPage()
            y = 20
          }
          doc.text(line, 20, y)
          y += 6
        }
      }

      y += 10

      // References placeholder
      if (config.format === 'apa' && y < pageHeight - 40) {
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 30, 30)
        doc.text('References', 20, y)
        y += 10

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(140, 140, 140)
        const refNote = 'References should be listed here according to APA 7th edition formatting guidelines.'
        const refLines = doc.splitTextToSize(refNote, pageWidth - 40)
        for (const line of refLines) {
          doc.text(line, 20, y)
          y += 5
        }
      }
    }
  } else {
    // No outputs selected
    doc.setFontSize(14)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(150, 150, 150)
    doc.text('No analyses selected for this report.', pageWidth / 2, 120, {
      align: 'center',
    })
  }

  // ── Footer on every page ────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 160, 160)

    // APA running head on odd pages
    if (config.format === 'apa' && i > 1) {
      doc.text(config.title.substring(0, 50), 20, pageHeight - 10, {
        align: 'left',
      })
    }

    // Page number
    doc.text(
      `Page ${i} of ${totalPages}  |  Generated by The One-Way`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' },
    )

    // Thin separator line above footer
    doc.setDrawColor(230, 230, 230)
    doc.setLineWidth(0.2)
    doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15)
  }

  // Save
  const sanitizedTitle = (config.title || 'report')
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase()
  doc.save(`${sanitizedTitle}.pdf`)
}

// ── Preview Component ──────────────────────────────────────────────────────

function ReportPreview({
  config,
  outputs,
}: {
  config: ReportConfig
  outputs: AnalysisOutput[]
}) {
  const selectedOutputs = outputs.filter(o => config.selectedOutputIds.has(o.id))

  return (
    <div className="space-y-4">
      {/* Paper mockup */}
      <div className="mx-auto max-w-[600px] rounded-lg border bg-white text-gray-900 shadow-lg">
        <div className="p-8 sm:p-12">
          {/* Title page */}
          <div className="mb-6 text-center">
            <p className="mb-3 text-[10px] font-medium tracking-wider text-gray-400 uppercase">
              Generated by The One-Way
            </p>
            <h2 className="mb-2 text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
              {config.title || 'Statistical Analysis Report'}
            </h2>
            <div className="mx-auto my-3 h-px w-24 bg-gray-200" />
            <p className="text-sm text-gray-500">
              {config.author || 'The One-Way'}
            </p>
            <p className="text-xs text-gray-400">{config.date}</p>
            <div className="mt-2 flex justify-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {FORMAT_LABELS[config.format]}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {selectedOutputs.length} analysis
                {selectedOutputs.length !== 1 ? 'es' : ''}
              </Badge>
            </div>
          </div>

          {/* Divider */}
          <div className="my-6 h-px bg-gray-200" />

          {/* Method section */}
          {config.format !== 'brief' && (
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-2">
                <BookOpen className="size-3.5 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">
                  {config.format === 'apa' ? 'Method' : 'Analyses Performed'}
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-gray-500">
                {selectedOutputs.length > 0
                  ? config.format === 'apa'
                    ? `A total of ${selectedOutputs.length} statistical ${selectedOutputs.length === 1 ? 'analysis was' : 'analyses were'} conducted using The One-Way platform.`
                    : `The following analyses were conducted:`
                  : 'No analyses selected.'}
              </p>
              {selectedOutputs.length > 0 && config.format !== 'apa' && (
                <ul className="mt-2 space-y-1">
                  {selectedOutputs.map(o => (
                    <li
                      key={o.id}
                      className="flex items-start gap-1.5 text-xs text-gray-500"
                    >
                      <ChevronRight className="mt-0.5 size-3 shrink-0 text-gray-400" />
                      <span>
                        {o.title}
                        <span className="ml-1 text-gray-300">
                          ({formatTimestamp(o.timestamp)})
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Results section */}
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <FileText className="size-3.5 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">Results</h3>
            </div>

            {selectedOutputs.length === 0 ? (
              <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
                <p className="text-xs text-gray-400">
                  Select analyses in the Configure tab to preview results here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedOutputs.map((output, oi) => (
                  <div key={output.id}>
                    <p className="mb-1.5 text-xs font-semibold text-gray-700">
                      {oi + 1}. {output.title}
                    </p>

                    {/* Mini table preview */}
                    {output.content?.headers && output.content?.rows && (
                      <div className="overflow-x-auto rounded border border-gray-100">
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="bg-gray-50">
                              {output.content.headers.map(
                                (h: string, hi: number) => (
                                  <th
                                    key={hi}
                                    className="whitespace-nowrap px-2 py-1 text-left font-semibold text-gray-600"
                                  >
                                    {h}
                                  </th>
                                ),
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {output.content.rows
                              .slice(0, 4)
                              .map((row: any, ri: number) => (
                                <tr
                                  key={ri}
                                  className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                                >
                                  {(Array.isArray(row) ? row : [row]).map(
                                    (cell: any, ci: number) => (
                                      <td
                                        key={ci}
                                        className="whitespace-nowrap px-2 py-0.5 text-gray-500"
                                      >
                                        {String(cell ?? '')}
                                      </td>
                                    ),
                                  )}
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        {output.content.rows.length > 4 && (
                          <p className="border-t border-gray-100 px-2 py-1 text-[9px] text-gray-300">
                            ... {output.content.rows.length - 4} more rows
                          </p>
                        )}
                      </div>
                    )}

                    {/* Key stats badges */}
                    {(() => {
                      const stats = extractKeyStats(output)
                      if (stats.length === 0 || config.format === 'brief')
                        return null
                      return (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {stats.slice(0, 3).map((s, si) => (
                            <Badge
                              key={si}
                              variant="outline"
                              className="border-blue-100 bg-blue-50/50 text-[9px] text-blue-600"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discussion section */}
          {config.format !== 'brief' && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <Eye className="size-3.5 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">
                  Discussion
                </h3>
              </div>
              <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-3">
                <p className="text-xs italic text-gray-400">
                  {config.includeAIInterpretation
                    ? 'AI interpretation of these results will be generated and included here.'
                    : 'Enable "Include AI Interpretation" to add automated discussion of findings.'}
                </p>
              </div>
            </div>
          )}

          {/* APA References section */}
          {config.format === 'apa' && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                References
              </h3>
              <p className="text-xs text-gray-400 italic">
                APA-formatted references will be listed here.
              </p>
            </div>
          )}
        </div>

        {/* Mock footer */}
        <div className="border-t border-gray-100 bg-gray-50/80 px-8 py-2 sm:px-12">
          <p className="text-center text-[9px] text-gray-300">
            Page 1 of {Math.max(1, selectedOutputs.length)} &nbsp;|&nbsp;
            Generated by The One-Way
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export function ReportGenerator({
  open,
  onOpenChange,
  outputs,
}: ReportGeneratorProps) {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const [config, setConfig] = useState<ReportConfig>({
    title: 'Statistical Analysis Report',
    author: '',
    date: today,
    format: 'apa',
    includeAIInterpretation: true,
    includeCharts: true,
    selectedOutputIds: new Set(outputs.map(o => o.id)),
  })

  const [activeTab, setActiveTab] = useState<string>('configure')
  const [isGenerating, setIsGenerating] = useState(false)

  // Sync selectedOutputIds when outputs prop changes
  const outputIdSet = useMemo(() => new Set(outputs.map(o => o.id)), [outputs])

  const selectedCount = config.selectedOutputIds.size
  const totalCount = outputs.length
  const allSelected = selectedCount === totalCount && totalCount > 0

  const updateConfig = useCallback(
    <K extends keyof ReportConfig>(key: K, value: ReportConfig[K]) => {
      setConfig(prev => ({ ...prev, [key]: value }))
    },
    [],
  )

  const toggleOutput = useCallback((id: string, checked: boolean) => {
    setConfig(prev => {
      const next = new Set(prev.selectedOutputIds)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return { ...prev, selectedOutputIds: next }
    })
  }, [])

  const toggleAll = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      selectedOutputIds: allSelected ? new Set() : new Set(outputIdSet),
    }))
  }, [allSelected, outputIdSet])

  const handleDownloadPDF = useCallback(() => {
    if (selectedCount === 0) return
    setIsGenerating(true)
    try {
      // Slight delay to allow UI to update with loading state
      setTimeout(() => {
        generatePDF(config, outputs)
        setIsGenerating(false)
      }, 100)
    } catch {
      setIsGenerating(false)
    }
  }, [config, outputs, selectedCount])

  const handlePrint = useCallback(() => {
    if (selectedCount === 0) return
    setIsGenerating(true)
    try {
      setTimeout(() => {
        generatePDF(config, outputs)
        setIsGenerating(false)
      }, 100)
    } catch {
      setIsGenerating(false)
    }
  }, [config, outputs, selectedCount])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-5xl flex-col overflow-hidden p-0 sm:max-w-5xl">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="size-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base">Generate Report</DialogTitle>
                <DialogDescription className="text-xs">
                  Configure and export your statistical analysis as a formatted PDF
                  report.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="border-b px-6">
            <TabsList className="h-9">
              <TabsTrigger value="configure" className="gap-1.5 text-xs">
                <Settings className="size-3.5" />
                Configure
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-1.5 text-xs">
                <Eye className="size-3.5" />
                Preview
                {selectedCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {selectedCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Configure Tab */}
          <TabsContent value="configure" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full max-h-[calc(90vh-200px)]">
              <div className="grid gap-6 p-6 md:grid-cols-2">
                {/* Left Column — Metadata */}
                <div className="space-y-5">
                  <Card className="gap-4 py-4">
                    <CardHeader className="pb-0">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <FileText className="size-4 text-muted-foreground" />
                        Report Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="report-title" className="text-xs">
                          Title
                        </Label>
                        <Input
                          id="report-title"
                          value={config.title}
                          onChange={e => updateConfig('title', e.target.value)}
                          placeholder="Statistical Analysis Report"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="report-author" className="text-xs">
                          Author
                        </Label>
                        <Input
                          id="report-author"
                          value={config.author}
                          onChange={e => updateConfig('author', e.target.value)}
                          placeholder="Your name"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="report-date" className="text-xs">
                          Date
                        </Label>
                        <Input
                          id="report-date"
                          value={config.date}
                          onChange={e => updateConfig('date', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="gap-4 py-4">
                    <CardHeader className="pb-0">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Settings className="size-4 text-muted-foreground" />
                        Format
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Report Format</Label>
                        <Select
                          value={config.format}
                          onValueChange={(v: FormatOption) =>
                            updateConfig('format', v)
                          }
                        >
                          <SelectTrigger className="h-8 w-full text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="apa">APA 7th Edition</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="brief">Brief</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {FORMAT_DESCRIPTIONS[config.format]}
                        </p>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-xs">
                            Include AI Interpretation
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            Adds automated discussion section
                          </p>
                        </div>
                        <Switch
                          checked={config.includeAIInterpretation}
                          onCheckedChange={v =>
                            updateConfig('includeAIInterpretation', v)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-xs">Include Charts</Label>
                          <p className="text-[11px] text-muted-foreground">
                            Embeds chart visualizations in the report
                          </p>
                        </div>
                        <Switch
                          checked={config.includeCharts}
                          onCheckedChange={v =>
                            updateConfig('includeCharts', v)
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column — Analysis Selection */}
                <Card className="gap-4 py-4">
                  <CardHeader className="pb-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Check className="size-4 text-muted-foreground" />
                        Analyses
                      </CardTitle>
                      <Badge
                        variant={
                          selectedCount > 0 ? 'default' : 'secondary'
                        }
                        className="text-[10px]"
                      >
                        {selectedCount} / {totalCount}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {totalCount > 0 && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="select-all"
                          checked={allSelected}
                          onCheckedChange={toggleAll}
                        />
                        <Label
                          htmlFor="select-all"
                          className="cursor-pointer text-xs font-medium"
                        >
                          {allSelected
                            ? 'Deselect all'
                            : 'Select all analyses'}
                        </Label>
                      </div>
                    )}

                    <Separator />

                    {outputs.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          No analyses available. Run some analyses first to
                          include them in your report.
                        </p>
                      </div>
                    ) : (
                      <ScrollArea className="max-h-[340px]">
                        <div className="space-y-1.5 pr-2">
                          {outputs.map(output => (
                            <div
                              key={output.id}
                              className={`flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${
                                config.selectedOutputIds.has(output.id)
                                  ? 'border-primary/30 bg-primary/5'
                                  : 'border-transparent hover:bg-muted/50'
                              }`}
                            >
                              <Checkbox
                                id={`output-${output.id}`}
                                checked={config.selectedOutputIds.has(output.id)}
                                onCheckedChange={checked =>
                                  toggleOutput(output.id, !!checked)
                                }
                                className="mt-0.5"
                              />
                              <div className="min-w-0 flex-1">
                                <Label
                                  htmlFor={`output-${output.id}`}
                                  className="cursor-pointer text-xs font-medium leading-tight"
                                >
                                  {output.title}
                                </Label>
                                <div className="mt-1 flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {output.type}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatTimestamp(output.timestamp)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full max-h-[calc(90vh-200px)]">
              <div className="bg-muted/30 p-6">
                <ReportPreview config={config} outputs={outputs} />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between border-t bg-muted/30 px-6 py-3">
          <div className="text-[11px] text-muted-foreground">
            {selectedCount === 0
              ? 'No analyses selected'
              : `${selectedCount} analysis${selectedCount !== 1 ? 'es' : ''} selected • ${FORMAT_LABELS[config.format]}`}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="gap-1.5"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={selectedCount === 0 || isGenerating}
              className="gap-1.5"
            >
              <Printer className="size-3.5" />
              Print
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPDF}
              disabled={selectedCount === 0 || isGenerating}
              className="gap-1.5"
            >
              {isGenerating ? (
                <>
                  <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="size-3.5" />
                  Download PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
