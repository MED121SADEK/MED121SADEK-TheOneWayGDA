"use client"

import * as React from "react"
import {
  FileSpreadsheet,
  Database,
  Globe,
  ClipboardList,
  Table,
  Upload,
  ArrowRight,
  Check,
  AlertCircle,
  Zap,
  RefreshCw,
  Settings,
  Loader2,
  Trash2,
  ChevronLeft,
  Plus,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
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

type ColumnType = "numeric" | "categorical" | "date" | "text"

interface DetectedColumn {
  name: string
  type: ColumnType
  editable: boolean
}

type DataSourceId =
  | "csv"
  | "google-sheets"
  | "airtable"
  | "sql"
  | "rest-api"
  | "paste"

interface DataSourceOption {
  id: DataSourceId
  title: string
  description: string
  icon: LucideIcon
  color: string
  badge?: string
}

interface DataConnectorsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportData: (data: Record<string, any[]>, variables: any[]) => void
}

// ── Constants ───────────────────────────────────────────────────────────────

const DATA_SOURCES: DataSourceOption[] = [
  {
    id: "csv",
    title: "CSV / Excel Upload",
    description: "Upload spreadsheets with smart column detection",
    icon: FileSpreadsheet,
    color: "text-emerald-400",
    badge: "Local",
  },
  {
    id: "google-sheets",
    title: "Google Sheets",
    description: "Connect to publicly shared spreadsheets",
    icon: Table,
    color: "text-amber-400",
    badge: "Cloud",
  },
  {
    id: "airtable",
    title: "Airtable",
    description: "Import data from your Airtable bases",
    icon: Database,
    color: "text-sky-400",
    badge: "Cloud",
  },
  {
    id: "sql",
    title: "SQL Database",
    description: "Query PostgreSQL, MySQL, or SQLite directly",
    icon: Database,
    color: "text-violet-400",
    badge: "Database",
  },
  {
    id: "rest-api",
    title: "REST API",
    description: "Fetch data from any REST endpoint",
    icon: Globe,
    color: "text-rose-400",
    badge: "API",
  },
  {
    id: "paste",
    title: "Paste Data",
    description: "Paste tabular data from clipboard",
    icon: ClipboardList,
    color: "text-orange-400",
  },
]

const TYPE_COLORS: Record<ColumnType, string> = {
  numeric: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  categorical: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  date: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  text: "bg-slate-500/15 text-slate-400 border-slate-500/25",
}

const TYPE_LABELS: Record<ColumnType, string> = {
  numeric: "Numeric",
  categorical: "Categorical",
  date: "Date",
  text: "Text",
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function detectColumnType(values: string[]): ColumnType {
  if (values.length === 0) return "text"
  const sample = values.slice(0, 10).filter(Boolean)
  if (sample.length === 0) return "text"

  // Check date
  const datePatterns = [
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/,
    /^\d{4}-\d{2}-\d{2}T/,
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i,
  ]
  const dateMatchCount = sample.filter((v) =>
    datePatterns.some((p) => p.test(v.trim()))
  ).length
  if (dateMatchCount / sample.length > 0.7) return "date"

  // Check numeric
  const numericCount = sample.filter((v) => {
    const trimmed = v.replace(/[$%,\s]/g, "")
    return !isNaN(Number(trimmed)) && trimmed !== ""
  }).length
  if (numericCount / sample.length > 0.7) return "numeric"

  // Check categorical (low unique ratio)
  const unique = new Set(sample.map((v) => v.trim().toLowerCase()))
  if (unique.size <= 15 && unique.size < sample.length * 0.6) return "categorical"

  return "text"
}

function detectDelimiter(text: string): string {
  const firstLine = text.split("\n")[0] ?? ""
  const counts: Record<string, number> = { ",": 0, "\t": 0, ";": 0, "|": 0 }
  for (const char of firstLine) {
    if (char in counts) counts[char]++
  }
  let maxChar = ","
  let maxCount = 0
  for (const [char, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count
      maxChar = char
    }
  }
  return maxChar
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const delimiter = detectDelimiter(text)
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ""))
  const rows = lines.slice(1).map((line) =>
    line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""))
  )
  return { headers, rows }
}

