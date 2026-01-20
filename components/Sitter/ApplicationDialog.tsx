import { useState } from "react";
import { X, Send, DollarSign } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { createNotification } from "../../lib/notifications";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    trip: any; // Using any for simplicity here but should be Trip type
    sitterId: string;
    onApplied: () => void;
};

export default function ApplicationDialog({ isOpen, onClose, trip, sitterId, onApplied }: Props) {
    const [mensaje, setMensaje] = useState("");
    const [precio, setPrecio] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !trip) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!mensaje.trim()) {
                throw new Error("Por favor escribe un mensaje para el cliente.");
            }

            if (!precio) {
                throw new Error("Debes ofertar un precio por noche.");
            }

            const payload = {
                viaje_id: trip.id,
                sitter_id: sitterId,
                mensaje: mensaje.trim(),
                precio_oferta: precio ? parseInt(precio.replace(/\./g, '')) : null,
                estado: 'pendiente'
            };

            const { error: insertError } = await supabase
                .from("postulaciones")
                .insert(payload);

            if (insertError) {
                if (insertError.code === '23505') { // Unique violation
                    throw new Error("Ya has postulado a este viaje.");
                }
                throw insertError;
            }

            onApplied();

            // [NEW] Notify Client
            if (trip.user_id) {
                // 1. Create In-App Notification
                createNotification({
                    userId: trip.user_id,
                    type: 'message', // or 'application' if we add that type later
                    title: '¡Nueva Postulación!',
                    message: `Un sitter ha postulado a tu viaje de ${trip.servicio}. ¡Reísala ahora!`,
                    link: '/usuario'
                }).catch(console.error);

                // 2. Send Email
                // Fetch Client Email first
                supabase
                    .from('registro_petmate')
                    .select('email, nombre')
                    .eq('auth_user_id', trip.user_id)
                    .single()
                    .then(({ data: clientData }) => {
                        if (clientData?.email) {
                            fetch('/api/send-email', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    type: 'new_request', // Using 'new_request' template for Application
                                    to: clientData.email,
                                    data: {
                                        sitterName: "Un Sitter", // Ideally we fetch Sitter name too, or pass it as prop
                                        clientName: clientData.nombre,
                                        serviceType: trip.servicio,
                                        startDate: format(new Date(trip.fecha_inicio), "d MMM", { locale: es }),
                                        endDate: trip.fecha_fin ? format(new Date(trip.fecha_fin), "d MMM", { locale: es }) : "Indefinido",
                                        dashboardUrl: `${window.location.origin}/usuario`
                                    }
                                })
                            }).catch(err => console.error('Failed to send email:', err));
                        }
                    });
            }

            onClose();

        } catch (err: any) {
            console.error("Error applying:", err);
            setError(err.message || "Error al enviar la postulación.");
        } finally {
            setLoading(false);
        }
    };

    const startDate = new Date(trip.fecha_inicio);
    const endDate = trip.fecha_fin ? new Date(trip.fecha_fin) : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800">
                        Postular al Viaje
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
                    {/* Trip Summary */}
                    <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 text-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Fecha:</span>
                            <span className="font-bold text-slate-800">
                                {format(startDate, "d MMM", { locale: es })}
                                {endDate && ` - ${format(endDate, "d MMM", { locale: es })}`}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Servicio:</span>
                            <span className="font-bold text-slate-800 capitalize">{trip.servicio}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Mascotas:</span>
                            <span className="font-bold text-slate-800">
                                {trip.perros > 0 && `${trip.perros} Perros `}
                                {trip.gatos > 0 && `${trip.gatos} Gatos`}
                            </span>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-lg flex items-start gap-2">
                            <span className="mt-0.5">⚠️</span>
                            {error}
                        </div>
                    )}

                    {/* Mensaje */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                            Mensaje para el cliente
                        </label>
                        <textarea
                            rows={4}
                            value={mensaje}
                            onChange={(e) => setMensaje(e.target.value)}
                            placeholder="Hola, me encantaría cuidar a tus mascotas. Tengo experiencia con..."
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all resize-none"
                            required
                        />
                    </div>

                    {/* Precio (Obligatorio) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ">
                            Oferta de Precio (Valor por noche)
                        </label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <DollarSign size={16} />
                            </div>
                            <input
                                type="text"
                                value={precio}
                                onChange={(e) => {
                                    // Remove existing dots and non-numeric chars
                                    const rawValue = e.target.value.replace(/\D/g, '');
                                    if (!rawValue) {
                                        setPrecio("");
                                        return;
                                    }
                                    // Format with thousands separator
                                    const formatted = new Intl.NumberFormat('es-CL').format(parseInt(rawValue));
                                    setPrecio(formatted);
                                }}
                                placeholder="Ej: 25.000"
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                                required
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Este es el valor que cobrarás por cada noche de servicio.</p>
                    </div>

                    {/* Submit */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Send size={18} /> Enviar Postulación
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}
