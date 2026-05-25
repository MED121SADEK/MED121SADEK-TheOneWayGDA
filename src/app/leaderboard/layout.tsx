import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI Model Leaderboard — Compare GPT-4o, Claude 4, Gemini 2.5, DeepSeek",
  description:
    "Compare 19+ AI models across 6 benchmarks: GPQA Diamond, MMLU-Pro, HumanEval+, MATH-500, MT-Bench, IFEval. Live pricing, latency, and throughput data. Find the best AI model for your use case.",
  keywords: [
    "AI model leaderboard", "GPT-4o benchmark", "Claude 4 benchmark", "Gemini 2.5 benchmark",
    "DeepSeek benchmark", "Llama benchmark", "GPQA Diamond scores", "MMLU-Pro scores",
    "HumanEval+ code benchmark", "MATH-500 scores", "MT-Bench scores", "IFEval scores",
    "AI model comparison 2025", "best AI model", "LLM ranking", "AI model pricing",
    "model latency comparison", "AI model throughput", "GPT vs Claude vs Gemini",
  ],
  alternates: {
    canonical: "https://theonewaygda.com/leaderboard",
  },
  openGraph: {
    title: "AI Model Leaderboard — 19+ Models Compared | TheOneWayGDA",
    description: "Compare GPT-4o, Claude 4, Gemini 2.5, DeepSeek across GPQA Diamond, MMLU-Pro, HumanEval+, MATH-500 with live pricing.",
    url: "https://theonewaygda.com/leaderboard",
    type: "website",
    images: [{ url: "/api/og?type=leaderboard&title=AI Model Leaderboard&description=Compare 19+ models across 6 benchmarks", width: 1200, height: 630, alt: "AI Model Leaderboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Model Leaderboard — 19+ Models Compared",
    description: "GPT-4o vs Claude 4 vs Gemini 2.5 — who wins? See real benchmark scores.",
  },
}

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
