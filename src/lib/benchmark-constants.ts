export const BENCHMARK_CATEGORIES = ['overall', 'reasoning', 'coding', 'math', 'knowledge', 'language'] as const
export type BenchmarkCategory = typeof BENCHMARK_CATEGORIES[number]

export const BENCHMARKS: Record<string, { name: string; category: string; maxScore: number; description: string }> = {
  GPQA: { name: 'GPQA', category: 'reasoning', maxScore: 100, description: 'Google-Proof Q&A — graduate-level reasoning' },
  MMLU: { name: 'MMLU', category: 'knowledge', maxScore: 100, description: 'Massive Multitask Language Understanding' },
  HumanEval: { name: 'HumanEval', category: 'coding', maxScore: 100, description: 'Python code generation benchmark' },
  MATH: { name: 'MATH', category: 'math', maxScore: 100, description: 'Competition mathematics problems' },
  GSM8K: { name: 'GSM8K', category: 'math', maxScore: 100, description: 'Grade school math word problems' },
  ARC: { name: 'ARC', category: 'reasoning', maxScore: 100, description: 'AI2 Reasoning Challenge' },
  HellaSwag: { name: 'HellaSwag', category: 'language', maxScore: 100, description: 'Common-sense natural language inference' },
  TruthfulQA: { name: 'TruthfulQA', category: 'knowledge', maxScore: 100, description: 'Truthfulness in question answering' },
}

export const PROVIDERS = [
  'OpenAI', 'Anthropic', 'Google', 'Meta', 'DeepSeek', 'Mistral AI',
  'Alibaba', 'Cohere', 'Zhipu AI', 'Microsoft', '01.AI', 'xAI',
] as const

export const SORT_OPTIONS = [
  { value: 'score', label: 'Score' },
  { value: 'latency', label: 'Latency' },
  { value: 'price', label: 'Price' },
  { value: 'name', label: 'Name' },
] as const

export const VISITOR_TYPES = [
  { value: 'researcher', icon: '🔬' },
  { value: 'student', icon: '🎓' },
  { value: 'professional', icon: '💼' },
  { value: 'enterprise', icon: '🏢' },
  { value: 'developer', icon: '💻' },
  { value: 'educator', icon: '📚' },
  { value: 'general', icon: '🌐' },
] as const
