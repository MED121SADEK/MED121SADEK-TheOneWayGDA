import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { benchmarkCache } from '@/lib/cache';
import { seedLeaderboardData } from '@/lib/leaderboard-seed';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('modelId');

    const cacheKey = `benchmarks:${modelId || 'overview'}`;
    const cached = benchmarkCache.get(cacheKey);
    if (cached) return NextResponse.json({ ...cached, fromCache: true });

    if ((await prisma.aiModel.count()) === 0) await seedLeaderboardData();

    if (modelId) {
      const scores = await prisma.benchmarkScore.findMany({ where: { modelId, version: 'latest' }, orderBy: { score: 'desc' } });
      const model = await prisma.aiModel.findUnique({ where: { id: modelId } });
      return NextResponse.json({ model, scores });
    }

    const [benchmarks, models] = await Promise.all([
      prisma.benchmarkScore.findMany({
        where: { version: 'latest' },
        orderBy: [{ benchmark: 'asc' }, { score: 'desc' }],
      }),
      prisma.aiModel.findMany({ select: { id: true, name: true, provider: true } }),
    ]);

    const modelMap = Object.fromEntries(models.map(m => [m.id, m]));

    const grouped: Record<string, any[]> = {};
    for (const b of benchmarks) {
      if (!grouped[b.benchmark]) grouped[b.benchmark] = [];
      const model = modelMap[b.modelId];
      grouped[b.benchmark].push({
        modelId: b.modelId, modelName: model?.name || 'Unknown', provider: model?.provider || 'Unknown',
        score: b.score, maxScore: b.maxScore, normalized: parseFloat(((b.score / b.maxScore) * 100).toFixed(1)), source: b.source,
      });
    }

    const summary = Object.entries(grouped).map(([name, scores]) => ({
      name, topPerformer: scores[0]?.modelName, topProvider: scores[0]?.provider,
      topScore: scores[0]?.score, maxScore: scores[0]?.maxScore,
      averageScore: parseFloat((scores.reduce((s, x) => s + x.normalized, 0) / scores.length).toFixed(1)),
      participantCount: scores.length, scores: scores.slice(0, 20),
    })).sort((a, b) => b.participantCount - a.participantCount);

    const result = { benchmarks: summary, meta: { totalBenchmarks: summary.length, lastUpdated: new Date().toISOString() } };
    benchmarkCache.set(cacheKey, result);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
