import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { getPlaceholderQuestion, getPlaceholderSubtitle } from '../../lib/placeholderCopy';

interface ServicePlaceholderCardProps {
    categoriaSlug?: string;
    comuna?: string;
    /** 'full' = grid de /explorar, /[categoria]; 'compact' = franjas del home */
    variant?: 'full' | 'compact';
    /**
     * Sprint home-placeholders (2026-11-13):
     *  - 'zero' (default): el slug tiene 0 servicios ("¿Eres X?").
     *  - 'has': el slug tiene servicios pero la franja total < 4 ("¿También X?").
     * Solo relevante para variant='compact' del home.
     */
    kind?: 'zero' | 'has';
    /** Override del título principal (opcional). Si no, se genera con getPlaceholderQuestion */
    customTitle?: string;
}

/**
 * Sprint E-2 UX-2 (2026-09-15) — refactor de CTA card → informational card.
 *
 * Antes: el componente era un `<Link href="/register?rol=proveedor">` con
 * footer "Publica gratis →" y aria-label que llamaba al CTA de registro
 * proveedor. Contribuía al patrón de ~12 apariciones del mismo destino
 * en /explorar (UX-1 + UX-2 del walkthrough #1).
 *
 * Ahora: div puro sin `<Link>`, sin footer CTA, sin aria-label de
 * publicación. Solo pregunta + subtítulo con un ícono Sparkles arriba.
 * El CTA de registro proveedor vive únicamente en Header + Footer del
 * sitio. La copy que explica por qué aparecen los placeholders vive en
 * el caller (pages/explorar.tsx muestra "Aún hay pocos proveedores..."
 * arriba del grid cuando aplica).
 *
 * El `buildRegisterUrl` helper del import queda sin uso en este archivo
 * — no lo removemos del `lib/placeholderCopy.ts` porque puede haber otros
 * callers históricos y removerlo es scope de un sprint de higiene aparte.
 */
export default function ServicePlaceholderCard({
    categoriaSlug,
    comuna,
    variant = 'full',
    kind = 'zero',
    customTitle,
}: ServicePlaceholderCardProps) {
    const question = customTitle ?? getPlaceholderQuestion(categoriaSlug, comuna, kind);
    const subtitle = getPlaceholderSubtitle(variant);

    if (variant === 'compact') {
        // Sprint home-carrusel punto 3 (2026-11-12): placeholder del home
        // vuelve a ser clickable hacia /register con el slug. La decisión
        // E-2 UX-2 de hacer el placeholder NO-link se mantiene para
        // variant='full' (que vive en /explorar donde había 12 CTAs de
        // registro). En el home la densidad es baja y el CTA de captación
        // tiene sentido. `min-h-[380px]` matchea la altura típica de
        // ServiceCardItem (foto aspect-4/3 ~210px + titulo + proveedor +
        // comuna + precio) para que el carrusel no quede con un "hueco"
        // visual cuando el placeholder es la última tarjeta.
        // Sprint home-carrusel punto 3 ajuste final (PO 2026-11-12):
        // `min-h-[380px]` REMOVIDO. Si el placeholder fuerza un min-height
        // fijo cuando las cards naturales son más chicas, el stretch del
        // flex-row del carrusel iguala TODAS las cards al min del placeholder
        // → se ve "alto fantasma" en cards con poco contenido. Sin min-h,
        // `h-full` toma el alto natural de la card más grande de la fila
        // por `align-items: stretch` default del flex (el carrusel usa
        // `flex` sin `items-*` override). Placeholder y cards quedan
        // SIEMPRE del mismo alto, variando por franja según contenido real.
        const registerUrl = `/register?rol=proveedor${categoriaSlug ? `&categoria=${encodeURIComponent(categoriaSlug)}` : ''}`;
        return (
            <Link
                href={registerUrl}
                aria-label={`${question} — publica tus servicios en Pawnecta`}
                className="flex flex-col h-full rounded-2xl border border-dashed border-slate-300 bg-white hover:bg-slate-50 hover:border-accent-400 overflow-hidden transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            >
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
                    <div className="text-slate-400">
                        <Sparkles size={28} strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    <p className="text-base font-medium text-slate-700 leading-snug max-w-[220px]">
                        {question}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        {subtitle}
                    </p>
                    <span className="text-xs font-semibold text-accent-700 pt-2">Publica gratis →</span>
                </div>
            </Link>
        );
    }

    return (
        <div
            aria-label={question}
            className="flex flex-col h-full rounded-2xl border border-dashed border-slate-200 bg-white overflow-hidden"
        >
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 gap-5 min-h-[300px]">
                <div className="text-slate-400">
                    <Sparkles size={36} strokeWidth={1.5} aria-hidden="true" />
                </div>
                <p className="text-base font-medium text-slate-700 leading-snug max-w-[240px]">
                    {question}
                </p>
                <p className="text-sm text-slate-500 leading-relaxed max-w-[260px]">
                    {subtitle}
                </p>
            </div>
        </div>
    );
}
