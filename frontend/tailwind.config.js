/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        setu: {
          green: "#16a34a",
          amber: "#d97706",
          red: "#dc2626",
          navy: "#0f172a",
          surface: "#f8fafc",
          border: "#e2e8f0",
        },
      },
    },
  },
  plugins: [],
};
