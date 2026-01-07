import { supabase } from "./supabaseClient";

export type Review = {
    id: string;
    sitter_id: string;
    cliente_id: string;
    calificacion: number;
    comentario: string;
    fotos?: string[];
    created_at: string;
    cliente: {
        nombre: string;
        apellido_p: string;
        foto_perfil?: string;
    };
};

export async function getReviewsBySitterId(sitterId: string): Promise<{ data: Review[] | null; error: any }> {
    const { data, error } = await supabase
        .from("reviews")
        .select(`
            *,
            cliente:cliente_id(nombre, apellido_p, foto_perfil)
        `)
        .eq("sitter_id", sitterId)
        .order("created_at", { ascending: false });

    if (error) return { data: null, error };

    // Map to handle missing client data or structure
    const reviews = data.map((r: any) => ({
        ...r,
        cliente: r.cliente || { nombre: "Usuario", apellido_p: "Anonimo" }
    }));

    return { data: reviews, error: null };
}

export async function createReview(review: {
    sitter_id: string;
    calificacion: number;
    comentario: string;
    fotos: string[];
}): Promise<{ data: any; error: any }> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
        return { data: null, error: new Error("User not authenticated") };
    }

    const { data, error } = await supabase
        .from("reviews")
        .insert({
            ...review,
            cliente_id: session.user.id
        })
        .select()
        .single();

    return { data, error };
}
