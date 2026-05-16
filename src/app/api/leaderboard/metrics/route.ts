import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { metricsCache } from '@/lib/cache';
import { seedLeaderboardData } from '@/lib/leaderboard-seed';

const TEST_PROMPTS = [
  'Explain gradient descent in machine learning in 2-3 sentences.',
  'What is the capital of France? Reply with just the city name.',
  'Write a Python function that checks if a number is prime.',
  'Summarize the importance of statistical significance in research.',
  'What are the main differences between SQL and NoSQL databases?',
];

const BASE_LATENCY: Record<string, number> = {
  'GPT-4o': 450, 'GPT-4o-mini': 180, 'Claude 4 Sonnet': 520, 'Claude 3.5 Haiku': 200,
  'Gemini 2.5 Pro': 380, 'Gemini 2.0 Flash': 150, 'Llama 4 Maverick': 320,
  'DeepSeek R1': 850, 'DeepSeek V3': 420, 'Qwen3 235B': 380, 'Mistral Large 2': 350,
  'Codestral 25.01': 190, 'Command R+': 310, 'GLM-4': 340, 'Phi-4': 160, 'Yi-Lightning': 140,
};
const BASE_TPS: Record<string, number> = {
  'GPT-4o': 85, 'GPT-4o-mini': 165, 'Claude 4 Sonnet': 78, 'Claude 3.5 Haiku': 155,
  'Gemini 2.5 Pro': 92, 'Gemini 2.0 Flash': 180, 'Llama 4 Maverick': 95,
  'DeepSeek R1': 45, 'DeepSeek V3': 72, 'Qwen3 235B': 88, 'Mistral Large 2': 65,
  'Codestral 25.01': 140, 'Command R+': 58, 'GLM-4': 70, 'Phi-4': 120, 'Yi-Lightning': 170,
};

async function simulateModelTest(modelId: string, modelName: string) {
  const latency = Math.max(50, (BASE_LATENCY[modelName] || 300) + Math.round((Math.random() - 0.5) * 100));
  const tps = Math.max(10, (BASE_TPS[modelName] || 80) + parseFloat(((Math.random() - 0.5) * 20).toFixed(1)));
  const inputTokens = 15 + Math.floor(Math.random() * 30);
  return {
    latencyMs: latency, tps, inputTokens,
    outputTokens: Math.max(10, Math.floor(latency * tps / 1000)),
    status: Math.random() > 0.02 ? 'success' : 'error',
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('modelId');
    const days = parseInt(searchParams.get('days') || '7');
    const since = new Date(Date.now() - days * 86400000);

    const cacheKey = `metrics:${modelId || 'all'}:${days}`;
    const cached = metricsCache.get(cacheKey);
    if (cached) return NextResponse.json({ ...cached, fromCache: true });

    if (modelId) {
      const metrics = await prisma.liveMetric.findMany({ where: { modelId, testedAt: { gte: since } }, orderBy: { testedAt: 'desc' } });
      return NextResponse.json({ metrics, modelId });
    }

    const models = await prisma.aIModel.findMany({ where: { isActive: true }, select: { id: true, name: true, provider: true } });
    const summary: any[] = [];

    for (const model of models) {
      const metrics = await prisma.liveMetric.findMany({ where: { modelId: model.id, status: 'success', testedAt: { gte: since } }, orderBy: { testedAt: 'desc' } });
      if (metrics.length === 0) continue;

      const avgLatency = Math.round(metrics.reduce((s, m) => s + (m.latencyMs || 0), 0) / metrics.length);
      const avgTps = parseFloat((metrics.reduce((s, m) => s + (m.tps || 0), 0) / metrics.length).toFixed(1));
      const sorted = [...metrics].sort((a, b) => (a.latencyMs || 0) - (b.latencyMs || 0));

      summary.push({
        modelId: model.id, modelName: model.name, provider: model.provider,
        avgLatency, avgTps,
        minLatency: sorted[0]?.latencyMs || 0, maxLatency: sorted[sorted.length - 1]?.latencyMs || 0,
        p95Latency: sorted[Math.floor(sorted.length * 0.95)]?.latencyMs || 0,
        sampleCount: metrics.length,
        uptime: parseFloat(((metrics.filter(m => m.status === 'success').length / metrics.length) * 100).toFixed(1)),
        timeSeries: metrics.slice(0, 168).reverse().map(m => ({ testedAt: m.testedAt, latencyMs: m.latencyMs, tps: m.tps })),
      });
    }

    summary.sort((a, b) => a.avgLatency - b.avgLatency);
    const result = { metrics: summary, period: { days, since: since.toISOString() }, lastUpdated: new Date().toISOString() };
    metricsCache.set(cacheKey, result);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const modelId = body.modelId;

    if ((await prisma.aIModel.count()) === 0) await seedLeaderboardData();

    const models = modelId
      ? await prisma.aIModel.findMany({ where: { id: modelId, isActive: true } })
      : await prisma.aIModel.findMany({ where: { isActive: true } });

    const results: any[] = [];
    for (const model of models) {
      const prompt = TEST_PROMPTS[Math.floor(Math.random() * TEST_PROMPTS.length)];
      const test = await simulateModelTest(model.id, model.name);
      await prisma.liveMetric.create({
        data: { modelId: model.id, prompt, latencyMs: test.latencyMs, tps: test.tps, inputTokens: test.inputTokens, outputTokens: test.outputTokens, status: test.status },
      });
      results.push({ model: model.name, ...test });
    }

    metricsCache.clear();
    leaderboardCache.clear();
    return NextResponse.json({ success: true, tested: results.length, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
