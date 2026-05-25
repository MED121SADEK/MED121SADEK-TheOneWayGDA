import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI Platform — Automation, Extensions, Governance & SDK",
  description:
    "TheOneWayGDA AI Platform: create AI-powered automation workflows, install extensions, manage governance policies, use the developer SDK, and explore templates for data analysis and model evaluation.",
  keywords: [
    "AI automation platform", "AI workflow automation", "AI extensions",
    "AI governance", "AI SDK", "data analysis templates",
    "ML pipeline templates", "AI policy management", "developer tools",
    "AI platform API", "automation rules", "data processing automation",
  ],
  alternates: {
    canonical: "https://theonewaygda.com/ai",
  },
  openGraph: {
    title: "AI Platform — Automation, Extensions & SDK | TheOneWayGDA",
    description: "Build AI-powered workflows, install extensions, and automate data analysis.",
    url: "https://theonewaygda.com/ai",
    type: "website",
  },
}

export default function AiLayout({ children }: { children: React.ReactNode }) {
  return children
}
