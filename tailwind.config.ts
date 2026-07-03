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
        vanta: "#050507",
        charcoal: {
          900: "#0a0a0c",
          800: "#121215",
          700: "#1a1a1f",
          600: "#242429",
          500: "#2e2e34",
          400: "#3a3a42",
        },
        copper: {
          DEFAULT: "#B87333",
          light: "#D4956B",
          dark: "#8B5A2B",
          glow: "rgba(184,115,51,0.15)",
          muted: "rgba(184,115,51,0.4)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
      },
      backgroundImage: {
        "copper-gradient":
          "linear-gradient(135deg, #8B5A2B 0%, #B87333 50%, #D4956B 100%)",
        "card-gradient":
          "linear-gradient(145deg, #0a0a0c 0%, #050507 50%, #0a0a0c 100%)",
      },
      boxShadow: {
        "copper-sm": "0 0 10px rgba(184,115,51,0.15)",
        copper: "0 0 20px rgba(184,115,51,0.2)",
        "copper-lg": "0 0 40px rgba(184,115,51,0.25)",
        glass: "0 8px 32px rgba(0,0,0,0.4)",
      },
      animation: {
        "copper-pulse": "copper-pulse 3s ease-in-out infinite",
        shimmer: "shimmer 2s ease-in-out infinite",
        "balance-tick": "balance-tick 0.3s ease-out",
      },
      keyframes: {
        "copper-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(184,115,51,0.15)" },
          "50%": { boxShadow: "0 0 40px rgba(184,115,51,0.3)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "balance-tick": {
          "0%": { transform: "translateY(-4px)", opacity: "0.7" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
