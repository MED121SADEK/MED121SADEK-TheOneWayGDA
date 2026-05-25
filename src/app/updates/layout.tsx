import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Platform Updates — New Features, Improvements & Changelog",
  description:
    "Stay up to date with TheOneWayGDA platform updates. See new features, AI model additions, benchmark updates, performance improvements, and upcoming roadmap items.",
  keywords: [
    "platform updates", "changelog", "new features", "AI model additions",
    "benchmark updates", "platform improvements", "product roadmap",
    "TheOneWayGDA updates", "release notes",
  ],
  alternates: {
    canonical: "https://theonewaygda.com/updates",
  },
  openGraph: {
    title: "Platform Updates & Changelog | TheOneWayGDA",
    description: "See what's new — features, model additions, and improvements.",
    url: "https://theonewaygda.com/updates",
    type: "website",
  },
}

export default function UpdatesLayout({ children }: { children: React.ReactNode }) {
  return children
}
