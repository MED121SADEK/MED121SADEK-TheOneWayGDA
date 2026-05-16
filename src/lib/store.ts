import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Variable {
  id: string
  name: string
  type: 'numeric' | 'string' | 'date' | 'currency'
  label: string
  width: number
  decimals: number
  missing: string
  values: Record<string, string>
}

export interface OutputItem {
  id: string
  title: string
  type: 'table' | 'chart' | 'text'
  content: any
  timestamp: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: string
}

export interface ScanField {
  label: string
  value: string
  confidence: number
  type: 'string' | 'numeric' | 'date' | 'currency' | 'percentage' | 'boolean' | 'id' | 'email' | 'phone'
}

export interface ScanTable {
  headers: string[]
  rows: any[][]
}

export interface ScanResult {
  id: string
  timestamp: string
  fields: ScanField[]
  tables: ScanTable[]
  rawText: string
  summary: string
}

export interface ValidationIssue {
  row: number
  column: string
  value: any
  severity: 'error' | 'warning' | 'info'
  message: string
  suggestion: string
}

export interface CleaningStats {
  totalRows: number
  cleanedCells: number
  outliers: number
  duplicates: number
  missing: number
}

export interface BatchItem {
  id: string
  name: string
  status: 'pending' | 'processing' | 'done' | 'error'
  result?: ScanResult
}

export interface Project {
  id: string
  name: string
  description: string
  data: Record<string, any[]>
  variables: Variable[]
  outputs: OutputItem[]
  createdAt: string
  updatedAt: string
}

interface AppState {
  view: 'landing' | 'workspace'
  workspaceTab: 'data' | 'variables' | 'output' | 'syntax'
  currentProject: Project | null
  projects: Project[]
  data: Record<string, any[]>
  variables: Variable[]
  selectedVariables: string[]
  outputs: OutputItem[]
  chatMessages: ChatMessage[]
  isAiTyping: boolean
  syntaxHistory: string[]

  // Document AI - Scan
  scanState: 'idle' | 'uploading' | 'processing' | 'done' | 'error'
  scanResults: ScanResult | null
  scanHistory: ScanResult[]

  // Document AI - Validation & Cleaning
  validationIssues: ValidationIssue[] | null
  cleaningStats: CleaningStats | null

  // Document AI - Batch
  batchQueue: BatchItem[]

  setView: (view: 'landing' | 'workspace') => void
  setWorkspaceTab: (tab: 'data' | 'variables' | 'output' | 'syntax') => void
  createProject: (name: string, description?: string) => void
  loadProject: (id: string) => void
  saveProject: () => void
  deleteProject: (id: string) => void
  renameProject: (id: string, name: string) => void

  setData: (data: Record<string, any[]>) => void
  addVariable: (variable: Variable) => void
  updateVariable: (id: string, updates: Partial<Variable>) => void
  deleteVariable: (id: string) => void
  setCellValue: (varName: string, rowIndex: number, value: any) => void
  addRow: () => void
  deleteRow: (index: number) => void

  toggleVariableSelection: (varName: string) => void
  setSelectedVariables: (names: string[]) => void

  addOutput: (output: OutputItem) => void
  clearOutputs: () => void

  addChatMessage: (message: ChatMessage) => void
  setAiTyping: (typing: boolean) => void
  clearChat: () => void

  addSyntax: (syntax: string) => void

  importCSV: (text: string) => void
  importFile: (file: File) => void
  exportCSV: () => string
  exportJSON: () => string

  loadProjectsFromStorage: () => void

  // Document AI - Scan actions
  setScanState: (state: 'idle' | 'uploading' | 'processing' | 'done' | 'error') => void
  setScanResults: (results: ScanResult | null) => void
  clearScanHistory: () => void

  // Document AI - Validation & Cleaning actions
  setValidationIssues: (issues: ValidationIssue[] | null) => void
  setCleaningStats: (stats: CleaningStats | null) => void

  // Document AI - Batch actions
  addToBatchQueue: (item: BatchItem) => void

