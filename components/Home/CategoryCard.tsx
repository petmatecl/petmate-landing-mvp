import React from 'react';
import { useRouter } from 'next/router';
import { LucideIcon } from 'lucide-react';

interface CategoryCardProps {
    slug: string;
    nombre: string;
    descripcion: string;
    Icon: LucideIcon;
}

export default function CategoryCard({ slug, nombre, descripcion, Icon }: CategoryCardProps) {
    const router = useRouter();

    return (
        <button
            onClick={() => router.push(`/explorar?categoria=${slug}`)}
            className="flex flex-col items-start p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-200 transition-all text-left group w-full"
        >
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4 group-hover:bg-emerald-50 transition-colors">
                <Icon className="w-7 h-7 text-slate-700 group-hover:text-emerald-700" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">{nombre}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{descripcion}</p>
        </button>
    );
}
