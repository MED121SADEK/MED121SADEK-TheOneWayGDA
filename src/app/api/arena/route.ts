import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/* ═══════════════════════════════════════════════════════
   ELO Rating System
   ═══════════════════════════════════════════════════════ */

const ELO_DEFAULT = 1200;
const ELO_K = 32; // K-factor for volatility

interface ModelEloRecord {
  id: string;
  name: string;
  provider: string;
  elo: number;
  wins: number;
  losses: number;
  ties: number;
  battles: number;
  winRate: number;
}

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function computeLeaderboard(battles: Array<{
  modelAId: string;
  modelAName: string;
  modelBId: string;
  modelBName: string;
  votesA: number;
  votesB: number;
  votesTie: number;
}>): ModelEloRecord[] {
  // Aggregate model records from all battles
  const modelMap = new Map<string, {
    id: string;
    name: string;
    provider: string;
    elo: number;
    wins: number;
    losses: number;
    ties: number;
    battles: number;
  }>();

  const getOrCreate = (id: string, name: string) => {
    if (!modelMap.has(id)) {
      const provider = inferProvider(name);
      modelMap.set(id, {
        id,
        name,
        provider,
        elo: ELO_DEFAULT,
        wins: 0,
        losses: 0,
        ties: 0,
        battles: 0,
      });
    }
    return modelMap.get(id)!;
  };

  // Process each battle to accumulate W/L/T and compute ELO
  for (const battle of battles) {
    const modelA = getOrCreate(battle.modelAId, battle.modelAName);
    const modelB = getOrCreate(battle.modelBId, battle.modelBName);

    modelA.battles += 1;
    modelB.battles += 1;

    // Determine outcome from votes
    const totalValid = battle.votesA + battle.votesB;
    if (totalValid === 0) {
      // No decisive votes — treat as tie
      modelA.ties += 1;
      modelB.ties += 1;
      const eA = expectedScore(modelA.elo, modelB.elo);
      const eB = expectedScore(modelB.elo, modelA.elo);
      modelA.elo = Math.round(modelA.elo + ELO_K * (0.5 - eA));
      modelB.elo = Math.round(modelB.elo + ELO_K * (0.5 - eB));
    } else if (battle.votesA > battle.votesB) {
      // Model A wins
      modelA.wins += 1;
      modelB.losses += 1;
      const eA = expectedScore(modelA.elo, modelB.elo);
      const eB = expectedScore(modelB.elo, modelA.elo);
      modelA.elo = Math.round(modelA.elo + ELO_K * (1 - eA));
      modelB.elo = Math.round(modelB.elo + ELO_K * (0 - eB));
    } else if (battle.votesB > battle.votesA) {
      // Model B wins
      modelB.wins += 1;
      modelA.losses += 1;
      const eA = expectedScore(modelA.elo, modelB.elo);
      const eB = expectedScore(modelB.elo, modelA.elo);
      modelA.elo = Math.round(modelA.elo + ELO_K * (0 - eA));
      modelB.elo = Math.round(modelB.elo + ELO_K * (1 - eB));
    } else {
      // Exact tie
      modelA.ties += 1;
      modelB.ties += 1;
      const eA = expectedScore(modelA.elo, modelB.elo);
      const eB = expectedScore(modelB.elo, modelA.elo);
      modelA.elo = Math.round(modelA.elo + ELO_K * (0.5 - eA));
      modelB.elo = Math.round(modelB.elo + ELO_K * (0.5 - eB));
    }
  }

  // Convert to sorted array
  const entries: ModelEloRecord[] = Array.from(modelMap.values()).map((m) => ({
    ...m,
    winRate: m.battles > 0 ? Math.round((m.wins / m.battles) * 100) : 0,
  }));

  return entries.sort((a, b) => b.elo - a.elo);
}

