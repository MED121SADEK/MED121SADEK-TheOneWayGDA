import { NextRequest, NextResponse } from 'next/server'

/* ─── Types ─── */
interface Extension {
  id: string
  name: string
  description: string
  type: 'visualization' | 'data_source' | 'statistical' | 'export' | 'integration' | 'ai_model'
  author: string
  version: string
  status: 'official' | 'community' | 'beta'
  apiVersion: string
  hooks: string[]
  config: Record<string, string>
  installs: number
  rating: number
  isInstalled: boolean
  createdAt: string
}

/* ─── Seed data ─── */
const defaultExtensions: Extension[] = [
  {
    id: 'ext-1',
    name: 'Plotly Enhanced Charts',
    description: 'Advanced interactive chart types including 3D plots, heatmaps, and statistical visualizations powered by Plotly.js.',
    type: 'visualization',
    author: 'The One-Way Team',
    version: '2.1.0',
    status: 'official',
    apiVersion: '1.0.0',
    hooks: ['workspace:chart'],
    config: { theme: 'auto', interactive: 'true', exportFormat: 'svg' },
    installs: 1240,
    rating: 4.8,
    isInstalled: true,
    createdAt: '2025-09-10T08:00:00Z',
  },
  {
    id: 'ext-2',
    name: 'Google Sheets Connector',
    description: 'Import and sync datasets directly from Google Sheets with real-time collaboration support and automatic refresh.',
    type: 'data_source',
    author: 'The One-Way Team',
    version: '1.5.0',
    status: 'official',
    apiVersion: '1.0.0',
    hooks: ['workspace:import'],
    config: { autoSync: 'false', refreshInterval: '300' },
    installs: 890,
    rating: 4.5,
    isInstalled: true,
    createdAt: '2025-10-05T12:00:00Z',
  },
  {
    id: 'ext-3',
    name: 'R Integration',
    description: 'Execute R scripts and import R packages for advanced statistical analysis within the platform workspace.',
    type: 'statistical',
    author: 'Community Contributor',
    version: '1.0.0',
    status: 'community',
    apiVersion: '1.0.0',
    hooks: ['ai:pre-process', 'ai:post-process'],
    config: { runtimePath: '/usr/bin/Rscript', maxMemoryMB: '512' },
    installs: 456,
    rating: 4.2,
    isInstalled: false,
    createdAt: '2025-11-20T14:00:00Z',
  },
  {
    id: 'ext-4',
    name: 'PDF Report Builder',
    description: 'Generate publication-ready PDF reports with custom templates, headers, footers, and brand styling.',
    type: 'export',
    author: 'The One-Way Team',
    version: '3.2.0',
    status: 'official',
    apiVersion: '1.0.0',
    hooks: ['report:export', 'report:generate'],
    config: { template: 'default', pageSize: 'A4', dpi: '300' },
    installs: 2100,
    rating: 4.9,
    isInstalled: true,
    createdAt: '2025-06-15T09:00:00Z',
  },
  {
    id: 'ext-5',
    name: 'Slack Integration',
    description: 'Send analysis results, alerts, and report summaries directly to Slack channels and team members.',
    type: 'integration',
    author: 'The One-Way Team',
    version: '1.1.0',
    status: 'official',
    apiVersion: '1.0.0',
    hooks: ['report:export'],
    config: { webhookUrl: '', channelName: 'analytics' },
    installs: 670,
    rating: 4.4,
    isInstalled: false,
    createdAt: '2025-10-30T11:00:00Z',
  },
  {
    id: 'ext-6',
    name: 'Power BI Connector',
    description: 'Export analysis results and datasets to Microsoft Power BI for advanced business intelligence dashboards.',
    type: 'integration',
    author: 'Community Contributor',
    version: '0.9.0',
    status: 'community',
    apiVersion: '1.0.0',
    hooks: ['workspace:export'],
    config: { workspaceId: '', datasetFormat: 'json' },
    installs: 234,
    rating: 3.9,
    isInstalled: false,
    createdAt: '2025-12-01T16:00:00Z',
  },
  {
    id: 'ext-7',
    name: 'Advanced Stats Pack',
    description: 'Extended statistical tests including MANOVA, factor analysis, structural equation modeling, and nonparametric methods.',
    type: 'statistical',
    author: 'The One-Way Team',
    version: '2.0.0',
    status: 'official',
    apiVersion: '1.0.0',
    hooks: ['ai:pre-process', 'ai:post-process'],
    config: { significanceLevel: '0.05', effectSizeThreshold: '0.3' },
    installs: 1560,
    rating: 4.7,
    isInstalled: true,
    createdAt: '2025-08-20T10:00:00Z',
  },
  {
    id: 'ext-8',
    name: 'D3.js Custom Viz',
    description: 'Build fully custom interactive visualizations using D3.js with a drag-and-drop chart builder interface.',
    type: 'visualization',
    author: 'Community Contributor',
    version: '1.3.0',
    status: 'community',
    apiVersion: '1.0.0',
    hooks: ['workspace:chart'],
    config: { renderer: 'svg', animations: 'true', responsive: 'true' },
    installs: 380,
    rating: 4.1,
    isInstalled: false,
    createdAt: '2025-11-10T13:00:00Z',
  },
  {
    id: 'ext-9',
    name: 'Snowflake Connector',
    description: 'Connect to Snowflake data warehouses for direct querying and importing large-scale analytical datasets.',
    type: 'data_source',
    author: 'The One-Way Team',
    version: '0.5.0',
    status: 'beta',
    apiVersion: '1.0.0',
    hooks: ['workspace:import'],
    config: { warehouse: '', schema: 'public', role: '' },
    installs: 120,
    rating: 3.6,
    isInstalled: false,
    createdAt: '2026-01-05T08:00:00Z',
  },
  {
    id: 'ext-10',
    name: 'GPT-4 Turbo Model',
    description: 'Access the latest GPT-4 Turbo model for enhanced AI-powered analysis, natural language queries, and automated insights.',
    type: 'ai_model',
    author: 'The One-Way Team',
    version: '1.0.0',
    status: 'official',
    apiVersion: '1.0.0',
    hooks: ['ai:pre-process', 'ai:post-process'],
    config: { temperature: '0.7', maxTokens: '4096', systemPrompt: '' },
    installs: 3200,
    rating: 4.9,
    isInstalled: true,
    createdAt: '2025-12-20T10:00:00Z',
  },
]

// In-memory store
let extensions: Extension[] = [...defaultExtensions]

/* ─── GET: List all extensions (with optional type filter) ─── */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const typeFilter = searchParams.get('type')

  let filtered = extensions
  if (typeFilter) {
    filtered = extensions.filter((e) => e.type === typeFilter)
  }

  return NextResponse.json({ extensions: filtered, total: filtered.length })
}

/* ─── POST: Register a new extension ─── */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      )
    }

    const validTypes = ['visualization', 'data_source', 'statistical', 'export', 'integration', 'ai_model']
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const newExtension: Extension = {
      id: `ext-${Date.now()}`,
      name: body.name,
      description: body.description || '',
      type: body.type,
      author: body.author || 'Community',
      version: body.version || '1.0.0',
      status: body.status || 'community',
      apiVersion: body.apiVersion || '1.0.0',
      hooks: body.hooks || [],
      config: body.config || {},
      installs: 0,
      rating: 0,
      isInstalled: false,
      createdAt: new Date().toISOString(),
    }

    extensions = [newExtension, ...extensions]
    return NextResponse.json({ extension: newExtension }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to register extension' },
      { status: 500 }
    )
  }
}
