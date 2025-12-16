
import Head from "next/head";
import { useRouter } from "next/router";
import { ArrowLeft, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import PetForm from "../../../components/Client/PetForm";
// import Header from "../../../components/Header"; // REMOVED
// import Footer from "../../../components/Footer"; // REMOVED
import ClientLayout from "../../../components/Client/ClientLayout";
import { Pet } from "../../../components/Client/PetCard";

export default function EditarMascotaPage() {
    const router = useRouter();
    const { id } = router.query;
    const [userId, setUserId] = useState<string | null>(null);
    const [allPets, setAllPets] = useState<Pet[]>([]);
    const [pet, setPet] = useState<Pet | null>(null); // Restored pet state
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) {
            fetchPets(userId);
        }
    }, [userId]);

    useEffect(() => {
        if (id && userId) {
            fetchPet(id as string);
        }
    }, [id, userId]);

    async function fetchPets(uid: string) {
        const { data } = await supabase.from("mascotas").select("*").eq("user_id", uid);
        setAllPets((data as Pet[]) || []);
    }

    async function fetchPet(petId: string) {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("mascotas")
                .select("*")
                .eq("id", petId)
                .eq("user_id", userId) // Ensure ownership
                .single();

            if (error) throw error;
            setPet(data as Pet);
        } catch (error) {
            console.error("Error fetching pet:", error);
            router.push("/cliente"); // Redirect on error/not found
        } finally {
            setLoading(false);
        }
    }

    const handleSaved = () => {
        router.push("/cliente");
    };

    const handleCancel = () => {
        router.back();
    };

    if (!userId || loading) return (
        <ClientLayout userId={userId} title="Cargando...">
            <div className="flex flex-col items-center gap-3">
                <Loader2 size={48} className="text-emerald-500 animate-spin" />
                <p className="text-slate-500 font-medium animate-pulse">Cargando...</p>
            </div>
        </ClientLayout>
    );

    if (!pet) return null;

    return (
        <ClientLayout userId={userId} title="Editar Mascota — Pawnecta">
            <div className="flex flex-col lg:flex-row gap-8 items-start">

                {/* Sidebar lista de mascotas */}
                <aside className="w-full lg:w-1/3 order-2 lg:order-1">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm sticky top-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900">Mis Mascotas</h3>
                            <button onClick={() => router.push('/cliente/mascotas/nueva')} className="text-xs font-bold text-emerald-600 hover:underline">+ Nueva</button>
                        </div>
                        <div className="space-y-2">
                            {allPets.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => router.push(`/ cliente / mascotas / ${p.id} `)}
                                    className={`w - full text - left flex items - center gap - 3 p - 2 rounded - lg transition - all ${p.id === pet.id ? 'bg-emerald-50 border border-emerald-200 ring-1 ring-emerald-500' : 'hover:bg-slate-50 border border-transparent'} `}
                                >
                                    <div className={`w - 8 h - 8 rounded - full flex items - center justify - center text - sm ${p.tipo === 'perro' ? 'bg-orange-50 text-orange-500' : 'bg-purple-50 text-purple-500'} `}>
                                        {p.tipo === 'perro' ? '🐶' : '🐱'}
                                    </div>
                                    <div>
                                        <p className={`text - sm font - semibold ${p.id === pet.id ? 'text-emerald-900' : 'text-slate-700'} `}>{p.nombre}</p>
                                        <p className="text-xs text-slate-500">{p.raza || 'Sin raza'}</p>
                                    </div>
                                    {p.id === pet.id && <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500"></div>}
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <button
                                onClick={() => router.push('/cliente')}
                                className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors p-2 rounded-lg hover:bg-slate-50"
                            >
                                ← Volver al Panel
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Formulario */}
                <div className="w-full lg:w-2/3 order-1 lg:order-2">
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Editar Mascota</h1>
                            <p className="text-slate-600 text-sm">Actualiza la información de {pet.nombre}.</p>
                        </div>
                        <button
                            onClick={() => router.push('/cliente')}
                            className="lg:hidden text-sm text-slate-500 hover:text-slate-800 font-medium"
                        >
                            ← Volver
                        </button>
                    </div>

                    <PetForm
                        initialData={pet}
                        userId={userId}
                        onSaved={handleSaved}
                        onCancel={handleCancel}
                    />
                </div>
            </div>
        </ClientLayout>
    );
}
