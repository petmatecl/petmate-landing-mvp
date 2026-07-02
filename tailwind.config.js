/**
 * DESIGN TOKENS — Pawnecta (sistema visual v2)
 *
 * Paleta actual:
 *   accent.*  → Verde vivo (base #22C55E). Acento principal para acciones,
 *               botones, highlights. IMPORTANTE: botones filled con texto
 *               blanco usan accent-600 (#16A34A, WCAG AA 4.7:1). accent-500
 *               (#22C55E) se reserva para focus rings, iconos sobre fondos
 *               claros, highlights sobre bg-deep-900, detalles de acento.
 *   deep.*    → Verde petroleo (base #134E4A). Elementos serios, textos de
 *               peso, footer, superficies dark alternativas.
 *   surface.* → Superficies neutrales.
 *   brand.*   → LEGACY / DEPRECATED. Los pocos usos que queden se redirigen
 *               a los mismos hex que accent.*. No usar en codigo nuevo — usar
 *               accent.* directamente.
 *
 * Fuente:
 *   sans → Outfit (via next/font/google, ver pages/_app.tsx). Vuelta a la
 *          fuente original — probamos Nunito y Poppins+Inter en la fase
 *          fundacional pero volvimos a Outfit. Se conserva la mejora
 *          tecnica: cargada por next/font en vez de <link> a fonts.google.
 *
 * Migracion progresiva (rollout Commit 2+): los componentes usan `emerald-*`
 * de Tailwind default en el legacy; se migran pantalla por pantalla a
 * accent-* / deep-*. Ambos verdes (accent y emerald) son muy similares al
 * ojo, la convivencia durante el rollout no genera choque visual.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Verde acento (base #22C55E) ────────────────────────────────
        // Escala oficial Tailwind `green-*` — la usamos con nuestro prefix
        // semantico `accent-*` para diferenciar de `emerald-*` legacy.
        accent: {
          50:  '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',  // ⭐ base — focus rings, iconos, highlights
          600: '#16A34A',  // ⭐ botones filled con texto blanco (WCAG AA)
          700: '#15803D',  // hover de boton primario
          800: '#166534',
          900: '#14532D',
        },

        // ── Verde petroleo (base #134E4A) ──────────────────────────────
        // Escala oficial Tailwind `teal-*` — la usamos con nuestro prefix
        // semantico `deep-*`. base #134E4A = teal-900.
        deep: {
          50:  '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',  // hover sobre botones deep
          900: '#134E4A',  // ⭐ base — footer, textos peso, superficies dark
          950: '#042F2E',  // contraste maximo
        },

        // ── DEPRECATED: brand.* — redirigido a accent.* ─────────────────
        // Legacy tokens del sistema anterior. Cero usos actuales en el
        // codebase (grep confirmado en Commit 1 auditoria). Se conserva
        // redirigido a accent-* por si algun futuro import lo referencia
        // — el color resultante sera consistente con el nuevo sistema.
        // No usar en codigo nuevo.
        brand: {
          DEFAULT: '#16A34A',  // accent-600
          light:   '#F0FDF4',  // accent-50
          dark:    '#14532D',  // accent-900
          50:  '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },

        surface: {
          DEFAULT: '#FFFFFF',
          subtle:  '#F8FAFC',  // slate-50
          border:  '#E2E8F0',  // slate-200
        },
      },
      fontFamily: {
        // Outfit para todo — cuerpo, titulos, botones, labels. La variable
        // --font-outfit la setea next/font/google via pages/_app.tsx.
        sans: ['var(--font-outfit)', 'sans-serif'],
      },
      boxShadow: {
        card:  '0 1px 3px 0 rgb(0 0 0 / 0.05)',
        modal: '0 20px 60px -15px rgb(0 0 0 / 0.15)',
      },
      borderRadius: {
        xl:   '1rem',
        card: '1rem',    // 16px = rounded-2xl
        chip: '9999px',  // rounded-full
      },
    },
  },
  plugins: [],
};
