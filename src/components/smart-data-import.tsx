"use client"

import * as React from "react"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import {
  Upload,
  FileSpreadsheet,
  Table2,
  Check,
  X,
  Zap,
  Settings,
  ChevronRight,
  Trash2,
  Eye,
  RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ── Types ───────────────────────────────────────────────────────────────────

type ColumnType = "number" | "text" | "date" | "category"

interface ColumnConfig {
  name: string
  originalName: string
  type: ColumnType
  included: boolean
  isMissingIndicator: boolean
}

interface SmartDataImportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (data: Record<string, any[]>, variables: any[]) => void
}

type Phase = "upload" | "detecting" | "preview" | "settings"

// ── Constants ───────────────────────────────────────────────────────────────

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls", ".tsv"]
const MAX_PREVIEW_ROWS = 8
const CATEGORY_THRESHOLD = 10

const TYPE_COLORS: Record<ColumnType, string> = {
  number: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  text: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  date: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  category: "bg-purple-500/15 text-purple-400 border-purple-500/30",
}

const TYPE_DOT_COLORS: Record<ColumnType, string> = {
  number: "bg-blue-400",
  text: "bg-emerald-400",
  date: "bg-amber-400",
  category: "bg-purple-400",
}

const TYPE_LABELS: Record<ColumnType, string> = {
  number: "number",
  text: "text",
  date: "date",
  category: "category",
}

const TYPE_OPTIONS: ColumnType[] = ["number", "text", "category", "date"]

// ── Helpers ─────────────────────────────────────────────────────────────────

function detectColumnType(values: string[]): ColumnType {
  if (values.length === 0) return "text"
  const nonEmpty = values.filter((v) => v.trim() !== "")
  if (nonEmpty.length === 0) return "text"

  const sample = nonEmpty.slice(0, 50)

  // Date check
  const datePatterns = [
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/,
    /^\d{4}-\d{2}-\d{2}T/,
    /^\d{4}-\d{2}-\d{2}\s/,
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i,
  ]
  const dateMatchCount = sample.filter((v) =>
    datePatterns.some((p) => p.test(v.trim()))
  ).length
  if (sample.length >= 3 && dateMatchCount / sample.length > 0.7) return "date"

  // Numeric check
  const numericCount = sample.filter((v) => {
    const trimmed = v.replace(/[$%,\s]/g, "")
    return !isNaN(Number(trimmed)) && trimmed !== ""
  }).length
  if (sample.length >= 3 && numericCount / sample.length > 0.7) return "number"

  // Category check: string with low unique values
  const unique = new Set(sample.map((v) => v.trim().toLowerCase()))
  if (
    unique.size <= CATEGORY_THRESHOLD &&
    unique.size < sample.length * 0.6 &&
    sample.length >= 5
  )
    return "category"

  return "text"
}

function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf(".")).toLowerCase()
}

function isExcelFile(filename: string): boolean {
  const ext = getFileExtension(filename)
  return ext === ".xlsx" || ext === ".xls"
}

// ── Component ───────────────────────────────────────────────────────────────

