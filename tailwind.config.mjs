/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e8f0fb',
          100: '#c2d4f5',
          400: '#3b6fd4',
          600: '#1e3a5f',
          800: '#0f1e33',
          900: '#070f1a',
        },
        accent: {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea6a0a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
