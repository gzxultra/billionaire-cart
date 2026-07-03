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
        midnight: "#09090B",
        surface: {
          DEFAULT: "#18181B",
          bright: "#27272A",
          dim: "#0F0F12",
        },
        line: "#3F3F46",
        accent: {
          DEFAULT: "#818CF8",
          light: "#A5B4FC",
          dim: "rgba(129,140,248,0.15)",
        },
        gold: {
          DEFAULT: "#FCD34D",
          light: "#FDE68A",
          dim: "rgba(252,211,77,0.15)",
        },
        mint: {
          DEFAULT: "#34D399",
          dim: "rgba(52,211,153,0.15)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Playfair Display", "Georgia", "serif"],
      },
      backgroundImage: {
        "accent-gradient":
          "linear-gradient(135deg, #6366F1 0%, #818CF8 50%, #A5B4FC 100%)",
        "gold-gradient":
          "linear-gradient(135deg, #D97706 0%, #FCD34D 50%, #FDE68A 100%)",
        "card-gradient":
          "linear-gradient(145deg, #18181B 0%, #09090B 50%, #18181B 100%)",
        "card-shine":
          "linear-gradient(135deg, transparent 0%, rgba(129,140,248,0.03) 50%, transparent 100%)",
      },
      boxShadow: {
        "accent-sm": "0 0 10px rgba(129,140,248,0.12)",
        accent: "0 0 20px rgba(129,140,248,0.15)",
        "accent-lg": "0 0 40px rgba(129,140,248,0.2)",
        "gold-sm": "0 0 10px rgba(252,211,77,0.12)",
        gold: "0 0 20px rgba(252,211,77,0.15)",
        glass: "0 8px 32px rgba(0,0,0,0.5)",
        card: "0 1px 3px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.2)",
      },
      animation: {
        "accent-pulse": "accent-pulse 3s ease-in-out infinite",
        shimmer: "shimmer 2s ease-in-out infinite",
        "balance-tick": "balance-tick 0.3s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
      },
      keyframes: {
        "accent-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(129,140,248,0.1)" },
          "50%": { boxShadow: "0 0 40px rgba(129,140,248,0.2)" },
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
