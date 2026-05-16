import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const model = await prisma.aIModel.findUnique({
      where: { id },
      include: {
        BenchmarkScores: { where: { version: 'latest' }, orderBy: { score: 'desc' } },
        ModelPricing: { where: { isActive: true }, orderBy: { updatedAt: 'desc' }, take: 1 },
        LiveMetrics: { orderBy: { testedAt: 'desc' }, take: 30 },
      },
    });
    if (!model) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

    const success = model.LiveMetrics.filter(m => m.status === 'success');
    const avgLatency = success.length > 0 ? Math.round(success.reduce((s, m) => s + (m.latencyMs || 0), 0) / success.length) : null;
    const avgTps = success.length > 0 ? parseFloat((success.reduce((s, m) => s + (m.tps || 0), 0) / success.length).toFixed(1)) : null;
    const avgBenchmark = model.BenchmarkScores.length > 0
      ? parseFloat((model.BenchmarkScores.reduce((s, b) => s + (b.score / b.maxScore) * 100, 0) / model.BenchmarkScores.length).toFixed(1))
      : null;

    return NextResponse.json({
      ...model,
      aggregates: { avgLatency, avgTps, avgBenchmark, totalTests: model.LiveMetrics.length, successfulTests: success.length },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
