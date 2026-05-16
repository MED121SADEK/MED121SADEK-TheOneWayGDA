import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { leaderboardCache } from '@/lib/cache';
import { seedLeaderboardData } from '@/lib/leaderboard-seed';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const benchmark = searchParams.get('benchmark') || 'GPQA';
    const provider = searchParams.get('provider');
    const modelType = searchParams.get('modelType');
    const sort = searchParams.get('sort') || 'score';
    const order = searchParams.get('order') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const cacheKey = `lb:${benchmark}:${provider||'all'}:${modelType||'all'}:${sort}:${order}:${page}:${limit}`;
    const cached = leaderboardCache.get(cacheKey);
    if (cached) return NextResponse.json({ ...cached, fromCache: true });

    // Auto-seed if empty
    if ((await prisma.aIModel.count()) === 0) await seedLeaderboardData();

    const where: any = { isActive: true, BenchmarkScores: { some: { benchmark, version: 'latest' } } };
    if (provider) where.provider = provider;
    if (modelType) where.modelType = modelType;

    const models = await prisma.aIModel.findMany({
      where,
      include: {
        BenchmarkScores: { where: { benchmark, version: 'latest' }, select: { score: true, maxScore: true, source: true } },
        ModelPricing: { where: { isActive: true }, select: { inputPrice: true, outputPrice: true, batchInputPrice: true, batchOutputPrice: true }, take: 1 },
        LiveMetrics: { where: { status: 'success' }, select: { latencyMs: true, tps: true, testedAt: true }, orderBy: { testedAt: 'desc' }, take: 7 },
      },
    });

    const leaderboard = models.map(model => {
      const bm = model.BenchmarkScores[0];
      const pr = model.ModelPricing[0];
      const mt = model.LiveMetrics;
      return {
        id: model.id, name: model.name, provider: model.provider, description: model.description,
        modelType: model.modelType, contextWindow: model.contextWindow, parameters: model.parameters,
        releaseDate: model.releaseDate,
        score: bm?.score || 0, maxScore: bm?.maxScore || 100,
        normalizedScore: bm ? parseFloat(((bm.score / bm.maxScore) * 100).toFixed(1)) : 0,
        source: bm?.source || 'unknown',
        pricing: pr ? { inputPrice: pr.inputPrice, outputPrice: pr.outputPrice, batchInputPrice: pr.batchInputPrice, batchOutputPrice: pr.batchOutputPrice } : null,
        liveMetrics: {
          avgLatency: mt.length > 0 ? Math.round(mt.reduce((s, m) => s + (m.latencyMs || 0), 0) / mt.length) : null,
          avgTps: mt.length > 0 ? parseFloat((mt.reduce((s, m) => s + (m.tps || 0), 0) / mt.length).toFixed(1)) : null,
          sampleSize: mt.length,
        },
      };
    });

    leaderboard.sort((a, b) => {
      const m = order === 'desc' ? -1 : 1;
      if (sort === 'score') return (a.normalizedScore - b.normalizedScore) * m;
      if (sort === 'name') return a.name.localeCompare(b.name) * m;
      if (sort === 'provider') return a.provider.localeCompare(b.provider) * m;
      if (sort === 'price') return ((a.pricing?.inputPrice || 0) - (b.pricing?.inputPrice || 0)) * m;
      if (sort === 'latency') return ((a.liveMetrics.avgLatency || 99999) - (b.liveMetrics.avgLatency || 99999)) * m;
      return 0;
    });

    const [availBenchmarks, availProviders, availModelTypes] = await Promise.all([
      prisma.benchmarkScore.findMany({ where: { version: 'latest' }, select: { benchmark: true }, distinct: ['benchmark'], orderBy: { benchmark: 'asc' } }),
      prisma.aIModel.findMany({ where: { isActive: true }, select: { provider: true }, distinct: ['provider'], orderBy: { provider: 'asc' } }),
      prisma.aIModel.findMany({ where: { isActive: true }, select: { modelType: true }, distinct: ['modelType'] }),
    ]);

    const result = {
      leaderboard,
      filters: {
        benchmarks: availBenchmarks.map(b => b.benchmark),
        providers: availProviders.map(p => p.provider),
        modelTypes: availModelTypes.map(t => t.modelType),
        currentBenchmark: benchmark, currentProvider: provider, currentModelType: modelType,
      },
      pagination: { page, limit, total: leaderboard.length, totalPages: Math.ceil(leaderboard.length / limit) },
      meta: { totalModels: await prisma.aIModel.count({ where: { isActive: true } }), lastUpdated: new Date().toISOString() },
    };

    leaderboardCache.set(cacheKey, result);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Leaderboard API]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await seedLeaderboardData();
    leaderboardCache.clear();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
