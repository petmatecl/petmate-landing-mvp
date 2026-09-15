// lib/hooks/useScrollToTopOnTabChange.ts
// ---------------------------------------------------------------------------
// Sprint d-ui-paneles SCROLL-TAB (2026-09-15) — scroll al top del viewport
// cuando el activeTab de un panel cambia. Aplicable a `/admin` y `/proveedor`
// que tienen sidebar sticky + contenido scrolleable — sin este hook, al
// cambiar tab el contenido nuevo arranca en el offset del scroll anterior,
// obligando al user a scrollear manual arriba para ver el heading.
//
// Diseño:
//   - `useEffect` con dep `[activeTab]` → dispara post-render del tab nuevo.
//   - `behavior: 'smooth'` respeta `prefers-reduced-motion` (browsers modernos
//     lo aplican naturalmente cuando el user tiene la preferencia).
//   - `top: 0` — arriba del viewport, no del container (el sidebar es sticky,
//     no scrolleable; el scroll del viewport es el que necesita ir arriba).
//   - No-op en el mount inicial: el `useRef` guarda el previo y solo scrollea
//     cuando hay transición real (evita scrollTo al primer paint de la página).
//
// Uso:
//   useScrollToTopOnTabChange(activeTab);
// ---------------------------------------------------------------------------
import { useEffect, useRef } from 'react';

export function useScrollToTopOnTabChange(activeTab: string): void {
    const prevRef = useRef<string | null>(null);
    useEffect(() => {
        // Skip primer render — no scroll al mount inicial de la página.
        if (prevRef.current === null) {
            prevRef.current = activeTab;
            return;
        }
        if (prevRef.current === activeTab) return;
        prevRef.current = activeTab;
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [activeTab]);
}
