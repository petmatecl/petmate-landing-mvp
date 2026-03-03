/**
 * DESIGN TOKENS OFICIALES — Pawnecta
 * brand.*   → verde primario  (bg-brand-DEFAULT = emerald-600)
 * surface.*  → fondos y bordes de superficie
 * shadow-card / shadow-modal → elevaciones estándar
 * rounded-card / rounded-chip → radios estándar
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#059669',  // emerald-600
          light: '#ECFDF5',  // emerald-50
          dark: '#065F46',  // emerald-900
          50: "#f0faf7",
          100: "#d6f4ea",
          200: "#b0e7d6",
          300: "#85d7c0",
          400: "#5bcaa9",
          500: "#35b993",
          600: "#269a7b",
          700: "#1d7861",
          800: "#175e4d",
          900: "#114438",
        },
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#F8FAFC',   // slate-50
          border: '#E2E8F0',   // slate-200
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
        modal: '0 20px 60px -15px rgb(0 0 0 / 0.15)',
      },
      borderRadius: {
        xl: '1rem',
        card: '1rem',    // 16px = rounded-2xl
        chip: '9999px',  // rounded-full
      },
    },
  },
  plugins: [],
};
