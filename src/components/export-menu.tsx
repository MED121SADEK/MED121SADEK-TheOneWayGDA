'use client'

import { FileSpreadsheet, FileText, FileDown, Image, Loader2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useExport } from '@/hooks/useExport'
import { columnToRows } from '@/lib/export-utils'
import { useState } from 'react'

interface ExportMenuProps {
  data: Record<string, any[]>
  headers: string[]
  filename?: string
  title?: string
  subtitle?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
  showJSON?: boolean
  showPNG?: boolean
  className?: string
  elementId?: string // for PNG export
}

export function ExportMenu({
  data, headers, filename = 'export', title, subtitle,
  variant = 'outline', size = 'sm', showJSON = true, showPNG = false,
  className, elementId,
}: ExportMenuProps) {
  const { exportCSV, exportXLSX, exportPDF, exportPNG, exportJSON, exportData } = useExport({ filename, title, subtitle })
  const [activeFormat, setActiveFormat] = useState<string | null>(null)

  const handleExport = async (format: string) => {
    setActiveFormat(format)
    try {
      if (format === 'png') {
        if (elementId) await exportPNG(elementId)
        else { /* no element to capture */ }
      } else {
        await exportData(data, headers, format as 'csv' | 'xlsx' | 'pdf' | 'json')
      }
    } finally {
      setTimeout(() => setActiveFormat(null), 500)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className} aria-label="Export data">
          <FileDown className="size-3.5" />
          {size !== 'icon' && <span className="ml-1.5">Export</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleExport('csv')} disabled={activeFormat === 'csv'}>
          {activeFormat === 'csv' ? <Loader2 className="size-4 animate-spin mr-2" /> : <FileSpreadsheet className="size-4 mr-2 text-emerald-500" />}
          <div>
            <p className="text-sm font-medium">CSV</p>
            <p className="text-[10px] text-muted-foreground">Comma-separated values</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('xlsx')} disabled={activeFormat === 'xlsx'}>
          {activeFormat === 'xlsx' ? <Loader2 className="size-4 animate-spin mr-2" /> : <FileSpreadsheet className="size-4 mr-2 text-green-600" />}
          <div>
            <p className="text-sm font-medium">Excel (.xlsx)</p>
            <p className="text-[10px] text-muted-foreground">Spreadsheet format</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={activeFormat === 'pdf'}>
          {activeFormat === 'pdf' ? <Loader2 className="size-4 animate-spin mr-2" /> : <FileText className="size-4 mr-2 text-red-500" />}
          <div>
            <p className="text-sm font-medium">PDF</p>
            <p className="text-[10px] text-muted-foreground">Formatted document</p>
          </div>
        </DropdownMenuItem>
        {showJSON && (
          <DropdownMenuItem onClick={() => handleExport('json')} disabled={activeFormat === 'json'}>
            {activeFormat === 'json' ? <Loader2 className="size-4 animate-spin mr-2" /> : <FileDown className="size-4 mr-2 text-blue-500" />}
            <div>
              <p className="text-sm font-medium">JSON</p>
              <p className="text-[10px] text-muted-foreground">Structured data</p>
            </div>
          </DropdownMenuItem>
        )}
        {showPNG && elementId && (
          <DropdownMenuItem onClick={() => handleExport('png')} disabled={activeFormat === 'png'}>
            {activeFormat === 'png' ? <Loader2 className="size-4 animate-spin mr-2" /> : <Image className="size-4 mr-2 text-purple-500" />}
            <div>
              <p className="text-sm font-medium">PNG Image</p>
              <p className="text-[10px] text-muted-foreground">Chart capture</p>
            </div>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
