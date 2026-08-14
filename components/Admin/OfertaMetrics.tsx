// components/Admin/OfertaMetrics.tsx
// ----------------------------------------------------------------------------
// Sprint Ola-1 C1-extended (2026-08-14) — panel de instrumentos para la
// decisión de apertura de campaña a tutores.
//
// Contexto: fase solo-proveedores primero (decisión Aldo). El criterio para
// abrir a tutores dejó de ser un plazo y pasó a ser un umbral de oferta:
//   ~25-30 servicios publicados, con al menos 3 en cada categoría principal,
//   concentrados en sector oriente de Santiago (no dispersos).
//
// ConversionMetrics mide DEMANDA (conversaciones, evaluaciones, ratios).
// OfertaMetrics mide OFERTA (servicios activos por categoría + comuna).
// Aldo mira este panel durante el mes de campaña solo-proveedores para
// decidir cuándo abrir la campaña de tutores.
//
// Diseño:
//   - Total servicios activos (contador prominente vs umbral 25-30).
//   - Servicios por categoría (tabla con highlight cuando >=3).
//   - Servicios por comuna (tabla con highlight cuando concentración
//     sector oriente >50% del total).
//   - Filtro implícito: solo cuenta `activo=true` y proveedor `estado=aprobado`
//     con `verificacion_estado=aprobado` — servicios efectivamente publicados
//     y con proveedor verificado.
// ----------------------------------------------------------------------------
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Package, MapPin, Layers, RefreshCw, CheckCircle2 } from 'lucide-react';

const UMBRAL_SERVICIOS_MIN = 25;
const UMBRAL_POR_CATEGORIA_MIN = 3;
const COMUNAS_SECTOR_ORIENTE = [
    'Las Condes', 'Providencia', 'Vitacura', 'Lo Barnechea', 'Ñuñoa',
    'La Reina', 'Peñalolén', 'Macul', 'San Miguel',
];
const UMBRAL_CONCENTRACION_ORIENTE_PCT = 50;

interface OfertaStats {
    totalServiciosActivos: number;             // servicios de proveedor aprobado + verificado + NO ejemplo
    totalServiciosPublicadosBrutos: number;    // servicios activos brutos (sin filtro por estado/verif) — para diff visible en UI
    porCategoria: Array<{ nombre: string; slug: string; count: number }>;
    porComuna: Array<{ comuna: string; count: number }>;
    servicios_oriente: number;                 // servicios ÚNICOS con al menos una comuna en sector oriente
}

