import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { Card } from "../Shared/Card";

interface CaregiverCardProps {
    id: string;
    nombre: string;
    apellido: string;
    comuna: string;
    rating: number;
    reviews: number;
    price: number;
    verified: boolean;
    imageUrl?: string;
    isNsfw?: boolean; // Futuro: por si acaso
    isAuthenticated?: boolean;
    // Nuevas props
    modalidad?: "en_casa_petmate" | "a_domicilio" | "ambos";
    acepta_perros?: boolean;
    acepta_gatos?: boolean;
}

export default function CaregiverCard({
    id,
    nombre,
    apellido,
    comuna,
    rating,
    reviews,
    price,
    verified,
    imageUrl,
    isAuthenticated = false,
    modalidad = "ambos",
    acepta_perros = true,
    acepta_gatos = true,
}: CaregiverCardProps) {
    const router = useRouter();
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Image handling
    const fallbackImage = `https://ui-avatars.com/api/?name=${nombre}+${apellido}&background=random&size=400`;
    const [imgSrc, setImgSrc] = useState(imageUrl || fallbackImage);

    // Sync if prop changes
    useEffect(() => {
        setImgSrc(imageUrl || fallbackImage);
    }, [imageUrl, nombre, apellido]);

    const handleProfileClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Evitar propagación si hay otros clicks

        // Verificar sesión
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            // Si hay sesión, navegar al perfil
            // Si es un ID mock (empieza con mock-), redirigir a explorar o mostrar mensaje (en demo no existe perfil real)
            if (id.toString().startsWith("mock-")) {
                // Para la demo visual, redirigimos a registro si no hay sesión, pero si hay sesión... 
                // Como los perfiles mock no existen en BD, redirigimos a /explorar con un query param o algo.
                // O mejor, alertamos "Perfil demo".
                // Pero el usuario pidió "ver perfil". Como son mocks, no tienen página individual real.
                // Asumiremos que si hay sesión van a /explorar.
                router.push("/login?redirect=/sitter/" + id);
            } else {
                router.push(`/sitter/${id}?returnTo=${encodeURIComponent(router.asPath)}`);
            }
        } else {
            // Si no hay sesión, mostrar modal
            setShowAuthModal(true);
        }
    };

    return (
        <>
            <Card className="group flex flex-col h-full" padding="none" hoverable>
                {/* Imagen */}
                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 relative">
                    <Image
                        src={imgSrc}
                        alt={`${nombre} ${apellido}`}
                        fill
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={() => setImgSrc(fallbackImage)}
                        unoptimized
                    />
                    {verified && (
                        <div className="absolute top-3 right-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 shadow-sm backdrop-blur-sm border border-emerald-100/50">
                            Verificado
                        </div>
                    )}
                </div>

                {/* Contenido */}
                <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                                {nombre} {apellido ? `${apellido.charAt(0)}.` : ''}
                            </h3>
                            <p className="text-sm text-slate-500 flex items-center gap-1">
                                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                {comuna || "Santiago"}
                            </p>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded text-slate-600">
                            <span className="text-xs font-bold">★ {rating.toFixed(1)}</span>
                            <span className="text-[10px] text-slate-400">({reviews})</span>
                        </div>
                    </div>

                    {/* Badges de Modalidad - SOBER STYLE */}
                    <div className="mt-3 flex flex-wrap gap-1.5 min-h-[24px]">
                        {(modalidad === "en_casa_petmate" || modalidad === "ambos") && (
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                                En casa del sitter
                            </span>
                        )}
                        {(modalidad === "a_domicilio" || modalidad === "ambos") && (
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                                A domicilio
                            </span>
                        )}
                        {/* Simpler icons if desired, mostly text focused */}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-300 pt-3">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Desde</span>
                            <span className="text-sm font-bold text-slate-900">
                                ${price.toLocaleString("es-CL")} <span className="text-xs font-normal text-slate-400">/noche</span>
                            </span>
                        </div>

                        <button
                            onClick={handleProfileClick}
                            className="rounded-lg border-2 border-slate-400 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-500 transition-all"
                        >
                            Ver perfil
                        </button>
                    </div>
                </div>
            </Card>

            {/* Modal de Auth Requerida */}
            {showAuthModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Overlay - click para cerrar */}
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowAuthModal(false);
                        }}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setShowAuthModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <div className="text-center">
                            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6 text-3xl shadow-sm text-emerald-600">
                                🔒
                            </div>

                            <h3 className="text-2xl font-extrabold text-slate-900 mb-3">
                                Únete a Pawnecta
                            </h3>

                            <p className="text-slate-600 mb-8 leading-relaxed">
                                Para ver el perfil completo de <strong>{nombre}</strong> y contactarlo, necesitas tener una cuenta. ¡Es gratis y te tomará solo un minuto!
                            </p>

                            <div className="space-y-3">
                                <Link
                                    href="/register"
                                    className="flex w-full items-center justify-center rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-all hover:scale-[1.02]"
                                >
                                    Registrarme ahora
                                </Link>

                                <Link
                                    href="/login"
                                    className="flex w-full items-center justify-center rounded-xl border-2 border-slate-300 bg-white py-3.5 text-base font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
                                >
                                    Ya tengo cuenta, ingresar
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
