
import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getReviewsBySitterId, Review } from "../../lib/reviewsService";
import { createClient } from "@supabase/supabase-js"; // Para SSR si fuera necesario, pero usaremos client fetch por simplicidad en dashboard privado

export default function SitterReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [sitterId, setSitterId] = useState<string | null>(null);

    useEffect(() => {
        // Obtenemos el ID del sitter desde la sesión
        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // Primero obtenemos el id de sitter asociado al usuario (auth_user_id)
                const { data: sitterData } = await supabase
                    .from("registro_petmate")
                    .select("auth_user_id")
                    .eq("auth_user_id", session.user.id)
                    .single();

                if (sitterData) {
                    setSitterId(sitterData.auth_user_id);
                    fetchReviews(sitterData.auth_user_id);
                } else {
                    setLoading(false);
                }
            } else {
                // Redirigir a login si no hay sesión (lo maneja middleware idealmente o redirect aquí)
                window.location.href = "/login";
            }
        };
        fetchSession();
    }, []);

    const fetchReviews = async (id: string) => {
        setLoading(true);
        const { data } = await getReviewsBySitterId(id);
        if (data) setReviews(data);
        setLoading(false);
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Cargando reseñas...</div>;
    }

    const averageRating = reviews.length > 0
        ? (reviews.reduce((acc, curr) => acc + curr.calificacion, 0) / reviews.length).toFixed(1)
        : "N/A";

    return (
        <>
            <Head>
                <title>Mis Reseñas — Pawnecta</title>
            </Head>

            <div className="bg-slate-50 min-h-screen">
                <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/sitter" className="text-slate-400 hover:text-slate-600 transition-colors">
                                ← Volver al Panel
                            </Link>
                            <h1 className="text-xl font-bold text-slate-900">Mis Reseñas</h1>
                        </div>
                    </div>
                </header>

                <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                    {/* Header Stats */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 flex items-center gap-6">
                        <div className="text-center px-4">
                            <div className="text-4xl font-black text-slate-900 mb-1">{averageRating}</div>
                            <div className="text-amber-400 text-lg">
                                {/* Estrellas estáticas basadas en promedio */}
                                {"★".repeat(Math.round(Number(averageRating) || 0))}
                                {"☆".repeat(5 - Math.round(Number(averageRating) || 0))}
                            </div>
                            <p className="text-xs text-slate-500 mt-2 font-medium bg-slate-100 px-2 py-1 rounded-full">{reviews.length} reseñas</p>
                        </div>
                        <div className="flex-1 border-l border-slate-100 pl-6">
                            <h2 className="text-base font-bold text-slate-800 mb-2">Lo que dicen tus clientes</h2>
                            <p className="text-sm text-slate-500 leading-relaxed max-w-lg">
                                Estas reseñas son visibles en tu perfil público. Mantén un buen servicio para obtener mejores calificaciones y aparecer más arriba en los resultados.
                            </p>
                        </div>
                    </div>

                    {/* Lista de Reseñas */}
                    <div className="space-y-4">
                        {reviews.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                                <div className="text-4xl mb-3">💬</div>
                                <h3 className="text-lg font-medium text-slate-900">Aún no tienes reseñas</h3>
                                <p className="text-slate-500 text-sm mt-1">Completa reservas con éxito para recibir tu primera calificación.</p>
                            </div>
                        ) : (
                            reviews.map((review) => (
                                <div key={review.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-transform hover:scale-[1.01]">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                {review.cliente.nombre.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900">{review.cliente.nombre} {review.cliente.apellido_p}</h4>
                                                <p className="text-xs text-slate-400">{new Date(review.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                            </div>
                                        </div>
                                        <div className="flex text-amber-400 text-sm">
                                            {"★".repeat(review.calificacion)}{"☆".repeat(5 - review.calificacion)}
                                        </div>
                                    </div>

                                    <div className="pl-13 ml-13">
                                        <p className="text-slate-600 text-sm italic border-l-4 border-slate-100 pl-4 py-1">
                                            "{review.comentario}"
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                </main>
            </div>
        </>
    );
}
