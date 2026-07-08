import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import RoleGuard from '../../../components/Shared/RoleGuard';
import ClientLayout from '../../../components/Client/ClientLayout';
import ConfirmDialog from '../../../components/Shared/ConfirmDialog';
import { toast } from 'sonner';
import {
    PawPrint, Plus, Edit, Trash2, X, Loader2,
    ChevronLeft, Dog, Cat, Camera, ImagePlus,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────────────────────
// Storage helpers para fotos de mascotas
//
// Reusamos el bucket vivo `servicios-fotos` (mismo que usan la galeria del
// proveedor y las fotos de servicios) con el prefix `mascotas/{user_id}/` que
// las policies de storage validan (creadas via SQL fuera de codigo).
//
// Limites calibrados contra el patron vivo (ServiceFormModal / uploadGaleriaFoto):
//   - 5 MB por foto (mismo cap de fotos de servicio).
//   - Galeria hasta 6 fotos (menor que las 8 del servicio: mascota es
//     contexto para el proveedor, no portfolio profesional).
// Cleanup: al remover una foto del form, borramos el objeto del bucket para
// no dejar huerfanos. Cancel del modal sin guardar deja los recien subidos
// huerfanos — mismo comportamiento que la galeria del proveedor, aceptado.
// ────────────────────────────────────────────────────────────────────────────

const FOTOS_BUCKET = 'servicios-fotos';
const MAX_FOTO_SIZE_MB = 5;
const MAX_GALERIA_MASCOTA = 6;

function fotoPathFromUrl(url: string): string | null {
    const marker = `/${FOTOS_BUCKET}/`;
    const idx = url.indexOf(marker);
    return idx === -1 ? null : url.substring(idx + marker.length);
}

async function subirFotoAStorage(file: File, userId: string): Promise<string | null> {
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const filePath = `mascotas/${userId}/${fileName}`;
    const { error } = await supabase.storage.from(FOTOS_BUCKET).upload(filePath, file);
    if (error) {
        console.error('[Mascotas] upload error:', error);
        return null;
    }
    const { data } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
}

async function borrarFotoDeStorage(url: string): Promise<void> {
    const path = fotoPathFromUrl(url);
    if (!path) return;
    const { error } = await supabase.storage.from(FOTOS_BUCKET).remove([path]);
    if (error) console.warn('[Mascotas] delete storage error:', error);
}

// ────────────────────────────────────────────────────────────────────────────
// Tipos y helpers
// ────────────────────────────────────────────────────────────────────────────

type Tipo = 'perro' | 'gato';
type Sexo = 'macho' | 'hembra' | '';
type Tamano = 'pequeño' | 'mediano' | 'grande' | '';

interface Mascota {
    id: string;
    user_id: string;
    nombre: string;
    tipo: Tipo;
    raza: string | null;
    sexo: Sexo | null;
    fecha_nacimiento: string | null; // ISO date
    tamano: Tamano | null;
    descripcion: string | null;
    tiene_chip: boolean;
    chip_id: string | null;
    vacunas_al_dia: boolean;
    enfermedades: string | null;
    trato_especial: boolean;
    trato_especial_desc: string | null;
    foto_mascota: string | null;
    fotos_galeria: string[] | null;
    created_at: string;
}

function calcularEdad(fechaNacimiento: string | null): string | null {
    if (!fechaNacimiento) return null;
    const nac = new Date(fechaNacimiento);
    if (Number.isNaN(nac.getTime())) return null;
    const ahora = new Date();
    const anos = ahora.getFullYear() - nac.getFullYear();
    const mesDiff = ahora.getMonth() - nac.getMonth();
    const total = mesDiff < 0 || (mesDiff === 0 && ahora.getDate() < nac.getDate()) ? anos - 1 : anos;
    if (total < 0) return null;
    if (total === 0) {
        const meses = Math.max(0, (ahora.getFullYear() - nac.getFullYear()) * 12 + mesDiff);
        return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
    }
    return `${total} ${total === 1 ? 'año' : 'años'}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Página
// ────────────────────────────────────────────────────────────────────────────

function MascotasPageContent() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [mascotas, setMascotas] = useState<Mascota[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Mascota | 'new' | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deletingLoading, setDeletingLoading] = useState(false);

    // returnTo opcional: si el tutor viene desde SolicitarAgendamientoModal
    // le mostramos un link para volver al servicio y no perder el flujo.
    const returnTo = typeof router.query.returnTo === 'string' ? router.query.returnTo : null;

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUserId(session.user.id);
            }
        });
    }, []);

    const fetchMascotas = useCallback(async (uid: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('mascotas')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: true });
        if (error) {
            console.error('[Mascotas] fetch error:', error);
            toast.error('No pudimos cargar tus mascotas. Recargá la página.');
            setLoading(false);
            return;
        }
        setMascotas((data as Mascota[]) || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (userId) fetchMascotas(userId);
    }, [userId, fetchMascotas]);

    const handleDelete = async () => {
        if (!deletingId) return;
        setDeletingLoading(true);
        try {
            const { error } = await supabase
                .from('mascotas')
                .delete()
                .eq('id', deletingId);
            if (error) throw error;
            setMascotas(prev => prev.filter(m => m.id !== deletingId));
            toast.success('Ficha eliminada');
            setDeletingId(null);
        } catch (err) {
            console.error('[Mascotas] delete error:', err);
            toast.error('No pudimos eliminar la ficha. Intentá de nuevo.');
        } finally {
            setDeletingLoading(false);
        }
    };

    const handleSaved = (mascota: Mascota, isNew: boolean) => {
        setMascotas(prev => isNew
            ? [...prev, mascota]
            : prev.map(m => (m.id === mascota.id ? mascota : m)));
        setEditing(null);
    };

    return (
        <>
            <Head>
                <title>Mis mascotas — Pawnecta</title>
            </Head>

            <div className="space-y-6">
                {returnTo && (
                    <Link
                        href={returnTo}
                        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-accent-600 transition-colors"
                    >
                        <ChevronLeft size={16} /> Volver al servicio
                    </Link>
                )}

                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <PawPrint size={22} className="text-accent-600" />
                            Mis mascotas
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Estas fichas se muestran al proveedor cuando solicitás un servicio, para que tenga contexto sin preguntar.
                        </p>
                    </div>
                    {mascotas.length > 0 && (
                        <button
                            onClick={() => setEditing('new')}
                            className="inline-flex items-center gap-1.5 bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium tracking-wide px-4 py-2 rounded-xl transition-colors"
                        >
                            <Plus size={16} /> Agregar mascota
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                        <Loader2 size={32} className="animate-spin text-accent-600 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Cargando tus fichas…</p>
                    </div>
                ) : mascotas.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                        <div className="w-16 h-16 bg-accent-50 text-accent-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <PawPrint size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Todavía no tenés fichas creadas</h3>
                        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                            Creá la ficha de tu mascota para que el proveedor tenga toda la info importante al recibir tu solicitud.
                        </p>
                        <button
                            onClick={() => setEditing('new')}
                            className="inline-flex items-center gap-1.5 bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium tracking-wide px-5 py-2.5 rounded-xl transition-colors"
                        >
                            <Plus size={16} /> Agregar tu primera mascota
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {mascotas.map(m => (
                            <MascotaCard
                                key={m.id}
                                mascota={m}
                                onEdit={() => setEditing(m)}
                                onDelete={() => setDeletingId(m.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {editing && userId && (
                <MascotaFormModal
                    userId={userId}
                    mascota={editing === 'new' ? null : editing}
                    onClose={() => setEditing(null)}
                    onSaved={handleSaved}
                />
            )}

            <ConfirmDialog
                open={deletingId !== null}
                title="Eliminar ficha"
                message="¿Estás seguro? Esta acción no se puede deshacer. Las solicitudes anteriores que tenían asociada esta ficha se conservan pero se desvinculan."
                confirmLabel={deletingLoading ? 'Eliminando…' : 'Eliminar'}
                cancelLabel="Cancelar"
                variant="danger"
                loading={deletingLoading}
                onConfirm={handleDelete}
                onCancel={() => setDeletingId(null)}
            />
        </>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Card de mascota
// ────────────────────────────────────────────────────────────────────────────

function MascotaCard({ mascota, onEdit, onDelete }: {
    mascota: Mascota;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const edad = calcularEdad(mascota.fecha_nacimiento);
    const Icon = mascota.tipo === 'gato' ? Cat : Dog;
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="aspect-[4/3] bg-slate-100 relative">
                {mascota.foto_mascota ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                        src={mascota.foto_mascota}
                        alt={mascota.nombre}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Icon size={64} />
                    </div>
                )}
            </div>
            <div className="p-4 flex-1 flex flex-col gap-2">
                <div>
                    <h3 className="font-semibold text-slate-900 text-base leading-tight">{mascota.nombre}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 capitalize">
                        {mascota.tipo}
                        {mascota.raza ? ` · ${mascota.raza}` : ''}
                        {edad ? ` · ${edad}` : ''}
                    </p>
                </div>
                {(mascota.enfermedades || mascota.trato_especial) && (
                    <p className="text-[11px] text-warning-700 bg-warning-50 border border-warning-100 rounded-lg px-2 py-1 leading-snug">
                        {mascota.trato_especial ? 'Trato especial' : ''}
                        {mascota.trato_especial && mascota.enfermedades ? ' · ' : ''}
                        {mascota.enfermedades ? 'Condiciones médicas' : ''}
                    </p>
                )}
                <div className="flex items-center gap-2 mt-auto pt-2">
                    <button
                        onClick={onEdit}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-accent-700 bg-accent-50 hover:bg-accent-100 rounded-xl py-1.5 transition-colors"
                    >
                        <Edit size={14} /> Editar
                    </button>
                    <button
                        onClick={onDelete}
                        aria-label="Eliminar ficha"
                        className="inline-flex items-center justify-center text-sm text-slate-400 hover:text-danger-600 hover:bg-danger-50 rounded-xl w-9 h-9 transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Form modal (crear/editar)
// ────────────────────────────────────────────────────────────────────────────

function MascotaFormModal({ userId, mascota, onClose, onSaved }: {
    userId: string;
    mascota: Mascota | null;
    onClose: () => void;
    onSaved: (m: Mascota, isNew: boolean) => void;
}) {
    const isNew = !mascota;
    const [nombre, setNombre] = useState(mascota?.nombre || '');
    const [tipo, setTipo] = useState<Tipo>(mascota?.tipo || 'perro');
    const [raza, setRaza] = useState(mascota?.raza || '');
    const [sexo, setSexo] = useState<Sexo>((mascota?.sexo as Sexo) || '');
    const [fechaNacimiento, setFechaNacimiento] = useState(mascota?.fecha_nacimiento || '');
    const [tamano, setTamano] = useState<Tamano>((mascota?.tamano as Tamano) || '');
    const [descripcion, setDescripcion] = useState(mascota?.descripcion || '');
    const [tieneChip, setTieneChip] = useState(mascota?.tiene_chip || false);
    const [chipId, setChipId] = useState(mascota?.chip_id || '');
    const [vacunasAlDia, setVacunasAlDia] = useState(mascota?.vacunas_al_dia || false);
    const [enfermedades, setEnfermedades] = useState(mascota?.enfermedades || '');
    const [tratoEspecial, setTratoEspecial] = useState(mascota?.trato_especial || false);
    const [tratoEspecialDesc, setTratoEspecialDesc] = useState(mascota?.trato_especial_desc || '');
    const [fotoMascota, setFotoMascota] = useState<string>(mascota?.foto_mascota || '');
    const [galeria, setGaleria] = useState<string[]>(mascota?.fotos_galeria || []);
    const [uploadingPrincipal, setUploadingPrincipal] = useState(false);
    const [uploadingGaleria, setUploadingGaleria] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleUploadPrincipal = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (file.size > MAX_FOTO_SIZE_MB * 1024 * 1024) {
            toast.error(`La imagen supera ${MAX_FOTO_SIZE_MB} MB.`);
            return;
        }
        setUploadingPrincipal(true);
        try {
            const url = await subirFotoAStorage(file, userId);
            if (!url) { toast.error('No pudimos subir la foto.'); return; }
            // Reemplazo: borrar la anterior del bucket para no dejar huerfano.
            if (fotoMascota) await borrarFotoDeStorage(fotoMascota);
            setFotoMascota(url);
        } finally {
            setUploadingPrincipal(false);
        }
    };

    const handleRemovePrincipal = async () => {
        if (!fotoMascota) return;
        const url = fotoMascota;
        setFotoMascota('');
        await borrarFotoDeStorage(url);
    };

    const handleUploadGaleria = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (files.length === 0) return;
        if (galeria.length + files.length > MAX_GALERIA_MASCOTA) {
            toast.error(`Podés tener máximo ${MAX_GALERIA_MASCOTA} fotos en la galería.`);
            return;
        }
        setUploadingGaleria(true);
        try {
            const nuevas: string[] = [];
            for (const file of files) {
                if (file.size > MAX_FOTO_SIZE_MB * 1024 * 1024) {
                    toast.error(`${file.name} supera ${MAX_FOTO_SIZE_MB} MB.`);
                    continue;
                }
                const url = await subirFotoAStorage(file, userId);
                if (url) nuevas.push(url);
                else toast.error(`No pudimos subir ${file.name}.`);
            }
            if (nuevas.length > 0) setGaleria(prev => [...prev, ...nuevas]);
        } finally {
            setUploadingGaleria(false);
        }
    };

    const handleRemoveGaleria = async (idx: number) => {
        const url = galeria[idx];
        setGaleria(prev => prev.filter((_, i) => i !== idx));
        if (url) await borrarFotoDeStorage(url);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!nombre.trim()) {
            setErrorMsg('El nombre es obligatorio.');
            return;
        }
        if (tratoEspecial && !tratoEspecialDesc.trim()) {
            setErrorMsg('Contános en qué consiste el trato especial.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                user_id: userId,
                nombre: nombre.trim(),
                tipo,
                raza: raza.trim() || null,
                sexo: sexo || null,
                fecha_nacimiento: fechaNacimiento || null,
                tamano: tamano || null,
                descripcion: descripcion.trim() || null,
                tiene_chip: tieneChip,
                chip_id: tieneChip ? (chipId.trim() || null) : null,
                vacunas_al_dia: vacunasAlDia,
                enfermedades: enfermedades.trim() || null,
                trato_especial: tratoEspecial,
                trato_especial_desc: tratoEspecial ? (tratoEspecialDesc.trim() || null) : null,
                foto_mascota: fotoMascota || null,
                fotos_galeria: galeria.length > 0 ? galeria : null,
            };

            if (isNew) {
                const { data, error } = await supabase
                    .from('mascotas')
                    .insert(payload)
                    .select()
                    .single();
                if (error) throw error;
                onSaved(data as Mascota, true);
                toast.success(`${nombre.trim()} guardado`);
            } else if (mascota) {
                const { data, error } = await supabase
                    .from('mascotas')
                    .update(payload)
                    .eq('id', mascota.id)
                    .select()
                    .single();
                if (error) throw error;
                onSaved(data as Mascota, false);
                toast.success(`${nombre.trim()} actualizado`);
            }
        } catch (err: any) {
            console.error('[Mascotas] save error:', err);
            setErrorMsg(err.message || 'No pudimos guardar la ficha. Intentá de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                        <PawPrint size={18} className="text-accent-600" />
                        {isNew ? 'Nueva mascota' : `Editar ${mascota?.nombre}`}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        aria-label="Cerrar"
                        className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
                    {/* Fotos: principal + galeria (hasta 6). Upload al bucket
                        `servicios-fotos` bajo `mascotas/{user_id}/…`, con
                        preview inmediato y cleanup del bucket al remover. */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Foto principal</label>
                        <div className="flex items-start gap-3">
                            {fotoMascota ? (
                                <div className="relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={fotoMascota}
                                        alt={nombre || 'Foto mascota'}
                                        className="w-24 h-24 rounded-xl object-cover border border-slate-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRemovePrincipal}
                                        aria-label="Quitar foto principal"
                                        className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center text-slate-500 hover:text-danger-600 hover:border-danger-200 transition-colors shadow-sm"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ) : (
                                <div className="w-24 h-24 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-300">
                                    <Camera size={24} />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <label className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 bg-accent-50 hover:bg-accent-100 rounded-xl px-3 py-1.5 cursor-pointer transition-colors">
                                    {uploadingPrincipal ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                                    {fotoMascota ? 'Cambiar foto' : 'Subir foto'}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleUploadPrincipal}
                                        disabled={uploadingPrincipal}
                                    />
                                </label>
                                <p className="text-xs text-slate-400 mt-1.5">JPG o PNG. Máximo {MAX_FOTO_SIZE_MB} MB.</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-sm font-medium text-slate-700">Galería (opcional)</label>
                            <span className="text-xs text-slate-400">{galeria.length}/{MAX_GALERIA_MASCOTA}</span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {galeria.map((url, i) => (
                                <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt={`Galería ${i + 1}`} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveGaleria(i)}
                                        aria-label={`Quitar foto ${i + 1}`}
                                        className="absolute top-1 right-1 bg-white/90 hover:bg-white border border-slate-200 rounded-full w-5 h-5 flex items-center justify-center text-slate-500 hover:text-danger-600 transition-colors opacity-80 group-hover:opacity-100"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                            {galeria.length < MAX_GALERIA_MASCOTA && (
                                <label className="aspect-square rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-accent-400 flex items-center justify-center cursor-pointer transition-colors text-slate-400 hover:text-accent-600">
                                    {uploadingGaleria ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleUploadGaleria}
                                        disabled={uploadingGaleria}
                                    />
                                </label>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">Fotos extra para que el proveedor conozca a tu mascota. Máximo {MAX_FOTO_SIZE_MB} MB por foto.</p>
                    </div>
                    <div className="border-t border-slate-100 pt-4" />


                    {/* Nombre + Tipo */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="m-nombre" className="block text-sm font-medium text-slate-700 mb-1.5">Nombre <span className="text-danger-500">*</span></label>
                            <input
                                id="m-nombre"
                                type="text"
                                value={nombre}
                                onChange={e => setNombre(e.target.value.slice(0, 60))}
                                maxLength={60}
                                required
                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                            />
                        </div>
                        <div>
                            <label htmlFor="m-tipo" className="block text-sm font-medium text-slate-700 mb-1.5">Tipo <span className="text-danger-500">*</span></label>
                            <select
                                id="m-tipo"
                                value={tipo}
                                onChange={e => setTipo(e.target.value as Tipo)}
                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                            >
                                <option value="perro">Perro</option>
                                <option value="gato">Gato</option>
                            </select>
                        </div>
                    </div>

                    {/* Raza + Sexo */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="m-raza" className="block text-sm font-medium text-slate-700 mb-1.5">Raza (opcional)</label>
                            <input
                                id="m-raza"
                                type="text"
                                value={raza}
                                onChange={e => setRaza(e.target.value.slice(0, 60))}
                                maxLength={60}
                                placeholder="Ej: Beagle, Mestizo"
                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                            />
                        </div>
                        <div>
                            <label htmlFor="m-sexo" className="block text-sm font-medium text-slate-700 mb-1.5">Sexo (opcional)</label>
                            <select
                                id="m-sexo"
                                value={sexo}
                                onChange={e => setSexo(e.target.value as Sexo)}
                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                            >
                                <option value="">Sin especificar</option>
                                <option value="macho">Macho</option>
                                <option value="hembra">Hembra</option>
                            </select>
                        </div>
                    </div>

                    {/* Fecha nacimiento + Tamaño */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="m-fecha" className="block text-sm font-medium text-slate-700 mb-1.5">Fecha de nacimiento (opcional)</label>
                            <input
                                id="m-fecha"
                                type="date"
                                value={fechaNacimiento}
                                onChange={e => setFechaNacimiento(e.target.value)}
                                max={new Date().toISOString().slice(0, 10)}
                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                            />
                            <p className="text-xs text-slate-500 mt-1">La edad se calcula automáticamente.</p>
                        </div>
                        <div>
                            <label htmlFor="m-tamano" className="block text-sm font-medium text-slate-700 mb-1.5">Tamaño (opcional)</label>
                            <select
                                id="m-tamano"
                                value={tamano}
                                onChange={e => setTamano(e.target.value as Tamano)}
                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                            >
                                <option value="">Sin especificar</option>
                                <option value="pequeño">Pequeño</option>
                                <option value="mediano">Mediano</option>
                                <option value="grande">Grande</option>
                            </select>
                        </div>
                    </div>

                    {/* Descripción */}
                    <div>
                        <label htmlFor="m-descripcion" className="block text-sm font-medium text-slate-700 mb-1.5">Descripción (opcional)</label>
                        <textarea
                            id="m-descripcion"
                            value={descripcion}
                            onChange={e => setDescripcion(e.target.value.slice(0, 300))}
                            maxLength={300}
                            rows={2}
                            placeholder="Personalidad, gustos, cómo se comporta con extraños."
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors resize-none"
                        />
                        <p className="text-xs text-slate-400 mt-1 text-right">{descripcion.length} / 300</p>
                    </div>

                    {/* Salud: chip + vacunas */}
                    <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-white transition-colors">
                            <input
                                type="checkbox"
                                checked={tieneChip}
                                onChange={e => setTieneChip(e.target.checked)}
                                className="accent-[#16A34A]"
                            />
                            <span className="text-sm text-slate-700">Tiene chip</span>
                        </label>
                        <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-white transition-colors">
                            <input
                                type="checkbox"
                                checked={vacunasAlDia}
                                onChange={e => setVacunasAlDia(e.target.checked)}
                                className="accent-[#16A34A]"
                            />
                            <span className="text-sm text-slate-700">Vacunas al día</span>
                        </label>
                    </div>

                    {tieneChip && (
                        <div>
                            <label htmlFor="m-chip" className="block text-sm font-medium text-slate-700 mb-1.5">Número de chip (opcional)</label>
                            <input
                                id="m-chip"
                                type="text"
                                value={chipId}
                                onChange={e => setChipId(e.target.value.slice(0, 30))}
                                maxLength={30}
                                placeholder="Ej: 981020001234567"
                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors font-mono"
                            />
                        </div>
                    )}

                    {/* Condiciones médicas */}
                    <div>
                        <label htmlFor="m-enfermedades" className="block text-sm font-medium text-slate-700 mb-1.5">Condiciones médicas (opcional)</label>
                        <textarea
                            id="m-enfermedades"
                            value={enfermedades}
                            onChange={e => setEnfermedades(e.target.value.slice(0, 300))}
                            maxLength={300}
                            rows={2}
                            placeholder="Alergias, medicación, condiciones crónicas."
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors resize-none"
                        />
                        <p className="text-xs text-slate-400 mt-1 text-right">{enfermedades.length} / 300</p>
                    </div>

                    {/* Trato especial */}
                    <div>
                        <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-white transition-colors">
                            <input
                                type="checkbox"
                                checked={tratoEspecial}
                                onChange={e => setTratoEspecial(e.target.checked)}
                                className="accent-[#16A34A]"
                            />
                            <span className="text-sm text-slate-700">Requiere trato especial</span>
                        </label>
                        {tratoEspecial && (
                            <textarea
                                value={tratoEspecialDesc}
                                onChange={e => setTratoEspecialDesc(e.target.value.slice(0, 300))}
                                maxLength={300}
                                rows={2}
                                placeholder="¿En qué consiste el trato especial? (ansiedad, miedo a ruidos, etc.)"
                                className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors resize-none"
                            />
                        )}
                    </div>

                    {errorMsg && (
                        <div className="p-3 bg-danger-50 border border-danger-100 rounded-lg text-sm text-danger-700">
                            {errorMsg}
                        </div>
                    )}
                </form>

                <div className="flex justify-end gap-2 p-5 border-t border-slate-200 bg-slate-50">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-white transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-accent-600 hover:bg-accent-700 rounded-xl transition-colors disabled:opacity-50"
                    >
                        {submitting && <Loader2 size={14} className="animate-spin" />}
                        {isNew ? 'Crear ficha' : 'Guardar cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Export con RoleGuard + ClientLayout (mismo patrón que pages/usuario.tsx)
// ────────────────────────────────────────────────────────────────────────────

export default function MisMascotasPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUserId(session.user.id);
            } else {
                router.push('/login');
            }
        });
    }, [router]);

    return (
        <RoleGuard requiredRole="usuario">
            <ClientLayout userId={userId} title="Mis mascotas — Pawnecta">
                <MascotasPageContent />
            </ClientLayout>
        </RoleGuard>
    );
}
