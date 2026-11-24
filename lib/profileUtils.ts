import { supabase } from './supabaseClient';
import { runReadQuery } from './supabaseReadQuery';
import { displayName } from './displayName';

export interface ParticipantProfile {
    auth_user_id: string;
    // `display_name` precomputado con `displayName()` server-side al retornar
    // — garantiza que las superficies del chat (ConversationList + MessageThread)
    // nunca reciban apellido completo en el payload. Sprint pii-chat-nombre
    // (2026-11-19) — cierra PII leak bidireccional del chat con session.
    //   - Para proveedores: aplica displayName({nombre_publico, nombre, apellido_p}).
    //   - Para tutores: aplica displayName({nombre}) — el helper detecta el
    //     apellido embutido como 2° token de `nombre` y emite "Nombre I."
    //     (el schema de usuarios_buscadores concatena nombre + apellidos en
    //     la misma columna, no tiene apellido_p separado).
    display_name: string;
    // Solo proveedores tienen foto_perfil. Tutores retornan undefined.
    foto_perfil?: string;
}

/**
 * Busca el perfil de un participante de chat por auth_user_id.
 * Primero intenta en proveedores, luego en usuarios_buscadores.
 * Retorna `display_name` precomputado — los consumers NO deben componer
 * nombre + apellido en cliente, siempre leer `profile.display_name`.
 *
 * Sprint tipo-b lote 5 (2026-09-09) — silent + log Sentry via runReadQuery.
 * Sprint pii-chat-nombre (2026-11-19) — shape devuelto cambia a
 * `display_name` precomputado para cerrar PII leak del chat.
 *
 * Los callers (mensajes header, ChatBubble) ya asumen null = "sin perfil
 * conocido" y muestran fallback textual "Proveedor" / "Usuario". Un banner
 * acá no cabe (helper llamado desde múltiples surfaces, cada una con su
 * propia estrategia de fallback).
 */
export async function getParticipantProfile(authUserId: string): Promise<ParticipantProfile | null> {
    const provResult = await runReadQuery<any>(
        () => supabase
            .from('proveedores_publicos')
            .select('auth_user_id, nombre, apellido_p, nombre_publico, foto_perfil')
            .eq('auth_user_id', authUserId)
            .maybeSingle(),
        { subsystem: 'profile_utils', table: 'proveedores_publicos' },
    );
    if (provResult.data) {
        return {
            auth_user_id: provResult.data.auth_user_id,
            display_name: displayName({
                nombre_publico: provResult.data.nombre_publico,
                nombre: provResult.data.nombre,
                apellido_p: provResult.data.apellido_p,
            }),
            foto_perfil: provResult.data.foto_perfil ?? undefined,
        };
    }

    // usuarios_buscadores solo tiene nombre (no apellido_p, no foto_perfil).
    // Pedir esas columnas devuelve 42703 y rompe el fetch entero.
    //
    // Hallazgo empírico pre-fix (sprint pii-chat-nombre, grep prod 2026-11-19):
    // 7/9 tutores tienen nombre completo concatenado ("Allison Mendel Ruminot"),
    // 1/9 con nombre+1 apellido, 1/9 con solo nombre. El helper displayName()
    // maneja el apellido embutido (2° token) → emite "Nombre I." uniformemente.
    const busResult = await runReadQuery<any>(
        () => supabase
            .from('usuarios_buscadores')
            .select('auth_user_id, nombre')
            .eq('auth_user_id', authUserId)
            .maybeSingle(),
        { subsystem: 'profile_utils', table: 'usuarios_buscadores' },
    );
    if (busResult.data) {
        return {
            auth_user_id: busResult.data.auth_user_id,
            display_name: displayName({
                nombre_publico: null,
                nombre: busResult.data.nombre,
                apellido_p: null,
            }),
        };
    }
    return null;
}
