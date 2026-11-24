import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../contexts/UserContext';
import { getProxyImageUrl } from '../../lib/utils';
import { Loader2, Image as ImageIcon, Plus, X } from 'lucide-react';

// Sprint EVENTOS MVP (2026-11-24) — Form compartido crear/editar.
// Scope issue #164 Q1-Q4.

export interface EventoRow {
    id?: string;
    nombre: string;
    fecha: string;                   // ISO date YYYY-MM-DD
    hora_inicio?: string | null;     // HH:MM:SS
    hora_fin?: string | null;
    lugar_nombre: string;
    // Sprint EVENTOS-MVP-PULIDO (2026-11-24): direccion + organizador_nombre
    // se relajaron a nullable en BD. Form guarda null cuando el admin deja
    // vacío (no string vacío) — display handle null gracefully.
    direccion: string | null;
    comuna: string;
    organizador_nombre: string | null;
    organizador_instagram?: string | null;
    entrada_gratuita: boolean;
    entrada_monto?: number | null;
    tipo: 'feria' | 'jornada' | 'charla' | 'competencia' | 'meetup';
    descripcion: string;
    actividades: string[];
    imagen_url?: string | null;
    links_referencia: string[];
    publicado: boolean;
}

const EMPTY: EventoRow = {
    nombre: '',
    fecha: '',
    hora_inicio: '',
    hora_fin: '',
    lugar_nombre: '',
    direccion: '',
    comuna: '',
    organizador_nombre: '',
    organizador_instagram: '',
    entrada_gratuita: false,
    entrada_monto: null,
    tipo: 'feria',
    descripcion: '',
    actividades: [],
    imagen_url: null,
    links_referencia: [],
    publicado: false,
};

interface Props {
    initial?: EventoRow;
    mode: 'crear' | 'editar';
}

