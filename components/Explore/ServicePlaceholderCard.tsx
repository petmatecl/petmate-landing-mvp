import Link from 'next/link';
import { Plus, ArrowRight } from 'lucide-react';
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
        // Mismo footprint que ServiceCardItem inline en pages/index.tsx
        // (img h-44 + content p-4 ≈ 320px de altura total)
        return (
            <Link
                href={href}
                aria-label={`${question} Publica gratis tu servicio.`}
                className="group flex flex-col rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-500 hover:shadow-md transition-all duration-200 overflow-hidden"
            >
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3 min-h-[180px]">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-emerald-400 bg-white flex items-center justify-center text-emerald-600 group-hover:border-emerald-600 group-hover:text-emerald-700 transition-colors">
                        <Plus size={20} aria-hidden="true" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 leading-tight">{question}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Sé el primero. Sin comisión durante el lanzamiento.
                    </p>
                </div>
                <div className="border-t border-emerald-200 px-4 py-3 bg-white/50">
                    <span className="flex items-center justify-center gap-1.5 text-sm font-bold text-emerald-700 group-hover:text-emerald-800">
                        Publica gratis
                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                </div>
            </Link>
        );
    }

    // variant 'full' — para grids de /explorar, /[categoria], /[categoria]/[comuna]
    // Footprint similar a ServiceCard (foto aspect-[4/3] + content)
    return (
        <Link
            href={href}
            aria-label={`${question} Publica gratis tu servicio.`}
            className="group flex flex-col h-full rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-500 hover:shadow-md transition-all duration-200 overflow-hidden"
        >
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4 min-h-[280px]">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-emerald-400 bg-white flex items-center justify-center text-emerald-600 group-hover:border-emerald-600 group-hover:text-emerald-700 transition-colors">
                    <Plus size={28} aria-hidden="true" />
                </div>
                <p className="text-base font-bold text-slate-800 leading-tight max-w-[240px]">
                    {question}
                </p>
                <p className="text-sm text-slate-500 leading-relaxed max-w-[260px]">
                    Sé el primero. Sin comisión durante el lanzamiento.
                </p>
            </div>
            <div className="border-t border-emerald-200 px-5 py-3.5 bg-white/50 flex items-center justify-center gap-2">
                <span className="text-sm font-bold text-emerald-700 group-hover:text-emerald-800">
                    Publica gratis
                </span>
                <ArrowRight size={16} className="text-emerald-700 group-hover:text-emerald-800 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </div>
        </Link>
    );
}
