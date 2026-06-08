import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a",
        },
        // Marketing/landing palette — pulled from the Renters logo
        ink: {
          DEFAULT: "#1E2D5C",
          2: "#2F3D6B",
          3: "#5C6989",
          4: "#8E97B3",
        },
        paper: {
          DEFAULT: "#F7F8FB",
          elev: "#FFFFFF",
          sunk: "#EEF1F7",
        },
        line: {
          DEFAULT: "#DCE2EE",
          strong: "#1E2D5C",
        },
        accent: {
          DEFAULT: "#3B82F6",
          deep: "#1E5BD6",
          soft: "#DCE8FB",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        serif: [
          "var(--font-serif)",
          "Instrument Serif",
          "Georgia",
          "serif",
        ],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
