import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
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

    if ((await prisma.aiModel.count()) === 0) await seedLeaderboardData();

    // Fetch models with base filter
    const modelWhere: any = { isActive: true };
    if (provider) modelWhere.provider = provider;
    if (modelType) modelWhere.modelType = modelType;

    const [models, allBenchmarks, allPricing, allMetrics] = await Promise.all([
      prisma.aiModel.findMany({ where: modelWhere }),
      prisma.benchmarkScore.findMany({ where: { benchmark, version: 'latest' } }),
      prisma.modelPricing.findMany({ where: { isActive: true }, orderBy: { updatedAt: 'desc' } }),
      prisma.liveMetric.findMany({ where: { status: 'success' }, orderBy: { testedAt: 'desc' } }),
    ]);

    // Build lookup maps
    const bmMap: Record<string, any> = {};
    for (const b of allBenchmarks) {
      if (!bmMap[b.modelId]) bmMap[b.modelId] = b;
    }
    const prMap: Record<string, any> = {};
    for (const p of allPricing) {
      if (!prMap[p.modelId]) prMap[p.modelId] = p;
    }
    const mtMap: Record<string, any[]> = {};
    for (const m of allMetrics) {
      if (!mtMap[m.modelId]) mtMap[m.modelId] = [];
      if (mtMap[m.modelId].length < 7) mtMap[m.modelId].push(m);
    }

    // Filter models that have benchmark data for the selected benchmark
    const modelsWithBenchmarks = models.filter(m => bmMap[m.id]);

    const leaderboard = modelsWithBenchmarks.map(model => {
      const bm = bmMap[model.id];
      const pr = prMap[model.id];
      const mt = mtMap[model.id] || [];
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
      prisma.aiModel.findMany({ where: { isActive: true }, select: { provider: true }, distinct: ['provider'], orderBy: { provider: 'asc' } }),
      prisma.aiModel.findMany({ where: { isActive: true }, select: { modelType: true }, distinct: ['modelType'] }),
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
      meta: { totalModels: models.length, lastUpdated: new Date().toISOString() },
    };

    leaderboardCache.set(cacheKey, result);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Leaderboard API]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await seedLeaderboardData();
    leaderboardCache.clear();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
