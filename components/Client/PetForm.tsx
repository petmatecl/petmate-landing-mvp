
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Pet } from "./PetCard";
import { Camera, Loader2, Upload, X, Check, AlertCircle, Dog } from 'lucide-react';
import DatePickerSingle from "../DatePickerSingle";
import { format } from "date-fns";
import { useRouter } from "next/router";

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

    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);

    const [fotosGaleria, setFotosGaleria] = useState<string[]>([]);

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

    async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
        try {
            if (!event.target.files || event.target.files.length === 0) return;
            setUploading(true);
            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const timestamp = Date.now();
            // Sanitize filename: remove spaces and special chars
            const fileName = `pet-${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars') // Using avatars bucket for now
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

        // Validación Chip
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
                // Update
                const { error } = await supabase
                    .from("mascotas")
                    .update(payload)
                    .eq("id", initialData.id);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase.from("mascotas").insert([payload]);
                if (error) throw error;
            }
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
            onSaved();
        } catch (error) {
            console.error("Error deleting pet:", error);
            alert("Error al eliminar.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="relative space-y-6 max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">

            {/* Close Button */}
            <button
                type="button"
                onClick={onCancel}
                className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Cerrar"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            {/* Header / Foto */}
            <div className="flex flex-col items-center gap-4 mb-6">
                <div className="relative w-32 h-32">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-sm bg-slate-50 relative">
                        {fotoMascota ? (
                            <img
                                src={fotoMascota}
                                alt="Foto mascota"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-300 text-5xl">
                                {tipo === 'perro' ? '🐶' : '🐱'}
                            </div>
                        )}
                    </div>
                    <label className="absolute bottom-0 right-0 p-2.5 bg-emerald-600 rounded-full shadow-lg cursor-pointer hover:bg-emerald-700 text-white transition-all z-10 hover:scale-105 active:scale-95">
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoUpload}
                            disabled={uploading}
                        />
                        {uploading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        )}
                    </label>
                </div>
                <div className="text-center">
                    <p className="text-sm text-slate-500">Haz clic en el ícono para subir una foto de perfil</p>
                </div>

                {/* Galería de fotos extra */}
                <div className="w-full max-w-md mt-2">
                    <label className="block text-center text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Galería Adicional (Máx 3)</label>
                    <div className="flex justify-center gap-3">
                        {fotosGaleria.map((url, idx) => (
                            <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                <img src={url} alt={`Galeria ${idx} `} className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeGalleryPhoto(idx)}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <span className="text-white text-xs font-bold">Eliminar</span>
                                </button>
                            </div>
                        ))}
                        {fotosGaleria.length < 3 && (
                            <label className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-emerald-500 hover:text-emerald-500 text-slate-400 transition-colors">
                                <span className="text-2xl">+</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleGalleryUpload}
                                    disabled={uploading}
                                />
                            </label>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tipo */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">¿Es Perro o Gato?</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setTipo("perro")}
                            className={`flex items - center justify - center gap - 2 h - 12 rounded - xl border transition - all ${tipo === "perro" ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold ring-1 ring-emerald-500" : "border-slate-200 text-slate-600 hover:bg-slate-50"} `}
                        >
                            🐶 Perro
                        </button>
                        <button
                            type="button"
                            onClick={() => setTipo("gato")}
                            className={`flex items - center justify - center gap - 2 h - 12 rounded - xl border transition - all ${tipo === "gato" ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold ring-1 ring-emerald-500" : "border-slate-200 text-slate-600 hover:bg-slate-50"} `}
                        >
                            🐱 Gato
                        </button>
                    </div>
                </div>

                {/* Sexo */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Sexo</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setSexo("macho")}
                            className={`flex items - center justify - center gap - 2 h - 12 rounded - xl border transition - all ${sexo === "macho" ? "border-blue-500 bg-blue-50 text-blue-700 font-bold ring-1 ring-blue-500" : "border-slate-200 text-slate-600 hover:bg-slate-50"} `}
                        >
                            ♂ Macho
                        </button>
                        <button
                            type="button"
                            onClick={() => setSexo("hembra")}
                            className={`flex items - center justify - center gap - 2 h - 12 rounded - xl border transition - all ${sexo === "hembra" ? "border-pink-500 bg-pink-50 text-pink-700 font-bold ring-1 ring-pink-500" : "border-slate-200 text-slate-600 hover:bg-slate-50"} `}
                        >
                            ♀ Hembra
                        </button>
                    </div>
                </div>

                {/* Tamaño */}
                {/* Tamaño (Solo para Perros) */}
                {tipo === 'perro' && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Tamaño</label>
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
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${tamano === sizeOpt.id ? "border-slate-800 bg-slate-100 text-slate-900 font-bold ring-1 ring-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                                >
                                    <div className="h-8 flex items-center justify-center mb-1">
                                        <Dog
                                            strokeWidth={2}
                                            style={{
                                                width: `${20 * sizeOpt.scale}px`,
                                                height: `${20 * sizeOpt.scale}px`
                                            }}
                                        />
                                    </div>
                                    <span className="capitalize text-sm font-medium">{sizeOpt.label}</span>
                                    <span className="text-[10px] text-slate-400 font-normal">{sizeOpt.range}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>


            {/* Nombre */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Nombre</label>
                <input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Firulais" className="w-full h-12 px-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
            </div>

            {/* Raza y F. Nacimiento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Raza (Opcional)</label>
                    <input value={raza} onChange={(e) => setRaza(e.target.value)} placeholder="Ej. Golden Retriever" className="w-full h-12 px-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>
                <div className="flex flex-col">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Fecha de Nacimiento</label>
                    <div className="relative">
                        <DatePickerSingle
                            value={fechaNacimiento}
                            onChange={setFechaNacimiento}
                            maxDate={new Date()}
                        />
                    </div>
                </div>
            </div>

            {/* Salud y Chip */}
            <div className="bg-slate-50 p-6 rounded-2xl space-y-6 border border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
                    🏥 Salud e Identificación
                </h3>

                {/* Vacunas */}
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">¿Vacunas al día?</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={vacunasAlDia} onChange={(e) => setVacunasAlDia(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                </div>

                {/* Chip */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">¿Tiene Chip?</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={tieneChip} onChange={(e) => setTieneChip(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>
                    {tieneChip && (
                        <input
                            required={tieneChip}
                            value={chipId}
                            maxLength={15}
                            onChange={(e) => setChipId(e.target.value.slice(0, 15))}
                            placeholder="Ingrese ID del Chip (Obligatorio)"
                            className="w-full h-11 px-3 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none animate-in fade-in slide-in-from-top-1"
                        />
                    )}
                </div>

                {/* Enfermedades */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Enfermedades / Condiciones</label>
                    <textarea
                        value={enfermedades}
                        onChange={(e) => setEnfermedades(e.target.value)}
                        placeholder="Alergias, condiciones crónicas, etc."
                        rows={3}
                        className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm bg-white"
                    />
                </div>
            </div>

            {/* Trato Especial */}
            <div className="space-y-3 p-6 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">¿Necesita trato especial?</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={tratoEspecial} onChange={(e) => setTratoEspecial(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                </div>
                {tratoEspecial && (
                    <textarea
                        value={tratoEspecialDesc}
                        onChange={(e) => setTratoEspecialDesc(e.target.value)}
                        placeholder="Describe el cuidado especial que necesita..."
                        rows={3}
                        className="w-full p-3 rounded-xl border border-amber-200 bg-white focus:ring-2 focus:ring-amber-500 outline-none resize-none text-sm animate-in fade-in"
                    />
                )}
            </div>

            {/* Descripcion General */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Descripción General</label>
                <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Cuéntanos sobre su personalidad, gustos, etc."
                    rows={4}
                    className="w-full p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
            </div>

            <div className="flex gap-4 pt-6 border-t border-slate-100">

                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                    Cancelar
                </button>

                <div className="flex-1 flex gap-3 justify-end">
                    {initialData && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={loading}
                            className="px-4 py-3 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors"
                        >
                            Eliminar
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/10 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? <span className="animate-spin"><Loader2 size={20} /></span> : "Guardar Mascota"}
                    </button>
                </div>
            </div>

        </form >
    );
}
