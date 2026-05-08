import { Eye } from 'lucide-react';

interface VisitCounterProps {
    total: number;
    mes: number;
    /** 'compact' = en cards de /explorar, solo "{mes} este mes". 'full' = ficha completa. */
    variant: 'compact' | 'full';
}

/**
 * Muestra el contador de visitas de un servicio o proveedor.
 *  - variant 'compact': solo "{mes} este mes" — para cards. Si mes === 0, no renderiza nada.
 *  - variant 'full':    "{total} visitas · {mes} este mes" — para ficha. Si total === 0, no renderiza nada.
 *
 * Lucide Eye icon, sin emoji. Estilo neutro slate, no compite con el rating.
 */
export default function VisitCounter({ total, mes, variant }: VisitCounterProps) {
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

    // variant 'full'
    if (total <= 0) return null;
    return (
        <span
            className="inline-flex items-center gap-1.5 text-sm text-slate-600"
            aria-label={`${total} visitas totales, ${mes} este mes`}
        >
            <Eye size={16} strokeWidth={1.5} aria-hidden="true" />
            {total.toLocaleString('es-CL')} visitas
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="text-slate-500">{mes} este mes</span>
        </span>
    );
}
