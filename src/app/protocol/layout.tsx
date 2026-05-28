import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Open Benchmark Protocol — Submit AI Model Benchmarks",
  description:
    "Submit your AI model benchmark results through our Open Benchmark Protocol v1.0. Contribute to transparent, reproducible AI evaluation across the community.",
  keywords: [
    "open benchmark protocol", "AI benchmark submission", "reproducible AI evaluation",
    "AI model benchmarking standard", "transparent AI testing", "community AI benchmarks",
    "submit benchmark results", "AI evaluation protocol",
  ],
  alternates: {
    canonical: "https://theonewaygda.com/protocol",
  },
  openGraph: {
    title: "Open Benchmark Protocol v1.0 | TheOneWayGDA",
    description: "Submit your benchmark results and contribute to the open AI evaluation standard.",
    url: "https://theonewaygda.com/protocol",
    type: "website",
  },
}

export default function ProtocolLayout({ children }: { children: React.ReactNode }) {
  return children
}
