// lib/categoriaTemporal.ts
// ----------------------------------------------------------------------------
// Helper para decidir QUE forma toma el agendamiento segun la categoria del
// servicio (+ modalidad elegida + modo tarifa para servicios de cuidado).
// La categoria es la senal robusta para clasificar multi-dia vs puntual.
//
// Variantes del feature "rango de fechas multi-dia":
//
//   V1 — puntual fecha+hora (paseos, peluqueria, adiestramiento, veterinario,
//        traslado, fotografia). Form: 1 datetime-local. Sin direccion en BD.
//
//   V2 — cuidado rango de noches (modalidad casa_cuidador o recinto). Form:
//        2 inputs date sin hora; entrega/retiro se conversa por chat. Sin
//        direccion en BD (lugar del proveedor).
//
//   V4a — cuidado a domicilio del tutor rango de noches (modalidad casa_tutor
//         + modo 'noches'). Form: 2 inputs date + textarea direccion.
//
//   V4b — cuidado a domicilio del tutor puntual por horas (modalidad casa_tutor
//         + modo 'horas'). Form: 1 datetime-local + input numerico de horas
//         (1-12) + textarea direccion.
//
//   V3 — Fase 3 TODO: guarderia dia[s] con horario. Por ahora cae a V1.
// ----------------------------------------------------------------------------

export type VarianteFormulario = 'V1' | 'V2' | 'V4a' | 'V4b';

export type ModalidadCuidado = 'casa_tutor' | 'casa_cuidador' | 'recinto';
export type ModoTarifa = 'noches' | 'horas';

export const CATEGORIAS_MULTI_DIA: ReadonlySet<string> = new Set(['cuidado']);

// Labels canonicos para mostrar al tutor en el chip selector + al proveedor
// en /mis-solicitudes / panel / emails. Espejan los labels neutros de
// lib/camposPorCategoria.ts (cuidado.modalidad opciones). Mantener en sync
// si el catalogo cambia.
export const MODALIDAD_LABELS: Record<ModalidadCuidado, string> = {
    casa_tutor: 'En la casa del tutor',
    casa_cuidador: 'En la casa del cuidador',
    recinto: 'En recinto o local',
};

export function esCategoriaMultiDia(slug: string | null | undefined): boolean {
    if (!slug) return false;
    return CATEGORIAS_MULTI_DIA.has(slug);
}

export function esModalidadValida(value: unknown): value is ModalidadCuidado {
    return value === 'casa_tutor' || value === 'casa_cuidador' || value === 'recinto';
}

/**
 * Resuelve la variante del formulario a partir de la senal disponible. Para
 * categorias no-cuidado retorna V1 (no importan los otros params). Para
 * cuidado:
 *   - modalidad casa_tutor + modo 'horas'   → V4b
 *   - modalidad casa_tutor + modo 'noches'  → V4a
 *   - modalidad casa_tutor + modo undefined → V4a (fallback; la UI bloquea
 *     submit hasta que el tutor elija modo, asi que este fallback nunca
 *     llega a INSERT — solo es default de tipo)
 *   - cualquier otra modalidad (casa_cuidador, recinto, null/undefined) → V2
 *
 * El modal usa el state directamente (no llama a este helper para decidir
 * que UI mostrar mid-flow); este helper sirve principalmente al endpoint
 * de notify y al render para clasificar el agendamiento ya persistido.
 */
export function getVarianteFormulario(
    categoriaSlug: string | null | undefined,
    modalidadElegida?: string | null,
    modoTarifa?: string | null
): VarianteFormulario {
    if (!esCategoriaMultiDia(categoriaSlug)) return 'V1';
    if (modalidadElegida === 'casa_tutor') {
        return modoTarifa === 'horas' ? 'V4b' : 'V4a';
    }
    return 'V2';
}