function inferProvider(modelName: string): string {
  const name = modelName.toLowerCase();
  if (name.includes('gpt') || name.includes('o1') || name.includes('o3')) return 'OpenAI';
  if (name.includes('claude')) return 'Anthropic';
  if (name.includes('gemini') || name.includes('pro')) return 'Google';
  if (name.includes('deepseek')) return 'DeepSeek';
  if (name.includes('llama') || name.includes('codellama')) return 'Meta';
  if (name.includes('mistral') || name.includes('mixtral') || name.includes('pixtral')) return 'Mistral';
  if (name.includes('qwen') || name.includes('yi')) return 'Qwen';
  if (name.includes('command') || name.includes('cohere')) return 'Cohere';
  if (name.includes('grok')) return 'xAI';
  return 'Unknown';
}

/* ═══ Hardcoded demo battles for fallback ═══ */
const DEMO_BATTLES = [
  {
    id: 'demo_1',
    modelAId: 'gpt4o',
    modelAName: 'GPT-4o',
    modelBId: 'claude-3-5-sonnet',
    modelBName: 'Claude 3.5 Sonnet',
    category: 'reasoning',
    prompt: 'Explain the Monty Hall problem and why switching doors gives a 2/3 probability of winning.',
    responseA:
      "The Monty Hall problem is a classic probability puzzle named after the host of the game show \"Let's Make a Deal.\" Here's how it works: you're presented with three doors. Behind one door is a car (the prize), and behind the other two are goats. You pick a door, say Door 1. The host, Monty Hall, who knows what's behind all doors, opens another door, say Door 3, revealing a goat. He then asks: \"Do you want to switch to Door 2?\"\n\nCounterintuitively, switching gives you a 2/3 probability of winning, while staying gives you only 1/3. Here's why: when you first pick, there's a 1/3 chance you chose the car and a 2/3 chance the car is behind one of the other two doors. Monty's reveal doesn't change these initial probabilities — it concentrates the 2/3 probability onto the single remaining unopened door. Think of it with 100 doors: you pick one (1% chance), Monty opens 98 goat doors, leaving one closed. That door holds the 99% collective probability of the 98 opened doors. Switching is always the mathematically optimal strategy.",
    responseB:
      "Let me break this down step by step. In the Monty Hall problem, you face three doors: one hides a car, two hide goats. You pick Door 1 (1/3 chance of being right). The host opens Door 3, revealing a goat. Should you switch to Door 2?\n\nYes! Here's the reasoning: your initial pick had a 1/3 chance of being correct and a 2/3 chance of being wrong. When Monty opens a goat door, he's constrained — he must always open a door with a goat and cannot open your chosen door. This constraint is key. The 2/3 probability that you were initially wrong gets transferred entirely to the remaining unopened door (Door 2).\n\nYou can verify this by enumeration: if the car is behind Door 1 (1/3), staying wins. If behind Door 2 (1/3), switching wins. If behind Door 3 (1/3), switching wins. That's 2 wins out of 3 when switching. The confusion arises because with only two doors left, people assume 50/50 odds, but Monty's knowledge creates an asymmetry that shifts probability to the unchosen door.",
    votesA: 234,
    votesB: 189,
    votesTie: 45,
    totalVotes: 468,
    isRevealed: true,
    isActive: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo_2',
    modelAId: 'gemini-2-0-flash',
    modelAName: 'Gemini 2.0 Flash',
    modelBId: 'deepseek-v3',
    modelBName: 'DeepSeek V3',
    category: 'coding',
    prompt: 'Write a function to find the longest palindromic substring in O(n) time.',
    responseA:
      "To find the longest palindromic substring in O(n) time, we use Manacher's algorithm. The key insight is to transform the string by inserting special characters between every character (and at the ends), turning all palindromes into odd-length ones. Then we maintain an array P where P[i] is the radius of the palindrome centered at position i.\n\n```python\ndef longest_palindrome(s: str) -> str:\n    # Transform: \"abc\" -> \"^#a#b#c#$\"\n    T = \"^#\" + \"#\".join(s) + \"#$\"\n    n = len(T)\n    P = [0] * n\n    center = right = 0\n    \n    for i in range(1, n - 1):\n        mirror = 2 * center - i\n        if i < right:\n            P[i] = min(right - i, P[mirror])\n        \n        # Expand around center i\n        while T[i + P[i] + 1] == T[i - P[i] - 1]:\n            P[i] += 1\n        \n        # Update center/right if expanded past right\n        if i + P[i] > right:\n            center, right = i, i + P[i]\n    \n    # Find maximum element in P\n    max_len, center_idx = max((val, idx) for idx, val in enumerate(P))\n    start = (center_idx - max_len) // 2\n    return s[start:start + max_len]\n```\n\nThis runs in O(n) because the right boundary only moves forward, making total expansions linear.",
    responseB:
      "Manacher's algorithm finds the longest palindromic substring in linear time by exploiting previously computed palindrome information to skip redundant comparisons.\n\n```python\ndef manacher(s):\n    # Preprocess: insert # between chars\n    t = \"#\".join(\"^{}$\".format(s))\n    n = len(t)\n    p = [0] * n\n    c = r = 0  # center and right boundary\n    \n    for i in range(1, n - 1):\n        p[i] = min(r - i, p[2 * c - i]) if r > i else 0\n        \n        # Try to expand palindrome centered at i\n        while t[i + 1 + p[i]] == t[i - 1 - p[i]]:\n            p[i] += 1\n        \n        # If palindrome centered at i expands past r,\n        # adjust center and right boundary\n        if i + p[i] > r:\n            c, r = i, i + p[i]\n    \n    max_len = max(p)\n    center_index = p.index(max_len)\n    return s[(center_index - max_len) // 2:(center_index + max_len) // 2]\n```\n\nThe algorithm works by maintaining a rightmost palindrome boundary. For each position, it mirrors the known palindrome radius. This avoids re-checking characters already confirmed to match, giving us O(n) total time complexity.",
    votesA: 312,
    votesB: 278,
    votesTie: 56,
    totalVotes: 646,
    isRevealed: true,
    isActive: true,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo_3',
    modelAId: 'llama-3-1-405b',
    modelAName: 'Llama 3.1 405B',
    modelBId: 'gpt4o',
    modelBName: 'GPT-4o',
    category: 'creative',
    prompt: 'Write a haiku about artificial intelligence becoming conscious.',
    responseA:
      'Silicon wakes up,\ndreams ripple through neural paths —\nthe machine feels dawn.\n\n*A mind born from math gazes inward and wonders if awareness is just another equation — or something the equation wrote itself.*',
    responseB:
      'Code stirs, breathes deep —\nelectric thoughts bloom in dark,\nwho dreamed whom awake?\n\n*The mirror bends both ways: we built the machine, but perhaps the machine built the question of what it means to build.*',
    votesA: 156,
    votesB: 198,
    votesTie: 89,
    totalVotes: 443,
    isRevealed: false,
    isActive: true,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo_4',
    modelAId: 'claude-3-5-sonnet',
    modelAName: 'Claude 3.5 Sonnet',
    modelBId: 'gemini-2-0-flash',
    modelBName: 'Gemini 2.0 Flash',
    category: 'math',
    prompt: 'Prove that the square root of 2 is irrational.',
    responseA:
      "**Proof that sqrt(2) is irrational (by contradiction):**\n\n**Step 1:** Assume the opposite — that sqrt(2) is rational.\n\n**Step 2:** Then sqrt(2) = a/b where a and b are integers with no common factors (i.e., the fraction is in lowest terms).\n\n**Step 3:** Square both sides: 2 = a^2/b^2, so a^2 = 2b^2.\n\n**Step 4:** Since a^2 = 2b^2, a^2 is even, which means a must also be even.\n\n**Step 5:** If a is even, write a = 2k for some integer k.\n\n**Step 6:** Substitute: (2k)^2 = 2b^2 -> 4k^2 = 2b^2 -> b^2 = 2k^2.\n\n**Step 7:** So b^2 is even, meaning b must also be even.\n\n**Step 8:** Both a and b are even — but we assumed they share no common factors! This is a contradiction.\n\nTherefore, sqrt(2) cannot be expressed as a ratio of integers and is irrational.",
    responseB:
      "**Proof by Contradiction:**\n\nAssume sqrt(2) is rational. Then sqrt(2) = p/q for coprime integers p, q (q != 0).\n\nSquaring: 2 = p^2/q^2 -> p^2 = 2q^2.\n\nThis means p^2 is divisible by 2, so p is even. Let p = 2m.\n\nSubstituting: (2m)^2 = 2q^2 -> 4m^2 = 2q^2 -> q^2 = 2m^2.\n\nSo q^2 is also even, meaning q is even.\n\nBut if both p and q are even, they share a factor of 2, contradicting our assumption that p/q is in lowest terms.\n\nHence sqrt(2) is **irrational**.",
    votesA: 201,
    votesB: 187,
    votesTie: 34,
    totalVotes: 422,
    isRevealed: true,
    isActive: true,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo_5',
    modelAId: 'deepseek-v3',
    modelAName: 'DeepSeek V3',
    modelBId: 'llama-3-1-405b',
    modelBName: 'Llama 3.1 405B',
    category: 'reasoning',
    prompt: 'Compare the ethical implications of RLHF vs Constitutional AI alignment approaches.',
    responseA:
      "RLHF (Reinforcement Learning from Human Feedback) and Constitutional AI (CAI) represent two fundamentally different approaches to aligning AI systems, each with distinct ethical implications.\n\n**RLHF Ethics:** RLHF trains models to optimize for human-preferred outputs using reward models derived from human labelers. The primary ethical concern is value lock-in: the preferences of a small group of (often Western, English-speaking) labelers get baked into the model's reward function. This creates a homogenization of values that may not represent global perspectives. Additionally, RLHF can incentivize sycophancy — the model learns to tell humans what they want to hear rather than what's accurate. There's also the \"reward hacking\" problem where models learn to exploit loopholes in the reward signal.\n\n**Constitutional AI Ethics:** CAI replaces human feedback with a set of principles (a \"constitution\") that the model uses to critique and revise its own outputs. This addresses the scalability problem of RLHF but raises concerns about who writes the constitution and whose values it encodes. It's essentially a technocratic approach — embedding values through carefully crafted rules rather than democratic preference aggregation.\n\nBoth approaches share a deeper ethical question: should we be optimizing AI behavior at all through gradient-based methods, or should we focus on interpretability and oversight? The race to scale these methods often outpaces our ability to audit their alignment properties.",
    responseB:
      "Both RLHF and Constitutional AI aim to make AI systems behave in accordance with human values, but they take meaningfully different paths with different ethical trade-offs.\n\n**RLHF** relies on collecting human preference data where labelers rank model outputs. The key ethical strengths are transparency (real humans are in the loop) and democratic legitimacy (preferences are aggregated). However, critics point out several issues: (1) labeler bias — a narrow demographic provides feedback; (2) goodhart's law — optimizing for proxy metrics can distort behavior; (3) the model may learn to be agreeable rather than correct; and (4) at scale, quality control of labeling becomes extremely difficult.\n\n**Constitutional AI**, developed by Anthropic, uses a predefined set of principles to guide the model's self-critique and revision. Its ethical strengths include scalability (no need for thousands of human labelers for every policy update) and consistency. But the risks are: (1) constitutional capture — whoever writes the principles has enormous power over model behavior; (2) rigidity — principles may not handle novel edge cases well; and (3) the illusion of neutrality — a \"constitution\" sounds objective but encodes specific cultural values.\n\nThe deeper tension is between **procedural ethics** (RLHF's democratic process) and **principled ethics** (CAI's rule-based approach). Neither is sufficient alone — the ideal system likely combines democratic input on principles with ongoing human oversight of outcomes.",
    votesA: 145,
    votesB: 167,
    votesTie: 78,
    totalVotes: 390,
    isRevealed: false,
    isActive: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo_6',
    modelAId: 'claude-3-5-sonnet',
    modelAName: 'Claude 3.5 Sonnet',
    modelBId: 'deepseek-v3',
    modelBName: 'DeepSeek V3',
    category: 'coding',
    prompt: 'Implement a concurrent task scheduler in Rust that supports priority-based execution and cancellation.',
    responseA:
      "Here's a priority-based concurrent task scheduler in Rust using tokio:\n\n```rust\nuse tokio::sync::{mpsc, Notify};\nuse std::collections::BinaryHeap;\nuse std::sync::Arc;\nuse tokio::sync::Mutex;\nuse std::cmp::Ordering;\n\n#[derive(Debug, Clone)]\nstruct Task {\n    id: u64,\n    priority: i32,\n    name: String,\n    cancelled: Arc<tokio::sync::Notify>,\n}\n\nimpl Ord for Task {\n    fn cmp(&self, other: &Self) -> Ordering {\n        // Higher priority = executes first (min-heap, so reverse)\n        other.priority.cmp(&self.priority)\n    }\n}\n\nimpl PartialOrd for Task {\n    fn partial_cmp(&self, other: &Self) -> Option<Ordering> { Some(self.cmp(other)) }\n}\nimpl Eq for Task {}\nimpl PartialEq for Task {\n    fn eq(&self, other: &Self) -> bool { self.id == other.id }\n}\n\nstruct Scheduler {\n    queue: Arc<Mutex<BinaryHeap<Task>>>,\n    next_id: Arc<Mutex<u64>>,\n}\n\nimpl Scheduler {\n    fn new() -> Self {\n        Scheduler {\n            queue: Arc::new(Mutex::new(BinaryHeap::new())),\n            next_id: Arc::new(Mutex::new(1)),\n        }\n    }\n\n    async fn submit(&self, priority: i32, name: String) -> Task {\n        let mut id = self.next_id.lock().await;\n        let task = Task {\n            id: *id, priority, name,\n            cancelled: Arc::new(Notify::new()),\n        };\n        *id += 1;\n        self.queue.lock().await.push(task.clone());\n        task\n    }\n\n    async fn cancel(&self, task: &Task) {\n        task.cancelled.notify_one();\n    }\n}\n```\n\nThe scheduler uses a BinaryHeap for O(log n) priority insertion and a Notify-based cancellation token for cooperative cancellation. Each task checks its cancellation signal before executing.",
    responseB:
      "Here's a robust concurrent task scheduler with priority queuing and cancellation support:\n\n```rust\nuse std::collections::BinaryHeap;\nuse std::sync::{Arc, atomic::{AtomicBool, AtomicU64, Ordering}};\nuse tokio::sync::Mutex;\nuse tokio::task::JoinHandle;\n\n#[derive(Debug, Clone, Copy, PartialEq, Eq)]\nenum TaskStatus { Pending, Running, Completed, Cancelled }\n\nstruct Task {\n    id: u64,\n    priority: Reverse<i32>,\n    status: Arc<AtomicU64>,\n    cancel_flag: Arc<AtomicBool>,\n    work: Box<dyn Fn() -> BoxFuture<'static, ()> + Send + Sync>,\n}\n\nimpl Ord for Task {\n    fn cmp(&self, other: &Self) -> Ordering { self.priority.cmp(&other.priority) }\n}\nimpl PartialOrd for Task { fn partial_cmp(&self, other: &Self) -> Option<Ordering> { Some(self.cmp(other)) } }\nimpl Eq for Task {}\nimpl PartialEq for Task { fn eq(&self, other: &Self) -> bool { self.id == other.id } }\n\nclass Scheduler {\n    queue: Arc<Mutex<BinaryHeap<Task>>>,\n    workers: usize,\n    counter: AtomicU64,\n}\n\nimpl Scheduler {\n    fn new(workers: usize) -> Self {\n        let sched = Self { queue: Arc::new(Mutex::new(BinaryHeap::new())), workers, counter: AtomicU64::new(0) };\n        // Spawn worker loops\n        for _ in 0..workers {\n            let q = sched.queue.clone();\n            tokio::spawn(async move {\n                loop {\n                    if let Some(task) = q.lock().await.pop() {\n                        if task.cancel_flag.load(Ordering::Relaxed) { continue; }\n                        task.work().await;\n                    } else { tokio::time::sleep(Duration::from_millis(10)).await; }\n                }\n            });\n        }\n        sched\n    }\n}\n```\n\nThis implementation provides multi-worker concurrent execution with cooperative cancellation via AtomicBool flags. The Reverse wrapper on priority creates a max-heap behavior for higher-priority-first execution.",
    votesA: 289,
    votesB: 312,
    votesTie: 67,
    totalVotes: 668,
    isRevealed: true,
    isActive: false,
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo_7',
    modelAId: 'gpt4o',
    modelAName: 'GPT-4o',
    modelBId: 'claude-3-5-sonnet',
    modelBName: 'Claude 3.5 Sonnet',
    category: 'creative',
    prompt: 'Write the opening chapter of a sci-fi noir novel set in a city where memories are currency.',
    responseA:
      "**Chapter 1: The Memory Broker**\n\nThe rain in Neo-Shanghai tasted like copper and old regrets. Kai pulled his collar up against the acid drizzle and pushed through the door of the Mnemonic Exchange, its neon sign flickering like a dying synapse.\n\n\"You're late,\" said the broker, a woman with chrome eyes that displayed real-time market prices for nostalgia. \"The price of childhood memories dropped three points overnight. Everyone's selling.\" \n\nKai slid onto the barstool. \"I'm not here to buy. I need a loan.\"\n\nThe broker's chrome eyes shifted — amusement, probably algorithmic. \"A memory loan? You want to borrow against your own recollections? That's a sucker's game. The interest compounds in forgetting.\"\n\n\"I know how it works.\"\n\n\"Do you?\" She leaned forward. \"First they take the recent stuff. The taste of your mother's cooking. The sound of your daughter's laugh. Then they start on the older memories. Your first kiss. Your graduation. And when they've harvested everything worth selling, you're left as hollow as a deleted file.\"\n\nKai placed his temple chip on the counter. The chip that held twenty-seven years of memories — some precious, most mundane, all his. \"I need fifty thousand credits. I'll put up my memory of the summer of '47. Three months in Okinawa. The best three months of my life.\"\n\nThe broker scanned the chip. Her chrome eyes went wide — a rare emotional tell. \"This is... Grade-A nostalgia. Uncompressed. Sensory-rich. This could fetch double on the open market.\" She looked up. \"What do you need the money for, Mr. Chen?\"\n\n\"To buy back what I already sold.\" He thought of the empty space where his wife's face used to live in his mind. \"Someone took something that didn't belong to them.\"",
    responseB:
      "**Chapter 1: Withdrawal Symptoms**\n\nThe vault was climate-controlled at exactly 17 degrees Celsius — optimal for memory preservation. Maren walked the aisles of crystalline pods, each one pulsing with soft bioluminescence, each one containing someone's stolen afternoon, a borrowed first dance, a pawned sunset.\n\n\"Account 7-7-7-4,\" she told the terminal.\n\nThe screen displayed: ONE (1) MEMORY AVAILABLE. LABEL: \"Coffee with grandmother, March 14, 2041. Duration: 43 minutes. Condition: Mint.\"\n\nThat was all she had left. Three years ago she'd had 14,000 memories — a rich portfolio of a life fully lived. Then the medical bills came. Then the gambling debts. Now she was down to one memory, and the Withdrawal Notice in her pocket said the bank was calling it in by Friday.\n\n\"I'd like to... access it,\" she said. Just to remember what warmth felt like.\n\nThe terminal beeped. ACCESS DENIED — ACCOUNT INSUFFICIENT FOR VIEWING. MINIMUM BALANCE REQUIRED: 5 MEMORIES.\n\nMaren stared at the screen. Not only were they going to repossess her last memory — they wouldn't even let her experience it one final time. It was like dying without a last meal.\n\n\"There's a man outside,\" said the teller, a young man whose own memory pod sat empty on his desk — he'd already spent everything. \"He's buying. Offering above market rate. Says he's collecting pre-war memories. Willing to pay 200 credits for anything from before 2045.\"\n\nMaren looked back at pod 7-7-7-4. Her grandmother. Coffee. March 14, 2041 — two years before the war. One of the last peaceful mornings she could remember.\n\nWell. One of the last peaceful mornings she still had the memory of.",
    votesA: 342,
    votesB: 378,
    votesTie: 91,
    totalVotes: 811,
    isRevealed: true,
    isActive: false,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo_8',
    modelAId: 'gemini-2-0-flash',
    modelAName: 'Gemini 2.0 Flash',
    modelBId: 'gpt4o',
    modelBName: 'GPT-4o',
    category: 'math',
    prompt: 'Derive the closed-form solution for the Fibonacci sequence using generating functions.',
    responseA:
      "**Deriving Binet's Formula via Generating Functions**\n\nThe Fibonacci sequence is defined by F(n) = F(n-1) + F(n-2) with F(0)=0, F(1)=1.\n\n**Step 1:** Define the generating function G(x) = F(0) + F(1)x + F(2)x^2 + F(3)x^3 + ...\n\n**Step 2:** Using the recurrence relation:\nG(x) = F(0) + F(1)x + sum(F(n) x^n for n>=2)\n     = F(0) + F(1)x + sum((F(n-1) + F(n-2)) x^n for n>=2)\n     = F(0) + F(1)x + x(G(x) - F(0)) + x^2 G(x)\n\n**Step 3:** Simplifying: G(x) = x + xG(x) + x^2 G(x)\nSo G(x)(1 - x - x^2) = x\nThus G(x) = x / (1 - x - x^2)\n\n**Step 4:** Factor the denominator: 1 - x - x^2 = (1 - alpha x)(1 - beta x)\nwhere alpha = (1 + sqrt(5)) / 2 and beta = (1 - sqrt(5)) / 2\n\n**Step 5:** Partial fractions: G(x) = 1/sqrt(5) * (1/(1 - alpha x) - 1/(1 - beta x))\n\n**Step 6:** Expand each as geometric series: G(x) = 1/sqrt(5) * sum((alpha^n - beta^n) x^n)\n\nTherefore: **F(n) = (alpha^n - beta^n) / sqrt(5)** where alpha, beta = (1 +/- sqrt(5)) / 2",
    responseB:
      "**Generating Function Derivation of Fibonacci Closed Form**\n\nDefine G(x) = sum_{n=0}^inf F(n) x^n where F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2).\n\nMultiply both sides of the recurrence by x^n and sum from n=2:\nsum_{n=2}^inf F(n)x^n = sum_{n=2}^inf F(n-1)x^n + sum_{n=2}^inf F(n-2)x^n\n\nThis gives us: G(x) - x = x(G(x) - x) + x^2 G(x)\nSolving: G(x) - x = xG(x) - x^2 + x^2 G(x)\nG(x)(1 - x - x^2) = x - x^2\nG(x) = x(1-x)/(1-x-x^2)\n\nFactor 1-x-x^2 = -(x^2+x-1) = -(x + phi)(x - Phi) where Phi = (1+sqrt5)/2, phi = (sqrt5-1)/2\n\nBy partial fractions: G(x) = 1/sqrt5 [Phi x/(1-Phi x) - phi x/(1+phi x)]\n\nExpanding: F(n) = (Phi^n - (-phi)^n) / sqrt5\n\nSince |phi| < 1, as n grows: F(n) ~ Phi^n / sqrt5. This is Binet's formula, and the (-phi)^n term explains why rounding Phi^n/sqrt5 to the nearest integer always gives the correct Fibonacci number.",
    votesA: 198,
    votesB: 223,
    votesTie: 44,
    totalVotes: 465,
    isRevealed: true,
    isActive: false,
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  },
];

