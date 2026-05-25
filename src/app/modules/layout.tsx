import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Analysis Modules — Statistical Tests, Visualizations & Tools",
  description:
    "Explore TheOneWayGDA analysis modules: 50+ statistical tests, interactive visualizations, data processing tools, machine learning modules, and reporting capabilities for your data analysis workflows.",
  keywords: [
    "analysis modules", "statistical tests", "data visualization tools",
    "machine learning modules", "data processing tools", "statistical analysis tools",
    "hypothesis testing modules", "regression analysis", "ANOVA module",
    "data cleaning tools", "reporting modules",
  ],
  alternates: {
    canonical: "https://theonewaygda.com/modules",
  },
  openGraph: {
    title: "Analysis Modules & Tools | TheOneWayGDA",
    description: "50+ statistical tests, visualizations, and data analysis tools.",
    url: "https://theonewaygda.com/modules",
    type: "website",
  },
}

export default function ModulesLayout({ children }: { children: React.ReactNode }) {
  return children
}
