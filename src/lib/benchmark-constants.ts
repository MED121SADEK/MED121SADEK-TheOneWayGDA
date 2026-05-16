export const BENCHMARK_CATEGORIES = ['overall', 'reasoning', 'coding', 'math', 'knowledge', 'language'] as const
export type BenchmarkCategory = typeof BENCHMARK_CATEGORIES[number]

export const BENCHMARKS: Record<string, { name: string; category: string; maxScore: number; description: string }> = {
  'GPQA Diamond': { name: 'GPQA Diamond', category: 'reasoning', maxScore: 100, description: 'Google-Proof Q&A Diamond — graduate-level STEM reasoning' },
  'MMLU-Pro': { name: 'MMLU-Pro', category: 'knowledge', maxScore: 100, description: 'Massive Multitask Language Understanding Pro — harder expert-level questions' },
  'HumanEval+': { name: 'HumanEval+', category: 'coding', maxScore: 100, description: 'Extended HumanEval — rigorous Python code generation with extra test cases' },
  'MATH-500': { name: 'MATH-500', category: 'math', maxScore: 100, description: 'MATH-500 subset — competition mathematics from MATH benchmark' },
  'MT-Bench': { name: 'MT-Bench', category: 'language', maxScore: 10, description: 'Multi-turn conversation benchmark — LLM-as-judge scoring' },
  'IFEval': { name: 'IFEval', category: 'language', maxScore: 100, description: 'Instruction Following Evaluation — format and constraint adherence' },
}

export const PROVIDERS = [
  'OpenAI', 'Anthropic', 'Google', 'Meta', 'DeepSeek', 'Mistral', 'Qwen',
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
