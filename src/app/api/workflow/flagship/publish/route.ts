import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { apiRouteLogger } from '@/lib/api-logger'

const log = apiRouteLogger('/api/workflow/flagship/publish')

export async function POST(request: NextRequest) {
  const end = log.start('POST')
  const visitorId = request.headers.get('x-visitor-id') || null

  try {
    const body = await request.json()
    const { pipelineId, title, description, category, difficulty, tags } = body as {
      pipelineId: string
      title: string
      description: string
      category: string
      difficulty: string
      tags?: string[]
    }

    if (!pipelineId || !title || !category) {
      end(400)
      return NextResponse.json({ error: 'pipelineId, title, and category are required' }, { status: 400 })
    }

    const pipeline = await prisma.workflowPipeline.findUnique({ where: { id: pipelineId } })
    if (!pipeline) {
      end(404)
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
    }

    // Create SharedWorkflow
    const sharedWorkflow = await prisma.sharedWorkflow.create({
      data: {
        sourcePipelineId: pipelineId,
        author: visitorId || 'anonymous',
        authorName: null,
        name: title,
        description: description || pipeline.description || '',
        intent: pipeline.intent,
        steps: pipeline.steps,
        category: category || 'general',
        difficulty: difficulty || 'intermediate',
        tags: tags ? JSON.stringify(tags) : null,
        isFeatured: false,
        isOfficial: false,
      },
    })

    // Create CommunityAnalysisTemplate
    const template = await prisma.communityAnalysisTemplate.create({
      data: {
        sourceTemplateId: null,
        author: visitorId || 'anonymous',
        authorName: null,
        name: title,
        description: description || pipeline.description || '',
        category: category || 'general',
        difficulty: difficulty || 'intermediate',
        steps: pipeline.steps,
        requiredVariables: JSON.stringify([]),
        tags: tags ? JSON.stringify(tags) : null,
        isFeatured: false,
        isOfficial: false,
        version: 1,
      },
    })

    // Audit log
    await prisma.aiAuditLog.create({
      data: {
        visitorId,
        action: 'ai_query',
        details: JSON.stringify({
          action: 'flagship_publish',
          pipelineId,
          sharedWorkflowId: sharedWorkflow.id,
          templateId: template.id,
          category,
          difficulty,
        }),
      },
    }).catch(() => {})

    end(201)
    return NextResponse.json({
      sharedWorkflowId: sharedWorkflow.id,
      templateId: template.id,
      shareUrl: `/community?template=${template.id}`,
      message: `Workflow published as "${title}" to the community template gallery.`,
    })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ error: 'Failed to publish workflow' }, { status: 500 })
  }
}
