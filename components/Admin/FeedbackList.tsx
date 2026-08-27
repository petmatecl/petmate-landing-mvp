import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
    Loader2, Search, ExternalLink, MessageSquareText,
    Bug, Lightbulb, HelpCircle, MoreHorizontal, User as UserIcon,
} from 'lucide-react';

/**
 * Sprint admin-visibilidad (2026-08-27) — Vista solo lectura de
 * feedback_submissions en /admin.
 *
 * Contexto: la tabla `feedback_submissions` se creó en 20260508 completa —
 * schema, RLS con policy `feedback_submissions_select_admin USING (is_admin())`,
 * trigger updated_at — pero la superficie UI para leerla nunca se implementó.
 * El widget `components/Shared/FeedbackWidget.tsx` escribía correctamente
 * pero el admin no tenía forma de leer los envíos sin SQL manual. Patrón
 * "infra sin superficie" que reconocimos en múltiples sub-features de esta
 * semana — la anotación en CLAUDE.md/BACKLOG sirve para que la próxima vez
 * la vista se planee junto con la tabla, no después.
 *
 * Alcance estricto de este sprint: **solo lectura**. Cambiar `estado` o
 * escribir `notas_admin` es acción de gestión y va a otro sprint (RLS ya
 * autoriza al admin también para UPDATE — la puerta está abierta, solo
 * faltarían los controles UI).
 *
 * Query: `.from('feedback_submissions').select('*')` directa. RLS filtra
 * por `is_admin()`. Cero RPC porque el schema ya está en public y el gate
 * ya existe — a diferencia de admin_listar_proveedores que necesitó RPC
 * porque auth.users no está expuesto por PostgREST.
 */

type Rol = 'tutor' | 'proveedor' | 'admin' | 'otro';
type Categoria = 'bug' | 'sugerencia' | 'pregunta' | 'otro';
type Estado = 'nuevo' | 'en_revision' | 'resuelto' | 'descartado';

type FeedbackRow = {
    id: string;
    rol: Rol;
    categoria: Categoria;
    mensaje: string;
    user_id: string | null;
    pagina_url: string | null;
    viewport: string | null;
    user_agent: string | null;
    estado: Estado;
    notas_admin: string | null;
    created_at: string;
    updated_at: string;
};

const ROL_STYLE: Record<Rol, string> = {
    tutor:     'bg-info-100 text-info-700',
    proveedor: 'bg-accent-100 text-accent-700',
    admin:     'bg-slate-200 text-slate-700',
    otro:      'bg-slate-100 text-slate-500',
};

const CATEGORIA_STYLE: Record<Categoria, string> = {
    bug:        'bg-danger-100 text-danger-700',
    sugerencia: 'bg-warning-100 text-warning-700',
    pregunta:   'bg-info-100 text-info-700',
    otro:       'bg-slate-100 text-slate-500',
};

const CATEGORIA_ICON: Record<Categoria, React.ComponentType<{ size?: number; className?: string }>> = {
    bug:        Bug,
    sugerencia: Lightbulb,
    pregunta:   HelpCircle,
    otro:       MoreHorizontal,
};

const ESTADO_STYLE: Record<Estado, string> = {
    nuevo:       'bg-info-100 text-info-700',
    en_revision: 'bg-warning-100 text-warning-700',
    resuelto:    'bg-success-100 text-success-700',
    descartado:  'bg-slate-200 text-slate-500',
};

const MSG_TRUNCATE_CHARS = 180;

