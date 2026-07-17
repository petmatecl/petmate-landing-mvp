// pages/api/servicios/[id]/slots.ts
// ----------------------------------------------------------------------------
// Fase 1 agenda con disponibilidad real — Incremento 3.
//
// GET /api/servicios/[id]/slots?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
//
// Endpoint PUBLICO de lectura. Corre con service_role (las tablas
// disponibilidad_semanal / excepciones_disponibilidad NO tienen politica
// publica de SELECT por diseno — solo el proveedor las lee via RLS desde el
// editor). Rate limit apiLimiter (30 req/min por IP).
//
// Input duro:
//   - id: uuid del servicio.
//   - desde: YYYY-MM-DD.
//   - hasta: YYYY-MM-DD.
//   - desde <= hasta.
//   - rango <= 31 dias.
//
// Servicio requerido:
//   - existe, activo=true, agendamiento_habilitado=true, duracion_slot_min
//     NOT NULL.
//   - si falta cualquiera → 404 (no revelamos si es "existe pero no acepta
//     agenda" vs "no existe"; ambos son "no hay slots que servir aqui").
//
// Response 200:
//   [{ fecha, hora_inicio, hora_fin, disponible, restantes }]
//   Todos los slots (no solo los libres) — el picker decide como pintar.
//
// La logica de derivacion vive en lib/slotsAgenda.ts como funcion pura
// testeable. Este handler solo hace: validar → fetch → llamar deriv → devolver.
// ----------------------------------------------------------------------------
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { apiLimiter } from '../../../../lib/rateLimit';
import { derivarSlots, type FranjaSemanalRow, type ExcepcionRow, type ConfirmadaRow } from '../../../../lib/slotsAgenda';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGO_DIAS = 31;

