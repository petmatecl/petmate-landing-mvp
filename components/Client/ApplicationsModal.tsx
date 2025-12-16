import { useState, useEffect } from "react";
import { X, CheckCircle2, User, Star, MessageCircle } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    tripId: string;
    onAccepted: () => void; // Trigger refresh on parent
};

type Application = {
    id: string;
    sitter_id: string;
    mensaje?: string;
    precio_oferta?: number;
    created_at: string;
    sitter?: {
        nombre: string;
        apellido_p: string;
        foto_perfil: string;
        biografia?: string;
        // rates could be fetched if needed, keeping simple for MVP
    };
};

export default function ApplicationsModal({ isOpen, onClose, tripId, onAccepted }: Props) {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && tripId) {
            fetchApplications();
        }
    }, [isOpen, tripId]);

    const fetchApplications = async () => {
        setLoading(true);
        try {
            // Fetch applications for this trip
            const { data, error } = await supabase
                .from("postulaciones")
                .select("*")
                .eq("viaje_id", tripId)
                .eq("estado", "pendiente");

            if (error) throw error;

            if (data && data.length > 0) {
                // Fetch sitter profiles manually to ensure we get the latest data
                // Ideally this would be a join, but let's do it in two steps for simplicity with current schema knowledge
                const sitterIds = data.map(app => app.sitter_id);
                const { data: sitters } = await supabase
                    .from("registro_petmate")
                    .select("auth_user_id, nombre, apellido_p, foto_perfil, biografia")
                    .in("auth_user_id", sitterIds);

                const sittersMap = sitters ? Object.fromEntries(sitters.map(s => [s.auth_user_id, s])) : {};

                const appsWithProfile = data.map(app => ({
                    ...app,
                    sitter: sittersMap[app.sitter_id]
                }));
                setApplications(appsWithProfile);
            } else {
                setApplications([]);
            }

        } catch (err) {
            console.error("Error fetching applications:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (app: Application) => {
        if (!confirm(`¿Estás seguro de aceptar a ${app.sitter?.nombre} para este viaje?`)) return;

        setProcessingId(app.id);
        try {
            // 1. Transaction-like update: Update Trip to 'reservado' and assigned sitter
            const { error: tripError } = await supabase
                .from("viajes")
                .update({
                    sitter_id: app.sitter_id,
                    estado: 'reservado',
                    sitter_asignado: true // Optional field based on schema, mostly logic driven
                })
                .eq("id", tripId);

            if (tripError) throw tripError;

            // 2. Update this application to 'aceptada'
            await supabase
                .from("postulaciones")
                .update({ estado: 'aceptada' })
                .eq("id", app.id);

            // 3. Update others to 'rechazada' (optional, but good practice)
            await supabase
                .from("postulaciones")
                .update({ estado: 'rechazada' })
                .eq("viaje_id", tripId)
                .neq("id", app.id);

            // Success
            onAccepted();
            onClose();

        } catch (err) {
            console.error("Error accepting application:", err);
            alert("Hubo un error al aceptar la postulación. Inténtalo de nuevo.");
            setProcessingId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                            <Users size={20} />
                        </span>
                        Postulantes
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-400">
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
                            <p className="text-sm">Cargando postulaciones...</p>
                        </div>
                    ) : applications.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">📭</div>
                            <h3 className="text-lg font-bold text-slate-900">Aún no hay postulantes</h3>
                            <p className="text-slate-500 max-w-xs mx-auto mt-2">
                                Tu viaje está publicado. Notificaremos a los sitters para que envíen sus propuestas.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {applications.map(app => (
                                <div key={app.id} className="border border-slate-200 rounded-xl p-4 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
                                    <div className="flex flex-col md:flex-row gap-4">
                                        {/* Sitter Info */}
                                        <div className="flex items-start gap-4 flex-1">
                                            {app.sitter?.foto_perfil ? (
                                                <img
                                                    src={app.sitter.foto_perfil}
                                                    alt={app.sitter.nombre}
                                                    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl font-bold border-2 border-white shadow-sm">
                                                    {app.sitter?.nombre.charAt(0)}
                                                </div>
                                            )}

                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-slate-900 text-lg">
                                                        {app.sitter?.nombre} {app.sitter?.apellido_p}
                                                    </h3>
                                                    {app.precio_oferta && (
                                                        <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                                            Oferta: ${app.precio_oferta.toLocaleString('es-CL')}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                    Enviado el {format(new Date(app.created_at), "d 'de' MMMM", { locale: es })}
                                                </div>

                                                {app.mensaje && (
                                                    <div className="mt-3 bg-slate-50 p-3 rounded-lg text-sm text-slate-600 italic border border-slate-100 relative">
                                                        <MessageCircle size={14} className="absolute -top-2 -left-1 bg-white text-slate-400" />
                                                        "{app.mensaje}"
                                                    </div>
                                                )}

                                                <div className="mt-3">
                                                    <Link
                                                        href={`/sitter/${app.sitter_id}`}
                                                        target="_blank"
                                                        className="text-emerald-600 text-sm font-semibold hover:underline flex items-center gap-1"
                                                    >
                                                        Ver Perfil Completo <span className="text-xs">↗</span>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col justify-center gap-2 min-w-[140px] border-l border-slate-100 pl-0 md:pl-4 mt-4 md:mt-0">
                                            <button
                                                onClick={() => handleAccept(app)}
                                                disabled={!!processingId}
                                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg shadow-lg shadow-slate-900/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {processingId === app.id ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 size={16} /> Aceptar
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Icon for header (duplicated to avoid import error if needed, but import works)
function Users({ size, className }: { size?: number, className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size || 24}
            height={size || 24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}