function generateMockPreview(): { headers: string[]; rows: string[][] } {
  return {
    headers: ["id", "name", "email", "score", "joined_at", "status"],
    rows: [
      ["1", "Alice Chen", "alice@example.com", "94.5", "2024-01-15", "active"],
      ["2", "Bob Smith", "bob@example.com", "87.2", "2024-02-20", "active"],
      ["3", "Carol Wu", "carol@example.com", "91.8", "2024-03-10", "inactive"],
      ["4", "Dan Lee", "dan@example.com", "76.4", "2024-04-05", "active"],
      ["5", "Eve Park", "eve@example.com", "88.9", "2024-05-12", "pending"],
    ],
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export function DataConnectors({
  open,
  onOpenChange,
  onImportData,
}: DataConnectorsProps) {
  // Navigation state
  const [activeSource, setActiveSource] = React.useState<DataSourceId | null>(null)

  // CSV / Upload state
  const [csvText, setCsvText] = React.useState("")
  const [fileDragOver, setFileDragOver] = React.useState(false)

  // Google Sheets state
  const [sheetsUrl, setSheetsUrl] = React.useState("")
  const [sheetsConnected, setSheetsConnected] = React.useState(false)
  const [sheetsLoading, setSheetsLoading] = React.useState(false)

  // Airtable state
  const [airtableApiKey, setAirtableApiKey] = React.useState("")
  const [airtableBaseId, setAirtableBaseId] = React.useState("")
  const [airtableTable, setAirtableTable] = React.useState("")
  const [airtableLoading, setAirtableLoading] = React.useState(false)
  const [airtableConnected, setAirtableConnected] = React.useState(false)

  // SQL state
  const [sqlHost, setSqlHost] = React.useState("")
  const [sqlPort, setSqlPort] = React.useState("5432")
  const [sqlDatabase, setSqlDatabase] = React.useState("")
  const [sqlUsername, setSqlUsername] = React.useState("")
  const [sqlPassword, setSqlPassword] = React.useState("")
  const [sqlQuery, setSqlQuery] = React.useState("SELECT * FROM table_name LIMIT 100")
  const [sqlLoading, setSqlLoading] = React.useState(false)
  const [sqlTested, setSqlTested] = React.useState<"idle" | "success" | "error">("idle")

  // REST API state
  const [apiUrl, setApiUrl] = React.useState("")
  const [apiMethod, setApiMethod] = React.useState("GET")
  const [apiHeaders, setApiHeaders] = React.useState<
    { key: string; value: string }[]
  >([{ key: "", value: "" }])
  const [apiJsonPath, setApiJsonPath] = React.useState("data")
  const [apiLoading, setApiLoading] = React.useState(false)

  // Paste state
  const [pasteText, setPasteText] = React.useState("")

  // Shared preview state
  const [previewData, setPreviewData] = React.useState<{
    headers: string[]
    rows: string[][]
  } | null>(null)
  const [detectedColumns, setDetectedColumns] = React.useState<DetectedColumn[]>([])

  // ── Reset ──

  const resetState = React.useCallback(() => {
    setActiveSource(null)
    setCsvText("")
    setSheetsUrl("")
    setSheetsConnected(false)
    setSheetsLoading(false)
    setAirtableApiKey("")
    setAirtableBaseId("")
    setAirtableTable("")
    setAirtableLoading(false)
    setAirtableConnected(false)
    setSqlHost("")
    setSqlPort("5432")
    setSqlDatabase("")
    setSqlUsername("")
    setSqlPassword("")
    setSqlQuery("SELECT * FROM table_name LIMIT 100")
    setSqlLoading(false)
    setSqlTested("idle")
    setApiUrl("")
    setApiMethod("GET")
    setApiHeaders([{ key: "", value: "" }])
    setApiJsonPath("data")
    setApiLoading(false)
    setPasteText("")
    setPreviewData(null)
    setDetectedColumns([])
    setFileDragOver(false)
  }, [])

  const handleClose = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) resetState()
      onOpenChange(nextOpen)
    },
    [onOpenChange, resetState]
  )

  // ── Preview & column detection ──

  const processPreview = React.useCallback(
    (data: { headers: string[]; rows: string[][] }) => {
      setPreviewData(data)
      const columns: DetectedColumn[] = data.headers.map((name, i) => ({
        name,
        type: detectColumnType(data.rows.map((r) => r[i] ?? "")),
        editable: true,
      }))
      setDetectedColumns(columns)
    },
    []
  )

  const handleRenameColumn = React.useCallback(
    (index: number, newName: string) => {
      setDetectedColumns((prev) =>
        prev.map((col, i) => (i === index ? { ...col, name: newName } : col))
      )
    },
    []
  )

  // ── CSV file handling ──

  const handleFileRead = React.useCallback(
    (text: string) => {
      const { headers, rows } = parseCSV(text)
      if (headers.length > 0) {
        processPreview({ headers, rows: rows.slice(0, 5) })
      }
    },
    [processPreview]
  )

  const handleFileUpload = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        setCsvText(text)
        handleFileRead(text)
      }
      reader.readAsText(file)
    },
    [handleFileRead]
  )

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setFileDragOver(false)
      const file = e.dataTransfer.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        setCsvText(text)
        handleFileRead(text)
      }
      reader.readAsText(file)
    },
    [handleFileRead]
  )

  const handleCSVImport = React.useCallback(() => {
    if (csvText.trim()) handleFileRead(csvText)
  }, [csvText, handleFileRead])

  // ── Google Sheets mock ──

  const handleConnectSheets = React.useCallback(() => {
    if (!sheetsUrl.trim()) return
    setSheetsLoading(true)
    setTimeout(() => {
      setSheetsLoading(false)
      setSheetsConnected(true)
      processPreview(generateMockPreview())
    }, 1500)
  }, [sheetsUrl, processPreview])

  // ── Airtable mock ──

  const handleConnectAirtable = React.useCallback(() => {
    if (!airtableApiKey.trim() || !airtableBaseId.trim() || !airtableTable) return
    setAirtableLoading(true)
    setTimeout(() => {
      setAirtableLoading(false)
      setAirtableConnected(true)
      processPreview(generateMockPreview())
    }, 1800)
  }, [airtableApiKey, airtableBaseId, airtableTable, processPreview])

  // ── SQL mock ──

  const handleTestSQL = React.useCallback(() => {
    if (!sqlHost.trim() || !sqlDatabase.trim()) return
    setSqlLoading(true)
    setTimeout(() => {
      setSqlLoading(false)
      setSqlTested("success")
    }, 1200)
  }, [sqlHost, sqlDatabase])

  const handleImportSQL = React.useCallback(() => {
    setSqlLoading(true)
    setTimeout(() => {
      setSqlLoading(false)
      processPreview(generateMockPreview())
    }, 1500)
  }, [processPreview])

  // ── REST API mock ──

  const handlePreviewAPI = React.useCallback(() => {
    if (!apiUrl.trim()) return
    setApiLoading(true)
    setTimeout(() => {
      setApiLoading(false)
      processPreview(generateMockPreview())
    }, 2000)
  }, [apiUrl, processPreview])

  // ── Paste data ──

  const handleParsePaste = React.useCallback(() => {
    if (!pasteText.trim()) return
    const { headers, rows } = parseCSV(pasteText)
    if (headers.length > 0) {
      processPreview({ headers, rows: rows.slice(0, 5) })
    }
  }, [pasteText, processPreview])

  // ── Final import ──

  const handleFinalImport = React.useCallback(() => {
    if (!previewData || detectedColumns.length === 0) return

    const headers = detectedColumns.map((c) => c.name)
    const data: Record<string, any[]> = {}
    headers.forEach((h) => {
      data[h] = []
    })

    for (const row of previewData.rows) {
      headers.forEach((h, i) => {
        const val = row[i] ?? ""
        const col = detectedColumns[i]
        if (col?.type === "numeric") {
          const num = Number(val.replace(/[$%,\s]/g, ""))
          data[h].push(isNaN(num) ? val : num)
        } else {
          data[h].push(val)
        }
      })
    }

    const variables = detectedColumns.map((col) => ({
      name: col.name,
      type: col.type,
    }))

    onImportData(data, variables)
    handleClose(false)
  }, [previewData, detectedColumns, onImportData, handleClose])

  // ── Render source grid ──

  const renderSourceGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {DATA_SOURCES.map((source) => {
        const Icon = source.icon
        return (
          <button
            key={source.id}
            onClick={() => setActiveSource(source.id)}
            className={cn(
              "glass-card group relative flex items-start gap-4 rounded-xl p-4 text-left",
              "border border-border/50 hover:border-primary/40",
              "bg-card/50 backdrop-blur-sm",
              "transition-all duration-200 hover:shadow-md hover:shadow-primary/5",
              "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                "bg-muted/80 group-hover:bg-muted transition-colors"
              )}
            >
              <Icon className={cn("size-5", source.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {source.title}
                </h3>
                {source.badge && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 font-normal"
                  >
                    {source.badge}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                {source.description}
              </p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground/50 shrink-0 mt-1 group-hover:text-primary/70 group-hover:translate-x-0.5 transition-all" />
          </button>
        )
      })}
    </div>
  )

  // ── Render CSV / Upload panel ──

  const renderCSVPanel = () => (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setFileDragOver(true)
        }}
        onDragLeave={() => setFileDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
          fileDragOver
            ? "border-primary/60 bg-primary/5 scale-[1.01]"
            : "border-border/60 hover:border-primary/30"
        )}
      >
        <Upload
          className={cn(
            "size-10 mx-auto mb-3 transition-colors",
            fileDragOver ? "text-primary" : "text-muted-foreground/60"
          )}
        />
        <p className="text-sm font-medium text-foreground">
          Drag & drop files here
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Supports .csv, .tsv, .xlsx, .json
        </p>
        <input
          type="file"
          accept=".csv,.tsv,.xlsx,.json,.txt"
          onChange={handleFileUpload}
          className="mt-3 text-xs w-full max-w-xs mx-auto block file:text-foreground file:text-xs file:border file:border-border file:rounded-md file:px-2 file:py-0.5 file:mr-2 file:bg-muted/50"
        />
      </div>

      <div className="relative">
        <Textarea
          placeholder="Or paste CSV data here..."
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          className="h-28 text-xs font-mono resize-none"
        />
        {csvText && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCsvText("")}
            className="absolute top-2 right-2 size-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="size-3" />
          </Button>
        )}
      </div>

      {csvText.trim() && (
        <Button
          onClick={handleCSVImport}
          className="w-full"
          size="sm"
        >
          <Zap className="size-3.5" />
          Parse & Preview
        </Button>
      )}
    </div>
  )

  // ── Render Google Sheets panel ──

  const renderSheetsPanel = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sheets-url" className="text-xs">
          Google Sheets URL
        </Label>
        <Input
          id="sheets-url"
          placeholder="https://docs.google.com/spreadsheets/d/..."
          value={sheetsUrl}
          onChange={(e) => {
            setSheetsUrl(e.target.value)
            setSheetsConnected(false)
          }}
          className="text-sm"
        />
        <p className="text-[11px] text-muted-foreground">
          The spreadsheet must be publicly accessible (Published to web)
        </p>
      </div>

      {sheetsConnected && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
          <Check className="size-4 text-emerald-400 shrink-0" />
          <span className="text-xs text-emerald-300">
            Connected! 523 rows, 12 columns detected
          </span>
        </div>
      )}

      <Button
        onClick={handleConnectSheets}
        disabled={!sheetsUrl.trim() || sheetsLoading}
        className="w-full"
        size="sm"
      >
        {sheetsLoading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : sheetsConnected ? (
          <RefreshCw className="size-3.5" />
        ) : (
          <ArrowRight className="size-3.5" />
        )}
        {sheetsLoading
          ? "Connecting..."
          : sheetsConnected
            ? "Reconnect"
            : "Connect"}
      </Button>
    </div>
  )

  // ── Render Airtable panel ──

  const renderAirtablePanel = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="airtable-key" className="text-xs">
          API Key
        </Label>
        <Input
          id="airtable-key"
          type="password"
          placeholder="pat..."
          value={airtableApiKey}
          onChange={(e) => {
            setAirtableApiKey(e.target.value)
            setAirtableConnected(false)
          }}
          className="text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="airtable-base" className="text-xs">
          Base ID
        </Label>
        <Input
          id="airtable-base"
          placeholder="app..."
          value={airtableBaseId}
          onChange={(e) => {
            setAirtableBaseId(e.target.value)
            setAirtableConnected(false)
          }}
          className="text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Table</Label>
        <Select
          value={airtableTable}
          onValueChange={(val) => {
            setAirtableTable(val)
            setAirtableConnected(false)
          }}
        >
          <SelectTrigger className="w-full text-sm">
            <SelectValue placeholder="Select a table" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="users">Users</SelectItem>
            <SelectItem value="products">Products</SelectItem>
            <SelectItem value="orders">Orders</SelectItem>
            <SelectItem value="analytics">Analytics</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {airtableConnected && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
          <Check className="size-4 text-emerald-400 shrink-0" />
          <span className="text-xs text-emerald-300">
            Connected! 1,247 records loaded
          </span>
        </div>
      )}

      <Button
        onClick={handleConnectAirtable}
        disabled={
          !airtableApiKey.trim() ||
          !airtableBaseId.trim() ||
          !airtableTable ||
          airtableLoading
        }
        className="w-full"
        size="sm"
      >
        {airtableLoading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <ArrowRight className="size-3.5" />
        )}
        {airtableLoading ? "Connecting..." : "Connect"}
      </Button>
    </div>
  )

  // ── Render SQL panel ──

  const renderSQLPanel = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label htmlFor="sql-host" className="text-xs">
            Host
          </Label>
          <Input
            id="sql-host"
            placeholder="localhost"
            value={sqlHost}
            onChange={(e) => setSqlHost(e.target.value)}
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sql-port" className="text-xs">
            Port
          </Label>
          <Input
            id="sql-port"
            placeholder="5432"
            value={sqlPort}
            onChange={(e) => setSqlPort(e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sql-db" className="text-xs">
            Database
          </Label>
          <Input
            id="sql-db"
            placeholder="my_database"
            value={sqlDatabase}
            onChange={(e) => setSqlDatabase(e.target.value)}
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sql-user" className="text-xs">
            Username
          </Label>
          <Input
            id="sql-user"
            placeholder="postgres"
            value={sqlUsername}
            onChange={(e) => setSqlUsername(e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sql-pass" className="text-xs">
          Password
        </Label>
        <Input
          id="sql-pass"
          type="password"
          placeholder="••••••••"
          value={sqlPassword}
          onChange={(e) => setSqlPassword(e.target.value)}
          className="text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sql-query" className="text-xs">
          Query
        </Label>
        <Textarea
          id="sql-query"
          value={sqlQuery}
          onChange={(e) => setSqlQuery(e.target.value)}
          className="text-xs font-mono h-16 resize-none"
        />
      </div>

      {sqlTested === "success" && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
          <Check className="size-4 text-emerald-400 shrink-0" />
          <span className="text-xs text-emerald-300">
            Connection successful!
          </span>
        </div>
      )}
      {sqlTested === "error" && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
          <AlertCircle className="size-4 text-destructive shrink-0" />
          <span className="text-xs text-destructive">
            Connection failed. Check your credentials.
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleTestSQL}
          disabled={!sqlHost.trim() || !sqlDatabase.trim() || sqlLoading}
          className="flex-1"
          size="sm"
        >
          {sqlLoading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Settings className="size-3.5" />
          )}
          Test Connection
        </Button>
        <Button
          onClick={handleImportSQL}
          disabled={!sqlHost.trim() || !sqlDatabase.trim() || sqlLoading}
          className="flex-1"
          size="sm"
        >
          <Zap className="size-3.5" />
          Import
        </Button>
      </div>
    </div>
  )

  // ── Render REST API panel ──

  const renderAPIPanel = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={apiMethod} onValueChange={setApiMethod}>
          <SelectTrigger className="w-[90px] text-xs font-mono shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="https://api.example.com/data"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          className="text-sm flex-1"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Headers</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setApiHeaders((prev) => [...prev, { key: "", value: "" }])}
            className="h-6 text-xs gap-1 px-2"
          >
            <Plus className="size-3" />
            Add
          </Button>
        </div>
        <div className="space-y-2 max-h-36 overflow-y-auto">
          {apiHeaders.map((header, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                placeholder="Key"
                value={header.key}
                onChange={(e) => {
                  const next = [...apiHeaders]
                  next[i] = { ...next[i], key: e.target.value }
                  setApiHeaders(next)
                }}
                className="text-xs h-8"
              />
              <Input
                placeholder="Value"
                value={header.value}
                onChange={(e) => {
                  const next = [...apiHeaders]
                  next[i] = { ...next[i], value: e.target.value }
                  setApiHeaders(next)
                }}
                className="text-xs h-8"
              />
              {apiHeaders.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    setApiHeaders((prev) => prev.filter((_, j) => j !== i))
                  }
                >
                  <Trash2 className="size-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="api-path" className="text-xs">
          JSON Path
        </Label>
        <Input
          id="api-path"
          placeholder="data.results"
          value={apiJsonPath}
          onChange={(e) => setApiJsonPath(e.target.value)}
          className="text-xs font-mono"
        />
        <p className="text-[11px] text-muted-foreground">
          Dot-notation path to the array in the response JSON
        </p>
      </div>

      <Button
        onClick={handlePreviewAPI}
        disabled={!apiUrl.trim() || apiLoading}
        className="w-full"
        size="sm"
      >
        {apiLoading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Zap className="size-3.5" />
        )}
        {apiLoading ? "Fetching..." : "Preview Data"}
      </Button>
    </div>
  )

  // ── Render Paste panel ──

  const renderPastePanel = () => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Paste your data</Label>
          {pasteText.trim() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPasteText("")
                setPreviewData(null)
                setDetectedColumns([])
              }}
              className="h-6 text-xs gap-1 px-2"
            >
              <Trash2 className="size-3" />
              Clear
            </Button>
          )}
        </div>
        <Textarea
          placeholder={`Paste tabular data here...\n\nExample:\nName, Age, City\nAlice, 30, New York\nBob, 25, London\n\nAuto-detects: CSV (,), TSV (tab), Semicolon (;)`}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          className="h-36 text-xs font-mono resize-none"
        />
      </div>

      {pasteText.trim() && (
        <>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="size-3" />
            <span>
              Detected delimiter:{" "}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-1">
                {detectDelimiter(pasteText) === "\t"
                  ? "Tab"
                  : detectDelimiter(pasteText) === ";"
                    ? "Semicolon (;)"
                    : "Comma (,)"}
              </Badge>
            </span>
          </div>
          <Button
            onClick={handleParsePaste}
            className="w-full"
            size="sm"
          >
            <Zap className="size-3.5" />
            Parse & Preview
          </Button>
        </>
      )}
    </div>
  )

  // ── Source panel dispatcher ──

  const renderSourcePanel = () => {
    switch (activeSource) {
      case "csv":
        return renderCSVPanel()
      case "google-sheets":
        return renderSheetsPanel()
      case "airtable":
        return renderAirtablePanel()
      case "sql":
        return renderSQLPanel()
      case "rest-api":
        return renderAPIPanel()
      case "paste":
        return renderPastePanel()
      default:
        return null
    }
  }

  // ── Render column detection summary ──

  const renderColumnDetection = () => {
    if (detectedColumns.length === 0) return null

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-amber-400" />
          <span className="text-sm font-semibold text-foreground">
            Smart Column Detection
          </span>
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {detectedColumns.length} columns detected
          </Badge>
        </div>

        {/* Column type badges */}
        <div className="flex flex-wrap gap-1.5">
          {detectedColumns.map((col, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                value={col.name}
                onChange={(e) => handleRenameColumn(i, e.target.value)}
                className="bg-transparent text-xs font-medium text-foreground border-none outline-none w-auto max-w-[120px] focus:max-w-[200px] transition-all focus:bg-muted/50 rounded px-1 -ml-1"
                aria-label={`Column ${i + 1} name`}
              />
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0 h-4 font-normal", TYPE_COLORS[col.type])}
              >
                {TYPE_LABELS[col.type]}
              </Badge>
            </div>
          ))}
        </div>

        {/* Mini preview table */}
        {previewData && (
          <ScrollArea className="max-h-44 rounded-lg border border-border/50">
            <UITable>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-[11px] text-muted-foreground h-8 px-3 font-medium w-10">
                    #
                  </TableHead>
                  {detectedColumns.map((col, i) => (
                    <TableHead
                      key={i}
                      className="text-[11px] text-muted-foreground h-8 px-3 font-medium"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-block size-1.5 rounded-full shrink-0",
                            col.type === "numeric"
                              ? "bg-blue-400"
                              : col.type === "categorical"
                                ? "bg-amber-400"
                                : col.type === "date"
                                  ? "bg-emerald-400"
                                  : "bg-slate-400"
                          )}
                        />
                        {col.name}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.rows.map((row, ri) => (
                  <TableRow key={ri} className="border-border/30">
                    <TableCell className="text-[11px] text-muted-foreground/60 py-1.5 px-3 font-mono">
                      {ri + 1}
                    </TableCell>
                    {row.map((cell, ci) => (
                      <TableCell
                        key={ci}
                        className="text-[11px] py-1.5 px-3 font-mono max-w-[150px] truncate"
                      >
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </UITable>
          </ScrollArea>
        )}
      </div>
    )
  }

  // ── Main render ──

  const activeSourceMeta = DATA_SOURCES.find((s) => s.id === activeSource)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
          <DialogHeader className="text-left space-y-1.5">
            <div className="flex items-center gap-3">
              {activeSource && activeSourceMeta && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 -ml-1.5"
                  onClick={() => {
                    setActiveSource(null)
                    setPreviewData(null)
                    setDetectedColumns([])
                  }}
                >
                  <ChevronLeft className="size-4" />
                </Button>
              )}
              <div className="flex items-center gap-2">
                {activeSourceMeta && (
                  <activeSourceMeta.icon
                    className={cn("size-5", activeSourceMeta.color)}
                  />
                )}
                <DialogTitle className="text-base">
                  {activeSource ? activeSourceMeta?.title : "Data Connectors"}
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {activeSource
                ? activeSourceMeta?.description
                : "Choose a data source to import into your workflow"}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!activeSource ? (
            renderSourceGrid()
          ) : (
            <div className="space-y-5">
              {/* Source-specific form */}
              <div>{renderSourcePanel()}</div>

              {/* Column detection (shown after preview is available) */}
              {renderColumnDetection()}
            </div>
          )}
        </div>

        {/* Footer */}
        {activeSource && detectedColumns.length > 0 && (
          <div className="px-6 py-4 border-t border-border/40 shrink-0">
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPreviewData(null)
                  setDetectedColumns([])
                }}
              >
                Reset
              </Button>
              <Button size="sm" onClick={handleFinalImport}>
                <Check className="size-3.5" />
                Import Data
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
