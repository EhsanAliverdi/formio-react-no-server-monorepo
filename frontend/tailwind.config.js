/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/preline/dist/*.js",
  ],
  theme: {
    extend: {
      colors: {
        // TailAdmin theme tokens
        brand: {
          50: "#eef4ff",
          100: "#dfe9ff",
          200: "#c5d6ff",
          300: "#9fb8ff",
          400: "#7691ff",
          500: "#465fff",
          600: "#3648e0",
          700: "#2b38b3",
          800: "#232f8c",
          900: "#1e2a73",
          950: "#141b4d",
        },
        "gray-dark": "#1c2434",
        dark: {
          900: "#0b1220",
        },
      },
      spacing: {
        "5.5": "1.375rem",
        "7.5": "1.875rem",
        "13": "3.25rem",
        "22.5": "5.625rem",
        "25": "6.25rem",
        "65": "16.25rem",
        "90": "22.5rem",
        "100": "25rem",
        "125": "31.25rem",
      },
      zIndex: {
        "1": "1",
        "48": "48",
        "60": "60",
        "61": "61",
        "999": "999",
        "9999": "9999",
        "99999": "99999",
      },
      borderRadius: {
        xs: "0.125rem",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "theme-xs": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "theme-md":
          "0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.10)",
        "theme-lg":
          "0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -4px rgb(0 0 0 / 0.10)",
        "focus-ring": "0 0 0 3px rgb(70 95 255 / 0.20)",
      },
      fontSize: {
        // TailAdmin typography tokens
        "theme-xs": ["0.75rem", { lineHeight: "1rem" }],
        "theme-sm": ["0.875rem", { lineHeight: "1.25rem" }],
        "theme-xl": ["1.25rem", { lineHeight: "1.75rem" }],
        "title-sm": ["1.25rem", { lineHeight: "1.75rem" }],
        "title-md": ["1.5rem", { lineHeight: "2rem" }],
        "title-2xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },
      ringWidth: {
        3: "3px",
      },
      aspectRatio: {
        "4/2": "4 / 2",
        "4/3": "4 / 3",
      },
    },
  },
  plugins: [],
};