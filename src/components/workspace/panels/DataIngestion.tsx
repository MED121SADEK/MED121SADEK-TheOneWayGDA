'use client'

import { useRef } from 'react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Upload, Download, Database, X, Check, FileSpreadsheet, ScanLine, FolderOpen,
} from 'lucide-react'
import type { HandlerHook } from './types'

/* ─── Panel 2: Data Import ─── */
export function ImportPanel(h: HandlerHook) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')

  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
  const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.json', '.tsv']

  const validateAndProcessFile = (file: File) => {
    setImportError('')
    setImportSuccess('')

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setImportError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 50MB.`)
      return
    }
    if (file.size === 0) {
      setImportError('File is empty.')
      return
    }

    // Validate extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setImportError(`Unsupported file type "${ext}". Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`)
      return
    }

    try {
      h.store.importFile(file)
      setImportSuccess(`Imported "${file.name}" (${(file.size / 1024).toFixed(1)}KB)`)
    } catch (err) {
      setImportError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    validateAndProcessFile(files[0])
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full scrollbar-thin" style={{ contain: 'layout style paint' }}>
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          dragOver ? 'border-teal-400 bg-teal-500/10 scale-[1.01]' : 'border-border hover:border-teal-400/50 hover:bg-teal-500/5'
        )}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json,.tsv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) validateAndProcessFile(file)
            // Reset input so same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = ''
          }}
        />
        {dragOver ? (
          <>
            <Download className="w-8 h-8 mx-auto mb-3 text-teal-400" />
            <p className="text-sm font-medium text-teal-400">Drop your file here</p>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 mx-auto mb-3 text-teal-400" />
            <p className="text-sm font-medium text-foreground">{h.t('import.dragDrop')}</p>
            <p className="text-xs text-muted-foreground mt-1">{h.t('import.supportedFormats')}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Max 50MB</p>
          </>
        )}
      </div>

      {importError && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-[10px] text-red-400">
          <X className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Import Error</p>
            <p>{importError}</p>
          </div>
          <button onClick={() => setImportError('')} className="ml-auto flex-shrink-0 hover:text-red-300">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      {importSuccess && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 text-[10px] text-emerald-400">
          <Check className="w-3 h-3" />
          <span>{importSuccess}</span>
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Paste CSV Data</p>
        <Textarea
          value={h.importText}
          onChange={(e) => h.setImportText(e.target.value)}
          placeholder="Name,Age,Score&#10;Alice,25,89&#10;Bob,30,92"
          className="text-xs min-h-24 font-mono"
        />
        <Button size="sm" className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs" onClick={h.handleImportCSV} disabled={!h.importText.trim()}>
          <Database className="w-3.5 h-3.5 mr-1.5" />
          Import CSV
        </Button>
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Quick Templates</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'Sample Survey', data: 'Respondent,Age,Gender,Satisfaction,Income\n1,25,Male,4,45000\n2,30,Female,5,52000\n3,22,Male,3,38000\n4,35,Female,4,61000\n5,28,Male,5,48000\n6,40,Female,3,72000\n7,33,Male,4,55000\n8,27,Female,5,42000' },
            { name: 'Student Grades', data: 'Student,Math,Science,English,History\nAlice,85,92,88,76\nBob,78,85,90,82\nCarol,92,88,76,95\nDave,65,72,88,70\nEve,88,95,82,90' },
            { name: 'Sales Data', data: 'Month,Revenue,Profit,Customers\nJan,45000,12000,320\nFeb,52000,15000,380\nMar,48000,11000,350\nApr,61000,18000,420\nMay,55000,14000,390' },
          ].map((tpl) => (
            <Button
              key={tpl.name}
              variant="outline"
              size="sm"
              className="text-[10px] h-8 justify-start"
              onClick={() => { h.store.importCSV(tpl.data) }}
            >
              <FileSpreadsheet className="w-3 h-3 mr-1.5" />
              {tpl.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Panel 7: Scan & OCR ─── */
export function ScanPanel(h: HandlerHook) {
  const [dragOver, setDragOver] = useState(false)
  const [scanError, setScanError] = useState('')

  const MAX_SCAN_SIZE = 20 * 1024 * 1024 // 20MB
  const SCAN_ACCEPTED = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff']

  const validateScanFile = (file: File): string | null => {
    if (file.size > MAX_SCAN_SIZE) return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 20MB.`
    if (file.size === 0) return 'File is empty.'
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!SCAN_ACCEPTED.includes(ext)) return `Unsupported type. Accepted: ${SCAN_ACCEPTED.join(', ')}`
    return null
  }

  const processScanFile = (file: File) => {
    setScanError('')
    const err = validateScanFile(file)
    if (err) { setScanError(err); return }
    h.setScanFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => h.setScanPreview(ev.target?.result as string)
    reader.onerror = () => setScanError('Failed to read file.')
    reader.readAsDataURL(file)
  }

  const handleScanDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) processScanFile(files[0])
  }

  const handleScanDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }
  const handleScanDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOver(false) }

  const handleScanSubmit = async () => {
    if (!h.scanFile) return
    setScanError('')
    h.store.setScanState('processing')

    const formData = new FormData()
    formData.append('file', h.scanFile)

    if (h.scanFile.name.toLowerCase().endsWith('.pdf')) {
      formData.append('templateHint', 'PDF document')
    }

    try {
      const res = await fetch('/api/scan', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setScanError(data.error || `Scan failed (HTTP ${res.status})`)
        h.store.setScanState('error')
        return
      }

      if (data.fields && data.fields.length > 0) {
        h.store.setScanResults(data as any)
      } else if (data.rawText && data.rawText.length > 10) {
        h.store.setScanResults({
          ...data,
          fields: [{ label: 'Raw Text', value: data.rawText.slice(0, 500), confidence: 0.5, type: 'string' }],
          summary: data.summary || 'Document text extracted. Review the raw text below.',
        } as any)
      } else {
        setScanError('Could not extract structured data from this document. The content may be unclear, handwritten, or image-based. Try uploading a clearer scan or a different file format.')
        h.store.setScanState('error')
      }
    } catch (err) {
      setScanError(`Network error: ${err instanceof Error ? err.message : 'Connection failed'}`)
      h.store.setScanState('error')
    }
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full scrollbar-thin" style={{ contain: 'layout style paint' }}>
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          h.scanFile ? 'border-cyan-400 bg-cyan-50/10' : dragOver ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]' : 'border-border hover:border-cyan-400/50 hover:bg-cyan-500/5'
        )}
        onClick={() => h.fileInputRef.current?.click()}
        onDrop={handleScanDrop}
        onDragOver={handleScanDragOver}
        onDragLeave={handleScanDragLeave}
      >
        <input
          ref={h.fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.tiff"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) processScanFile(f)
            if (h.fileInputRef.current) h.fileInputRef.current.value = ''
          }}
        />
        {h.store.scanState === 'processing' ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Analyzing document with AI...</p>
            <p className="text-[10px] text-muted-foreground/60">This may take 10-30 seconds for complex documents</p>
          </div>
        ) : h.scanPreview ? (
          <div className="flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={h.scanPreview} alt="Preview" className="max-h-40 rounded-lg shadow-sm" />
            <p className="text-[10px] text-muted-foreground">{h.scanFile?.name} ({((h.scanFile?.size || 0) / 1024).toFixed(1)}KB)</p>
          </div>
        ) : (
          <>
            <ScanLine className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
            <p className="text-sm font-medium">{h.t('scan.dragDrop')}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{h.t('scan.supportedFormats')}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Max 20MB - Drag and drop or click</p>
          </>
        )}
      </div>

      {scanError && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-[10px] text-red-400">
          <X className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Scan Error</p>
            <p>{scanError}</p>
          </div>
          <button onClick={() => setScanError('')} className="ml-auto flex-shrink-0 hover:text-red-300">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs" disabled={!h.scanFile || h.store.scanState === 'processing'} onClick={handleScanSubmit}>
          {h.store.scanState === 'processing' ? 'Analyzing...' : h.t('scan.title')}
        </Button>
        {h.store.scanState === 'done' && h.store.scanResults && (
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => { h.store.importScanResults(h.store.scanResults!); h.setScanDialogOpen(false) }}>
            <Check className="w-3.5 h-3.5 mr-1" />{h.t('scan.approve')}
          </Button>
        )}
      </div>

      {/* Raw text fallback when fields are limited */}
      {h.store.scanState === 'done' && h.store.scanResults && h.store.scanResults.rawText && h.store.scanResults.fields.length <= 2 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-amber-400">Extracted Text (raw)</p>
          <div className="max-h-32 overflow-y-auto bg-muted/20 rounded-lg p-2 text-[10px] text-muted-foreground whitespace-pre-wrap">
            {h.store.scanResults.rawText.slice(0, 2000)}
          </div>
          <p className="text-[9px] text-muted-foreground/60">AI had difficulty parsing structured fields from this document. You can copy the raw text or re-upload a clearer version.</p>
        </div>
      )}

      {/* Batch Scan */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => h.batchInputRef.current?.click()}>
          <FolderOpen className="w-3 h-3 mr-1" />{h.t('scan.batch')}
        </Button>
        <input ref={h.batchInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" multiple className="hidden" onChange={async (e) => {
          const files = Array.from(e.target.files || [])
          for (const f of files) {
            const err = validateScanFile(f)
            if (err) continue
            h.store.addToBatchQueue({ id: Date.now().toString(36) + Math.random().toString(36).slice(2), name: f.name, status: 'pending' })
          }
          if (h.batchInputRef.current) h.batchInputRef.current.value = ''
        }} />
        {h.store.batchQueue.length > 0 && <span className="text-[10px] text-muted-foreground">{h.store.batchQueue.length} files queued</span>}
      </div>

      {/* Results */}
      {h.store.scanState === 'done' && h.store.scanResults && h.store.scanResults.fields.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold">{h.t('scan.extracted')} ({h.store.scanResults.fields.length})</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {h.store.scanResults.fields.map((f: any, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-muted/20 rounded-lg p-2 text-[10px]">
                <Badge variant="outline" className="text-[8px] w-12 justify-center shrink-0">{f.type || 'text'}</Badge>
                <span className="font-medium w-20 truncate">{f.label}</span>
                <input className="flex-1 text-[10px] bg-background border rounded px-1.5 py-0.5 min-w-0" value={h.editedFields[f.label] ?? f.value} onChange={e => h.setEditedFields(p => ({ ...p, [f.label]: e.target.value }))} />
                <Badge variant={f.confidence > 0.8 ? 'default' : 'secondary'} className={cn('text-[8px]', f.confidence > 0.8 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white')}>
                  {Math.round((f.confidence || 0.5) * 100)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {h.store.scanHistory.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold mb-1.5">{h.t('scan.history')}</p>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {h.store.scanHistory.slice(-5).reverse().map((s: any, i: number) => (
              <div key={i} className="text-[10px] text-muted-foreground bg-muted/20 rounded p-1.5">{s.summary || `${s.fields.length} fields, ${s.tables.length} tables`}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}