function isValidDate(s: string): boolean {
    if (!DATE_RE.test(s)) return false;
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function diasEntreFechas(desde: string, hasta: string): number {
    const [y1, m1, d1] = desde.split('-').map(Number);
    const [y2, m2, d2] = hasta.split('-').map(Number);
    const start = Date.UTC(y1, m1 - 1, d1);
    const end = Date.UTC(y2, m2 - 1, d2);
    return Math.round((end - start) / 86_400_000);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    if (!apiLimiter(req, res)) return;

    const { id, desde, hasta } = req.query;
    if (typeof id !== 'string' || !UUID_RE.test(id)) {
        return res.status(400).json({ error: 'id invalido' });
    }
    if (typeof desde !== 'string' || !isValidDate(desde)) {
        return res.status(400).json({ error: 'desde invalido (YYYY-MM-DD)' });
    }
    if (typeof hasta !== 'string' || !isValidDate(hasta)) {
        return res.status(400).json({ error: 'hasta invalido (YYYY-MM-DD)' });
    }
    if (desde > hasta) {
        return res.status(400).json({ error: 'desde debe ser <= hasta' });
    }
    const rangoDias = diasEntreFechas(desde, hasta) + 1;
    if (rangoDias > MAX_RANGO_DIAS) {
        return res.status(400).json({ error: `rango excede ${MAX_RANGO_DIAS} dias` });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
        console.error('[slots] falta config supabase');
        return res.status(500).json({ error: 'config incompleta' });
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    try {
        // 1. Fetch servicio + config.
        const { data: servicio, error: servErr } = await supabase
            .from('servicios_publicados')
            .select('id, activo, agendamiento_habilitado, duracion_slot_min, capacidad_slot, anticipacion_min_horas, anticipacion_max_dias')
            .eq('id', id)
            .maybeSingle();
        if (servErr) {
            console.error('[slots] error servicio:', servErr);
            return res.status(500).json({ error: 'error interno' });
        }
        if (!servicio) return res.status(404).json({ error: 'servicio no encontrado' });
        if (!servicio.activo) return res.status(404).json({ error: 'servicio no disponible' });
        if (!servicio.agendamiento_habilitado) return res.status(404).json({ error: 'servicio no acepta agendamientos' });
        if (servicio.duracion_slot_min === null) return res.status(404).json({ error: 'servicio sin agenda configurada' });

        // 2. Fetch franjas semanales + excepciones + confirmadas F1 en paralelo.
        // Confirmadas: filtro por duracion_min IS NOT NULL para excluir el flujo
        // viejo (V1/V2/V4a/V4b sin agenda). El proveedor debe manejar solapes
        // con esas manualmente. Rango: extendemos 1 dia atras del `desde` para
        // agarrar confirmadas que empiezan justo antes pero terminan dentro
        // (max duracion 480 min = 8h, no cruza 2 dias).
        const desdeMenos1 = (() => {
            const [y, m, d] = desde.split('-').map(Number);
            const dt = new Date(Date.UTC(y, m - 1, d - 1));
            const yy = dt.getUTCFullYear();
            const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(dt.getUTCDate()).padStart(2, '0');
            return `${yy}-${mm}-${dd}`;
        })();
        const hastaMas1 = (() => {
            const [y, m, d] = hasta.split('-').map(Number);
            const dt = new Date(Date.UTC(y, m - 1, d + 1));
            const yy = dt.getUTCFullYear();
            const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(dt.getUTCDate()).padStart(2, '0');
            return `${yy}-${mm}-${dd}`;
        })();

        const [franjasRes, excsRes, confRes] = await Promise.all([
            supabase
                .from('disponibilidad_semanal')
                .select('dia_semana, hora_desde, hora_hasta')
                .eq('servicio_id', id),
            supabase
                .from('excepciones_disponibilidad')
                .select('fecha, hora_desde, hora_hasta')
                .eq('servicio_id', id)
                .gte('fecha', desde)
                .lte('fecha', hasta),
            supabase
                .from('agendamientos')
                .select('fecha_preferida, duracion_min')
                .eq('servicio_id', id)
                .eq('estado', 'confirmada')
                .not('duracion_min', 'is', null)
                .gte('fecha_preferida', desdeMenos1)
                .lt('fecha_preferida', hastaMas1),
        ]);

        if (franjasRes.error || excsRes.error || confRes.error) {
            console.error('[slots] error fetches:', franjasRes.error, excsRes.error, confRes.error);
            return res.status(500).json({ error: 'error interno' });
        }

        const franjas: FranjaSemanalRow[] = (franjasRes.data ?? []) as FranjaSemanalRow[];
        const excepciones: ExcepcionRow[] = (excsRes.data ?? []) as ExcepcionRow[];
        const confirmadas: ConfirmadaRow[] = (confRes.data ?? []) as ConfirmadaRow[];

        // 3. Derivar.
        const slots = derivarSlots({
            duracionSlotMin: servicio.duracion_slot_min,
            capacidadSlot: servicio.capacidad_slot,
            anticipacionMinHoras: servicio.anticipacion_min_horas,
            anticipacionMaxDias: servicio.anticipacion_max_dias,
            desde,
            hasta,
            franjas,
            excepciones,
            confirmadas,
        });

        // Cache-Control: no-store. Los slots cambian con cada nueva confirmada
        // (o cancelacion, o excepcion nueva). Un s-maxage aunque sea corto
        // provoca que Edge sirva la respuesta cacheada y la resta de una
        // confirmada recien insertada no se refleje al instante. Sacrificar
        // la resta en tiempo real por 60s de CDN no vale — cada slot mal-
        // marcado como disponible es una potencial doble reserva (el EXCLUDE
        // constraint la para al INSERT, pero desde el picker seria mal UX).
        // Regresion del smoke Aldo caso 5 (2026-07-11).
        res.setHeader('Cache-Control', 'no-store, must-revalidate');
        return res.status(200).json(slots);
    } catch (err: any) {
        console.error('[slots] excepcion:', err);
        return res.status(500).json({ error: 'error interno' });
    }
}
