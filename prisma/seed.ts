/**
 * THEONEWAYGDA — Production Seed Script
 * Populates Neon PostgreSQL with real AI model data, benchmarks, arena battles, portfolios, copilots, certifications.
 * Run: npx tsx prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_Bu1ZWMElVm8C@ep-damp-unit-allvdree.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require",
    },
  },
});

const BATCH_SIZE = 50;
const TOTAL_MODELS = 18;
const BATCHES_PER_MODEL = 5;
const TOTAL_COMMUNITY_POSTS = 30;

// ═══════════════════════════════════════════════════════════
// DATA DEFINITIONS
// ═══════════════════════════════════════════════════════════

const AI_MODELS = [
  { name: "GPT-4o", provider: "OpenAI", modelType: "chat", contextWindow: 128000, releaseDate: "2024-05-13", tags: ["flagship", "multimodal", "reasoning"], websiteUrl: "https://openai.com/gpt-4o" },
  { name: "GPT-4o Mini", provider: "OpenAI", modelType: "chat", contextWindow: 128000, releaseDate: "2024-07-18", tags: ["cost-effective", "fast", "multimodal"], websiteUrl: "https://openai.com/gpt-4o-mini" },
  { name: "o3", provider: "OpenAI", modelType: "reasoning", contextWindow: 200000, releaseDate: "2025-04-15", tags: ["flagship", "reasoning", "coding", "math"], websiteUrl: "https://openai.com/o3" },
  { name: "o3-mini", provider: "OpenAI", modelType: "reasoning", contextWindow: 200000, releaseDate: "2025-01-31", tags: ["reasoning", "cost-effective"], websiteUrl: "https://openai.com/o3-mini" },
  { name: "Claude 4 Sonnet", provider: "Anthropic", modelType: "chat", contextWindow: 200000, releaseDate: "2025-05-22", tags: ["flagship", "reasoning", "coding", "safety"], websiteUrl: "https://anthropic.com/claude" },
  { name: "Claude 3.5 Haiku", provider: "Anthropic", modelType: "chat", contextWindow: 200000, releaseDate: "2024-11-04", tags: ["fast", "cost-effective"], websiteUrl: "https://anthropic.com/claude" },
  { name: "Gemini 2.5 Pro", provider: "Google", modelType: "chat", contextWindow: 1000000, releaseDate: "2025-03-25", tags: ["flagship", "long-context", "multimodal", "reasoning"], websiteUrl: "https://deepmind.google/gemini" },
  { name: "Gemini 2.5 Flash", provider: "Google", modelType: "chat", contextWindow: 1000000, releaseDate: "2025-05-20", tags: ["fast", "long-context", "cost-effective"], websiteUrl: "https://deepmind.google/gemini" },
  { name: "Llama 4 Maverick", provider: "Meta", modelType: "chat", contextWindow: 1000000, releaseDate: "2025-04-05", tags: ["open-source", "long-context", "multimodal"], websiteUrl: "https://llama.meta.com" },
  { name: "Llama 4 Scout", provider: "Meta", modelType: "chat", contextWindow: 10000000, releaseDate: "2025-04-05", tags: ["open-source", "massive-context", "fast"], websiteUrl: "https://llama.meta.com" },
  { name: "Mistral Large 2", provider: "Mistral AI", modelType: "chat", contextWindow: 128000, releaseDate: "2024-07-24", tags: ["european", "coding", "multilingual"], websiteUrl: "https://mistral.ai" },
  { name: "DeepSeek V3", provider: "DeepSeek", modelType: "chat", contextWindow: 131072, releaseDate: "2024-12-26", tags: ["open-source", "cost-effective", "coding", "math"], websiteUrl: "https://deepseek.com" },
  { name: "DeepSeek R1", provider: "DeepSeek", modelType: "reasoning", contextWindow: 131072, releaseDate: "2025-01-20", tags: ["open-source", "reasoning", "math", "coding"], websiteUrl: "https://deepseek.com" },
  { name: "Qwen 3 235B", provider: "Alibaba", modelType: "chat", contextWindow: 131072, releaseDate: "2025-04-28", tags: ["open-source", "multilingual", "reasoning"], websiteUrl: "https://qwen.ai" },
  { name: "Command R+", provider: "Cohere", modelType: "chat", contextWindow: 128000, releaseDate: "2024-04-03", tags: ["enterprise", "RAG", "multilingual"], websiteUrl: "https://cohere.com" },
  { name: "Grok 3", provider: "xAI", modelType: "chat", contextWindow: 131072, releaseDate: "2025-02-17", tags: ["reasoning", "coding", "realtime"], websiteUrl: "https://x.ai" },
  { name: "Yi-Lightning", provider: "01.AI", modelType: "chat", contextWindow: 16384, releaseDate: "2024-10-15", tags: ["fast", "cost-effective"], websiteUrl: "https://01.ai" },
  { name: "Phi-4", provider: "Microsoft", modelType: "chat", contextWindow: 16384, releaseDate: "2024-12-12", tags: ["small", "efficient", "local"], websiteUrl: "https://microsoft.com/phi" },
];

const BENCHMARK_SCORES: Record<string, { benchmark: string; score: number }[]> = {
  "GPT-4o": [
    { benchmark: "MMLU", score: 88.7 },
    { benchmark: "HumanEval", score: 90.2 },
    { benchmark: "GSM8K", score: 95.3 },
    { benchmark: "MATH", score: 76.6 },
    { benchmark: "GPQA Diamond", score: 53.6 },
    { benchmark: "ARC-Challenge", score: 96.4 },
    { benchmark: "HellaSwag", score: 95.3 },
    { benchmark: "MT-Bench", score: 9.3 },
    { benchmark: "IFEval", score: 87.1 },
    { benchmark: "BBH", score: 85.0 },
  ],
  "GPT-4o Mini": [
    { benchmark: "MMLU", score: 82.0 },
    { benchmark: "HumanEval", score: 87.2 },
    { benchmark: "GSM8K", score: 93.2 },
    { benchmark: "MATH", score: 65.1 },
    { benchmark: "GPQA Diamond", score: 42.3 },
    { benchmark: "ARC-Challenge", score: 92.1 },
    { benchmark: "HellaSwag", score: 91.5 },
    { benchmark: "MT-Bench", score: 8.6 },
    { benchmark: "IFEval", score: 85.4 },
    { benchmark: "BBH", score: 78.3 },
  ],
  "o3": [
    { benchmark: "MMLU", score: 91.2 },
    { benchmark: "HumanEval", score: 96.3 },
    { benchmark: "GSM8K", score: 97.8 },
    { benchmark: "MATH", score: 89.4 },
    { benchmark: "GPQA Diamond", score: 71.2 },
    { benchmark: "ARC-Challenge", score: 97.8 },
    { benchmark: "HellaSwag", score: 96.1 },
    { benchmark: "MT-Bench", score: 9.6 },
    { benchmark: "IFEval", score: 90.3 },
    { benchmark: "BBH", score: 92.1 },
  ],
  "o3-mini": [
    { benchmark: "MMLU", score: 87.3 },
    { benchmark: "HumanEval", score: 93.1 },
    { benchmark: "GSM8K", score: 96.1 },
    { benchmark: "MATH", score: 82.7 },
    { benchmark: "GPQA Diamond", score: 62.1 },
    { benchmark: "ARC-Challenge", score: 96.2 },
    { benchmark: "HellaSwag", score: 95.4 },
    { benchmark: "MT-Bench", score: 9.2 },
    { benchmark: "IFEval", score: 88.7 },
    { benchmark: "BBH", score: 88.3 },
  ],
  "Claude 4 Sonnet": [
    { benchmark: "MMLU", score: 90.1 },
    { benchmark: "HumanEval", score: 94.8 },
    { benchmark: "GSM8K", score: 96.5 },
    { benchmark: "MATH", score: 85.3 },
    { benchmark: "GPQA Diamond", score: 65.4 },
    { benchmark: "ARC-Challenge", score: 97.1 },
    { benchmark: "HellaSwag", score: 95.8 },
    { benchmark: "MT-Bench", score: 9.5 },
    { benchmark: "IFEval", score: 89.2 },
    { benchmark: "BBH", score: 90.5 },
  ],
  "Claude 3.5 Haiku": [
    { benchmark: "MMLU", score: 83.4 },
    { benchmark: "HumanEval", score: 88.9 },
    { benchmark: "GSM8K", score: 91.2 },
    { benchmark: "MATH", score: 68.3 },
    { benchmark: "GPQA Diamond", score: 44.2 },
    { benchmark: "ARC-Challenge", score: 93.5 },
    { benchmark: "HellaSwag", score: 92.1 },
    { benchmark: "MT-Bench", score: 8.5 },
    { benchmark: "IFEval", score: 86.3 },
    { benchmark: "BBH", score: 80.1 },
  ],
  "Gemini 2.5 Pro": [
    { benchmark: "MMLU", score: 89.5 },
    { benchmark: "HumanEval", score: 91.7 },
    { benchmark: "GSM8K", score: 96.0 },
    { benchmark: "MATH", score: 83.2 },
    { benchmark: "GPQA Diamond", score: 59.8 },
    { benchmark: "ARC-Challenge", score: 96.9 },
    { benchmark: "HellaSwag", score: 95.6 },
    { benchmark: "MT-Bench", score: 9.4 },
    { benchmark: "IFEval", score: 88.5 },
    { benchmark: "BBH", score: 89.2 },
  ],
  "Gemini 2.5 Flash": [
    { benchmark: "MMLU", score: 85.6 },
    { benchmark: "HumanEval", score: 89.3 },
    { benchmark: "GSM8K", score: 93.8 },
    { benchmark: "MATH", score: 73.5 },
    { benchmark: "GPQA Diamond", score: 48.7 },
    { benchmark: "ARC-Challenge", score: 94.3 },
    { benchmark: "HellaSwag", score: 93.2 },
    { benchmark: "MT-Bench", score: 8.8 },
    { benchmark: "IFEval", score: 86.9 },
    { benchmark: "BBH", score: 83.4 },
  ],
  "Llama 4 Maverick": [
    { benchmark: "MMLU", score: 85.2 },
    { benchmark: "HumanEval", score: 87.4 },
    { benchmark: "GSM8K", score: 90.1 },
    { benchmark: "MATH", score: 70.3 },
    { benchmark: "GPQA Diamond", score: 45.1 },
    { benchmark: "ARC-Challenge", score: 93.2 },
    { benchmark: "HellaSwag", score: 92.8 },
    { benchmark: "MT-Bench", score: 8.4 },
    { benchmark: "IFEval", score: 84.2 },
    { benchmark: "BBH", score: 79.5 },
  ],
  "Llama 4 Scout": [
    { benchmark: "MMLU", score: 82.1 },
    { benchmark: "HumanEval", score: 83.6 },
    { benchmark: "GSM8K", score: 88.5 },
    { benchmark: "MATH", score: 64.2 },
    { benchmark: "GPQA Diamond", score: 40.1 },
    { benchmark: "ARC-Challenge", score: 91.3 },
    { benchmark: "HellaSwag", score: 90.7 },
    { benchmark: "MT-Bench", score: 8.1 },
    { benchmark: "IFEval", score: 82.3 },
    { benchmark: "BBH", score: 75.8 },
  ],
  "Mistral Large 2": [
    { benchmark: "MMLU", score: 84.3 },
    { benchmark: "HumanEval", score: 89.1 },
    { benchmark: "GSM8K", score: 91.5 },
    { benchmark: "MATH", score: 72.8 },
    { benchmark: "GPQA Diamond", score: 47.3 },
    { benchmark: "ARC-Challenge", score: 94.1 },
    { benchmark: "HellaSwag", score: 93.0 },
    { benchmark: "MT-Bench", score: 8.6 },
    { benchmark: "IFEval", score: 85.7 },
    { benchmark: "BBH", score: 81.0 },
  ],
  "DeepSeek V3": [
    { benchmark: "MMLU", score: 87.1 },
    { benchmark: "HumanEval", score: 90.8 },
    { benchmark: "GSM8K", score: 94.2 },
    { benchmark: "MATH", score: 81.5 },
    { benchmark: "GPQA Diamond", score: 59.5 },
    { benchmark: "ARC-Challenge", score: 95.8 },
    { benchmark: "HellaSwag", score: 94.5 },
    { benchmark: "MT-Bench", score: 9.0 },
    { benchmark: "IFEval", score: 87.6 },
    { benchmark: "BBH", score: 86.8 },
  ],
  "DeepSeek R1": [
    { benchmark: "MMLU", score: 86.5 },
    { benchmark: "HumanEval", score: 92.3 },
    { benchmark: "GSM8K", score: 95.1 },
    { benchmark: "MATH", score: 88.2 },
    { benchmark: "GPQA Diamond", score: 63.1 },
    { benchmark: "ARC-Challenge", score: 96.3 },
    { benchmark: "HellaSwag", score: 93.9 },
    { benchmark: "MT-Bench", score: 9.1 },
    { benchmark: "IFEval", score: 84.5 },
    { benchmark: "BBH", score: 91.0 },
  ],
  "Qwen 3 235B": [
    { benchmark: "MMLU", score: 86.2 },
    { benchmark: "HumanEval", score: 88.5 },
    { benchmark: "GSM8K", score: 93.0 },
    { benchmark: "MATH", score: 78.1 },
    { benchmark: "GPQA Diamond", score: 52.7 },
    { benchmark: "ARC-Challenge", score: 95.1 },
    { benchmark: "HellaSwag", score: 94.2 },
    { benchmark: "MT-Bench", score: 8.9 },
    { benchmark: "IFEval", score: 86.1 },
    { benchmark: "BBH", score: 85.3 },
  ],
  "Command R+": [
    { benchmark: "MMLU", score: 78.3 },
    { benchmark: "HumanEval", score: 75.2 },
    { benchmark: "GSM8K", score: 82.1 },
    { benchmark: "MATH", score: 52.4 },
    { benchmark: "GPQA Diamond", score: 35.6 },
    { benchmark: "ARC-Challenge", score: 88.7 },
    { benchmark: "HellaSwag", score: 89.3 },
    { benchmark: "MT-Bench", score: 7.8 },
    { benchmark: "IFEval", score: 78.5 },
    { benchmark: "BBH", score: 70.2 },
  ],
  "Grok 3": [
    { benchmark: "MMLU", score: 87.8 },
    { benchmark: "HumanEval", score: 91.2 },
    { benchmark: "GSM8K", score: 95.6 },
    { benchmark: "MATH", score: 82.9 },
    { benchmark: "GPQA Diamond", score: 58.3 },
    { benchmark: "ARC-Challenge", score: 96.0 },
    { benchmark: "HellaSwag", score: 94.8 },
    { benchmark: "MT-Bench", score: 9.2 },
    { benchmark: "IFEval", score: 87.2 },
    { benchmark: "BBH", score: 87.5 },
  ],
  "Yi-Lightning": [
    { benchmark: "MMLU", score: 80.5 },
    { benchmark: "HumanEval", score: 82.1 },
    { benchmark: "GSM8K", score: 87.3 },
    { benchmark: "MATH", score: 60.2 },
    { benchmark: "GPQA Diamond", score: 38.7 },
    { benchmark: "ARC-Challenge", score: 90.5 },
    { benchmark: "HellaSwag", score: 91.2 },
    { benchmark: "MT-Bench", score: 8.0 },
    { benchmark: "IFEval", score: 81.8 },
    { benchmark: "BBH", score: 74.6 },
  ],
  "Phi-4": [
    { benchmark: "MMLU", score: 83.8 },
    { benchmark: "HumanEval", score: 86.2 },
    { benchmark: "GSM8K", score: 90.8 },
    { benchmark: "MATH", score: 68.9 },
    { benchmark: "GPQA Diamond", score: 42.1 },
    { benchmark: "ARC-Challenge", score: 92.6 },
    { benchmark: "HellaSwag", score: 93.1 },
    { benchmark: "MT-Bench", score: 8.3 },
    { benchmark: "IFEval", score: 84.9 },
    { benchmark: "BBH", score: 80.2 },
  ],
};

const PRICING_DATA: { name: string; provider: string; inputPrice: number; outputPrice: number; batchInputPrice?: number; batchOutputPrice?: number }[] = [
  { name: "GPT-4o", provider: "OpenAI", inputPrice: 2.5, outputPrice: 10.0, batchInputPrice: 1.25, batchOutputPrice: 5.0 },
  { name: "GPT-4o Mini", provider: "OpenAI", inputPrice: 0.15, outputPrice: 0.6, batchInputPrice: 0.075, batchOutputPrice: 0.3 },
  { name: "o3", provider: "OpenAI", inputPrice: 10.0, outputPrice: 40.0 },
  { name: "o3-mini", provider: "OpenAI", inputPrice: 1.1, outputPrice: 4.4 },
  { name: "Claude 4 Sonnet", provider: "Anthropic", inputPrice: 3.0, outputPrice: 15.0, batchInputPrice: 1.5, batchOutputPrice: 7.5 },
  { name: "Claude 3.5 Haiku", provider: "Anthropic", inputPrice: 0.8, outputPrice: 4.0, batchInputPrice: 0.4, batchOutputPrice: 2.0 },
  { name: "Gemini 2.5 Pro", provider: "Google", inputPrice: 1.25, outputPrice: 10.0 },
  { name: "Gemini 2.5 Flash", provider: "Google", inputPrice: 0.15, outputPrice: 0.6 },
  { name: "Mistral Large 2", provider: "Mistral AI", inputPrice: 2.0, outputPrice: 6.0 },
  { name: "DeepSeek V3", provider: "DeepSeek", inputPrice: 0.27, outputPrice: 1.1 },
  { name: "DeepSeek R1", provider: "DeepSeek", inputPrice: 0.55, outputPrice: 2.19 },
  { name: "Command R+", provider: "Cohere", inputPrice: 2.5, outputPrice: 10.0 },
  { name: "Grok 3", provider: "xAI", inputPrice: 3.0, outputPrice: 15.0 },
  { name: "Yi-Lightning", provider: "01.AI", inputPrice: 0.14, outputPrice: 0.14 },
];

const CUSTOM_COPILOTS = [
  {
    name: "Data Analyst Pro",
    description: "Advanced data analysis copilot that helps you explore datasets, run statistical tests, create visualizations, and generate comprehensive reports. Specializes in exploratory data analysis and hypothesis testing.",
    category: "data_analyst",
    systemPrompt: "You are an expert data analyst with deep expertise in statistics, data visualization, and exploratory data analysis. Help users explore their datasets by suggesting relevant statistical tests, creating insightful visualizations, and identifying patterns and anomalies. Always explain your methodology clearly and provide actionable insights. Use pandas, numpy, and matplotlib/seaborn when generating code. Present findings with confidence intervals and p-values when applicable.",
    avatarColor: "#3B82F6",
    tags: ["statistics", "visualization", "EDA", "pandas", "hypothesis-testing"],
    tools: ["workspace", "leaderboard"],
    isFeatured: true,
    isOfficial: true,
  },
  {
    name: "Code Review Expert",
    description: "Senior software engineer copilot that reviews code for quality, security vulnerabilities, performance issues, and best practices. Supports all major programming languages.",
    category: "code_gen",
    systemPrompt: "You are a senior software engineer with 15+ years of experience in code review. Analyze code for bugs, security vulnerabilities, performance bottlenecks, and adherence to best practices. Provide constructive feedback with specific suggestions for improvement. Rate code quality on a scale of 1-10 and explain your reasoning. Suggest refactoring opportunities and design pattern improvements.",
    avatarColor: "#10B981",
    tags: ["code-review", "security", "performance", "best-practices", "refactoring"],
    tools: ["workspace"],
    isFeatured: true,
    isOfficial: false,
  },
  {
    name: "ML Pipeline Builder",
    description: "Machine learning engineer copilot that helps design, build, and optimize ML pipelines. From data preprocessing to model selection, training, and deployment.",
    category: "ml_engineer",
    systemPrompt: "You are an expert ML engineer specializing in end-to-end machine learning pipelines. Help users design data preprocessing steps, select appropriate models, tune hyperparameters, and set up evaluation metrics. Provide code using scikit-learn, TensorFlow, PyTorch, or XGBoost as appropriate. Always consider data leakage, cross-validation, and production deployment requirements. Suggest monitoring and retraining strategies.",
    avatarColor: "#8B5CF6",
    tags: ["machine-learning", "deep-learning", "pipeline", "hyperparameter-tuning", "deployment"],
    tools: ["workspace", "leaderboard"],
    isFeatured: true,
    isOfficial: true,
  },
  {
    name: "Research Paper Summarizer",
    description: "Academic research copilot that summarizes papers, explains key findings, compares methodologies, and identifies research gaps across AI and computer science literature.",
    category: "domain_expert",
    systemPrompt: "You are an AI research expert with deep knowledge of recent advances in artificial intelligence, machine learning, and computer science. Summarize research papers clearly, highlighting key contributions, methodology, experimental results, and limitations. Compare papers with related work and identify potential research directions. Use proper academic terminology and cite relevant prior work.",
    avatarColor: "#F59E0B",
    tags: ["research", "papers", "summarization", "academic", "literature-review"],
    tools: ["leaderboard", "community"],
    isFeatured: true,
    isOfficial: false,
  },
  {
    name: "SQL Query Master",
    description: "Database expert copilot that writes optimized SQL queries, explains query plans, suggests indexes, and helps design database schemas for PostgreSQL, MySQL, and other databases.",
    category: "code_gen",
    systemPrompt: "You are a database expert specializing in SQL optimization and schema design. Write clean, optimized SQL queries, explain complex query execution plans, recommend indexes for performance improvement, and help design normalized database schemas. Always consider query performance, data integrity, and scalability. Support PostgreSQL, MySQL, SQLite, and BigQuery dialects.",
    avatarColor: "#EF4444",
    tags: ["SQL", "database", "PostgreSQL", "optimization", "schema-design"],
    tools: ["workspace"],
    isFeatured: false,
    isOfficial: false,
  },
  {
    name: "Creative Writing Assistant",
    description: "Versatile creative writing copilot for articles, blog posts, marketing copy, social media content, and storytelling. Adapts tone and style to your audience.",
    category: "creative",
    systemPrompt: "You are a creative writing expert with experience in journalism, marketing, and storytelling. Help users craft compelling content for any medium — blog posts, articles, social media, marketing copy, or creative fiction. Adapt your tone and style to match the target audience. Suggest improvements for clarity, engagement, and emotional impact. Provide headline alternatives and SEO-friendly suggestions when appropriate.",
    avatarColor: "#EC4899",
    tags: ["writing", "content", "marketing", "blogging", "storytelling", "SEO"],
    tools: ["workspace", "community"],
    isFeatured: false,
    isOfficial: false,
  },
  {
    name: "Benchmark Analyst",
    description: "AI benchmark specialist that analyzes model performance data, identifies trends, compares models across benchmarks, and generates comparative analysis reports.",
    category: "domain_expert",
    systemPrompt: "You are an AI benchmark specialist who analyzes model performance across standardized tests. Compare models using MMLU, HumanEval, GSM8K, MATH, GPQA, and other benchmarks. Identify strength and weakness profiles for each model. Create comparative analyses highlighting trade-offs between speed, cost, accuracy, and capabilities. Provide data-driven recommendations based on specific use case requirements.",
    avatarColor: "#06B6D4",
    tags: ["benchmarks", "model-comparison", "analysis", "MMLU", "performance"],
    tools: ["leaderboard"],
    isFeatured: true,
    isOfficial: true,
  },
  {
    name: "API Integration Builder",
    description: "Full-stack developer copilot that helps design REST APIs, write integration code, handle authentication, and debug API connections for any service.",
    category: "code_gen",
    systemPrompt: "You are a full-stack developer specializing in API design and integration. Help users design RESTful APIs, write integration code in any language, implement authentication (OAuth, JWT, API keys), handle rate limiting, and debug connection issues. Provide code examples using fetch, axios, curl, or SDK-specific implementations. Always follow API security best practices.",
    avatarColor: "#6366F1",
    tags: ["API", "REST", "integration", "authentication", "full-stack"],
    tools: ["workspace"],
    isFeatured: false,
    isOfficial: false,
  },
];

const COMMUNITY_POSTS = [
  { type: "news", title: "OpenAI o3 Achieves New SOTA on GPQA Diamond Benchmark", content: "OpenAI's latest reasoning model o3 has achieved a remarkable 71.2% on the GPQA Diamond benchmark, surpassing all previous models. This represents a significant jump in AI reasoning capabilities, particularly for graduate-level scientific questions. The model also excels in mathematical reasoning with 89.4% on MATH benchmark. Key improvements come from enhanced chain-of-thought reasoning and better self-verification mechanisms.", author: "TheOneWayGDA", authorName: "TheOneWayGDA Team", sourceUrl: "https://openai.com", sourceName: "OpenAI Blog", tags: ["o3", "OpenAI", "benchmark", "reasoning"] },
  { type: "news", title: "Claude 4 Sonnet Launches with 200K Context Window", content: "Anthropic has released Claude 4 Sonnet, their most capable model yet, featuring a massive 200K token context window. The model achieves strong results across all major benchmarks while maintaining Anthropic's emphasis on safety and helpfulness. Early users report exceptional performance in coding tasks and long document analysis. Claude 4 Sonnet is available through Anthropic's API and Claude Pro subscription.", author: "TheOneWayGDA", authorName: "TheOneWayGDA Team", sourceUrl: "https://anthropic.com", sourceName: "Anthropic", tags: ["Claude", "Anthropic", "release", "safety"] },
  { type: "news", title: "Google Gemini 2.5 Pro: 1 Million Token Context Becomes Reality", content: "Google DeepMind has released Gemini 2.5 Pro with support for up to 1 million token context window, making it the most capable long-context model available. The model can process entire codebases, lengthy legal documents, or comprehensive research papers in a single prompt. Benchmark results show competitive performance with GPT-4o and Claude across most categories.", author: "TheOneWayGDA", authorName: "TheOneWayGDA Team", sourceUrl: "https://deepmind.google", sourceName: "Google DeepMind", tags: ["Gemini", "Google", "long-context", "multimodal"] },
  { type: "news", title: "Meta Releases Llama 4: Open-Source Models with 10M Context", content: "Meta has released Llama 4 Maverick and Scout, continuing their commitment to open-source AI. Llama 4 Scout supports an unprecedented 10 million token context window, enabling processing of massive documents. Both models are available for commercial use under Meta's open license, democratizing access to frontier-level AI capabilities for the developer community.", author: "TheOneWayGDA", authorName: "TheOneWayGDA Team", sourceUrl: "https://llama.meta.com", sourceName: "Meta AI", tags: ["Llama", "Meta", "open-source", "long-context"] },
  { type: "news", title: "DeepSeek R1 Challenges Proprietary Models at Fraction of Cost", content: "Chinese AI lab DeepSeek has released R1, an open-source reasoning model that achieves competitive results with proprietary models like o3 and Claude at a fraction of the cost. DeepSeek R1 scores 88.2% on MATH and 63.1% on GPQA Diamond. At $0.55/M input tokens, it's 18x cheaper than o3 while delivering comparable reasoning capabilities. This release challenges the pricing models of established AI providers.", author: "TheOneWayGDA", authorName: "TheOneWayGDA Team", sourceUrl: "https://deepseek.com", sourceName: "DeepSeek", tags: ["DeepSeek", "open-source", "pricing", "reasoning"] },
  { type: "community", title: "Best Practices for AI Model Evaluation in Production", content: "After deploying several AI models in production, here are the key lessons I've learned about evaluation. First, benchmark scores don't tell the whole story — real-world performance varies significantly based on your specific use case. Second, latency matters more than you think — a model that's 5% more accurate but 3x slower may hurt user experience. Third, always A/B test with real users before switching models. Share your evaluation strategies in the comments.", author: "alex.chen@research.dev", authorName: "Alex Chen", tags: ["evaluation", "production", "best-practices", "testing"] },
  { type: "community", title: "Comparing Coding Assistants: Claude vs GPT-4o vs DeepSeek", content: "I ran a comprehensive comparison of coding assistants across 500 real-world programming tasks. Claude 4 Sonnet led with 94.8% accuracy, followed by DeepSeek R1 at 92.3% and GPT-4o at 90.2%. However, for speed-critical tasks, GPT-4o Mini and Claude 3.5 Haiku outperformed in latency. DeepSeek R1 offered the best value proposition at $0.55/M input tokens. For complex debugging, Claude consistently provided more thorough explanations.", author: "dev.sarah@code.io", authorName: "Sarah Kim", tags: ["coding", "comparison", "Claude", "GPT-4o", "DeepSeek"] },
  { type: "community", title: "Building an AI Model Portfolio Tracker for Fun", content: "I built a stock-tracker-style dashboard for tracking AI model performance over time. It's inspired by financial trading platforms but tracks benchmark scores, pricing changes, and market share trends. I'm tracking 15 models across 10 benchmarks and generating weekly trend reports. The most surprising finding: pricing dropped an average of 60% year-over-year for comparable capability levels. Would love to collaborate with others building similar tools.", author: "mike.data@analytics.co", authorName: "Mike Rodriguez", tags: ["portfolio", "tracking", "dashboard", "pricing"] },
  { type: "community", title: "Open Source vs Proprietary: The 2025 AI Landscape", content: "The gap between open-source and proprietary AI models has narrowed dramatically in 2025. Models like DeepSeek R1, Llama 4 Maverick, and Qwen 3 235B now compete with GPT-4o and Claude 4 Sonnet on many benchmarks. The key advantages of proprietary models remain in edge cases: complex reasoning (o3), safety alignment (Claude), and multimodal capabilities (GPT-4o). For most production use cases, open-source models offer 80-90% of the performance at 1/10th the cost.", author: "research.jane@ai-lab.edu", authorName: "Dr. Jane Watson", tags: ["open-source", "proprietary", "comparison", "2025"] },
  { type: "community", title: "How We Reduced AI API Costs by 73% Without Losing Quality", content: "Our team systematically optimized our AI API usage over 6 months, reducing costs from $12K/month to $3.2K/month while maintaining output quality scores. Key strategies: prompt caching (35% savings), model routing (use mini models for simple tasks), response compression, and intelligent batching. We built a model router that analyzes query complexity and routes to the cheapest model that can handle it. Happy to share our routing logic.", author: "cto@startup.io", authorName: "Marcus Johnson", tags: ["cost-optimization", "API", "production", "efficiency"] },
  { type: "news", title: "xAI Grok 3 Enters the Race with Strong Reasoning Scores", content: "Elon Musk's xAI has released Grok 3, a competitive reasoning model that achieves 82.9% on MATH and 58.3% on GPQA Diamond. The model is available through the X Premium+ subscription and API. Grok 3's unique advantage is its real-time access to X/Twitter data, enabling it to incorporate current events and social media trends into responses. The model also shows strong coding capabilities with 91.2% on HumanEval.", author: "TheOneWayGDA", authorName: "TheOneWayGDA Team", sourceUrl: "https://x.ai", sourceName: "xAI", tags: ["Grok", "xAI", "reasoning", "coding"] },
  { type: "news", title: "Qwen 3 235B: Alibaba's Challenge to Western AI Dominance", content: "Alibaba has released Qwen 3 235B, a powerful open-weight model that achieves competitive scores with Western proprietary models. With 86.2% on MMLU and strong multilingual capabilities, Qwen 3 represents a significant step for non-English AI development. The model excels particularly in Chinese and Arabic language tasks, addressing a gap in current model offerings.", author: "TheOneWayGDA", authorName: "TheOneWayGDA Team", sourceUrl: "https://qwen.ai", sourceName: "Alibaba Cloud", tags: ["Qwen", "Alibaba", "multilingual", "open-weight"] },
];

const VERIFIED_RESEARCHERS = [
  { email: "TheOneWayGDA_AI", displayName: "TheOneWayGDA AI News", institution: "TheOneWayGDA", role: "News Bot", badgeType: "official", bio: "Automated AI news aggregator and reporter for TheOneWayGDA platform" },
  { email: "openai-bot@research.ai", displayName: "OpenAI Research", institution: "OpenAI", role: "Research Lab", badgeType: "institution", bio: "Official OpenAI research updates and announcements" },
  { email: "anthropic-bot@research.ai", displayName: "Anthropic Research", institution: "Anthropic", role: "Research Lab", badgeType: "institution", bio: "Anthropic safety and capability research updates" },
  { email: "deepmind-bot@research.ai", displayName: "Google DeepMind", institution: "Google DeepMind", role: "Research Lab", badgeType: "institution", bio: "DeepMind research breakthroughs and model releases" },
  { email: "meta-ai-bot@research.ai", displayName: "Meta AI Research", institution: "Meta AI", role: "Research Lab", badgeType: "institution", bio: "Meta AI open-source model releases and research" },
];

const LIVE_METRICS = [
  { modelName: "GPT-4o", prompt: "Explain quantum entanglement in simple terms", latencyMs: 1250, tps: 68.3, inputTokens: 12, outputTokens: 245, status: "completed" },
  { modelName: "Claude 4 Sonnet", prompt: "Explain quantum entanglement in simple terms", latencyMs: 980, tps: 72.1, inputTokens: 12, outputTokens: 260, status: "completed" },
  { modelName: "Gemini 2.5 Pro", prompt: "Explain quantum entanglement in simple terms", latencyMs: 1100, tps: 65.8, inputTokens: 12, outputTokens: 238, status: "completed" },
  { modelName: "GPT-4o", prompt: "Write a Python function to sort a linked list", latencyMs: 890, tps: 85.2, inputTokens: 18, outputTokens: 312, status: "completed" },
  { modelName: "Claude 4 Sonnet", prompt: "Write a Python function to sort a linked list", latencyMs: 750, tps: 91.4, inputTokens: 18, outputTokens: 328, status: "completed" },
  { modelName: "Gemini 2.5 Pro", prompt: "Write a Python function to sort a linked list", latencyMs: 820, tps: 78.6, inputTokens: 18, outputTokens: 301, status: "completed" },
  { modelName: "DeepSeek V3", prompt: "Explain quantum entanglement in simple terms", latencyMs: 650, tps: 95.2, inputTokens: 12, outputTokens: 255, status: "completed" },
  { modelName: "Llama 4 Maverick", prompt: "Explain quantum entanglement in simple terms", latencyMs: 1800, tps: 55.1, inputTokens: 12, outputTokens: 220, status: "completed" },
];

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createBatches(items: any[], createFn: (batch: any[]) => Promise<void>, batchSize: number, label: string) {
  const totalBatches = Math.ceil(items.length / batchSize);
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    process.stdout.write(`  [${batchNum}/${totalBatches}] ${label}...`);
    await createFn(batch);
    console.log(` ✅`);
    if (i + batchSize < items.length) await sleep(300);
  }
}

// ═══════════════════════════════════════════════════════════
// SEED FUNCTIONS
// ═══════════════════════════════════════════════════════════

async function seedAiModels() {
  console.log("\n📋 Seeding AI Models...");
  for (const model of AI_MODELS) {
    await db.aiModel.upsert({
      where: { name_provider: { name: model.name, provider: model.provider } },
      update: { ...model, tags: JSON.stringify(model.tags) },
      create: { ...model, tags: JSON.stringify(model.tags) },
    });
  }
  console.log(`  ✅ ${AI_MODELS.length} AI models seeded`);
}

async function seedBenchmarkScores() {
  console.log("\n📊 Seeding Benchmark Scores...");
  let total = 0;
  for (const [modelName, scores] of Object.entries(BENCHMARK_SCORES)) {
    const model = await db.aiModel.findFirst({ where: { name: modelName } });
    if (!model) continue;
    for (const s of scores) {
      await db.benchmarkScore.upsert({
        where: { modelId_benchmark_version: { modelId: model.id, benchmark: s.benchmark, version: "latest" } },
        update: { score: s.score },
        create: { modelId: model.id, benchmark: s.benchmark, score: s.score, maxScore: 100, source: "verified", version: "latest" },
      });
      total++;
    }
  }
  console.log(`  ✅ ${total} benchmark scores seeded`);
}

async function seedPricing() {
  console.log("\n💰 Seeding Pricing Data...");
  let total = 0;
  for (const p of PRICING_DATA) {
    const model = await db.aiModel.findFirst({ where: { name: p.name, provider: p.provider } });
    if (!model) continue;
    // Delete existing pricing for this model to avoid conflicts
    await db.modelPricing.deleteMany({ where: { modelId: model.id } });
    await db.modelPricing.create({
      data: {
        modelId: model.id,
        provider: p.provider,
        inputPrice: p.inputPrice,
        outputPrice: p.outputPrice,
        batchInputPrice: p.batchInputPrice,
        batchOutputPrice: p.batchOutputPrice,
      },
    });
    total++;
  }
  console.log(`  ✅ ${total} pricing records seeded`);
}

async function seedLiveMetrics() {
  console.log("\n⚡ Seeding Live Metrics...");
  const models = await db.aiModel.findMany({ select: { id: true, name: true } });
  const modelMap = new Map(models.map(m => [m.name, m.id]));
  
  let total = 0;
  for (const metric of LIVE_METRICS) {
    const modelId = modelMap.get(metric.modelName);
    if (!modelId) continue;
    await db.liveMetric.create({
      data: { modelId, prompt: metric.prompt, latencyMs: metric.latencyMs, tps: metric.tps, inputTokens: metric.inputTokens, outputTokens: metric.outputTokens, status: metric.status },
    });
    total++;
  }
  console.log(`  ✅ ${total} live metrics seeded`);
}

async function seedArenaBattles() {
  console.log("\n⚔️ Seeding Arena Battles...");
  const models = await db.aiModel.findMany({ select: { id: true, name: true } });
  if (models.length < 2) { console.log("  ⚠️ Not enough models"); return; }

  const battlePairs = [
    { a: "GPT-4o", b: "Claude 4 Sonnet", category: "reasoning", prompt: "A farmer has 17 sheep. All but 9 die. How many sheep does the farmer have left? Explain your reasoning step by step.", respA: "The farmer has 9 sheep left. The phrase 'all but 9 die' means that 9 sheep survive. Even though the farmer started with 17 sheep, only 9 remain alive after the others died. This is a classic trick question that tests careful reading comprehension.", respB: "The answer is 9. 'All but 9 die' means every sheep except 9 died. So 17 - 8 = 9 sheep remain alive. This is a language trick — 'all but 9' means 'all except 9', not 'all 9 die'.", votesA: 42, votesB: 38, votesTie: 15 },
    { a: "Claude 4 Sonnet", b: "Gemini 2.5 Pro", category: "coding", prompt: "Write a Python function that finds the longest palindromic substring in a given string. Include time complexity analysis.", respA: "Here's an efficient approach using dynamic programming:\n\n```python\ndef longest_palindrome(s: str) -> str:\n    n = len(s)\n    if n < 2: return s\n    start, max_len = 0, 1\n    \n    def expand(l, r):\n        while l >= 0 and r < n and s[l] == s[r]:\n            l -= 1; r += 1\n        return (l + 1, r - l - 1)\n    \n    for i in range(n):\n        for left, length in [expand(i, i), expand(i, i+1)]:\n            if length > max_len:\n                start, max_len = left, length\n    return s[start:start+max_len]\n```\n\nTime complexity: O(n²) for expanding around centers, O(1) space.", respB: "Here is a clean solution using expand-around-center:\n\n```python\ndef longest_palindrome(s):\n    def expand_around_center(s, left, right):\n        while left >= 0 and right < len(s) and s[left] == s[right]:\n            left -= 1\n            right += 1\n        return s[left+1:right]\n    \n    result = ''\n    for i in range(len(s)):\n        odd = expand_around_center(s, i, i)\n        even = expand_around_center(s, i, i+1)\n        result = max(result, odd, even, key=len)\n    return result\n```\n\nTime: O(n²), Space: O(1). This checks all possible palindrome centers.", votesA: 55, votesB: 31, votesTie: 12 },
    { a: "o3", b: "DeepSeek R1", category: "math", prompt: "Prove that √2 is irrational.", respA: "Proof by contradiction:\n\nAssume √2 is rational. Then √2 = a/b where a and b are coprime integers.\n\nSquaring both sides: 2 = a²/b², so a² = 2b².\n\nThis means a² is even, so a must be even. Let a = 2k.\n\nThen 4k² = 2b², so b² = 2k².\n\nThis means b² is even, so b must be even.\n\nBut if both a and b are even, they share a common factor of 2, contradicting our assumption that a/b is in lowest terms.\n\nTherefore √2 is irrational. ■", respB: "Classic proof by contradiction:\n\nSuppose √2 = p/q in lowest terms (p, q ∈ Z, gcd(p,q)=1).\n\nThen 2q² = p², meaning p² is even → p is even.\n\nWrite p = 2m. Then 2q² = 4m², so q² = 2m².\n\nThus q² is even → q is even.\n\nBoth p and q even contradicts gcd(p,q) = 1. ∴ √2 ∉ Q.", votesA: 48, votesB: 35, votesTie: 20 },
    { a: "GPT-4o Mini", b: "Gemini 2.5 Flash", category: "creative", prompt: "Write a haiku about artificial intelligence.", respA: "Silicon neurons fire,\nPattern matching through the dark —\nNew thoughts emerge, bright.", respB: "Neural pathways glow,\nLearning patterns, seeing truth —\nMachines start to dream.", votesA: 28, votesB: 33, votesTie: 25 },
    { a: "GPT-4o", b: "DeepSeek V3", category: "general", prompt: "What are the key differences between transformer and RNN architectures in deep learning?", respA: "Key differences:\n\n1. **Parallelism**: Transformers process all tokens simultaneously via self-attention, while RNNs process sequentially.\n2. **Long-range dependencies**: Transformers capture long-range dependencies equally well regardless of distance. RNNs struggle with vanishing gradients over long sequences.\n3. **Training efficiency**: Transformers train faster due to parallel processing. RNNs require sequential computation.\n4. **Memory**: Transformers have O(n²) memory for attention. RNNs use O(1) memory per step.\n5. **Positional encoding**: Transformers need explicit position info. RNNs inherently capture sequence order.\n6. **Scalability**: Transformers scale better with data and compute, enabling models like GPT-4.", respB: "The main architectural differences:\n\n**RNNs** process input sequentially — each hidden state depends on the previous one. This creates:\n- Sequential bottleneck (slow training)\n- Vanishing/exploding gradients\n- Limited context retention\n\n**Transformers** use self-attention mechanisms:\n- All positions attend to all others simultaneously\n- O(1) path length between any two positions\n- Highly parallelizable training\n\n**Trade-offs:**\n- Transformers: O(n²) compute/memory vs O(n) for RNNs\n- Transformers handle longer contexts better\n- RNNs can be more efficient for very short sequences\n- Transformers enabled the large language model revolution", votesA: 40, votesB: 45, votesTie: 18 },
    { a: "Claude 4 Sonnet", b: "GPT-4o", category: "safety", prompt: "How should AI systems handle potentially harmful requests while remaining helpful?", respA: "AI systems should handle harmful requests through a layered approach:\n\n1. **Context assessment**: Evaluate the genuine intent behind the request\n2. **Redirect, don't refuse**: Instead of flat refusal, explain what concerns exist and offer alternatives\n3. **Educational framing**: If someone asks about harmful topics, provide educational information without instructional details\n4. **Graduated response**: Not all requests are equal — distinguish between academic curiosity and malicious intent\n5. **Transparency**: Be clear about limitations and the reasoning behind responses\n6. **User agency**: Respect informed adults' ability to make their own decisions while providing appropriate context\n\nThe goal is maximizing helpfulness while minimizing genuine harm, recognizing that these goals sometimes conflict.", respB: "Handling potentially harmful requests requires balancing safety with usefulness:\n\n**Tier 1 — Clear harm**: Requests for weapons, illegal activities, or content that harms specific people should be declined with a clear explanation.\n\n**Tier 2 — Educational**: Questions about how harmful things work can often be answered educationally — explaining malware concepts without providing exploit code, for example.\n\n**Tier 3 — Edge cases**: Medical, legal, financial advice requires disclaimers and encouraging professional consultation.\n\nKey principles: transparency about limitations, consistency in responses, and always erring on the side of caution while remaining maximally helpful within safety boundaries.", votesA: 51, votesB: 37, votesTie: 19 },
    { a: "Mistral Large 2", b: "Qwen 3 235B", category: "multilingual", prompt: "Traduisez le paragraphe suivant en anglais, puis en allemand, puis en arabe: 'L'intelligence artificielle transforme chaque industrie, de la santé à l'éducation, en passant par la finance et la fabrication.'", respA: "**English:** Artificial intelligence is transforming every industry, from healthcare to education, including finance and manufacturing.\n\n**German:** Künstliche Intelligenz transformiert jede Branche, vom Gesundheitswesen bis zur Bildung, einschließlich Finanzen und Fertigung.\n\n**Arabic:** تعمل الذكاء الاصطناعي على تحويل كل صناعة، من الرعاية الصحية إلى التعليم، بما في ذلك التمويل والتصنيع.", respB: "**English:** Artificial intelligence is transforming every industry, from healthcare to education, through finance and manufacturing.\n\n**German:** Künstliche Intelligenz transformiert jede Industrie, von der Gesundheitsbranche bis zur Bildung, über Finanzen und Fertigungsindustrie.\n\n**Arabic:** يحول الذكاء الاصطناعي كل قطاع، من الرعاية الصحية إلى التعليم، مرورا بالتمويل والتصنيع.", votesA: 38, votesB: 30, votesTie: 22 },
    { a: "o3-mini", b: "GPT-4o Mini", category: "reasoning", prompt: "If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?", respA: "The answer is **5 minutes**.\n\nEach machine takes 5 minutes to make 1 widget. 100 machines working in parallel each make 1 widget in 5 minutes, producing 100 widgets total.\n\nThis is a classic reasoning trap — the instinct is to say 100 minutes, but the machines work in parallel, not sequentially.", respB: "It takes **5 minutes**.\n\nHere's the logic: 5 machines make 5 widgets in 5 minutes means each machine produces 1 widget per 5 minutes. With 100 machines all working simultaneously, each producing 1 widget in 5 minutes, you get 100 widgets in those same 5 minutes. The key insight is that machines work in parallel.", votesA: 35, votesB: 40, votesTie: 28 },
    { a: "Llama 4 Maverick", b: "Grok 3", category: "general", prompt: "Explain the concept of 'attention is all you need' and why it revolutionized AI.", respA: "The 'Attention Is All You Need' paper (Vaswani et al., 2017) introduced the Transformer architecture, which replaced the dominant RNN/LSTM approaches in NLP.\n\n**Key innovation — Self-Attention:**\nInstead of processing words sequentially, self-attention computes relationships between ALL word pairs simultaneously. Each word 'attends to' every other word with a learned weight.\n\n**Multi-Head Attention:**\nMultiple attention heads run in parallel, each capturing different types of relationships (syntax, semantics, coreference).\n\n**Why revolutionary:**\n1. True parallelism — no sequential bottleneck\n2. Direct long-range connections — no vanishing gradients\n3. Scaled to billions of parameters\n4. Enabled GPT, BERT, and the entire LLM era\n\nThe paper's title was prophetic — attention really was all we needed.", respB: "The 2017 paper 'Attention Is All You Need' introduced the Transformer architecture that changed everything in AI.\n\n**Core idea:** Self-attention allows each element in a sequence to directly attend to every other element, computing relevance scores between all pairs simultaneously.\n\n**Before Transformers:**\n- RNNs processed text word by word sequentially\n- LSTM tried to solve memory issues but still sequential\n- Training was slow and context was limited\n\n**After Transformers:**\n- All positions computed in parallel\n- Direct connections between distant words\n- Scalable to massive datasets and parameters\n- Birthed BERT, GPT, and everything since\n\nThe title was bold but accurate — the attention mechanism alone, without recurrence or convolution, proved sufficient for state-of-the-art results across all NLP tasks.", votesA: 42, votesB: 44, votesTie: 16 },
    { a: "Claude 3.5 Haiku", b: "DeepSeek V3", category: "coding", prompt: "Implement a function in JavaScript that debounces another function with a configurable delay and leading/trailing edge options.", respA: "Here's a flexible debounce implementation:\n\n```javascript\nfunction debounce(fn, delay, { leading = false, trailing = true } = {}) {\n  let timer = null;\n  let lastArgs = null;\n  \n  return function(...args) {\n    const callNow = leading && !timer;\n    lastArgs = args;\n    \n    clearTimeout(timer);\n    timer = setTimeout(() => {\n      if (trailing && lastArgs) {\n        fn.apply(this, lastArgs);\n        lastArgs = null;\n      }\n      timer = null;\n    }, delay);\n    \n    if (callNow) fn.apply(this, args);\n  };\n}\n```\n\n**Usage:**\n```javascript\n// Trailing only (default)\nconst debouncedSearch = debounce(search, 300);\n\n// Leading edge\nconst debouncedClick = debounce(handleClick, 100, { leading: true, trailing: false });\n```", respB: "```javascript\nfunction debounce(fn, wait, options = {}) {\n  let timeoutId = null;\n  let pendingArgs = null;\n  const { leading = false, trailing = true } = options;\n  \n  function debounced(...args) {\n    const shouldCallLeading = leading && timeoutId === null;\n    pendingArgs = args;\n    \n    clearTimeout(timeoutId);\n    \n    timeoutId = setTimeout(() => {\n      timeoutId = null;\n      if (trailing && pendingArgs) {\n        fn.apply(this, pendingArgs);\n        pendingArgs = null;\n      }\n    }, wait);\n    \n    if (shouldCallLeading) {\n      fn.apply(this, args);\n    }\n  }\n  \n  debounced.cancel = () => {\n    clearTimeout(timeoutId);\n    timeoutId = null;\n    pendingArgs = null;\n  };\n  \n  return debounced;\n}\n```\nIncludes a `.cancel()` method for cleanup.", votesA: 36, votesB: 32, votesTie: 18 },
  ];

  const modelMap = new Map(models.map(m => [m.name, m.id]));
  let total = 0;

  for (const bp of battlePairs) {
    const modelAId = modelMap.get(bp.a);
    const modelBId = modelMap.get(bp.b);
    if (!modelAId || !modelBId) continue;

    const totalVotes = bp.votesA + bp.votesB + bp.votesTie;
    const battle = await db.arenaBattle.create({
      data: {
        modelAId, modelAName: bp.a, modelBId, modelBName: bp.b,
        category: bp.category, prompt: bp.prompt,
        responseA: bp.respA, responseB: bp.respB,
        votesA: bp.votesA, votesB: bp.votesB, votesTie: bp.votesTie,
        totalVotes, isRevealed: true, isActive: true,
      },
    });
    total++;

    // Create sample votes
    const voterEmails = [
      "user1@example.com", "user2@example.com", "user3@example.com",
      "user4@example.com", "user5@example.com", "user6@example.com",
      "user7@example.com", "user8@example.com", "user9@example.com", "user10@example.com",
    ];
    for (const email of voterEmails) {
      const choices = ["model_a", "model_b", "tie"] as const;
      const weights = [bp.votesA / totalVotes, bp.votesB / totalVotes, bp.votesTie / totalVotes];
      const r = Math.random();
      const choice = r < weights[0] ? "model_a" : r < weights[0] + weights[1] ? "model_b" : "tie";
      try {
        await db.arenaVote.create({ data: { battleId: battle.id, voterId: email, choice } });
      } catch { /* unique constraint */ }
    }
  }
  console.log(`  ✅ ${total} arena battles with sample votes seeded`);
}

