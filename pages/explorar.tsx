import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import FilterBar from "../components/Explore/FilterBar";
import CaregiverCard from "../components/Explore/CaregiverCard";
import Link from "next/link";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import CompletionBlocker from "../components/Shared/CompletionBlocker";
import dynamic from 'next/dynamic';
import { Map, List } from "lucide-react";

const CaregiverMap = dynamic(() => import('../components/Explore/CaregiverMap'), {
    loading: () => <div className="h-[600px] w-full bg-slate-100 animate-pulse rounded-3xl" />,
    ssr: false
});

// Definir interfaz del PetMate basado en tu DB
interface PetMateUser {
    id: string;
    nombre: string;
    apellido_p: string;
    rol: string;
    roles?: string[];
    comuna?: string;
    region?: string;
    foto_perfil?: string;
    promedio_calificacion?: number;
    total_reviews?: number;
    verificado?: boolean;
}

export default function ExplorarPage() {
    const router = useRouter();
    const [petmates, setPetmates] = useState<PetMateUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const [viewMode, setViewMode] = useState<"list" | "map">("list");

    // Estado de filtros
    const [filters, setFilters] = useState<{
        petType: "dogs" | "cats" | "both" | "any";
        serviceType: "all" | "hospedaje" | "a_domicilio"; // Changed for URL cleanliness
        dogSize: string | null;
        dateRange: DateRange | undefined;
    }>({
        petType: "any",
        serviceType: "all",
        dogSize: null,
        dateRange: undefined
    });

    // Función para aumentar filtros
    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Sincronizar con URL params al cargar
    useEffect(() => {
        if (!router.isReady) return;
        const { type, service } = router.query;

        if (type || service) {
            let normalizedService = service as any;
            // Legacy/Mapping check
            if (normalizedService === 'en_casa_petmate') normalizedService = 'hospedaje';

            setFilters(prev => ({
                ...prev,
                petType: (type as any) || prev.petType,
                serviceType: normalizedService || prev.serviceType
            }));
        }
    }, [router.isReady, router.query]);

    const [clientMissingFields, setClientMissingFields] = useState<string[]>([]);
    const [checkingProfile, setCheckingProfile] = useState(true);

    useEffect(() => {
        async function fetchPetmatesAndProfile() {
            setLoading(true);
            try {
                // 1. Verificar sesión y perfil de Cliente
                const { data: { session } } = await supabase.auth.getSession();
                setIsAuthenticated(!!session);

                if (session) {
                    // Fetch client profile data
                    const { data: profile } = await supabase.from("registro_petmate").select("telefono").eq("auth_user_id", session.user.id).single();
                    const { count: petsCount } = await supabase.from("mascotas").select("*", { count: 'exact', head: true }).eq("user_id", session.user.id);
                    const { count: addrCount } = await supabase.from("direcciones").select("*", { count: 'exact', head: true }).eq("user_id", session.user.id);

                    const missing = [];
                    if (!profile?.telefono) missing.push("Teléfono de contacto");
                    if ((petsCount || 0) === 0) missing.push("Al menos una mascota");
                    if ((addrCount || 0) === 0) missing.push("Al menos una dirección");

                    setClientMissingFields(missing);
                }
                setCheckingProfile(false);

                // 2. Fetch Petmates using RPC
                const { from, to } = filters.dateRange || {};
                const dateStart = from ? format(from, 'yyyy-MM-dd') : null;
                const dateEnd = to ? format(to, 'yyyy-MM-dd') : null;

                console.log("Fetching petmates with RPC filters:", { ...filters, dateStart, dateEnd });

                // Map frontend 'hospedaje' to backend 'en_casa_petmate'
                const rpcServiceType = filters.serviceType === 'hospedaje' ? 'en_casa_petmate' : filters.serviceType;

                const { data, error } = await supabase.rpc('search_sitters', {
                    pet_type: filters.petType,
                    service_type: rpcServiceType,
                    dog_size: filters.dogSize,
                    date_start: dateStart,
                    date_end: dateEnd
                });



                if (error) {
                    console.error("Error fetching petmates:", error);
                } else {
                    setPetmates(data || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchPetmatesAndProfile();
    }, [filters]); // Re-ejecutar cuando cambien los filtros

    return (
        <div className="min-h-screen bg-slate-50">
            <Head>
                <title>Explorar Cuidadores | Pawnecta</title>
                <meta name="description" content="Busca y encuentra cuidadores de mascotas verificados en tu comuna. Filtra por servicios de hospedaje o a domicilio. Reserva con confianza en Pawnecta." />
            </Head>

            {/* Barra de Filtros */}
            <FilterBar filters={filters} onFilterChange={handleFilterChange} />

            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">

                {loading || checkingProfile ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                    </div>
                ) : (isAuthenticated && clientMissingFields.length > 0) ? (
                    <CompletionBlocker
                        title="Completa tu perfil para reservar"
                        message="Para ver cuidadores y gestionar reservas, necesitamos que completes tu información básica."
                        missingFields={clientMissingFields}
                        redirectUrl="/usuario"
                        redirectText="Ir a mi Perfil"
                        isApproved={true}
                    />
                ) : petmates.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-400">
                        <h3 className="text-lg font-semibold text-slate-900">No encontramos Sitters con estos filtros</h3>
                        <p className="text-slate-500 mt-2">Intenta cambiar los criterios de búsqueda.</p>
                        <div className="flex flex-col items-center gap-3 mt-6">
                            <button
                                onClick={() => setFilters({ petType: "any", serviceType: "all", dogSize: null, dateRange: undefined })}
                                className="text-emerald-600 font-bold hover:underline"
                            >
                                Limpiar filtros
                            </button>
                            <button
                                onClick={() => router.back()}
                                className="text-slate-500 font-medium hover:text-slate-700 flex items-center gap-2"
                            >
                                ← Volver
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Control de Vista & Resultados */}
                        <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-6 gap-4">
                            <p className="text-slate-500 font-medium">
                                {petmates.length} cuidador{petmates.length !== 1 ? 'es' : ''} encontrado{petmates.length !== 1 ? 's' : ''}
                            </p>

                            <div className="bg-white p-1.5 rounded-xl flex gap-1 border-2 border-slate-400 shadow-sm">
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${viewMode === "list"
                                        ? "bg-slate-900 text-white shadow-md transform scale-[1.02]"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                        }`}
                                >
                                    <List size={18} strokeWidth={2.5} />
                                    <span>Lista</span>
                                </button>
                                <button
                                    onClick={() => setViewMode("map")}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${viewMode === "map"
                                        ? "bg-emerald-600 text-white shadow-md transform scale-[1.02]"
                                        : "text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                                        }`}
                                >
                                    <Map size={18} strokeWidth={2.5} />
                                    <span>Mapa</span>
                                </button>
                            </div>
                        </div>

                        <div className="relative min-h-[500px]">

                            {viewMode === "list" ? (
                                /* VISTA DE LISTA */
                                <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 transition-all duration-500 ${!isAuthenticated ? 'blur-[8px] select-none pointer-events-none opacity-60 grayscale-[0.3]' : ''}`}>
                                    {petmates.map((pm, index) => (
                                        <CaregiverCard
                                            key={pm.id}
                                            id={pm.id}
                                            nombre={pm.nombre || "Usuario"}
                                            apellido={pm.apellido_p || "Pawnecta"}
                                            price={(pm as any).tarifa_servicio_en_casa || (pm as any).tarifa_servicio_a_domicilio || 15000}
                                            rating={(pm as any).promedio_calificacion || 5.0}
                                            reviews={(pm as any).total_reviews || 0}
                                            verified={(pm as any).verificado}
                                            comuna={pm.comuna || (pm as any).region || "Santiago"}
                                            imageUrl={(pm as any).foto_perfil || `https://images.pexels.com/photos/${[220453, 774909, 1222271, 733872, 91227][index % 5]}/pexels-photo-${[220453, 774909, 1222271, 733872, 91227][index % 5]}.jpeg?auto=compress&cs=tinysrgb&w=600`}
                                            isAuthenticated={isAuthenticated}
                                            modalidad={(pm as any).modalidad || "ambos"}
                                            acepta_perros={(pm as any).cuida_perros}
                                            acepta_gatos={(pm as any).cuida_gatos}
                                        />
                                    ))}
                                </div>
                            ) : (
                                /* VISTA DE MAPA */
                                <div className={`h-[600px] w-full transition-all duration-500 ${!isAuthenticated ? 'blur-[4px] pointer-events-none' : ''}`}>
                                    <CaregiverMap sitters={petmates} isAuthenticated={isAuthenticated} />
                                </div>
                            )}

                            {/* Overlay para no autenticados */}
                            {!isAuthenticated && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
                                    <div className="bg-white/90 backdrop-blur-md border border-white/50 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
                                        {/* Decorative gradient blob */}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-100 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none"></div>

                                        <div className="relative z-10">
                                            <div className="mx-auto w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-md shadow-emerald-100 text-3xl">
                                                🔒
                                            </div>
                                            <h3 className="text-2xl font-bold text-slate-900 mb-2">
                                                Descubre a nuestros cuidadores
                                            </h3>
                                            <p className="text-slate-600 mb-8 leading-relaxed">
                                                Regístrate gratuitamente para ver los perfiles completos, fotos y reseñas de la comunidad de Pawnecta.
                                            </p>

                                            <div className="space-y-3">
                                                <Link
                                                    href="/register"
                                                    className="block w-full py-3.5 px-6 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 hover:-translate-y-0.5"
                                                >
                                                    Crear cuenta gratis
                                                </Link>
                                                <Link
                                                    href="/login"
                                                    className="block w-full py-3.5 px-6 bg-white text-slate-700 font-bold rounded-xl border-2 border-slate-400 hover:bg-slate-50 transition-colors"
                                                >
                                                    Iniciar sesión
                                                </Link>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-6">
                                                Únete a más de 1,000 dueños de mascotas felices.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

            </main>
        </div>
    );
}
