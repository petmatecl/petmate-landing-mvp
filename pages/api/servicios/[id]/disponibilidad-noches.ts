// pages/api/servicios/[id]/disponibilidad-noches.ts
// ----------------------------------------------------------------------------
// Fase 2 agenda por rango de noches — Incremento F2-3-A.
//
// GET /api/servicios/[id]/disponibilidad-noches?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
//
// Endpoint PUBLICO de lectura. Espejo del endpoint /slots (F1) pero para el
// modelo Airbnb-like: devuelve el calendario diario del servicio de estadias
// con la razon por la que cada dia esta (o no) disponible. Rate limit
// apiLimiter (30 req/min por IP).
//
// Input duro:
//   - id: uuid del servicio.
//   - desde: YYYY-MM-DD.
//   - hasta: YYYY-MM-DD.
//   - desde <= hasta.
//   - rango <= 366 dias (año completo para picker mensual del tutor).
//
// Servicio requerido:
//   - existe, activo=true, agendamiento_habilitado=true, capacidad_estadia
//     IS NOT NULL (opt-in del sistema F2).
//   - si falta cualquiera → 404 (no revelamos si es "existe pero no acepta
//     estadias" vs "no existe"; ambos son "no hay disponibilidad que servir").
//
// Response 200:
//   {
//     dias: [{ fecha, disponible, restantes, razon }],
//     config: { min_noches, max_noches, capacidad_estadia,
//               cancelacion_min_horas_antes, check_in_hora, check_out_hora }
//   }
//   El picker del tutor (F2-3-C) valida el rango elegido client-side contra
//   min_noches/max_noches. Server revalida al INSERT como red (CHECK BD).
//
// Warning de observabilidad: si `capacidad_estadia > 1`, log warning.
// Motivo: en F2-3-A la reserva es client-side sin advisory lock (mismo
// patron que F1). Cap > 1 tiene race window pequena — dos INSERTs
// simultaneos pueden pasar el EXCLUDE (que solo dispara con cap=1) antes
// que el fetch de este endpoint refleje el cambio. La ventana es del
// orden de decenas de ms; el impacto real depende del volumen. Deuda
// documentada en README para levantar cuando aparezca el primer sobre-
// booking real (F2.5 con endpoint POST + pg_advisory_xact_lock, mismo
// criterio que F1 dijo pero nunca aplicó).
//
// La logica de derivacion vive en lib/nochesAgenda.ts como funcion pura
// testeable. Este handler solo hace: validar → fetch → llamar deriv → devolver.
// ----------------------------------------------------------------------------
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { apiLimiter } from '../../../../lib/rateLimit';
import {
    derivarDisponibilidadNoches,
    type BlackoutRow,
    type ConfirmadaEstadiaRow,
} from '../../../../lib/nochesAgenda';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGO_DIAS = 366;

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
        console.error('[disponibilidad-noches] falta config supabase');
        return res.status(500).json({ error: 'config incompleta' });
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    try {
        // 1. Fetch servicio + config F2.
        const { data: servicio, error: servErr } = await supabase
            .from('servicios_publicados')
            .select(`
                id, activo, agendamiento_habilitado,
                capacidad_estadia, anticipacion_min_dias, anticipacion_max_dias_estadia,
                min_noches, max_noches, cancelacion_min_horas_antes,
                check_in_hora, check_out_hora
            `)
            .eq('id', id)
            .maybeSingle();
        if (servErr) {
            console.error('[disponibilidad-noches] error servicio:', servErr);
            return res.status(500).json({ error: 'error interno' });
        }
        if (!servicio) return res.status(404).json({ error: 'servicio no encontrado' });
        if (!servicio.activo) return res.status(404).json({ error: 'servicio no disponible' });
        if (!servicio.agendamiento_habilitado) return res.status(404).json({ error: 'servicio no acepta agendamientos' });
        if (servicio.capacidad_estadia === null) return res.status(404).json({ error: 'servicio sin agenda de estadias configurada' });

        // Observabilidad: cap > 1 tiene race window sin advisory lock. Logeamos
        // el uso para dimensionar el impacto real y priorizar F2.5 si aparece
        // sobre-booking.
        if (servicio.capacidad_estadia > 1) {
            console.warn(
                '[disponibilidad-noches] servicio con capacidad_estadia > 1 sin advisory lock',
                { servicio_id: id, capacidad: servicio.capacidad_estadia }
            );
        }

        // 2. Fetch blackouts F2 + confirmadas F2 en paralelo.
        //
        // Blackouts: solape con [desde, hasta]. Un blackout {b.fecha, b.fecha_fin}
        // solapa con el rango [desde, hasta] cuando b.fecha_fin > desde AND
        // b.fecha < hasta (semi-abierto AND rango cerrado). Filtramos con dos
        // gte/lt para minimizar rows traidas.
        //
        // Confirmadas F2: estado='confirmada' + capacidad_snapshot_estadia
        // NOT NULL (bandera de F2, excluye V1/V2/V4a/V4b del flujo viejo y
        // reservas F1). Solape: fecha_fin > desde AND fecha_preferida < hasta+1.
        // hasta+1 porque fecha_preferida es timestamptz y comparamos con string
        // YYYY-MM-DD como inicio de dia UTC — hasta 24h de desfase con Chile,
        // pero el filtro es solo pre-filtrado (la deriv luego valida por
        // fecha civil chilena via ymdChile). Un dia mas de margen no daña.
        const hastaMas1 = (() => {
            const [y, m, d] = hasta.split('-').map(Number);
            const dt = new Date(Date.UTC(y, m - 1, d + 1));
            const yy = dt.getUTCFullYear();
            const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(dt.getUTCDate()).padStart(2, '0');
            return `${yy}-${mm}-${dd}`;
        })();

        const [blackoutsRes, confRes] = await Promise.all([
            supabase
                .from('excepciones_disponibilidad')
                .select('fecha, fecha_fin')
                .eq('servicio_id', id)
                .not('fecha_fin', 'is', null)
                .gt('fecha_fin', desde)
                .lt('fecha', hastaMas1),
            supabase
                .from('agendamientos')
                .select('fecha_preferida, fecha_fin')
                .eq('servicio_id', id)
                .eq('estado', 'confirmada')
                .not('fecha_fin', 'is', null)
                .not('capacidad_snapshot_estadia', 'is', null)
                .gt('fecha_fin', desde)
                .lt('fecha_preferida', hastaMas1),
        ]);

        if (blackoutsRes.error || confRes.error) {
            console.error('[disponibilidad-noches] error fetches:', blackoutsRes.error, confRes.error);
            return res.status(500).json({ error: 'error interno' });
        }

        const blackouts: BlackoutRow[] = (blackoutsRes.data ?? []) as BlackoutRow[];
        const confirmadas: ConfirmadaEstadiaRow[] = (confRes.data ?? []) as ConfirmadaEstadiaRow[];

        // 3. Derivar.
        const dias = derivarDisponibilidadNoches({
            capacidadEstadia: servicio.capacidad_estadia,
            anticipacionMinDias: servicio.anticipacion_min_dias,
            anticipacionMaxDiasEstadia: servicio.anticipacion_max_dias_estadia,
            desde,
            hasta,
            blackouts,
            confirmadas,
        });

        // Cache-Control: no-store. Cada nueva reserva/blackout invalida.
        // Mismo criterio que /slots — no queremos ventana entre insert y
        // fetch donde el picker muestre dias libres que ya se ocuparon.
        res.setHeader('Cache-Control', 'no-store, must-revalidate');
        return res.status(200).json({
            dias,
            config: {
                capacidad_estadia: servicio.capacidad_estadia,
                min_noches: servicio.min_noches,
                max_noches: servicio.max_noches,
                cancelacion_min_horas_antes: servicio.cancelacion_min_horas_antes,
                check_in_hora: servicio.check_in_hora,
                check_out_hora: servicio.check_out_hora,
            },
        });
    } catch (err: any) {
        console.error('[disponibilidad-noches] excepcion:', err);
        return res.status(500).json({ error: 'error interno' });
    }
}
