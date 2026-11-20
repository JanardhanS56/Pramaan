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
        canvas: "#F9FAF8",
        surface: "#FFFFFF",
        farmer: {
          DEFAULT: "#1F4E35",
          hover: "#163A27",
          dark: "#163A27",
          sage: "#EAF2ED",
          border: "#C5D8CC",
        },
        charcoal: {
          DEFAULT: "#1C201E",
          text: "#1C201E",
          muted: "#5A635E",
          subtle: "#8A948F",
        },
        hairline: "#DCE1DD",
        neutral: {
          surface: "#F0F2F0",
        },
        alert: {
          error: "#B42318",
          errorBg: "#FEF3F2",
          errorBorder: "#FECDCA",
          warning: "#B54708",
          warningBg: "#FFFAEB",
          warningBorder: "#FEDF89",
        },
      },
      borderRadius: {
        DEFAULT: "4px",
        md: "6px",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["IBM Plex Mono", "Menlo", "Consolas", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
