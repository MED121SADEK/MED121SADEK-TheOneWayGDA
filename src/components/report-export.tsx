'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Download, FileSpreadsheet, FileText, Table2, Loader2,
  Settings2, Info, BarChart3, Database, FileCode,
} from 'lucide-react'
import { useExport, type ExportFormat } from '@/hooks/useExport'
import type { PDFExportConfig } from '@/lib/export-utils'
import { columnToRows } from '@/lib/export-utils'

export interface ReportExportProps {
  /** Column-oriented data */
  data: Record<string, any[]>
  /** Variable/Column headers */
  headers: string[]
  /** Project name */
  projectName?: string
  /** Analysis outputs (from store.outputs) */
  outputs?: Array<{
    title: string
    type: 'table' | 'chart' | 'text'
    content: any
    timestamp: string
  }>
  /** Additional metadata rows for the report */
  metadata?: Record<string, string>
  /** Title override */
  title?: string
  /** Subtitle override */
  subtitle?: string
  className?: string
}

export function ReportExport({
  data,
  headers,
  projectName = 'Untitled Project',
  outputs = [],
  metadata,
  title: titleProp,
  subtitle: subtitleProp,
  className,
}: ReportExportProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [includeRawData, setIncludeRawData] = useState(true)
  const [includeAnalyses, setIncludeAnalyses] = useState(true)
  const [includeMetadata, setIncludeMetadata] = useState(true)

  const reportTitle = titleProp || projectName
  const reportSubtitle = subtitleProp || `Data Analysis Report`

  const {
    exporting,
    exportData,
    exportJSON,
    exportCSV,
  } = useExport({
    filename: projectName.replace(/[^a-zA-Z0-9]/g, '_'),
    title: reportTitle,
    subtitle: reportSubtitle,
  })

  // Data statistics for preview
  const stats = useMemo(() => {
    const rowCount = Math.max(...headers.map(k => (data[k] || []).length), 0)
    return {
      rowCount,
      columnCount: headers.length,
      analysisCount: outputs.length,
    }
  }, [data, headers, outputs])

  // Build combined data for CSV/XLSX export
  const combinedData = useMemo(() => {
    if (!includeAnalyses || outputs.length === 0) return data

    const result: Record<string, any[]> = { ...data }
    for (const output of outputs) {
      if (output.type === 'table' && output.content?.headers) {
        for (const h of output.content.headers) {
          if (!result[h]) result[h] = []
          for (const row of output.content.rows || []) {
            const idx = result[h].length
            result[h][idx] = row[output.content.headers.indexOf(h)] ?? ''
          }
        }
      }
    }
    return result
  }, [data, outputs, includeAnalyses])

  // Build PDF rows from all sources
  const buildPDFConfig = useCallback((): PDFExportConfig => {
    const allRows: Record<string, any>[] = []
    const allColumns: { header: string; dataKey: string }[] = []

    // Metadata section
    if (includeMetadata) {
      const metaEntries = [
        ['Project', projectName],
        ['Generated', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })],
        ['Variables', String(headers.length)],
        ['Rows', String(stats.rowCount)],
        ['Analyses', String(outputs.length)],
        ...(metadata ? Object.entries(metadata) : []),
      ]
      for (const [key, val] of metaEntries) {
        allRows.push({ Section: 'Metadata', Field: key, Value: val })
      }
      allColumns.push({ header: 'Section', dataKey: 'Section' })
      allColumns.push({ header: 'Field', dataKey: 'Field' })
      allColumns.push({ header: 'Value', dataKey: 'Value' })
    }

    // Raw data section
    if (includeRawData && headers.length > 0) {
      const dataRows = columnToRows(data, headers)
      for (const row of dataRows) {
        allRows.push({ Section: 'Raw Data', ...row })
      }
      if (allColumns.length === 0) {
        allColumns.push({ header: 'Section', dataKey: 'Section' })
      }
      for (const h of headers) {
        if (!allColumns.find(c => c.dataKey === h)) {
          allColumns.push({ header: h, dataKey: h })
        }
      }
    }

    // Analyses section
    if (includeAnalyses) {
      for (const output of outputs) {
        if (output.type === 'table' && output.content?.headers) {
          const tableHeaders = output.content.headers as string[]
          for (const row of output.content.rows || []) {
            const rowData: Record<string, any> = { Section: output.title }
            tableHeaders.forEach((h: string, i: number) => {
              rowData[h] = row[i] ?? ''
            })
            allRows.push(rowData)
          }
          for (const h of tableHeaders) {
            if (!allColumns.find(c => c.dataKey === h)) {
              allColumns.push({ header: h, dataKey: h })
            }
          }
        } else if (output.type === 'text') {
          allRows.push({ Section: output.title, Content: String(output.content || '') })
          if (!allColumns.find(c => c.dataKey === 'Content')) {
            allColumns.push({ header: 'Content', dataKey: 'Content' })
          }
        }
      }
    }

    return {
      title: reportTitle,
      subtitle: reportSubtitle,
      columns: allColumns.length > 0 ? allColumns : [{ header: 'Data', dataKey: 'Data' }],
      rows: allRows.length > 0 ? allRows : [{ Data: 'No data' }],
      filename: projectName.replace(/[^a-zA-Z0-9]/g, '_') + '_report',
      orientation,
    }
  }, [data, headers, outputs, projectName, reportTitle, reportSubtitle, includeRawData, includeAnalyses, includeMetadata, orientation, stats.rowCount, metadata])

  const handleExport = useCallback(async () => {
    switch (format) {
      case 'csv': {
        const allHeaders = includeMetadata
          ? ['Section', ...headers]
          : headers
        exportCSV(combinedData, allHeaders)
        break
      }
      case 'xlsx':
        await exportData(combinedData, headers, 'xlsx')
        break
      case 'pdf': {
        const config = buildPDFConfig()
        await exportData(data, headers, 'pdf', config.filename)
        break
      }
      case 'json': {
        const jsonData = {
          project: projectName,
          exported: new Date().toISOString(),
          metadata: includeMetadata ? metadata : undefined,
          data: includeRawData ? columnToRows(data, headers) : undefined,
          outputs: includeAnalyses ? outputs : undefined,
        }
        exportJSON(jsonData)
        break
      }
    }
  }, [format, combinedData, headers, data, exportData, exportCSV, exportJSON, buildPDFConfig, projectName, outputs, includeRawData, includeAnalyses, includeMetadata, metadata])

  const isExporting = !!exporting

  return (
    <div className={`rounded-lg border bg-card text-card-foreground ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Settings2 className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Report Export</h3>
      </div>

      {/* Preview */}
      <div className="px-4 py-3 bg-muted/30 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Info className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Preview</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-background p-2 text-center border">
            <Database className="size-3.5 mx-auto text-emerald-500 mb-1" />
            <p className="text-[10px] font-medium">{stats.rowCount} rows</p>
            <p className="text-[9px] text-muted-foreground">{stats.columnCount} columns</p>
          </div>
          <div className="rounded-md bg-background p-2 text-center border">
            <BarChart3 className="size-3.5 mx-auto text-orange-500 mb-1" />
            <p className="text-[10px] font-medium">{stats.analysisCount} analyses</p>
            <p className="text-[9px] text-muted-foreground">outputs</p>
          </div>
          <div className="rounded-md bg-background p-2 text-center border">
            <FileCode className="size-3.5 mx-auto text-purple-500 mb-1" />
            <p className="text-[10px] font-medium capitalize">{format.toUpperCase()}</p>
            <p className="text-[9px] text-muted-foreground">format</p>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="px-4 py-3 space-y-3">
        {/* Format Selection */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Format</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { value: 'csv' as const, label: 'CSV', icon: FileSpreadsheet },
              { value: 'xlsx' as const, label: 'Excel', icon: Table2 },
              { value: 'pdf' as const, label: 'PDF', icon: FileText },
              { value: 'json' as const, label: 'JSON', icon: FileCode },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFormat(opt.value)}
                className={`flex flex-col items-center gap-1 p-2 rounded-md border text-[10px] font-medium transition-all ${
                  format === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background hover:bg-muted/50'
                }`}
              >
                <opt.icon className="size-3.5" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Include Options */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Include</Label>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-raw"
                checked={includeRawData}
                onCheckedChange={(v) => setIncludeRawData(!!v)}
                className="size-3.5"
              />
              <Label htmlFor="include-raw" className="text-xs cursor-pointer">
                Raw data
              </Label>
              <Badge variant="secondary" className="text-[9px] h-4 ml-auto">
                {stats.rowCount} rows
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-analyses"
                checked={includeAnalyses}
                onCheckedChange={(v) => setIncludeAnalyses(!!v)}
                className="size-3.5"
              />
              <Label htmlFor="include-analyses" className="text-xs cursor-pointer">
                Analysis outputs
              </Label>
              <Badge variant="secondary" className="text-[9px] h-4 ml-auto">
                {stats.analysisCount} items
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-metadata"
                checked={includeMetadata}
                onCheckedChange={(v) => setIncludeMetadata(!!v)}
                className="size-3.5"
              />
              <Label htmlFor="include-metadata" className="text-xs cursor-pointer">
                Metadata
              </Label>
              <Badge variant="secondary" className="text-[9px] h-4 ml-auto">
                project info
              </Badge>
            </div>
          </div>
        </div>

        {/* PDF-specific options */}
        {format === 'pdf' && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">PDF Options</Label>
              <div className="flex items-center gap-3">
                <Label className="text-xs text-muted-foreground">Orientation</Label>
                <RadioGroup
                  value={orientation}
                  onValueChange={(v) => setOrientation(v as 'portrait' | 'landscape')}
                  className="flex gap-3"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="portrait" id="portrait" className="size-3" />
                    <Label htmlFor="portrait" className="text-[10px] cursor-pointer">Portrait</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="landscape" id="landscape" className="size-3" />
                    <Label htmlFor="landscape" className="text-[10px] cursor-pointer">Landscape</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Export Button */}
      <div className="px-4 py-3 border-t bg-muted/20 rounded-b-lg">
        <Button
          onClick={handleExport}
          disabled={isExporting || (stats.rowCount === 0 && stats.analysisCount === 0)}
          className="w-full gap-2"
          size="sm"
        >
          {isExporting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          Export as {format.toUpperCase()}
        </Button>
      </div>
    </div>
  )
}
