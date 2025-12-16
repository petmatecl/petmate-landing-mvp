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
        router.push("/cliente");
    };

    const handleCancel = () => {
        router.back();
    };

    if (!userId) return null; // Or loading spinner

    return (
        <ClientLayout userId={userId} title="Nueva Mascota — PetMate">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Agregar Nueva Mascota</h1>
                    <p className="text-slate-600 mt-2">Completa la información para que los sitters conozcan a tu peludo.</p>
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
