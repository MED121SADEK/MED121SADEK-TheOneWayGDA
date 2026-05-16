import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { pricingCache } from '@/lib/cache';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const sortBy = searchParams.get('sortBy') || 'inputPrice';

    const cacheKey = `pricing:${provider || 'all'}:${sortBy}`;
    const cached = pricingCache.get(cacheKey);
    if (cached) return NextResponse.json({ ...cached, fromCache: true });

    const where: any = { isActive: true };
    if (provider) where.provider = provider;

    const [pricingData, models] = await Promise.all([
      prisma.modelPricing.findMany({ where, orderBy: { updatedAt: 'desc' } }),
      prisma.aiModel.findMany({ select: { id: true, name: true, provider: true, modelType: true, contextWindow: true, parameters: true } }),
    ]);

    const modelMap = Object.fromEntries(models.map(m => [m.id, m]));

    const seen = new Set<string>();
    const unique: any[] = [];
    for (const p of pricingData) {
      if (!seen.has(p.modelId)) {
        seen.add(p.modelId);
        const model = modelMap[p.modelId];
        unique.push({
          modelId: p.modelId, modelName: model?.name || 'Unknown', provider: model?.provider || p.provider,
          modelType: model?.modelType || 'unknown', contextWindow: model?.contextWindow || 0,
          parameters: model?.parameters || 'N/A',
          inputPrice: p.inputPrice, outputPrice: p.outputPrice,
          batchInputPrice: p.batchInputPrice, batchOutputPrice: p.batchOutputPrice,
          costPer1MCombined: parseFloat(((p.inputPrice + p.outputPrice) / 2).toFixed(2)),
        });
      }
    }

    unique.sort((a, b) => {
      if (sortBy === 'outputPrice') return a.outputPrice - b.outputPrice;
      if (sortBy === 'value') return a.costPer1MCombined - b.costPer1MCombined;
      return a.inputPrice - b.inputPrice;
    });

    const providerStats: Record<string, { count: number; avgInput: number; avgOutput: number; minInput: number }> = {};
    for (const item of unique) {
      if (!providerStats[item.provider]) providerStats[item.provider] = { count: 0, avgInput: 0, avgOutput: 0, minInput: Infinity };
      const s = providerStats[item.provider];
      s.count++; s.avgInput += item.inputPrice; s.avgOutput += item.outputPrice;
      s.minInput = Math.min(s.minInput, item.inputPrice);
    }
    for (const s of Object.values(providerStats)) {
      s.avgInput = parseFloat((s.avgInput / s.count).toFixed(2));
      s.avgOutput = parseFloat((s.avgOutput / s.count).toFixed(2));
    }

    const result = { pricing: unique, providerStats, meta: { totalModels: unique.length, lastUpdated: new Date().toISOString() } };
    pricingCache.set(cacheKey, result);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
