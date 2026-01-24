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

        // Buscar viajes disponibles (borrador o publicados) que NO tengan sitter asignado aún
        // O que sean 'borrador'.
        const { data, error } = await supabase
            .from("viajes")
            .select("id, servicio, fecha_inicio, fecha_fin, perros, gatos, estado, created_at") // OPTIMIZATION P1.2
            .eq("user_id", session.user.id)
            .in("estado", ["borrador", "publicado", "solicitado_por_cliente"]) // Allow re-requesting if not confirmed
            //.is("sitter_id", null) // Now we don't rely on sitter_id for availability check strictly, but good for MVP
            .order("created_at", { ascending: false });

        if (data) {
            setTrips(data);
        }
        setLoading(false);
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
                            <p className="text-slate-600 mb-4">
                                Para contactar a <span className="font-bold text-slate-900">{sitterName}</span>, selecciona uno de tus viajes planificados:
                            </p>

                            {loading ? (
                                <div className="py-8 text-center text-emerald-600">Cargando tus viajes...</div>
                            ) : trips.length === 0 ? (
                                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-slate-500 mb-3">No tienes viajes disponibles para asignar.</p>
                                    <Link href="/usuario" className="text-emerald-600 font-bold hover:underline text-sm">
                                        + Crear Nuevo Viaje
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
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
                                                    <span className="text-xs font-bold uppercase text-emerald-600 tracking-wide bg-emerald-100 px-2 py-0.5 rounded-full">
                                                        {trip.servicio}
                                                    </span>
                                                    <div className="mt-1 font-medium text-slate-900">
                                                        {trip.fecha_inicio} - {trip.fecha_fin}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        {trip.perros > 0 && `${trip.perros} Perros `}
                                                        {trip.gatos > 0 && `${trip.gatos} Gatos`}
                                                    </div>
                                                </div>
                                                {selectedTripId === trip.id && (
                                                    <div className="text-emerald-600">
                                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={!selectedTripId || sending || checkingDupe}
                                onClick={handleSendRequest}
                                className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {checkingDupe ? "Verificando..." : sending ? "Enviando..." : "Enviar Solicitud"}
                            </button>
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
