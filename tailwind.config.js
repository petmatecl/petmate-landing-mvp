/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0faf7",
          100: "#d6f4ea",
          200: "#b0e7d6",
          300: "#85d7c0",
          400: "#5bcaa9",
          500: "#35b993",   // acento principal (no chillón)
          600: "#269a7b",
          700: "#1d7861",
          800: "#175e4d",
          900: "#114438",
        },
      },
      boxShadow: {
        card: "0 8px 20px rgba(0,0,0,.08)",
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
};