  // Document AI - Import scan results into data
  importScanResults: (results: ScanResult) => void
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function rowCount(data: Record<string, any[]>): number {
  const keys = Object.keys(data)
  if (keys.length === 0) return 0
  return Math.max(...keys.map(k => data[k]?.length ?? 0))
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      view: 'landing',
      workspaceTab: 'data',
      currentProject: null,
      projects: [],
      data: {},
      variables: [],
      selectedVariables: [],
      outputs: [],
      chatMessages: [],
      isAiTyping: false,
      syntaxHistory: [],

      // Document AI
      scanState: 'idle',
      scanResults: null,
      scanHistory: [],
      validationIssues: null,
      cleaningStats: null,
      batchQueue: [],

      setView: (view) => set({ view }),
      setWorkspaceTab: (tab) => set({ workspaceTab: tab }),

      createProject: (name, description = '') => {
        const project: Project = {
          id: uid(),
          name,
          description,
          data: {},
          variables: [],
          outputs: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set({
          currentProject: project,
          data: {},
          variables: [],
          outputs: [],
          selectedVariables: [],
          chatMessages: [],
          syntaxHistory: [],
          view: 'workspace',
          workspaceTab: 'data',
        })
        const existing = get().projects
        set({ projects: [project, ...existing] })
      },

      loadProject: (id) => {
        const project = get().projects.find(p => p.id === id)
        if (!project) return
        set({
          currentProject: project,
          data: project.data,
          variables: project.variables,
          outputs: project.outputs || [],
          selectedVariables: [],
          chatMessages: [],
          syntaxHistory: [],
          view: 'workspace',
          workspaceTab: 'data',
        })
      },

      saveProject: () => {
        const { currentProject, projects, data, variables, outputs } = get()
        if (!currentProject) return
        const updated: Project = {
          ...currentProject,
          data,
          variables,
          outputs,
          updatedAt: new Date().toISOString(),
        }
        set({
          currentProject: updated,
          projects: projects.map(p => p.id === updated.id ? updated : p),
        })
      },

      deleteProject: (id) => {
        const { currentProject, projects } = get()
        set({
          projects: projects.filter(p => p.id !== id),
          currentProject: currentProject?.id === id ? null : currentProject,
          view: currentProject?.id === id ? 'landing' : get().view,
        })
      },

      renameProject: (id, name) => {
        const { currentProject, projects } = get()
        const updated = projects.map(p =>
          p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p
        )
        set({
          projects: updated,
          currentProject: currentProject?.id === id
            ? { ...currentProject, name, updatedAt: new Date().toISOString() }
            : currentProject,
        })
      },

      setData: (data) => set({ data }),
      addVariable: (variable) => set(s => ({
        variables: [...s.variables, variable],
        data: { ...s.data, [variable.name]: [] },
      })),
      updateVariable: (id, updates) => set(s => {
        const old = s.variables.find(v => v.id === id)
        if (!old) return s
        const vars = s.variables.map(v => v.id === id ? { ...v, ...updates } : v)
        let data = { ...s.data }
        if (updates.name && updates.name !== old.name) {
          data[updates.name] = data[old.name]
          delete data[old.name]
        }
        return { variables: vars, data }
      }),
      deleteVariable: (id) => set(s => {
        const v = s.variables.find(x => x.id === id)
        if (!v) return s
        const data = { ...s.data }
        delete data[v.name]
        return {
          variables: s.variables.filter(x => x.id !== id),
          data,
          selectedVariables: s.selectedVariables.filter(n => n !== v.name),
        }
      }),
      setCellValue: (varName, rowIndex, value) => set(s => {
        const arr = [...(s.data[varName] || [])]
        while (arr.length <= rowIndex) arr.push(null)
        arr[rowIndex] = value
        return { data: { ...s.data, [varName]: arr } }
      }),
      addRow: () => set(s => {
        const data = { ...s.data }
        const n = rowCount(data)
        for (const key of Object.keys(data)) {
          data[key] = [...(data[key] || []), null]
        }
        return { data }
      }),
      deleteRow: (index) => set(s => {
        const data = { ...s.data }
        for (const key of Object.keys(data)) {
          data[key] = (data[key] || []).filter((_: any, i: number) => i !== index)
        }
        return { data }
      }),

      toggleVariableSelection: (varName) => set(s => ({
        selectedVariables: s.selectedVariables.includes(varName)
          ? s.selectedVariables.filter(n => n !== varName)
          : [...s.selectedVariables, varName],
      })),
      setSelectedVariables: (names) => set({ selectedVariables: names }),

      addOutput: (output) => set(s => ({ outputs: [...s.outputs, output] })),
      clearOutputs: () => set({ outputs: [] }),

      addChatMessage: (message) => set(s => ({ chatMessages: [...s.chatMessages, message] })),
      setAiTyping: (typing) => set({ isAiTyping: typing }),
      clearChat: () => set({ chatMessages: [] }),

      addSyntax: (syntax) => set(s => ({ syntaxHistory: [...s.syntaxHistory, syntax] })),

      importCSV: (text) => {
        // Try PapaParse first, fallback to manual parsing
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const Papa = require('papaparse')
          const result = Papa.parse(text.trim(), {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false, // We do our own typing
          })

          if (result.data && result.data.length > 0 && result.meta.fields) {
            const headers = result.meta.fields.filter(Boolean)
            const data: Record<string, any[]> = {}
            const variables: Variable[] = []

            headers.forEach(name => {
              data[name] = []
              variables.push({
                id: uid(), name, type: 'numeric', label: name, width: 8, decimals: 2, missing: '', values: {},
              })
            })

            for (const row of result.data) {
              headers.forEach(h => {
                const raw = String(row[h] ?? '').trim()
                const num = parseFloat(raw)
                data[h].push(isNaN(num) || raw === '' ? raw : num)
              })
            }

            variables.forEach(v => {
              const col = data[v.name]
              const nonEmpty = col.filter(x => x !== '' && x !== null && x !== undefined)
              if (nonEmpty.length === 0) return
              if (nonEmpty.every(x => typeof x === 'number')) {
                v.type = 'numeric'
              } else if (nonEmpty.every(x => /^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}$/.test(String(x)))) {
                v.type = 'date'
                v.decimals = 0
              } else if (nonEmpty.every(x => /^\$?\d+[,.]?\d*$/.test(String(x)))) {
                v.type = 'currency'
              } else {
                v.type = 'string'
                v.decimals = 0
              }
            })

            set({ data, variables, selectedVariables: [], outputs: [], view: 'workspace', workspaceTab: 'data' })
            return
          }
        } catch {
          // Fallback to manual parsing
        }

        // Manual CSV parsing fallback
        const lines = text.trim().split('\n')
        if (lines.length < 2) return
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
        const data: Record<string, any[]> = {}
        const variables: Variable[] = []

        headers.forEach(name => {
          data[name] = []
          variables.push({
            id: uid(),
            name,
            type: 'numeric',
            label: name,
            width: 8,
            decimals: 2,
            missing: '',
            values: {},
          })
        })

        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
          headers.forEach((h, j) => {
            const raw = vals[j] || ''
            const num = parseFloat(raw)
            data[h].push(isNaN(num) || raw === '' ? raw : num)
          })
        }

