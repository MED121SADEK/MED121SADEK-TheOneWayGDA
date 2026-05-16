import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StatMind AI - The Future of Statistical Analysis",
  description:
    "AI-powered statistical analysis platform that works offline, auto-updates, and makes data science accessible to everyone. Superior to SPSS in every way.",
  keywords: [
    "StatMind AI",
    "statistical analysis",
    "AI analytics",
    "SPSS alternative",
    "data science",
    "machine learning",
    "offline analytics",
    "AI-powered statistics",
  ],
  authors: [{ name: "StatMind AI Team" }],
  icons: {
    icon: "/images/logo.png",
  },
  openGraph: {
    title: "StatMind AI - The Future of Statistical Analysis",
    description:
      "AI-powered statistical analysis that works offline, auto-updates, and makes data science accessible to everyone.",
    type: "website",
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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
