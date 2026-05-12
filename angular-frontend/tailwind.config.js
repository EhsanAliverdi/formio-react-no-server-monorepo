/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,html}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          25:  '#f5f8ff',
          50:  '#eff4ff',
          100: '#d1e0ff',
          200: '#b2ccff',
          300: '#84adff',
          400: '#528bff',
          500: '#465fff',
          600: '#3641f5',
          700: '#2d31d4',
          800: '#2420a8',
          900: '#1c1a7a',
        },
        gray: {
          dark: '#1a202c',
        },
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

