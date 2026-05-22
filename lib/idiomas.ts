// lib/idiomas.ts
// ----------------------------------------------------------------------------
// Lista canonica de idiomas que un proveedor puede declarar en su perfil.
// Se persisten como labels en la columna text[] proveedores.idiomas, sin
// codigos ISO ni traduccion — guardamos exactamente lo que el usuario ve.
// Para agregar un idioma: pushear el label aca y validar que no rompa
// queries existentes (ningun lugar filtra por enum estricto).
// ----------------------------------------------------------------------------

export const IDIOMAS_DISPONIBLES: string[] = [
    'Español',
    'Inglés',
    'Portugués',
    'Francés',
    'Alemán',
    'Italiano',
];
