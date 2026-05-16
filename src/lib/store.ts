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
  exportCSV: () => string
  exportJSON: () => string

  loadProjectsFromStorage: () => void
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

        // Detect types
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
