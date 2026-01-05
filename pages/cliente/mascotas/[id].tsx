import Head from "next/head";
import { useRouter } from "next/router";
import { ArrowLeft, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import PetForm from "../../../components/Client/PetForm";
import ClientLayout from "../../../components/Client/ClientLayout";
import { Pet } from "../../../components/Client/PetCard";

export default function EditarMascotaPage() {
    const router = useRouter();
    const { id } = router.query;

    // State
    const [userId, setUserId] = useState<string | null>(null);
    const [pet, setPet] = useState<Pet | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 1. Auth Check
    useEffect(() => {
        let mounted = true;

        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!mounted) return;

                if (session?.user) {
                    setUserId(session.user.id);
                    // Don't stop loading yet, wait for data fetch
                } else {
                    // Not logged in
                    await router.push("/login");
                }
            } catch (error) {
                console.error("Auth check error:", error);
                setErrorMsg("Error verificando sesión.");
                setLoading(false);
            }
        };

        checkSession();

        return () => { mounted = false; };
    }, []);

    // 2. Fetch Data (Dependent on userId and router ready)
    useEffect(() => {
        if (!userId) return; // Wait for user
        if (!router.isReady) return; // Wait for router

        const fetchPetData = async () => {
            // If id is missing from URL (e.g. /mascotas/undefined), handle it
            const petId = Array.isArray(id) ? id[0] : id;
            if (!petId) {
                setErrorMsg("Mascota no especificada.");
                setLoading(false);
                return;
            }

            try {
                // Fetch specific pet
                const { data, error } = await supabase
                    .from("mascotas")
                    .select("*")
                    .eq("id", petId)
                    .eq("user_id", userId) // Security: Ensure ownership
                    .single();

                if (error) throw error;
                setPet(data as Pet);
            } catch (err: any) {
                console.error("Error fetching pet:", err);
                setErrorMsg("No pudimos encontrar la mascota o no tienes permiso.");
            } finally {
                setLoading(false);
            }
        };

        fetchPetData();
    }, [userId, router.isReady, id]);

    const handleSaved = () => {
        router.push("/cliente");
    };

    const handleCancel = () => {
        router.back();
    };

    // Loading State
    if (loading) {
        return (
            <ClientLayout userId={userId} title="Cargando...">
                <div className="max-w-3xl mx-auto animate-pulse">
                    <div className="mb-6 flex justify-between items-center">
                        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
                        <div className="h-4 bg-slate-200 rounded w-24"></div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-6">
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                                <div className="h-10 bg-slate-100 rounded"></div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                                <div className="h-10 bg-slate-100 rounded"></div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                            <div className="h-24 bg-slate-100 rounded"></div>
                        </div>
                    </div>
                </div>
            </ClientLayout>
        );
    }

    // Error State
    if (errorMsg || !pet) {
        return (
            <ClientLayout userId={userId} title="Error">
                <div className="flex flex-col items-center justify-center pt-20">
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Ups, algo salió mal 😕</h1>
                    <p className="text-red-500 mb-6">{errorMsg || "Mascota no encontrada."}</p>
                    <button
                        onClick={() => router.push("/cliente")}
                        className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-bold"
                    >
                        Volver a Mi Panel
                    </button>
                </div>
            </ClientLayout>
        );
    }

    return (
        <ClientLayout userId={userId} title={`Editar ${pet.nombre} — Pawnecta`}>
            <div className="max-w-3xl mx-auto">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Editar Mascota</h1>
                        <p className="text-slate-600 text-sm">Actualiza la información de {pet.nombre}.</p>
                    </div>
                    <button
                        onClick={() => router.push('/cliente')}
                        className="text-sm text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1"
                    >
                        <ArrowLeft size={16} />
                        Volver al Panel
                    </button>
                </div>

                <PetForm
                    initialData={pet}
                    userId={userId!}
                    onSaved={handleSaved}
                    onCancel={handleCancel}
                />
            </div>
        </ClientLayout>
    );
}
