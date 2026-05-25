import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Data Analysis Workspace — Statistical Analysis & Visualization",
  description:
    "Upload datasets and run powerful statistical analyses. Perform hypothesis testing, regression analysis, ANOVA, Bayesian inference, and generate publication-quality visualizations. Free AI-powered data analysis workspace.",
  keywords: [
    "data analysis workspace", "statistical analysis tool", "online data analysis",
    "hypothesis testing tool", "regression analysis", "ANOVA online",
    "Bayesian analysis", "data visualization", "statistical software",
    "data science tool", "AI data analysis", "free statistical analysis",
  ],
  alternates: {
    canonical: "https://theonewaygda.com/workspace",
  },
  openGraph: {
    title: "Data Analysis Workspace | TheOneWayGDA",
    description: "Upload data, run 50+ statistical tests, and generate visualizations.",
    url: "https://theonewaygda.com/workspace",
    type: "website",
  },
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return children
}
