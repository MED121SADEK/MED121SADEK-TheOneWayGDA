import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/* ── Seed demo submissions if empty ── */
async function seedProtocolData() {
  const submissionCount = await db.benchmarkSubmission.count();
  if (submissionCount > 0) return;

  const protocol = await db.protocolVersion.findFirst({ where: { version: '1.0' } });
  if (!protocol) {
    await db.protocolVersion.create({
      data: {
        version: '1.0',
        name: 'Open Benchmark Protocol',
        description: 'The first open standard for AI model benchmark submission and verification. Enables reproducible, transparent AI evaluation across providers and research labs.',
        benchmarks: JSON.stringify([
          { id: 'gpqa_diamond', name: 'GPQA Diamond', category: 'reasoning', description: 'Graduate-level science reasoning' },
          { id: 'mmlu_pro', name: 'MMLU-Pro', category: 'knowledge', description: 'Massive multitask language understanding' },
          { id: 'humaneval_plus', name: 'HumanEval+', category: 'coding', description: 'Code generation with extended test suite' },
          { id: 'math_500', name: 'MATH-500', category: 'math', description: 'Mathematical problem solving' },
          { id: 'mt_bench', name: 'MT-Bench', category: 'conversation', description: 'Multi-turn conversation quality' },
          { id: 'ifeval', name: 'IFEval', category: 'instruction', description: 'Instruction following evaluation' },
        ]),
        criteria: JSON.stringify({
          min_sample_size: 100,
          reproducibility_required: true,
          methodology_disclosure: true,
          confidence_threshold: 0.95,
        }),
        isActive: true,
      },
    });
  }

  const submissions = [
    {
      submitterId: 'researcher@openai.com', submitterName: 'OpenAI Research',
      modelId: 'model_gpt4o', modelName: 'GPT-4o', provider: 'OpenAI',
      benchmark: 'GPQA Diamond', score: 68.2, maxScore: 100,
      methodology: 'Evaluated on 500 grad-level science questions across physics, chemistry, biology, and computer science. Chain-of-thought prompting with temperature 0.',
      status: 'accepted', reviewedBy: 'admin', isVerified: true,
    },
    {
      submitterId: 'anthropic@research.ai', submitterName: 'Anthropic Research',
      modelId: 'model_claude4', modelName: 'Claude 4 Opus', provider: 'Anthropic',
      benchmark: 'HumanEval+', score: 96.5, maxScore: 100,
      methodology: 'Tested against 820 extended test cases including edge cases, error handling, and performance constraints. Zero-shot evaluation.',
      status: 'accepted', reviewedBy: 'admin', isVerified: true,
    },
    {
      submitterId: 'google@deepmind.com', submitterName: 'Google DeepMind',
      modelId: 'model_gemini25', modelName: 'Gemini 2.5 Pro', provider: 'Google',
      benchmark: 'MT-Bench', score: 92.1, maxScore: 100,
      methodology: 'Multi-turn conversations evaluated by GPT-4 judge across 8 categories. Average of 3 independent runs.',
      status: 'accepted', reviewedBy: 'admin', isVerified: true,
    },
    {
      submitterId: 'independent@bench.dev', submitterName: 'Independent Benchmark Lab',
      modelId: 'model_deepseek', modelName: 'DeepSeek-R1', provider: 'DeepSeek',
      benchmark: 'MATH-500', score: 90.2, maxScore: 100,
      methodology: 'Evaluated on 500 competition-level math problems. Step-by-step reasoning verification with automated checker.',
      status: 'reviewing', isVerified: false,
    },
    {
      submitterId: 'meta@ai.org', submitterName: 'Meta FAIR',
      modelId: 'model_llama4', modelName: 'Llama 4 Maverick', provider: 'Meta',
      benchmark: 'MMLU-Pro', score: 80.8, maxScore: 100,
      methodology: 'Standard MMLU-Pro evaluation with 5-shot prompting. Averaged over 14 academic subjects.',
      status: 'accepted', reviewedBy: 'admin', isVerified: true,
    },
    {
      submitterId: 'contributor@edu.cn', submitterName: 'Tsinghua NLP Lab',
      modelName: 'Qwen 3 Max', provider: 'Alibaba',
      benchmark: 'MATH-500', score: 95.8, maxScore: 100,
      methodology: 'Competition math evaluation with symbolic verification. Detailed solution path analysis.',
      status: 'pending', isVerified: false,
    },
    {
      submitterId: 'community@open.org', submitterName: 'Open Evaluation Community',
      modelName: 'Mistral Large', provider: 'Mistral AI',
      benchmark: 'IFEval', score: 76.1, maxScore: 100,
      methodology: 'Instruction following tests across 25 task types. Strict format compliance scoring.',
      status: 'reviewing', isVerified: false,
    },
    {
      submitterId: 'anthropic@research.ai', submitterName: 'Anthropic Research',
      modelId: 'model_claude_sonnet4', modelName: 'Claude 4 Sonnet', provider: 'Anthropic',
      benchmark: 'GPQA Diamond', score: 70.1, maxScore: 100,
      methodology: 'Graduate-level evaluation with detailed reasoning chains. Scored across all science domains.',
      status: 'accepted', reviewedBy: 'admin', isVerified: true,
    },
  ];

  await db.benchmarkSubmission.createMany({ data: submissions });
}

export async function GET(request: Request) {
  try {
    await seedProtocolData();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'all' | 'info' | 'submissions'
    const status = searchParams.get('status');
    const benchmark = searchParams.get('benchmark');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Protocol info
    const activeProtocol = await db.protocolVersion.findFirst({
      where: { isActive: true },
      orderBy: { publishedAt: 'desc' },
    });

    const protocolInfo = activeProtocol ? {
      id: activeProtocol.id,
      version: activeProtocol.version,
      name: activeProtocol.name,
      description: activeProtocol.description,
      benchmarks: JSON.parse(activeProtocol.benchmarks),
      criteria: JSON.parse(activeProtocol.criteria),
      publishedAt: activeProtocol.publishedAt,
    } : null;

    if (type === 'info') {
      return NextResponse.json({ protocol: protocolInfo });
    }

    // Submissions
    const submissionWhere: Record<string, unknown> = {};
    if (status) submissionWhere.status = status;
    if (benchmark) submissionWhere.benchmark = benchmark;

    const submissions = await db.benchmarkSubmission.findMany({
      where: submissionWhere,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Stats
    const [totalSubmissions, verifiedCount] = await Promise.all([
      db.benchmarkSubmission.count(),
      db.benchmarkSubmission.count({ where: { isVerified: true } }),
    ]);
    const contributorResult = await db.benchmarkSubmission.groupBy({
      by: ['submitterId'],
      _count: true,
    });
    const contributors = contributorResult.length;

    const stats = {
      totalSubmissions,
      verifiedCount,
      contributors,
      acceptanceRate: totalSubmissions > 0 ? ((verifiedCount / totalSubmissions) * 100).toFixed(1) : '0',
    };

    if (type === 'submissions') {
      return NextResponse.json({ submissions, stats });
    }

    // All
    return NextResponse.json({ protocol: protocolInfo, submissions, stats });
  } catch (error) {
    console.error('[Protocol API]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