export default function OfertaMetrics() {
    const [stats, setStats] = useState<OfertaStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            // Fetch servicios activos con proveedor aprobado + verificado.
            // Sin embed FK (para evitar el bug C1 del embed sin FK definida en
            // otras tablas). Lookup cliente-side.
            const { data: servicios, error: servErr } = await supabase
                .from('servicios_publicados')
                .select('id, proveedor_id, categoria_id, comunas_cobertura')
                .eq('activo', true);
            if (servErr) throw servErr;

            const provIds = Array.from(new Set((servicios || []).map(s => s.proveedor_id).filter(Boolean)));
            const catIds = Array.from(new Set((servicios || []).map(s => s.categoria_id).filter(Boolean)));

            const [provResFull, catRes] = await Promise.all([
                supabase.from('proveedores')
                    .select('id, estado, verificacion_estado, comuna, es_ejemplo')
                    .in('id', provIds),
                supabase.from('categorias_servicio')
                    .select('id, slug, nombre')
                    .in('id', catIds),
            ]);

            const provMap: Record<string, { estado: string; verif: string; comuna: string | null; ejemplo: boolean }> = {};
            (provResFull.data || []).forEach((p: any) => {
                provMap[p.id] = {
                    estado: p.estado,
                    verif: p.verificacion_estado,
                    comuna: p.comuna,
                    ejemplo: !!p.es_ejemplo,
                };
            });
            const catMap: Record<string, { slug: string; nombre: string }> = {};
            (catRes.data || []).forEach((c: any) => {
                catMap[c.id] = { slug: c.slug, nombre: c.nombre };
            });

            // Filtrar servicios "efectivamente publicados" — proveedor aprobado +
            // verificado + NO ejemplo (para medir oferta real, no seed).
            const serviciosReales = (servicios || []).filter(s => {
                const p = s.proveedor_id ? provMap[s.proveedor_id] : null;
                return p && p.estado === 'aprobado' && p.verif === 'aprobado' && !p.ejemplo;
            });

            const totalServiciosActivos = serviciosReales.length;

            // Por categoría
            const catCount: Record<string, number> = {};
            serviciosReales.forEach((s) => {
                const cat = s.categoria_id ? catMap[s.categoria_id]?.nombre : null;
                if (cat) catCount[cat] = (catCount[cat] || 0) + 1;
            });
            const porCategoria = Object.entries(catCount)
                .map(([nombre, count]) => {
                    const slug = Object.values(catMap).find(c => c.nombre === nombre)?.slug || '';
                    return { nombre, slug, count };
                })
                .sort((a, b) => b.count - a.count);

            // Por comuna — cuenta "servicios que cubren esta comuna" (un servicio con
            // 3 comunas de cobertura suma 1 a cada una de esas 3 filas). El total del
            // desglose SUMA MÁS que totalServiciosActivos por diseño (cada servicio
            // aparece en N filas si cubre N comunas). Interpretación correcta de
            // cada fila: "N servicios cubren esta comuna", NO "N servicios están
            // basados aquí".
            const comunaCount: Record<string, number> = {};
            serviciosReales.forEach((s) => {
                // Preferir cobertura declarada del servicio; fallback a comuna del proveedor.
                const comunas = (s.comunas_cobertura && s.comunas_cobertura.length > 0)
                    ? s.comunas_cobertura
                    : (s.proveedor_id && provMap[s.proveedor_id]?.comuna ? [provMap[s.proveedor_id]!.comuna as string] : []);
                comunas.forEach((c: string) => {
                    if (c) comunaCount[c] = (comunaCount[c] || 0) + 1;
                });
            });
            const porComuna = Object.entries(comunaCount)
                .map(([comuna, count]) => ({ comuna, count }))
                .sort((a, b) => b.count - a.count);

            // Concentración sector oriente — servicios ÚNICOS con al menos una comuna
            // del sector en su cobertura. NO sumamos filas de `porComuna` porque un
            // servicio que cubre 4 comunas oriente contaría 4×, inflando el %
            // hasta pasar 100% (bug histórico PO 2026-08-14: mostraba "433%").
            const serviciosOrienteSet = new Set<string>();
            serviciosReales.forEach((s) => {
                const comunas = (s.comunas_cobertura && s.comunas_cobertura.length > 0)
                    ? s.comunas_cobertura
                    : (s.proveedor_id && provMap[s.proveedor_id]?.comuna ? [provMap[s.proveedor_id]!.comuna as string] : []);
                const tieneOriente = (comunas || []).some((c: string) => c && COMUNAS_SECTOR_ORIENTE.includes(c));
                if (tieneOriente) serviciosOrienteSet.add(s.id);
            });
            const servicios_oriente = serviciosOrienteSet.size;

            setStats({
                totalServiciosActivos,
                totalServiciosPublicadosBrutos: (servicios || []).length,
                porCategoria,
                porComuna,
                servicios_oriente,
            });
        } catch (err) {
            console.error('[OfertaMetrics] Error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
            </div>
        );
    }
    if (!stats) return null;

    const alcanzaTotal = stats.totalServiciosActivos >= UMBRAL_SERVICIOS_MIN;
    const totalPct = Math.round((stats.totalServiciosActivos / UMBRAL_SERVICIOS_MIN) * 100);
    const concentracionOrientePct = stats.totalServiciosActivos > 0
        ? Math.round((stats.servicios_oriente / stats.totalServiciosActivos) * 100)
        : 0;
    const alcanzaConcentracion = concentracionOrientePct >= UMBRAL_CONCENTRACION_ORIENTE_PCT;
    const categoriasQueAlcanzan = stats.porCategoria.filter(c => c.count >= UMBRAL_POR_CATEGORIA_MIN).length;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Oferta publicada — umbral de apertura</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Instrumentos para decidir cuándo abrir la campaña a tutores.
                        Servicios reales publicados (excluye ejemplo, requiere proveedor aprobado + verificado).
                    </p>
                </div>
                <button
                    onClick={() => fetchStats(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-semibold shadow-sm disabled:opacity-50"
                >
                    <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                    {refreshing ? 'Actualizando...' : 'Actualizar'}
                </button>
            </div>

            {/* Card total con progreso vs umbral */}
            <div className={`p-6 rounded-2xl border shadow-sm ${alcanzaTotal ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${alcanzaTotal ? 'bg-green-100 text-green-700' : 'bg-sky-50 text-sky-600'}`}>
                        {alcanzaTotal ? <CheckCircle2 size={28} /> : <Package size={28} />}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-slate-500 font-medium">Total servicios activos (proveedores reales)</p>
                        <p className="text-4xl font-bold text-slate-900 mt-1">{stats.totalServiciosActivos} <span className="text-lg text-slate-400 font-normal">/ {UMBRAL_SERVICIOS_MIN} mínimo</span></p>
                        <div className="w-full h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
                            <div className={`h-full ${alcanzaTotal ? 'bg-green-500' : 'bg-sky-400'}`} style={{ width: `${Math.min(totalPct, 100)}%` }} />
                        </div>
                        {stats.totalServiciosPublicadosBrutos > stats.totalServiciosActivos && (
                            <p className="text-xs text-slate-500 mt-2">
                                Hay <span className="font-semibold text-slate-700">{stats.totalServiciosPublicadosBrutos - stats.totalServiciosActivos}</span> servicio(s) activo(s) adicional(es) publicado(s) que el panel no cuenta
                                (proveedor pendiente de aprobación o verificación, o servicio de ejemplo).
                                Total bruto: {stats.totalServiciosPublicadosBrutos}.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Grid 2 columnas: categorías + comunas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Categorías */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <Layers size={16} className="text-slate-500" />
                        <h3 className="font-semibold text-slate-900 text-sm">Servicios por categoría</h3>
                        <span className="ml-auto text-xs text-slate-500">{categoriasQueAlcanzan} de {stats.porCategoria.length} alcanzan ≥{UMBRAL_POR_CATEGORIA_MIN}</span>
                    </div>
                    <table className="w-full text-sm">
                        <tbody>
                            {stats.porCategoria.length === 0 && (
                                <tr><td className="px-5 py-4 text-slate-400">Sin servicios reales publicados</td></tr>
                            )}
                            {stats.porCategoria.map((row) => (
                                <tr key={row.slug} className="border-b border-slate-50 last:border-0">
                                    <td className="px-5 py-3 text-slate-700 font-medium capitalize">{row.nombre}</td>
                                    <td className="px-5 py-3 text-right">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${row.count >= UMBRAL_POR_CATEGORIA_MIN ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {row.count >= UMBRAL_POR_CATEGORIA_MIN && <CheckCircle2 size={12} />}
                                            {row.count}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Comunas */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <MapPin size={16} className="text-slate-500" />
                        <h3 className="font-semibold text-slate-900 text-sm">Servicios por comuna</h3>
                        <span className={`ml-auto text-xs font-semibold ${alcanzaConcentracion ? 'text-green-700' : 'text-slate-500'}`}>
                            {concentracionOrientePct}% sector oriente
                        </span>
                    </div>
                    <table className="w-full text-sm">
                        <tbody>
                            {stats.porComuna.length === 0 && (
                                <tr><td className="px-5 py-4 text-slate-400">Sin comunas registradas</td></tr>
                            )}
                            {stats.porComuna.slice(0, 12).map((row) => {
                                const esOriente = COMUNAS_SECTOR_ORIENTE.includes(row.comuna);
                                return (
                                    <tr key={row.comuna} className="border-b border-slate-50 last:border-0">
                                        <td className="px-5 py-3 text-slate-700 font-medium">
                                            {row.comuna}
                                            {esOriente && <span className="ml-2 text-xs text-green-600 font-normal">oriente</span>}
                                        </td>
                                        <td className="px-5 py-3 text-right font-semibold text-slate-900">{row.count}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                        <p>
                            Cada fila = servicios que <em>cubren</em> esa comuna. Un servicio con cobertura múltiple aparece en varias filas, por eso el desglose suma más que el total.
                        </p>
                        <p>
                            <span className="font-semibold text-slate-700">{concentracionOrientePct}%</span> sector oriente = {stats.servicios_oriente} de {stats.totalServiciosActivos} servicios únicos con al menos una comuna del sector.
                            Umbral: ≥{UMBRAL_CONCENTRACION_ORIENTE_PCT}%. Sector: {COMUNAS_SECTOR_ORIENTE.slice(0, 5).join(', ')}, ...
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
