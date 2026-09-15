import { Sparkles } from 'lucide-react';
import { getPlaceholderQuestion, getPlaceholderSubtitle } from '../../lib/placeholderCopy';

interface ServicePlaceholderCardProps {
    categoriaSlug?: string;
    comuna?: string;
    /** 'full' = grid de /explorar, /[categoria]; 'compact' = franjas del home */
    variant?: 'full' | 'compact';
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
    customTitle,
}: ServicePlaceholderCardProps) {
    const question = customTitle ?? getPlaceholderQuestion(categoriaSlug, comuna);
    const subtitle = getPlaceholderSubtitle(categoriaSlug);

    if (variant === 'compact') {
        return (
            <div
                aria-label={question}
                className="flex flex-col rounded-2xl border border-dashed border-slate-200 bg-white overflow-hidden"
            >
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4 min-h-[200px]">
                    <div className="text-slate-400">
                        <Sparkles size={28} strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    <p className="text-base font-medium text-slate-700 leading-snug max-w-[220px]">
                        {question}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        {subtitle}
                    </p>
                </div>
            </div>
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
