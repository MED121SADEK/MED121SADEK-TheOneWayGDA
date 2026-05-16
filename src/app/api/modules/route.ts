import { NextResponse } from 'next/server'
import { checkForUpdates } from '@/lib/update-checker'
import type { AppModule, ModuleUpdate } from '@/lib/modules'
import { APP_VERSION } from '@/lib/modules'

// In-memory module registry for API side (mirrors client store)
const SERVER_MODULES: AppModule[] = [
  {
    id: 'core-statistical-engine',
    name: 'Core Statistical Engine',
    nameKey: 'modules.coreStatisticalEngine',
    descriptionKey: 'modules.coreStatisticalEngineDesc',
    version: '2.4.0',
    category: 'statistical',
    description: 'Core computation engine for all statistical analyses.',
    enabled: true,
    installedAt: '2026-02-20T00:00:00.000Z',
    lastUpdated: '2026-04-18T00:00:00.000Z',
    author: 'The One-Way Team',
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
    installedAt: '2026-02-20T00:00:00.000Z',
    lastUpdated: '2026-04-18T00:00:00.000Z',
    author: 'The One-Way Team',
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
    installedAt: '2026-02-20T00:00:00.000Z',
    lastUpdated: '2026-04-18T00:00:00.000Z',
    author: 'The One-Way Team',
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
    installedAt: '2026-02-20T00:00:00.000Z',
    lastUpdated: '2026-04-10T00:00:00.000Z',
    author: 'The One-Way Team',
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
    installedAt: '2026-02-20T00:00:00.000Z',
    lastUpdated: '2026-03-28T00:00:00.000Z',
    author: 'The One-Way Team',
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
    installedAt: '2026-02-20T00:00:00.000Z',
    lastUpdated: '2026-03-28T00:00:00.000Z',
    author: 'The One-Way Team',
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
    installedAt: '2026-02-20T00:00:00.000Z',
    lastUpdated: '2026-03-15T00:00:00.000Z',
    author: 'The One-Way Team',
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
    installedAt: '2026-02-20T00:00:00.000Z',
    lastUpdated: '2026-03-01T00:00:00.000Z',
    author: 'The One-Way Team',
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
    installedAt: '2026-02-20T00:00:00.000Z',
    lastUpdated: '2026-02-20T00:00:00.000Z',
    author: 'The One-Way Team',
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
    installedAt: '2026-02-20T00:00:00.000Z',
    lastUpdated: '2026-02-20T00:00:00.000Z',
    author: 'The One-Way Team',
    dependencies: ['core-statistical-engine'],
  },
]

export async function GET() {
  const updates = await checkForUpdates(SERVER_MODULES)

  return NextResponse.json({
    appVersion: APP_VERSION,
    modules: SERVER_MODULES,
    totalModules: SERVER_MODULES.length,
    activeModules: SERVER_MODULES.filter(m => m.enabled).length,
    updates,
    updatesCount: updates.length,
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, module: moduleData } = body

    switch (action) {
      case 'check-updates': {
        const modules = Array.isArray(moduleData) ? moduleData : SERVER_MODULES
        const updates = await checkForUpdates(modules)
        return NextResponse.json({ success: true, updates, checkedAt: new Date().toISOString() })
      }

      case 'register': {
        if (!moduleData?.id) {
          return NextResponse.json({ error: 'Module ID is required' }, { status: 400 })
        }
        const exists = SERVER_MODULES.find(m => m.id === moduleData.id)
        if (exists) {
          return NextResponse.json({ error: 'Module already registered' }, { status: 409 })
        }
        const newModule: AppModule = {
          ...moduleData,
          installedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        }
        SERVER_MODULES.push(newModule)
        return NextResponse.json({ success: true, module: newModule })
      }

      case 'update': {
        if (!moduleData?.id || !moduleData?.version) {
          return NextResponse.json({ error: 'Module ID and version are required' }, { status: 400 })
        }
        const idx = SERVER_MODULES.findIndex(m => m.id === moduleData.id)
        if (idx === -1) {
          return NextResponse.json({ error: 'Module not found' }, { status: 404 })
        }
        SERVER_MODULES[idx] = {
          ...SERVER_MODULES[idx],
          version: moduleData.version,
          lastUpdated: new Date().toISOString(),
        }
        return NextResponse.json({ success: true, module: SERVER_MODULES[idx] })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
