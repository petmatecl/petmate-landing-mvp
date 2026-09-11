// e2e/fixtures/timing.ts
// ---------------------------------------------------------------------------
// Sprint estab-e2e (2026-09-11) — helper de instrumentación de timing por
// fase para diagnosticar cuello de botella de la suite f2-3.
//
// Diseño: cero deps, cero side effects más allá de `console.log`. Los tests
// llaman `timeMark('label')` en cada punto de interés (antes/después de
// INSERT, antes/después de goto, antes/después de fetch cliente). El CI
// captura stdout de los tests via `--reporter=list` (que ya está) + un
// `--reporter=json` adicional que guarda el output a artifact para post-
// procesamiento.
//
// Formato del log: `[TIMING] <label> at <epoch-ms>` (start mark) o
// `[TIMING] <label> took <delta-ms>ms` (end mark con delta desde un start).
// Fácil de grep + parseable para el summary.
// ---------------------------------------------------------------------------

/**
 * Emite una marca de tiempo. Si `sinceMs` viene, calcula el delta desde ese
 * epoch-ms y lo reporta como `took Xms`; si no, reporta el `at <epoch-ms>`
 * como start mark. Retorna siempre el epoch-ms actual para encadenar.
 *
 * @param label   Identificador humano de la marca (ej. 'crearServicio.INSERT.start').
 * @param sinceMs Opcional. Si viene, se reporta como delta desde ese punto.
 * @returns       Epoch-ms al momento de la marca (usable como sinceMs).
 */
export function timeMark(label: string, sinceMs?: number): number {
    const nowMs = Date.now();
    if (sinceMs !== undefined) {
        const delta = nowMs - sinceMs;
        console.log(`[TIMING] ${label} took ${delta}ms`);
    } else {
        console.log(`[TIMING] ${label} at ${nowMs}`);
    }
    return nowMs;
}