export function SmartDataImport({
  open,
  onOpenChange,
  onImport,
}: SmartDataImportProps) {
  // Phase management
  const [phase, setPhase] = React.useState<Phase>("upload")
  const [error, setError] = React.useState<string | null>(null)

  // File state
  const [fileName, setFileName] = React.useState<string>("")
  const [dragOver, setDragOver] = React.useState(false)

  // Raw parsed data (all rows)
  const [rawHeaders, setRawHeaders] = React.useState<string[]>([])
  const [rawRows, setRawRows] = React.useState<string[][]>([])

  // Column configuration
  const [columns, setColumns] = React.useState<ColumnConfig[]>([])

  // Editing column name
  const [editingColumnIndex, setEditingColumnIndex] = React.useState<
    number | null
  >(null)
  const [editNameValue, setEditNameValue] = React.useState<string>("")

  // File input ref
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // ── Reset ──

  const resetAll = React.useCallback(() => {
    setPhase("upload")
    setError(null)
    setFileName("")
    setDragOver(false)
    setRawHeaders([])
    setRawRows([])
    setColumns([])
    setEditingColumnIndex(null)
    setEditNameValue("")
  }, [])

  const handleClose = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) resetAll()
      onOpenChange(nextOpen)
    },
    [onOpenChange, resetAll]
  )

  // ── File Processing ──

  const processFile = React.useCallback((file: File) => {
    const ext = getFileExtension(file.name)

    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(
        `Unsupported file format "${ext}". Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}`
      )
      return
    }

    setFileName(file.name)
    setError(null)
    setPhase("detecting")

    if (isExcelFile(file.name)) {
      // Use SheetJS for Excel files
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: "array" })
          const sheetName = workbook.SheetNames[0]
          if (!sheetName) {
            setError("The workbook has no sheets.")
            setPhase("upload")
            return
          }
          const sheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, {
            header: 1,
          })

          if (jsonData.length === 0) {
            setError("The file appears to be empty.")
            setPhase("upload")
            return
          }

          const headers = (jsonData[0] ?? []).map(String)
          const rows = jsonData.slice(1).map((row) =>
            row.map((cell) => (cell != null ? String(cell) : ""))
          )

          const cols = headers.map((name, i) => ({
            name,
            originalName: name,
            type: detectColumnType(rows.map((r) => r[i] ?? "")),
            included: true,
            isMissingIndicator: false,
          }))
          setRawHeaders(headers)
          setRawRows(rows)
          setColumns(cols)
          setPhase("preview")
        } catch {
          setError("Failed to parse the Excel file. It may be corrupted.")
          setPhase("upload")
        }
      }
      reader.onerror = () => {
        setError("Failed to read the file.")
        setPhase("upload")
      }
      reader.readAsArrayBuffer(file)
    } else {
      // Use PapaParse for CSV / TSV files
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        Papa.parse(text, {
          header: false,
          skipEmptyLines: true,
          complete: (result) => {
            if (result.data.length === 0) {
              setError("The file appears to be empty.")
              setPhase("upload")
              return
            }

            const dataArr = (result.data as unknown as any[][]) || []
            const headers = (dataArr[0] ?? []).map(String)
            const rows = dataArr
              .slice(1)
              .map((row: any[]) =>
                row.map((cell) => (cell != null ? String(cell) : ""))
              )

            const cols = headers.map((name, i) => ({
              name,
              originalName: name,
              type: detectColumnType(rows.map((r) => r[i] ?? "")),
              included: true,
              isMissingIndicator: false,
            }))

            setRawHeaders(headers)
            setRawRows(rows)
            setColumns(cols)
            setPhase("preview")
          },
          error: () => {
            setError("Failed to parse the CSV/TSV file.")
            setPhase("upload")
          },
        })
      }
      reader.onerror = () => {
        setError("Failed to read the file.")
        setPhase("upload")
      }
      reader.readAsText(file)
    }
  }, [])

  // ── Column Helpers ──

  const handleRenameColumn = React.useCallback(
    (index: number, newName: string) => {
      setColumns((prev) =>
        prev.map((col, i) =>
          i === index ? { ...col, name: newName || col.originalName } : col
        )
      )
    },
    []
  )

  const handleDeleteColumn = React.useCallback((index: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleToggleType = React.useCallback((index: number, type: ColumnType) => {
    setColumns((prev) =>
      prev.map((col, i) => (i === index ? { ...col, type } : col))
    )
  }, [])

  const handleToggleIncluded = React.useCallback((index: number) => {
    setColumns((prev) =>
      prev.map((col, i) =>
        i === index ? { ...col, included: !col.included } : col
      )
    )
  }, [])

  const handleToggleMissingIndicator = React.useCallback((index: number) => {
    setColumns((prev) =>
      prev.map((col, i) =>
        i === index
          ? { ...col, isMissingIndicator: !col.isMissingIndicator }
          : col
      )
    )
  }, [])

  const handleAutoDetect = React.useCallback(() => {
    setColumns((prev) =>
      prev.map((col, i) => ({
        ...col,
        type: detectColumnType(rawRows.map((r) => r[i] ?? "")),
      }))
    )
  }, [rawRows])

  // ── File Drop / Upload Handlers ──

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])

  const handleFileInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ""
    },
    [processFile]
  )

  // ── Import Action ──

  const handleImport = React.useCallback(() => {
    if (columns.length === 0) return

    const includedColumns = columns.filter((c) => c.included)
    const missingIndicators = columns
      .filter((c) => c.isMissingIndicator)
      .map((c) => c.name)

    const data: Record<string, any[]> = {}
    includedColumns.forEach((col) => {
      data[col.name] = []
    })

    for (const row of rawRows) {
      includedColumns.forEach((col) => {
        const origIdx = rawHeaders.indexOf(col.originalName)
        const raw = origIdx >= 0 ? row[origIdx] ?? "" : ""

        // Check if value matches any missing indicator
        if (missingIndicators.includes(raw.trim())) {
          data[col.name].push(null)
          return
        }

        if (col.type === "number") {
          const cleaned = raw.replace(/[$%,\s]/g, "")
          const num = Number(cleaned)
          data[col.name].push(isNaN(num) ? null : num)
        } else if (col.type === "date") {
          const parsed = Date.parse(raw)
          data[col.name].push(isNaN(parsed) ? raw : new Date(parsed).toISOString())
        } else {
          data[col.name].push(raw)
        }
      })
    }

    const variables = includedColumns.map((col) => ({
      name: col.name,
      type: col.type,
    }))

    onImport(data, variables)
    handleClose(false)
  }, [columns, rawHeaders, rawRows, onImport, handleClose])

  // ── Derived ──

  const includedCount = columns.filter((c) => c.included).length
  const previewRows = rawRows.slice(0, MAX_PREVIEW_ROWS)

  // ── Render: Upload Phase ──

  const renderUpload = () => (
    <div className="flex flex-col items-center justify-center gap-5 py-8">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click()
        }}
        className={cn(
          "relative w-full max-w-md cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200",
          dragOver
            ? "border-primary/60 bg-primary/5 scale-[1.02]"
            : "border-border/60 hover:border-primary/30 hover:bg-muted/30",
          error && "border-destructive/50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="Upload file"
        />
        <div
          className={cn(
            "mx-auto mb-3 flex size-12 items-center justify-center rounded-lg transition-colors",
            dragOver ? "bg-primary/10" : "bg-muted/60"
          )}
        >
          <Upload
            className={cn(
              "size-6 transition-colors",
              dragOver ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>
        <p className="text-sm font-medium text-foreground">
          {dragOver ? "Drop file here" : "Drag & drop or click to upload"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Supports{" "}
          {ACCEPTED_EXTENSIONS.map((ext) => (
            <Badge
              key={ext}
              variant="outline"
              className="text-[10px] px-1 py-0 h-3.5 mx-0.5 font-mono"
            >
              {ext}
            </Badge>
          ))}
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 max-w-md rounded-lg bg-destructive/10 border border-destructive/20 p-3">
          <X className="size-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
    </div>
  )

  // ── Render: Detecting Phase ──

  const renderDetecting = () => (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="relative">
        <div className="size-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <FileSpreadsheet className="size-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          Analyzing{" "}
          <span className="text-primary font-mono">{fileName}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Detecting column types and structure...
        </p>
      </div>
    </div>
  )

  // ── Render: Preview Phase ──

  const renderPreview = () => (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3 px-1">
        <div className="flex items-center gap-1.5">
          <Table2 className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            <span className="text-foreground font-semibold">{rawRows.length}</span> rows
          </span>
          <span className="text-muted-foreground/40">×</span>
          <span className="text-xs text-muted-foreground">
            <span className="text-foreground font-semibold">{columns.length}</span>{" "}
            columns
          </span>
        </div>
        <span className="text-muted-foreground/30">|</span>
        <span className="text-xs text-muted-foreground truncate flex-1">
          <span className="text-muted-foreground/60">File:</span>{" "}
          <span className="font-mono text-foreground/80">{fileName}</span>
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 px-2 text-primary"
          onClick={() => {
            resetAll()
          }}
        >
          <RotateCcw className="size-3" />
          New file
        </Button>
      </div>

      {/* Column badges row */}
      <div className="flex flex-wrap gap-1.5 px-1">
        {columns.map((col, i) => (
          <div key={i} className="flex items-center gap-1 group">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 h-5 font-mono gap-1",
                !col.included && "opacity-40 line-through",
                TYPE_COLORS[col.type]
              )}
            >
              <span
                className={cn(
                  "inline-block size-1.5 rounded-full",
                  TYPE_DOT_COLORS[col.type]
                )}
              />
              {col.name}
            </Badge>
          </div>
        ))}
      </div>

      {/* Preview table */}
      <ScrollArea className="max-h-72 rounded-lg border border-border/50">
        <UITable>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="text-[10px] text-muted-foreground/50 h-7 px-2.5 w-8 font-medium">
                #
              </TableHead>
              {columns.map((col, i) => (
                <TableHead
                  key={i}
                  className="text-[11px] h-7 px-3 font-medium min-w-[100px] max-w-[200px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-block size-1.5 rounded-full shrink-0",
                        TYPE_DOT_COLORS[col.type],
                        !col.included && "opacity-40"
                      )}
                    />
                    <span
                      className={cn(
                        "truncate",
                        !col.included && "opacity-40 line-through text-muted-foreground"
                      )}
                    >
                      {col.name}
                    </span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewRows.map((row, ri) => (
              <TableRow key={ri} className="border-border/30 hover:bg-muted/30">
                <TableCell className="text-[10px] text-muted-foreground/40 py-1 px-2.5 font-mono">
                  {ri + 1}
                </TableCell>
                {columns.map((col, ci) => {
                  const origIdx = rawHeaders.indexOf(col.originalName)
                  const cellVal =
                    origIdx >= 0 ? row[origIdx] ?? "" : ""
                  return (
                    <TableCell
                      key={ci}
                      className={cn(
                        "text-[11px] py-1 px-3 font-mono max-w-[200px] truncate",
                        col.type === "number" && "text-blue-300/80 tabular-nums",
                        col.type === "date" && "text-amber-300/80",
                        !col.included && "opacity-30"
                      )}
                    >
                      {cellVal || (
                        <span className="text-muted-foreground/30 italic">
                          —
                        </span>
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
            {rawRows.length > MAX_PREVIEW_ROWS && (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="text-center text-[10px] text-muted-foreground/50 py-1.5"
                >
                  ... {rawRows.length - MAX_PREVIEW_ROWS} more rows
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </UITable>
      </ScrollArea>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => {
            resetAll()
          }}
        >
          <RotateCcw className="size-3" />
          Start over
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setPhase("settings")}
          >
            <Settings className="size-3" />
            Column Settings
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleImport}
            disabled={includedCount === 0}
          >
            <Check className="size-3" />
            Import {includedCount > 0 ? `${includedCount} columns` : ""}
          </Button>
        </div>
      </div>
    </div>
  )

  // ── Render: Settings Phase ──

  const renderSettings = () => (
    <div className="space-y-4">
      {/* Settings header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 px-2"
            onClick={() => setPhase("preview")}
          >
            <ChevronRight className="size-3 rotate-180" />
            Back
          </Button>
          <span className="text-xs text-muted-foreground">
            Configuring{" "}
            <span className="text-foreground font-semibold">
              {columns.length}
            </span>{" "}
            columns
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 px-2 text-primary"
          onClick={handleAutoDetect}
        >
          <Zap className="size-3" />
          Auto-detect
        </Button>
      </div>

      {/* Column list */}
      <ScrollArea className="max-h-[50vh]">
        <div className="space-y-1.5 pr-3">
          {columns.map((col, i) => (
            <Card
              key={i}
              className={cn(
                "p-3 gap-3 border-border/50 transition-all",
                !col.included && "opacity-50"
              )}
            >
              {/* Row 1: Name + Controls */}
              <div className="flex items-center gap-2">
                {/* Drag handle / index */}
                <span className="text-[10px] text-muted-foreground/40 font-mono w-4 text-right shrink-0">
                  {i + 1}
                </span>

                {/* Include toggle */}
                <Switch
                  checked={col.included}
                  onCheckedChange={() => handleToggleIncluded(i)}
                  className="scale-75 origin-left"
                  aria-label={`Toggle ${col.name}`}
                />

                {/* Column name (editable) */}
                {editingColumnIndex === i ? (
                  <Input
                    autoFocus
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    onBlur={() => {
                      handleRenameColumn(i, editNameValue)
                      setEditingColumnIndex(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRenameColumn(i, editNameValue)
                        setEditingColumnIndex(null)
                      }
                      if (e.key === "Escape") setEditingColumnIndex(null)
                    }}
                    className="h-6 text-xs font-mono px-1.5 py-0 flex-1 min-w-0"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setEditingColumnIndex(i)
                      setEditNameValue(col.name)
                    }}
                    className={cn(
                      "text-xs font-mono truncate hover:text-primary transition-colors flex-1 min-w-0 text-left",
                      !col.included
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    )}
                    title="Click to rename"
                  >
                    {col.name}
                  </button>
                )}

                {/* Type badge */}
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-5 shrink-0",
                    TYPE_COLORS[col.type]
                  )}
                >
                  {TYPE_LABELS[col.type]}
                </Badge>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0 text-muted-foreground/40 hover:text-destructive"
                  onClick={() => handleDeleteColumn(i)}
                  aria-label={`Delete ${col.name}`}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>

              {/* Row 2: Settings controls */}
              <div className="flex items-center gap-3 pl-[38px]">
                {/* Type selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground/50">
                    Type
                  </span>
                  <Select
                    value={col.type}
                    onValueChange={(val) =>
                      handleToggleType(i, val as ColumnType)
                    }
                  >
                    <SelectTrigger className="h-6 text-[10px] w-24 px-1.5 font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs font-mono">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "inline-block size-1.5 rounded-full",
                                TYPE_DOT_COLORS[t]
                              )}
                            />
                            {TYPE_LABELS[t]}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Missing indicator toggle */}
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={col.isMissingIndicator}
                    onCheckedChange={() => handleToggleMissingIndicator(i)}
                    className="scale-75 origin-left"
                    aria-label={`Mark ${col.name} as missing indicator`}
                  />
                  <span className="text-[10px] text-muted-foreground/50">
                    Missing indicator
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Settings footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <p className="text-[10px] text-muted-foreground/50 px-1">
          {includedCount} of {columns.length} columns will be imported
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setPhase("preview")}
          >
            <Eye className="size-3" />
            Preview
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleImport}
            disabled={includedCount === 0}
          >
            <Check className="size-3" />
            Import {includedCount > 0 ? `${includedCount} columns` : ""}
          </Button>
        </div>
      </div>
    </div>
  )

  // ── Main Render ──

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-3 border-b border-border/40 shrink-0">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <FileSpreadsheet className="size-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-sm">
                  Smart Data Import
                </DialogTitle>
                <DialogDescription className="text-[11px]">
                  Upload spreadsheets with automatic column type detection
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Phase steps indicator */}
          <div className="flex items-center gap-1 mt-4">
            {(["upload", "detecting", "preview", "settings"] as Phase[]).map(
              (p, i) => {
                const phaseIndex =
                  phase === "settings"
                    ? 3
                    : ["upload", "detecting", "preview", "settings"].indexOf(phase)
                const isActive =
                  p === phase || (phase === "settings" && p === "preview")
                const isCompleted = phaseIndex > i && p !== "detecting"
                const labels = ["Upload", "Detect", "Preview", "Configure"]

                return (
                  <React.Fragment key={p}>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full text-[10px] font-medium transition-all",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : isCompleted
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-muted text-muted-foreground/40"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="size-3" />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[10px] transition-colors hidden sm:inline",
                          isActive
                            ? "text-foreground font-medium"
                            : isCompleted
                              ? "text-emerald-400/70"
                              : "text-muted-foreground/40"
                        )}
                      >
                        {labels[i]}
                      </span>
                    </div>
                    {i < 3 && (
                      <div
                        className={cn(
                          "flex-1 h-px mx-1",
                          phaseIndex > i
                            ? "bg-emerald-500/30"
                            : "bg-border/40"
                        )}
                      />
                    )}
                  </React.Fragment>
                )
              }
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {phase === "upload" && renderUpload()}
          {phase === "detecting" && renderDetecting()}
          {phase === "preview" && renderPreview()}
          {phase === "settings" && renderSettings()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
