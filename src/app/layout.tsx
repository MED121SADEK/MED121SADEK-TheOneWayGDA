import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/lib/i18n";
import { GdprConsent } from "@/components/gdpr-consent";
import { LanguageGate } from "@/components/LanguageGate";
import { EmailGate } from "@/components/EmailGate";
import AiCopilot from "@/components/ai/AiCopilot";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { AppProviders } from "@/components/providers";
import { PageTransition } from "@/components/page-transition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ═══ JSON-LD Structured Data ═══
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://theonewaygda.com/#organization",
      name: "TheOneWayGDA",
      url: "https://theonewaygda.com",
      logo: "https://theonewaygda.com/icons/icon-512x512.png",
      description: "The most comprehensive AI model comparison and evaluation platform. Compare GPT-4o, Claude 4, Gemini 2.5, DeepSeek and 19+ models with real benchmarks.",
      sameAs: [
        "https://github.com/MED121SADEK",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        url: "https://theonewaygda.com/about",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://theonewaygda.com/#website",
      url: "https://theonewaygda.com",
      name: "TheOneWayGDA",
      description: "Compare AI models side-by-side with real benchmarks including GPQA Diamond, MMLU-Pro, HumanEval+, MATH-500, MT-Bench, and IFEval.",
      publisher: { "@id": "https://theonewaygda.com/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: "https://theonewaygda.com/leaderboard?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://theonewaygda.com/#software",
      name: "TheOneWayGDA",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      url: "https://theonewaygda.com",
      description: "AI model benchmarking, statistical analysis workspace, AI-powered workflow automation, and team collaboration platform.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free tier with premium features",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        ratingCount: "1250",
        bestRating: "5",
      },
      featureList: [
        "AI Model Leaderboard with 19+ models and 6 benchmarks",
        "Real-time latency and throughput testing",
        "Statistical analysis workspace with 50+ tests",
        "AI-powered workflow automation",
        "7 specialist AI assistants",
        "Team collaboration and shared projects",
        "Community portal with AI news and research",
      ],
    },
    {
      "@type": "WebPage",
      "@id": "https://theonewaygda.com/#webpage",
      url: "https://theonewaygda.com",
      name: "TheOneWayGDA — AI Model Comparison & Leaderboard Platform",
      isPartOf: { "@id": "https://theonewaygda.com/#website" },
      about: { "@id": "https://theonewaygda.com/#organization" },
      description: "Compare AI models side-by-side with real benchmarks. Collaborate with teams, run AI-powered analysis workflows, and track model performance across 50+ providers.",
    },
    {
      "@type": "FAQPage",
      "@id": "https://theonewaygda.com/#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is TheOneWayGDA?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "TheOneWayGDA is a comprehensive AI model comparison and evaluation platform that lets you compare 19+ AI models including GPT-4o, Claude 4, Gemini 2.5, and DeepSeek across 6 standardized benchmarks (GPQA Diamond, MMLU-Pro, HumanEval+, MATH-500, MT-Bench, IFEval) with real-time pricing and performance data.",
          },
        },
        {
          "@type": "Question",
          name: "How does TheOneWayGDA benchmark AI models?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "TheOneWayGDA uses 6 industry-standard benchmarks: GPQA Diamond (graduate-level science reasoning), MMLU-Pro (multitask language understanding), HumanEval+ (code generation), MATH-500 (mathematical problem solving), MT-Bench (multi-turn conversation quality), and IFEval (instruction following accuracy). We also provide live latency and throughput metrics.",
          },
        },
        {
          "@type": "Question",
          name: "Is TheOneWayGDA free to use?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, TheOneWayGDA offers a free tier with access to the full leaderboard, workspace tools, community features, and AI assistants. Premium features for teams and advanced analytics are available on paid plans.",
          },
        },
      ],
    },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "TheOneWayGDA — AI Model Comparison & Leaderboard Platform",
    template: "%s | TheOneWayGDA",
  },
  description:
    "Compare AI models side-by-side with real benchmarks (GPQA Diamond, MMLU-Pro, HumanEval+, MATH-500). Track GPT-4o, Claude 4, Gemini 2.5, DeepSeek performance with live pricing and latency data. Free AI evaluation platform.",
  keywords: [
    "AI model comparison", "AI leaderboard", "LLM benchmark", "GPT-4o vs Claude 4 vs Gemini 2.5",
    "AI evaluation platform", "model performance tracking", "GPQA Diamond", "MMLU-Pro", "HumanEval+",
    "MATH-500 benchmark", "MT-Bench", "IFEval", "AI model pricing", "LLM comparison",
    "best AI model 2025", "AI analytics", "statistical analysis", "machine learning tools",
    "AI workflow automation", "data science platform", "TheOneWayGDA", "AI copilot",
    "DeepSeek benchmark", "Claude vs GPT", "Gemini vs GPT", "AI model latency",
  ],
  authors: [{ name: "TheOneWayGDA Team", url: "https://github.com/MED121SADEK" }],
  creator: "TheOneWayGDA",
  publisher: "TheOneWayGDA",
  metadataBase: new URL("https://theonewaygda.com"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://theonewaygda.com",
    title: "TheOneWayGDA — AI Model Comparison & Leaderboard Platform",
    description: "Compare 19+ AI models with real benchmarks. GPT-4o, Claude 4, Gemini 2.5, DeepSeek — live scores, pricing, and latency data.",
    siteName: "TheOneWayGDA",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "TheOneWayGDA — AI Model Comparison & Leaderboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TheOneWayGDA — AI Model Comparison Platform",
    description: "Compare 19+ AI models with real benchmarks, live pricing & latency. Free evaluation platform.",
    images: ["/images/og-image.png"],
    creator: "@theonewaygda",
  },
  robots: {
    index: true, follow: true, googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || '',
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes", "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent", "apple-mobile-web-app-title": "TheOneWayGDA",
    "application-name": "TheOneWayGDA", "msapplication-TileColor": "#09090b",
    "msapplication-TileImage": "/icons/icon-144x144.png", "theme-color": "#0ea5e9",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark" id="__html_root">
      <head>
        {/* JSON-LD Structured Data for Search Engines */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <I18nProvider>
          <AppProviders>
            <ServiceWorkerRegistrar />
            <LanguageGate />
            <EmailGate />
            <GdprConsent />
            <PageTransition>{children}</PageTransition>
            <AiCopilot />
            <Toaster />
            <SonnerToaster />
          </AppProviders>
        </I18nProvider>
      </body>
    </html>
  );
}
