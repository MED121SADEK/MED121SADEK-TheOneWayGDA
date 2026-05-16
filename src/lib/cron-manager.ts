import { db as prisma } from './db';

const cronIntervalToMs: Record<string, number> = {
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

interface CronConfig {
  name: string;
  type: 'pricing' | 'metrics' | 'benchmarks' | 'news';
  interval: string;
  handler: () => Promise<void>;
}

class CronManager {
  private jobs = new Map<string, { config: CronConfig; timer: ReturnType<typeof setInterval> | null }>();

  async init(): Promise<void> {
    const defaults = [
      { name: 'pricing-updater', type: 'pricing' as const, interval: '1h' },
      { name: 'metrics-collector', type: 'metrics' as const, interval: '1h' },
      { name: 'benchmarks-sync', type: 'benchmarks' as const, interval: '6h' },
      { name: 'leaderboard-snapshot', type: 'benchmarks' as const, interval: '1d' },
    ];
    for (const job of defaults) {
      await prisma.cronJob.upsert({
        where: { name: job.name },
        create: {
          name: job.name,
          type: job.type,
          interval: job.interval,
          status: 'idle',
          nextRun: new Date(Date.now() + (cronIntervalToMs[job.interval] || 3600000)),
        },
        update: {},
      });
    }
    console.log(`[CronManager] Initialized ${defaults.length} cron jobs`);
  }

  register(config: CronConfig): void {
    if (this.jobs.has(config.name)) return;
    const intervalMs = cronIntervalToMs[config.interval] || 3600000;
    const timer = setInterval(() => this.execute(config.name, config.handler), intervalMs);
    this.jobs.set(config.name, { config, timer });
    console.log(`[CronManager] Registered: ${config.name} (every ${config.interval})`);
  }

  private async execute(name: string, handler: () => Promise<void>): Promise<void> {
    try {
      await prisma.cronJob.update({ where: { name }, data: { status: 'running', lastRun: new Date() } });
      console.log(`[CronManager] Executing: ${name}`);
      const t0 = Date.now();
      await handler();
      const duration = Date.now() - t0;
      const intervalMs = cronIntervalToMs['1h'] || 3600000;
      await prisma.cronJob.update({
        where: { name },
        data: { status: 'completed', runCount: { increment: 1 }, nextRun: new Date(Date.now() + intervalMs), lastError: null },
      });
      console.log(`[CronManager] Completed: ${name} in ${duration}ms`);
    } catch (error: any) {
      console.error(`[CronManager] Failed: ${name}`, error.message);
      await prisma.cronJob.update({
        where: { name },
        data: { status: 'failed', lastError: error.message?.substring(0, 500) },
      });
    }
  }

  async runNow(name: string): Promise<{ success: boolean; message: string }> {
    const job = this.jobs.get(name);
    if (!job) return { success: false, message: `Job "${name}" not found` };
    try {
      const t0 = Date.now();
      await job.config.handler();
      return { success: true, message: `Job "${name}" completed in ${Date.now() - t0}ms` };
    } catch (error: any) {
      return { success: false, message: `Job "${name}" failed: ${error.message}` };
    }
  }

  stop(): void {
    for (const [name, job] of this.jobs.entries()) {
      if (job.timer) clearInterval(job.timer);
    }
    this.jobs.clear();
  }
}

export const cronManager = new CronManager();
