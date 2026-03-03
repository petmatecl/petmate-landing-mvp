import { supabase } from './supabaseClient';

export interface ParticipantProfile {
    auth_user_id: string;
    nombre: string;
    apellido_p?: string;
    foto_perfil?: string;
    email?: string;
}

/**
 * Busca el perfil de un participante de chat por auth_user_id.
 * Primero intenta en proveedores, luego en usuarios_buscadores.
 * Usar en cualquier componente que necesite datos de perfil por auth_user_id.
 */
export async function getParticipantProfile(authUserId: string): Promise<ParticipantProfile | null> {
    const { data: prov } = await supabase
        .from('proveedores')
        .select('auth_user_id, nombre, apellido_p, foto_perfil')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
    if (prov) return prov;

    const { data: bus } = await supabase
        .from('usuarios_buscadores')
        .select('auth_user_id, nombre, apellido_p, foto_perfil')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
    return bus || null;
}
