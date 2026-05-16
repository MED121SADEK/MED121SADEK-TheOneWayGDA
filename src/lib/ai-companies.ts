/**
 * AI Companies Database
 * Comprehensive database of major AI companies from America and Asia,
 * organized by category and region for the AI News Hub.
 */

export interface AICompany {
  id: string
  name: string
  region: 'us' | 'asia' | 'europe'
  country: string
  category: string
  specialty: string
  products: string[]
  searchKeywords: string[]
  founded: number
  logo: string // emoji/icon fallback
  website: string
}

export const AI_COMPANIES: AICompany[] = [
  // ══════════════════════════════════════════════════════
  // 🇺🇸 UNITED STATES — Foundation Models
  // ══════════════════════════════════════════════════════
  { id: 'openai', name: 'OpenAI', region: 'us', country: 'USA', category: 'Foundation Models', specialty: 'GPT series, DALL-E, Sora video generation',
    products: ['GPT-4o', 'GPT-5', 'ChatGPT', 'DALL-E 3', 'Sora', 'Codex', 'Whisper', 'o1', 'o3'],
    searchKeywords: ['openai', 'gpt', 'chatgpt', 'dall-e', 'sora', 'o1', 'o3', 'sam altman'],
    founded: 2015, logo: '🤖', website: 'https://openai.com' },
  { id: 'anthropic', name: 'Anthropic', region: 'us', country: 'USA', category: 'Foundation Models', specialty: 'Claude AI assistant, AI safety research',
    products: ['Claude 4', 'Claude 3.5 Sonnet', 'Claude 3 Opus', 'Constitutional AI'],
    searchKeywords: ['anthropic', 'claude', 'dario amodei', 'ai safety'],
    founded: 2021, logo: '🧠', website: 'https://anthropic.com' },
  { id: 'google-deepmind', name: 'Google DeepMind', region: 'us', country: 'USA', category: 'Foundation Models', specialty: 'Gemini, AlphaFold, AI research',
    products: ['Gemini 2.5', 'Gemini Ultra', 'AlphaFold 3', 'Gemini Flash', 'Gemma'],
    searchKeywords: ['google deepmind', 'gemini', 'alphafold', 'google ai', 'sundar pichai'],
    founded: 2010, logo: '💎', website: 'https://deepmind.google' },
  { id: 'meta-ai', name: 'Meta AI', region: 'us', country: 'USA', category: 'Foundation Models', specialty: 'Llama open-source models, computer vision',
    products: ['Llama 4', 'Llama 3', 'Emu', 'Segment Anything', 'Code Llama'],
    searchKeywords: ['meta ai', 'llama', 'mark zuckerberg', 'meta ai lab', 'yann lecun'],
    founded: 2013, logo: '🔄', website: 'https://ai.meta.com' },
  { id: 'mistral', name: 'Mistral AI', region: 'us', country: 'USA', category: 'Foundation Models', specialty: 'Open-source LLMs, efficient AI models',
    products: ['Mistral Large', 'Mistral Medium', 'Mistral Small', 'Codestral', 'Mixtral'],
    searchKeywords: ['mistral', 'mistral ai', 'arthur Mensch', 'mixtral'],
    founded: 2023, logo: '🌬️', website: 'https://mistral.ai' },
  { id: 'xai', name: 'xAI', region: 'us', country: 'USA', category: 'Foundation Models', specialty: 'Grok AI, understanding the universe',
    products: ['Grok 3', 'Grok 2', 'Grok Mini'],
    searchKeywords: ['xai', 'grok', 'elon musk', 'x ai'],
    founded: 2023, logo: '✖️', website: 'https://x.ai' },
  { id: 'cohere', name: 'Cohere', region: 'us', country: 'USA', category: 'Foundation Models', specialty: 'Enterprise NLP, Command R models',
    products: ['Command R+', 'Command R', 'Embed v3', 'Rerank v3'],
    searchKeywords: ['cohere', 'command r', 'enterprise ai', 'nlp'],
    founded: 2019, logo: '📝', website: 'https://cohere.com' },
  { id: 'ai21', name: 'AI21 Labs', region: 'us', country: 'USA', category: 'Foundation Models', specialty: 'Jurassic models, AI writing tools',
    products: ['Jamba', 'Jurassic-2', 'Wordtune'],
    searchKeywords: ['ai21', 'jamba', 'jurassic', 'wordtune'],
    founded: 2017, logo: '📖', website: 'https://ai21.com' },

  // ══════════════════════════════════════════════════════
  // 🇺🇸 UNITED STATES — AI Infrastructure & Platforms
  // ══════════════════════════════════════════════════════
  { id: 'nvidia', name: 'NVIDIA', region: 'us', country: 'USA', category: 'AI Hardware', specialty: 'GPU computing, CUDA, AI chips',
    products: ['H200', 'B200', 'Blackwell', 'CUDA', 'TensorRT', 'NIM'],
    searchKeywords: ['nvidia', 'gpu', 'cuda', 'jen-hsun huang', 'blackwell', 'hopper'],
    founded: 1993, logo: '🟢', website: 'https://nvidia.com' },
  { id: 'databricks', name: 'Databricks', region: 'us', country: 'USA', category: 'AI Infrastructure', specialty: 'Data lakehouse, ML platform, MosaicML',
    products: ['Databricks Lakehouse', 'MLflow', 'MosaicML', 'DBRX'],
    searchKeywords: ['databricks', 'mosaicml', 'dbrx', 'lakehouse', 'mlflow'],
    founded: 2013, logo: '🔥', website: 'https://databricks.com' },
  { id: 'huggingface', name: 'Hugging Face', region: 'us', country: 'USA', category: 'AI Platform', specialty: 'Open-source AI models hub, Transformers',
    products: ['Transformers', 'Diffusers', 'Inference API', 'AutoTrain', 'Spaces'],
    searchKeywords: ['hugging face', 'transformers', 'diffusers', 'open source ai'],
    founded: 2016, logo: '🤗', website: 'https://huggingface.co' },
  { id: 'scale-ai', name: 'Scale AI', region: 'us', country: 'USA', category: 'AI Infrastructure', specialty: 'AI data labeling, RLHF, government AI',
    products: ['Scale Data Engine', 'Scale Donovan', 'Scale Generative AI'],
    searchKeywords: ['scale ai', 'data labeling', 'rlhf', 'alexandr wang'],
    founded: 2016, logo: '📊', website: 'https://scale.com' },
  { id: 'langchain', name: 'LangChain', region: 'us', country: 'USA', category: 'AI Framework', specialty: 'LLM application framework, LangGraph',
    products: ['LangChain', 'LangGraph', 'LangSmith', 'LangServe'],
    searchKeywords: ['langchain', 'langgraph', 'langsmith', 'llm framework'],
    founded: 2022, logo: '🔗', website: 'https://langchain.com' },
  { id: 'replicate', name: 'Replicate', region: 'us', country: 'USA', category: 'AI Platform', specialty: 'Cloud API for open-source ML models',
    products: ['Replicate API', 'Model Library', 'Deployments'],
    searchKeywords: ['replicate', 'ml api', 'model deployment'],
    founded: 2019, logo: '🔁', website: 'https://replicate.com' },
  { id: 'palantir', name: 'Palantir', region: 'us', country: 'USA', category: 'Enterprise AI', specialty: 'AI-powered data analytics for government and enterprise',
    products: ['AIP', 'Foundry', 'Gotham', 'Apollo'],
    searchKeywords: ['palantir', 'aip', 'foundry', 'alex karp'],
    founded: 2003, logo: '🔮', website: 'https://palantir.com' },
  { id: 'snowflake', name: 'Snowflake', region: 'us', country: 'USA', category: 'AI Infrastructure', specialty: 'Cloud data warehouse, Cortex AI',
    products: ['Snowflake Cortex', 'Arctic', 'Document AI'],
    searchKeywords: ['snowflake', 'cortex ai', 'arctic', 'data cloud'],
    founded: 2012, logo: '❄️', website: 'https://snowflake.com' },
  { id: 'anyscale', name: 'Anyscale', region: 'us', country: 'USA', category: 'AI Infrastructure', specialty: 'Ray framework, scalable AI compute',
    products: ['Ray', 'Anyscale Platform', 'LLM serving'],
    searchKeywords: ['anyscale', 'ray', 'scalable ai', 'robert nishihara'],
    founded: 2019, logo: '⚡', website: 'https://anyscale.com' },

  // ══════════════════════════════════════════════════════
  // 🇺🇸 UNITED STATES — AI Applications & Agents
  // ══════════════════════════════════════════════════════
  { id: 'openai-copilot', name: 'Microsoft Copilot', region: 'us', country: 'USA', category: 'AI Assistant', specialty: 'AI productivity suite, Office integration',
    products: ['Copilot Pro', 'Copilot for Microsoft 365', 'GitHub Copilot', 'Copilot Studio'],
    searchKeywords: ['microsoft copilot', 'github copilot', 'bing chat', 'satya nadella'],
    founded: 2023, logo: '🪟', website: 'https://copilot.microsoft.com' },
  { id: 'perplexity', name: 'Perplexity AI', region: 'us', country: 'USA', category: 'AI Search', specialty: 'AI-powered search engine, answer engine',
    products: ['Perplexity Pro', 'Perplexity Enterprise', 'pplx API'],
    searchKeywords: ['perplexity', 'perplexity ai', 'ai search', 'aravind srinivas'],
    founded: 2022, logo: '🔍', website: 'https://perplexity.ai' },
  { id: 'jasper', name: 'Jasper AI', region: 'us', country: 'USA', category: 'AI Content', specialty: 'AI marketing content generation',
    products: ['Jasper', 'Jasper for Business', 'Jasper Chat'],
    searchKeywords: ['jasper ai', 'ai content', 'ai marketing', 'ai writing'],
    founded: 2021, logo: '✍️', website: 'https://jasper.ai' },
  { id: 'runway', name: 'Runway', region: 'us', country: 'USA', category: 'AI Video', specialty: 'AI video generation and editing',
    products: ['Gen-3 Alpha', 'Gen-2', 'RunwayML'],
    searchKeywords: ['runway', 'gen-3', 'ai video', 'video generation', 'runwayml'],
    founded: 2018, logo: '🎬', website: 'https://runwayml.com' },
  { id: 'midjourney', name: 'Midjourney', region: 'us', country: 'USA', category: 'AI Image', specialty: 'AI image generation through Discord',
    products: ['Midjourney v6', 'Midjourney v7', 'Niji'],
    searchKeywords: ['midjourney', 'ai art', 'image generation', 'david holz'],
    founded: 2021, logo: '🎨', website: 'https://midjourney.com' },
  { id: 'elevenlabs', name: 'ElevenLabs', region: 'us', country: 'USA', category: 'AI Audio', specialty: 'AI voice synthesis, text-to-speech, dubbing',
    products: ['ElevenLabs API', 'Voice Cloning', 'Dubbing', 'Voice Library'],
    searchKeywords: ['elevenlabs', 'ai voice', 'text to speech', 'tts', 'voice cloning'],
    founded: 2022, logo: '🎙️', website: 'https://elevenlabs.io' },

  // ══════════════════════════════════════════════════════
  // 🇨🇳 CHINA — Foundation Models & Tech Giants
  // ══════════════════════════════════════════════════════
  { id: 'alibaba-cloud', name: 'Alibaba Cloud (Tongyi)', region: 'asia', country: 'China', category: 'Foundation Models', specialty: 'Qwen models, Tongyi Qianwen, cloud AI',
    products: ['Qwen 3', 'Qwen 2.5', 'Qwen-VL', 'Tongyi Qianwen', 'ModelScope'],
    searchKeywords: ['alibaba ai', 'qwen', 'tongyi', 'qianwen', 'modelscope', 'damo academy'],
    founded: 2009, logo: '🟠', website: 'https://aliyun.com' },
  { id: 'baidu-ernie', name: 'Baidu (Ernie Bot)', region: 'asia', country: 'China', category: 'Foundation Models', specialty: 'Ernie/Wenxin models, autonomous driving',
    products: ['Ernie 4.5', 'Ernie Bot', 'Wenxin Yiyan', 'Apollo Go'],
    searchKeywords: ['baidu ai', 'ernie', 'wenxin', 'ernie bot', 'robin li'],
    founded: 2000, logo: '🐶', website: 'https://yiyan.baidu.com' },
  { id: 'tencent-ai', name: 'Tencent AI Lab', region: 'asia', country: 'China', category: 'AI Research', specialty: 'Hunyuan models, gaming AI, social AI',
    products: ['Hunyuan-Large', 'Hunyuan-Pro', 'Tencent混元', 'Game AI'],
    searchKeywords: ['tencent ai', 'hunyuan', 'tencent混元', 'pony ma'],
    founded: 2016, logo: '🐧', website: 'https://ai.tencent.com' },
  { id: 'bytedance-doubao', name: 'ByteDance (Doubao)', region: 'asia', country: 'China', category: 'Foundation Models', specialty: 'Doubao/Skylark models, content AI',
    products: ['Doubao', 'Skylark', '豆包', 'Dreamina', 'Seed models'],
    searchKeywords: ['bytedance ai', 'doubao', 'skylark', '豆包', 'dreamina', 'seed'],
    founded: 2012, logo: '🎵', website: 'https://bytedance.com' },
  { id: 'zhipu-ai', name: 'Zhipu AI (GLM)', region: 'asia', country: 'China', category: 'Foundation Models', specialty: 'GLM series, ChatGLM, academic AI',
    products: ['GLM-4', 'GLM-4V', 'ChatGLM', 'CogVideoX', 'CodeGeeX'],
    searchKeywords: ['zhipu ai', 'glm', 'chatglm', 'cogvideo', 'codegeex', '智谱清言'],
    founded: 2019, logo: '🎓', website: 'https://zhipuai.cn' },
  { id: 'minimax', name: 'MiniMax', region: 'asia', country: 'China', category: 'Foundation Models', specialty: 'abab models, AI companions, video generation',
    products: ['abab 7', 'Hailuo Video', 'MiniMax API', '海螺AI'],
    searchKeywords: ['minimax', 'abab', 'hailuo', '海螺ai', 'yan junjie'],
    founded: 2021, logo: '🔘', website: 'https://minimaxi.com' },
  { id: 'moonshot-ai', name: 'Moonshot AI (Kimi)', region: 'asia', country: 'China', category: 'Foundation Models', specialty: 'Long-context LLMs, Kimi chatbot',
    products: ['Kimi k2', 'Moonshot-v1', 'Kimi Chat'],
    searchKeywords: ['moonshot ai', 'kimi', 'moonshot', '月之暗面', 'yang zhilin'],
    founded: 2023, logo: '🌙', website: 'https://kimi.moonshot.cn' },
  { id: 'deepseek-ai', name: 'DeepSeek', region: 'asia', country: 'China', category: 'Foundation Models', specialty: 'DeepSeek-V3, DeepSeek-R1 reasoning models',
    products: ['DeepSeek-V3', 'DeepSeek-R1', 'DeepSeek-Coder', 'Janus'],
    searchKeywords: ['deepseek', 'deepseek r1', 'deepseek v3', 'deepseek coder', 'liang wenfeng'],
    founded: 2023, logo: '🐋', website: 'https://deepseek.com' },
  { id: 'stepfun', name: 'StepFun (Step-1)', region: 'asia', country: 'China', category: 'Foundation Models', specialty: 'Step series models, multi-modal AI',
    products: ['Step-2', 'Step-1V', 'Step-Audio', 'StepFun'],
    searchKeywords: ['stepfun', 'step ai', 'step-1', 'step-2'],
    founded: 2023, logo: '👣', website: 'https://stepfun.com' },
  { id: '01ai', name: '01.AI (Yi)', region: 'asia', country: 'China', category: 'Foundation Models', specialty: 'Yi series, large language models',
    products: ['Yi-Lightning', 'Yi-Large', 'Yi-Vision', 'Yi-Coder'],
    searchKeywords: ['01.ai', 'yi models', 'yi-lightning', 'kai-fu lee', '零一万物'],
    founded: 2023, logo: '01️⃣', website: 'https://01.ai' },

  // ══════════════════════════════════════════════════════
  // 🇯🇵 JAPAN — AI Companies
  // ══════════════════════════════════════════════════════
  { id: 'sakura-ai', name: 'Sakura AI', region: 'asia', country: 'Japan', category: 'Foundation Models', specialty: 'Japanese-optimized LLMs, open-source',
    products: ['Sakura-9B', 'Sakura-14B', 'Sakura-34B'],
    searchKeywords: ['sakura ai', 'japanese llm', 'sakura model'],
    founded: 2024, logo: '🌸', website: 'https://sakura-ai.com' },
  { id: 'rinna', name: 'Rinna', region: 'asia', country: 'Japan', category: 'Foundation Models', specialty: 'Japanese language models, conversational AI',
    products: ['Rinna-3.6B', 'Rinna-13B'],
    searchKeywords: ['rinna', 'japanese ai', 'rinna model'],
    founded: 2020, logo: '🗣️', website: 'https://rinna.co.jp' },
  { id: 'preferred-networks', name: 'Preferred Networks', region: 'asia', country: 'Japan', category: 'AI Research', specialty: 'Deep learning, industrial AI, robotics',
    products: ['MN-3', 'Plaide', 'PFC'],
    searchKeywords: ['preferred networks', 'pfn', 'mn-3'],
    founded: 2014, logo: '🏋️', website: 'https://preferred-networks.jp' },
  { id: 'sony-ai', name: 'Sony AI', region: 'asia', country: 'Japan', category: 'AI Research', specialty: 'AI gaming, sensing, gastronomy',
    products: ['Gaming AI', 'Gran Turismo Sophy', 'AI sensing'],
    searchKeywords: ['sony ai', 'sophy', 'gran turismo ai'],
    founded: 2020, logo: '🎮', website: 'https://ai.sony' },

  // ══════════════════════════════════════════════════════
  // 🇰🇷 SOUTH KOREA — AI Companies
  // ══════════════════════════════════════════════════════
  { id: 'samsung-ai', name: 'Samsung AI (Naver)', region: 'asia', country: 'South Korea', category: 'AI Research', specialty: 'HyperCLOVA, Samsung Gauss, semiconductor AI',
    products: ['HyperCLOVA X', 'Samsung Gauss', 'Galaxy AI'],
    searchKeywords: ['samsung ai', 'hyperclova', 'samsung gauss', 'galaxy ai', 'naver ai'],
    founded: 2022, logo: '📱', website: 'https://ai.samsung.com' },
  { id: 'kakao-ai', name: 'Kakao Enterprise', region: 'asia', country: 'South Korea', category: 'AI Platform', specialty: 'Korean AI, KoGPT, Mi:da',
    products: ['KoGPT', 'Mi:da', 'Kanana'],
    searchKeywords: ['kakao ai', 'kogpt', 'korean ai', 'kanana'],
    founded: 2018, logo: '💬', website: 'https://kakaoenterprise.com' },
  { id: 'upstage-ai', name: 'Upstage AI', region: 'asia', country: 'South Korea', category: 'Foundation Models', specialty: 'Solar LLM, enterprise AI solutions',
    products: ['Solar Mini', 'Solar Pro', 'Document AI'],
    searchKeywords: ['upstage', 'solar llm', 'korean ai startup'],
    founded: 2022, logo: '⬆️', website: 'https://upstage.ai' },
  { id: 'lg-ai', name: 'LG AI Research', region: 'asia', country: 'South Korea', category: 'AI Research', specialty: 'EXAONE models, multi-modal AI',
    products: ['EXAONE 3.5', 'EXAONE 3.0'],
    searchKeywords: ['lg ai', 'exaone', 'lg ai research'],
    founded: 2020, logo: '🧪', website: 'https://lg-ai.co.kr' },

  // ══════════════════════════════════════════════════════
  // 🇸🇬🇮🇳🇦🇪 ASIA — Other Major AI Companies
  // ══════════════════════════════════════════════════════
  { id: 'alibaba-singapore', name: 'Sea Group (Sea AI Lab)', region: 'asia', country: 'Singapore', category: 'AI Research', specialty: 'Southeast Asian AI, multilingual NLP',
    products: ['SeaLLM', 'Sea AI Lab models'],
    searchKeywords: ['sea ai lab', 'seallm', 'southeast asia ai'],
    founded: 2020, logo: '🌊', website: 'https://sea.com' },
  { id: 'wzb-ai', name: 'Wiz AI', region: 'asia', country: 'Singapore', category: 'Enterprise AI', specialty: 'Conversational AI for enterprise',
    products: ['Wiz AI Platform', 'Voice AI'],
    searchKeywords: ['wiz ai', 'singapore ai'],
    founded: 2019, logo: '🧙', website: 'https://wiz.ai' },
  { id: 'g42-uae', name: 'G42 (UAE)', region: 'asia', country: 'UAE', category: 'Foundation Models', specialty: 'Jais Arabic LLM, national AI initiatives',
    products: ['Jais 2', 'NANDA', 'ClimateAI'],
    searchKeywords: ['g42', 'jais', 'uae ai', 'arabic llm'],
    founded: 2018, logo: '🏗️', website: 'https://g42.ai' },
  { id: 'stability-ai', name: 'Stability AI', region: 'europe', country: 'UK', category: 'AI Image', specialty: 'Stable Diffusion, generative AI',
    products: ['Stable Diffusion 4', 'Stable Diffusion 3.5', 'Stable Cascade'],
    searchKeywords: ['stability ai', 'stable diffusion', 'emad mostaque'],
    founded: 2019, logo: '🖼️', website: 'https://stability.ai' },
  { id: 'aleph-alpha', name: 'Aleph Alpha', region: 'europe', country: 'Germany', category: 'Foundation Models', specialty: 'European sovereign AI, Luminous models',
    products: ['Luminous', 'Pharia'],
    searchKeywords: ['aleph alpha', 'european ai', 'luminous', 'pharia'],
    founded: 2019, logo: '🔤', website: 'https://aleph-alpha.com' },

  // ══════════════════════════════════════════════════════
  // 🇺🇸 More US AI Companies
  // ══════════════════════════════════════════════════════
  { id: 'anthropic-constitutional', name: 'Adept AI', region: 'us', country: 'USA', category: 'AI Agent', specialty: 'AI agents that use software',
    products: ['ACT-1', 'Apt'],
    searchKeywords: ['adept ai', 'ai agent', 'act-1'],
    founded: 2022, logo: '🤝', website: 'https://adept.ai' },
  { id: 'cursor', name: 'Cursor (Anysphere)', region: 'us', country: 'USA', category: 'AI Developer Tools', specialty: 'AI-first code editor',
    products: ['Cursor Pro', 'Cursor Agent', 'Tab completion'],
    searchKeywords: ['cursor', 'cursor ai', 'anysphere', 'ai code editor'],
    founded: 2022, logo: '↗️', website: 'https://cursor.com' },
  { id: 'vercel-ai', name: 'Vercel (AI SDK)', region: 'us', country: 'USA', category: 'AI Framework', specialty: 'AI SDK for building AI applications',
    products: ['Vercel AI SDK', 'v0', 'ai chatbot sdk'],
    searchKeywords: ['vercel ai sdk', 'vercel ai', 'ai sdk'],
    founded: 2020, logo: '▲', website: 'https://vercel.com' },
]

