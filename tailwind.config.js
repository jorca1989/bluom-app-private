/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
    "./utils/**/*.{js,jsx,ts,tsx}",
    "./providers/**/*.{js,jsx,ts,tsx}",
    "./context/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "var(--brand-bg)",
          surface: "var(--brand-surface)",
          "surface-muted": "var(--brand-surface-muted)",
          text: "var(--brand-text)",
          "text-muted": "var(--brand-text-muted)",
          border: "var(--brand-border)",
          primary: "var(--brand-primary)",
          accent: "var(--brand-accent)",
          "on-primary": "var(--brand-on-primary)",
        },
      },
    },
  },
  plugins: [],
};
