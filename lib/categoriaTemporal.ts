// lib/categoriaTemporal.ts
// ----------------------------------------------------------------------------
// Helper para decidir QUE forma toma el agendamiento segun la categoria del
// servicio. La categoria es la senal robusta para clasificar multi-dia vs
// puntual — depende del catalogo, no de lo que elige el proveedor en
// `unidad_precio` (que es libre, ambigua, y no estructural).
//
// Variantes del feature "rango de fechas multi-dia":
//   Fase 1 (HOY):
//     V1 = puntual fecha+hora (paseos, peluqueria, adiestramiento, veterinario,
//          traslado, fotografia). Form: datetime-local. Sin cambios vs Sprint 3.
//     V2 = cuidado rango de noches (sin hora — entrega/retiro se conversa en
//          chat). Form: 2 inputs date.
//
//   Fase 2 (TODO):
//     V4a/V4b — cuidado con modalidad=casa_tutor: dualidad noches/horas +
//     direccion del tutor. La modalidad la elige el tutor (chip selector)
//     cuando el servicio ofrece >=1.
//
//   Fase 3 (TODO):
//     V3 — guarderia dia(s) con horario. Por ahora cae en V1 hasta que se
//     implemente su variante propia.
//
// La senal es CATEGORIA, no modalidad ni unidad_precio. Para Fase 1 esto
// significa que TODO servicio de categoria 'cuidado' obtiene V2,
// independiente de la modalidad seleccionada. En Fase 2 refinaremos a:
// cuidado + casa_cuidador/recinto → V2; cuidado + casa_tutor → V4a/V4b.
// ----------------------------------------------------------------------------

export type VarianteFormulario = 'V1' | 'V2';

export const CATEGORIAS_MULTI_DIA: ReadonlySet<string> = new Set(['cuidado']);

export function esCategoriaMultiDia(slug: string | null | undefined): boolean {
    if (!slug) return false;
    return CATEGORIAS_MULTI_DIA.has(slug);
}

export function getVarianteFormulario(
    categoriaSlug: string | null | undefined
): VarianteFormulario {
    return esCategoriaMultiDia(categoriaSlug) ? 'V2' : 'V1';
}
