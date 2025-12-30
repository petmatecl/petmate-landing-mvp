import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import FilterBar from "../components/Explore/FilterBar";
import CaregiverCard from "../components/Explore/CaregiverCard";
import CompletionBlocker from "../components/Shared/CompletionBlocker";

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

    // Estado de filtros
    const [filters, setFilters] = useState<{
        petType: "dogs" | "cats" | "both" | "any";
        serviceType: "all" | "en_casa_petmate" | "a_domicilio";
        dogSize: string | null;
    }>({
        petType: "any",
        serviceType: "all",
        dogSize: null
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
            setFilters(prev => ({
                ...prev,
                petType: (type as any) || prev.petType,
                serviceType: (service as any) || prev.serviceType
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

                // 2. Fetch Petmates
                let query = supabase
                    .from("registro_petmate")
                    .select("id, nombre, apellido_p, rol, roles, modalidad, cuida_perros, cuida_gatos, foto_perfil, tarifa_servicio_en_casa, tarifa_servicio_a_domicilio, comuna, region, promedio_calificacion, total_reviews, verificado")
                    // Use array contains for more robust role check
                    .contains("roles", ["petmate"]);

                // Filtro Perros/Gatos
                if (filters.petType === "dogs") {
                    query = query.eq("cuida_perros", true);
                } else if (filters.petType === "cats") {
                    query = query.eq("cuida_gatos", true);
                } else if (filters.petType === "both") {
                    query = query.eq("cuida_perros", true).eq("cuida_gatos", true);
                }

                // Filtro Modalidad
                if (filters.serviceType !== "all") {
                    query = query.or(`modalidad.eq.${filters.serviceType},modalidad.eq.ambos`);
                }

                // Filtro Tamaño Perro
                if ((filters.petType === 'dogs' || filters.petType === 'both') && filters.dogSize) {
                    query = query.contains("tamanos_perros", [filters.dogSize]);
                }

                console.log("Fetching petmates with filters:", filters);
                const { data, error } = await query;

                console.log("Petmates result:", data, error);

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
        <div className="min-h-screen bg-white">
            <Head>
                <title>Explorar Cuidadores | Pawnecta</title>
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
                        redirectUrl="/cliente"
                        redirectText="Ir a mi Perfil"
                        isApproved={true}
                    />
                ) : petmates.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900">No encontramos Sitters con estos filtros</h3>
                        <p className="text-slate-500 mt-2">Intenta cambiar los criterios de búsqueda.</p>
                        <div className="flex flex-col items-center gap-3 mt-6">
                            <button
                                onClick={() => setFilters({ petType: "any", serviceType: "all", dogSize: null })}
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
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {petmates.map((pm, index) => (
                            <CaregiverCard
                                key={pm.id}
                                id={pm.id}
                                nombre={pm.nombre || "Usuario"}
                                apellido={pm.apellido_p || "PetMate"}
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
                )}

            </main>
        </div>
    );
}
