// components/Emails/_shared/tokens.ts
// ---------------------------------------------------------------------------
// R7 — tokens visuales compartidos entre templates de email retrofitteados.
//
// Todos los estilos son email-safe: tablas + estilos inline únicamente. Nada
// de flex/SVG/fuentes custom. Verificado por render-diff en el retrofit
// R4.2 del recordatorio y aplicado uniformemente acá.
//
// MAPA SEMÁNTICO DE BANDA (decisión PO 2026-07-28):
//   - accent-50 (#F0FDF4) + border-left accent-600 (#16A34A) →
//     confirmaciones + solicitudes pendientes + confirmación automática.
//     Comunica identidad activa / evento positivo / oportunidad.
//   - slate-100 (#F1F5F9) + border-left slate-300 (#CBD5E1) → cancelaciones
//     y rechazos. Fecha como dato histórico; sin peso emocional positivo.
//   - Pill "MAÑANA" (accent-600 sólido) → EXCLUSIVO de RecordatorioReservaEmail.
//     NO se usa acá — usarlo en confirmaciones/cancelaciones rompe el mapa
//     y confunde el mensaje.
//
// COLORES:
// ---------------------------------------------------------------------------

export const COLORS = {
    // Marca
    accent50: '#F0FDF4',
    accent600: '#16A34A',
    deep900: '#134E4A',
    // Neutros
    white: '#FFFFFF',
    slate100: '#F1F5F9',
    slate200: '#E2E8F0',
    slate300: '#CBD5E1',
    slate500: '#64748B',
    slate600: '#475569',
    slate900: '#0F172A',
    text: '#334155',
    bg: '#F8FAFC',
};

export type BandaVariante = 'confirmacion' | 'cancelacion';

/**
 * Retorna los estilos de la card + banda de fecha según variante.
 * Confirmación: accent activo. Cancelación: neutro.
 */
export function bandaStyles(variante: BandaVariante): {
    card: React.CSSProperties;
    banda: React.CSSProperties;
    bandaFecha: React.CSSProperties;
    bandaSub: React.CSSProperties;
} {
    const isConfirmacion = variante === 'confirmacion';
    return {
        card: {
            backgroundColor: COLORS.white,
            border: `1px solid ${COLORS.slate200}`,
            borderLeft: `4px solid ${isConfirmacion ? COLORS.accent600 : COLORS.slate300}`,
            borderRadius: '10px',
            overflow: 'hidden' as const,
            margin: '24px 0',
        },
        banda: {
            backgroundColor: isConfirmacion ? COLORS.accent50 : COLORS.slate100,
            padding: '18px 20px',
            textAlign: 'center' as const,
        },
        bandaFecha: {
            color: COLORS.deep900,
            fontSize: '20px',
            fontWeight: 700 as const,
            lineHeight: '26px',
            margin: '0',
            wordBreak: 'break-word' as const,
        },
        bandaSub: {
            color: COLORS.slate600,
            fontSize: '13px',
            fontWeight: 400 as const,
            lineHeight: '18px',
            margin: '4px 0 0',
        },
    };
}

// ── estilos del listado etiqueta/valor (hairline entre filas) ──

export const listadoStyles = {
    contenedor: {
        padding: '4px 20px 8px',
    } as React.CSSProperties,
    fila: {
        padding: '14px 0',
        borderBottom: `1px solid ${COLORS.slate200}`,
    } as React.CSSProperties,
    filaUltima: {
        padding: '14px 0',
    } as React.CSSProperties,
    etiqueta: {
        color: COLORS.slate500,
        fontSize: '11px',
        letterSpacing: '0.05em',
        textTransform: 'uppercase' as const,
        fontWeight: 600 as const,
        margin: '0 0 4px',
    } as React.CSSProperties,
    // Peso regular para info general (Servicio, contraparte, Nota).
    valor: {
        color: COLORS.slate900,
        fontSize: '15px',
        lineHeight: '20px',
        margin: '0',
    } as React.CSSProperties,
    // Peso 600 para info accionable (Hora, Dónde).
    valorFuerte: {
        color: COLORS.slate900,
        fontSize: '15px',
        lineHeight: '20px',
        fontWeight: 600 as const,
        margin: '0',
    } as React.CSSProperties,
    valorItalica: {
        color: COLORS.text,
        fontSize: '15px',
        lineHeight: '20px',
        margin: '0',
        fontStyle: 'italic' as const,
    } as React.CSSProperties,
};

// ── estilos del layout general (shell del email) ──

export const layoutStyles = {
    main: {
        backgroundColor: COLORS.bg,
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
    } as React.CSSProperties,
    container: {
        backgroundColor: COLORS.white,
        margin: '40px auto',
        borderRadius: '16px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden' as const,
        maxWidth: '600px',
    } as React.CSSProperties,
    header: {
        backgroundColor: COLORS.deep900,
        padding: '32px',
        textAlign: 'center' as const,
    } as React.CSSProperties,
    logo: { margin: '0 auto' } as React.CSSProperties,
    content: { padding: '40px' } as React.CSSProperties,
    h1: {
        color: COLORS.slate900,
        fontSize: '22px',
        fontWeight: 'bold' as const,
        margin: '0 0 16px',
    } as React.CSSProperties,
    text: {
        color: COLORS.text,
        fontSize: '16px',
        lineHeight: '24px',
        margin: '0 0 16px',
    } as React.CSSProperties,
    buttonContainer: { textAlign: 'center' as const, margin: '32px 0' } as React.CSSProperties,
    button: {
        backgroundColor: '#1A6B4A',
        borderRadius: '8px',
        color: COLORS.white,
        fontSize: '16px',
        fontWeight: 'bold' as const,
        textDecoration: 'none',
        textAlign: 'center' as const,
        display: 'inline-block' as const,
        padding: '14px 28px',
    } as React.CSSProperties,
    inlineLink: { color: '#1A6B4A', fontWeight: 600 as const } as React.CSSProperties,
    hr: { borderColor: COLORS.slate200, margin: '32px 0 24px' } as React.CSSProperties,
    footer: {
        color: COLORS.slate500,
        fontSize: '13px',
        lineHeight: '20px',
        textAlign: 'center' as const,
    } as React.CSSProperties,
};
