export function cleanRut(rut: string): string {
    return typeof rut === 'string' ? rut.replace(/[^0-9kK]/g, '').toUpperCase() : '';
}

export function validateRut(rut: string): boolean {
    if (!rut) return false;
    const clean = cleanRut(rut);
    if (clean.length < 2) return false;

    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    let suma = 0;
    let multiplo = 2;

    for (let i = 1; i <= body.length; i++) {
        const index = multiplo * parseInt(clean.charAt(body.length - i));
        suma = suma + index;
        if (multiplo < 7) {
            multiplo = multiplo + 1;
        } else {
            multiplo = 2;
        }
    }

    const dvEsperado = 11 - (suma % 11);
    const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();

    return dvCalculado === dv;
}

export function formatRut(rut: string): string {
    const clean = cleanRut(rut);
    if (clean.length <= 1) return clean;

    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);

    let rutFormatted = body;
    if (body.length > 3) {
        rutFormatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    const formatted = `${rutFormatted}-${dv}`;

    // Validar largo máximo (12 caracteres: xx.xxx.xxx-x)
    if (formatted.length > 12) {
        return formatted.substring(0, 12);
    }

    return formatted;
}
