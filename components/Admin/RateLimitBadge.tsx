// components/Admin/RateLimitBadge.tsx
// ----------------------------------------------------------------------------
// Sprint A4 fase 2 (2026-08-14) — pill visible en /admin que muestra el
// estado del rate limiter sin que Aldo tenga que buscarlo. Fetch al
// endpoint /api/admin/rate-limit-status al mount + cada 60s en poll ligero.
//
// ESTADOS VISUALES:
//   - upstash + healthy → pill verde chica "Rate limit: Upstash · Xms"
//   - upstash + ping fail → pill amarilla "Rate limit: Upstash (ping X)"
//   - memory + degraded (prod/preview) → pill roja "Rate limit degradado:
//     memory (config error)"
//   - memory + not degraded (dev) → NO se renderiza el pill (silencio en
//     dev, es diseño esperado)
//   - memory-fallback + degraded → pill roja "Rate limit degradado: fallback
//     activo (Upstash caído)"
//
// UBICACIÓN:
//   Al lado del <h1> del panel admin. Cero fricción visual pero cero
//   posibilidad de perderlo si aparece rojo — el color amarillo/rojo salta
//   sobre el fondo blanco del header.
// ----------------------------------------------------------------------------
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface Status {
    backend: 'upstash' | 'memory' | 'memory-fallback';
    degraded: boolean;
    vercelEnv: string | null;
    lastRuntimeErrorAt: string | null;
    lastRuntimeErrorMessage: string | null;
    ping: {
        ok: boolean;
        latencyMs: number | null;
        error: string | null;
    };
    checkedAt: string;
}

export default function RateLimitBadge() {
    const [status, setStatus] = useState<Status | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const fetchStatus = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setErr('no-session');
                return;
            }
            const res = await fetch('/api/admin/rate-limit-status', {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) {
                setErr(`http-${res.status}`);
                return;
            }
            const json = (await res.json()) as Status;
            setStatus(json);
            setErr(null);
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'unknown');
        }
    };

    useEffect(() => {
        fetchStatus();
        const iv = setInterval(fetchStatus, 60_000);
        return () => clearInterval(iv);
    }, []);

    // Errores de fetch propios del badge: silencio (no queremos ensuciar UI
    // por un fallo transitorio del propio endpoint de status).
    if (err || !status) return null;

    // Dev local (backend 'memory' pero NO degraded): silencio por diseño.
    if (status.backend === 'memory' && !status.degraded) return null;

    // Upstash healthy: pill verde discreta.
    if (status.backend === 'upstash' && status.ping.ok) {
        return (
            <span
                title={`Rate limit backend: Upstash · ping ${status.ping.latencyMs}ms · env ${status.vercelEnv || 'local'} · última verificación ${status.checkedAt}`}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"
            >
                <CheckCircle2 size={12} />
                Rate limit: Upstash · {status.ping.latencyMs}ms
            </span>
        );
    }

    // Upstash con ping fail (transitorio): pill amarilla.
    if (status.backend === 'upstash' && !status.ping.ok) {
        return (
            <span
                title={`Rate limit backend: Upstash construido pero ping falló · error: ${status.ping.error} · env ${status.vercelEnv}`}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200"
            >
                <AlertTriangle size={12} />
                Rate limit: Upstash con ping fallido
            </span>
        );
    }

    // Degraded en prod/preview: pill roja con detalle en tooltip.
    const label = status.backend === 'memory-fallback'
        ? 'Fallback in-memory activo (Upstash caído)'
        : 'Fallback in-memory activo (config error — credenciales faltantes)';
    const tooltip = [
        `Rate limit backend: ${status.backend}`,
        `env: ${status.vercelEnv}`,
        status.lastRuntimeErrorAt ? `último error: ${status.lastRuntimeErrorAt}` : null,
        status.lastRuntimeErrorMessage ? `mensaje: ${status.lastRuntimeErrorMessage}` : null,
        'El rate limit está funcionando solo dentro de cada contenedor serverless — sin persistencia entre invocaciones. Verificar env vars UPSTASH_REDIS_REST_URL/TOKEN o estado del servicio.',
    ].filter(Boolean).join(' · ');

    return (
        <span
            title={tooltip}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"
        >
            <XCircle size={12} />
            {label}
        </span>
    );
}
