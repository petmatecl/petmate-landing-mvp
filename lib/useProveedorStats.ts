// lib/useProveedorStats.ts
// ---------------------------------------------------------------------------
// Sprint tipo-b lote 1 (2026-09-09) — hook de stats del dashboard proveedor
// con manejo de error consistente vía runReadQuery / runCountQuery. Antes:
// cada query destructuraba solo { data/count } → si alguna fallaba, el
// valor quedaba en 0 y el user veía "0 vistas / 0 rating" sin distinguir
// de "no pude preguntar". Fix: si CUALQUIER query falla, se expone `error`
// en el return y las 6 stat cards renderean <EstadoErrorCompacto /> (dash
// con tooltip "No se pudo cargar" + retry) en vez de "0".
//
// Design decision: hook-level error (no per-metric). Si una sola query
// falla, todas las cards muestran "—". Simpler + consistente para el user
// ("no pude cargar tu resultado, retry"). Alternativa per-metric quedó
// descartada por complejidad — cero valor real cuando el user ve unas
// métricas y otras "—" (asume que las que muestran "0" son reales).
// ---------------------------------------------------------------------------
import { useState, useCallback } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { runReadQuery, runCountQuery, type ReadQueryOptions } from './supabaseReadQuery';

interface ProveedorStats {
    vistas: number;
    vistasTrend: string | null;
    vistasTrendValue: number;
    consultas: number;
    whatsappClicks: number;
    contactosTotal: number;
    conversionRate: string;
    ratingAvg: string;
    evalCount: number;
}

const DEFAULT_STATS: ProveedorStats = {
    vistas: 0,
    vistasTrend: null,
    vistasTrendValue: 0,
    consultas: 0,
    whatsappClicks: 0,
    contactosTotal: 0,
    conversionRate: '0%',
    ratingAvg: '0.0',
    evalCount: 0,
};

export function useProveedorStats(provId: string, _authId: string) {
    void _authId; // param preservado por compatibilidad con callers previos
    const [stats, setStats] = useState<ProveedorStats>(DEFAULT_STATS);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<PostgrestError | null>(null);

    const refetch = useCallback(async () => {
        if (!provId) return;
        setLoading(true);
        setError(null);

        const opts = (table: string): ReadQueryOptions => ({
            subsystem: 'proveedor_stats',
            table,
            route: '/proveedor',
        });

        try {
            const now = new Date();
            const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const last14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
            const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

            let vistas = 0;
            let vistasTrendValue = 0;
            let vistasTrend: string | null = null;

            // 1. Servicios del proveedor (feed a las métricas siguientes).
            const provServiciosResult = await runReadQuery<Array<{ id: string }>>(
                () => supabase.from('servicios_publicados').select('id').eq('proveedor_id', provId),
                opts('servicios_publicados'),
            );
            if (provServiciosResult.error) { setError(provServiciosResult.error); setLoading(false); return; }
            const serviciosIds = (provServiciosResult.data ?? []).map(s => s.id);

            if (serviciosIds.length > 0) {
                // Vistas 7d + trend previo.
                const [currentRes, prevRes] = await Promise.all([
                    runCountQuery(
                        () => supabase
                            .from('eventos_tracking')
                            .select('*', { head: true, count: 'exact' })
                            .eq('tipo', 'vista_servicio')
                            .in('servicio_id', serviciosIds)
                            .gte('created_at', last7Days),
                        opts('eventos_tracking'),
                    ),
                    runCountQuery(
                        () => supabase
                            .from('eventos_tracking')
                            .select('*', { head: true, count: 'exact' })
                            .eq('tipo', 'vista_servicio')
                            .in('servicio_id', serviciosIds)
                            .lt('created_at', last7Days)
                            .gte('created_at', last14Days),
                        opts('eventos_tracking'),
                    ),
                ]);
                if (currentRes.error || prevRes.error) {
                    setError(currentRes.error ?? prevRes.error);
                    setLoading(false);
                    return;
                }
                vistas = currentRes.count || 0;
                const prev = prevRes.count || 0;
                if (prev > 0) {
                    const percent = Math.round(((vistas - prev) / prev) * 100);
                    vistasTrendValue = percent;
                    vistasTrend = percent >= 0 ? `+${percent}% esta semana` : `${percent}% esta semana`;
                } else if (vistas > 0) {
                    vistasTrendValue = 100;
                    vistasTrend = '+100% esta semana';
                }
            }

            // 2. Conversaciones (30 días).
            const consultasRes = await runCountQuery(
                () => supabase
                    .from('conversations')
                    .select('*', { head: true, count: 'exact' })
                    .eq('sitter_id', provId)
                    .gte('created_at', last30Days),
                opts('conversations'),
            );
            if (consultasRes.error) { setError(consultasRes.error); setLoading(false); return; }
            const consultas = consultasRes.count || 0;

            // 2b. WhatsApp Clicks (30 días).
            const wpClicksRes = await runCountQuery(
                () => supabase
                    .from('eventos_tracking')
                    .select('*', { head: true, count: 'exact' })
                    .eq('tipo', 'click_whatsapp')
                    .in('servicio_id', serviciosIds)
                    .gte('created_at', last30Days),
                opts('eventos_tracking'),
            );
            if (wpClicksRes.error) { setError(wpClicksRes.error); setLoading(false); return; }
            const whatsappClicks = wpClicksRes.count || 0;

            // 2c. Contactos totales desde tabla contactos (30 días).
            const contactosRes = await runCountQuery(
                () => supabase
                    .from('contactos')
                    .select('*', { head: true, count: 'exact' })
                    .eq('proveedor_id', provId)
                    .gte('created_at', last30Days),
                opts('contactos'),
            );
            if (contactosRes.error) { setError(contactosRes.error); setLoading(false); return; }
            const contactosTotal = contactosRes.count || 0;

            // Cálculo de conversión.
            const totalContactos = contactosTotal > 0 ? contactosTotal : (consultas + whatsappClicks);
            const conversionRate = vistas > 0 ? ((totalContactos / vistas) * 100).toFixed(1) + '%' : '0%';

            // 3. Rating promedio.
            const revsResult = await runReadQuery<Array<{ rating: number }>>(
                () => supabase
                    .from('evaluaciones')
                    .select('rating')
                    .eq('proveedor_id', provId)
                    .eq('estado', 'aprobado'),
                opts('evaluaciones'),
            );
            if (revsResult.error) { setError(revsResult.error); setLoading(false); return; }
            const revs = revsResult.data;
            const ratingAvg = revs && revs.length > 0
                ? (revs.reduce((a, b) => a + (b.rating || 0), 0) / revs.length).toFixed(1)
                : '0.0';
            const evalCount = revs?.length || 0;

            setStats({ vistas, vistasTrend, vistasTrendValue, consultas, whatsappClicks, contactosTotal, conversionRate, ratingAvg, evalCount });
        } catch (e) {
            console.error('useProveedorStats unexpected error:', e);
            setError({ message: String(e), details: '', hint: '', code: '' } as PostgrestError);
        } finally {
            setLoading(false);
        }
    }, [provId]);

    return { stats, loading, error, refetch };
}
