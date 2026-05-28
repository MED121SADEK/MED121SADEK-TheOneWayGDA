import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/* ── Seed demo certifications if empty ── */
async function seedCertifications() {
  const count = await db.certification.count();
  if (count > 0) return;

  const certs = [
    {
      modelId: 'model_gpt4o', modelName: 'GPT-4o', provider: 'OpenAI',
      level: 'gold', category: 'reasoning', overallScore: 92.3,
      benchmarks: JSON.stringify({ 'GPQA Diamond': 68.2, 'MMLU-Pro': 87.1, 'MATH-500': 83.7, 'MT-Bench': 90.5, 'IFEval': 88.4 }),
      criteria: JSON.stringify({ min_score: 90, benchmarks_required: 4 }),
      status: 'certified',
      validFrom: new Date('2025-01-15'), validUntil: new Date('2025-07-15'),
    },
    {
      modelId: 'model_claude4', modelName: 'Claude 4 Opus', provider: 'Anthropic',
      level: 'platinum', category: 'coding', overallScore: 97.1,
      benchmarks: JSON.stringify({ 'HumanEval+': 96.5, 'GPQA Diamond': 71.4, 'MMLU-Pro': 89.8, 'MATH-500': 88.2, 'IFEval': 91.3 }),
      criteria: JSON.stringify({ min_score: 95, benchmarks_required: 5 }),
      status: 'certified',
      validFrom: new Date('2025-02-01'), validUntil: new Date('2025-08-01'),
    },
    {
      modelId: 'model_gemini25', modelName: 'Gemini 2.5 Pro', provider: 'Google',
      level: 'gold', category: 'creative', overallScore: 91.7,
      benchmarks: JSON.stringify({ 'MMLU-Pro': 85.6, 'GPQA Diamond': 65.9, 'MT-Bench': 92.1, 'IFEval': 87.9, 'MATH-500': 84.3 }),
      criteria: JSON.stringify({ min_score: 90, benchmarks_required: 4 }),
      status: 'certified',
      validFrom: new Date('2025-01-20'), validUntil: new Date('2025-07-20'),
    },
    {
      modelId: 'model_deepseek', modelName: 'DeepSeek-R1', provider: 'DeepSeek',
      level: 'silver', category: 'reasoning', overallScore: 84.6,
      benchmarks: JSON.stringify({ 'MATH-500': 90.2, 'GPQA Diamond': 59.1, 'MMLU-Pro': 82.4, 'HumanEval+': 85.1 }),
      criteria: JSON.stringify({ min_score: 80, benchmarks_required: 3 }),
      status: 'certified',
      validFrom: new Date('2025-03-01'), validUntil: new Date('2025-09-01'),
    },
    {
      modelId: 'model_llama4', modelName: 'Llama 4 Maverick', provider: 'Meta',
      level: 'silver', category: 'general', overallScore: 83.2,
      benchmarks: JSON.stringify({ 'MMLU-Pro': 80.8, 'HumanEval+': 82.3, 'MT-Bench': 85.1, 'IFEval': 78.9 }),
      criteria: JSON.stringify({ min_score: 80, benchmarks_required: 3 }),
      status: 'certified',
      validFrom: new Date('2025-02-15'), validUntil: new Date('2025-08-15'),
    },
    {
      modelId: 'model_mistral', modelName: 'Mistral Large', provider: 'Mistral AI',
      level: 'bronze', category: 'multilingual', overallScore: 76.8,
      benchmarks: JSON.stringify({ 'MMLU-Pro': 74.2, 'MT-Bench': 78.5, 'IFEval': 76.1 }),
      criteria: JSON.stringify({ min_score: 70, benchmarks_required: 2 }),
      status: 'certified',
      validFrom: new Date('2025-03-10'), validUntil: new Date('2025-09-10'),
    },
    {
      modelId: 'model_qwen3', modelName: 'Qwen 3 Max', provider: 'Alibaba',
      level: 'gold', category: 'math', overallScore: 93.5,
      benchmarks: JSON.stringify({ 'MATH-500': 95.8, 'GPQA Diamond': 66.7, 'MMLU-Pro': 87.9, 'HumanEval+': 88.2 }),
      criteria: JSON.stringify({ min_score: 90, benchmarks_required: 4 }),
      status: 'certified',
      validFrom: new Date('2025-02-20'), validUntil: new Date('2025-08-20'),
    },
    {
      modelId: 'model_gpt4omini', modelName: 'GPT-4o mini', provider: 'OpenAI',
      level: 'bronze', category: 'general', overallScore: 72.4,
      benchmarks: JSON.stringify({ 'MMLU-Pro': 70.1, 'MT-Bench': 74.8, 'IFEval': 72.9 }),
      criteria: JSON.stringify({ min_score: 70, benchmarks_required: 2 }),
      status: 'certified',
      validFrom: new Date('2025-04-01'), validUntil: new Date('2025-10-01'),
    },
    {
      modelId: 'model_claude_sonnet4', modelName: 'Claude 4 Sonnet', provider: 'Anthropic',
      level: 'platinum', category: 'reasoning', overallScore: 96.4,
      benchmarks: JSON.stringify({ 'GPQA Diamond': 70.1, 'MMLU-Pro': 90.2, 'MATH-500': 89.7, 'HumanEval+': 94.3, 'IFEval': 92.8 }),
      criteria: JSON.stringify({ min_score: 95, benchmarks_required: 5 }),
      status: 'certified',
      validFrom: new Date('2025-01-28'), validUntil: new Date('2025-07-28'),
    },
    {
      modelId: 'model_gemini_flash', modelName: 'Gemini 2.5 Flash', provider: 'Google',
      level: 'silver', category: 'general', overallScore: 82.1,
      benchmarks: JSON.stringify({ 'MMLU-Pro': 79.5, 'MT-Bench': 84.2, 'IFEval': 80.8, 'MATH-500': 78.9 }),
      criteria: JSON.stringify({ min_score: 80, benchmarks_required: 3 }),
      status: 'certified',
      validFrom: new Date('2025-03-15'), validUntil: new Date('2025-09-15'),
    },
  ];

  await db.certification.createMany({ data: certs });
}

export async function GET(request: Request) {
  try {
    await seedCertifications();

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const category = searchParams.get('category');
    const provider = searchParams.get('provider');
    const status = searchParams.get('status') || 'certified';

    const where: Record<string, unknown> = { status };
    if (level) where.level = level;
    if (category) where.category = category;
    if (provider) where.provider = provider;

    const [certifications, totalCount] = await Promise.all([
      db.certification.findMany({
        where,
        orderBy: { overallScore: 'desc' },
      }),
      db.certification.count({ where }),
    ]);

    // Stats
    const [byLevel, byCategory, byProvider] = await Promise.all([
      db.certification.groupBy({ by: ['level'], _count: true, where: { status: 'certified' } }),
      db.certification.groupBy({ by: ['category'], _count: true, where: { status: 'certified' } }),
      db.certification.groupBy({ by: ['provider'], _count: true, where: { status: 'certified' } }),
    ]);

    return NextResponse.json({
      certifications,
      stats: {
        total: totalCount,
        byLevel: byLevel.map(g => ({ level: g.level, count: g._count })),
        byCategory: byCategory.map(g => ({ category: g.category, count: g._count })),
        byProvider: byProvider.map(g => ({ provider: g.provider, count: g._count })),
      },
    });
  } catch (error) {
    console.error('[Certifications API]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
