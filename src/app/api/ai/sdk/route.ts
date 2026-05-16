import { NextResponse } from 'next/server'

/* ─── GET: Returns SDK documentation and getting-started guide ─── */
export async function GET() {
  const sdkDocs = {
    sdk: {
      name: 'The One-Way SDK',
      version: '1.0.0',
      baseUrl: '/api',
      auth: 'Bearer token or visitor-id header',
    },
    endpoints: [
      { method: 'GET', path: '/api/leaderboard/models', description: 'List all AI models', auth: false },
      { method: 'GET', path: '/api/leaderboard/benchmarks', description: 'Get benchmark scores', auth: false },
      { method: 'POST', path: '/api/ai/copilot', description: 'AI Copilot chat', auth: true },
      { method: 'POST', path: '/api/ai/workflow', description: 'Generate workflow pipeline', auth: true },
      { method: 'POST', path: '/api/ai/automations/generate', description: 'Generate automation from NL', auth: true },
      { method: 'GET', path: '/api/ai/templates', description: 'List community templates', auth: false },
      { method: 'GET', path: '/api/ai/extensions', description: 'List extensions', auth: false },
      { method: 'GET', path: '/api/ai/audit', description: 'AI audit trail', auth: true },
      { method: 'GET', path: '/api/ai/policies', description: 'AI governance policies', auth: true },
      { method: 'POST', path: '/api/projects', description: 'Create project', auth: true },
      { method: 'GET', path: '/api/updates', description: 'Platform updates', auth: false },
      { method: 'GET', path: '/api/health', description: 'System health check', auth: false },
    ],
    gettingStarted: {
      install: 'npm install @oneway/sdk',
      example: `// Initialize
import OnewaySDK from '@oneway/sdk';
const sdk = new OnewaySDK({ baseUrl: 'https://api.theoneway.ai' });

// List models
const models = await sdk.models.list();

// AI Copilot
const response = await sdk.ai.chat({ message: 'Analyze my data' });

// Generate workflow
const pipeline = await sdk.ai.createWorkflow({ intent: 'Find correlations' });`,
    },
    hooks: [
      { name: 'workspace:import', description: 'Custom data import handlers', params: ['file', 'options'] },
      { name: 'workspace:chart', description: 'Custom chart renderers', params: ['data', 'config'] },
      { name: 'workspace:export', description: 'Custom export formatters', params: ['data', 'format'] },
      { name: 'report:generate', description: 'Custom report generators', params: ['project', 'template'] },
      { name: 'ai:pre-process', description: 'Pre-process AI input', params: ['context', 'message'] },
      { name: 'ai:post-process', description: 'Post-process AI output', params: ['response', 'context'] },
    ],
  }

  return NextResponse.json(sdkDocs)
}
