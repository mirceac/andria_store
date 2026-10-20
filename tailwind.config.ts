import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
    },
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary) / 0.9)",
          active: "hsl(var(--primary) / 0.82)",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        chrome: "hsl(var(--chrome))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    function ({ addComponents }) {
      addComponents({
        ".btn-primary": {
          "@apply rounded-md bg-primary py-2 px-4 border border-transparent text-center text-sm text-primary-foreground transition-all shadow-sm hover:bg-primary-hover focus:ring-2 focus:ring-primary focus:ring-offset-2 active:bg-primary-active disabled:pointer-events-none disabled:opacity-50":
            "",
        },
        ".btn-danger": {
          "@apply rounded-md bg-red-600 py-2 px-4 border border-transparent text-center text-sm text-white transition-all shadow-md hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:bg-red-700 disabled:pointer-events-none disabled:opacity-50":
            "",
        },
        ".btn-success": {
          "@apply rounded-md bg-green-600 py-2 px-4 border border-transparent text-center text-sm text-white transition-all shadow-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 active:bg-green-700 disabled:pointer-events-none disabled:opacity-50":
            "",
        },
        ".btn-warning": {
          "@apply rounded-md bg-amber-600 py-2 px-4 border border-transparent text-center text-sm text-slate-800 transition-all shadow-md hover:bg-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 active:bg-amber-700 disabled:pointer-events-none disabled:opacity-50":
            "",
        },
        ".table-container": {
          "@apply relative flex flex-col w-full h-full text-foreground bg-card shadow-sm rounded-lg bg-clip-border":
            "",
        },
        "table": {
          "@apply w-full text-left table-auto min-w-max":
            "",
        },
        "thead tr": {
          "@apply border-b border-border bg-muted":
            "",
        },
        "th": {
          "@apply p-4 text-sm font-medium leading-none text-muted-foreground":
            "",
        },
        "tbody tr": {
          "@apply hover:bg-muted/60":
            "",
        },
        "td": {
          "@apply p-4 border-b border-border py-5":
            "",
        },
        ".table-title": {
          "@apply text-lg font-semibold text-foreground":
            "",
        },
        ".table-subtitle": {
          "@apply text-muted-foreground":
            "",
        },
        ".table-cell-text": {
          "@apply block font-semibold text-sm text-foreground":
            "",
        },
        ".table-cell-subtext": {
          "@apply text-sm text-muted-foreground":
            "",
        },
      });
    },
  ],
} satisfies Config;
