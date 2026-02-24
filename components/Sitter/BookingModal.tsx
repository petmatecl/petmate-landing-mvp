import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import { createNotification } from "../../lib/notifications";

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    sitterAuthId: string; // Changed from sitterId to be explicit
    sitterName: string;
    onSuccess: () => void;
}

export default function BookingModal({ isOpen, onClose, sitterAuthId, sitterName, onSuccess }: BookingModalProps) {
    const [trips, setTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [checkingDupe, setCheckingDupe] = useState(false); // [LOGIC] State for duplicate validation

    // Quick Create State
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [myPets, setMyPets] = useState<any[]>([]);
    const [creatingTrip, setCreatingTrip] = useState(false);
    const [newTripData, setNewTripData] = useState({
        servicio: 'hospedaje', // Default
        fecha_inicio: '',
        fecha_fin: '',
        mascotas_ids: [] as string[]
    });

    // Helper to format today for min date
    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (isOpen) {
            fetchTrips();
            setIsSuccess(false); // Reset on open
            setSelectedTripId(null);
        }
    }, [isOpen]);

    const fetchTrips = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setLoading(false);
            return;
        }

        // 1. Fetch Trips
        const { data: tripsData } = await supabase
            .from("viajes")
            .select("id, servicio, fecha_inicio, fecha_fin, perros, gatos, estado, created_at")
            .eq("user_id", session.user.id)
            .in("estado", ["borrador", "publicado", "solicitado_por_cliente"])
            .order("created_at", { ascending: false });

        if (tripsData) {
            setTrips(tripsData);
            // Auto-show create form if no trips found
            if (tripsData.length === 0) {
                setShowCreateForm(true);
            }
        }

        // 2. Fetch Pets (for Quick Create)
        const { data: petsData } = await supabase
            .from("mascotas")
            .select("id, nombre, tipo")
            .eq("user_id", session.user.id);

        if (petsData) {
            setMyPets(petsData);
        }

        setLoading(false);
    };

    const handleCreateTrip = async () => {
        if (!newTripData.fecha_inicio || !newTripData.fecha_fin || newTripData.mascotas_ids.length === 0) {
            alert("Por favor completa las fechas y selecciona al menos una mascota.");
            return;
        }

        setCreatingTrip(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Calculate counts
        const selectedPets = myPets.filter(p => newTripData.mascotas_ids.includes(p.id));
        const perros = selectedPets.filter(p => p.tipo === 'perro').length;
        const gatos = selectedPets.filter(p => p.tipo === 'gato').length;

        try {
            const { data, error } = await supabase
                .from('viajes')
                .insert({
                    user_id: session.user.id,
                    servicio: newTripData.servicio,
                    fecha_inicio: newTripData.fecha_inicio,
                    fecha_fin: newTripData.fecha_fin,
                    mascotas_ids: newTripData.mascotas_ids,
                    perros,
                    gatos,
                    estado: 'borrador', // Start as draft, will be updated to 'solicitado_por_cliente' or stay public
                    comuna: 'Santiago' // Default or fetch from user profile if needed
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                // Add to local list and select it
                setTrips([data, ...trips]);
                setSelectedTripId(data.id);
                setShowCreateForm(false); // Switch back to select view
                // Optional: reset form
                setNewTripData({
                    servicio: 'hospedaje',
                    fecha_inicio: '',
                    fecha_fin: '',
                    mascotas_ids: []
                });
            }
        } catch (err: any) {
            console.error("Error creating trip:", err);
            alert("Error al crear el viaje: " + err.message);
        } finally {
            setCreatingTrip(false);
        }
    };

    const togglePetSelection = (petId: string) => {
        setNewTripData(prev => {
            const exists = prev.mascotas_ids.includes(petId);
            return {
                ...prev,
                mascotas_ids: exists
                    ? prev.mascotas_ids.filter(id => id !== petId)
                    : [...prev.mascotas_ids, petId]
            };
        });
    };

    const handleSendRequest = async () => {
        if (!selectedTripId) return;
        setSending(true);

        // 1. [LOGIC] Check for existing duplicate postulation
        // Prevent double booking for the same trip/sitter pair if already pending
        setCheckingDupe(true);
        const { data: existingPostulacion } = await supabase
            .from("postulaciones")
            .select("id")
            .eq("viaje_id", selectedTripId)
            .eq("sitter_id", sitterAuthId)
            .in("estado", ["pendiente", "aceptada"]) // Check if already pending or accepted
            .order("created_at", { ascending: false }) // Get latest
            .limit(1)
            .single();

        setCheckingDupe(false);

        if (existingPostulacion) {
            alert("Ya existe una solicitud pendiente o aceptada para este viaje con este cuidador.");
            setSending(false);
            return;
        }

        // 2. Create Postulacion
        const { error: postError } = await supabase
            .from("postulaciones")
            .insert({
                viaje_id: selectedTripId,
                sitter_id: sitterAuthId,
                origen: 'solicitud_cliente',
                estado: 'pendiente'
            });

        if (postError) {
            console.error("Error creating application:", postError);
            alert(`Error al enviar solicitud: ${postError.message}`);
            setSending(false);
            return;
        }

        // 2. Update Trip State to indicate it has an active request
        // We allow multiple requests? For now, let's just mark it as having activity if needed.
        // Actually, for direct request flow, we might want to update the trip state to 'solicitado_por_cliente' 
        // IF we want to lock it or show it differently. 
        // But with marketplace, a trip can be 'publicado' and have requests.
        // Let's keep trip as 'publicado' (or whatever it was) but maybe just ensure it's not 'borrador'.

        // If it was 'borrador', make it 'publicado' so it's "live" in the system (even if just for this sitter)
        // Or if we strictly follow the new states: 'solicitado_por_cliente'.

        const { error: tripError } = await supabase
            .from("viajes")
            .update({
                estado: "solicitado_por_cliente" // Updating state to reflect active outgoing request
            })
            .eq("id", selectedTripId);

        if (tripError) {
            console.error("Error updating trip status:", tripError);
            // Non-critical, but good to know
        }

        // [REMOVED] Notification (Handled by DB Trigger)
        // await createNotification({...});

        setIsSuccess(true);
        onSuccess();
        setIsSuccess(true);
        onSuccess();
        setSending(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* SUCCESS STATE */}
                {isSuccess ? (
                    <div className="p-8 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">¡Solicitud Enviada!</h3>
                        <p className="text-slate-600 mb-6">
                            Hemos notificado a <span className="font-bold">{sitterName}</span>.
                            Te avisaremos cuando responda a tu solicitud.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-100"
                        >
                            Entendido
                        </button>
                    </div>
                ) : (
                    /* NORMAL STATE */
                    <>
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-900">Solicitar Reserva</h3>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="p-6">
                            {showCreateForm ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2 flex justify-between items-center">
                                        Crear Nuevo Viaje
                                        <button onClick={() => setShowCreateForm(false)} className="text-xs text-emerald-600 hover:text-emerald-700 normal-case font-bold">
                                            ← Volver a mis viajes
                                        </button>
                                    </h4>

                                    {/* Service Selection */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Servicio</label>
                                        <select
                                            className="w-full text-sm rounded-lg border-slate-300 bg-slate-50 p-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                            value={newTripData.servicio}
                                            onChange={(e) => setNewTripData({ ...newTripData, servicio: e.target.value })}
                                        >
                                            <option value="hospedaje">Hospedaje (En casa del Sitter)</option>
                                            <option value="paseo">Paseo</option>
                                            <option value="guarderia">Guardería (Por el día)</option>
                                            <option value="visita">Visita a Domicilio</option>
                                        </select>
                                    </div>

                                    {/* Dates */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Desde</label>
                                            <input
                                                type="date"
                                                min={todayStr}
                                                className="w-full text-sm rounded-lg border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                                value={newTripData.fecha_inicio}
                                                onChange={(e) => setNewTripData({ ...newTripData, fecha_inicio: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Hasta</label>
                                            <input
                                                type="date"
                                                min={newTripData.fecha_inicio || todayStr}
                                                className="w-full text-sm rounded-lg border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                                value={newTripData.fecha_fin}
                                                onChange={(e) => setNewTripData({ ...newTripData, fecha_fin: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Pets */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-2">Mascotas</label>
                                        {myPets.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {myPets.map(pet => (
                                                    <button
                                                        key={pet.id}
                                                        type="button"
                                                        onClick={() => togglePetSelection(pet.id)}
                                                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${newTripData.mascotas_ids.includes(pet.id)
                                                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                                            }`}
                                                    >
                                                        {pet.nombre} ({pet.tipo})
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                                                No tienes mascotas registradas. <Link href="/usuario?tab=mascotas" className="underline font-bold">Ir a perfil</Link>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            disabled={creatingTrip}
                                            onClick={handleCreateTrip}
                                            className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                        >
                                            {creatingTrip ? "Creando..." : "Crear Viaje y Continuar"}
                                        </button>
                                    </div>

                                </div>
                            ) : (
                                <>
                                    <p className="text-slate-600 mb-4 text-sm flex justify-between items-center">
                                        <span>Selecciona un viaje para solicitar:</span>
                                        <button
                                            onClick={() => setShowCreateForm(true)}
                                            className="text-emerald-600 font-bold text-xs hover:underline"
                                        >
                                            + Nuevo Viaje
                                        </button>
                                    </p>

                                    {loading ? (
                                        <div className="py-8 text-center text-emerald-600 text-sm font-medium">Cargando tus viajes...</div>
                                    ) : trips.length === 0 ? (
                                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <div className="mb-3 text-slate-300">
                                                <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                </svg>
                                            </div>
                                            <p className="text-slate-500 mb-4 text-sm">No tienes viajes activos.</p>
                                            <button
                                                onClick={() => setShowCreateForm(true)}
                                                className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                                            >
                                                Crear mi primer viaje
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                            {trips.map(trip => (
                                                <div
                                                    key={trip.id}
                                                    onClick={() => setSelectedTripId(trip.id)}
                                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTripId === trip.id
                                                        ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                                                        : "border-slate-200 hover:border-emerald-200 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[10px] font-bold uppercase text-emerald-700 tracking-wide bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                                                                    {trip.servicio}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 font-normal">Creado {new Date(trip.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="font-bold text-slate-800 text-sm">
                                                                {trip.fecha_inicio} — {trip.fecha_fin}
                                                            </div>
                                                            <div className="text-xs text-slate-500 mt-1 flex gap-1">
                                                                {trip.perros > 0 && <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{trip.perros} 🐶</span>}
                                                                {trip.gatos > 0 && <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{trip.gatos} 🐱</span>}
                                                            </div>
                                                        </div>
                                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${selectedTripId === trip.id ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                                                            }`}>
                                                            {selectedTripId === trip.id && <div className="w-2 h-2 rounded-full bg-white" />}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            {!showCreateForm && (
                                <button
                                    disabled={!selectedTripId || sending || checkingDupe}
                                    onClick={handleSendRequest}
                                    className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {checkingDupe ? "Verificando..." : sending ? "Enviando..." : "Enviar Solicitud"}
                                </button>
                            )}
                        </div>

                        <div className="px-6 pb-4 text-center">
                            <p className="text-[10px] text-slate-400">
                                * El pago se coordina directamente con el Sitter fuera de la plataforma.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
