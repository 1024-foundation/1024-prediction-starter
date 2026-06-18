import type { Config } from "tailwindcss";

/**
 * Theme ported from the real 1024 frontend so the demo matches it visually.
 * Exact hex values taken from 1024-chain-frontend's prediction design system.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: { DEFAULT: "#50D2C1", hover: "#4cf8f0" }, // 1024 brand teal
        // Surfaces (dark theme)
        surface: {
          bg: "#101010",
          card: "rgba(255,255,255,0.04)",
          "card-hover": "rgba(255,255,255,0.06)",
          border: "rgba(255,255,255,0.08)",
          "border-strong": "rgba(255,255,255,0.12)",
        },
        // 3D outcome button greens (YES face / lip / shadow)
        yesface: "#148d51",
        yeslip: "#0b5531",
        // Semantic aliases used by the functional UI (ticket, kit, header).
        brand: { DEFAULT: "#50D2C1", dark: "#2bb3a3" },
        ink: { DEFAULT: "#101010", card: "rgba(255,255,255,0.04)", line: "rgba(255,255,255,0.08)" },
        yes: "#10B981", // emerald-500 — semantic YES
        no: "#EF4444", // red-500 — semantic NO
      },
      fontFamily: {
        sans: ["var(--font-hanken)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 2px 8px rgba(0,0,0,0.25), 0 0 1px rgba(255,255,255,0.06)",
        elevated: "0 8px 24px rgba(0,0,0,0.35), 0 0 1px rgba(255,255,255,0.08)",
      },
      keyframes: {
        shimmer: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        shimmer: "shimmer 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
