import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI & Data Science Tutorials — Learn Benchmarking, Analysis & ML",
  description:
    "Step-by-step tutorials for AI model evaluation, statistical analysis, machine learning workflows, and data science. Learn to use TheOneWayGDA platform effectively with hands-on guides.",
  keywords: [
    "AI tutorials", "data science tutorials", "machine learning guides",
    "statistical analysis tutorial", "AI model evaluation guide",
    "benchmark tutorial", "data analysis workflow tutorial",
    "Python data science", "R statistical analysis", "ML pipeline tutorial",
  ],
  alternates: {
    canonical: "https://theonewaygda.com/tutorials",
  },
  openGraph: {
    title: "AI & Data Science Tutorials | TheOneWayGDA",
    description: "Learn AI model evaluation, statistical analysis, and ML workflows with hands-on guides.",
    url: "https://theonewaygda.com/tutorials",
    type: "website",
  },
}

export default function TutorialsLayout({ children }: { children: React.ReactNode }) {
  return children
}
