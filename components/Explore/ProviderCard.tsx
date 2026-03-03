import React from 'react';
import Link from 'next/link';
import { MapPin, Star, ShieldCheck } from 'lucide-react';
import type { ProviderResult } from '../../lib/supabase/queries/providers';

interface Props {
    provider: ProviderResult;
}

export default function ProviderCard({ provider }: Props) {
    const displayName = `${provider.nombre}${provider.apellido_p ? ' ' + provider.apellido_p.charAt(0) + '.' : ''}`;
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(provider.nombre)}&background=d1fae5&color=065f46&size=200`;

    return (
        <Link
            href={`/proveedor/${provider.id}`}
            className="group relative block bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200 border border-slate-100"
        >
            {/* Badge verificado */}
            {provider.verificado && (
                <div className="absolute top-4 right-4 flex items-center gap-1 bg-emerald-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
                    <ShieldCheck size={11} />
                    Verificado
                </div>
            )}

            {/* Avatar */}
            <div className="w-full aspect-square rounded-2xl bg-slate-100 overflow-hidden mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={provider.foto_perfil || defaultAvatar}
                    alt={displayName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
            </div>

            {/* Nombre */}
            <h3 className="text-lg font-semibold text-slate-900 mb-1 truncate group-hover:text-emerald-700 transition-colors">
                {displayName}
            </h3>

            {/* Ubicación */}
            {provider.comuna && (
                <p className="flex items-center gap-1 text-sm text-slate-500 mb-3">
                    <MapPin size={13} className="shrink-0" />
                    {provider.comuna}
                </p>
            )}

            {/* Rating */}
            <div className="flex items-center gap-1 mb-4">
                <Star size={15} className="text-amber-400 fill-amber-400" />
                <span className="text-slate-900 font-medium text-sm">
                    {provider.rating_promedio > 0 ? provider.rating_promedio.toFixed(1) : '—'}
                </span>
                {provider.total_evaluaciones > 0 && (
                    <span className="text-slate-500 text-xs">
                        ({provider.total_evaluaciones} {provider.total_evaluaciones === 1 ? 'reseña' : 'reseñas'})
                    </span>
                )}
            </div>

            {/* Servicios tags */}
            {provider.servicios.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {provider.servicios.slice(0, 3).map(s => (
                        <span key={s} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                            {s}
                        </span>
                    ))}
                    {provider.servicios.length > 3 && (
                        <span className="px-3 py-1 bg-slate-50 text-slate-500 text-xs rounded-full">
                            +{provider.servicios.length - 3}
                        </span>
                    )}
                </div>
            )}
        </Link>
    );
}
