import Head from "next/head";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import PetForm from "../../../components/Client/PetForm";
// import Header from "../../../components/Header"; // REMOVED
// import Footer from "../../../components/Footer"; // REMOVED
import ClientLayout from "../../../components/Client/ClientLayout";

export default function NuevaMascotaPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUserId(session.user.id);
            } else {
                router.push("/login");
            }
        });
    }, [router]);

    const handleSaved = () => {
        router.push("/usuario");
    };

    const handleCancel = () => {
        router.back();
    };

    if (!userId) return null; // Or loading spinner

    return (
        <ClientLayout userId={userId} title="Nueva Mascota — Pawnecta">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8 flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><path d="M12 19l-7-7 7-7"></path></svg>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agregar Nueva Mascota</h1>
                        <p className="text-slate-500 text-sm">Completa la información para que los proveedores conozcan a tu peludo.</p>
                    </div>
                </div>

                <PetForm
                    userId={userId}
                    onSaved={handleSaved}
                    onCancel={handleCancel}
                />
            </div>
        </ClientLayout>
    );
}
