import { NextRequest, NextResponse } from 'next/server'

/* ══════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════ */
export interface PolicyRule {
  id: string
  key: string
  value: string | boolean | number
  description: string
}

export interface AiPolicy {
  id: string
  name: string
  scope: 'global' | 'project'
  projectId?: string
  category: 'data_access' | 'automation' | 'suggestions' | 'model_selection' | 'compliance'
  rules: PolicyRule[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/* ══════════════════════════════════════════════════════
   Shared in-memory storage via globalThis
   ══════════════════════════════════════════════════════ */
declare global {
  var __aiPolicies: AiPolicy[] | undefined
}

export function getPolicies(): AiPolicy[] {
  if (!globalThis.__aiPolicies) {
    const now = new Date().toISOString()
    globalThis.__aiPolicies = [
      {
        id: 'policy-1',
        name: 'AI Data Access',
        scope: 'global',
        category: 'data_access',
        isActive: true,
        createdAt: now,
        updatedAt: now,
        rules: [
          { id: 'rule-1-1', key: 'access_scope', value: 'standard', description: 'Default data access scope for AI operations' },
          { id: 'rule-1-2', key: 'audit_logging', value: true, description: 'Enable audit logging for all data access events' },
          { id: 'rule-1-3', key: 'require_consent', value: true, description: 'Require explicit user consent before accessing sensitive data' },
        ],
      },
      {
        id: 'policy-2',
        name: 'Automation Limits',
        scope: 'global',
        category: 'automation',
        isActive: true,
        createdAt: now,
        updatedAt: now,
        rules: [
          { id: 'rule-2-1', key: 'max_automations_per_user', value: 50, description: 'Maximum number of active automations per user' },
          { id: 'rule-2-2', key: 'max_runs_per_day', value: 200, description: 'Maximum automation runs per day per user' },
          { id: 'rule-2-3', key: 'allow_concurrent', value: false, description: 'Allow concurrent automation runs' },
        ],
      },
      {
        id: 'policy-3',
        name: 'Model Selection',
        scope: 'global',
        category: 'model_selection',
        isActive: true,
        createdAt: now,
        updatedAt: now,
        rules: [
          { id: 'rule-3-1', key: 'prefer_cost_effective', value: true, description: 'Prefer cost-effective models by default' },
          { id: 'rule-3-2', key: 'max_token_budget', value: 100000, description: 'Maximum token budget per request' },
          { id: 'rule-3-3', key: 'fallback_enabled', value: true, description: 'Enable automatic fallback to alternative models' },
        ],
      },
      {
        id: 'policy-4',
        name: 'Compliance',
        scope: 'global',
        category: 'compliance',
        isActive: true,
        createdAt: now,
        updatedAt: now,
        rules: [
          { id: 'rule-4-1', key: 'eu_ai_act_aligned', value: true, description: 'Align with EU AI Act requirements' },
          { id: 'rule-4-2', key: 'gdpr_compliant', value: true, description: 'Ensure GDPR compliance for all AI operations' },
          { id: 'rule-4-3', key: 'data_retention_days', value: 90, description: 'Data retention period in days' },
          { id: 'rule-4-4', key: 'right_to_deletion', value: true, description: 'Support user right to deletion of AI-processed data' },
        ],
      },
      {
        id: 'policy-5',
        name: 'Suggestion Frequency',
        scope: 'global',
        category: 'suggestions',
        isActive: true,
        createdAt: now,
        updatedAt: now,
        rules: [
          { id: 'rule-5-1', key: 'max_suggestions_per_session', value: 5, description: 'Maximum AI suggestions per session' },
          { id: 'rule-5-2', key: 'suggestion_cooldown_ms', value: 30000, description: 'Minimum time between suggestion prompts' },
          { id: 'rule-5-3', key: 'allow_dismiss_persistence', value: true, description: 'Remember dismissed suggestions to avoid repeats' },
        ],
      },
    ]
  }
  return globalThis.__aiPolicies
}

/* ══════════════════════════════════════════════════════
   GET /api/ai/policies — Return all policies
   ══════════════════════════════════════════════════════ */
export async function GET() {
  const policies = getPolicies()
  return NextResponse.json({
    policies,
    summary: {
      total: policies.length,
      active: policies.filter(p => p.isActive).length,
      categories: [...new Set(policies.map(p => p.category))],
    },
  })
}

/* ══════════════════════════════════════════════════════
   POST /api/ai/policies — Create a new policy
   ══════════════════════════════════════════════════════ */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, scope, projectId, category, rules } = body

    if (!name || !scope || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, scope, category' },
        { status: 400 }
      )
    }

    const validCategories = ['data_access', 'automation', 'suggestions', 'model_selection', 'compliance']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      )
    }

    const validScopes = ['global', 'project']
    if (!validScopes.includes(scope)) {
      return NextResponse.json(
        { error: `Invalid scope. Must be one of: ${validScopes.join(', ')}` },
        { status: 400 }
      )
    }

    const timestamp = new Date().toISOString()
    const newPolicy: AiPolicy = {
      id: `policy-${Date.now()}`,
      name,
      scope,
      projectId: scope === 'project' ? projectId : undefined,
      category,
      rules: Array.isArray(rules)
        ? rules.map((r: Partial<PolicyRule>, idx: number) => ({
            id: `rule-${Date.now()}-${idx}`,
            key: r.key || 'unnamed',
            value: r.value ?? '',
            description: r.description || '',
          }))
        : [],
      isActive: body.isActive ?? true,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    const policies = getPolicies()
    policies.push(newPolicy)

    return NextResponse.json({ policy: newPolicy }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
