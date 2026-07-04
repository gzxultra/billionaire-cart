import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        base: "#F8F5F0",
        surface: {
          DEFAULT: "#FFFFFF",
          bright: "#F0EBE4",
          dim: "#F5F1EB",
        },
        line: "#E2D9CE",
        stone: {
          DEFAULT: "#8C7A65",
          light: "#A89279",
          dim: "rgba(140,122,101,0.10)",
          muted: "rgba(140,122,101,0.35)",
        },
        champagne: {
          DEFAULT: "#A68530",
          light: "#C4A04A",
          dim: "rgba(166,133,48,0.10)",
        },
        sage: {
          DEFAULT: "#5A8A68",
          dim: "rgba(90,138,104,0.10)",
        },
        sand: "#2A2520",
        ash: "#8C847B",
        ink: "#1A1714",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Playfair Display", "Georgia", "serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "stone-gradient":
          "linear-gradient(135deg, #8C7A65 0%, #A89279 50%, #C4AD92 100%)",
        "champagne-gradient":
          "linear-gradient(135deg, #8A7030 0%, #A68530 50%, #C4A04A 100%)",
        "card-gradient":
          "linear-gradient(145deg, #FFFFFF 0%, #FAF7F3 50%, #FFFFFF 100%)",
        "card-shine":
          "linear-gradient(135deg, transparent 0%, rgba(166,133,48,0.04) 50%, transparent 100%)",
      },
      boxShadow: {
        "stone-sm": "0 0 10px rgba(140,122,101,0.08)",
        stone: "0 0 20px rgba(140,122,101,0.08)",
        "stone-lg": "0 0 40px rgba(140,122,101,0.1)",
        "champagne-sm": "0 0 10px rgba(166,133,48,0.08)",
        champagne: "0 0 20px rgba(166,133,48,0.08)",
        glass: "0 8px 32px rgba(0,0,0,0.06)",
        card: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)",
      },
      animation: {
        "stone-pulse": "stone-pulse 3s ease-in-out infinite",
        shimmer: "shimmer 2s ease-in-out infinite",
        "balance-tick": "balance-tick 0.3s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
      },
      keyframes: {
        "stone-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(140,122,101,0.05)" },
          "50%": { boxShadow: "0 0 40px rgba(140,122,101,0.10)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "balance-tick": {
          "0%": { transform: "translateY(-4px)", opacity: "0.7" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
