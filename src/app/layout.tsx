import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { I18nProvider } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The One-Way - AI-Powered Statistical Analysis Platform",
  description:
    "The all-in-one AI-powered statistical analysis platform. Works offline, supports all languages, auto-updates, and makes data science accessible to everyone. Superior to SPSS.",
  keywords: [
    "The One-Way",
    "statistical analysis",
    "AI analytics",
    "SPSS alternative",
    "data science",
    "offline analytics",
    "multilingual",
    "collaboration",
  ],
  authors: [{ name: "The One-Way Team" }],
  icons: {
    icon: "/images/logo.png",
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
          {children}
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
