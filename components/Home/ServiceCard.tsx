import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { MapPin } from 'lucide-react';

export default function ServiceCard({ service }: { service: any }) {
    const router = useRouter();
    const [imgError, setImgError] = useState(false);

    // Use flat fields from mapJoinToServiceResult — no raw JOIN arrays
    const FOTO_FALLBACK: Record<string, string> = {
        hospedaje: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&auto=format&fit=crop&q=80',
        guarderia: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&auto=format&fit=crop&q=80',
        paseos: 'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=600&auto=format&fit=crop&q=80',
        domicilio: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=600&auto=format&fit=crop&q=80',
        peluqueria: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=600&auto=format&fit=crop&q=80',
        adiestramiento: 'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=600&auto=format&fit=crop&q=80',
        veterinario: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=600&auto=format&fit=crop&q=80',
        traslado: 'https://images.unsplash.com/photo-1544568100-847a948585b9?w=600&auto=format&fit=crop&q=80',
    };
    const FOTO_DEFAULT = 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&auto=format&fit=crop&q=80';

    const fotoUrl =
        (service.fotos && service.fotos.length > 0) ? service.fotos[0]
            : service.proveedor_foto ? service.proveedor_foto
                : FOTO_FALLBACK[service.categoria_slug] ?? FOTO_DEFAULT;

    const precio = service.precio_desde ? service.precio_desde.toLocaleString('es-CL') : null;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full group">
            <div className="relative h-48 bg-slate-100 overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={imgError ? FOTO_DEFAULT : fotoUrl}
                    alt={service.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={() => setImgError(true)}
                />
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 shadow-sm">
                    {service.categoria_nombre || 'Servicio'}
                </div>
            </div>
            <div className="p-5 flex flex-col flex-1">
                <h3 title={service.titulo} className="font-bold text-slate-900 text-lg mb-2 line-clamp-2">{service.titulo}</h3>

                <div className="flex items-center gap-2 mb-4 text-slate-500 text-sm font-medium">
                    <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span title={service.proveedor_comuna || 'Comuna no especificada'} className="truncate">{service.proveedor_comuna || 'Comuna no especificada'}</span>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    {precio ? (
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-400">Desde</span>
                            <span className="font-bold text-emerald-700 text-lg">
                                ${precio}
                                <span className="text-xs font-medium text-slate-500"> / {service.unidad_precio || 'sesión'}</span>
                            </span>
                        </div>
                    ) : (
                        <span className="text-sm font-semibold text-slate-500">Consultar precio</span>
                    )}
                    <button
                        onClick={() => router.push(`/servicio/${service.servicio_id}`)}
                        className="text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors shrink-0"
                    >
                        Ver detalle
                    </button>
                </div>
            </div>
        </div>
    );
}
