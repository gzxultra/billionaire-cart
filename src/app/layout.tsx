import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Billionaire Cart — The Ultimate Wealth Simulation",
  description:
    "Adopt a billionaire's identity and purchase anything from any URL. Viral luxury checkout simulation with live net worth tracking.",
  keywords: [
    "billionaire",
    "simulation",
    "luxury",
    "checkout",
    "viral",
    "net worth",
  ],
  openGraph: {
    title: "Billionaire Cart",
    description: "How fast can you spend a billionaire's fortune?",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Billionaire Cart",
    description: "How fast can you spend a billionaire's fortune?",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
