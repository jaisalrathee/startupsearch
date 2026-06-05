import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tight3: "-0.3px",
      },
      colors: {
        ink: {
          0: "#ffffff",
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e5e5e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
          950: "#09090b",
        },
        accent: {
          DEFAULT: "#5b6cff",
          soft: "#eef0ff",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 17, 21, 0.04), 0 1px 1px rgba(15, 17, 21, 0.03)",
        ring: "0 0 0 1px rgba(15, 17, 21, 0.06)",
      },
    },
  },
  plugins: [],
}

export default config
