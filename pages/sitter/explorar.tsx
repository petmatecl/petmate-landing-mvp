import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { LayoutDashboard, MapPin, Calendar, Home, Hotel, Filter } from "lucide-react";

import ApplicationDialog from "../../components/Sitter/ApplicationDialog";

export default function SitterExplorarPage() {
    const router = useRouter();
    const [trips, setTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sitterId, setSitterId] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState<any | null>(null);

    // Filters
    const [filterService, setFilterService] = useState("");

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push("/login?role=sitter");
            return;
        }
        setSitterId(session.user.id);

        // Fetch Profile for completeness check
        const { data: profile } = await supabase
            .from("registro_petmate")
            .select("*")
            .eq("auth_user_id", session.user.id)
            .single();

        if (profile) {
            setSitterProfile(profile);
        }

        fetchTrips(session.user.id);
    };

    const fetchTrips = async (uid: string) => {
        setLoading(true);
        try {
            // 1. Fetch published trips
            let query = supabase
                .from("viajes")
                .select("*")
                .eq("estado", "publicado")
                .order("created_at", { ascending: false });

            const { data, error } = await query;
            if (error) throw error;

            // 2. Fetch my applications to exclude or mark
            const { data: myApps } = await supabase
                .from("postulaciones")
                .select("viaje_id")
                .eq("sitter_id", uid);

            const myAppTripIds = new Set(myApps?.map(a => a.viaje_id));

            // 3. Mark trips
            const tripsWithStatus = data?.map(t => ({
                ...t,
                hasApplied: myAppTripIds.has(t.id)
            })) || [];

            setTrips(tripsWithStatus);

        } catch (err) {
            console.error("Error fetching trips:", err);
        } finally {
            setLoading(false);
        }
    };

    // Profile State
    const [sitterProfile, setSitterProfile] = useState<any>(null);

    const handleApplyClick = (trip: any) => {
        if (!sitterProfile) return;

        // Check Completeness
        const contactComplete = Boolean(sitterProfile.telefono && sitterProfile.region && sitterProfile.comuna);
        const personalComplete = Boolean(sitterProfile.nombre && sitterProfile.apellido_p && sitterProfile.rut && sitterProfile.fecha_nacimiento && sitterProfile.sexo && sitterProfile.ocupacion);
        // Using same logic as sitter.tsx
        const profileComplete = Boolean(sitterProfile.descripcion && sitterProfile.descripcion.length >= 100 && sitterProfile.tipo_vivienda && (sitterProfile.tiene_mascotas !== null));

        if (!contactComplete || !personalComplete || !profileComplete) {
            alert("Debes completar tu perfil (Información Personal, Contacto y Sobre Mí) antes de poder postular a trabajos. Ve a 'Mi Panel' para completarlo.");
            return;
        }

        setSelectedTrip(trip);
        setIsModalOpen(true);
    };

    const handleAppSuccess = () => {
        // Refresh local state to mark as applied
        if (selectedTrip) {
            setTrips(prev => prev.map(t => t.id === selectedTrip.id ? { ...t, hasApplied: true } : t));
        }
    };

    // Filter Logic
    const filteredTrips = trips.filter(t => {
        if (filterService && t.servicio !== filterService) return false;
        return true;
    });

    return (
        <div className="font-outfit">
            <Head>
                <title>Explorar Trabajos | Pawnecta Sitter</title>
            </Head>

            <div className="container mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Oportunidades Disponibles</h1>
                        <p className="text-slate-500">Encuentra y postula a servicios de cuidado.</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/sitter" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-white transition-colors bg-white flex items-center gap-2">
                            <LayoutDashboard size={18} /> Mi Panel
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2 text-slate-500 font-bold mr-2">
                        <Filter size={18} /> Filtros:
                    </div>

                    <select
                        value={filterService}
                        onChange={(e) => setFilterService(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 outline-none"
                    >
                        <option value="">Todos los servicios</option>
                        <option value="domicilio">A Domicilio</option>
                        <option value="hospedaje">Hospedaje</option>
                    </select>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="text-center py-20 text-slate-400">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
                        Cargando oportunidades...
                    </div>
                ) : filteredTrips.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                        <div className="text-4xl mb-4">📭</div>
                        <h3 className="text-lg font-bold text-slate-900">No hay solicitudes disponibles</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-2">
                            Por ahora no hay clientes buscando sitters. Vuelve a revisar más tarde.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTrips.map(trip => (
                            <div key={trip.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all group">
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-2 rounded-xl ${trip.servicio === 'hospedaje' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            {trip.servicio === 'hospedaje' ? <Hotel size={24} /> : <Home size={24} />}
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${trip.servicio === 'hospedaje' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {trip.servicio}
                                        </span>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center gap-3 text-slate-700">
                                            <Calendar size={18} className="text-slate-400" />
                                            <span className="font-semibold">
                                                {format(new Date(trip.fecha_inicio), "d MMM", { locale: es })}
                                                {trip.fecha_fin && ` - ${format(new Date(trip.fecha_fin), "d MMM", { locale: es })}`}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-700">
                                            <span className="text-lg">🐾</span>
                                            <span>
                                                {trip.perros > 0 && `${trip.perros} Perro${trip.perros > 1 ? 's' : ''}`}
                                                {trip.perros > 0 && trip.gatos > 0 && " y "}
                                                {trip.gatos > 0 && `${trip.gatos} Gato${trip.gatos > 1 ? 's' : ''}`}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 text-slate-500">
                                            <MapPin size={18} className="text-slate-400" />
                                            <span className="italic text-sm">
                                                Ubicación oculta
                                            </span>
                                        </div>
                                    </div>

                                    {trip.hasApplied ? (
                                        <button disabled className="w-full py-3 rounded-xl bg-slate-100 text-slate-400 font-bold border border-slate-200 cursor-not-allowed flex items-center justify-center gap-2">
                                            <span className="text-emerald-500">✓</span> Ya postulaste
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleApplyClick(trip)}
                                            className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-slate-900/10 active:scale-95"
                                        >
                                            Postular
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Application Modal */}
            {sitterId && (
                <ApplicationDialog
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    trip={selectedTrip}
                    sitterId={sitterId}
                    onApplied={handleAppSuccess}
                />
            )}
        </div>
    );
}
