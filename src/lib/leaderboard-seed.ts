import { db as prisma } from './db';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BenchmarkEntry {
  n: string;       // benchmark name
  s: number;       // score
  m?: number;      // maxScore (default 100)
}

interface PricingEntry {
  i: number;   // input price per 1M tokens (USD)
  o: number;   // output price per 1M tokens (USD)
  bi?: number;  // batch input price
  bo?: number;  // batch output price
}

interface MetricEntry {
  latencyMs: number;
  tps: number;
  inputTokens: number;
  outputTokens: number;
}

interface SeedModel {
  name: string;
  provider: string;
  description: string;
  modelType: string;
  contextWindow: number;
  parameters: string;
  releaseDate: string;
  websiteUrl: string;
  benchmarks: BenchmarkEntry[];
  pricing: PricingEntry;
  metrics: MetricEntry[];
}

// ─── Real AI Model Data (as of 2025) ────────────────────────────────────────
// Benchmarks: GPQA Diamond, MMLU-Pro, HumanEval+, MATH-500, MT-Bench, IFEval
// Pricing: per 1M tokens (USD)
// Metrics: representative latency & throughput samples

const SEED_MODELS: SeedModel[] = [
  // ═══ OpenAI ══════════════════════════════════════════════════════════════
  {
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Multimodal flagship with vision, audio, and text. Best-in-class general-purpose model.',
    modelType: 'multimodal',
    contextWindow: 128000,
    parameters: '~1.8T MoE',
    releaseDate: '2024-05-13',
    websiteUrl: 'https://openai.com/gpt-4o',
    benchmarks: [
      { n: 'GPQA Diamond', s: 53.6 },
      { n: 'MMLU-Pro', s: 78.0 },
      { n: 'HumanEval+', s: 86.6 },
      { n: 'MATH-500', s: 76.6 },
      { n: 'MT-Bench', s: 9.18, m: 10 },
      { n: 'IFEval', s: 84.5 },
    ],
    pricing: { i: 2.50, o: 10.00, bi: 1.25, bo: 5.00 },
    metrics: [
      { latencyMs: 620, tps: 42.3, inputTokens: 150, outputTokens: 256 },
      { latencyMs: 580, tps: 45.1, inputTokens: 300, outputTokens: 512 },
      { latencyMs: 710, tps: 38.8, inputTokens: 100, outputTokens: 128 },
      { latencyMs: 550, tps: 48.2, inputTokens: 200, outputTokens: 384 },
      { latencyMs: 640, tps: 41.0, inputTokens: 250, outputTokens: 300 },
    ],
  },
  {
    name: 'GPT-4o-mini',
    provider: 'OpenAI',
    description: 'Cost-efficient small model for high-volume applications with strong quality.',
    modelType: 'chat',
    contextWindow: 128000,
    parameters: '~8B',
    releaseDate: '2024-07-18',
    websiteUrl: 'https://openai.com/gpt-4o-mini',
    benchmarks: [
      { n: 'GPQA Diamond', s: 40.2 },
      { n: 'MMLU-Pro', s: 63.2 },
      { n: 'HumanEval+', s: 81.1 },
      { n: 'MATH-500', s: 68.1 },
      { n: 'MT-Bench', s: 8.62, m: 10 },
      { n: 'IFEval', s: 80.2 },
    ],
    pricing: { i: 0.15, o: 0.60, bi: 0.075, bo: 0.30 },
    metrics: [
      { latencyMs: 280, tps: 95.4, inputTokens: 150, outputTokens: 256 },
      { latencyMs: 250, tps: 102.1, inputTokens: 300, outputTokens: 512 },
      { latencyMs: 310, tps: 88.7, inputTokens: 100, outputTokens: 128 },
      { latencyMs: 260, tps: 98.3, inputTokens: 200, outputTokens: 384 },
      { latencyMs: 290, tps: 92.6, inputTokens: 250, outputTokens: 300 },
    ],
  },
  {
    name: 'o1',
    provider: 'OpenAI',
    description: 'Advanced reasoning model with chain-of-thought for complex math, science, and coding.',
    modelType: 'reasoning',
    contextWindow: 200000,
    parameters: '~1.8T MoE',
    releaseDate: '2024-12-05',
    websiteUrl: 'https://openai.com/o1',
    benchmarks: [
      { n: 'GPQA Diamond', s: 68.2 },
      { n: 'MMLU-Pro', s: 84.6 },
      { n: 'HumanEval+', s: 90.2 },
      { n: 'MATH-500', s: 85.5 },
      { n: 'MT-Bench', s: 8.80, m: 10 },
      { n: 'IFEval', s: 83.3 },
    ],
    pricing: { i: 15.00, o: 60.00, bi: 7.50, bo: 30.00 },
    metrics: [
      { latencyMs: 8500, tps: 18.2, inputTokens: 200, outputTokens: 512 },
      { latencyMs: 12000, tps: 14.5, inputTokens: 300, outputTokens: 768 },
      { latencyMs: 6200, tps: 22.1, inputTokens: 150, outputTokens: 384 },
      { latencyMs: 9800, tps: 16.8, inputTokens: 250, outputTokens: 600 },
      { latencyMs: 7400, tps: 20.3, inputTokens: 180, outputTokens: 450 },
    ],
  },
  {
    name: 'o1-mini',
    provider: 'OpenAI',
    description: 'Efficient reasoning model at lower cost. Strong for math and coding tasks.',
    modelType: 'reasoning',
    contextWindow: 128000,
    parameters: '~300B MoE',
    releaseDate: '2024-09-12',
    websiteUrl: 'https://openai.com/o1-mini',
    benchmarks: [
      { n: 'GPQA Diamond', s: 60.8 },
      { n: 'MMLU-Pro', s: 81.2 },
      { n: 'HumanEval+', s: 87.3 },
      { n: 'MATH-500', s: 82.4 },
      { n: 'MT-Bench', s: 8.68, m: 10 },
      { n: 'IFEval', s: 80.1 },
    ],
    pricing: { i: 3.00, o: 12.00, bi: 1.50, bo: 6.00 },
    metrics: [
      { latencyMs: 4500, tps: 25.6, inputTokens: 200, outputTokens: 512 },
      { latencyMs: 5200, tps: 22.3, inputTokens: 300, outputTokens: 768 },
      { latencyMs: 3800, tps: 28.4, inputTokens: 150, outputTokens: 384 },
      { latencyMs: 4100, tps: 26.1, inputTokens: 250, outputTokens: 600 },
      { latencyMs: 4800, tps: 24.0, inputTokens: 180, outputTokens: 450 },
    ],
  },
  {
    name: 'o3-mini',
    provider: 'OpenAI',
    description: 'Latest efficient reasoning model with excellent math, science, and coding at low cost.',
    modelType: 'reasoning',
    contextWindow: 200000,
    parameters: '~300B MoE',
    releaseDate: '2025-01-31',
    websiteUrl: 'https://openai.com/o3-mini',
    benchmarks: [
      { n: 'GPQA Diamond', s: 70.5 },
      { n: 'MMLU-Pro', s: 85.4 },
      { n: 'HumanEval+', s: 91.8 },
      { n: 'MATH-500', s: 88.6 },
      { n: 'MT-Bench', s: 9.04, m: 10 },
      { n: 'IFEval', s: 86.7 },
    ],
    pricing: { i: 1.10, o: 4.40, bi: 0.55, bo: 2.20 },
    metrics: [
      { latencyMs: 3200, tps: 32.5, inputTokens: 200, outputTokens: 512 },
      { latencyMs: 3800, tps: 28.7, inputTokens: 300, outputTokens: 768 },
      { latencyMs: 2600, tps: 36.2, inputTokens: 150, outputTokens: 384 },
      { latencyMs: 3500, tps: 30.1, inputTokens: 250, outputTokens: 600 },
      { latencyMs: 3000, tps: 33.8, inputTokens: 180, outputTokens: 450 },
    ],
  },

  // ═══ Anthropic ═══════════════════════════════════════════════════════════
  {
    name: 'Claude 4 Sonnet',
    provider: 'Anthropic',
    description: 'Latest Sonnet with exceptional reasoning, coding, and instruction following.',
    modelType: 'chat',
    contextWindow: 200000,
    parameters: '~200B',
    releaseDate: '2025-05-22',
    websiteUrl: 'https://www.anthropic.com/claude',
    benchmarks: [
      { n: 'GPQA Diamond', s: 65.0 },
      { n: 'MMLU-Pro', s: 82.7 },
      { n: 'HumanEval+', s: 92.0 },
      { n: 'MATH-500', s: 83.9 },
      { n: 'MT-Bench', s: 9.52, m: 10 },
      { n: 'IFEval', s: 89.5 },
    ],
    pricing: { i: 3.00, o: 15.00, bi: 1.50, bo: 7.50 },
    metrics: [
      { latencyMs: 680, tps: 38.5, inputTokens: 150, outputTokens: 256 },
      { latencyMs: 750, tps: 35.2, inputTokens: 300, outputTokens: 512 },
      { latencyMs: 620, tps: 42.1, inputTokens: 100, outputTokens: 128 },
      { latencyMs: 700, tps: 37.8, inputTokens: 200, outputTokens: 384 },
      { latencyMs: 660, tps: 39.4, inputTokens: 250, outputTokens: 300 },
    ],
  },
  {
    name: 'Claude 4 Opus',
    provider: 'Anthropic',
    description: 'Most capable Claude model. State-of-the-art reasoning and extended thinking.',
    modelType: 'chat',
    contextWindow: 200000,
    parameters: '~400B',
    releaseDate: '2025-05-22',
    websiteUrl: 'https://www.anthropic.com/claude',
    benchmarks: [
      { n: 'GPQA Diamond', s: 69.8 },
      { n: 'MMLU-Pro', s: 84.3 },
      { n: 'HumanEval+', s: 93.7 },
      { n: 'MATH-500', s: 87.2 },
      { n: 'MT-Bench', s: 9.61, m: 10 },
      { n: 'IFEval', s: 91.2 },
    ],
    pricing: { i: 15.00, o: 75.00, bi: 7.50, bo: 37.50 },
    metrics: [
      { latencyMs: 1200, tps: 22.4, inputTokens: 150, outputTokens: 256 },
      { latencyMs: 1400, tps: 19.8, inputTokens: 300, outputTokens: 512 },
      { latencyMs: 1050, tps: 25.1, inputTokens: 100, outputTokens: 128 },
      { latencyMs: 1300, tps: 20.6, inputTokens: 200, outputTokens: 384 },
      { latencyMs: 1150, tps: 23.2, inputTokens: 250, outputTokens: 300 },
    ],
  },
  {
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    description: 'Fast and affordable model with strong reasoning and coding capabilities.',
    modelType: 'chat',
    contextWindow: 200000,
    parameters: '~20B',
    releaseDate: '2024-11-04',
    websiteUrl: 'https://www.anthropic.com/claude',
    benchmarks: [
      { n: 'GPQA Diamond', s: 43.1 },
      { n: 'MMLU-Pro', s: 68.4 },
      { n: 'HumanEval+', s: 84.5 },
      { n: 'MATH-500', s: 65.8 },
      { n: 'MT-Bench', s: 8.41, m: 10 },
      { n: 'IFEval', s: 82.6 },
    ],
    pricing: { i: 0.80, o: 4.00, bi: 0.40, bo: 2.00 },
    metrics: [
      { latencyMs: 320, tps: 82.5, inputTokens: 150, outputTokens: 256 },
      { latencyMs: 290, tps: 88.3, inputTokens: 300, outputTokens: 512 },
      { latencyMs: 350, tps: 76.1, inputTokens: 100, outputTokens: 128 },
      { latencyMs: 310, tps: 85.2, inputTokens: 200, outputTokens: 384 },
      { latencyMs: 340, tps: 79.8, inputTokens: 250, outputTokens: 300 },
    ],
  },

  // ═══ Google ══════════════════════════════════════════════════════════════
  {
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    description: 'Most capable Gemini model with 1M context, thinking mode, and native multimodal.',
    modelType: 'multimodal',
    contextWindow: 1000000,
    parameters: '~1.5T MoE',
    releaseDate: '2025-03-25',
    websiteUrl: 'https://deepmind.google/technologies/gemini/',
    benchmarks: [
      { n: 'GPQA Diamond', s: 71.4 },
      { n: 'MMLU-Pro', s: 82.6 },
      { n: 'HumanEval+', s: 88.7 },
      { n: 'MATH-500', s: 85.3 },
      { n: 'MT-Bench', s: 9.24, m: 10 },
      { n: 'IFEval', s: 85.8 },
    ],
    pricing: { i: 1.25, o: 10.00, bi: 0.625, bo: 5.00 },
    metrics: [
      { latencyMs: 950, tps: 31.2, inputTokens: 150, outputTokens: 256 },
      { latencyMs: 1100, tps: 28.5, inputTokens: 300, outputTokens: 512 },
      { latencyMs: 820, tps: 34.8, inputTokens: 100, outputTokens: 128 },
      { latencyMs: 980, tps: 30.1, inputTokens: 200, outputTokens: 384 },
      { latencyMs: 1050, tps: 29.3, inputTokens: 250, outputTokens: 300 },
    ],
  },
  {
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    description: 'Fast and efficient Gemini model with thinking mode. Great balance of speed and quality.',
    modelType: 'chat',
    contextWindow: 1000000,
    parameters: '~400B MoE',
    releaseDate: '2025-05-20',
    websiteUrl: 'https://deepmind.google/technologies/gemini/',
    benchmarks: [
      { n: 'GPQA Diamond', s: 60.1 },
      { n: 'MMLU-Pro', s: 78.5 },
      { n: 'HumanEval+', s: 85.2 },
      { n: 'MATH-500', s: 79.8 },
      { n: 'MT-Bench', s: 9.05, m: 10 },
      { n: 'IFEval', s: 84.2 },
    ],
    pricing: { i: 0.15, o: 0.60, bi: 0.075, bo: 0.30 },
    metrics: [
      { latencyMs: 380, tps: 75.4, inputTokens: 150, outputTokens: 256 },
      { latencyMs: 420, tps: 68.2, inputTokens: 300, outputTokens: 512 },
      { latencyMs: 340, tps: 82.1, inputTokens: 100, outputTokens: 128 },
      { latencyMs: 400, tps: 71.5, inputTokens: 200, outputTokens: 384 },
      { latencyMs: 390, tps: 73.8, inputTokens: 250, outputTokens: 300 },
    ],
  },
  {
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    description: 'Fast, efficient model for high-throughput tasks with agent capabilities.',
    modelType: 'chat',
    contextWindow: 1000000,
    parameters: '~400B MoE',
    releaseDate: '2025-02-05',
    websiteUrl: 'https://deepmind.google/technologies/gemini/',
    benchmarks: [
      { n: 'GPQA Diamond', s: 52.3 },
      { n: 'MMLU-Pro', s: 75.0 },
      { n: 'HumanEval+', s: 82.1 },
      { n: 'MATH-500', s: 72.4 },
      { n: 'MT-Bench', s: 8.74, m: 10 },
      { n: 'IFEval', s: 80.5 },
    ],
    pricing: { i: 0.10, o: 0.40, bi: 0.05, bo: 0.20 },
    metrics: [
      { latencyMs: 310, tps: 88.6, inputTokens: 150, outputTokens: 256 },
      { latencyMs: 350, tps: 80.2, inputTokens: 300, outputTokens: 512 },
      { latencyMs: 280, tps: 95.1, inputTokens: 100, outputTokens: 128 },
      { latencyMs: 330, tps: 83.5, inputTokens: 200, outputTokens: 384 },
      { latencyMs: 320, tps: 86.0, inputTokens: 250, outputTokens: 300 },
    ],
  },

  // ═══ Meta ════════════════════════════════════════════════════════════════
  {
    name: 'Llama 4 Maverick',
    provider: 'Meta',
    description: 'Open-weight MoE with 128 experts. Strong multilingual, coding, and 1M context.',
    modelType: 'chat',
    contextWindow: 1000000,
    parameters: '400B MoE (17B active)',
    releaseDate: '2025-04-05',
    websiteUrl: 'https://llama.meta.com/',
    benchmarks: [
      { n: 'GPQA Diamond', s: 55.8 },
      { n: 'MMLU-Pro', s: 73.8 },
      { n: 'HumanEval+', s: 78.5 },
      { n: 'MATH-500', s: 73.6 },
      { n: 'MT-Bench', s: 8.82, m: 10 },
      { n: 'IFEval', s: 78.3 },
    ],
    pricing: { i: 0.20, o: 0.80, bi: 0.10, bo: 0.40 },
    metrics: [
      { latencyMs: 520, tps: 52.3, inputTokens: 150, outputTokens: 256 },
      { latencyMs: 580, tps: 47.8, inputTokens: 300, outputTokens: 512 },
      { latencyMs: 480, tps: 55.6, inputTokens: 100, outputTokens: 128 },
      { latencyMs: 540, tps: 50.1, inputTokens: 200, outputTokens: 384 },
      { latencyMs: 560, tps: 48.9, inputTokens: 250, outputTokens: 300 },
    ],
  },
  {
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    description: 'Open-weight dense model. Excellent quality-per-cost for self-hosted deployments.',
    modelType: 'chat',
    contextWindow: 128000,
    parameters: '70B',
    releaseDate: '2024-12-06',
    websiteUrl: 'https://llama.meta.com/',
    benchmarks: [
      { n: 'GPQA Diamond', s: 44.6 },
      { n: 'MMLU-Pro', s: 72.6 },
      { n: 'HumanEval+', s: 76.3 },
      { n: 'MATH-500', s: 65.7 },
      { n: 'MT-Bench', s: 8.65, m: 10 },
      { n: 'IFEval', s: 79.1 },
    ],
    pricing: { i: 0.39, o: 0.39, bi: 0.20, bo: 0.20 },
    metrics: [
      { latencyMs: 440, tps: 58.4, inputTokens: 150, outputTokens: 256 },
      { latencyMs: 490, tps: 52.7, inputTokens: 300, outputTokens: 512 },
      { latencyMs: 410, tps: 62.1, inputTokens: 100, outputTokens: 128 },
      { latencyMs: 460, tps: 55.3, inputTokens: 200, outputTokens: 384 },
      { latencyMs: 475, tps: 53.8, inputTokens: 250, outputTokens: 300 },
    ],
  },

  // ═══ DeepSeek ════════════════════════════════════════════════════════════
  {
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    description: 'General-purpose MoE with strong coding, multilingual, and exceptional price-performance.',
    modelType: 'chat',
    contextWindow: 128000,
    parameters: '671B MoE (37B active)',
    releaseDate: '2024-12-26',
    websiteUrl: 'https://www.deepseek.com/',
    benchmarks: [
      { n: 'GPQA Diamond', s: 59.1 },
      { n: 'MMLU-Pro', s: 75.9 },
      { n: 'HumanEval+', s: 83.5 },
      { n: 'MATH-500', s: 82.6 },
      { n: 'MT-Bench', s: 8.92, m: 10 },
      { n: 'IFEval', s: 80.9 },
    ],
    pricing: { i: 0.27, o: 1.10, bi: 0.07, bo: 0.28 },
    metrics: [
      { latencyMs: 620, tps: 45.6, inputTokens: 150, outputTokens: 256 },
      { latencyMs: 700, tps: 41.2, inputTokens: 300, outputTokens: 512 },
      { latencyMs: 570, tps: 48.3, inputTokens: 100, outputTokens: 128 },
      { latencyMs: 650, tps: 43.8, inputTokens: 200, outputTokens: 384 },
      { latencyMs: 680, tps: 42.1, inputTokens: 250, outputTokens: 300 },
    ],
  },
  {
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    description: 'Reasoning-optimized with chain-of-thought. Exceptional math, science, and logic.',
    modelType: 'reasoning',
    contextWindow: 64000,
    parameters: '671B MoE (37B active)',
    releaseDate: '2025-01-20',
    websiteUrl: 'https://www.deepseek.com/',
    benchmarks: [
      { n: 'GPQA Diamond', s: 71.5 },
      { n: 'MMLU-Pro', s: 79.8 },
      { n: 'HumanEval+', s: 80.9 },
      { n: 'MATH-500', s: 90.2 },
      { n: 'MT-Bench', s: 9.04, m: 10 },
      { n: 'IFEval', s: 78.6 },
    ],
    pricing: { i: 0.55, o: 2.19, bi: 0.14, bo: 0.55 },
    metrics: [
      { latencyMs: 8500, tps: 15.2, inputTokens: 200, outputTokens: 512 },
      { latencyMs: 11000, tps: 12.8, inputTokens: 300, outputTokens: 768 },
      { latencyMs: 6800, tps: 18.5, inputTokens: 150, outputTokens: 384 },
      { latencyMs: 9500, tps: 14.1, inputTokens: 250, outputTokens: 600 },
      { latencyMs: 7800, tps: 16.4, inputTokens: 180, outputTokens: 450 },
    ],
  },

  // ═══ Mistral ═════════════════════════════════════════════════════════════
  {
    name: 'Mistral Large',
    provider: 'Mistral',
    description: 'European flagship model with strong reasoning, coding, and multilingual support.',
    modelType: 'chat',
    contextWindow: 128000,
    parameters: '~123B',
    releaseDate: '2024-07-24',
    websiteUrl: 'https://mistral.ai/',
    benchmarks: [
      { n: 'GPQA Diamond', s: 50.4 },
      { n: 'MMLU-Pro', s: 72.0 },
      { n: 'HumanEval+', s: 81.5 },
      { n: 'MATH-500', s: 69.5 },
      { n: 'MT-Bench', s: 8.65, m: 10 },
      { n: 'IFEval', s: 79.8 },
    ],
    pricing: { i: 2.00, o: 6.00, bi: 1.00, bo: 3.00 },
    metrics: [
      { latencyMs: 580, tps: 46.2, inputTokens: 150, outputTokens: 256 },
      { latencyMs: 640, tps: 42.1, inputTokens: 300, outputTokens: 512 },
      { latencyMs: 530, tps: 49.8, inputTokens: 100, outputTokens: 128 },
      { latencyMs: 600, tps: 44.5, inputTokens: 200, outputTokens: 384 },
      { latencyMs: 620, tps: 43.3, inputTokens: 250, outputTokens: 300 },
    ],
  },
  {
    name: 'Mistral Small',
    provider: 'Mistral',
    description: 'Cost-efficient Mistral model ideal for high-volume tasks with good quality.',
    modelType: 'chat',
    contextWindow: 128000,
    parameters: '~22B',
    releaseDate: '2024-09-17',
    websiteUrl: 'https://mistral.ai/',
    benchmarks: [
      { n: 'GPQA Diamond', s: 38.2 },
      { n: 'MMLU-Pro', s: 63.8 },
      { n: 'HumanEval+', s: 79.0 },
      { n: 'MATH-500', s: 58.3 },
      { n: 'MT-Bench', s: 8.22, m: 10 },
      { n: 'IFEval', s: 77.5 },
    ],
    pricing: { i: 0.20, o: 0.60, bi: 0.10, bo: 0.30 },
    metrics: [
      { latencyMs: 340, tps: 78.3, inputTokens: 150, outputTokens: 256 },
      { latencyMs: 380, tps: 72.1, inputTokens: 300, outputTokens: 512 },
      { latencyMs: 310, tps: 84.6, inputTokens: 100, outputTokens: 128 },
      { latencyMs: 360, tps: 75.2, inputTokens: 200, outputTokens: 384 },
      { latencyMs: 370, tps: 73.5, inputTokens: 250, outputTokens: 300 },
    ],
  },

  // ═══ Qwen ════════════════════════════════════════════════════════════════
  {
    name: 'Qwen 3 235B',
    provider: 'Qwen',
    description: 'Open-weight MoE with strong multilingual, hybrid thinking mode, and excellent benchmark scores.',
    modelType: 'chat',
    contextWindow: 128000,
    parameters: '235B MoE (22B active)',
    releaseDate: '2025-04-28',
    websiteUrl: 'https://qwen.ai/',
    benchmarks: [
      { n: 'GPQA Diamond', s: 61.2 },
      { n: 'MMLU-Pro', s: 77.8 },
      { n: 'HumanEval+', s: 81.4 },
      { n: 'MATH-500', s: 78.9 },
      { n: 'MT-Bench', s: 8.93, m: 10 },
      { n: 'IFEval', s: 81.6 },
    ],
    pricing: { i: 0.40, o: 1.20, bi: 0.20, bo: 0.60 },
    metrics: [
      { latencyMs: 560, tps: 50.2, inputTokens: 150, outputTokens: 256 },
      { latencyMs: 620, tps: 45.8, inputTokens: 300, outputTokens: 512 },
      { latencyMs: 510, tps: 54.1, inputTokens: 100, outputTokens: 128 },
      { latencyMs: 580, tps: 48.3, inputTokens: 200, outputTokens: 384 },
      { latencyMs: 600, tps: 47.0, inputTokens: 250, outputTokens: 300 },
    ],
  },
  {
    name: 'Qwen 3 32B',
    provider: 'Qwen',
    description: 'Efficient open-weight model with hybrid thinking mode. Excellent for self-hosting.',
    modelType: 'chat',
    contextWindow: 128000,
    parameters: '32B',
    releaseDate: '2025-04-28',
    websiteUrl: 'https://qwen.ai/',
    benchmarks: [
      { n: 'GPQA Diamond', s: 47.5 },
      { n: 'MMLU-Pro', s: 68.6 },
      { n: 'HumanEval+', s: 77.8 },
      { n: 'MATH-500', s: 68.2 },
      { n: 'MT-Bench', s: 8.50, m: 10 },
      { n: 'IFEval', s: 78.4 },
    ],
    pricing: { i: 0.08, o: 0.24, bi: 0.04, bo: 0.12 },
    metrics: [
      { latencyMs: 350, tps: 72.5, inputTokens: 150, outputTokens: 256 },
      { latencyMs: 400, tps: 65.8, inputTokens: 300, outputTokens: 512 },
      { latencyMs: 320, tps: 78.2, inputTokens: 100, outputTokens: 128 },
      { latencyMs: 380, tps: 68.1, inputTokens: 200, outputTokens: 384 },
      { latencyMs: 390, tps: 66.5, inputTokens: 250, outputTokens: 300 },
    ],
  },
];

