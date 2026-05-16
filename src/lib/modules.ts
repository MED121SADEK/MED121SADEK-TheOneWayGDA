import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AppModule {
  id: string
  name: string
  nameKey: string
  descriptionKey: string
  version: string
  category: 'statistical' | 'ai' | 'visualization' | 'integration' | 'ui'
  description: string
  enabled: boolean
  installedAt: string
  lastUpdated: string
  dependencies?: string[]
  author?: string
}

export interface ModuleUpdate {
  moduleId: string
  moduleName: string
  currentVersion: string
  latestVersion: string
  changelog: string
  releaseDate: string
  critical: boolean
  priority: 'critical' | 'recommended' | 'optional'
}

export const APP_VERSION = '2.4.0'

interface ModuleRegistry {
  modules: AppModule[]
  pendingUpdates: ModuleUpdate[]
  lastChecked: string | null
  isChecking: boolean

  registerModule: (module: Omit<AppModule, 'installedAt' | 'lastUpdated'>) => void
  unregisterModule: (id: string) => void
  enableModule: (id: string) => void
  disableModule: (id: string) => void
  getModule: (id: string) => AppModule | undefined
  getModulesByCategory: (category: string) => AppModule[]
  setPendingUpdates: (updates: ModuleUpdate[]) => void
  clearPendingUpdates: () => void
  setChecking: (checking: boolean) => void
  setLastChecked: (date: string) => void
  updateModuleVersion: (id: string, version: string) => void
}

const INITIAL_MODULES: Omit<AppModule, 'installedAt' | 'lastUpdated'>[] = [
  {
    id: 'core-statistical-engine',
    name: 'Core Statistical Engine',
    nameKey: 'modules.coreStatisticalEngine',
    descriptionKey: 'modules.coreStatisticalEngineDesc',
    version: '2.4.0',
    category: 'statistical',
    description: 'Core computation engine for all statistical analyses.',
    enabled: true,
    author: 'TheOneWayGDA Team',
    dependencies: [],
  },
  {
    id: 'ai-assistant',
    name: 'AI Assistant',
    nameKey: 'modules.aiAssistant',
    descriptionKey: 'modules.aiAssistantDesc',
    version: '2.4.0',
    category: 'ai',
    description: 'Natural language AI chat assistant powered by GLM-4.6V.',
    enabled: true,
    author: 'TheOneWayGDA Team',
    dependencies: ['core-statistical-engine'],
  },
  {
    id: 'ocr-document-scanner',
    name: 'OCR Document Scanner',
    nameKey: 'modules.ocrScanner',
    descriptionKey: 'modules.ocrScannerDesc',
    version: '2.4.0',
    category: 'ai',
    description: 'Document scanning with AI-powered OCR.',
    enabled: true,
    author: 'TheOneWayGDA Team',
    dependencies: ['ai-assistant'],
  },
  {
    id: 'data-cleaning-engine',
    name: 'Data Cleaning Engine',
    nameKey: 'modules.dataCleaningEngine',
    descriptionKey: 'modules.dataCleaningEngineDesc',
    version: '2.3.2',
    category: 'statistical',
    description: 'AI-powered data cleaning and normalization.',
    enabled: true,
    author: 'TheOneWayGDA Team',
    dependencies: ['core-statistical-engine', 'ai-assistant'],
  },
  {
    id: 'correlation-matrix',
    name: 'Correlation Matrix',
    nameKey: 'modules.correlationMatrix',
    descriptionKey: 'modules.correlationMatrixDesc',
    version: '2.3.0',
    category: 'visualization',
    description: 'Compute and visualize correlation matrices.',
    enabled: true,
    author: 'TheOneWayGDA Team',
    dependencies: ['core-statistical-engine'],
  },
  {
    id: 'linear-regression',
    name: 'Linear Regression',
    nameKey: 'modules.linearRegression',
    descriptionKey: 'modules.linearRegressionDesc',
    version: '2.3.0',
    category: 'statistical',
    description: 'Simple and multiple linear regression with diagnostics.',
    enabled: true,
    author: 'TheOneWayGDA Team',
    dependencies: ['core-statistical-engine'],
  },
  {
    id: 'descriptive-statistics',
    name: 'Descriptive Statistics',
    nameKey: 'modules.descriptiveStatistics',
    descriptionKey: 'modules.descriptiveStatisticsDesc',
    version: '2.2.0',
    category: 'statistical',
    description: 'Comprehensive descriptive statistics calculations.',
    enabled: true,
    author: 'TheOneWayGDA Team',
    dependencies: ['core-statistical-engine'],
  },
  {
    id: 'data-validation',
    name: 'Data Validation',
    nameKey: 'modules.dataValidation',
    descriptionKey: 'modules.dataValidationDesc',
    version: '2.1.0',
    category: 'statistical',
    description: 'Smart data validation with AI-powered suggestions.',
    enabled: true,
    author: 'TheOneWayGDA Team',
    dependencies: ['core-statistical-engine', 'ai-assistant'],
  },
  {
    id: 'multi-language-support',
    name: 'Multi-language Support',
    nameKey: 'modules.multilanguageSupport',
    descriptionKey: 'modules.multilanguageSupportDesc',
    version: '2.0.0',
    category: 'ui',
    description: 'Full interface translation for 8 languages.',
    enabled: true,
    author: 'TheOneWayGDA Team',
    dependencies: [],
  },
  {
    id: 'export-system',
    name: 'Export System',
    nameKey: 'modules.exportSystem',
    descriptionKey: 'modules.exportSystemDesc',
    version: '2.0.0',
    category: 'integration',
    description: 'Export data and results in multiple formats.',
    enabled: true,
    author: 'TheOneWayGDA Team',
    dependencies: ['core-statistical-engine'],
  },
]

