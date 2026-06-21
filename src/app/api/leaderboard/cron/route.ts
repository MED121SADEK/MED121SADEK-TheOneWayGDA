import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { cronManager } from '@/lib/cron-manager';
import { leaderboardCache, pricingCache, benchmarkCache, metricsCache } from '@/lib/cache';
import { requireAuthOrRespond } from '@/lib/require-auth';

let initPromise: Promise<void> | null = null;

async function initCron() {
  if (!initPromise) {
    initPromise = (async () => {
      await cronManager.init();

      cronManager.register({
        name: 'pricing-updater', type: 'pricing', interval: '1h',
        handler: async () => { pricingCache.clear(); console.log('[Cron] Pricing refreshed'); },
      });

      cronManager.register({
        name: 'metrics-collector', type: 'metrics', interval: '1h',
        handler: async () => {
          metricsCache.clear();
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://theoneway.app';
            await fetch(`${baseUrl}/api/leaderboard/metrics`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
          } catch { console.warn('[Cron] Self-trigger failed (expected in dev)'); }
        },
      });

      cronManager.register({
        name: 'benchmarks-sync', type: 'benchmarks', interval: '6h',
        handler: async () => { benchmarkCache.clear(); leaderboardCache.clear(); console.log('[Cron] Benchmarks synced'); },
      });
    })();
  }
  return initPromise;
}

export async function GET(request: NextRequest) {
  const { response } = await requireAuthOrRespond(request);
  if (response) return response;

  await initCron();
  const jobs = await prisma.cronJob.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({
    jobs,
    cacheStats: { leaderboard: leaderboardCache.stats(), pricing: pricingCache.stats(), benchmark: benchmarkCache.stats(), metrics: metricsCache.stats() },
    uptime: 'active',
  });
}

export async function POST(request: NextRequest) {
  const { response } = await requireAuthOrRespond(request);
  if (response) return response;

  await initCron();
  const { action, jobName } = await request.json().catch(() => ({}));

  if (action === 'run' && jobName) {
    return NextResponse.json(await cronManager.runNow(jobName));
  }
  if (action === 'clear-cache') {
    leaderboardCache.clear(); pricingCache.clear(); benchmarkCache.clear(); metricsCache.clear();
    return NextResponse.json({ success: true, message: 'All caches cleared' });
  }
  if (action === 'seed') {
    const { seedLeaderboardData } = await import('@/lib/leaderboard-seed');
    const result = await seedLeaderboardData();
    leaderboardCache.clear();
    return NextResponse.json({ success: true, ...result });
  }
  return NextResponse.json({ error: 'Invalid action. Use: run, clear-cache, or seed' }, { status: 400 });
}