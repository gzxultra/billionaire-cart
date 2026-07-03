import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

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
  themeColor: "#9B8B7A",
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
    <html lang="zh" className={`dark ${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
