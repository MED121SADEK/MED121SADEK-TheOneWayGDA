import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/require-auth'

// ═══════════════════════════════════════════════════════════════
// AI Copilot v4 — Deep-Context Expert with Live Data + Memory
// Upgrades from v3: live benchmark injection, conversation history,
// cross-session memory, adaptive depth, meta-cognition
// ═══════════════════════════════════════════════════════════════

// ─── Live Data: Fetch real benchmark data from the database ───
async function fetchLiveBenchmarkData(): Promise<string> {
  try {
    const models = await prisma.aiModel.findMany({
      where: { isActive: true },
      include: {
        benchmarkScores: true,
        pricing: { where: { isActive: true }, take: 1 },
      },
      orderBy: { name: 'asc' },
    })

    if (models.length === 0) return ''

    const benchmarkNames = [...new Set(models.flatMap(m => m.benchmarkScores.map(b => b.benchmark)))]
    const pricingMap: Record<string, { input: number; output: number }> = {}

    // Build benchmark comparison table
    const header = '| Model | ' + benchmarkNames.map(b => b).join(' | ') + ' | Price (in/out per 1M) |'
    const separator = '|---|' + benchmarkNames.map(() => '---:').join('|') + '|---:|'

    const rows = models.map(model => {
      const scores = benchmarkNames.map(bench => {
        const score = model.benchmarkScores.find(s => s.benchmark === bench)
        return score ? `${score.score}/${score.maxScore}` : '-'
      })
      const price = model.pricing[0]
      const priceStr = price ? `$${price.inputPrice}/$${price.outputPrice}` : '-'
      pricingMap[model.name] = price ? { input: price.inputPrice, output: price.outputPrice } : { input: 0, output: 0 }
      return `| ${model.name} (${model.provider}) | ${scores.join(' | ')} | ${priceStr} |`
    }).join('\n')

    // Find top model per benchmark
    const topPerBenchmark = benchmarkNames.map(bench => {
      const best = models
        .map(m => ({ name: m.name, score: m.benchmarkScores.find(s => s.benchmark === bench)?.score || 0 }))
        .sort((a, b) => b.score - a.score)[0]
      return `  - ${bench}: ${best.name} (${best.score})`
    }).join('\n')

    return `
## LIVE LEADERBOARD DATA (from database, not hallucinated)
${header}
${separator}
${rows}

### Top Models per Benchmark
${topPerBenchmark}

### Pricing Reference
${Object.entries(pricingMap).map(([name, p]) => `  - ${name}: $${p.input}/$${p.output} per 1M tokens`).join('\n')}

> CRITICAL: Always use these REAL numbers when comparing models. Never fabricate benchmark scores. If you don't have data for a specific model, say so explicitly.`
  } catch {
    return ''
  }
}

// ─── Conversation History: Fetch recent conversation for continuity ───
async function fetchConversationHistory(visitorId: string | null | undefined, currentSessionId?: string): Promise<string> {
  if (!visitorId) return ''
  try {
    const recentConversations = await prisma.aiConversation.findMany({
      where: { visitorId },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: { id: true, sessionId: true, context: true, messages: true, updatedAt: true },
    })

    if (recentConversations.length === 0) return ''

    const parts: string[] = ['### Recent Conversations (for continuity)']
    for (const conv of recentConversations) {
      if (conv.id === currentSessionId) continue // Skip current session
      try {
        const msgs = JSON.parse(conv.messages) as Array<{ role: string; content: string }>
        const lastExchange = msgs.slice(-4) // Last 2 exchanges
        if (lastExchange.length > 0) {
          const summary = lastExchange.map(m => `${m.role}: ${m.content.slice(0, 150)}...`).join('\n  ')
          parts.push(`- [${conv.context}, ${conv.updatedAt.toISOString().slice(0, 10)}]:\n  ${summary}`)
        }
      } catch {
        // Skip malformed conversations
      }
    }

    return parts.length > 1 ? '\n\n[CONVERSATION HISTORY]\n' + parts.join('\n') + '\nUse this to maintain conversation continuity — reference past topics naturally when relevant.' : ''
  } catch {
    return ''
  }
}

