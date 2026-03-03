import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface CategoryCardProps {
    slug: string;
    nombre: string;
    descripcion: string;
    Icon: LucideIcon;
}

export default function CategoryCard({ slug, nombre, descripcion, Icon }: CategoryCardProps) {
    return (
        <Link
            href={`/explorar?categoria=${slug}`}
            className="group flex flex-col items-start p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-lg hover:border-emerald-300 hover:-translate-y-1 transition-all duration-200 text-left w-full"
        >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors duration-200">
                <Icon className="w-7 h-7 text-emerald-600 group-hover:text-emerald-700 transition-colors duration-200" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors duration-200">{nombre}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{descripcion}</p>
        </Link>
    );
}

