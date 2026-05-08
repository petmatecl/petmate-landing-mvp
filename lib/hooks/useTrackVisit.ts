// lib/hooks/useTrackVisit.ts
// Hook que registra una visita al montar el componente.
//
// - Solo trackea una vez por (entidadTipo, entidadId).
// - Si el usuario es el dueño de la entidad (ownerAuthUserId === user.id),
//   NO trackea (evita inflar contadores con self-views).
// - Errores son silenciosos (ver lib/visitTracking.ts).

import { useEffect, useRef } from 'react';
import { useUser } from '../../contexts/UserContext';
import { trackVisit } from '../visitTracking';

export function useTrackVisit(
    entidadTipo: 'servicio' | 'proveedor',
    entidadId: string | undefined | null,
    ownerAuthUserId?: string | null
) {
    const { user, isLoading } = useUser();
    const trackedRef = useRef<string | null>(null);

    useEffect(() => {
        if (!entidadId) return;
        if (isLoading) return; // esperar a que se sepa si hay usuario logueado

        // Self-view guard: el dueño visita su propio perfil/servicio
        if (ownerAuthUserId && user?.id === ownerAuthUserId) return;

        // Evitar doble track si el componente re-renderiza con la misma entidad
        const key = `${entidadTipo}:${entidadId}`;
        if (trackedRef.current === key) return;
        trackedRef.current = key;

        trackVisit(entidadTipo, entidadId, user?.id);
    }, [entidadTipo, entidadId, ownerAuthUserId, user?.id, isLoading]);
}