function getInitialModules(): AppModule[] {
  const now = new Date().toISOString()
  return INITIAL_MODULES.map(m => ({
    ...m,
    installedAt: '2026-02-20T00:00:00.000Z',
    lastUpdated: now,
  }))
}

export const useModuleRegistry = create<ModuleRegistry>()(
  persist(
    (set, get) => ({
      modules: getInitialModules(),
      pendingUpdates: [],
      lastChecked: null,
      isChecking: false,

      registerModule: (module) => {
        const now = new Date().toISOString()
        const existing = get().modules.find(m => m.id === module.id)
        if (existing) {
          set(s => ({
            modules: s.modules.map(m =>
              m.id === module.id
                ? { ...m, ...module, lastUpdated: now }
                : m
            ),
          }))
        } else {
          set(s => ({
            modules: [...s.modules, { ...module, installedAt: now, lastUpdated: now }],
          }))
        }
      },

      unregisterModule: (id) => {
        set(s => ({
          modules: s.modules.filter(m => m.id !== id),
          pendingUpdates: s.pendingUpdates.filter(u => u.moduleId !== id),
        }))
      },

      enableModule: (id) => {
        set(s => ({
          modules: s.modules.map(m =>
            m.id === id ? { ...m, enabled: true, lastUpdated: new Date().toISOString() } : m
          ),
        }))
      },

      disableModule: (id) => {
        set(s => ({
          modules: s.modules.map(m =>
            m.id === id ? { ...m, enabled: false, lastUpdated: new Date().toISOString() } : m
          ),
        }))
      },

      getModule: (id) => {
        return get().modules.find(m => m.id === id)
      },

      getModulesByCategory: (category) => {
        return get().modules.filter(m => m.category === category)
      },

      setPendingUpdates: (updates) => {
        set({ pendingUpdates: updates })
      },

      clearPendingUpdates: () => {
        set({ pendingUpdates: [] })
      },

      setChecking: (checking) => {
        set({ isChecking: checking })
      },

      setLastChecked: (date) => {
        set({ lastChecked: date })
      },

      updateModuleVersion: (id, version) => {
        set(s => ({
          modules: s.modules.map(m =>
            m.id === id ? { ...m, version, lastUpdated: new Date().toISOString() } : m
          ),
          pendingUpdates: s.pendingUpdates.filter(u => u.moduleId !== id),
        }))
      },
    }),
    {
      name: 'oneway-modules',
      partialize: (state) => ({
        modules: state.modules,
        pendingUpdates: state.pendingUpdates,
        lastChecked: state.lastChecked,
      }),
    }
  )
)
