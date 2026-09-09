import { supabase } from './supabaseClient';
import { runReadQuery } from './supabaseReadQuery';

export interface ParticipantProfile {
    auth_user_id: string;
    nombre: string;
    // apellido_p y foto_perfil solo se pueblan cuando el perfil viene de
    // proveedores. usuarios_buscadores NO tiene esas columnas.
    apellido_p?: string;
    foto_perfil?: string;
    email?: string;
}

/**
 * Busca el perfil de un participante de chat por auth_user_id.
 * Primero intenta en proveedores, luego en usuarios_buscadores.
 * Usar en cualquier componente que necesite datos de perfil por auth_user_id.
 *
 * Sprint tipo-b lote 5 (2026-09-09) — silent + log Sentry via runReadQuery.
 * Los callers (mensajes header, ChatBubble) ya asumen null = "sin perfil
 * conocido" y muestran fallback textual "Proveedor" / "Usuario". Un banner
 * acá no cabe (helper llamado desde múltiples surfaces, cada una con su
 * propia estrategia de fallback).
 */
export async function getParticipantProfile(authUserId: string): Promise<ParticipantProfile | null> {
    const provResult = await runReadQuery<any>(
        () => supabase
            .from('proveedores_publicos')
            .select('auth_user_id, nombre, apellido_p, foto_perfil')
            .eq('auth_user_id', authUserId)
            .maybeSingle(),
        { subsystem: 'profile_utils', table: 'proveedores_publicos' },
    );
    if (provResult.data) return provResult.data;

    // usuarios_buscadores solo tiene nombre (no apellido_p, no foto_perfil).
    // Pedir esas columnas devuelve 42703 y rompe el fetch entero.
    const busResult = await runReadQuery<any>(
        () => supabase
            .from('usuarios_buscadores')
            .select('auth_user_id, nombre')
            .eq('auth_user_id', authUserId)
            .maybeSingle(),
        { subsystem: 'profile_utils', table: 'usuarios_buscadores' },
    );
    return busResult.data || null;
}
