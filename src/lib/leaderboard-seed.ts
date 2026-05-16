import { db as prisma } from './db';

const SEED_MODELS = [
  { name:'GPT-4o', provider:'OpenAI', description:'Multimodal flagship with vision, audio, and text. Best-in-class reasoning.', modelType:'multimodal', contextWindow:128000, parameters:'~1.8T MoE', releaseDate:'2024-05-13', websiteUrl:'https://openai.com/gpt-4o',
    benchmarks:[{n:'GPQA',s:53.6},{n:'MMLU',s:88.7},{n:'HumanEval',s:90.2},{n:'GSM8K',s:95.8},{n:'ARC-Challenge',s:96.7},{n:'HellaSwag',s:95.3},{n:'TruthfulQA',s:64.8},{n:'MT-Bench',s:9.3,m:10},{n:'MATH',s:76.6}],
    pricing:{i:2.50,o:10.00,bi:1.25,bo:5.00}},
  { name:'GPT-4o-mini', provider:'OpenAI', description:'Cost-efficient small model for high-volume applications.', modelType:'chat', contextWindow:128000, parameters:'~8B', releaseDate:'2024-07-18', websiteUrl:'https://openai.com/gpt-4o-mini',
    benchmarks:[{n:'GPQA',s:40.2},{n:'MMLU',s:82.0},{n:'HumanEval',s:87.2},{n:'GSM8K',s:93.2},{n:'ARC-Challenge',s:92.5},{n:'HellaSwag',s:89.4},{n:'TruthfulQA',s:60.1},{n:'MT-Bench',s:8.6,m:10},{n:'MATH',s:68.1}],
    pricing:{i:0.15,o:0.60,bi:0.075,bo:0.30}},
  { name:'Claude 4 Sonnet', provider:'Anthropic', description:'Latest Sonnet with exceptional reasoning and coding.', modelType:'chat', contextWindow:200000, parameters:'~200B', releaseDate:'2025-05-22', websiteUrl:'https://www.anthropic.com/claude',
    benchmarks:[{n:'GPQA',s:65.0},{n:'MMLU',s:92.3},{n:'HumanEval',s:92.7},{n:'GSM8K',s:96.4},{n:'ARC-Challenge',s:97.1},{n:'HellaSwag',s:95.8},{n:'TruthfulQA',s:71.2},{n:'MT-Bench',s:9.5,m:10},{n:'SWE-bench',s:72.7},{n:'MATH',s:83.9}],
    pricing:{i:3.00,o:15.00,bi:1.50,bo:7.50}},
  { name:'Claude 3.5 Haiku', provider:'Anthropic', description:'Fast and affordable without sacrificing quality.', modelType:'chat', contextWindow:200000, parameters:'~20B', releaseDate:'2024-11-04', websiteUrl:'https://www.anthropic.com/claude',
    benchmarks:[{n:'GPQA',s:43.1},{n:'MMLU',s:84.3},{n:'HumanEval',s:88.5},{n:'GSM8K',s:91.7},{n:'ARC-Challenge',s:93.2},{n:'HellaSwag',s:88.9},{n:'TruthfulQA',s:62.4},{n:'MT-Bench',s:8.4,m:10},{n:'MATH',s:65.8}],
    pricing:{i:0.80,o:4.00,bi:0.40,bo:2.00}},
  { name:'Gemini 2.5 Pro', provider:'Google', description:'Most capable model with 1M context and native multimodal.', modelType:'multimodal', contextWindow:1000000, parameters:'~1.5T MoE', releaseDate:'2025-03-25', websiteUrl:'https://deepmind.google/technologies/gemini/',
    benchmarks:[{n:'GPQA',s:71.4},{n:'MMLU',s:91.5},{n:'HumanEval',s:89.3},{n:'GSM8K',s:96.1},{n:'ARC-Challenge',s:96.9},{n:'HellaSwag',s:95.1},{n:'TruthfulQA',s:68.9},{n:'MT-Bench',s:9.2,m:10},{n:'MATH',s:85.3}],
    pricing:{i:1.25,o:10.00,bi:0.625,bo:5.00}},
  { name:'Gemini 2.0 Flash', provider:'Google', description:'Fast, efficient model for high-throughput tasks.', modelType:'chat', contextWindow:1000000, parameters:'~400B MoE', releaseDate:'2025-02-05', websiteUrl:'https://deepmind.google/technologies/gemini/',
    benchmarks:[{n:'GPQA',s:52.3},{n:'MMLU',s:85.8},{n:'HumanEval',s:86.4},{n:'GSM8K',s:92.8},{n:'ARC-Challenge',s:94.6},{n:'HellaSwag',s:92.3},{n:'TruthfulQA',s:63.5},{n:'MT-Bench',s:8.7,m:10},{n:'MATH',s:72.4}],
    pricing:{i:0.10,o:0.40,bi:0.05,bo:0.20}},
  { name:'Llama 4 Maverick', provider:'Meta', description:'Open-weight MoE with 128 experts. Strong multilingual and coding.', modelType:'chat', contextWindow:1000000, parameters:'400B MoE (17B active)', releaseDate:'2025-04-05', websiteUrl:'https://llama.meta.com/',
    benchmarks:[{n:'GPQA',s:55.8},{n:'MMLU',s:88.1},{n:'HumanEval',s:82.7},{n:'GSM8K',s:90.5},{n:'ARC-Challenge',s:95.2},{n:'HellaSwag',s:90.1},{n:'TruthfulQA',s:60.3},{n:'MT-Bench',s:8.8,m:10},{n:'MATH',s:73.6}],
    pricing:{i:0.20,o:0.80,bi:0.10,bo:0.40}},
  { name:'DeepSeek R1', provider:'DeepSeek', description:'Reasoning-optimized with chain-of-thought. Exceptional math and logic.', modelType:'chat', contextWindow:64000, parameters:'671B MoE (37B active)', releaseDate:'2025-01-20', websiteUrl:'https://www.deepseek.com/',
    benchmarks:[{n:'GPQA',s:71.5},{n:'MMLU',s:90.8},{n:'HumanEval',s:84.1},{n:'GSM8K',s:97.3},{n:'ARC-Challenge',s:96.4},{n:'HellaSwag',s:93.7},{n:'TruthfulQA',s:62.1},{n:'MT-Bench',s:9.0,m:10},{n:'MATH',s:90.2}],
    pricing:{i:0.55,o:2.19,bi:0.14,bo:0.55}},
  { name:'DeepSeek V3', provider:'DeepSeek', description:'General-purpose MoE with strong coding and multilingual.', modelType:'chat', contextWindow:128000, parameters:'671B MoE (37B active)', releaseDate:'2024-12-26', websiteUrl:'https://www.deepseek.com/',
    benchmarks:[{n:'GPQA',s:59.1},{n:'MMLU',s:87.1},{n:'HumanEval',s:85.9},{n:'GSM8K',s:94.9},{n:'ARC-Challenge',s:95.7},{n:'HellaSwag',s:93.1},{n:'TruthfulQA',s:61.8},{n:'MT-Bench',s:8.9,m:10},{n:'MATH',s:82.6}],
    pricing:{i:0.27,o:1.10,bi:0.07,bo:0.28}},
  { name:'Qwen3 235B', provider:'Alibaba', description:'Open-weight with strong multilingual and hybrid thinking mode.', modelType:'chat', contextWindow:128000, parameters:'235B MoE', releaseDate:'2025-04-28', websiteUrl:'https://qwen.ai/',
    benchmarks:[{n:'GPQA',s:61.2},{n:'MMLU',s:87.6},{n:'HumanEval',s:83.4},{n:'GSM8K',s:93.7},{n:'ARC-Challenge',s:95.0},{n:'HellaSwag',s:91.5},{n:'TruthfulQA',s:63.2},{n:'MT-Bench',s:8.9,m:10},{n:'MATH',s:78.9}],
    pricing:{i:0.40,o:1.20,bi:0.20,bo:0.60}},
  { name:'Mistral Large 2', provider:'Mistral AI', description:'European flagship with strong reasoning and multilingual.', modelType:'chat', contextWindow:128000, parameters:'~123B', releaseDate:'2024-07-24', websiteUrl:'https://mistral.ai/',
    benchmarks:[{n:'GPQA',s:50.4},{n:'MMLU',s:84.0},{n:'HumanEval',s:85.0},{n:'GSM8K',s:91.2},{n:'ARC-Challenge',s:94.8},{n:'HellaSwag',s:91.3},{n:'TruthfulQA',s:59.7},{n:'MT-Bench',s:8.6,m:10},{n:'MATH',s:69.5}],
    pricing:{i:2.00,o:6.00,bi:1.00,bo:3.00}},
  { name:'Codestral 25.01', provider:'Mistral AI', description:'Specialized coding model with 256K context.', modelType:'code', contextWindow:256000, parameters:'~22B', releaseDate:'2025-01-15', websiteUrl:'https://mistral.ai/',
    benchmarks:[{n:'HumanEval',s:92.0},{n:'SWE-bench',s:55.4},{n:'MMLU',s:78.5},{n:'MT-Bench',s:8.2,m:10},{n:'GPQA',s:38.7},{n:'GSM8K',s:85.6},{n:'ARC-Challenge',s:90.1},{n:'HellaSwag',s:85.4},{n:'TruthfulQA',s:55.3},{n:'MATH',s:60.2}],
    pricing:{i:0.30,o:0.90}},
  { name:'Command R+', provider:'Cohere', description:'Enterprise-focused for RAG, tool use, and multilingual.', modelType:'chat', contextWindow:128000, parameters:'~104B', releaseDate:'2024-04-04', websiteUrl:'https://cohere.com/command-r-plus',
    benchmarks:[{n:'MMLU',s:78.4},{n:'HumanEval',s:75.3},{n:'GSM8K',s:83.2},{n:'ARC-Challenge',s:89.6},{n:'HellaSwag',s:87.1},{n:'TruthfulQA',s:56.8},{n:'MT-Bench',s:7.8,m:10},{n:'GPQA',s:35.4},{n:'MATH',s:52.1}],
    pricing:{i:2.50,o:10.00,bi:1.25,bo:5.00}},
  { name:'GLM-4', provider:'Zhipu AI', description:'Chinese flagship with strong bilingual and tool use.', modelType:'chat', contextWindow:128000, parameters:'~130B', releaseDate:'2024-01-16', websiteUrl:'https://www.zhipuai.cn/',
    benchmarks:[{n:'MMLU',s:81.5},{n:'HumanEval',s:79.4},{n:'GSM8K',s:88.9},{n:'ARC-Challenge',s:92.1},{n:'HellaSwag',s:89.7},{n:'TruthfulQA',s:58.2},{n:'MT-Bench',s:8.3,m:10},{n:'GPQA',s:42.6},{n:'MATH',s:66.3}],
    pricing:{i:0.14,o:0.14,bi:0.07,bo:0.07}},
  { name:'Phi-4', provider:'Microsoft', description:'Small but mighty. Exceptional reasoning per parameter.', modelType:'chat', contextWindow:16000, parameters:'14B', releaseDate:'2024-12-17', websiteUrl:'https://www.microsoft.com/en-us/research/blog/phi-4/',
    benchmarks:[{n:'GPQA',s:46.8},{n:'MMLU',s:84.8},{n:'HumanEval',s:82.6},{n:'GSM8K',s:95.1},{n:'ARC-Challenge',s:93.8},{n:'HellaSwag',s:88.2},{n:'TruthfulQA',s:61.5},{n:'MT-Bench',s:8.1,m:10},{n:'MATH',s:77.0}],
    pricing:{i:0.075,o:0.30}},
  { name:'Yi-Lightning', provider:'01.AI', description:'High-speed inference model for real-time applications.', modelType:'chat', contextWindow:16000, parameters:'~34B', releaseDate:'2024-10-15', websiteUrl:'https://www.01.ai/',
    benchmarks:[{n:'MMLU',s:79.2},{n:'HumanEval',s:77.8},{n:'GSM8K',s:86.3},{n:'ARC-Challenge',s:90.5},{n:'HellaSwag',s:86.9},{n:'TruthfulQA',s:55.4},{n:'MT-Bench',s:7.9,m:10},{n:'GPQA',s:37.1},{n:'MATH',s:58.7}],
    pricing:{i:0.14,o:0.14,bi:0.07,bo:0.07}},
];

