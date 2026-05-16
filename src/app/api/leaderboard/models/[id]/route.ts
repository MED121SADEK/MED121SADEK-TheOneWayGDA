import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const model = await prisma.aiModel.findUnique({ where: { id } });
    if (!model) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

    const [benchmarks, pricing, metrics] = await Promise.all([
      prisma.benchmarkScore.findMany({ where: { modelId: id, version: 'latest' }, orderBy: { score: 'desc' } }),
      prisma.modelPricing.findMany({ where: { modelId: id, isActive: true }, orderBy: { updatedAt: 'desc' }, take: 1 }),
      prisma.liveMetric.findMany({ where: { modelId: id }, orderBy: { testedAt: 'desc' }, take: 30 }),
    ]);

    const success = metrics.filter(m => m.status === 'success');
    const avgLatency = success.length > 0 ? Math.round(success.reduce((s, m) => s + (m.latencyMs || 0), 0) / success.length) : null;
    const avgTps = success.length > 0 ? parseFloat((success.reduce((s, m) => s + (m.tps || 0), 0) / success.length).toFixed(1)) : null;
    const avgBenchmark = benchmarks.length > 0
      ? parseFloat((benchmarks.reduce((s, b) => s + (b.score / b.maxScore) * 100, 0) / benchmarks.length).toFixed(1))
      : null;

    return NextResponse.json({
      ...model,
      BenchmarkScores: benchmarks,
      ModelPricing: pricing,
      LiveMetrics: metrics,
      aggregates: { avgLatency, avgTps, avgBenchmark, totalTests: metrics.length, successfulTests: success.length },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
