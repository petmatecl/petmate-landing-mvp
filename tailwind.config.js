/**
 * DESIGN TOKENS — Pawnecta (sistema visual v2)
 *
 * Paleta de MARCA (por color):
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
 * Tokens SEMANTICOS (por significado, no por color):
 *   success.* → estado positivo/exito (aprobado, confirmado, verificado, online).
 *               Alias de la escala `emerald` de Tailwind. IMPORTANTE: es DISTINTO
 *               de `accent.*` a proposito — accent es la marca (green/grass),
 *               success es el estado. Separandolos podemos rotarlos independiente
 *               (ej. cambiar la marca sin afectar como se ven los estados de
 *               moderacion) y evita el clasico "verde de marca = verde de ok"
 *               que confunde al usuario cuando lee un boton primary como si
 *               fuera un estado positivo.
 *   danger.*  → estado negativo/error (rechazado, suspendido, cancelado). Alias
 *               de `red`.
 *   warning.* → estado de atencion (pendiente, suspendido, alerta). Alias de
 *               `amber`.
 *   info.*    → estado informativo neutro (categoria, tag no accionable). Alias
 *               de `blue`.
 *
 *   Los 4 tokens semanticos existen para colapsar los ~27 emerald-* que
 *   sobrevivieron al rollout de color como "semantica de estado intencional"
 *   comentados en el codebase (pares/triadas aprobar/rechazar, presencia,
 *   estados de solicitud, etc.). El sprint de tokens semanticos migra esos
 *   emerald-* a success-* uno por uno; hasta entonces ambos coexisten y
 *   apuntan al MISMO hex (emerald default de Tailwind), o sea CERO cambio
 *   visual mientras se migra.
 *
 * Fuente:
 *   sans → Outfit (via next/font/google, ver lib/fonts.ts, aplicado en
 *          _app.tsx y _document.tsx). Vuelta a la fuente original — probamos
 *          Nunito y Poppins+Inter en la fase fundacional pero volvimos a
 *          Outfit.
 *
 * Migracion progresiva (rollout Commit 2+): los componentes usan `emerald-*`
 * de Tailwind default en el legacy; se migran pantalla por pantalla a
 * accent-* / deep-*. Ambos verdes (accent y emerald) son muy similares al
 * ojo, la convivencia durante el rollout no genera choque visual.
 */
const colors = require('tailwindcss/colors');

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

        // ── Tokens SEMANTICOS (por significado, no por color) ───────────
        // Aliases de escalas oficiales de Tailwind. NO son hex custom —
        // apuntan al mismo objeto de `tailwindcss/colors`, o sea que
        // success-600 === emerald-600 exactamente (mismo hex). Esto tiene
        // dos consecuencias importantes:
        //   1. Cero costo de bundle si nadie los usa (Tailwind JIT solo
        //      emite clases referenciadas — mismo hex, dos clases posibles
        //      pero solo se emite la que aparece en el content).
        //   2. Durante la migracion, emerald-600 y success-600 conviven
        //      pintando el MISMO color exacto. Podemos migrar un archivo
        //      a la vez sin riesgo visual.
        // Ver comentario del header para el "por que" semantico.
        success: colors.emerald,
        danger:  colors.red,
        warning: colors.amber,
        info:    colors.blue,
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
