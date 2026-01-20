
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { Pet } from "./PetCard";
import { Camera, Loader2, Upload, X, Check, AlertCircle, Dog, Cat, Save, Trash2, ChevronRight, Mars, Venus, Info } from 'lucide-react';
import DatePickerSingle from "../DatePickerSingle";
import { format } from "date-fns";
import { ConfirmationModal } from "../Shared/ConfirmationModal";

type PetFormProps = {
    initialData?: Pet | null;
    userId: string;
    onSaved: () => void;
    onCancel: () => void;
};

export default function PetForm({
    initialData,
    userId,
    onSaved,
    onCancel,
}: PetFormProps) {
    const router = useRouter();
    const [nombre, setNombre] = useState("");
    const [tipo, setTipo] = useState<"perro" | "gato">("perro");
    const [raza, setRaza] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [sexo, setSexo] = useState<"macho" | "hembra">("macho");
    const [tamano, setTamano] = useState<"pequeño" | "mediano" | "grande" | "gigante">("pequeño");

    // New Fields
    const [fechaNacimiento, setFechaNacimiento] = useState<Date | undefined>(undefined);
    const [tieneChip, setTieneChip] = useState(false);
    const [chipId, setChipId] = useState("");
    const [vacunasAlDia, setVacunasAlDia] = useState(false);
    const [enfermedades, setEnfermedades] = useState("");
    const [tratoEspecial, setTratoEspecial] = useState(false);
    const [tratoEspecialDesc, setTratoEspecialDesc] = useState("");
    const [fotoMascota, setFotoMascota] = useState<string | null>(null);

    const [uploading, setLoading] = useState(false);
    const [loading, setUploading] = useState(false);

    const [fotosGaleria, setFotosGaleria] = useState<string[]>([]);

    // Navigation block state
    const [isDirty, setIsDirty] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingUrl, setPendingUrl] = useState<string | null>(null);
    const bypassDirty = useRef(false);

    // Cargar datos al abrir (si es edición)
    useEffect(() => {
        if (initialData) {
            setNombre(initialData.nombre);
            setTipo(initialData.tipo);
            setRaza(initialData.raza || "");
            setDescripcion(initialData.descripcion || "");
            setSexo(initialData.sexo || "macho");
            setTamano(initialData.tamano || "pequeño");

            // New fields population
            setFechaNacimiento(initialData.fecha_nacimiento ? new Date(initialData.fecha_nacimiento + 'T00:00:00') : undefined);
            setTieneChip(initialData.tiene_chip || false);
            setChipId(initialData.chip_id || "");
            setVacunasAlDia(initialData.vacunas_al_dia || false);
            setEnfermedades(initialData.enfermedades || "");
            setTratoEspecial(initialData.trato_especial || false);
            setTratoEspecialDesc(initialData.trato_especial_desc || "");
            setFotoMascota(initialData.foto_mascota || null);
            setFotosGaleria(initialData.fotos_galeria || []);
        }
    }, [initialData]);

    // Check Is Dirty
    useEffect(() => {
        const getCurrentState = () => ({
            nombre, tipo, raza, descripcion, sexo, tamano,
            fechaNacimiento: fechaNacimiento?.toISOString(),
            tieneChip, chipId, vacunasAlDia, enfermedades,
            tratoEspecial, tratoEspecialDesc, fotoMascota,
            fotosGaleria: [...fotosGaleria].sort()
        });

        const currentState = getCurrentState();

        if (initialData) {
            const initialState = {
                nombre: initialData.nombre,
                tipo: initialData.tipo,
                raza: initialData.raza || "",
                descripcion: initialData.descripcion || "",
                sexo: initialData.sexo || "macho",
                tamano: initialData.tamano || "pequeño",
                fechaNacimiento: initialData.fecha_nacimiento ? new Date(initialData.fecha_nacimiento + 'T00:00:00').toISOString() : undefined,
                tieneChip: initialData.tiene_chip || false,
                chipId: initialData.chip_id || "",
                vacunasAlDia: initialData.vacunas_al_dia || false,
                enfermedades: initialData.enfermedades || "",
                tratoEspecial: initialData.trato_especial || false,
                tratoEspecialDesc: initialData.trato_especial_desc || "",
                fotoMascota: initialData.foto_mascota || null,
                fotosGaleria: [...(initialData.fotos_galeria || [])].sort()
            };
            // Simple stringify comparison
            const isModified = JSON.stringify(currentState) !== JSON.stringify(initialState);
            setIsDirty(isModified);
        } else {
            // If new, dirty if key fields are filled
            const isModified = nombre.length > 0 || raza.length > 0 || descripcion.length > 0 || fotoMascota !== null;
            setIsDirty(isModified);
        }
    }, [nombre, tipo, raza, descripcion, sexo, tamano, fechaNacimiento, tieneChip, chipId, vacunasAlDia, enfermedades, tratoEspecial, tratoEspecialDesc, fotoMascota, fotosGaleria, initialData]);

    // Intercept Navigation
    useEffect(() => {
        const handleBrowseAway = (url: string) => {
            // Allow if bypassing (saved/deleted)
            if (bypassDirty.current) return;
            // Allow if not dirty
            if (!isDirty) return;
            // Allow if staying on same page (e.g. hash change or query param update that doesn't matter)
            // Actually, any route change usually implies leaving.
            // Check matching paths
            const currentPath = router.asPath.split('?')[0];
            const targetPath = url.split('?')[0];
            if (currentPath === targetPath) return;

            // Stop navigation
            router.events.emit('routeChangeError');
            setPendingUrl(url);
            setShowConfirmModal(true);

            // This throws an error to the router, cancelling the route change.
            // It will cause a console error "Route Cancelled" which is expected in Next.js Pages router interception.
            throw 'Route Cancelled by Unsaved Guard';
        };

        const handleWindowClose = (e: BeforeUnloadEvent) => {
            if (bypassDirty.current) return;
            if (!isDirty) return;
            e.preventDefault();
            e.returnValue = ''; // Standard for Chrome/Firefox
        };

        router.events.on('routeChangeStart', handleBrowseAway);
        window.addEventListener('beforeunload', handleWindowClose);

        return () => {
            router.events.off('routeChangeStart', handleBrowseAway);
            window.removeEventListener('beforeunload', handleWindowClose);
        };
    }, [isDirty, router]);

    const confirmExit = () => {
        bypassDirty.current = true;
        setIsDirty(false); // Reset dirty so logic allows pass
        setShowConfirmModal(false);
        if (pendingUrl) {
            router.push(pendingUrl);
        }
    };

    async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
        try {
            if (!event.target.files || event.target.files.length === 0) return;
            setUploading(true);
            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const timestamp = Date.now();
            const fileName = `pet-${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setFotoMascota(publicUrl);
        } catch (error: any) {
            console.error('Error uploading pet photo:', error);
            alert(`Error subiendo foto: ${error.message || error.error_description || error}`);
        } finally {
            setUploading(false);
        }
    }

    async function handleGalleryUpload(event: React.ChangeEvent<HTMLInputElement>) {
        if (!event.target.files || event.target.files.length === 0) return;

        const files = Array.from(event.target.files);
        const currentCount = fotosGaleria.length;

        if (currentCount + files.length > 3) {
            alert(`Máximo 3 fotos de galería. Solo puedes agregar ${3 - currentCount} más.`);
            return;
        }

        setUploading(true);

        try {
            const uploadPromises = files.map(async (file) => {
                const fileExt = file.name.split('.').pop();
                const timestamp = Date.now();
                const fileName = `pet-gallery-${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);

                return publicUrl;
            });

            const newUrls = await Promise.all(uploadPromises);
            setFotosGaleria(prev => [...prev, ...newUrls]);

        } catch (error: any) {
            console.error('Error uploading gallery photo:', error);
            alert(`Error subiendo fotos: ${error.message || error.error_description || error}`);
        } finally {
            setUploading(false);
            event.target.value = "";
        }
    }

    function removeGalleryPhoto(index: number) {
        setFotosGaleria(prev => prev.filter((_, i) => i !== index));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (tieneChip && !chipId.trim()) {
            alert("Si la mascota tiene chip, debes ingresar el ID.");
            return;
        }

        setLoading(true);

        const payload: any = {
            user_id: userId,
            nombre,
            tipo,
            sexo,
            tamano,
            raza: raza || null,
            descripcion: descripcion || null,
            fecha_nacimiento: fechaNacimiento ? format(fechaNacimiento, 'yyyy-MM-dd') : null,
            tiene_chip: tieneChip,
            chip_id: tieneChip ? chipId : null,
            vacunas_al_dia: vacunasAlDia,
            enfermedades: enfermedades || null,
            trato_especial: tratoEspecial,
            trato_especial_desc: tratoEspecial ? tratoEspecialDesc : null,
            foto_mascota: fotoMascota,
            fotos_galeria: fotosGaleria
        };

        try {
            if (initialData?.id) {
                const { error } = await supabase
                    .from("mascotas")
                    .update(payload)
                    .eq("id", initialData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("mascotas").insert([payload]);
                if (error) throw error;
            }
            bypassDirty.current = true;
            onSaved();
        } catch (error) {
            console.error("Error saving pet:", error);
            alert((error as any)?.message || "Ocurrió un error al guardar. Inténtalo de nuevo.");
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (!initialData?.id || !confirm("¿Seguro que quieres eliminar esta mascota?")) return;

        setLoading(true);
        try {
            const { error } = await supabase.from("mascotas").delete().eq("id", initialData.id);
            if (error) throw error;
            bypassDirty.current = true;
            onSaved();
        } catch (error) {
            console.error("Error deleting pet:", error);
            alert("Error al eliminar.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">

            {/* 1. SECCIÓN DE FOTOS */}
            <div className="bg-slate-50/50 p-8 border-b border-slate-100 flex flex-col md:flex-row items-center justify-center gap-8">
                <div className="relative group">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md bg-white relative ring-1 ring-slate-200">
                        {fotoMascota ? (
                            <img src={fotoMascota} alt="Foto mascota" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-300 bg-slate-50">
                                {tipo === 'perro' ? <Dog size={48} strokeWidth={1.5} /> : <Cat size={48} strokeWidth={1.5} />}
                            </div>
                        )}
                    </div>
                    <label className="absolute bottom-0 right-0 p-2.5 bg-emerald-600 rounded-full shadow-lg cursor-pointer hover:bg-emerald-700 text-white transition-all z-10 hover:scale-105 active:scale-95 ring-2 ring-white">
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                        {uploading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Camera size={16} />
                        )}
                    </label>
                </div>

                <div className="flex flex-col items-center md:items-start gap-4">
                    <div className="flex items-center justify-center gap-3">
                        {fotosGaleria.map((url, idx) => (
                            <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                <img src={url} alt={`Galeria ${idx} `} className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeGalleryPhoto(idx)}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={16} className="text-white" />
                                </button>
                            </div>
                        ))}
                        {fotosGaleria.length < 3 && (
                            <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-emerald-400 hover:text-emerald-500 text-slate-300 transition-all bg-white">
                                <Upload size={20} />
                                <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} disabled={uploading} />
                            </label>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 font-medium">Foto de perfil y hasta 3 fotos adicionales</p>
                </div>
            </div>

            <div className="p-8 space-y-10">

                {/* 2. DATOS BÁSICOS */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-slate-900">Datos Básicos</h3>
                        <div className="h-px bg-slate-100 flex-1"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Nombre */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre</label>
                            <input
                                required
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="Ej. Firulais"
                                className="w-full h-11 px-4 rounded-xl border border-slate-300 bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 text-slate-900 font-medium"
                            />
                        </div>

                        {/* Raza */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Raza <span className="text-slate-300 font-normal normal-case">(Opcional)</span></label>
                            <input
                                value={raza}
                                onChange={(e) => setRaza(e.target.value)}
                                placeholder="Ej. Golden Retriever"
                                className="w-full h-11 px-4 rounded-xl border border-slate-300 bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 text-slate-900 font-medium"
                            />
                        </div>

                        {/* Fecha Nacimiento */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Fecha de Nacimiento</label>
                            <div className="relative z-20">
                                <DatePickerSingle
                                    value={fechaNacimiento}
                                    onChange={setFechaNacimiento}
                                    maxDate={new Date()}
                                />
                            </div>
                        </div>

                        {/* Tipo (Segmented Control) */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tipo de Mascota</label>
                            <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => setTipo("perro")}
                                    className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-bold transition-all ${tipo === "perro" ? "bg-white text-emerald-700 shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"}`}
                                >
                                    <Dog size={16} /> Perro
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTipo("gato")}
                                    className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-bold transition-all ${tipo === "gato" ? "bg-white text-emerald-700 shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"}`}
                                >
                                    <Cat size={16} /> Gato
                                </button>
                            </div>
                        </div>

                        {/* Sexo (Segmented Control) */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sexo</label>
                            <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => setSexo("macho")}
                                    className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-bold transition-all ${sexo === "macho" ? "bg-white text-emerald-700 shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"}`}
                                >
                                    <Mars size={16} /> Macho
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSexo("hembra")}
                                    className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-bold transition-all ${sexo === "hembra" ? "bg-white text-emerald-700 shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"}`}
                                >
                                    <Venus size={16} /> Hembra
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tamaño (Solo Perros) - Full Width Grid */}
                    {tipo === 'perro' && (
                        <div className="space-y-3 pt-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tamaño</label>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {[
                                    { id: "pequeño", label: "Pequeño", range: "0 - 10 kg", scale: 0.75 },
                                    { id: "mediano", label: "Mediano", range: "11 - 25 kg", scale: 0.9 },
                                    { id: "grande", label: "Grande", range: "26 - 45 kg", scale: 1.1 },
                                    { id: "gigante", label: "Gigante", range: "+45 kg", scale: 1.25 }
                                ].map((sizeOpt) => (
                                    <button
                                        key={sizeOpt.id}
                                        type="button"
                                        onClick={() => setTamano(sizeOpt.id as any)}
                                        className={`relative overflow-hidden flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 ${tamano === sizeOpt.id
                                            ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-1 ring-emerald-500"
                                            : "border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:bg-slate-50"
                                            }`}
                                    >
                                        <div className="h-8 flex items-center justify-center mb-1">
                                            <Dog
                                                strokeWidth={2}
                                                className={tamano === sizeOpt.id ? "text-emerald-600" : "text-slate-400"}
                                                style={{ width: `${20 * sizeOpt.scale}px`, height: `${20 * sizeOpt.scale}px` }}
                                            />
                                        </div>
                                        <span className="capitalize text-sm font-bold">{sizeOpt.label}</span>
                                        <span className="text-[10px] opacity-70 mt-0.5">{sizeOpt.range}</span>

                                        {tamano === sizeOpt.id && (
                                            <div className="absolute top-2 right-2 text-emerald-500">
                                                <Check size={14} strokeWidth={3} />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                {/* 3. SALUD E IDENTIFICACIÓN */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-slate-900">Salud e Identificación</h3>
                        <div className="h-px bg-slate-100 flex-1"></div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-6">

                        {/* Toggles Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Vacunas */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="block text-sm font-bold text-slate-900">¿Vacunas al día?</span>
                                    <p className="text-xs text-slate-500 mt-0.5">Fundamental para la seguridad.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={vacunasAlDia} onChange={(e) => setVacunasAlDia(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>

                            {/* Chip Toggle */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="block text-sm font-bold text-slate-900">¿Tiene Chip?</span>
                                    <p className="text-xs text-slate-500 mt-0.5">Registro nacional de mascotas.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={tieneChip} onChange={(e) => setTieneChip(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>
                        </div>

                        {/* Chip Input (Conditional) */}
                        {tieneChip && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">ID del Chip</label>
                                <input
                                    required={tieneChip}
                                    value={chipId}
                                    maxLength={15}
                                    onChange={(e) => setChipId(e.target.value.slice(0, 15))}
                                    placeholder="Ingrese los 15 dígitos"
                                    className="w-full h-11 px-4 rounded-xl border border-slate-300 bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 font-mono text-slate-900"
                                />
                            </div>
                        )}

                        {/* Enfermedades */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Enfermedades o Alergias</label>
                            <textarea
                                value={enfermedades}
                                onChange={(e) => setEnfermedades(e.target.value)}
                                placeholder="Ej. Alérgico al pollo, necesita tomar medicamento X..."
                                rows={2}
                                className="w-full p-4 rounded-xl border border-slate-300 bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none resize-none text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                </section>

                {/* 4. DESCRIPCION */}
                <section className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sobre tu mascota</label>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{descripcion.length} caracteres</span>
                    </div>
                    <textarea
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        placeholder="Cuéntanos sobre su personalidad, gustos, rutinas..."
                        rows={4}
                        className="w-full p-4 rounded-xl border border-slate-300 bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none resize-none text-sm text-slate-900 placeholder:text-slate-400"
                    />
                </section>

                {/* 5. CUIDADOS ESPECIALES */}
                <section className="space-y-4">
                    <div className="bg-amber-50/50 rounded-2xl p-6 border border-amber-100/60">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                    <AlertCircle size={20} />
                                </div>
                                <div>
                                    <span className="block text-sm font-bold text-slate-900">¿Requiere trato o cuidados especiales?</span>
                                    <p className="text-xs text-slate-500 mt-0.5">Miedo a otros perros, ansiedad, reactividad, etc.</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={tratoEspecial} onChange={(e) => setTratoEspecial(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                        </div>

                        {tratoEspecial && (
                            <textarea
                                value={tratoEspecialDesc}
                                onChange={(e) => setTratoEspecialDesc(e.target.value)}
                                placeholder="Describe detalladamente los cuidados que necesita..."
                                rows={3}
                                className="w-full p-4 rounded-xl border border-amber-200 bg-white focus:ring-4 focus:ring-amber-100 focus:border-amber-400 outline-none resize-none text-sm animate-in fade-in"
                            />
                        )}
                    </div>
                </section>
            </div>

            {/* ACTION BAR */}
            <div className="bg-slate-50 border-t border-slate-200 p-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 transition-colors text-sm"
                >
                    Cancelar
                </button>

                <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
                    {initialData?.id && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={loading}
                            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors text-sm flex items-center justify-center gap-2"
                        >
                            <Trash2 size={16} /> Eliminar
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full sm:w-auto px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/10 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm active:scale-95"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {initialData?.id ? 'Guardar Cambios' : 'Registrar Mascota'}
                    </button>
                </div>
            </div>
            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={confirmExit}
                title="¿Salir sin guardar?"
                message="Tienes cambios sin guardar. Si sales ahora, se perderán los cambios."
                confirmText="Salir sin guardar"
                cancelText="Continuar editando"
                isDestructive={true}
            />
        </form>
    );
}
