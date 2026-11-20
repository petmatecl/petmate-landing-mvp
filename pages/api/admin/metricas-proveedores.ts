// pages/api/admin/metricas-proveedores.ts
// ----------------------------------------------------------------------------
// Sprint TRACKING-META-100-PROVEEDORES Opción B (2026-11-20).
//
// Métricas en tiempo real para el dashboard pre-campañas. El PO consulta este
// panel 1x/semana para decidir cuándo activar campañas pagadas (criterio
// empírico: 100 proveedores activos).
//
// GATE: verifySession + isAdmin (patrón id-only).
//
// Query ensayada contra prod-ro antes de aterrizar (12 activos en este
// momento, distribución por categoría + comuna OK). Ver BACKLOG
// TRACKING-META-100-PROVEEDORES para el racional.
// ----------------------------------------------------------------------------
import type { NextApiRequest, NextApiResponse } from 'next';
import { wrapApiHandlerWithSentry } from '@sentry/nextjs';
import { createClient } from '@supabase/supabase-js';
import { verifySession, isAdmin } from '../../../lib/apiAuth';
import { apiLimiter } from '../../../lib/rateLimit';
import { logSupabaseError } from '../../../lib/logSupabaseError';

type CategoriaRow = { slug: string; categoria_nombre: string; n: number };
type ComunaRow = { nombre: string; n: number };
type TendenciaRow = { ult7d: number; prev7d: number };

export type MetricasResponse = {
    total_activos: number;
    por_categoria: CategoriaRow[];
    por_comuna: ComunaRow[];
    ultimo_registro: string | null;
    tendencia: TendenciaRow;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    if (!(await apiLimiter(req, res))) return;

    const userId = await verifySession(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Forbidden' });

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // ① Query grande: TODOS los servicios publicados activos + proveedor
        //    aprobado + no ejemplo, con categoría y comuna embed. Base común
        //    para las métricas 1-3. Volumen esperado chico (~10-200 rows en
        //    los próximos meses — 12 proveedores activos hoy en prod).
        const { data: rows, error: rowsErr } = await supabaseAdmin
            .from('servicios_publicados')
            .select(`
                proveedor_id,
                categorias_servicio!inner (slug, nombre),
                proveedores!inner (estado, es_ejemplo, comuna, created_at)
            `)
            .eq('activo', true)
            .eq('proveedores.estado', 'aprobado');
        logSupabaseError('api-admin:metricas-proveedores:rows', rowsErr);
        if (rowsErr) throw rowsErr;

        // Filtro es_ejemplo!=true en memoria (filtro .or() sobre foreignTable
        // tiene bugs conocidos con PostgREST — hacerlo client-side es trivial
        // con el volumen esperado).
        type Row = {
            proveedor_id: string;
            categorias_servicio: { slug: string; nombre: string } | { slug: string; nombre: string }[];
            proveedores: { estado: string; es_ejemplo: boolean | null; comuna: string | null; created_at: string } | { estado: string; es_ejemplo: boolean | null; comuna: string | null; created_at: string }[];
        };
        const filtered: Array<{ proveedor_id: string; cat_slug: string; cat_nombre: string; comuna: string | null }> = [];
        for (const raw of (rows || []) as Row[]) {
            const cat = Array.isArray(raw.categorias_servicio) ? raw.categorias_servicio[0] : raw.categorias_servicio;
            const prov = Array.isArray(raw.proveedores) ? raw.proveedores[0] : raw.proveedores;
            if (!cat || !prov) continue;
            if (prov.es_ejemplo === true) continue;
            filtered.push({
                proveedor_id: raw.proveedor_id,
                cat_slug: cat.slug,
                cat_nombre: cat.nombre,
                comuna: prov.comuna,
            });
        }

        // ② Total activos = proveedores únicos en `filtered`.
        const idsActivos = new Set(filtered.map((r) => r.proveedor_id));
        const total_activos = idsActivos.size;

        // ③ Distribución por categoría = proveedores únicos por slug. Un
        //    proveedor con servicios en 2 categorías cuenta en ambas
        //    (deseado: ver oferta por categoría).
        const catMap = new Map<string, { nombre: string; ids: Set<string> }>();
        for (const r of filtered) {
            if (!catMap.has(r.cat_slug)) {
                catMap.set(r.cat_slug, { nombre: r.cat_nombre, ids: new Set() });
            }
            catMap.get(r.cat_slug)!.ids.add(r.proveedor_id);
        }
        const por_categoria: CategoriaRow[] = Array.from(catMap.entries())
            .map(([slug, { nombre, ids }]) => ({ slug, categoria_nombre: nombre, n: ids.size }))
            .sort((a, b) => b.n - a.n);

        // ④ Distribución por comuna = proveedores únicos por comuna (top 15).
        const comunaMap = new Map<string, Set<string>>();
        for (const r of filtered) {
            if (!r.comuna) continue;
            if (!comunaMap.has(r.comuna)) comunaMap.set(r.comuna, new Set());
            comunaMap.get(r.comuna)!.add(r.proveedor_id);
        }
        const por_comuna: ComunaRow[] = Array.from(comunaMap.entries())
            .map(([nombre, ids]) => ({ nombre, n: ids.size }))
            .sort((a, b) => b.n - a.n)
            .slice(0, 15);

        // ⑤ Último registro: proveedor aprobado más reciente.
        const { data: ultimoData, error: ultimoErr } = await supabaseAdmin
            .from('proveedores')
            .select('created_at')
            .eq('estado', 'aprobado')
            .or('es_ejemplo.eq.false,es_ejemplo.is.null')
            .order('created_at', { ascending: false })
            .limit(1);
        logSupabaseError('api-admin:metricas-proveedores:ultimo', ultimoErr);
        if (ultimoErr) throw ultimoErr;
        const ultimo_registro: string | null = ultimoData?.[0]?.created_at ?? null;

        // ⑥ Tendencia semanal: aprobados últimos 7d vs 7 anteriores.
        const nowIso = new Date().toISOString();
        const d7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const d14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

        const { count: ult7d, error: ult7dErr } = await supabaseAdmin
            .from('proveedores')
            .select('id', { count: 'exact', head: true })
            .eq('estado', 'aprobado')
            .or('es_ejemplo.eq.false,es_ejemplo.is.null')
            .gte('created_at', d7)
            .lte('created_at', nowIso);
        logSupabaseError('api-admin:metricas-proveedores:ult7d', ult7dErr);
        if (ult7dErr) throw ult7dErr;

        const { count: prev7d, error: prev7dErr } = await supabaseAdmin
            .from('proveedores')
            .select('id', { count: 'exact', head: true })
            .eq('estado', 'aprobado')
            .or('es_ejemplo.eq.false,es_ejemplo.is.null')
            .gte('created_at', d14)
            .lt('created_at', d7);
        logSupabaseError('api-admin:metricas-proveedores:prev7d', prev7dErr);
        if (prev7dErr) throw prev7dErr;

        const response: MetricasResponse = {
            total_activos,
            por_categoria,
            por_comuna,
            ultimo_registro,
            tendencia: { ult7d: ult7d ?? 0, prev7d: prev7d ?? 0 },
        };

        res.status(200).json(response);
    } catch (err: any) {
        console.error('[api/admin/metricas-proveedores] error', err);
        res.status(500).json({ error: 'internal', message: err?.message ?? 'unknown' });
    }
}

export default wrapApiHandlerWithSentry(handler, 'api/admin/metricas-proveedores');
