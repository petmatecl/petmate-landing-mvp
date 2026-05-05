import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import { getPlaceholderQuestion, buildRegisterUrl } from '../../lib/placeholderCopy';

interface ServicePlaceholderCardProps {
    categoriaSlug?: string;
    comuna?: string;
    /** 'full' = grid de /explorar, /[categoria]; 'compact' = franjas del home */
    variant?: 'full' | 'compact';
}

export default function ServicePlaceholderCard({
    categoriaSlug,
    comuna,
    variant = 'full',
}: ServicePlaceholderCardProps) {
    const question = getPlaceholderQuestion(categoriaSlug, comuna);
    const href = buildRegisterUrl(categoriaSlug, comuna);

    if (variant === 'compact') {
        return (
            <Link
                href={href}
                aria-label={`${question} Publica gratis tu servicio.`}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4 min-h-[200px]">
                    <div className="text-emerald-600">
                        <Sparkles size={28} strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    <p className="text-base font-medium text-slate-900 leading-snug max-w-[220px]">
                        {question}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Sé el primero. Sin comisión durante el lanzamiento.
                    </p>
                </div>
                <div className="border-t border-slate-100 px-4 py-3.5 bg-slate-50 group-hover:bg-emerald-50 transition-colors">
                    <span className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700">
                        Publica gratis
                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                </div>
            </Link>
        );
    }

    // variant 'full' — mismo lenguaje, más espacio
    return (
        <Link
            href={href}
            aria-label={`${question} Publica gratis tu servicio.`}
            className="group flex flex-col h-full rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
        >
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 gap-5 min-h-[300px]">
                <div className="text-emerald-600">
                    <Sparkles size={36} strokeWidth={1.5} aria-hidden="true" />
                </div>
                <p className="text-base font-medium text-slate-900 leading-snug max-w-[240px]">
                    {question}
                </p>
                <p className="text-sm text-slate-500 leading-relaxed max-w-[260px]">
                    Sé el primero. Sin comisión durante el lanzamiento.
                </p>
            </div>
            <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 group-hover:bg-emerald-50 transition-colors">
                <span className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700">
                    Publica gratis
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                </span>
            </div>
        </Link>
    );
}
