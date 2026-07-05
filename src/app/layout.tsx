import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

import { JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "亿万富翁购物车 — Billionaire Cart",
  description:
    "Adopt a billionaire's identity and purchase anything. How fast can you spend their fortune? 选个亿万富翁的身份，看你多快能花光他们的钱？",
  keywords: [
    "billionaire",
    "simulation",
    "luxury",
    "checkout",
    "viral",
    "net worth",
    "亿万富翁",
    "模拟",
    "购物车",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/icon-192.svg",
  },
  openGraph: {
    title: "亿万富翁购物车 — Billionaire Cart",
    description: "How fast can you spend a billionaire's fortune? 选个亿万富翁的身份，看你多快能花光他们的钱？",
    type: "website",
    siteName: "Billionaire Cart",
  },
  twitter: {
    card: "summary_large_image",
    title: "亿万富翁购物车 — Billionaire Cart",
    description: "How fast can you spend a billionaire's fortune?",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Billionaire Cart",
  },
};

export const viewport: Viewport = {
  themeColor: "#A89279",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className={`dark ${inter.variable} ${playfair.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Billionaire Cart — 亿万富翁购物车",
              description: "Adopt a billionaire's identity and spend their fortune. Interactive wealth simulation with real-time Forbes data.",
              url: "https://billionairecart.app",
              applicationCategory: "EntertainmentApplication",
              operatingSystem: "Any",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              inLanguage: ["en", "zh"],
            }),
          }}
        />
      </head>      <body className="min-h-screen font-sans">
        {/* Skip to main content — accessibility */}
        <a
          href="#main-content"
          className="
            sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999]
            focus:px-4 focus:py-2 focus:rounded-lg focus:bg-stone focus:text-white
            focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none
            focus:ring-2 focus:ring-champagne focus:ring-offset-2 focus:ring-offset-base
          "
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
