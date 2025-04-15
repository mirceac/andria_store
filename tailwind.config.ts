import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#2563eb", // Tailwind's blue-600
          hover: "#1d4ed8", // Tailwind's blue-700
          active: "#1d4ed8", // Tailwind's blue-700
          foreground: "#ffffff", // White text
        },
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    function ({ addComponents }) {
      addComponents({
        ".btn-primary": {
          "@apply rounded-md bg-blue-600 py-2 px-4 border border-transparent text-center text-sm text-white transition-all shadow-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-700 disabled:pointer-events-none disabled:opacity-50":
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
          "@apply relative flex flex-col w-full h-full text-gray-700 bg-white shadow-md rounded-lg bg-clip-border":
            "",
        },
        "table": {
          "@apply w-full text-left table-auto min-w-max":
            "",
        },
        "thead tr": {
          "@apply border-b border-slate-300 bg-slate-50":
            "",
        },
        "th": {
          "@apply p-4 text-sm font-normal leading-none text-slate-500":
            "",
        },
        "tbody tr": {
          "@apply hover:bg-slate-50":
            "",
        },
        "td": {
          "@apply p-4 border-b border-slate-200 py-5":
            "",
        },
        ".table-title": {
          "@apply text-lg font-semibold text-slate-800":
            "",
        },
        ".table-subtitle": {
          "@apply text-slate-500":
            "",
        },
        ".table-cell-text": {
          "@apply block font-semibold text-sm text-slate-800":
            "",
        },
        ".table-cell-subtext": {
          "@apply text-sm text-slate-500":
            "",
        },
      });
    },
  ],
} satisfies Config;
