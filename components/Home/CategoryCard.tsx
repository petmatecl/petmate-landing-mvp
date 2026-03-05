import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface CategoryCardProps {
    slug: string;
    nombre: string;
    descripcion: string;
    Icon: LucideIcon;
    estado?: 'activa' | 'proxima';
    count?: number;
}

export default function CategoryCard({ slug, nombre, descripcion, Icon, estado = 'activa', count }: CategoryCardProps) {
    const isProxima = estado === 'proxima';

    const inner = (
        <>
            {/* Badge Próximamente */}
            {isProxima && (
                <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    Próximamente
                </span>
            )}

            <div className={`w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4 ${!isProxima ? 'group-hover:bg-emerald-100' : ''} transition-colors duration-200`}>
                <Icon className="w-7 h-7 text-emerald-600 transition-colors duration-200" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1 transition-colors duration-200">{nombre}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{descripcion}</p>

            {/* Badge count — solo si activa y hay proveedores */}
            {!isProxima && count !== undefined && count > 0 && (
                <span className="mt-3 inline-block text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                    {count} disponible{count !== 1 ? 's' : ''}
                </span>
            )}
        </>
    );

    if (isProxima) {
        return (
            <div className="relative flex flex-col items-start p-6 bg-white border border-slate-200 rounded-2xl shadow-sm opacity-60 cursor-not-allowed w-full">
                {inner}
            </div>
        );
    }

    return (
        <Link
            href={`/explorar?categoria=${slug}`}
            className="group relative flex flex-col items-start p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-lg hover:border-emerald-300 hover:-translate-y-1 transition-all duration-200 text-left w-full"
        >
            {inner}
        </Link>
    );
}