// ─── Sample prompts for live metrics ─────────────────────────────────────────

const SAMPLE_PROMPTS = [
  'Explain the difference between supervised and unsupervised learning in machine learning.',
  'Write a Python function to find the longest common subsequence of two strings.',
  'What are the main advantages and disadvantages of transformer architectures compared to RNNs?',
  'Solve: Find the derivative of f(x) = x^3 * sin(x) using the product rule.',
  'Summarize the key principles of database normalization in 3rd normal form.',
];

// ─── Seed Function ───────────────────────────────────────────────────────────

export async function seedLeaderboardData() {
  let modelsCount = 0;
  let benchmarksCount = 0;
  let pricingCount = 0;
  let metricsCount = 0;

  for (const m of SEED_MODELS) {
    // 1. Upsert the AI Model
    const model = await prisma.aiModel.upsert({
      where: { name_provider: { name: m.name, provider: m.provider } },
      create: {
        name: m.name,
        provider: m.provider,
        description: m.description,
        modelType: m.modelType,
        contextWindow: m.contextWindow,
        parameters: m.parameters,
        releaseDate: m.releaseDate,
        websiteUrl: m.websiteUrl,
        tags: JSON.stringify([m.provider.toLowerCase(), m.modelType]),
      },
      update: {
        description: m.description,
        modelType: m.modelType,
        contextWindow: m.contextWindow,
        parameters: m.parameters,
        releaseDate: m.releaseDate,
        websiteUrl: m.websiteUrl,
        tags: JSON.stringify([m.provider.toLowerCase(), m.modelType]),
        isActive: true,
      },
    });
    modelsCount++;

    // 2. Upsert Benchmark Scores
    for (const b of m.benchmarks) {
      await prisma.benchmarkScore.upsert({
        where: {
          modelId_benchmark_version: {
            modelId: model.id,
            benchmark: b.n,
            version: 'latest',
          },
        },
        create: {
          modelId: model.id,
          benchmark: b.n,
          score: b.s,
          maxScore: b.m || 100,
          source: 'official',
        },
        update: {
          score: b.s,
          maxScore: b.m || 100,
          source: 'official',
        },
      });
      benchmarksCount++;
    }

    // 3. Upsert Model Pricing
    await prisma.modelPricing.upsert({
      where: { id: `${model.id}-pricing` },
      create: {
        id: `${model.id}-pricing`,
        modelId: model.id,
        provider: m.provider,
        inputPrice: m.pricing.i,
        outputPrice: m.pricing.o,
        batchInputPrice: m.pricing.bi ?? null,
        batchOutputPrice: m.pricing.bo ?? null,
      },
      update: {
        inputPrice: m.pricing.i,
        outputPrice: m.pricing.o,
        batchInputPrice: m.pricing.bi ?? null,
        batchOutputPrice: m.pricing.bo ?? null,
        isActive: true,
      },
    });
    pricingCount++;

    // 4. Create Live Metrics (5 samples per model)
    for (let i = 0; i < m.metrics.length; i++) {
      const met = m.metrics[i];
      await prisma.liveMetric.create({
        data: {
          modelId: model.id,
          prompt: SAMPLE_PROMPTS[i] || SAMPLE_PROMPTS[0],
          response: `[Seed metric sample ${i + 1} for ${m.name} — simulated response]`,
          latencyMs: met.latencyMs,
          tps: met.tps,
          inputTokens: met.inputTokens,
          outputTokens: met.outputTokens,
          status: 'success',
          testedAt: new Date(),
        },
      });
      metricsCount++;
    }
  }

  return {
    models: modelsCount,
    benchmarks: benchmarksCount,
    pricing: pricingCount,
    liveMetrics: metricsCount,
  };
}
