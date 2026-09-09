// components/Shared/EstadoError.tsx
// ---------------------------------------------------------------------------
// Sprint tipo-b (2026-09-09) — componente reusable para el estado de error
// de queries de lectura. Reemplaza el "empty state" cuando la consulta falla
// por red/RLS, en vez de mostrar "no tienes X" (misinformation al user).
//
// Regla de diseño: NO reemplaza a los children que no dependen de esa
// consulta. Ejemplo: si el header del panel no depende del listado de
// favoritos, el header sigue renderando incluso si el listado está en
// EstadoError. Ver también la regla de diseño en lib/supabaseReadQuery.ts.
//
// Copy default (consistente con RoleGuard, ClientLayout Case 5-perfil,
// handlePhotoUpload Case 5-L92 del sprint error-audit): sublínea "Revisa
// tu conexión y vuelve a intentar." + botón "Reintentar" (verde accent).
// Cada caller define su propio título ("No pudimos cargar tus favoritos",
// "No pudimos cargar tus reservas", etc).
//
// Variante compacta (EstadoErrorCompacto) para badges/contadores: muestra
// "—" en vez de 0. Nunca un cero — un cero engañaría al user afirmando
// "no tienes ninguno" cuando en realidad no pudimos preguntar.
// ---------------------------------------------------------------------------
import React from 'react';

export interface EstadoErrorProps {
    /** Título del error. Ej: "No pudimos cargar tus favoritos". */
    titulo: string;
    /** Sublínea. Default: "Revisa tu conexión y vuelve a intentar." */
    sublinea?: string;
    /** Callback del botón Reintentar. Debe re-ejecutar la consulta (no F5). */
    onRetry: () => void;
    /** Clase Tailwind opcional para adecuar spacing al contenedor. */
    className?: string;
}

export function EstadoError({
    titulo,
    sublinea = 'Revisa tu conexión y vuelve a intentar.',
    onRetry,
    className = '',
}: EstadoErrorProps) {
    return (
        <div
            className={`p-4 border border-danger-100 bg-danger-50 rounded-xl flex items-center justify-between gap-4 ${className}`}
            role="alert"
        >
            <div>
                <p className="text-slate-900 font-semibold text-sm">{titulo}</p>
                <p className="text-slate-500 text-xs mt-1">{sublinea}</p>
            </div>
            <button
                onClick={onRetry}
                type="button"
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-600 focus:ring-offset-2"
            >
                Reintentar
            </button>
        </div>
    );
}

export interface EstadoErrorCompactoProps {
    /** Tooltip que aparece al hover sobre el "—". */
    tooltip?: string;
    /**
     * Callback opcional cuando el user hace click en el "—" para reintentar.
     * Si no se pasa, renderea un <span> no-clickeable (algunos contadores
     * refetchean solos en background).
     */
    onRetry?: () => void;
    className?: string;
}

export function EstadoErrorCompacto({
    tooltip = 'No pudimos cargar este dato. Recarga para reintentar.',
    onRetry,
    className = '',
}: EstadoErrorCompactoProps) {
    const commonClass = `inline-flex items-center justify-center text-slate-400 font-medium ${className}`;
    if (onRetry) {
        return (
            <button
                type="button"
                onClick={onRetry}
                title={tooltip}
                aria-label={tooltip}
                className={`${commonClass} cursor-pointer hover:text-slate-600 transition-colors`}
            >
                —
            </button>
        );
    }
    return (
        <span title={tooltip} aria-label={tooltip} className={commonClass}>
            —
        </span>
    );
}
