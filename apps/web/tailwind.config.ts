import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--text-primary)",
        muted: "var(--text-secondary)",
        canvas: "var(--background)",
        surface: "rgb(var(--surface-rgb) / <alpha-value>)",
        "surface-hover": "var(--surface-hover)",
        "border-default": "rgb(var(--border-rgb) / <alpha-value>)",
        brand: "rgb(var(--brand-rgb) / <alpha-value>)",
        "brand-hover": "rgb(var(--brand-hover-rgb) / <alpha-value>)",
        "brand-soft": "rgb(var(--brand-soft-rgb) / <alpha-value>)",
        "brand-panel": "var(--brand-panel)",
        learn: "rgb(var(--learn-rgb) / <alpha-value>)",
        "learn-soft": "var(--learn-soft)",
        danger: "var(--danger)",
        "success-soft": "var(--success-bg)",
        success: "var(--success-text)",
        "danger-soft": "var(--danger-bg)",
        "active-soft": "var(--active-bg)",
        "active-status": "var(--active-text)",
        "warning-soft": "var(--warning-bg)",
        warning: "var(--warning-text)",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.05)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
