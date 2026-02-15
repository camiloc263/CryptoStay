/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Cuando Next infiere el root como ../CryptoStay, estos paths pueden resolverse distinto.
    // Incluimos ambas variantes para asegurar que Tailwind detecte clases.
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './frontend/pages/**/*.{js,ts,jsx,tsx}',
    './frontend/components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefbf0',
          100: '#d8f6dd',
          200: '#b3ebbd',
          300: '#7fd99a',
          400: '#46c274',
          500: '#22a957',
          600: '#188747',
          700: '#146c3a',
          800: '#125631',
          900: '#0f472a'
        }
      }
    },
  },
  plugins: [],
};
