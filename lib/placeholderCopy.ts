// lib/placeholderCopy.ts
// Helper para cards placeholder "Aquí podría estar tu anuncio"
// Usado en home franjas, /explorar, /[categoria], /[categoria]/[comuna]

// Sprint home-placeholders (2026-11-13) — agregada key `cuidado` (vigente en
// las franjas del home). `hospedaje` + `domicilio` quedan como alias deprecados
// (slugs legacy fusionados en `cuidado` — ver CLAUDE.md > Tablas principales >
// categorias_servicio). No se remueven todavía para preservar compat con
// callers históricos que puedan referenciar los slugs viejos.
const PLACEHOLDER_QUESTIONS: Record<string, string> = {
    cuidado: '¿Cuidas mascotas?',
    hospedaje: '¿Hospedas mascotas?',               // deprecated, alias cuidado
    guarderia: '¿Tienes guardería?',
    domicilio: '¿Cuidas mascotas a domicilio?',     // deprecated, alias cuidado
    paseos: '¿Eres paseador?',
    peluqueria: '¿Eres peluquero canino?',
    adiestramiento: '¿Eres adiestrador?',
    veterinario: '¿Eres veterinario a domicilio?',
    traslado: '¿Trasladas mascotas?',
    fotografia: '¿Fotografías mascotas?',
};

const PLACEHOLDER_QUESTIONS_WITH_COMUNA: Record<string, (comuna: string) => string> = {
    cuidado: (c) => `¿Cuidas mascotas en ${c}?`,
    hospedaje: (c) => `¿Hospedas mascotas en ${c}?`,               // deprecated
    guarderia: (c) => `¿Tienes guardería en ${c}?`,
    domicilio: (c) => `¿Cuidas mascotas a domicilio en ${c}?`,     // deprecated
    paseos: (c) => `¿Eres paseador en ${c}?`,
    peluqueria: (c) => `¿Eres peluquero canino en ${c}?`,
    adiestramiento: (c) => `¿Eres adiestrador en ${c}?`,
    veterinario: (c) => `¿Eres veterinario a domicilio en ${c}?`,
    traslado: (c) => `¿Trasladas mascotas en ${c}?`,
    fotografia: (c) => `¿Fotografías mascotas en ${c}?`,
};

// Sprint home-placeholders (2026-11-13) — variante "has": texto invitador
// cuando el slug SÍ tiene servicios pero la franja total < 4. Aprobada PO
// 2026-11-13 (peluquería con corrección "haces peluquería canina"). Solo
// aplica en home carousel (variant='compact'); /explorar y /[categoria]
// usan el diccionario zero sin cambios.
const PLACEHOLDER_QUESTIONS_HAS: Record<string, string> = {
    cuidado: '¿También cuidas mascotas?',
    guarderia: '¿También ofreces guardería?',
    paseos: '¿También paseas perros?',
    peluqueria: '¿También haces peluquería canina?',
    adiestramiento: '¿También entrenas perros?',
    veterinario: '¿También atiendes mascotas a domicilio?',
    traslado: '¿También trasladas mascotas?',
    fotografia: '¿También fotografías mascotas?',
};

/**
 * Construye la pregunta del placeholder según contexto.
 *  - Con categoría + comuna: "¿Hospedas mascotas en Las Condes?"
 *  - Solo categoría: "¿Hospedas mascotas?"
 *  - Sin contexto: "¿Tienes un servicio para mascotas?"
 *
 * Sprint home-placeholders (2026-11-13) — parámetro `kind` opcional:
 *  - 'zero' (default): el slug tiene 0 servicios ("¿Eres X?")
 *  - 'has': el slug tiene servicios pero la franja total < 4 ("¿También X?")
 * `kind='has'` NO soporta comuna (no tiene sentido invitar con comuna cuando
 * el proveedor existente ya cubre esa comuna). Si viene comuna + kind='has',
 * cae al texto has sin comuna.
 */
export function getPlaceholderQuestion(categoriaSlug?: string, comuna?: string, kind: 'zero' | 'has' = 'zero'): string {
    if (!categoriaSlug) return '¿Tienes un servicio para mascotas?';
    if (kind === 'has') {
        return PLACEHOLDER_QUESTIONS_HAS[categoriaSlug] ?? PLACEHOLDER_QUESTIONS[categoriaSlug] ?? '¿Tienes un servicio para mascotas?';
    }
    if (comuna && PLACEHOLDER_QUESTIONS_WITH_COMUNA[categoriaSlug]) {
        return PLACEHOLDER_QUESTIONS_WITH_COMUNA[categoriaSlug](comuna);
    }
    return PLACEHOLDER_QUESTIONS[categoriaSlug] || '¿Tienes un servicio para mascotas?';
}

/**
 * Subtítulo del placeholder (1 línea bajo la pregunta principal).
 *
 * Sprint home-placeholders (2026-11-13) — criterio HOME-VERDAD: no afirmar
 * demanda que hoy no podemos respaldar ("Tutores buscan…", "con cupo",
 * "prefieren…"). Un solo subtítulo por variant, independiente del slug:
 *  - compact (home carousel): "Llega a tutores cerca de ti" — invitación
 *    neutra que respeta que el card es clickable al register.
 *  - full (/explorar, /[categoria]): "Aún no hay proveedores de esta
 *    categoría en tu zona." — descriptivo, sin CTA, respeta política
 *    E-2 UX-2 (variant='full' sin Link al register).
 *
 * Anterior diccionario por-slug removido ("Tutores buscan paseadores con
 * tiempo y energía" etc.) por decisión PO 2026-11-13 con alcance ampliado
 * a todas las superficies (criterio HOME-VERDAD).
 */
export function getPlaceholderSubtitle(variant: 'compact' | 'full' = 'full'): string {
    if (variant === 'compact') return 'Llega a tutores cerca de ti';
    return 'Aún no hay proveedores de esta categoría en tu zona.';
}

/**
 * Construye la URL de registro con pre-fill via query params.
 * Pre-fill leído por pages/register.tsx en useEffect.
 */
export function buildRegisterUrl(categoriaSlug?: string, comuna?: string): string {
    const params = new URLSearchParams({ rol: 'proveedor' });
    if (categoriaSlug) params.set('categoria', categoriaSlug);
    if (comuna) params.set('comuna', comuna);
    return `/register?${params.toString()}`;
}
