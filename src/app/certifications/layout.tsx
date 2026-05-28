import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI Model Certification — Verified AI Evaluation Badges",
  description:
    "Explore AI model certifications with bronze, silver, gold, and platinum badges. See which models meet the gold standard for AI evaluation across reasoning, coding, creative, math, and more.",
  keywords: [
    "AI certification", "AI model badge", "verified AI", "gold standard AI",
    "AI evaluation certificate", "GPT-4o certified", "Claude 4 platinum", "Gemini certified",
    "AI benchmark certification", "trustworthy AI", "AI quality assurance",
  ],
  alternates: {
    canonical: "https://theonewaygda.com/certifications",
  },
  openGraph: {
    title: "AI Model Certification — Verified Badges | TheOneWayGDA",
    description: "Bronze, Silver, Gold, Platinum — see which AI models are certified and why.",
    url: "https://theonewaygda.com/certifications",
    type: "website",
  },
}

export default function CertificationsLayout({ children }: { children: React.ReactNode }) {
  return children
}
