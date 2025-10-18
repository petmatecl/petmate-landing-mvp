/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    // './app/**/*.{js,ts,jsx,tsx}', // si llegas a usar /app
  ],
  theme: {
    extend: {
      // Puedes usar directamente la paleta "rose" y "neutral" de Tailwind.
      // Si luego quieres un color de marca propio, lo añadimos aquí.
    },
  },
  plugins: [],
};