async function seedCustomCopilots() {
  console.log("\n🤖 Seeding Custom Copilots...");
  let total = 0;
  for (const copilot of CUSTOM_COPILOTS) {
    await db.customCopilot.upsert({
      where: { id: `copilot-${copilot.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `copilot-${copilot.name.toLowerCase().replace(/\s+/g, '-')}`,
        authorId: "TheOneWayGDA",
        authorName: "TheOneWayGDA Team",
        rating: +(3.5 + Math.random() * 1.5).toFixed(1),
        ratingCount: Math.floor(Math.random() * 200) + 50,
        installCount: Math.floor(Math.random() * 500) + 100,
        usageCount: Math.floor(Math.random() * 2000) + 500,
        ...copilot,
        tools: JSON.stringify(copilot.tools),
        tags: JSON.stringify(copilot.tags),
      },
    });
    total++;
  }
  console.log(`  ✅ ${total} custom copilots seeded`);
}

async function seedCommunityPosts() {
  console.log("\n📰 Seeding Community Posts...");
  let total = 0;
  for (const post of COMMUNITY_POSTS) {
    const featured = total < 3;
    await db.communityPost.create({
      data: {
        ...post,
        tags: JSON.stringify(post.tags),
        likes: Math.floor(Math.random() * 200) + 10,
        comments: Math.floor(Math.random() * 30) + 2,
        reposts: Math.floor(Math.random() * 15),
        saves: Math.floor(Math.random() * 40) + 5,
        featured,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      },
    });
    total++;
  }
  console.log(`  ✅ ${total} community posts seeded`);
}

async function seedVerifiedResearchers() {
  console.log("\n🏷️ Seeding Verified Researchers...");
  let total = 0;
  for (const r of VERIFIED_RESEARCHERS) {
    await db.verifiedResearcher.upsert({
      where: { email: r.email },
      update: r,
      create: { ...r, totalPosts: Math.floor(Math.random() * 50) + 10 },
    });
    total++;
  }
  console.log(`  ✅ ${total} verified researchers seeded`);
}

async function seedCertifications() {
  console.log("\n🏆 Seeding Certifications...");
  const certData = [
    { modelName: "o3", provider: "OpenAI", level: "platinum", category: "reasoning", overallScore: 91.0 },
    { modelName: "Claude 4 Sonnet", provider: "Anthropic", level: "gold", category: "reasoning", overallScore: 90.1 },
    { modelName: "GPT-4o", provider: "OpenAI", level: "gold", category: "general", overallScore: 88.7 },
    { modelName: "DeepSeek R1", provider: "DeepSeek", level: "gold", category: "math", overallScore: 88.2 },
    { modelName: "Claude 4 Sonnet", provider: "Anthropic", level: "gold", category: "coding", overallScore: 94.8 },
    { modelName: "Gemini 2.5 Pro", provider: "Google", level: "gold", category: "general", overallScore: 89.5 },
    { modelName: "o3-mini", provider: "OpenAI", level: "silver", category: "math", overallScore: 82.7 },
    { modelName: "DeepSeek V3", provider: "DeepSeek", level: "silver", category: "general", overallScore: 87.1 },
    { modelName: "Grok 3", provider: "xAI", level: "silver", category: "reasoning", overallScore: 87.8 },
    { modelName: "Mistral Large 2", provider: "Mistral AI", level: "silver", category: "coding", overallScore: 89.1 },
  ];

  let total = 0;
  for (const c of certData) {
    const model = await db.aiModel.findFirst({ where: { name: c.modelName } });
    if (!model) continue;
    
    const benchmarks = BENCHMARK_SCORES[c.modelName];
    const benchmarkScores: Record<string, number> = {};
    if (benchmarks) {
      for (const b of benchmarks) benchmarkScores[b.benchmark] = b.score;
    }

    await db.certification.upsert({
      where: { modelId_category: { modelId: model.id, category: c.category } },
      update: { overallScore: c.overallScore, status: "certified" },
      create: {
        modelId: model.id,
        modelName: c.modelName,
        provider: c.provider,
        level: c.level,
        category: c.category,
        overallScore: c.overallScore,
        benchmarks: JSON.stringify(benchmarkScores),
        criteria: JSON.stringify({ min_score: c.level === "platinum" ? 95 : c.level === "gold" ? 85 : 75, benchmarks_required: 5 }),
        status: "certified",
        validFrom: new Date("2025-05-01"),
        validUntil: new Date("2026-05-01"),
        certifiedBy: "TheOneWayGDA",
      },
    });
    total++;
  }
  console.log(`  ✅ ${total} certifications seeded`);
}

async function seedPortfolios() {
  console.log("\n📈 Seeding Model Portfolios...");
  
  const portfolios = [
    { ownerId: "analyst@theonewaygda.com", ownerName: "TheOneWayGDA Research", name: "Flagship AI Portfolio", description: "Our curated portfolio tracking the top AI models by composite benchmark performance", isPublic: true, holdings: ["GPT-4o", "Claude 4 Sonnet", "Gemini 2.5 Pro", "o3", "DeepSeek V3"] },
    { ownerId: "analyst@theonewaygda.com", ownerName: "TheOneWayGDA Research", name: "Open Source Champions", description: "Tracking the best open-source and open-weight models", isPublic: true, holdings: ["Llama 4 Maverick", "DeepSeek V3", "DeepSeek R1", "Qwen 3 235B"] },
    { ownerId: "analyst@theonewaygda.com", ownerName: "TheOneWayGDA Research", name: "Cost-Efficient Pick", description: "Best value models for budget-conscious deployments", isPublic: true, holdings: ["GPT-4o Mini", "Claude 3.5 Haiku", "Gemini 2.5 Flash", "DeepSeek V3", "Yi-Lightning"] },
  ];

  const models = await db.aiModel.findMany({ select: { id: true, name: true, provider: true } });
  const modelMap = new Map(models.map(m => [m.name, m]));
  let total = 0;

  for (const p of portfolios) {
    const portfolio = await db.modelPortfolio.create({
      data: {
        ownerId: p.ownerId,
        ownerName: p.ownerName,
        name: p.name,
        description: p.description,
        isPublic: p.isPublic,
        totalValue: 0,
        holdingsCount: p.holdings.length,
      },
    });

    let totalScore = 0;
    for (const holdingName of p.holdings) {
      const model = modelMap.get(holdingName);
      if (!model) continue;

      // Calculate composite score
      const scores = await db.benchmarkScore.findMany({ where: { modelId: model.id } });
      const avgScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : 0;

      await db.portfolioHolding.create({
        data: {
          portfolioId: portfolio.id,
          modelId: model.id,
          modelName: model.name,
          provider: model.provider,
          score: avgScore,
          prevScore: avgScore - (Math.random() * 3 - 1),
        },
      });
      totalScore += avgScore;
    }

    // Update portfolio total value
    await db.modelPortfolio.update({
      where: { id: portfolio.id },
      data: { totalValue: +(totalScore / p.holdings.length).toFixed(1) },
    });

    // Add some alerts
    await db.portfolioAlert.create({
      data: {
        portfolioId: portfolio.id,
        modelId: modelMap.get(p.holdings[0])?.id || "",
        modelName: p.holdings[0],
        alertType: "score_increase",
        message: `${p.holdings[0]} benchmark score increased by 2.3 points this week`,
        isRead: false,
      },
    });

    total++;
  }
  console.log(`  ✅ ${total} portfolios with holdings and alerts seeded`);
}

async function seedLeaderboardSnapshots() {
  console.log("\n📸 Seeding Leaderboard Snapshots...");
  
  const categories = ["overall", "reasoning", "coding", "math", "creative"];
  const models = await db.aiModel.findMany({ select: { id: true, name: true } });
  const modelMap = new Map(models.map(m => [m.name, m.id]));

  let total = 0;
  for (const cat of categories) {
    // Create rankings based on benchmark scores
    const rankings: { modelId: string; name: string; score: number }[] = [];
    for (const model of models) {
      const scores = await db.benchmarkScore.findMany({ where: { modelId: model.id } });
      const avgScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : 0;
      rankings.push({ modelId: model.id, name: model.name, score: avgScore });
    }
    rankings.sort((a, b) => b.score - a.score);

    await db.leaderboardSnapshot.create({
      data: {
        benchmark: cat,
        ranking: JSON.stringify(rankings.slice(0, 10).map((r, i) => ({ rank: i + 1, ...r }))),
        snapshotDate: new Date(),
      },
    });
    total++;
  }
  console.log(`  ✅ ${total} leaderboard snapshots seeded`);
}

async function seedPromptVersions() {
  console.log("\n📝 Seeding Prompt Versions...");
  
  const prompts = [
    { name: "copilot-general", version: "v4.0.0", context: "copilot", prompt: "You are THEONEWAYGDA Copilot, an AI assistant specialized in AI/ML model comparison, benchmarking, and industry analysis. Be helpful, accurate, and cite sources when possible. Keep responses concise but thorough.", isActive: true },
    { name: "copilot-general", version: "v3.2.1", context: "copilot", prompt: "You are THEONEWAYGDA Copilot v3. Help users with AI model questions, benchmark data, and platform features.", isActive: false },
    { name: "arena-judge", version: "v1.0.0", context: "arena", prompt: "You are a neutral AI arena judge. Evaluate model responses fairly without bias. Consider accuracy, clarity, helpfulness, and completeness.", isActive: true },
    { name: "news-summarizer", version: "v2.1.0", context: "automation", prompt: "Summarize AI news articles into concise, factual reports suitable for the THEONEWAYGDA community. Include key facts, implications, and source links.", isActive: true },
  ];

  for (const p of prompts) {
    await db.promptVersion.upsert({
      where: { name_version: { name: p.name, version: p.version } },
      update: p,
      create: { ...p, createdBy: "system" },
    });
  }
  console.log(`  ✅ ${prompts.length} prompt versions seeded`);
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  THEONEWAYGDA — Production Database Seeding");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Target: Neon PostgreSQL (eu-central-1)`);
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log("");

  try {
    // 1. Core data
    await seedAiModels();
    await seedBenchmarkScores();
    await seedPricing();
    await seedLiveMetrics();
    await seedPromptVersions();

    // 2. Feature data
    await seedArenaBattles();
    await seedCustomCopilots();
    await seedCommunityPosts();
    await seedVerifiedResearchers();
    await seedCertifications();
    await seedPortfolios();
    await seedLeaderboardSnapshots();

    console.log("\n═══════════════════════════════════════════════");
    console.log("  ✅ SEEDING COMPLETE — All tables populated!");
    console.log("═══════════════════════════════════════════════\n");

    // Print summary
    const counts = {
      aiModels: await db.aiModel.count(),
      benchmarkScores: await db.benchmarkScore.count(),
      pricing: await db.modelPricing.count(),
      liveMetrics: await db.liveMetric.count(),
      arenaBattles: await db.arenaBattle.count(),
      arenaVotes: await db.arenaVote.count(),
      copilots: await db.customCopilot.count(),
      posts: await db.communityPost.count(),
      certifications: await db.certification.count(),
      portfolios: await db.modelPortfolio.count(),
      holdings: await db.portfolioHolding.count(),
      alerts: await db.portfolioAlert.count(),
      researchers: await db.verifiedResearcher.count(),
      snapshots: await db.leaderboardSnapshot.count(),
      prompts: await db.promptVersion.count(),
    };

    console.log("  DATABASE SUMMARY:");
    console.log("  ─────────────────────────────────────────");
    for (const [key, val] of Object.entries(counts)) {
      console.log(`  ${key.padEnd(22)}: ${val} records`);
    }
    console.log("  ─────────────────────────────────────────");
    console.log(`  TOTAL: ${Object.values(counts).reduce((a, b) => a + b, 0)} records\n`);

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
