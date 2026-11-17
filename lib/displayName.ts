// lib/displayName.ts
// -----------------------------------------------------------------------------
// Helper único para resolver el nombre de un proveedor en superficie pública.
// Regla (decisión PO 2026-11-17, sprint pii-nombre-publico):
//   1. Si `nombre_publico` está seteado (no vacío trimmed) → retornar literal.
//   2. Si no, componer "Nombre I." = primer token de `nombre` + inicial del
//      primer apellido. El apellido puede venir en `apellido_p` separado o
//      embutido como segundo token de `nombre` (dato sucio de buscadores).
//      Si no hay apellido en ningún lado → solo primer token del nombre.
//   3. Si no hay nombre tampoco → 'Proveedor'.
//
// Nunca exponer apellido completo en superficie pública — el claim del
// dashboard dice "Nombre legal: datos de registro, no se muestran
// públicamente". Fase 1 pre-launch cierra el leak en HTML/ld+json/og/cards.
// Fase 2 post-launch (sprint PII-VIEW-TIGHT) ajusta la vista
// `proveedores_publicos` para no exponer `nombre`/`apellido_p` al rol anon.
//
// Mismo formato que `resolveSenderName` de `pages/api/notifications/new-message.ts`
// (sprint hf-name-resolve PR #95). La lógica pura vive acá; el endpoint
// consume este helper.
// -----------------------------------------------------------------------------

export interface DisplayNameInput {
    nombre_publico?: string | null;
    nombre?: string | null;
    apellido_p?: string | null;
}

export function displayName(p: DisplayNameInput | null | undefined): string {
    if (!p) return 'Proveedor';

    const np = (p.nombre_publico ?? '').trim();
    if (np) return np;

    const nombreFull = (p.nombre ?? '').trim();
    if (!nombreFull) return 'Proveedor';

    const tokens = nombreFull.split(/\s+/).filter(Boolean);
    const nombrePila = tokens[0];

    const apellidoSeparado = (p.apellido_p ?? '').trim();
    if (apellidoSeparado) {
        return `${nombrePila} ${apellidoSeparado[0].toUpperCase()}.`;
    }
    // Apellido embutido como segundo token del `nombre` (dato de buscadores).
    if (tokens.length >= 2 && tokens[1]) {
        return `${nombrePila} ${tokens[1][0].toUpperCase()}.`;
    }
    // Solo un token — devolver tal cual, sin inicial.
    return nombrePila;
}
