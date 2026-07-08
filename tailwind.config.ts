import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#050507",
        panel: "#0d0d14",
        edge: "#1a1a26",
        trabajo: {
          DEFAULT: "#00e5ff",
          dim: "#0a3a42",
        },
        casa: {
          DEFAULT: "#ff2fd0",
          dim: "#3a0a34",
        },
        acid: "#c6ff00",
        warn: "#ff5a1f",
        ok: "#39ff88",
      },
      fontFamily: {
        display: ["'Arial Black'", "Inter", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 20px rgba(0,229,255,0.55), 0 0 60px rgba(0,229,255,0.25)",
        "neon-casa": "0 0 20px rgba(255,47,208,0.55), 0 0 60px rgba(255,47,208,0.25)",
        "neon-acid": "0 0 24px rgba(198,255,0,0.55)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
