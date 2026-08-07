// PL2 (Sprint PRELAUNCH-1): gate por entorno para no contaminar GA con
// tracking de staging/preview. Solo en producción real (NEXT_PUBLIC_APP_ENV
// === 'production' — única env var que llega al bundle client, VERCEL_ENV NO
// tiene prefix NEXT_PUBLIC_ y queda undefined en browser) exponemos el
// tracking ID. En cualquier otro entorno GA_TRACKING_ID es null → el
// condicional `hasAnalytics && GA_TRACKING_ID` en components/ConsentScripts.tsx
// impide inyectar el script de gtag → cero data enviada a GA.
// Los helpers pageview()/event()/trackEvent() abajo tienen guarda adicional
// (`!window.gtag`) como doble candado.
const IS_PROD_CLIENT = process.env.NEXT_PUBLIC_APP_ENV === 'production';
export const GA_TRACKING_ID: string | null = IS_PROD_CLIENT
    ? (process.env.NEXT_PUBLIC_GA_ID || "G-SCNG5J67E9")
    : null;

declare global {
    interface Window {
        gtag: any;
    }
}

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: string) => {
    if (typeof window === 'undefined' || !window.gtag) return;
    window.gtag("config", GA_TRACKING_ID, {
        page_path: url,
    });
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({ action, category, label, value }: any) => {
    if (typeof window === 'undefined' || !window.gtag) return;
    window.gtag("event", action, {
        event_category: category,
        event_label: label,
        value: value,
    });
};

// ============================================================================
// Sprint ANALYTICS-1 (2026-08-07) — Taxonomía GA aprobada PO 2026-08-04.
//
// Union type de los 11 eventos snake_case español (typo de evento = error de
// compilación, no dato sucio en el dashboard). Los 4 KEY EVENTS marcados
// abajo son las conversiones que Aldo marca en GA4 → Admin → Events →
// Mark as key event.
//
// Métrica norte: "conexiones semanales" = contacto_iniciado + reserva_confirmada
// (indicador del valor de mercado que Pawnecta genera — los 2 lados del
// funnel demanda que concretan interacción).
// ============================================================================

// Funnel Oferta (proveedor).
export type EventoOferta =
    | 'registro_proveedor_iniciado'      // click CTAs "Publica gratis" / "Soy proveedor"
    | 'registro_proveedor_completado'    // ⭐ KEY — POST /api/auth/signup rol=proveedor success
    | 'verificacion_enviada'             // submit wizard verificación (carnet front+dorso)
    | 'servicio_publicado'               // ⭐ KEY — INSERT servicios_publicados success
    | 'agenda_activada';                 // toggle F1/F2 guardado en ServiceFormModal

// Funnel Demanda (tutor).
export type EventoDemanda =
    | 'busqueda_realizada'               // {categoria, comuna} — SearchBar submit / filtros apply
    | 'ficha_vista'                      // {servicio_id, categoria} — mount de /servicio/[id]
    | 'contacto_iniciado'                // ⭐ KEY — {canal: chat|whatsapp|telefono}
    | 'reserva_confirmada'               // ⭐ KEY — {familia: F1|F2|legacy} INSERT estado=confirmada
    | 'solicitud_enviada'                // INSERT estado=pendiente (flujo viejo)
    | 'resena_publicada';                // post-approval evaluaciones.estado=aprobado

// Union completo — usar como `EventoTracking` para expresar "cualquiera de los 11".
export type EventoTracking = EventoOferta | EventoDemanda;

/**
 * Dispara un evento tracking a GA4 respetando el gate PL2 por entorno.
 *
 * Contrato:
 * - En prod (`NEXT_PUBLIC_APP_ENV === 'production'` + `window.gtag` cargado
 *   por ConsentScripts tras user acepta cookies) → envía event al ID real.
 * - En cualquier otro entorno (staging/preview/dev/Playwright/SSR) → NO-OP
 *   silencioso. Cero data contaminada al dashboard (esa fue la razón del
 *   fix PL2 del sprint PRELAUNCH-1).
 *
 * El typing del `nombre` como `EventoTracking` fuerza el catálogo cerrado
 * de la taxonomía aprobada — typo de evento es error de compilación TS,
 * no un evento sucio en GA que no sabemos que existe.
 *
 * @param nombre Uno de los 11 eventos de la taxonomía.
 * @param params Parámetros del evento (según definición de la taxonomía).
 */
export function trackEvent(
    nombre: EventoTracking,
    params?: Record<string, string | number | boolean>,
): void {
    // Guard SSR: window solo existe client-side.
    if (typeof window === 'undefined') return;
    // Guard de gate PL2: si GA_TRACKING_ID es null (staging/preview/dev),
    // ConsentScripts NO inyecta gtag → window.gtag undefined → early return.
    // Este check es redundante con el de abajo pero explicita el intent:
    // "cero data desde entornos non-prod, by design".
    if (!GA_TRACKING_ID) return;
    // Guard doble: gtag script puede no haber cargado aún (user no aceptó
    // cookies o script tardó). En ese caso también no-op silencioso.
    if (!window.gtag) return;
    window.gtag('event', nombre, params ?? {});
}
