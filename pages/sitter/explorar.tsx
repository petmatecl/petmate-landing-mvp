import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { LayoutDashboard, MapPin, Calendar, Home, Hotel, Filter, Dog } from "lucide-react";

import ApplicationDialog from "../../components/Sitter/ApplicationDialog";
import ModalAlert from "../../components/ModalAlert";
import CompletionBlocker from "../../components/Shared/CompletionBlocker";
import { DateRange } from "react-day-picker";
import DateRangeAirbnb from "../../components/DateRangeAirbnb";

const COMUNAS_SANTIAGO = [
    "Cerrillos", "Cerro Navia", "Conchalí", "El Bosque", "Estación Central", "Huechuraba", "Independencia",
    "La Cisterna", "La Florida", "La Granja", "La Pintana", "La Reina", "Las Condes", "Lo Barnechea", "Lo Espejo",
    "Lo Prado", "Macul", "Maipú", "Ñuñoa", "Pedro Aguirre Cerda", "Peñalolén", "Providencia", "Pudahuel",
    "Quilicura", "Quinta Normal", "Recoleta", "Renca", "San Joaquín", "San Miguel", "San Ramón", "Santiago",
    "Vitacura"
];

export default function SitterExplorarPage() {
    const router = useRouter();
    const [trips, setTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sitterId, setSitterId] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState<any | null>(null);
    const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'warning' | 'success' | 'info' }>({
        isOpen: false,
        title: "",
        message: "",
        type: "warning"
    });
    // Filters
    const [filterService, setFilterService] = useState("");
    const [filterComuna, setFilterComuna] = useState("");
    // Replaced separate date states with DateRange
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

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
            // 1. Fetch published trips (remove invalid mascotas join)
            let query = supabase
                .from("viajes")
                .select("*, cliente:user_id(comuna, nombre)")
                .eq("estado", "publicado")
                .order("created_at", { ascending: false });

            const { data: tripsData, error } = await query;
            if (error) throw error;

            if (!tripsData || tripsData.length === 0) {
                setTrips([]);
                return;
            }

            // 2. Fetch pets manually
            const allPetIds = tripsData.flatMap(t => t.mascotas_ids || []);
            const uniquePetIds = Array.from(new Set(allPetIds));

            let petsMap: Record<string, any> = {};
            if (uniquePetIds.length > 0) {
                const { data: petsData } = await supabase
                    .from("mascotas")
                    .select("id, tamano, tipo")
                    .in("id", uniquePetIds);

                if (petsData) {
                    petsData.forEach(p => {
                        petsMap[p.id] = p;
                    });
                }
            }

            // 3. Fetch my applications to exclude or mark
            const { data: myApps } = await supabase
                .from("postulaciones")
                .select("viaje_id")
                .eq("sitter_id", uid);

            const myAppTripIds = new Set(myApps?.map(a => a.viaje_id));

            // 4. Combine data
            const tripsWithStatus = tripsData.map(t => {
                // Map pets. For simplicity, we'll just take the first pet's info if multiple, 
                // or returning an array if the UI supports it.
                // The current UI seems to expect a single object 'mascotas: { tamano, tipo }', likely expecting 1 pet or just showing info for one.
                // However, the trip has 'mascotas_ids'. 
                // Let's create a 'mascotas' object that represents the aggregate or the first pet to keep UI compatible if possible,
                // OR better, update the UI to handle multiple pets.
                // Looking at UI: trip.mascotas?.tamano && trip.mascotas?.tipo
                // It seems to expect one object.
                // We will populate it with the first valid pet found.

                const tripPets = (t.mascotas_ids || []).map((pid: string) => petsMap[pid]).filter(Boolean);
                const firstPet = tripPets[0] || {};

                return {
                    ...t,
                    mascotas: firstPet, // Backward compatibility for UI
                    all_pets: tripPets, // New field if we want to improve UI later
                    hasApplied: myAppTripIds.has(t.id)
                };
            });

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
            if (!contactComplete || !personalComplete || !profileComplete) {
                setAlertState({
                    isOpen: true,
                    title: "Perfil Incompleto",
                    message: "Debes completar tu perfil (Información Personal, Contacto y Sobre Mí) antes de poder postular a trabajos. Ve a 'Mi Panel' para completarlo.",
                    type: "warning"
                });
                return;
            }
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
        if (filterComuna && t.cliente?.comuna !== filterComuna) return false;

        // Date Logic
        // If user selected a "from" date, filtered trips must start ON or AFTER that date
        if (dateRange?.from) {
            const tripStart = new Date(t.fecha_inicio);
            // Clear time for comparison
            tripStart.setHours(0, 0, 0, 0);
            const rangeFrom = new Date(dateRange.from);
            rangeFrom.setHours(0, 0, 0, 0);
            if (tripStart < rangeFrom) return false;
        }

        // If user selected a "to" date, filtered trips must end ON or BEFORE that date
        if (dateRange?.to) {
            const tripEnd = t.fecha_fin ? new Date(t.fecha_fin) : new Date(t.fecha_inicio); // Fallback if single date trip
            tripEnd.setHours(0, 0, 0, 0);
            const rangeTo = new Date(dateRange.to);
            rangeTo.setHours(0, 0, 0, 0);
            if (tripEnd > rangeTo) return false;
        }

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
                        {/* Volver Button */}
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition-colors bg-white"
                        >
                            Volver
                        </button>
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

                    <select
                        value={filterComuna}
                        onChange={(e) => setFilterComuna(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 outline-none"
                    >
                        <option value="">Todas las comunas</option>
                        {COMUNAS_SANTIAGO.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>

                    {/* Airbnb DateRange Component */}
                    <div className="w-full sm:w-auto">
                        <DateRangeAirbnb
                            value={dateRange}
                            onChange={setDateRange}
                            className="w-full sm:w-auto"
                        />
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="text-center py-20 text-slate-400">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
                        Cargando oportunidades...
                    </div>
                ) : (!sitterProfile || !Boolean(sitterProfile.telefono && sitterProfile.region && sitterProfile.comuna && sitterProfile.nombre && sitterProfile.apellido_p && sitterProfile.rut && sitterProfile.fecha_nacimiento && sitterProfile.sexo && sitterProfile.ocupacion && sitterProfile.descripcion && sitterProfile.descripcion.length >= 100 && sitterProfile.tipo_vivienda && (sitterProfile.tiene_mascotas !== null)) || !sitterProfile.roles?.includes('petmate')) ? (
                    <CompletionBlocker
                        title="Oportunidades Restringidas"
                        message="Para ver y postular a trabajos de cuidado, necesitas completar tu perfil y activar tu cuenta."
                        missingFields={[
                            !sitterProfile ? "Perfil no cargado" : null,
                            sitterProfile && !Boolean(sitterProfile.telefono && sitterProfile.region && sitterProfile.comuna) ? "Datos de Contacto" : null,
                            sitterProfile && !Boolean(sitterProfile.nombre && sitterProfile.apellido_p && sitterProfile.rut && sitterProfile.fecha_nacimiento && sitterProfile.sexo && sitterProfile.ocupacion) ? "Información Personal" : null,
                            sitterProfile && !Boolean(sitterProfile.descripcion && sitterProfile.descripcion.length >= 100 && sitterProfile.tipo_vivienda && (sitterProfile.tiene_mascotas !== null)) ? "Perfil y Preferencias" : null,
                            sitterProfile && (!sitterProfile.roles?.includes('petmate')) ? "Activar Perfil Sitter" : null
                        ].filter(Boolean) as string[]}
                        redirectUrl="/sitter"
                        redirectText="Ir a mi Dashboard"
                        isApproved={true} // We handle "Activar Sitter" as a missing field here slightly differently than strict approval
                    />
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
                                            {trip.servicio === 'hospedaje' ? 'En casa del sitter' : 'En casa del dueño'}
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
                                            <span>
                                                {trip.perros > 0 && `${trip.perros} Perro${trip.perros > 1 ? 's' : ''}`}
                                                {trip.perros > 0 && trip.gatos > 0 && " y "}
                                                {trip.gatos > 0 && `${trip.gatos} Gato${trip.gatos > 1 ? 's' : ''}`}
                                            </span>
                                        </div>

                                        {trip.mascotas?.tamano && trip.mascotas?.tipo === 'perro' && (
                                            <div className="flex items-center gap-3 text-slate-700">
                                                <Dog size={18} className="text-slate-400" />
                                                <span className="capitalize font-medium text-slate-600">
                                                    Tamaño: {trip.mascotas.tamano}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3 text-slate-500">
                                            <MapPin size={18} className="text-slate-400" />
                                            <span className="text-sm font-medium text-slate-800">
                                                {trip.cliente?.comuna || "Santiago"}
                                                <span className="text-slate-400 text-xs font-normal ml-1">(Aprox.)</span>
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

            <ModalAlert
                isOpen={alertState.isOpen}
                onClose={() => setAlertState({ ...alertState, isOpen: false })}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
            />
        </div>
    );
}
