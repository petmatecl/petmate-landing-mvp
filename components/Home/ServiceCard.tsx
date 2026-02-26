import React from 'react';
import { useRouter } from 'next/router';
import { MapPin } from 'lucide-react';

export default function ServiceCard({ service }: { service: any }) {
    const router = useRouter();
    // Resolve wrapped data array from Supabase join structures
    const proveedor = Array.isArray(service.proveedor) ? service.proveedor[0] : service.proveedor;
    const categoria = Array.isArray(service.categoria) ? service.categoria[0] : service.categoria;

    const fotoUrl = (service.fotos && service.fotos.length > 0) ? service.fotos[0] : proveedor?.foto_perfil || '/placeholder-avatar.jpg';
    const precio = service.precio_base ? service.precio_base.toLocaleString('es-CL') : '0';

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full group">
            <div className="relative h-48 bg-slate-100 overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fotoUrl} alt={service.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 shadow-sm">
                    {categoria?.nombre || 'Servicio'}
                </div>
            </div>
            <div className="p-5 flex flex-col flex-1">
                <h3 className="font-bold text-slate-900 text-lg mb-2 line-clamp-2">{service.titulo}</h3>

                <div className="flex items-center gap-2 mb-4 text-slate-500 text-sm font-medium">
                    <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="truncate">{proveedor?.comuna || 'Comuna no especificada'}</span>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-400">Desde</span>
                        <span className="font-bold text-emerald-700 text-lg">${precio} <span className="text-xs font-medium text-slate-500">/ {service.unidad_precio || 'servicio'}</span></span>
                    </div>
                    <button
                        onClick={() => router.push(`/servicio/${service.id}`)}
                        className="text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors shrink-0"
                    >
                        Ver detalle
                    </button>
                </div>
            </div>
        </div>
    );
}
