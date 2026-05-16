/**
 * MLOps — AI Prompt & Model Configuration Management
 *
 * Versioned storage for AI prompts, model configurations, and evaluation
 * pipelines. Ensures AI behavior changes are traceable, testable, reversible.
 *
 * GET  /api/ai/mlops/configs   — List all AI configurations
 * GET  /api/ai/mlops/prompts   — List all prompt versions
 * POST /api/ai/mlops/prompts   — Create a new prompt version
 * GET  /api/ai/mlops/eval      — List evaluation runs
 * POST /api/ai/mlops/eval      — Create an evaluation run
 */

import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface PromptVersion {
  id: string
  name: string
  version: string
  context: string           // 'copilot' | 'workflow' | 'automation' | 'governance'
  systemPrompt: string
  description: string
  isActive: boolean
  metadata: Record<string, unknown>
  createdAt: string
  createdBy: string
}

interface AiConfig {
  id: string
  name: string
  version: string
  model: string
  parameters: {
    temperature: number
    maxTokens: number
    topP: number
    frequencyPenalty: number
    presencePenalty: number
  }
  promptVersion: string
  isActive: boolean
  createdAt: string
}

interface EvaluationRun {
  id: string
  configVersion: string
  promptVersion: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  metrics: {
    accuracy: number
    latencyMs: number
    tokenUsage: number
    userSatisfaction: number
  }
  testCases: number
  passed: number
  createdAt: string
}

// ═══════════════════════════════════════════════════════════
// In-memory storage (upgrade to DB for production)
// ═══════════════════════════════════════════════════════════

declare global {
  var __mlopsPrompts: PromptVersion[] | undefined
  var __mlopsConfigs: AiConfig[] | undefined
  var __mlopsEvals: EvaluationRun[] | undefined
}

function getPrompts(): PromptVersion[] {
  if (!globalThis.__mlopsPrompts) {
    globalThis.__mlopsPrompts = [
      {
        id: 'prompt-copilot-v1',
        name: 'Copilot System Prompt',
        version: 'v1.0.0',
        context: 'copilot',
        systemPrompt: 'You are the AI Copilot for "The One-Way" platform — an AI-powered statistical analysis and data science platform.',
        description: 'Base copilot prompt with general context awareness',
        isActive: true,
        metadata: { tokens: 85, testedAt: '2026-05-01' },
        createdAt: '2026-05-01T00:00:00Z',
        createdBy: 'system',
      },
      {
        id: 'prompt-workflow-v1',
        name: 'Workflow Generation Prompt',
        version: 'v1.0.0',
        context: 'workflow',
        systemPrompt: 'You are an expert data analysis workflow designer for The One-Way statistical analysis platform.',
        description: 'Prompt for generating analysis pipeline workflows from natural language',
        isActive: true,
        metadata: { tokens: 120, testedAt: '2026-05-01' },
        createdAt: '2026-05-01T00:00:00Z',
        createdBy: 'system',
      },
      {
        id: 'prompt-automation-v1',
        name: 'Automation Rule Generator Prompt',
        version: 'v1.0.0',
        context: 'automation',
        systemPrompt: 'You are an automation rule generator for "The One-Way" — an AI-powered statistical analysis platform.',
        description: 'Prompt for converting natural language to automation rules',
        isActive: true,
        metadata: { tokens: 95, testedAt: '2026-05-01' },
        createdAt: '2026-05-01T00:00:00Z',
        createdBy: 'system',
      },
    ]
  }
  return globalThis.__mlopsPrompts
}

function getConfigs(): AiConfig[] {
  if (!globalThis.__mlopsConfigs) {
    globalThis.__mlopsConfigs = [
      {
        id: 'config-default-v1',
        name: 'Default AI Configuration',
        version: 'v1.0.0',
        model: 'default',
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 0.9,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        promptVersion: 'prompt-copilot-v1',
        isActive: true,
        createdAt: '2026-05-01T00:00:00Z',
      },
    ]
  }
  return globalThis.__mlopsConfigs
}

function getEvals(): EvaluationRun[] {
  if (!globalThis.__mlopsEvals) {
    globalThis.__mlopsEvals = []
  }
  return globalThis.__mlopsEvals
}

// ═══════════════════════════════════════════════════════════
// Routes
// ═══════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const resource = searchParams.get('resource') || 'configs'

  switch (resource) {
    case 'configs':
      return NextResponse.json({
        configs: getConfigs(),
        summary: { total: getConfigs().length, active: getConfigs().filter((c) => c.isActive).length },
      })

    case 'prompts': {
      const context = searchParams.get('context')
      let prompts = getPrompts()
      if (context) prompts = prompts.filter((p) => p.context === context)
      return NextResponse.json({
        prompts,
        summary: { total: prompts.length, contexts: [...new Set(getPrompts().map((p) => p.context))] },
      })
    }

    case 'eval':
      return NextResponse.json({
        evaluations: getEvals(),
        summary: {
          total: getEvals().length,
          completed: getEvals().filter((e) => e.status === 'completed').length,
          avgAccuracy: getEvals().length > 0
            ? Math.round(getEvals().reduce((sum, e) => sum + e.metrics.accuracy, 0) / getEvals().length * 100) / 100
            : 0,
        },
      })

    default:
      return NextResponse.json(
        { error: `Unknown resource: ${resource}. Use: configs, prompts, eval` },
        { status: 400 },
      )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { resource, ...data } = body

    switch (resource) {
      case 'prompts': {
        const { name, context, systemPrompt, description } = data as {
          name: string
          context: string
          systemPrompt: string
          description: string
        }

        if (!name || !context || !systemPrompt) {
          return NextResponse.json({ error: 'name, context, and systemPrompt are required' }, { status: 400 })
        }

        // Deactivate previous active prompts for this context
        const prompts = getPrompts()
        prompts.forEach((p) => {
          if (p.context === context) p.isActive = false
        })

        // Count existing versions for this name
        const existing = prompts.filter((p) => p.name === name)
        const version = `v${existing.length + 1}.0.0`

        const newPrompt: PromptVersion = {
          id: `prompt-${context}-${Date.now()}`,
          name,
          version,
          context,
          systemPrompt,
          description: description || '',
          isActive: true,
          metadata: { tokens: systemPrompt.split(/\s+/).length, testedAt: new Date().toISOString() },
          createdAt: new Date().toISOString(),
          createdBy: 'admin',
        }

        prompts.push(newPrompt)

        return NextResponse.json(
          { prompt: newPrompt, message: `Created ${name} ${version} for context: ${context}` },
          { status: 201 },
        )
      }

      case 'eval': {
        const { configVersion, promptVersion, testCases } = data as {
          configVersion?: string
          promptVersion?: string
          testCases?: number
        }

        const evalRun: EvaluationRun = {
          id: `eval-${Date.now()}`,
          configVersion: configVersion || 'config-default-v1',
          promptVersion: promptVersion || 'prompt-copilot-v1',
          status: 'pending',
          metrics: { accuracy: 0, latencyMs: 0, tokenUsage: 0, userSatisfaction: 0 },
          testCases: testCases || 0,
          passed: 0,
          createdAt: new Date().toISOString(),
        }

        getEvals().push(evalRun)

        return NextResponse.json(
          { evaluation: evalRun, message: 'Evaluation run created' },
          { status: 201 },
        )
      }

      default:
        return NextResponse.json(
          { error: `Unknown resource: ${resource}. Use: prompts, eval` },
          { status: 400 },
        )
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
