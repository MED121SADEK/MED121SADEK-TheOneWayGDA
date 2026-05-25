'use client'

import { useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  exportToCSV as csvExport,
  exportToXLSX as xlsxExport,
  exportToPDF as pdfExport,
  exportChartToPNG as pngExport,
  exportToJSON as jsonExport,
  columnToRows,
  type PDFExportConfig,
} from '@/lib/export-utils'

interface UseExportOptions {
  filename?: string
  title?: string
  subtitle?: string
  showToasts?: boolean
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json' | 'png'

export function useExport(options: UseExportOptions = {}) {
  const { filename = 'export', title = 'Export', subtitle, showToasts = true } = options
  const exporting = useRef<string | null>(null)

  const withToast = useCallback(async (format: string, fn: () => Promise<boolean>) => {
    if (exporting.current === format) return
    exporting.current = format
    try {
      const ok = await fn()
      if (showToasts) {
        if (ok) toast.success(`Exported as ${format.toUpperCase()} successfully`)
        else toast.error(`Failed to export as ${format.toUpperCase()}`)
      }
    } catch {
      if (showToasts) toast.error(`Export failed`)
    } finally {
      exporting.current = null
    }
  }, [showToasts])

  const exportCSV = useCallback((data: Record<string, any[]>, headers: string[], name?: string) => {
    withToast('CSV', () => csvExport(data, headers, name || filename))
  }, [filename, withToast])

  const exportXLSX = useCallback((data: Record<string, any[]>, headers: string[], name?: string) => {
    withToast('Excel', () => xlsxExport(data, headers, name || filename))
  }, [filename, withToast])

  const exportPDF = useCallback((config: Partial<PDFExportConfig> & { rows: Record<string, any>[]; columns: { header: string; dataKey: string }[] }, name?: string) => {
    withToast('PDF', () => pdfExport({
      title: config.title || title,
      subtitle: config.subtitle || subtitle,
      columns: config.columns,
      rows: config.rows,
      filename: name || filename,
      orientation: config.orientation,
    }))
  }, [filename, title, subtitle, withToast])

  const exportPNG = useCallback((elementId: string, name?: string) => {
    withToast('PNG', () => pngExport(elementId, name || filename))
  }, [filename, withToast])

  const exportJSON = useCallback((data: unknown, name?: string) => {
    withToast('JSON', () => Promise.resolve(jsonExport(data, name || filename)))
  }, [filename, withToast])

  const exportData = useCallback((data: Record<string, any[]>, headers: string[], format: 'csv' | 'xlsx' | 'pdf' | 'json', name?: string) => {
    switch (format) {
      case 'csv': return exportCSV(data, headers, name)
      case 'xlsx': return exportXLSX(data, headers, name)
      case 'pdf': {
        const rows = columnToRows(data, headers)
        return exportPDF({
          rows,
          columns: headers.map(h => ({ header: h, dataKey: h })),
        }, name)
      }
      case 'json': {
        const rows = columnToRows(data, headers)
        return exportJSON(rows, name)
      }
    }
  }, [exportCSV, exportXLSX, exportPDF, exportJSON])

  return { exportCSV, exportXLSX, exportPDF, exportPNG, exportJSON, exportData, exporting }
}
