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
        base: "#101014",
        surface: {
          DEFAULT: "#1C1C22",
          bright: "#26262E",
          dim: "#151518",
        },
        line: "#363640",
        stone: {
          DEFAULT: "#A89279",
          light: "#C4AD92",
          dim: "rgba(168,146,121,0.18)",
          muted: "rgba(168,146,121,0.45)",
        },
        champagne: {
          DEFAULT: "#D1AD70",
          light: "#DEC48B",
          dim: "rgba(209,173,112,0.18)",
        },
        sage: {
          DEFAULT: "#82A38E",
          dim: "rgba(130,163,142,0.18)",
        },
        sand: "#EEEBE6",
        ash: "#807A73",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Playfair Display", "Georgia", "serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "stone-gradient":
          "linear-gradient(135deg, #8A7A68 0%, #A89279 50%, #C4AD92 100%)",
        "champagne-gradient":
          "linear-gradient(135deg, #A68B50 0%, #D1AD70 50%, #DEC48B 100%)",
        "card-gradient":
          "linear-gradient(145deg, #1C1C22 0%, #101014 50%, #1C1C22 100%)",
        "card-shine":
          "linear-gradient(135deg, transparent 0%, rgba(168,146,121,0.05) 50%, transparent 100%)",
      },
      boxShadow: {
        "stone-sm": "0 0 10px rgba(168,146,121,0.1)",
        stone: "0 0 20px rgba(168,146,121,0.12)",
        "stone-lg": "0 0 40px rgba(168,146,121,0.15)",
        "champagne-sm": "0 0 10px rgba(209,173,112,0.1)",
        champagne: "0 0 20px rgba(209,173,112,0.12)",
        glass: "0 8px 32px rgba(0,0,0,0.4)",
        card: "0 1px 3px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.12)",
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
          "0%, 100%": { boxShadow: "0 0 20px rgba(168,146,121,0.08)" },
          "50%": { boxShadow: "0 0 40px rgba(168,146,121,0.16)" },
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