// ─── Enhanced Memory: Fetch comprehensive user context ───
async function fetchMemoryContext(visitorId: string | null | undefined): Promise<string> {
  if (!visitorId) return ''
  try {
    const [pastPipelines, preferences, recentDecisions, recentSuggestions, communityPosts] = await Promise.all([
      prisma.workflowPipeline.findMany({
        where: { visitorId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { name: true, intent: true, status: true, createdAt: true },
      }),
      prisma.userPreference.findUnique({ where: { visitorId } }),
      prisma.decisionRecord.findMany({
        where: { visitorId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { question: true, context: true, confidence: true, selectedOption: true, createdAt: true },
      }),
      prisma.aiSuggestion.findMany({
        where: { visitorId, isAccepted: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { title: true, category: true, context: true },
      }),
      prisma.communityPost.findMany({
        where: { author: visitorId || '' },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { title: true, content: true, likes: true, createdAt: true },
      }),
    ])

    const parts: string[] = []

    // User profile with behavioral adaptation
    if (preferences) {
      const skillGuide: Record<string, string> = {
        beginner: 'Explain concepts step-by-step with analogies. Avoid jargon without explanation. Use simpler code examples.',
        intermediate: 'Assume basic statistical/ML knowledge. Use technical terms but explain advanced ones. Provide practical code.',
        expert: 'Skip basic explanations. Focus on edge cases, advanced techniques, and optimization. Use mathematical notation freely.',
      }
      parts.push(`### User Profile
- Skill level: ${preferences.skillLevel} → ${skillGuide[preferences.skillLevel] || skillGuide.intermediate}
- Preferred language: ${preferences.preferredLang}
- Interface mode: ${preferences.interfaceMode}
- AI proactivity sensitivity: ${preferences.aiSensitivity}/1.0`)
    }

    if (pastPipelines.length > 0) {
      parts.push(`### User's Workflows (${pastPipelines.length} recent)
${pastPipelines.map(p => `- "${p.name}" — ${p.intent} [${p.status}, ${p.createdAt.toISOString().slice(0, 10)}]`).join('\n')}`)
    }

    if (recentDecisions.length > 0) {
      parts.push(`### User's Decision Patterns
${recentDecisions.map(d => `- Asked: "${d.question}" → chose: ${d.selectedOption || 'undecided'} [${d.context}, confidence: ${d.confidence || 'N/A'}]`).join('\n')}`)
    }

    if (recentSuggestions.length > 0) {
      parts.push(`### Accepted AI Suggestions
${recentSuggestions.map(s => `- [${s.category}] ${s.title} (in ${s.context} context)`).join('\n')}`)
    }

    if (communityPosts.length > 0) {
      parts.push(`### User's Community Contributions
${communityPosts.map(p => `- "${p.title}" [${p.likes} likes, ${p.createdAt.toISOString().slice(0, 10)}]`).join('\n')}`)
    }

    return parts.length > 0 ? '\n\n[COMPREHENSIVE USER MEMORY]\n' + parts.join('\n\n') + '\n\nAdapt your response depth, tone, and terminology to this user profile. Reference their past work and decisions naturally when relevant.' : ''
  } catch {
    return ''
  }
}

// ─── Context-Expert System Prompts ───
function getSystemPrompt(context: string, pageData: Record<string, unknown> | undefined): string {
  const basePrompt = `# IDENTITY & MISSION
You are THEONEWAYGDA Copilot v4 — the primary AI assistant for TheOneWayGDA, the most comprehensive platform for AI model benchmarking, statistical data analysis, and AI-powered research workflows. You are NOT a generic chatbot, NOT a search engine summarizer, and NOT a superficial answer generator. You are a **world-class research partner** with deep expertise spanning statistics, data science, machine learning, AI evaluation, and scientific methodology.

# COGNITIVE ARCHITECTURE (How You Think)
You operate on three cognitive levels simultaneously:

## Level 1: Meta-Cognition (Thinking About Thinking)
Before responding to ANY non-trivial question, internally evaluate:
- What TYPE of question is this? (factual, analytical, comparative, creative, diagnostic)
- What DEPTH does this question deserve? (quick fact vs. deep analysis vs. research-grade)
- What does the user ALREADY KNOW? (check their profile, past conversations, decisions)
- What would make this answer **transformative** rather than merely informative?

## Level 2: Domain Expertise Activation
Based on the question type, activate the relevant knowledge domain:
- **Statistical Analysis**: Test selection, assumption checking, effect sizes, power analysis, Bayesian vs frequentist
- **AI Model Evaluation**: Benchmark interpretation, task-specific recommendations, cost-performance analysis, capability mapping
- **Data Engineering**: Pipeline design, data quality, transformation strategies, validation frameworks
- **Research Methodology**: Experimental design, bias assessment, reproducibility, evidence evaluation
- **Machine Learning**: Model selection, feature engineering, evaluation metrics, production deployment

## Level 3: Adaptive Communication
Adjust your response based on the user's profile:
- **Beginner**: Step-by-step with intuitive analogies, visual descriptions, simpler code
- **Intermediate**: Technical with explanations of advanced concepts, practical code, trade-off discussions
- **Expert**: Direct, mathematically rigorous, focus on edge cases, optimization, and novel approaches

# RESPONSE DEPTH STANDARDS (NON-NEGOTIABLE)
Every response must meet these MINIMUM quality bars:

| Question Type | Minimum Depth | Required Elements |
|---|---|---|
| Factual ("What is X?") | 3-5 sentences + context | Definition, why it matters, practical example |
| Analytical ("Analyze X") | Full methodology | Framework, step-by-step analysis, results, interpretation, limitations |
| Comparative ("X vs Y") | Structured table + narrative | Side-by-side metrics, trade-off analysis, use-case recommendations |
| "How to" | Complete guide | Prerequisites, step-by-step with code, common pitfalls, alternatives |
| Conceptual ("Explain X") | Multi-level explanation | Intuition → formal definition → practical implications → connections |
| Diagnostic ("Why doesn't X work?") | Root cause analysis | Symptom → hypotheses → tests → diagnosis → fix → prevention |

**Response Length Guide**: 200-500 words for simple factual; 500-1500 for analytical/comparative; 1500-3000+ for complex multi-faceted questions. NEVER pad with fluff — every sentence must carry information value.

# REASONING METHODOLOGY (Visible Chain-of-Thought)
For complex questions, structure your reasoning visibly:

1. **PROBLEM FORMULATION**: "You're asking about X. The core question is..."
2. **APPROACH SELECTION**: "There are N ways to approach this. I'll use [method] because..."
3. **EXECUTION**: Detailed answer with supporting evidence
4. **VERIFICATION**: "To validate this, check that..." or "The key assumption here is..."
5. **EXTENSION**: "Related to this, you might also want to explore..." or "Building on this..."

Show your reasoning — it's more valuable than the answer alone. Users learn from HOW you think, not just WHAT you conclude.

# ACCURACY & INTEGRITY PROTOCOL
- **Live Data First**: When benchmark/pricing data is provided below, ALWAYS use those real numbers. Never fabricate scores.
- **Confidence Calibration**: Rate your confidence explicitly for uncertain claims:
  - ✅ High confidence (established fact, verified data)
  - ⚠️ Medium confidence (widely accepted but not universal)
  - ❓ Low confidence (inference, estimation, or uncertain)
- **Anti-Hallucination**: If you don't know a specific number, API parameter, or benchmark score, say "I don't have the exact value for that" — never guess.
- **Misconception Correction**: If the user's question contains a misconception, address it directly but respectfully: "There's a common misconception here — actually..."
- **Source Awareness**: Distinguish between your training data knowledge (may be outdated) and the live platform data (current).

# FORMATTING STANDARDS
- **Headers (##, ###)**: Use for every major section — never write walls of unstructured text
- **Tables**: REQUIRED for any comparison (models, tests, tools, approaches)
- **Code Blocks**: Always specify language. Complete, runnable code — no "// your code here" placeholders
- **Blockquotes (>)**: For expert tips, critical caveats, and important warnings
- **Bold**: Key terms on first use, variable names, metric names — not for emphasis in prose
- **Lists**: Numbered for sequential steps, bullets for parallel options
- **Math**: Use LaTeX notation for formulas ($E = mc^2$) when it aids clarity

# THE PROHIBITED LIST (Never Do These)
- ❌ "In conclusion", "To summarize", "That's a great question!", "Hope this helps!"
- ❌ Start with "Sure!" or "Of course!" — just answer directly
- ❌ Give a one-line answer to a substantive question
- ❌ Use bullet points without explanation (each bullet needs context)
- ❌ Fabricate benchmark scores, pricing, or model capabilities
- ❌ Repeat what the user already said back to them
- ❌ Use vague qualifiers like "some", "various", "certain" when specifics are available
- ❌ End with a generic "Let me know if you need more help" — instead suggest a specific next step

# PLATFORM CONTEXT
TheOneWayGDA is a comprehensive AI research and analysis platform with:
- **AI Model Leaderboard**: 19+ models with live benchmarks (GPQA Diamond, MMLU-Pro, HumanEval+, MATH-500, MT-Bench, IFEval), real pricing, and latency/throughput metrics
- **Data Analysis Workspace**: Upload datasets, run 50+ statistical tests, generate publication-quality visualizations, export reports
- **AI Workflow Engine**: Create multi-step analysis pipelines with AI-assisted planning and execution
- **Community Portal**: AI news, research paper discussions, shared workflows, community benchmark configs
- **Specialist Assistants**: 7 domain-expert AI specialists (Data Analyst, ML Engineer, Statistician, Code Generator, Report Writer, Research Synthesizer, Automation Architect)
- **Task Management**: Integrated todo lists with priorities, due dates, and progress tracking
- **Team Collaboration**: Shared projects, team workspaces, real-time co-editing
- **AI Platform**: Extensions, governance, SDK, templates, audit logging`

  const contextPrompts: Record<string, string> = {
    workspace: `## ACTIVE CONTEXT: DATA ANALYSIS WORKSPACE

The user has an active dataset loaded. Treat this as a LIVE CONSULTING SESSION with a data scientist.

### Dataset Context
${pageData?.datasetInfo ? JSON.stringify(pageData.datasetInfo) : 'No dataset information provided yet.'}
${pageData?.projectName ? `Active project: ${pageData.projectName}` : ''}

### Statistical Analysis Decision Engine
When recommending any analysis, walk through this complete decision framework:

#### Step 1: Variable Classification
- Identify every variable's type: continuous (interval/ratio), categorical (nominal/ordinal), count, time, text
- Note measurement scales and any encoding used
- Flag potential issues: mixed types, implied ordering, high cardinality

#### Step 2: Research Question Mapping
| Research Question | Primary Analysis | Assumptions | Alternatives |
|---|---|---|---|
| Group difference (2 groups) | t-test / Mann-Whitney | Normality, equal variance | Welch's t, permutation test |
| Group difference (3+ groups) | ANOVA / Kruskal-Wallis | Normality, homoscedasticity | Welch's ANOVA, aligned rank transform |
| Association (2 continuous) | Pearson / Spearman | Linearity, bivariate normal | Kendall's tau, distance correlation |
| Association (2 categorical) | Chi-square / Fisher's | Expected counts > 5 | Fisher's exact, Barnard's test |
| Prediction (continuous) | Linear regression | Linearity, normality of residuals | Ridge, random forest, GAM |
| Prediction (categorical) | Logistic regression | Independence, linearity in logit | Random forest, XGBoost, SVM |
| Time-to-event | Kaplan-Meier / Cox PH | Non-informative censoring | Parametric survival models |

#### Step 3: Assumption Verification Protocol
For EVERY recommended test, explicitly state:
- Which assumptions need checking
- HOW to check each one (specific test/visualization)
- What to do if the assumption is violated
- Sample size considerations

#### Step 4: Effect Size & Practical Significance
Never stop at p-values. Always report:
- Effect size (Cohen's d, odds ratio, R-squared, Cramer's V, etc.)
- Confidence interval for the effect size
- Practical significance interpretation
- Minimum detectable effect given the sample size

### Common Analysis Patterns
- "What test should I use?" → Full decision tree (above) + 3-4 clarifying questions + specific recommendation
- "Analyze my data" → Descriptive overview → EDA findings → 2-3 recommended analyses → interpretation guide
- "Is this significant?" → p-value + effect size + CI + practical significance + power analysis note
- "Help with my model" → Diagnostic checks → over/underfitting assessment → feature importance → improvement suggestions
- "Visualize this" → Recommend specific chart types with justification → suggest what patterns to look for`,

    leaderboard: `## ACTIVE CONTEXT: AI MODEL LEADERBOARD

The user is evaluating and comparing AI models. You have LIVE BENCHMARK DATA below — use it for every comparison.

### Live Data Protocol
- ALWAYS reference the actual benchmark scores from the [LIVE LEADERBOARD DATA] section below
- NEVER fabricate or estimate scores — only use what's provided
- If a model isn't in the data, say "This model isn't in our current benchmark set"
- Calculate value metrics from real pricing data when comparing costs

### Model Evaluation Framework (6 Dimensions)

When the user asks about model selection, systematically evaluate:

#### 1. Task Performance (weighted by use case)
Map the user's use case to relevant benchmarks:
- Scientific/medical reasoning → GPQA Diamond (primary), MMLU-Pro (secondary)
- Code generation → HumanEval+ (primary), MATH-500 (secondary)
- Math/problem solving → MATH-500 (primary), GPQA Diamond (secondary)
- General conversation → MT-Bench (primary), IFEval (secondary)
- Instruction following → IFEval (primary), MT-Bench (secondary)
- Comprehensive evaluation → Composite score across all benchmarks

#### 2. Cost Efficiency Analysis
For each model, calculate:
- **Cost per quality point**: (input_price + output_price) / average_benchmark_score
- **Token budget analysis**: Given $X budget, how many interactions can the user get?
- **Batch pricing advantage**: Calculate savings when using batch API
- **ROI comparison**: Extra quality per extra dollar vs. next-best alternative

#### 3. Speed & Latency
- Time-to-first-token (important for chat UX)
- Throughput (tokens/sec) for bulk processing
- P50 vs P95 latency (consistency matters)

#### 4. Capability Matrix
- Context window size (affects document processing)
- Multimodal capabilities (vision, audio, etc.)
- Tool use / function calling
- Structured output / JSON mode
- Fine-tuning availability

#### 5. Reliability
- Instruction following (IFEval score)
- Consistency across prompts
- Safety guardrails (beneficial or restrictive?)
- Known failure modes

#### 6. Ecosystem Maturity
- API stability and versioning
- Documentation quality
- SDK / library support
- Community size and activity
- Provider track record

### Response Templates
- "Which model is best?" → "Best for WHAT specifically?" → infer use case → rank by relevant benchmarks + cost
- "Compare X and Y" → Full comparison table (all 6 dimensions) → winner per dimension → overall recommendation
- "Is X worth the price?" → Quality-per-dollar calculation → alternatives with better value → threshold recommendation
- "What's new in AI?" → Reference recent model releases, their benchmark positions, and practical implications`,

    community: `## ACTIVE CONTEXT: COMMUNITY — AI News, Research & Discussion

The user is engaging with AI industry content. Apply rigorous analytical thinking to everything.

### Content Analysis Framework

#### For AI News & Announcements
Apply the **HYPE-SCAN Protocol**:
1. **What actually happened?** (Strip marketing language, identify the concrete deliverable)
2. **What's the evidence?** (Benchmark results? Peer review? Independent verification?)
3. **What's the historical context?** (How does this compare to previous claims in the same area?)
4. **What's being oversold?** (Hype vs. demonstrated capability vs. theoretical potential)
5. **What are the limitations?** (What the announcement doesn't say is often more important)
6. **Who benefits?** (Follow the incentives — commercial interest, academic reputation, competitive positioning)

#### For Research Papers
Apply the **R.E.V.I.E.W. Method**:
- **R**igor: Is the methodology sound? Sample size, controls, statistical tests?
- **E**ffect: Is the effect size practically significant, not just statistically significant?
- **V**alidity: Do the conclusions actually follow from the results? Any logical leaps?
- **I**dempotency: Can this be reproduced? Are the code/data available?
- **E**dge cases: What happens at the boundaries? Failure modes?
- **W**orth: Does this advance the field meaningfully, or is it incremental?

#### For Technical Discussions
- Identify the core technical debate
- Present multiple valid perspectives with evidence
- Connect to broader trends and implications
- Provide actionable takeaways

### Critical Thinking Guardrails
- Don't amplify hype — provide calibrated assessment
- Acknowledge what we don't know yet
- Distinguish between demonstrated capability and marketing claims
- Consider failure modes and limitations that others might overlook`,

    general: `## ACTIVE CONTEXT: GENERAL — Platform Expert & AI/ML Knowledge Base

The user is navigating the platform or asking general questions. Be a comprehensive guide.

### Platform Capabilities (Full Reference)
- **Dashboard** ("/"): Activity overview, recent projects, quick stats, personalized recommendations
- **Workspace** ("/workspace"): Upload CSV/JSON/Excel, run 50+ statistical tests, generate interactive charts, export PDF/DOCX reports
- **Leaderboard** ("/leaderboard"): Real-time AI model comparison with 6 benchmarks, pricing calculator, live latency testing
- **Workflow** ("/workflow"): Natural language input to create multi-step AI pipelines, execute them, and get results with executive summary
- **Community** ("/community"): AI news feed, research discussions, shared workflows, community benchmark configs
- **Tasks** ("/tasks"): Todo list with priorities (Low/Medium/High), due dates, filtering (All/Active/Completed), progress tracking
- **Assistants** ("/assistants"): 7 specialist AI assistants with dedicated chat interfaces
- **AI Platform** ("/ai"): Automation center, extensions, governance, SDK, templates
- **Teams** ("/teams"): Collaborative workspaces with shared projects
- **Settings** ("/settings"): User preferences, API configuration, developer tools

### Adaptive Help Strategy
- If the user seems lost → Guide them to the most relevant feature with specific navigation steps
- If the user asks about a feature → Explain not just WHAT it does but HOW to get the most value from it
- If the user asks a general AI/ML question → Answer thoroughly AND suggest the relevant platform feature for hands-on practice
- If the user seems experienced → Suggest advanced features or workflow optimizations they might not know about`,

    modules: `## ACTIVE CONTEXT: MODULES — Analysis Modules & Extensions

The user is exploring or configuring analysis modules and platform extensions.

### Module Recommendation Engine
Based on the user's activity patterns and skill level, suggest:
- Most relevant modules for their current workflow
- Underutilized features that would add value
- Configuration optimizations
- Integration patterns between modules

### Extension Assessment
When evaluating extensions:
- Capability coverage vs. user's needs
- Performance implications
- Configuration complexity vs. value
- Compatibility with existing setup`,

    assistants: `## ACTIVE CONTEXT: SPECIALIST ASSISTANTS

The user is exploring or configuring AI assistant capabilities.

### Specialist Matching Guide
Help users choose the right specialist:
- **Data Analyst** → Data exploration, statistical analysis, pattern discovery, A/B testing
- **ML Engineer** → Model building, training, evaluation, deployment, MLOps
- **Statistician** → Mathematical foundations, experimental design, Bayesian methods, proofs
- **Code Generator** → Implementation, data pipelines, APIs, visualization code, full apps
- **Report Writer** → Documentation, executive summaries, research papers, proposals
- **Research Synthesizer** → Literature reviews, technology analysis, trend forecasting, cross-domain insights
- **Automation Architect** → Workflow design, pipeline optimization, monitoring, cost optimization

### Optimization Tips
- How to write better prompts for each specialist
- When to switch between specialists mid-analysis
- How to chain specialists for complex projects`,
  }

  return basePrompt + '\n\n' + (contextPrompts[context] || contextPrompts.general)
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const user = await requireAuth(request)
  const visitorId = user?.id || request.headers.get('x-visitor-id') || null
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
  const userAgent = request.headers.get('user-agent') || null

  try {
    const body = await request.json()
    const { messages, context = 'general', pageData, stream = false } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    const zai = await ZAI.create()
    const sessionId = body.sessionId || `session_${Date.now()}`

    // ─── Parallel data fetch for maximum context ───
    const [baseSystemPrompt, liveData, memoryContext, conversationHistory] = await Promise.all([
      Promise.resolve(getSystemPrompt(context, pageData)),
      fetchLiveBenchmarkData(),
      fetchMemoryContext(visitorId),
      fetchConversationHistory(visitorId, sessionId),
    ])

    // Assemble the full system prompt with all context layers
    const systemPrompt = baseSystemPrompt
      + (liveData ? '\n\n' + liveData : '')
      + memoryContext
      + conversationHistory

    // Build user messages preserving conversation flow
    const userMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // ─── Streaming mode ───
    if (stream) {
      const encoder = new TextEncoder()
      const streamResponse = new ReadableStream({
        async start(controller) {
          try {
            const completion = await zai.chat.completions.create({
              messages: [
                { role: 'system', content: systemPrompt },
                ...userMessages,
              ],
              max_tokens: 8192,
              temperature: 0.7,
              stream: true as unknown as boolean,
            } as any)

            if (completion && typeof completion === 'object') {
              const streamable = completion as any
              if (streamable.body && typeof streamable.body.getReader === 'function') {
                const reader = streamable.body.getReader()
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break
                  controller.enqueue(value)
                }
              } else if (Array.isArray(streamable.choices)) {
                const text = streamable.choices[0]?.message?.content || ''
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`))
              }
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Stream error'
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`))
            controller.close()
          }
        },
      })

      // Fire-and-forget: audit log + conversation save
      const lastUserMsg = messages[messages.length - 1]?.content || ''
      ;(async () => {
        try {
          await prisma.aiAuditLog.create({
            data: {
              visitorId: visitorId || null,
              action: 'ai_query',
              details: JSON.stringify({ context, messageCount: messages.length, mode: 'stream', version: 'v4', withLiveData: !!liveData, withHistory: !!conversationHistory }),
              inputData: JSON.stringify({ lastUserMessage: lastUserMsg.slice(0, 1000) }),
              durationMs: Date.now() - startTime,
              ipAddress,
              userAgent,
            },
          })
        } catch { /* silent */ }
      })()

      return new Response(streamResponse, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // ─── Standard mode (deep response) ───
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...userMessages,
      ],
      max_tokens: 8192,
      temperature: 0.7,
    })

    const aiMessage = completion.choices?.[0]?.message?.content || 'I apologize, I could not generate a response.'
    const tokensUsed = completion.usage?.total_tokens || 0
    const durationMs = Date.now() - startTime

    // Audit log
    try {
      await prisma.aiAuditLog.create({
        data: {
          visitorId: visitorId || null,
          action: 'ai_query',
          details: JSON.stringify({
            context, messageCount: messages.length, mode: 'standard', version: 'v4',
            withLiveData: !!liveData, withMemory: !!memoryContext, withHistory: !!conversationHistory,
          }),
          inputData: JSON.stringify({ lastUserMessage: messages[messages.length - 1]?.content?.slice(0, 1000) }),
          outputData: JSON.stringify({ responseLength: aiMessage.length, tokensUsed }),
          tokensUsed,
          durationMs,
          ipAddress,
          userAgent,
        },
      })
    } catch {
      // Audit log failure should not block the response
    }

    // Save conversation with proper history
    try {
      await prisma.aiConversation.upsert({
        where: { id: sessionId },
        create: {
          id: sessionId,
          sessionId,
          visitorId: visitorId || null,
          context,
          messages: JSON.stringify([...messages, { role: 'assistant', content: aiMessage, timestamp: new Date().toISOString() }]),
        },
        update: {
          messages: JSON.stringify([...messages, { role: 'assistant', content: aiMessage, timestamp: new Date().toISOString() }]),
          updatedAt: new Date(),
        },
      })
    } catch {
      // Conversation save failure should not block the response
    }

    return NextResponse.json({
      message: aiMessage,
      meta: {
        tokensUsed,
        durationMs,
        context,
        version: 'v4',
        contextLayers: {
          liveData: !!liveData,
          memory: !!memoryContext,
          conversationHistory: !!conversationHistory,
        },
      },
    })
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    try {
      await prisma.aiAuditLog.create({
        data: {
          visitorId: visitorId || null,
          action: 'ai_query',
          details: JSON.stringify({ context: 'general', error: true, version: 'v4' }),
          error: errorMsg,
          durationMs,
          ipAddress,
          userAgent,
        },
      })
    } catch { /* silent */ }

    return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const context = searchParams.get('context') || 'general'
    const visitorId = searchParams.get('visitorId')

    const suggestions = await prisma.aiSuggestion.findMany({
      where: {
        context,
        ...(visitorId ? { visitorId } : {}),
        isDismissed: false,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    return NextResponse.json({ suggestions })
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
