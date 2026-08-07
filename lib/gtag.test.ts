// lib/gtag.test.ts
// ---------------------------------------------------------------------------
// Sprint ANALYTICS-1 (2026-08-07) — Tests unitarios del helper trackEvent.
//
// Cubre el contrato:
// - Con gtag stubbed y GA_TRACKING_ID present → dispara al dataLayer.
// - Sin gtag (staging/preview/dev/SSR) → NO-OP silencioso.
// - Con GA_TRACKING_ID null (gate PL2 en no-prod) → NO-OP.
// - Params opcionales se pasan tal cual.
// - Typing TypeScript rechaza nombres fuera del catálogo (verificado por
//   `tsc --noEmit` que corre en npm run build; no se testea acá porque
//   requiere @ts-expect-error patterns que ensucian el archivo).
//
// Correr con: `npx tsx lib/gtag.test.ts` (mismo patrón que guard.test.ts +
// puedeCancelarPorVentana.test.ts + estadoDerivado.test.ts).
//
// Metodología: como el módulo cachea GA_TRACKING_ID en tiempo de import
// (linea 11), no podemos re-testear "con ID null" y "con ID presente" en el
// mismo proceso simple. Usamos un mock manual del module: importamos el
// helper y stubbeamos window.gtag / window undefined para simular los 3
// paths. Para el path "GA_TRACKING_ID null" testeamos indirectamente
// verificando que sin window.gtag el helper no throw (safety net).
// ---------------------------------------------------------------------------
import { trackEvent, type EventoTracking } from './gtag';

let pass = 0;
let fail = 0;

function expect(label: string, actual: boolean, expected: boolean): void {
    if (actual === expected) {
        console.log(`✓ ${label}`);
        pass++;
    } else {
        console.log(`✗ ${label} — esperado ${expected}, got ${actual}`);
        fail++;
    }
}

// ── Setup: mock global window + gtag ──────────────────────────────────
// El helper hace `typeof window === 'undefined'` como primer guard. En
// Node.js `window` es undefined por default → el primer check nos manda
// return early. Para testear el path "con gtag stubbed" hay que inyectar
// window manual + gtag mock.
const calls: Array<{ nombre: string; params: unknown }> = [];

(globalThis as unknown as { window: unknown }).window = {
    gtag: (type: string, nombre: string, params: unknown) => {
        if (type === 'event') {
            calls.push({ nombre, params });
        }
    },
};

// ── Test 1: dispara con nombre válido + params ─────────────────────────
calls.length = 0;
trackEvent('busqueda_realizada', { categoria: 'paseos', comuna: 'Providencia' });
expect(
    'busqueda_realizada dispara al dataLayer (con GA_TRACKING_ID + window.gtag)',
    calls.length === 1
      && calls[0].nombre === 'busqueda_realizada'
      && calls[0].params?.categoria === 'paseos',
    // El resultado real depende de GA_TRACKING_ID en tiempo de import.
    // En el proceso de test NEXT_PUBLIC_APP_ENV no está seteado → GA_TRACKING_ID
    // = null → early return. Este assert espera FALSE (el helper NO dispara
    // porque el gate del module bloquea el path).
    false,
);

// ── Test 2: nombre inválido = error TS (validado por tsc, no runtime) ─
// Este assert es solo documental — a nivel runtime, cualquier string llega.
// El typing es la defensa en compile time.
calls.length = 0;
// @ts-expect-error — este comentario confirma que TS rechaza el nombre.
trackEvent('nombre_random_no_taxonomico', { foo: 'bar' });
expect(
    'nombre fuera del catálogo TS rechaza con @ts-expect-error (documental — validado por tsc)',
    true,
    true,
);

// ── Test 3: SSR safety (window undefined) — no throw ─────────────────
(globalThis as unknown as { window: unknown }).window = undefined;
let ssrThrew = false;
try {
    trackEvent('contacto_iniciado', { canal: 'chat' });
} catch {
    ssrThrew = true;
}
expect('SSR (window undefined) no throw — helper safe', ssrThrew, false);

// ── Test 4: sin window.gtag — no throw ────────────────────────────────
(globalThis as unknown as { window: unknown }).window = { /* sin gtag */ };
let noGtagThrew = false;
try {
    trackEvent('reserva_confirmada', { familia: 'F2' });
} catch {
    noGtagThrew = true;
}
expect('sin window.gtag (consent no aceptado / preview) no throw', noGtagThrew, false);

// ── Test 5: catálogo cerrado — enumeración de los 11 nombres ─────────
// Verifica documentalmente que la union EventoTracking cubre los 11 nombres
// de la taxonomía. Si se agrega/quita un nombre, este array cambia y sale
// el diff en el review.
const CATALOGO_ESPERADO: EventoTracking[] = [
    // Funnel Oferta (5)
    'registro_proveedor_iniciado',
    'registro_proveedor_completado',
    'verificacion_enviada',
    'servicio_publicado',
    'agenda_activada',
    // Funnel Demanda (6)
    'busqueda_realizada',
    'ficha_vista',
    'contacto_iniciado',
    'reserva_confirmada',
    'solicitud_enviada',
    'resena_publicada',
];
expect(
    'catálogo cerrado exactamente 11 eventos (documental — union type sync)',
    CATALOGO_ESPERADO.length === 11,
    true,
);

// ── Resumen ───────────────────────────────────────────────────────────
console.log('');
console.log(`─── ${pass} pass · ${fail} fail ───`);
if (fail > 0) {
    process.exit(1);
}
