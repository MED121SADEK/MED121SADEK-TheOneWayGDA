import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { I18nProvider } from "@/lib/i18n";
import { GdprConsent } from "@/components/gdpr-consent";
import { EmailGate } from "@/components/EmailGate";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TheOneWayGDA - AI-Powered Statistical Analysis Platform",
  description:
    "The all-in-one AI-powered statistical analysis platform. Works offline, supports all languages, auto-updates, and makes data science accessible to everyone. Superior to SPSS.",
  keywords: [
    "TheOneWayGDA",
    "statistical analysis",
    "AI analytics",
    "SPSS alternative",
    "data science",
    "offline analytics",
    "multilingual",
    "collaboration",
    "PWA",
  ],
  authors: [{ name: "TheOneWayGDA Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "TheOneWayGDA",
    "application-name": "TheOneWayGDA",
    "msapplication-TileColor": "#09090b",
    "msapplication-TileImage": "/icons/icon-144x144.png",
    "theme-color": "#0ea5e9",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <I18nProvider>
          <ServiceWorkerRegistrar />
          <EmailGate />
          <GdprConsent />
          {children}
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
