// components/Explore/ProveedorCard.tsx
// Card mínima para listar proveedores. Usado en /favoritos (tab Proveedores).
//
// Estructura: foto + nombre + comuna + chips (verificado, perfil completo)
// + botón FavoritoButton overlay top-right.

import Link from 'next/link';
import { ShieldCheck, BadgeCheck, Sparkles } from 'lucide-react';
import FavoritoButton from '../Shared/FavoritoButton';

export interface ProveedorCardData {
    id: string;
    nombre_publico: string;
    foto_perfil: string | null;
    comuna: string;
    rut_verificado?: boolean;
    perfil_completo?: boolean;
    es_ejemplo?: boolean;
    favoritos_total?: number;
}

interface Props {
    proveedor: ProveedorCardData;
}

export default function ProveedorCard({ proveedor }: Props) {
    return (
        <Link
            href={`/proveedor/${proveedor.id}`}
            className="group block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative flex flex-col h-full"
        >
            {/* Botón Favorito overlay */}
            <div className="absolute top-3 right-3 z-20 bg-white/90 rounded-full shadow-sm">
                <FavoritoButton
                    entidad_tipo="proveedor"
                    entidad_id={proveedor.id}
                    contador_inicial={proveedor.favoritos_total ?? 0}
                    es_ejemplo={!!proveedor.es_ejemplo}
                    variant="icon"
                />
            </div>

            {/* Foto cuadrada */}
            <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                {proveedor.foto_perfil ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={proveedor.foto_perfil}
                        alt={proveedor.nombre_publico}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <svg className="w-1/3 h-1/3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                )}

                {proveedor.es_ejemplo && (
                    <span
                        title="Proveedor de ejemplo. Regístrate para publicar el tuyo."
                        className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[11px] font-bold uppercase tracking-wide"
                    >
                        <Sparkles size={10} strokeWidth={1.5} aria-hidden="true" /> EJEMPLO
                    </span>
                )}
            </div>

            {/* Contenido */}
            <div className="p-5 flex flex-col flex-grow">
                <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                    {proveedor.nombre_publico}
                </h3>
                <p className="text-sm text-slate-500 mt-1 truncate">{proveedor.comuna}</p>

                {(proveedor.rut_verificado || proveedor.perfil_completo) && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {proveedor.rut_verificado && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-semibold">
                                <ShieldCheck size={10} strokeWidth={1.5} aria-hidden="true" /> Verificado
                            </span>
                        )}
                        {proveedor.perfil_completo && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-semibold">
                                <BadgeCheck size={10} strokeWidth={1.5} aria-hidden="true" /> Perfil completo
                            </span>
                        )}
                    </div>
                )}
            </div>
        </Link>
    );
}
