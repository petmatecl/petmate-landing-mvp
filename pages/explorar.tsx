import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import FilterBar from "../components/Explore/FilterBar";
import CaregiverCard from "../components/Explore/CaregiverCard";

// Definir interfaz del PetMate basado en tu DB
interface PetMateUser {
    id: string;
    nombre: string;
    apellido_p: string;
    rol: string;
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
    }>({
        petType: "any",
        serviceType: "all"
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

    useEffect(() => {
        async function fetchPetmates() {
            setLoading(true);
            try {
                // 1. Verificar sesión
                const { data: { session } } = await supabase.auth.getSession();
                setIsAuthenticated(!!session);

                // 2. Construir consulta
                // 2. Construir consulta
                let query = supabase
                    .from("registro_petmate")
                    .select("id, nombre, apellido_p, rol, modalidad, acepta_perros, acepta_gatos, foto_perfil")
                    .eq("rol", "petmate");

                // Filtro Perros/Gatos
                if (filters.petType === "dogs") {
                    query = query.eq("acepta_perros", true);
                } else if (filters.petType === "cats") {
                    query = query.eq("acepta_gatos", true);
                } else if (filters.petType === "both") {
                    // Strict filtering: Need sitters who accept BOTH
                    query = query.eq("acepta_perros", true).eq("acepta_gatos", true);
                }
                // "any": No filtering (Show All)

                // Filtro Modalidad
                if (filters.serviceType !== "all") {
                    // Si selecciona "en_casa_petmate", queremos los que sean "en_casa_petmate" O "ambos".
                    // Supabase OR syntax: .or(`modalidad.eq.${filters.serviceType},modalidad.eq.ambos`)
                    query = query.or(`modalidad.eq.${filters.serviceType},modalidad.eq.ambos`);
                }

                const { data, error } = await query;

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

        fetchPetmates();
    }, [filters]); // Re-ejecutar cuando cambien los filtros

    return (
        <div className="min-h-screen bg-white">
            <Head>
                <title>Explorar Cuidadores | Pawnecta</title>
            </Head>



            {/* Barra de Filtros */}
            <FilterBar filters={filters} onFilterChange={handleFilterChange} />

            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">

                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                    </div>
                ) : petmates.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900">No encontramos Sitters con estos filtros</h3>
                        <p className="text-slate-500 mt-2">Intenta cambiar los criterios de búsqueda.</p>
                        <div className="flex flex-col items-center gap-3 mt-6">
                            <button
                                onClick={() => setFilters({ petType: "any", serviceType: "all" })}
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
                                // Datos mock para UI que no están en DB aún o incompletos
                                price={15000 + (index * 2000)}
                                rating={4.5 + (index % 5) * 0.1}
                                reviews={3 + index * 2}
                                verified={index % 2 === 0}
                                comuna={["Providencia", "Las Condes", "Ñuñoa"][index % 3]}
                                imageUrl={(pm as any).foto_perfil || `https://images.pexels.com/photos/${[220453, 774909, 1222271, 733872, 91227][index % 5]
                                    }/pexels-photo-${[220453, 774909, 1222271, 733872, 91227][index % 5]
                                    }.jpeg?auto=compress&cs=tinysrgb&w=600`}
                                isAuthenticated={isAuthenticated}
                                // Props reales de DB (con defaults por si null)
                                modalidad={(pm as any).modalidad || "ambos"}
                                acepta_perros={(pm as any).acepta_perros}
                                acepta_gatos={(pm as any).acepta_gatos}
                            />
                        ))}
                    </div>
                )}

            </main>


        </div>
    );
}