export async function seedLeaderboardData() {
  let modelsCount = 0, benchmarksCount = 0, pricingCount = 0;

  for (const m of SEED_MODELS) {
    const model = await prisma.aiModel.upsert({
      where: { name_provider: { name: m.name, provider: m.provider } },
      create: { name: m.name, provider: m.provider, description: m.description, modelType: m.modelType, contextWindow: m.contextWindow, parameters: m.parameters, releaseDate: m.releaseDate, websiteUrl: m.websiteUrl, tags: JSON.stringify([m.provider.toLowerCase(), m.modelType]) },
      update: { description: m.description, modelType: m.modelType, contextWindow: m.contextWindow, parameters: m.parameters, releaseDate: m.releaseDate, websiteUrl: m.websiteUrl, tags: JSON.stringify([m.provider.toLowerCase(), m.modelType]) },
    });
    modelsCount++;

    for (const b of m.benchmarks) {
      await prisma.benchmarkScore.upsert({
        where: { modelId_benchmark_version: { modelId: model.id, benchmark: b.n, version: 'latest' } },
        create: { modelId: model.id, benchmark: b.n, score: b.s, maxScore: b.m || 100, source: 'verified' },
        update: { score: b.s, maxScore: b.m || 100 },
      });
      benchmarksCount++;
    }

    await prisma.modelPricing.upsert({
      where: { id: `${model.id}-pricing` },
      create: { id: `${model.id}-pricing`, modelId: model.id, provider: m.provider, inputPrice: m.pricing.i, outputPrice: m.pricing.o, batchInputPrice: m.pricing.bi, batchOutputPrice: m.pricing.bo },
      update: { inputPrice: m.pricing.i, outputPrice: m.pricing.o, batchInputPrice: m.pricing.bi, batchOutputPrice: m.pricing.bo },
    });
    pricingCount++;
  }

  return { models: modelsCount, benchmarks: benchmarksCount, pricing: pricingCount };
}