/** Category groups for the news page */
export const COMPANY_CATEGORIES = [
  { key: 'all', label: 'All Companies' },
  { key: 'us', label: '🇺🇸 American Companies' },
  { key: 'asia', label: '🌏 Asian Companies' },
  { key: 'Foundation Models', label: 'Foundation Models' },
  { key: 'AI Infrastructure', label: 'AI Infrastructure' },
  { key: 'AI Platform', label: 'AI Platforms' },
  { key: 'AI Agent', label: 'AI Agents' },
  { key: 'AI Video', label: 'AI Video & Image' },
  { key: 'AI Audio', label: 'AI Audio' },
  { key: 'Enterprise AI', label: 'Enterprise AI' },
  { key: 'AI Framework', label: 'AI Frameworks' },
  { key: 'AI Hardware', label: 'AI Hardware' },
  { key: 'AI Search', label: 'AI Search' },
  { key: 'AI Research', label: 'AI Research' },
]

/** Get companies by filter */
export function getCompaniesByFilter(filter: string): AICompany[] {
  if (filter === 'all') return AI_COMPANIES
  return AI_COMPANIES.filter(c =>
    c.region === filter ||
    c.category === filter
  )
}

/** Match news text to relevant companies */
export function matchCompanies(text: string): AICompany[] {
  const lower = text.toLowerCase()
  return AI_COMPANIES.filter(c => {
    return c.searchKeywords.some(kw => lower.includes(kw.toLowerCase()))
  })
}

/** Smart search queries for news fetching — organized by focus area */
export const NEWS_SEARCH_QUERIES = [
  // Foundation Model Updates
  'GPT OpenAI latest news update 2026',
  'Claude Anthropic new features release',
  'Gemini Google AI latest update',
  'Llama Meta AI open source model release',
  'DeepSeek new model announcement',
  'Qwen Alibaba Tongyi latest release',
  'Mistral AI model update release',
  'xAI Grok new features update',

  // AI Agents & Tools
  'AI agents autonomous tools latest 2026',
  'AI copilot developer tools new release',
  'AI coding assistant new features',
  'AI automation workflow tools update',

  // AI Video & Image
  'AI video generation new model Sora Runway 2026',
  'AI image generation Midjourney Stable Diffusion update',
  'AI music and audio generation new tools',

  // Enterprise & Industry
  'enterprise AI platform new features 2026',
  'AI chip GPU NVIDIA AMD latest news',
  'AI regulation policy news 2026',

  // Asian AI
  'Chinese AI companies latest news update 2026',
  'Japan Korea AI startup new release',
  'Asia AI technology news breakthrough',

  // Research & New Models
  'new AI model benchmark release leaderboard',
  'AI research paper breakthrough 2026',
  'AI startup funding investment news',
]
