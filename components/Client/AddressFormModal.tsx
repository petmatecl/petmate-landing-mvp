import { useState, useEffect } from "react";
import { X, Save, MapPin } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import AddressAutocomplete from "../AddressAutocomplete";
import { Address } from "./AddressCard";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    initialData?: Address | null;
    userId: string;
};

export default function AddressFormModal({ isOpen, onClose, onSaved, initialData, userId }: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [lat, setLat] = useState<number | null>(null);
    const [lon, setLon] = useState<number | null>(null);

    const [nombre, setNombre] = useState("");
    const [direccionCompleta, setDireccionCompleta] = useState("");
    const [calle, setCalle] = useState("");
    const [numero, setNumero] = useState("");
    const [depto, setDepto] = useState(""); // New State
    const [comuna, setComuna] = useState("");
    const [region, setRegion] = useState("");
    const [notas, setNotas] = useState("");
    const [esPrincipal, setEsPrincipal] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setNombre(initialData.nombre);
                setDireccionCompleta(initialData.direccion_completa);
                setCalle(initialData.calle || "");
                setCalle(initialData.calle || "");
                setNumero(initialData.numero || "");
                setDepto(initialData.depto || "");
                setComuna(initialData.comuna || "");
                setRegion(initialData.region || "");
                setNotas(initialData.notas || "");
                setEsPrincipal(initialData.es_principal || false);
                setLat(initialData.latitud || null);
                setLon(initialData.longitud || null);
            } else {
                // Reset form for "Add" mode
                setNombre("Casa");
                setDireccionCompleta("");
                setCalle("");
                setCalle("");
                setNumero("");
                setDepto("");
                setComuna("");
                setRegion("");
                setNotas("");
                setEsPrincipal(false);
                setLat(null);
                setLon(null);
            }
            setError(null);
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!direccionCompleta) throw new Error("Debes buscar y seleccionar una dirección.");
            if (!nombre) throw new Error("Dale un nombre a esta dirección (ej: Casa).");

            const payload = {
                user_id: userId,
                nombre,
                direccion_completa: direccionCompleta,
                calle,

                numero,
                depto,
                comuna,
                region,
                notas,
                es_principal: esPrincipal,
                latitud: lat,
                longitud: lon,
            };

            if (esPrincipal) {
                // Si esta es principal, quitar flag principal a otras
                await supabase
                    .from("direcciones")
                    .update({ es_principal: false })
                    .eq("user_id", userId);
            }

            if (initialData) {
                // Update
                const { error: updatedError } = await supabase
                    .from("direcciones")
                    .update(payload)
                    .eq("id", initialData.id);
                if (updatedError) throw updatedError;
            } else {
                // Insert
                // Si es la primera, hacerla principal por defecto si se quiere
                // Si no hay direcciones, podría forzar es_principal = true a nivel de lógica, pero dejémoslo simple
                const { error: insertError } = await supabase
                    .from("direcciones")
                    .insert(payload);
                if (insertError) throw insertError;
            }

            onSaved();
            onClose();
        } catch (err: any) {
            console.error("Error saving address:", err);
            setError(err.message || "Error guardando la dirección.");
        } finally {
            setLoading(false);
        }
    }

    const handleAddressSelect = (result: any) => {
        // result comes from AddressAutocomplete
        // Intentar parsear los datos de nominatim
        const address = result.address;
        setDireccionCompleta(result.display_name);
        setCalle(address.road || address.pedestrian || address.street || "");
        setNumero(address.house_number || "");
        setComuna(address.city || address.town || address.village || address.municipality || "");
        setRegion(address.state || "");

        // Save coordinates
        if (result.lat && result.lon) {
            setLat(parseFloat(result.lat));
            setLon(parseFloat(result.lon));
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <MapPin size={20} />
                        </span>
                        {initialData ? "Editar Dirección" : "Nueva Dirección"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-lg flex items-start gap-2">
                            <span className="mt-0.5">⚠️</span>
                            {error}
                        </div>
                    )}

                    {/* Nombre */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                            Nombre de la ubicación
                        </label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej: Casa, Depto Playa, Casa de mis papás"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-400 font-medium"
                            required
                        />
                    </div>

                    {/* Buscador de Dirección */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                            Dirección
                        </label>
                        <AddressAutocomplete
                            onSelect={handleAddressSelect}
                            initialValue={direccionCompleta}
                            placeholder="Buscar calle y número..."
                            className="w-full"
                        />
                        {direccionCompleta && (
                            <p className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                                <span className="font-semibold">Detectado:</span> {calle} {numero ? `#${numero}` : ''}, {comuna}
                            </p>
                        )}
                    </div>

                    {/* Detalles adicionales */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                Número / Depto
                            </label>
                            <input
                                type="text"
                                value={numero}
                                onChange={(e) => setNumero(e.target.value)}
                                placeholder="Ej: 204"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                Depto / Casa
                            </label>
                            <input
                                type="text"
                                value={depto}
                                onChange={(e) => setDepto(e.target.value)}
                                placeholder="Ej: 404, Block B"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                Comuna
                            </label>
                            <input
                                type="text"
                                value={comuna}
                                onChange={(e) => setComuna(e.target.value)}
                                placeholder="Ej: Las Condes"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                Región
                            </label>
                            <input
                                type="text"
                                value={region}
                                onChange={(e) => setRegion(e.target.value)}
                                placeholder="Ej: Región Metropolitana"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Notas */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                            Instrucciones / Notas
                        </label>
                        <textarea
                            rows={2}
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            placeholder="Ej: Tocar el timbre conserjería, reja negra..."
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all resize-none"
                        />
                    </div>

                    {/* Es Principal */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <input
                            type="checkbox"
                            id="esPrincipal"
                            checked={esPrincipal}
                            onChange={(e) => setEsPrincipal(e.target.checked)}
                            className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <label htmlFor="esPrincipal" className="text-sm font-medium text-slate-700 cursor-pointer">
                            Establecer como dirección principal
                        </label>
                    </div>

                    {/* Footer Buttons */}
                    <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 font-bold rounded-xl transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            {loading ? (
                                <>Guardando...</>
                            ) : (
                                <>
                                    <Save size={18} /> Guardar Dirección
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
