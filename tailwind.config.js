/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dwsim-dark': '#1e1e1e',
        'dwsim-panel': '#252526',
        'dwsim-border': '#3e3e42',
        'dwsim-blue': '#007acc',
        'dwsim-green': '#4ec9b0',
        'dwsim-red': '#f44747',
      }
    },
  },
  plugins: [],
}