export default function FeedbackList() {
    const [rows, setRows] = useState<FeedbackRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Filtros locales
    const [filtroEstado, setFiltroEstado] = useState<Estado | 'todos'>('todos');
    const [filtroCategoria, setFiltroCategoria] = useState<Categoria | 'todos'>('todos');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('feedback_submissions')
                .select('*')
                .order('created_at', { ascending: false });
            if (cancelled) return;
            if (error) {
                console.error('[FeedbackList] fetch failed:', error);
                toast.error('No se pudo cargar el feedback');
                setLoading(false);
                return;
            }
            setRows((data ?? []) as FeedbackRow[]);
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, []);

    const filtrados = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return rows.filter(r => {
            if (filtroEstado !== 'todos' && r.estado !== filtroEstado) return false;
            if (filtroCategoria !== 'todos' && r.categoria !== filtroCategoria) return false;
            if (term && !r.mensaje.toLowerCase().includes(term)) return false;
            return true;
        });
    }, [rows, filtroEstado, filtroCategoria, searchTerm]);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin text-accent-600 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Cargando feedback...</p>
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm">
                <MessageSquareText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Aún no hay feedback recibido.</p>
                <p className="text-xs text-slate-400 mt-1">Cuando alguien envíe algo desde el widget, aparecerá acá.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filtros */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Buscar en mensaje..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent-600 outline-none text-sm"
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
                <select
                    value={filtroEstado}
                    onChange={e => setFiltroEstado(e.target.value as Estado | 'todos')}
                    className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent-600 outline-none text-sm font-medium text-slate-700 cursor-pointer"
                >
                    <option value="todos">Todos los estados</option>
                    <option value="nuevo">Nuevo</option>
                    <option value="en_revision">En revisión</option>
                    <option value="resuelto">Resuelto</option>
                    <option value="descartado">Descartado</option>
                </select>
                <select
                    value={filtroCategoria}
                    onChange={e => setFiltroCategoria(e.target.value as Categoria | 'todos')}
                    className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent-600 outline-none text-sm font-medium text-slate-700 cursor-pointer"
                >
                    <option value="todos">Todas las categorías</option>
                    <option value="bug">Bug</option>
                    <option value="sugerencia">Sugerencia</option>
                    <option value="pregunta">Pregunta</option>
                    <option value="otro">Otro</option>
                </select>
            </div>

            {/* Lista */}
            {filtrados.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500">
                    Ningún feedback coincide con los filtros.
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <ul className="divide-y divide-slate-100">
                        {filtrados.map(r => {
                            const CategoriaIcon = CATEGORIA_ICON[r.categoria];
                            const expanded = expandedId === r.id;
                            const truncar = r.mensaje.length > MSG_TRUNCATE_CHARS;
                            const mensajeVisible = expanded || !truncar
                                ? r.mensaje
                                : r.mensaje.slice(0, MSG_TRUNCATE_CHARS) + '…';
                            return (
                                <li key={r.id} className="p-4 sm:p-6 hover:bg-slate-50/50 transition-colors">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-widest ${ROL_STYLE[r.rol]}`}>
                                            <UserIcon size={10} /> {r.rol}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-widest ${CATEGORIA_STYLE[r.categoria]}`}>
                                            <CategoriaIcon size={10} /> {r.categoria}
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-widest ${ESTADO_STYLE[r.estado]}`}>
                                            {r.estado.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs text-slate-400 ml-auto">
                                            {format(new Date(r.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                                        </span>
                                    </div>

                                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                        {mensajeVisible}
                                    </p>
                                    {truncar && (
                                        <button
                                            type="button"
                                            onClick={() => setExpandedId(expanded ? null : r.id)}
                                            className="mt-1 text-xs font-semibold text-accent-600 hover:text-accent-700"
                                        >
                                            {expanded ? 'Ver menos' : 'Ver mensaje completo'}
                                        </button>
                                    )}

                                    {r.pagina_url && (
                                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                            <a
                                                href={r.pagina_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 hover:text-accent-600 transition-colors max-w-full truncate"
                                                title={r.pagina_url}
                                            >
                                                <ExternalLink size={12} className="shrink-0" />
                                                <span className="truncate">{r.pagina_url}</span>
                                            </a>
                                            {r.viewport && <span className="text-slate-400">{r.viewport}</span>}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            <p className="text-xs text-slate-400 text-center">
                {filtrados.length} de {rows.length} envío{rows.length === 1 ? '' : 's'} · Solo lectura.
                Cambiar el estado de un feedback es acción de gestión y va en otro sprint.
            </p>
        </div>
    );
}