export default function EventoForm({ initial, mode }: Props) {
    const router = useRouter();
    const { user } = useUser();
    const [form, setForm] = useState<EventoRow>(initial ?? EMPTY);
    const [saving, setSaving] = useState(false);
    const [uploadingImg, setUploadingImg] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const update = <K extends keyof EventoRow>(k: K, v: EventoRow[K]) => {
        setForm((f) => ({ ...f, [k]: v }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setError('La imagen supera 2 MB. Reduce el tamaño antes de subir.');
            return;
        }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setError('Formato no permitido. Usa JPEG, PNG o WebP.');
            return;
        }
        setError(null);
        setUploadingImg(true);
        try {
            const ext = file.name.split('.').pop() || 'jpg';
            const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const { error: upErr } = await supabase.storage
                .from('eventos-imagenes')
                .upload(path, file, { cacheControl: '3600', upsert: false });
            if (upErr) throw upErr;
            const { data } = supabase.storage.from('eventos-imagenes').getPublicUrl(path);
            update('imagen_url', data.publicUrl);
        } catch (err: any) {
            setError(`Error subiendo imagen: ${err?.message ?? err}`);
        } finally {
            setUploadingImg(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        // Sprint EVENTOS-MVP-PULIDO (2026-11-24): direccion + organizador_nombre
        // son opcionales (ALTER DROP NOT NULL). Si vienen vacíos se guardan como
        // null, no como string vacío, para que los display handles los omitan
        // limpio (sin espacios huérfanos ni comas sueltas).
        if (!form.nombre.trim() || !form.fecha || !form.lugar_nombre.trim() || !form.comuna.trim() || !form.descripcion.trim() || !form.tipo) {
            setError('Completa todos los campos requeridos (nombre, fecha, tipo, lugar, comuna, descripción).');
            return;
        }
        if (!form.entrada_gratuita && (form.entrada_monto === null || form.entrada_monto === undefined || form.entrada_monto < 0)) {
            setError('Especifica el monto de entrada o marca "Entrada gratuita".');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                nombre: form.nombre.trim(),
                fecha: form.fecha,
                hora_inicio: form.hora_inicio || null,
                hora_fin: form.hora_fin || null,
                lugar_nombre: form.lugar_nombre.trim(),
                direccion: form.direccion?.trim() || null,
                comuna: form.comuna.trim(),
                organizador_nombre: form.organizador_nombre?.trim() || null,
                organizador_instagram: form.organizador_instagram?.trim() || null,
                entrada_gratuita: form.entrada_gratuita,
                entrada_monto: form.entrada_gratuita ? null : form.entrada_monto,
                tipo: form.tipo,
                descripcion: form.descripcion.trim(),
                actividades: form.actividades.filter((a) => a.trim()).map((a) => a.trim()),
                imagen_url: form.imagen_url || null,
                links_referencia: form.links_referencia.filter((l) => l.trim()).map((l) => l.trim()),
                publicado: form.publicado,
            };
            if (mode === 'crear') {
                const { error: insErr } = await supabase.from('eventos').insert({
                    ...payload,
                    created_by: user?.id ?? null,
                });
                if (insErr) throw insErr;
            } else {
                if (!form.id) throw new Error('Falta id del evento a editar.');
                const { error: updErr } = await supabase.from('eventos').update(payload).eq('id', form.id);
                if (updErr) throw updErr;
            }
            router.push('/admin/eventos');
        } catch (err: any) {
            setError(`Error guardando: ${err?.message ?? err}`);
        } finally {
            setSaving(false);
        }
    };

    const pushEmpty = (k: 'actividades' | 'links_referencia') => {
        update(k, [...form[k], '']);
    };
    const updateArrayItem = (k: 'actividades' | 'links_referencia', idx: number, v: string) => {
        const next = [...form[k]];
        next[idx] = v;
        update(k, next);
    };
    const removeArrayItem = (k: 'actividades' | 'links_referencia', idx: number) => {
        update(k, form[k].filter((_, i) => i !== idx));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
            {error && (
                <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-800 text-sm">
                    {error}
                </div>
            )}

            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Información básica</h2>
                <Field label="Nombre del evento" required>
                    <input type="text" value={form.nombre} onChange={(e) => update('nombre', e.target.value)} className={inputCls} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Fecha" required>
                        <input type="date" value={form.fecha} onChange={(e) => update('fecha', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Hora inicio">
                        <input type="time" value={form.hora_inicio ?? ''} onChange={(e) => update('hora_inicio', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Hora fin">
                        <input type="time" value={form.hora_fin ?? ''} onChange={(e) => update('hora_fin', e.target.value)} className={inputCls} />
                    </Field>
                </div>
                <Field label="Tipo" required>
                    <select value={form.tipo} onChange={(e) => update('tipo', e.target.value as EventoRow['tipo'])} className={inputCls}>
                        <option value="feria">Feria</option>
                        <option value="jornada">Jornada</option>
                        <option value="charla">Charla</option>
                        <option value="competencia">Competencia</option>
                        <option value="meetup">Meetup</option>
                    </select>
                </Field>
            </section>

            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Ubicación</h2>
                <Field label="Lugar (nombre)" required>
                    <input type="text" value={form.lugar_nombre} onChange={(e) => update('lugar_nombre', e.target.value)} className={inputCls} placeholder="ej. Parque Bicentenario" />
                </Field>
                <Field label="Dirección (opcional)" hint="Si no la tenés, pon solo el nombre del lugar y la comuna arriba.">
                    <input type="text" value={form.direccion ?? ''} onChange={(e) => update('direccion', e.target.value)} className={inputCls} placeholder="ej. Av. Bicentenario 3200" />
                </Field>
                <Field label="Comuna" required>
                    <input type="text" value={form.comuna} onChange={(e) => update('comuna', e.target.value)} className={inputCls} placeholder="ej. Vitacura" />
                </Field>
            </section>

            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Organizador</h2>
                <Field label="Nombre organizador (opcional)" hint="Ej. Municipalidad de Santiago. Si queda vacío, no aparece en el card público.">
                    <input type="text" value={form.organizador_nombre ?? ''} onChange={(e) => update('organizador_nombre', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Instagram del organizador" hint="Sin @, solo el handle">
                    <input type="text" value={form.organizador_instagram ?? ''} onChange={(e) => update('organizador_instagram', e.target.value)} className={inputCls} placeholder="ej. pawnecta_cl" />
                </Field>
            </section>

            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Entrada</h2>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.entrada_gratuita} onChange={(e) => update('entrada_gratuita', e.target.checked)} className="w-4 h-4" />
                    <span className="text-slate-700">Entrada gratuita</span>
                </label>
                {!form.entrada_gratuita && (
                    <Field label="Monto de entrada (CLP)" required>
                        <input type="number" min={0} step={1000} value={form.entrada_monto ?? ''} onChange={(e) => update('entrada_monto', e.target.value ? Number(e.target.value) : null)} className={inputCls} />
                    </Field>
                )}
            </section>

            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Contenido</h2>
                <Field label="Descripción" required>
                    <textarea value={form.descripcion} onChange={(e) => update('descripcion', e.target.value)} rows={5} className={inputCls} />
                </Field>
                <ArrayField
                    label="Actividades"
                    hint="Lista las actividades/atracciones del evento"
                    items={form.actividades}
                    onAdd={() => pushEmpty('actividades')}
                    onUpdate={(i, v) => updateArrayItem('actividades', i, v)}
                    onRemove={(i) => removeArrayItem('actividades', i)}
                />
                <ArrayField
                    label="Links de referencia"
                    hint="URLs para más info (Instagram post, web del organizador, etc.)"
                    items={form.links_referencia}
                    onAdd={() => pushEmpty('links_referencia')}
                    onUpdate={(i, v) => updateArrayItem('links_referencia', i, v)}
                    onRemove={(i) => removeArrayItem('links_referencia', i)}
                />
            </section>

            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Imagen (opcional, máx 2MB · JPEG/PNG/WebP)</h2>
                {form.imagen_url ? (
                    <div className="flex items-start gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getProxyImageUrl(form.imagen_url) || ''} alt="Preview" className="w-40 h-40 object-cover rounded-lg border" />
                        <button type="button" onClick={() => update('imagen_url', null)} className="text-sm text-danger-600 hover:underline flex items-center gap-1">
                            <X size={16} /> Quitar imagen
                        </button>
                    </div>
                ) : (
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-300 rounded-lg text-slate-600 font-medium hover:border-accent-500 cursor-pointer">
                        {uploadingImg ? <Loader2 className="animate-spin" size={18} /> : <ImageIcon size={18} />}
                        {uploadingImg ? 'Subiendo...' : 'Subir imagen'}
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" disabled={uploadingImg} />
                    </label>
                )}
            </section>

            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Publicación</h2>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.publicado} onChange={(e) => update('publicado', e.target.checked)} className="w-4 h-4" />
                    <span className="text-slate-700">Publicar inmediatamente (visible en el sitio público)</span>
                </label>
                <p className="text-sm text-slate-500">Si lo dejas sin marcar, el evento queda como borrador. Puedes publicarlo más tarde desde la lista.</p>
            </section>

            <div className="flex items-center gap-3 pt-6 border-t">
                <button type="submit" disabled={saving || uploadingImg} className="px-6 py-2 bg-accent-600 hover:bg-accent-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    {saving && <Loader2 className="animate-spin" size={18} />}
                    {mode === 'crear' ? 'Crear evento' : 'Guardar cambios'}
                </button>
                <button type="button" onClick={() => router.push('/admin/eventos')} className="px-6 py-2 bg-white border-2 border-slate-300 text-slate-600 font-medium rounded-lg hover:border-slate-400">
                    Cancelar
                </button>
            </div>
        </form>
    );
}

const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent';

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
                {label}{required && <span className="text-danger-600 ml-1">*</span>}
            </label>
            {children}
            {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
        </div>
    );
}

function ArrayField({ label, hint, items, onAdd, onUpdate, onRemove }: {
    label: string; hint?: string; items: string[];
    onAdd: () => void; onUpdate: (i: number, v: string) => void; onRemove: (i: number) => void;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            {hint && <p className="text-xs text-slate-500 mb-2">{hint}</p>}
            <div className="space-y-2">
                {items.map((item, i) => (
                    <div key={i} className="flex gap-2">
                        <input type="text" value={item} onChange={(e) => onUpdate(i, e.target.value)} className={inputCls} />
                        <button type="button" onClick={() => onRemove(i)} className="px-3 py-2 text-danger-600 hover:bg-danger-50 rounded-lg" aria-label="Quitar">
                            <X size={18} />
                        </button>
                    </div>
                ))}
                <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 text-sm text-accent-600 hover:underline">
                    <Plus size={16} /> Agregar
                </button>
            </div>
        </div>
    );
}