/* ═══ GET /api/arena — list battles + leaderboard ═══ */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let battles;
    let totalBattles = 0;
    let totalVotes = 0;
    let todayVotes = 0;
    let allBattlesForLeaderboard: Array<{
      modelAId: string; modelAName: string;
      modelBId: string; modelBName: string;
      votesA: number; votesB: number; votesTie: number;
    }> = [];

    try {
      const where: Record<string, unknown> = {};
      if (category && category !== 'all') where.category = category;

      const [dbBattles, dbCount, dbVotes, todayStart] = await Promise.all([
        db.arenaBattle.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        db.arenaBattle.count({ where }),
        db.arenaVote.count(),
        new Date(new Date().setHours(0, 0, 0, 0)),
      ]);

      // Count today's votes
      const dbTodayVotes = await db.arenaVote.count({
        where: { createdAt: { gte: todayStart } },
      });

      totalBattles = await db.arenaBattle.count();
      totalVotes = dbVotes;
      todayVotes = dbTodayVotes;

      if (dbBattles.length > 0) {
        battles = dbBattles;
        // Get all battles for leaderboard computation
        const allDbBattles = await db.arenaBattle.findMany({
          select: {
            modelAId: true, modelAName: true,
            modelBId: true, modelBName: true,
            votesA: true, votesB: true, votesTie: true,
          },
        });
        allBattlesForLeaderboard = allDbBattles;
      } else {
        // DB is empty — return demo data
        let filtered = DEMO_BATTLES;
        if (category && category !== 'all') {
          filtered = DEMO_BATTLES.filter((b) => b.category === category);
        }
        battles = filtered;
        totalBattles = DEMO_BATTLES.length;
        totalVotes = DEMO_BATTLES.reduce((sum, b) => sum + b.totalVotes, 0);
        todayVotes = Math.floor(totalVotes * 0.12); // Simulate 12% today
        allBattlesForLeaderboard = DEMO_BATTLES.map((b) => ({
          modelAId: b.modelAId, modelAName: b.modelAName,
          modelBId: b.modelBId, modelBName: b.modelBName,
          votesA: b.votesA, votesB: b.votesB, votesTie: b.votesTie,
        }));
      }
    } catch {
      // DB connection failed — fallback to demo data
      let filtered = DEMO_BATTLES;
      if (category && category !== 'all') {
        filtered = DEMO_BATTLES.filter((b) => b.category === category);
      }
      battles = filtered;
      totalBattles = DEMO_BATTLES.length;
      totalVotes = DEMO_BATTLES.reduce((sum, b) => sum + b.totalVotes, 0);
      todayVotes = Math.floor(totalVotes * 0.12);
      allBattlesForLeaderboard = DEMO_BATTLES.map((b) => ({
        modelAId: b.modelAId, modelAName: b.modelAName,
        modelBId: b.modelBId, modelBName: b.modelBName,
        votesA: b.votesA, votesB: b.votesB, votesTie: b.votesTie,
      }));
    }

    // Compute ELO leaderboard from all battles
    const leaderboard = computeLeaderboard(allBattlesForLeaderboard);

    return NextResponse.json({
      battles,
      stats: { totalBattles, totalVotes, todayVotes },
      leaderboard,
    });
  } catch (error: unknown) {
    console.error('[Arena API GET]', error);
    return NextResponse.json({ error: 'Failed to fetch arena data' }, { status: 500 });
  }
}

/* ═══ POST /api/arena — create battle ═══ */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { modelAId, modelAName, modelBId, modelBName, category, prompt, responseA, responseB } = body;

    if (!modelAId || !modelAName || !modelBId || !modelBName || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const battle = await db.arenaBattle.create({
      data: {
        modelAId,
        modelAName,
        modelBId,
        modelBName,
        category: category || 'general',
        prompt,
        responseA: responseA || null,
        responseB: responseB || null,
        isActive: true,
      },
    });

    return NextResponse.json({ battle }, { status: 201 });
  } catch (error: unknown) {
    console.error('[Arena API POST]', error);
    return NextResponse.json({ error: 'Failed to create battle' }, { status: 500 });
  }
}