        variables.forEach(v => {
          const col = data[v.name]
          const nonEmpty = col.filter(x => x !== '' && x !== null && x !== undefined)
          if (nonEmpty.length === 0) return
          const allNumeric = nonEmpty.every(x => typeof x === 'number')
          if (allNumeric) {
            v.type = 'numeric'
          } else {
            v.type = 'string'
            v.decimals = 0
          }
        })

        set({ data, variables, selectedVariables: [], outputs: [], view: 'workspace', workspaceTab: 'data' })
      },

      importFile: (file) => {
        const ext = file.name.split('.').pop()?.toLowerCase()

        if (ext === 'xlsx' || ext === 'xls') {
          // Excel file - use SheetJS
          const reader = new FileReader()
          reader.onload = (ev) => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              const XLSX = require('xlsx')
              const wb = XLSX.read(ev.target!.result, { type: 'array' })
              const sheetName = wb.SheetNames[0]
              const ws = wb.Sheets[sheetName]
              const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, any>[]

              if (jsonData.length === 0) return

              const headers = Object.keys(jsonData[0])
              const data: Record<string, any[]> = {}
              const variables: Variable[] = []

              headers.forEach(name => {
                data[name] = []
                variables.push({
                  id: uid(), name, type: 'numeric', label: name, width: 8, decimals: 2, missing: '', values: {},
                })
              })

              for (const row of jsonData) {
                headers.forEach(h => {
                  const raw = String(row[h] ?? '').trim()
                  const num = parseFloat(raw)
                  data[h].push(isNaN(num) || raw === '' ? raw : num)
                })
              }

              variables.forEach(v => {
                const col = data[v.name]
                const nonEmpty = col.filter(x => x !== '' && x !== null && x !== undefined)
                if (nonEmpty.length === 0) return
                if (nonEmpty.every(x => typeof x === 'number')) {
                  v.type = 'numeric'
                } else if (nonEmpty.every(x => /^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}$/.test(String(x)))) {
                  v.type = 'date'
                  v.decimals = 0
                } else {
                  v.type = 'string'
                  v.decimals = 0
                }
              })

              set({ data, variables, selectedVariables: [], outputs: [], view: 'workspace', workspaceTab: 'data' })
            } catch (err) {
              console.error('Excel import error:', err)
            }
          }
          reader.readAsArrayBuffer(file)
        } else {
          // CSV or text file
          const reader = new FileReader()
          reader.onload = (ev) => {
            const text = ev.target?.result as string
            if (text) get().importCSV(text)
          }
          reader.readAsText(file)
        }
      },

      exportCSV: () => {
        const { data, variables } = get()
        const names = variables.map(v => v.name)
        const n = rowCount(data)
        let csv = names.join(',') + '\n'
        for (let i = 0; i < n; i++) {
          csv += names.map(name => {
            const val = data[name]?.[i]
            return val === null || val === undefined ? '' : String(val)
          }).join(',') + '\n'
        }
        return csv
      },

      exportJSON: () => {
        const { currentProject, data, variables, outputs } = get()
        return JSON.stringify({ project: currentProject, data, variables, outputs }, null, 2)
      },

      loadProjectsFromStorage: () => {},

      // Document AI - Scan actions
      setScanState: (state) => set({ scanState: state }),
      setScanResults: (results) => set(s => ({
        scanResults: results,
        scanState: results ? 'done' : 'idle',
        scanHistory: results ? [results, ...s.scanHistory] : s.scanHistory,
      })),
      clearScanHistory: () => set({ scanHistory: [], scanResults: null, scanState: 'idle' }),

      // Document AI - Validation & Cleaning actions
      setValidationIssues: (issues) => set({ validationIssues: issues }),
      setCleaningStats: (stats) => set({ cleaningStats: stats }),

      // Document AI - Batch actions
      addToBatchQueue: (item) => set(s => ({
        batchQueue: [...s.batchQueue, item],
      })),

      // Document AI - Import scan results into variables + data
      importScanResults: (results) => {
        const newVariables: Variable[] = []
        const newData: Record<string, any[]> = {}

        // Create variables and data from extracted fields
        for (const field of results.fields) {
          const varName = field.label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '')
            .slice(0, 50)

          const existingVar = get().variables.find(v => v.name === varName)
          if (existingVar) continue

          const detectedType: Variable['type'] =
            field.type === 'numeric' || field.type === 'currency' || field.type === 'percentage'
              ? 'numeric'
              : field.type === 'date'
              ? 'date'
              : 'string'

          newVariables.push({
            id: uid(),
            name: varName,
            type: detectedType,
            label: field.label,
            width: Math.max(8, String(field.value).length),
            decimals: detectedType === 'numeric' ? 2 : 0,
            missing: '',
            values: {},
          })
          newData[varName] = [field.value]
        }

        // Create variables and data from extracted tables
        for (const table of results.tables) {
          for (let colIdx = 0; colIdx < table.headers.length; colIdx++) {
            const header = table.headers[colIdx]
            const varName = header
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_')
              .replace(/^_|_$/g, '')
              .slice(0, 50)

            const existingVar = get().variables.find(v => v.name === varName)
            if (existingVar) continue

            const colValues = table.rows.map(row => row[colIdx] ?? '')
            const allNumeric = colValues.every(v => v === '' || !isNaN(parseFloat(v)))

            newVariables.push({
              id: uid(),
              name: varName,
              type: allNumeric ? 'numeric' : 'string',
              label: header,
              width: Math.max(8, ...colValues.map(v => String(v).length)),
              decimals: allNumeric ? 2 : 0,
              missing: '',
              values: {},
            })
            newData[varName] = colValues.map(v => {
              if (v === '') return ''
              const num = parseFloat(v)
              return allNumeric && !isNaN(num) ? num : v
            })
          }
        }

        if (newVariables.length === 0) return

        // Merge with existing data
        const currentData = { ...get().data, ...newData }
        const currentVariables = [...get().variables, ...newVariables]

        set({
          data: currentData,
          variables: currentVariables,
          view: 'workspace',
          workspaceTab: 'data',
        })
      },
    }),
    {
      name: 'oneway-storage',
      partialize: (state) => ({
        projects: state.projects,
        currentProject: state.currentProject,
      }),
    }
  )
)
