import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Pet } from "./PetCard";
import DatePickerSingle from "../DatePickerSingle"; // Make sure to import
import { format } from "date-fns";

type PetFormModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    initialData?: Pet | null;
    userId: string;
};

export default function PetFormModal({
    isOpen,
    onClose,
    onSaved,
    initialData,
    userId,
}: PetFormModalProps) {
    const [nombre, setNombre] = useState("");
    const [tipo, setTipo] = useState<"perro" | "gato">("perro");
    const [raza, setRaza] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [sexo, setSexo] = useState<"macho" | "hembra">("macho");

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

    // Cargar datos al abrir (si es edición)
    useEffect(() => {
        if (isOpen && initialData) {
            setNombre(initialData.nombre);
            setTipo(initialData.tipo);
            setRaza(initialData.raza || "");
            setDescripcion(initialData.descripcion || "");
            setSexo(initialData.sexo || "macho");

            // New fields population
            setFechaNacimiento(initialData.fecha_nacimiento ? new Date(initialData.fecha_nacimiento + 'T00:00:00') : undefined);
            setTieneChip(initialData.tiene_chip || false);
            setChipId(initialData.chip_id || "");
            setVacunasAlDia(initialData.vacunas_al_dia || false);
            setEnfermedades(initialData.enfermedades || "");
            setTratoEspecial(initialData.trato_especial || false);
            setTratoEspecialDesc(initialData.trato_especial_desc || "");
            setFotoMascota(initialData.foto_mascota || null);

        } else if (isOpen && !initialData) {
            // Reset form para crear
            setNombre("");
            setTipo("perro");
            setSexo("macho");
            setRaza("");
            setDescripcion("");

            setFechaNacimiento(undefined);
            setTieneChip(false);
            setChipId("");
            setVacunasAlDia(false);
            setEnfermedades("");
            setTratoEspecial(false);
            setTratoEspecialDesc("");
            setFotoMascota(null);
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
        try {
            if (!event.target.files || event.target.files.length === 0) return;
            setUploading(true);
            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `pet-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars') // Using avatars bucket for now
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setFotoMascota(publicUrl);
        } catch (error) {
            console.error('Error uploading pet photo:', error);
            alert('Error subiendo foto.');
        } finally {
            setUploading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        const payload: any = {
            user_id: userId,
            nombre,
            tipo,
            sexo,
            raza: raza || null,
            // edad: edad ? parseInt(edad) : null, // Deprecated in favor of birth date, but keeping if needed/calculating
            descripcion: descripcion || null,

            // New fields
            fecha_nacimiento: fechaNacimiento ? format(fechaNacimiento, 'yyyy-MM-dd') : null,
            tiene_chip: tieneChip,
            chip_id: tieneChip ? chipId : null,
            vacunas_al_dia: vacunasAlDia,
            enfermedades: enfermedades || null,
            trato_especial: tratoEspecial,
            trato_especial_desc: tratoEspecial ? tratoEspecialDesc : null,
            foto_mascota: fotoMascota
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
            onClose();
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
            onClose();
        } catch (error) {
            console.error("Error deleting pet:", error);
            alert("Error al eliminar.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-900">
                        {initialData ? "Editar mascota" : "Agregar nueva mascota"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">

                    {/* Foto de Perfil */}
                    <div className="flex justify-center">
                        <div className="relative w-28 h-28">
                            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-slate-100 shadow-sm bg-slate-50 relative">
                                {fotoMascota ? (
                                    <img
                                        src={fotoMascota}
                                        alt="Foto mascota"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-300 text-4xl">
                                        {tipo === 'perro' ? '🐶' : '🐱'}
                                    </div>
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 p-2 bg-slate-900 rounded-full shadow-lg cursor-pointer hover:bg-slate-700 text-white transition-all z-10 hover:scale-105 active:scale-95">
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Tipo */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">¿Es Perro o Gato?</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTipo("perro")}
                                    className={`flex items-center justify-center gap-2 h-11 rounded-xl border transition-all ${tipo === "perro" ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                                >
                                    🐶 Perro
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTipo("gato")}
                                    className={`flex items-center justify-center gap-2 h-11 rounded-xl border transition-all ${tipo === "gato" ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                                >
                                    🐱 Gato
                                </button>
                            </div>
                        </div>

                        {/* Sexo */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Sexo</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSexo("macho")}
                                    className={`flex items-center justify-center gap-2 h-11 rounded-xl border transition-all ${sexo === "macho" ? "border-blue-500 bg-blue-50 text-blue-700 font-bold" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                                >
                                    ♂ Macho
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSexo("hembra")}
                                    className={`flex items-center justify-center gap-2 h-11 rounded-xl border transition-all ${sexo === "hembra" ? "border-pink-500 bg-pink-50 text-pink-700 font-bold" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                                >
                                    ♀ Hembra
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Nombre */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nombre</label>
                        <input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Firulais" className="w-full h-11 px-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>

                    {/* Raza y F. Nacimiento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Raza (Opcional)</label>
                            <input value={raza} onChange={(e) => setRaza(e.target.value)} placeholder="Ej. Golden Retriever" className="w-full h-11 px-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
                        </div>
                        <div className="flex flex-col">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Fecha de Nacimiento</label>
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
                    <div className="bg-slate-50 p-4 rounded-xl space-y-4 border border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            🏥 Salud e Identificación
                        </h3>

                        {/* Vacunas */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-700">¿Vacunas al día?</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={vacunasAlDia} onChange={(e) => setVacunasAlDia(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>

                        {/* Chip */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-700">¿Tiene Chip?</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={tieneChip} onChange={(e) => setTieneChip(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>
                            {tieneChip && (
                                <input
                                    value={chipId}
                                    onChange={(e) => setChipId(e.target.value)}
                                    placeholder="Ingrese ID del Chip"
                                    className="w-full h-11 px-3 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none animate-in fade-in slide-in-from-top-1"
                                />
                            )}
                        </div>

                        {/* Enfermedades */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Enfermedades / Condiciones</label>
                            <textarea
                                value={enfermedades}
                                onChange={(e) => setEnfermedades(e.target.value)}
                                placeholder="Alergias, condiciones crónicas, etc."
                                rows={2}
                                className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm"
                            />
                        </div>
                    </div>

                    {/* Trato Especial */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700">¿Necesita trato especial?</span>
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
                                rows={2}
                                className="w-full p-3 rounded-xl border border-amber-200 bg-amber-50 focus:ring-2 focus:ring-amber-500 outline-none resize-none text-sm animate-in fade-in"
                            />
                        )}
                    </div>

                    {/* Descripcion General */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Descripción General</label>
                        <textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Cuéntanos sobre su personalidad, gustos, etc."
                            rows={3}
                            className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100 sticky bottom-0 bg-white/95 backdrop-blur py-4 -mb-6 -mx-6 px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        {initialData && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={loading}
                                className="px-4 py-3 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 h-12 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <span className="animate-spin">⏳</span> : "Guardar Mascota"}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
