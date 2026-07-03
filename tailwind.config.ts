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
        base: "#0C0C0E",
        surface: {
          DEFAULT: "#161618",
          bright: "#1E1E21",
          dim: "#111113",
        },
        line: "#2A2A2E",
        stone: {
          DEFAULT: "#9B8B7A",
          light: "#B8A898",
          dim: "rgba(155,139,122,0.12)",
          muted: "rgba(155,139,122,0.4)",
        },
        champagne: {
          DEFAULT: "#C5A572",
          light: "#D4BB91",
          dim: "rgba(197,165,114,0.12)",
        },
        sage: {
          DEFAULT: "#7D9B8A",
          dim: "rgba(125,155,138,0.12)",
        },
        sand: "#E8E4DF",
        ash: "#6B6560",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Playfair Display", "Georgia", "serif"],
      },
      backgroundImage: {
        "stone-gradient":
          "linear-gradient(135deg, #7A6E62 0%, #9B8B7A 50%, #B8A898 100%)",
        "champagne-gradient":
          "linear-gradient(135deg, #9B7E4F 0%, #C5A572 50%, #D4BB91 100%)",
        "card-gradient":
          "linear-gradient(145deg, #161618 0%, #0C0C0E 50%, #161618 100%)",
        "card-shine":
          "linear-gradient(135deg, transparent 0%, rgba(155,139,122,0.03) 50%, transparent 100%)",
      },
      boxShadow: {
        "stone-sm": "0 0 10px rgba(155,139,122,0.08)",
        stone: "0 0 20px rgba(155,139,122,0.1)",
        "stone-lg": "0 0 40px rgba(155,139,122,0.12)",
        "champagne-sm": "0 0 10px rgba(197,165,114,0.08)",
        champagne: "0 0 20px rgba(197,165,114,0.1)",
        glass: "0 8px 32px rgba(0,0,0,0.5)",
        card: "0 1px 3px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.15)",
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
          "0%, 100%": { boxShadow: "0 0 20px rgba(155,139,122,0.06)" },
          "50%": { boxShadow: "0 0 40px rgba(155,139,122,0.12)" },
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
