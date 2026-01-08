import { supabase } from "./supabaseClient";

export type Review = {
    id: string;
    sitter_id: string;
    cliente_id?: string;
    calificacion: number;
    comentario: string;
    fotos?: string[];
    estado?: 'pendiente' | 'aprobado' | 'rechazado';
    nombre_cliente_manual?: string;
    foto_cliente_manual?: string;
    created_at: string;
    cliente: {
        nombre: string;
        apellido_p: string;
        foto_perfil?: string;
    } | null;
};

export async function getAllReviews(): Promise<{ data: Review[] | null; error: any }> {
    const { data, error } = await supabase
        .from("reviews")
        .select(`
            *,
            cliente:cliente_id(nombre, apellido_p, foto_perfil)
        `)
        .order("created_at", { ascending: false });

    if (error) return { data: null, error };

    const reviews = data.map((r: any) => ({
        ...r,
        cliente: r.cliente || null
    }));

    return { data: reviews, error: null };
}

export async function getReviewsBySitterId(sitterId: string): Promise<{ data: Review[] | null; error: any }> {
    const { data, error } = await supabase
        .from("reviews")
        .select(`
            *,
            cliente:cliente_id(nombre, apellido_p, foto_perfil)
        `)
        .eq("sitter_id", sitterId)
        .eq("estado", "aprobado") // Only show approved reviews publicly
        .order("created_at", { ascending: false });

    if (error) return { data: null, error };

    const reviews = data.map((r: any) => ({
        ...r,
        cliente: r.cliente || null
    }));

    return { data: reviews, error: null };
}

export async function updateReviewStatus(id: string, estado: 'aprobado' | 'rechazado'): Promise<{ error: any }> {
    const { error } = await supabase
        .from("reviews")
        .update({ estado })
        .eq("id", id);
    return { error };
}

export async function createReview(review: {
    sitter_id: string;
    calificacion: number;
    comentario: string;
    fotos?: string[];
    nombre_cliente_manual?: string;
    estado?: 'pendiente' | 'aprobado' | 'rechazado';
}): Promise<{ data: any; error: any }> {
    const { data: { session } } = await supabase.auth.getSession();

    // If no session and no manual name, error
    if (!session?.user && !review.nombre_cliente_manual) {
        return { data: null, error: new Error("User not authenticated") };
    }

    const payload: any = {
        ...review,
    };

    if (session?.user) {
        payload.cliente_id = session.user.id;
    }

    const { data, error } = await supabase
        .from("reviews")
        .insert(payload)
        .select()
        .single();

    return { data, error };
}
