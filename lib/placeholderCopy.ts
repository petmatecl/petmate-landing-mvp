// lib/placeholderCopy.ts
// Helper para cards placeholder "Aquí podría estar tu anuncio"
// Usado en home franjas, /explorar, /[categoria], /[categoria]/[comuna]

const PLACEHOLDER_QUESTIONS: Record<string, string> = {
    hospedaje: '¿Hospedas mascotas?',
    guarderia: '¿Tienes guardería?',
    domicilio: '¿Cuidas mascotas a domicilio?',
    paseos: '¿Eres paseador?',
    peluqueria: '¿Eres peluquero canino?',
    adiestramiento: '¿Eres adiestrador?',
    veterinario: '¿Eres veterinario a domicilio?',
    traslado: '¿Trasladas mascotas?',
    fotografia: '¿Fotografías mascotas?',
};

const PLACEHOLDER_QUESTIONS_WITH_COMUNA: Record<string, (comuna: string) => string> = {
    hospedaje: (c) => `¿Hospedas mascotas en ${c}?`,
    guarderia: (c) => `¿Tienes guardería en ${c}?`,
    domicilio: (c) => `¿Cuidas mascotas a domicilio en ${c}?`,
    paseos: (c) => `¿Eres paseador en ${c}?`,
    peluqueria: (c) => `¿Eres peluquero canino en ${c}?`,
    adiestramiento: (c) => `¿Eres adiestrador en ${c}?`,
    veterinario: (c) => `¿Eres veterinario a domicilio en ${c}?`,
    traslado: (c) => `¿Trasladas mascotas en ${c}?`,
    fotografia: (c) => `¿Fotografías mascotas en ${c}?`,
};

/**
 * Construye la pregunta del placeholder según contexto.
 *  - Con categoría + comuna: "¿Hospedas mascotas en Las Condes?"
 *  - Solo categoría: "¿Hospedas mascotas?"
 *  - Sin contexto: "¿Tienes un servicio para mascotas?"
 */
export function getPlaceholderQuestion(categoriaSlug?: string, comuna?: string): string {
    if (!categoriaSlug) return '¿Tienes un servicio para mascotas?';
    if (comuna && PLACEHOLDER_QUESTIONS_WITH_COMUNA[categoriaSlug]) {
        return PLACEHOLDER_QUESTIONS_WITH_COMUNA[categoriaSlug](comuna);
    }
    return PLACEHOLDER_QUESTIONS[categoriaSlug] || '¿Tienes un servicio para mascotas?';
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
