import { useState, useCallback } from 'react';
import { supabase } from './supabaseClient';

interface ProveedorStats {
    vistas: number;
    vistasTrend: string | null;
    vistasTrendValue: number;
    consultas: number;
    whatsappClicks: number;
    conversionRate: string;
    ratingAvg: string;
    evalCount: number;
    activos: number;
    totalActivos: number;
}

const DEFAULT_STATS: ProveedorStats = {
    vistas: 0,
    vistasTrend: null,
    vistasTrendValue: 0,
    consultas: 0,
    whatsappClicks: 0,
    conversionRate: '0%',
    ratingAvg: '0.0',
    evalCount: 0,
    activos: 0,
    totalActivos: 0,
};

export function useProveedorStats(provId: string, authId: string) {
    const [stats, setStats] = useState<ProveedorStats>(DEFAULT_STATS);
    const [loading, setLoading] = useState(false);

    const refetch = useCallback(async () => {
        if (!provId) return;
        setLoading(true);

        try {
            const now = new Date();
            const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const last14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
            const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

            let vistas = 0;
            let vistasTrendValue = 0;
            let vistasTrend: string | null = null;

            // 1. Service Views via eventos_tracking
            const { data: provServicios } = await supabase
                .from('servicios_publicados')
                .select('id')
                .eq('proveedor_id', provId);
            const serviciosIds = provServicios?.map((s: any) => s.id) || [];

            if (serviciosIds.length > 0) {
                const [{ count: currentViews }, { count: prevViews }] = await Promise.all([
                    supabase
                        .from('eventos_tracking')
                        .select('*', { head: true, count: 'exact' })
                        .eq('tipo', 'vista_servicio')
                        .in('servicio_id', serviciosIds)
                        .gte('created_at', last7Days),
                    supabase
                        .from('eventos_tracking')
                        .select('*', { head: true, count: 'exact' })
                        .eq('tipo', 'vista_servicio')
                        .in('servicio_id', serviciosIds)
                        .lt('created_at', last7Days)
                        .gte('created_at', last14Days),
                ]);

                vistas = currentViews || 0;
                const prev = prevViews || 0;
                if (prev > 0) {
                    const percent = Math.round(((vistas - prev) / prev) * 100);
                    vistasTrendValue = percent;
                    vistasTrend = percent >= 0 ? `+${percent}% esta semana` : `${percent}% esta semana`;
                } else if (vistas > 0) {
                    vistasTrendValue = 100;
                    vistasTrend = '+100% esta semana';
                }
            }

            // 2. Conversaciones (30 días)
            const { count: consultas30d } = await supabase
                .from('conversations')
                .select('*', { head: true, count: 'exact' })
                .eq('sitter_id', provId)
                .gte('created_at', last30Days);

            // 2b. WhatsApp Clicks (30 días)
            const { count: wpClicks30d } = await supabase
                .from('eventos_tracking')
                .select('*', { head: true, count: 'exact' })
                .eq('tipo', 'click_whatsapp')
                .in('servicio_id', serviciosIds)
                .gte('created_at', last30Days);

            const consultas = consultas30d || 0;
            const whatsappClicks = wpClicks30d || 0;

            // Calculo de conversión
            const totalContactos = consultas + whatsappClicks;
            const conversionRate = vistas > 0 ? ((totalContactos / vistas) * 100).toFixed(1) + '%' : '0%';

            // 3. Rating promedio
            const { data: revs } = await supabase
                .from('evaluaciones')
                .select('rating')
                .eq('proveedor_id', provId)
                .eq('estado', 'aprobado');

            const ratingAvg = revs && revs.length > 0
                ? (revs.reduce((a: number, b: any) => a + (b.rating || 0), 0) / revs.length).toFixed(1)
                : '0.0';
            const evalCount = revs?.length || 0;

            // 4. Servicios activos
            const { data: servs } = await supabase
                .from('servicios_publicados')
                .select('activo')
                .eq('proveedor_id', provId);

            const activos = servs?.filter((s: any) => s.activo).length || 0;
            const totalActivos = servs?.length || 0;

            setStats({ vistas, vistasTrend, vistasTrendValue, consultas, whatsappClicks, conversionRate, ratingAvg, evalCount, activos, totalActivos });
        } catch (e) {
            console.error('useProveedorStats error:', e);
        } finally {
            setLoading(false);
        }
    }, [provId, authId]);

    return { stats, loading, refetch };
}
