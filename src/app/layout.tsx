import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { I18nProvider } from "@/lib/i18n";
import { GdprConsent } from "@/components/gdpr-consent";
import { EmailGate } from "@/components/EmailGate";
import AiCopilot from "@/components/ai/AiCopilot";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { AppProviders } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "TheOneWayGDA — AI Model Comparison & Leaderboard Platform",
    template: "%s | TheOneWayGDA",
  },
  description:
    "Compare AI models side-by-side with real benchmarks. Collaborate with teams, run AI-powered analysis workflows, and track model performance across 50+ providers. The all-in-one AI evaluation platform.",
  keywords: [
    "AI model comparison", "AI leaderboard", "LLM benchmark", "GPT vs Claude vs Gemini",
    "AI evaluation", "model performance", "AI analytics", "machine learning",
    "workflow automation", "team collaboration", "data science platform",
    "TheOneWayGDA", "AI copilot", "statistical analysis",
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
    description: "Compare AI models with real benchmarks. Collaborate, analyze, and deploy.",
    siteName: "TheOneWayGDA",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "TheOneWayGDA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TheOneWayGDA — AI Model Comparison Platform",
    description: "Compare AI models with real benchmarks. Collaborate, analyze, and deploy.",
    images: ["/images/og-image.png"],
    creator: "@theonewaygda",
  },
  robots: {
    index: true, follow: true, googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <I18nProvider>
          <AppProviders>
            <ServiceWorkerRegistrar />
            <EmailGate />
            <GdprConsent />
            {children}
            <AiCopilot />
            <Toaster />
          </AppProviders>
        </I18nProvider>
      </body>
    </html>
  );
}
