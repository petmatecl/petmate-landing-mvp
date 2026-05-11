// lib/hooks/useFavoritos.ts
// Hook polimórfico para gestionar favoritos (servicios o proveedores).
//
// - Al montar: si el usuario está logueado, hidrata isFavorito con un SELECT.
//   Si no está logueado, isFavorito = false sin query.
// - contador se inicializa desde prop (denormalizado en la entidad madre via RPC).
//   El trigger en BD mantiene favoritos_total sincronizado server-side, pero
//   localmente usamos optimistic +/- 1 para feedback inmediato.
// - toggle(): optimistic update + INSERT/DELETE + revert si falla.

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useUser } from '../../contexts/UserContext';

export type EntidadTipo = 'servicio' | 'proveedor';

interface UseFavoritosParams {
    entidad_tipo: EntidadTipo;
    entidad_id: string;
    contador_inicial: number;
}

interface UseFavoritosReturn {
    isFavorito: boolean;
    contador: number;
    toggle: () => Promise<void>;
    loading: boolean;
}

export const NOT_AUTHENTICATED_ERROR = 'NOT_AUTHENTICATED';

export function useFavoritos({
    entidad_tipo,
    entidad_id,
    contador_inicial,
}: UseFavoritosParams): UseFavoritosReturn {
    const { user, isAuthenticated, isLoading: userLoading } = useUser();

    const [isFavorito, setIsFavorito] = useState(false);
    const [contador, setContador] = useState(contador_inicial);
    const [loading, setLoading] = useState(true);
    const togglingRef = useRef(false);

    // Sync contador si cambia el prop (ej: parent re-fetcha el RPC con nuevos datos)
    useEffect(() => {
        setContador(contador_inicial);
    }, [contador_inicial]);

    // Hidratar isFavorito al montar / cuando cambia el user o la entidad
    useEffect(() => {
        if (userLoading) return;

        if (!isAuthenticated || !user?.id) {
            setIsFavorito(false);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const { data } = await supabase
                    .from('favoritos')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('entidad_tipo', entidad_tipo)
                    .eq('entidad_id', entidad_id)
                    .limit(1)
                    .maybeSingle();
                if (cancelled) return;
                setIsFavorito(!!data);
            } catch (err) {
                if (cancelled) return;
                console.warn('[useFavoritos] hidratación falló:', err);
                setIsFavorito(false);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user?.id, isAuthenticated, userLoading, entidad_tipo, entidad_id]);

    const toggle = useCallback(async () => {
        if (!isAuthenticated || !user?.id) {
            throw new Error(NOT_AUTHENTICATED_ERROR);
        }

        // Evitar doble click rápido
        if (togglingRef.current) return;
        togglingRef.current = true;

        const prevIsFav = isFavorito;
        const prevCount = contador;
        const nextIsFav = !prevIsFav;
        const nextCount = prevIsFav ? Math.max(0, prevCount - 1) : prevCount + 1;

        // Optimistic
        setIsFavorito(nextIsFav);
        setContador(nextCount);

        try {
            if (prevIsFav) {
                const { error } = await supabase
                    .from('favoritos')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('entidad_tipo', entidad_tipo)
                    .eq('entidad_id', entidad_id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('favoritos')
                    .insert({
                        user_id: user.id,
                        entidad_tipo,
                        entidad_id,
                    });
                if (error) throw error;
            }
        } catch (err) {
            // Revertir
            setIsFavorito(prevIsFav);
            setContador(prevCount);
            togglingRef.current = false;
            throw err;
        }

        togglingRef.current = false;
    }, [isAuthenticated, user?.id, entidad_tipo, entidad_id, isFavorito, contador]);

    return { isFavorito, contador, toggle, loading };
}
