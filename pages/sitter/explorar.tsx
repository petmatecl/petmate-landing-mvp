import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { LayoutDashboard, MapPin, Calendar, Home, Hotel, Filter, Dog, Ruler, Check, Inbox } from "lucide-react";

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
    const [filterPetType, setFilterPetType] = useState(""); // New Pet Type Filter
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
            const today = new Date().toISOString().split('T')[0];

            let query = supabase
                .from("viajes")
                .select("*")
                .eq("estado", "publicado")
                .gte("fecha_inicio", today)
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

            // 2.5 Fetch Clients manually
            const userIds = Array.from(new Set(tripsData.map((t: any) => t.user_id)));
            let clientsMap: Record<string, any> = {};
            if (userIds.length > 0) {
                const { data: clients } = await supabase
                    .from("registro_petmate")
                    .select("auth_user_id, comuna, nombre")
                    .in("auth_user_id", userIds);
                if (clients) {
                    clients.forEach(c => clientsMap[c.auth_user_id] = c);
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
                    cliente: clientsMap[t.user_id] || {},
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
        if (filterService && t.servicio !== filterService) return false;
        if (filterComuna && t.cliente?.comuna !== filterComuna) return false;

        // Pet Type Logic
        if (filterPetType === 'perro' && t.perros === 0) return false; // Must have at least 1 dog
        if (filterPetType === 'gato' && t.gatos === 0) return false;   // Must have at least 1 cat

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
                        <h1 className="text-2xl font-bold text-slate-900">Solicitudes Disponibles</h1>
                        <p className="text-slate-500">Encuentra y postula a servicios de cuidado.</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/sitter" className="px-4 py-2 border-2 border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-white transition-colors bg-white flex items-center gap-2">
                            <LayoutDashboard size={18} /> Mi Panel
                        </Link>
                        {/* Volver Button */}
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 border-2 border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition-colors bg-white"
                        >
                            Volver
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl border-2 border-slate-300 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2 text-slate-500 font-bold mr-2">
                        <Filter size={18} /> Filtros:
                    </div>

                    <select
                        value={filterService}
                        onChange={(e) => setFilterService(e.target.value)}
                        className="px-3 py-2 rounded-lg border-2 border-slate-300 text-sm focus:border-emerald-500 outline-none"
                    >
                        <option value="">Todos los servicios</option>
                        <option value="domicilio">A Domicilio</option>
                        <option value="hospedaje">Hospedaje</option>
                    </select>

                    <select
                        value={filterComuna}
                        onChange={(e) => setFilterComuna(e.target.value)}
                        className="px-3 py-2 rounded-lg border-2 border-slate-300 text-sm focus:border-emerald-500 outline-none"
                    >
                        <option value="">Todas las comunas</option>
                        {COMUNAS_SANTIAGO.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>

                    <select
                        value={filterPetType}
                        onChange={(e) => setFilterPetType(e.target.value)}
                        className="px-3 py-2 rounded-lg border-2 border-slate-300 text-sm focus:border-emerald-500 outline-none"
                    >
                        <option value="">Cualquier Mascota</option>
                        <option value="perro">Solo Perros</option>
                        <option value="gato">Solo Gatos</option>
                    </select>

                    {/* Airbnb DateRange Component */}
                    <div className="w-full sm:w-auto">
                        <DateRangeAirbnb
                            value={dateRange}
                            onChange={setDateRange}
                            className="w-full sm:w-auto"
                            label="Tu Disponibilidad"
                            helperText="Selecciona las fechas en que puedes prestar servicios."
                        />
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="text-center py-20 text-slate-400">
                        <div className="w-10 h-10 border-4 border-slate-300 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
                        Cargando oportunidades...
                    </div>
                ) : (!sitterProfile || !Boolean(sitterProfile.telefono && (sitterProfile.region || sitterProfile.comuna)) || !Boolean(sitterProfile.nombre && sitterProfile.apellido_p && sitterProfile.rut) || !((sitterProfile.roles || [sitterProfile.rol]).includes('sitter'))) ? (
                    <CompletionBlocker
                        title="Oportunidades Restringidas"
                        message="Para ver y postular a trabajos de cuidado, necesitas completar tu perfil y activar tu cuenta."
                        missingFields={[
                            !sitterProfile ? "Perfil no cargado" : null,
                            sitterProfile && !Boolean(sitterProfile.telefono && (sitterProfile.region || sitterProfile.comuna)) ? "Datos de Contacto" : null,
                            sitterProfile && !Boolean(sitterProfile.nombre && sitterProfile.apellido_p && sitterProfile.rut) ? "Información Personal" : null,
                            sitterProfile && !((sitterProfile.roles || [sitterProfile.rol]).includes('sitter')) ? "Activar Perfil Sitter" : null
                        ].filter(Boolean) as string[]}
                        redirectUrl="/sitter"
                        redirectText="Ir a mi Dashboard"
                        isApproved={true}
                    />
                ) : filteredTrips.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                        <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Inbox size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">No hay solicitudes disponibles</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-2">
                            Por ahora no hay clientes buscando sitters. Vuelve a revisar más tarde.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTrips.map(trip => (
                            <div key={trip.id} className="bg-white rounded-xl border-2 border-slate-300 hover:border-emerald-300 hover:shadow-lg transition-all duration-300 group flex flex-col relative overflow-hidden">
                                {/* Service Stripe */}
                                <div className={`h-1.5 w-full ${trip.servicio === 'hospedaje' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>

                                <div className="p-5 flex flex-col h-full">
                                    {/* Header */}
                                    <div className="mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white uppercase tracking-wider
                                                    ${trip.servicio === 'hospedaje' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                                                    {trip.servicio === 'hospedaje' ? 'Hospedaje' : 'Domicilio'}
                                                </span>
                                                <span className="text-xs text-slate-400 font-medium">
                                                    {trip.cliente?.nombre?.split(" ")[0]}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 leading-tight flex items-center gap-1">
                                                <MapPin size={16} className="text-slate-400" />
                                                {trip.comuna || trip.cliente?.comuna || "Santiago"}
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="border-t border-slate-300 my-3"></div>

                                    {/* Details */}
                                    <div className="space-y-2 mb-4 flex-1">
                                        <div className="flex flex-col gap-1 text-sm text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={16} className="text-slate-400 shrink-0" />
                                                <span className="font-medium">
                                                    {format(new Date(trip.fecha_inicio), "d MMM", { locale: es })}
                                                    {trip.fecha_fin && ` - ${format(new Date(trip.fecha_fin), "d MMM", { locale: es })}`}
                                                </span>
                                            </div>
                                            {/* Duration Logic */}
                                            {(() => {
                                                const start = new Date(trip.fecha_inicio);
                                                const end = trip.fecha_fin ? new Date(trip.fecha_fin) : null;
                                                const nights = end ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) : 1;
                                                return (
                                                    <div className="ml-6 text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md inline-block w-fit">
                                                        {nights} {nights === 1 ? 'noche' : 'noches'} | {format(start, 'yyyy')}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Dog size={16} className="text-slate-400" />
                                            <span>
                                                {trip.perros > 0 && `${trip.perros} Perro${trip.perros > 1 ? 's' : ''}`}
                                                {trip.perros > 0 && trip.gatos > 0 && ", "}
                                                {trip.gatos > 0 && `${trip.gatos} Gato${trip.gatos > 1 ? 's' : ''}`}
                                            </span>
                                        </div>

                                        {/* Optional Pet Details - Only for Dogs */}
                                        {trip.perros > 0 && trip.mascotas?.tamano && (
                                            <div className="flex items-center gap-2 text-xs text-slate-500 ml-6">
                                                <span className="bg-slate-100 px-2 py-0.5 rounded">
                                                    Tamaño {trip.mascotas.tamano}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action */}
                                    <div className="mt-auto">
                                        {trip.hasApplied ? (
                                            <button disabled className="w-full py-2.5 rounded-lg bg-slate-50 text-emerald-600 font-bold border border-emerald-100 cursor-not-allowed flex items-center justify-center gap-2 text-sm">
                                                <Check size={16} /> Ya postulaste
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleApplyClick(trip)}
                                                className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-emerald-600 transition-colors text-sm shadow-sm hover:shadow-md"
                                            >
                                                Postular
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Application Modal */}
            {
                sitterId && (
                    <ApplicationDialog
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        trip={selectedTrip}
                        sitterId={sitterId}
                        onApplied={handleAppSuccess}
                    />
                )
            }

            <ModalAlert
                isOpen={alertState.isOpen}
                onClose={() => setAlertState({ ...alertState, isOpen: false })}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
            />
        </div >
    );
}
