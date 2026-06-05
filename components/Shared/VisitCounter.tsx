import { Eye } from 'lucide-react';

interface VisitCounterProps {
    total: number;
    /** `mes` solo se usa para variant 'compact'. En 'full' se ignora — el
     *  sufijo "X este mes" se eliminó porque "0 este mes" se leía como
     *  "ficha abandonada", contraproducente como social proof. */
    mes?: number;
    /** 'compact' = en cards de /explorar, solo "{mes} este mes". 'full' = solo total acumulado. */
    variant: 'compact' | 'full';
}

/**
 * Muestra el contador de visitas de un servicio o proveedor.
 *  - variant 'compact': "{mes} este mes" — para cards. Si mes <= 0, no renderiza.
 *  - variant 'full':    "{total} visitas" — para ficha publica. Si total <= 0, no renderiza.
 *
 * Lucide Eye icon, sin emoji. Estilo neutro slate, no compite con el rating.
 */
export default function VisitCounter({ total, mes = 0, variant }: VisitCounterProps) {
    if (variant === 'compact') {
        if (mes <= 0) return null;
        return (
            <span
                className="inline-flex items-center gap-1 text-xs text-slate-500"
                aria-label={`${mes} visitas este mes`}
            >
                <Eye size={12} strokeWidth={1.5} aria-hidden="true" />
                {mes} este mes
            </span>
        );
    }

    // variant 'full' — solo total acumulado, sin sufijo de recencia.
    if (total <= 0) return null;
    return (
        <span
            className="inline-flex items-center gap-1.5 text-sm text-slate-600"
            aria-label={`${total} visitas totales`}
        >
            <Eye size={16} strokeWidth={1.5} aria-hidden="true" />
            {total.toLocaleString('es-CL')} visitas
        </span>
    );
}
