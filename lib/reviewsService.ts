import { supabase } from "./supabaseClient";

export type Evaluacion = {
    id: string;
    proveedor_id: string;
    usuario_id?: string;
    servicio_id: string;
    rating: number;
    comentario: string;
    fotos?: string[];
    estado?: 'pendiente' | 'aprobado' | 'rechazado';
    respuesta_proveedor?: string;
    nombre_cliente_manual?: string;
    created_at: string;
    proveedor: { nombre: string; apellido_p: string; comuna?: string; } | null;
};

export async function getAllReviews(): Promise<{ data: Evaluacion[] | null; error: any }> {
    const { data, error } = await supabase
        .from("evaluaciones")
        .select(`
            *,
            proveedor:proveedor_id(nombre, apellido_p, comuna)
        `)
        .order("created_at", { ascending: false });
    if (error) return { data: null, error };
    return { data: data as Evaluacion[], error: null };
}

export async function getReviewsByProveedorId(proveedorId: string): Promise<{ data: Evaluacion[] | null; error: any }> {
    const { data, error } = await supabase
        .from("evaluaciones")
        .select("*")
        .eq("proveedor_id", proveedorId)
        .eq("estado", "aprobado")
        .order("created_at", { ascending: false });
    if (error) return { data: null, error };
    return { data: data as Evaluacion[], error: null };
}

export async function updateReviewStatus(id: string, estado: "aprobado" | "rechazado"): Promise<{ error: any }> {
    const { error } = await supabase
        .from("evaluaciones")
        .update({ estado })
        .eq("id", id);
    return { error };
}
