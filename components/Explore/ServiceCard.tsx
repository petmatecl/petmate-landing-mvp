import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { supabase } from '../../lib/supabaseClient';
import LoginRequiredModal from '../Shared/LoginRequiredModal';

export interface ServiceResult {
    servicio_id: string;
    titulo: string;
    descripcion: string;
    precio_desde: number;
    precio_hasta: number;
    unidad_precio: string;
    fotos: string[];
    categoria_nombre: string;
    categoria_slug: string;
    categoria_icono: string;
    proveedor_id: string;
    proveedor_nombre: string;
    proveedor_foto: string;
    proveedor_comuna: string;
    destacado: boolean;
    rating_promedio: number;
    total_evaluaciones: number;
}

interface Props {
    service: ServiceResult;
}

export default function ServiceCard({ service }: Props) {
    const { user } = useUser();
    const [isFavorito, setIsFavorito] = useState(false);
    const [isLoadingFav, setIsLoadingFav] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    // Use first photo of service, fallback to provider photo, fallback to generic
    const defaultImage = "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=600";
    const coverImage = service.fotos?.[0] || service.proveedor_foto || defaultImage;

    // Cargar estado inicial del favorito
    useEffect(() => {
        if (!user) return;
        const checkFavorite = async () => {
            const { data } = await supabase
                .from('favoritos')
                .select('id')
                .eq('auth_user_id', user.id)
                .eq('servicio_id', service.servicio_id)
                .single();
            if (data) setIsFavorito(true);
        };
        checkFavorite();
    }, [user, service.servicio_id]);

    const handleToggleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault(); // Evita navegar a la pagina del servicio
        e.stopPropagation();

        if (!user) {
            setShowLoginModal(true);
            return;
        }

        setIsLoadingFav(true);
        try {
            if (isFavorito) {
                await supabase
                    .from('favoritos')
                    .delete()
                    .eq('auth_user_id', user.id)
                    .eq('servicio_id', service.servicio_id);
                setIsFavorito(false);
            } else {
                await supabase
                    .from('favoritos')
                    .insert({
                        auth_user_id: user.id,
                        servicio_id: service.servicio_id
                    });
                setIsFavorito(true);
            }
        } catch (error) {
            console.error("Error toggling favorite:", error);
        } finally {
            setIsLoadingFav(false);
        }
    };

    return (
        <Link
            href={`/servicio/${service.servicio_id}`}
            className="group block bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative flex flex-col h-full"
        >
            {/* Etiqueta Destacado */}
            {service.destacado && (
                <div className="absolute top-3 left-3 z-10 bg-amber-400 text-amber-900 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-md shadow-amber-200/50">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    Destacado
                </div>
            )}

            {/* Botón Guardar Favorito */}
            <button
                onClick={handleToggleFavorite}
                disabled={isLoadingFav}
                className="absolute top-3 right-3 z-20 w-8 h-8 bg-white/90 rounded-full shadow-sm flex items-center justify-center hover:scale-110 transition-transform duration-150 disabled:opacity-50"
                aria-label={isFavorito ? "Quitar de favoritos" : "Añadir a favoritos"}
            >
                <Heart
                    size={16}
                    className={`transition-colors duration-150 ${isFavorito ? "text-red-500" : "text-slate-400 hover:text-red-500"}`}
                    fill={isFavorito ? "currentColor" : "none"}
                />
            </button>

            {/* Imagen Principal */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={coverImage}
                    alt={service.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />

                {/* Badge de Categoría Base */}
                <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm flex items-center">
                    <span className="font-semibold text-slate-700 text-xs">
                        {service.categoria_nombre}
                    </span>
                </div>

                {/* Gradiente sutil inferior para legibilidad si hay algo */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
            </div>

            {/* Contenido Card */}
            <div className="p-5 flex flex-col flex-grow">

                {/* Encabezado: Titulo y Rating */}
                <div className="flex justify-between items-start gap-3 mb-2">
                    <h3 className="font-bold text-lg leading-tight text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
                        {service.titulo}
                    </h3>
                    <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-1 rounded-lg shrink-0">
                        <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <span className="font-bold text-sm">{Number(service.rating_promedio).toFixed(1)}</span>
                        <span className="text-emerald-600/70 text-xs">({service.total_evaluaciones})</span>
                    </div>
                </div>

                {/* Proveedor info (Footer de texto) */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-200 shrink-0">
                        {service.proveedor_foto ? (
                            <img src={service.proveedor_foto} alt={service.proveedor_nombre} className="w-full h-full object-cover" />
                        ) : (
                            <svg className="w-full h-full text-slate-400 p-1" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 font-medium truncate">
                        {service.proveedor_nombre} <span className="text-slate-300 mx-1">•</span> {service.proveedor_comuna}
                    </p>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Precio desde</span>
                        <p className="font-black text-slate-900 text-lg">
                            ${service.precio_desde?.toLocaleString('es-CL')} <span className="text-sm font-normal text-slate-500">/ {service.unidad_precio}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal de Login (renderizado condicionalmente y fuera del flujo estricto del anchor) */}
            <LoginRequiredModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                title="Inicia sesión para guardar favoritos"
                message="Necesitas una cuenta en Pawnecta para guardar cuidadores en tu lista de favoritos."
            />
        </Link>
    );
}
