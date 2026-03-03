import React, { useEffect, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import { MapPin, MessagesSquare, PawPrint, Search, PlusCircle, AlertCircle, Bookmark, Heart, X } from "lucide-react";

// --- Tipos de Datos ---
interface Pet {
    id: string;
    nombre: string;
    especie: string;
    raza?: string;
    foto?: string;
    sexo?: 'macho' | 'hembra';
    tamaño?: 'pequeño' | 'mediano' | 'grande' | 'gigante';
}

interface ConversationPreview {
    id: string;
    partnerName: string;
    partnerPhoto?: string;
    lastMessage: string;
    updatedAt: string;
}

interface FavoritePreview {
    id: string;
    servicio_id: string;
    titulo: string;
    foto?: string;
    precio_desde?: number;
    unidad_precio?: string;
    proveedor_nombre?: string;
}

export default function DashboardContent() {
    const { user, profile } = useUser();

    const [pets, setPets] = useState<Pet[]>([]);
    const [conversations, setConversations] = useState<ConversationPreview[]>([]);
    const [favorites, setFavorites] = useState<FavoritePreview[]>([]);
    const [contactedServices, setContactedServices] = useState<any[]>([]);

    // UI states
    const [isLoadingPets, setIsLoadingPets] = useState(true);
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);
    const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
    const [hasFavoritesError, setHasFavoritesError] = useState(false);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        if (!user) return;

        // Welcome banner (localStorage)
        const key = `pawnecta_onboarded_${user.id}`;
        if (typeof window !== 'undefined' && !localStorage.getItem(key)) {
            setShowBanner(true);
        }

        let isMounted = true;

        // 1. Fetch Mascotas
        const loadPets = async () => {
            try {
                const { data, error } = await supabase
                    .from('mascotas_usuarios')
                    .select('*')
                    .eq('auth_user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                if (isMounted && data) setPets(data);
            } catch (err) {
                console.error("Error cargando mascotas:", err);
            } finally {
                if (isMounted) setIsLoadingPets(false);
            }
        };

        // 2. Fetch Conversaciones
        const loadConversations = async () => {
            try {
                // Buscamos conversaciones donde el usuario sea el cliente
                const { data, error } = await supabase
                    .from('conversations')
                    .select(`
                        id,
                        updated_at,
                        sitter_id,
                        proveedores!conversations_sitter_id_fkey(
                            nombre,
                            apellido_p,
                            foto_perfil
                        ),
                        messages(
                            content,
                            created_at
                        )
                    `)
                    .eq('client_id', user.id)
                    .order('updated_at', { ascending: false })
                    .limit(5);

                if (error) throw error;

                if (isMounted && data) {
                    const parsed = data.map((conv: any) => {
                        const partner = Array.isArray(conv.proveedores) ? conv.proveedores[0] : conv.proveedores;
                        // messages typically come ordered by created_at if Supabase API is configured,
                        // otherwise we take the last one in the array
                        const msgs = conv.messages || [];
                        const lastMsg = msgs.length > 0
                            ? msgs.reduce((a: any, b: any) => new Date(a.created_at) > new Date(b.created_at) ? a : b)?.content
                            : 'Sin mensajes';

                        return {
                            id: conv.id,
                            partnerName: partner ? `${partner.nombre || 'Proveedor'} ${partner.apellido_p ? partner.apellido_p.charAt(0) + '.' : ''}` : 'Proveedor Eliminado',
                            partnerPhoto: partner?.foto_perfil,
                            lastMessage: lastMsg || '',
                            updatedAt: conv.updated_at
                        };
                    });
                    setConversations(parsed);
                }
            } catch (err) {
                console.error("Error cargando conversaciones:", err);
            } finally {
                if (isMounted) setIsLoadingConversations(false);
            }
        };

        // 3. Fetch Favoritos
        const loadFavorites = async () => {
            try {
                const { data, error } = await supabase
                    .from('favoritos')
                    .select(`
                        id,
                        servicio_id,
                        servicios_publicados (
                            titulo,
                            fotos,
                            precio_desde,
                            unidad_precio,
                            proveedores (
                                nombre,
                                apellido_p
                            )
                        )
                    `)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (error && error.code === '42P01') {
                    // La tabla 'favoritos' no existe (relation does not exist)
                    setHasFavoritesError(true);
                } else if (!error && data) {
                    const parsedFavs = data.map((item: any) => {
                        const sp = item.servicios_publicados;
                        // proveedores can be an array or object depending on relation, usually object for many-to-one
                        const prov = Array.isArray(sp?.proveedores) ? sp.proveedores[0] : sp?.proveedores;
                        return {
                            id: item.id,
                            servicio_id: item.servicio_id,
                            titulo: sp?.titulo || 'Servicio no disponible',
                            foto: sp?.fotos && sp.fotos.length > 0 ? sp.fotos[0] : undefined,
                            precio_desde: sp?.precio_desde,
                            unidad_precio: sp?.unidad_precio,
                            proveedor_nombre: prov ? `${prov.nombre} ${prov.apellido_p ? prov.apellido_p.charAt(0) + '.' : ''}` : 'Proveedor'
                        };
                    });
                    setFavorites(parsedFavs);
                } else {
                    setHasFavoritesError(true);
                }
            } catch (err) {
                setHasFavoritesError(true);
            } finally {
                if (isMounted) setIsLoadingFavorites(false);
            }
        };

        // 4. Fetch Servicios contactados (DISTINCT por servicio, últimos 6)
        const loadContactedServices = async () => {
            try {
                const { data, error } = await supabase
                    .from('conversations')
                    .select(`
                        id,
                        created_at,
                        servicios_publicados!inner(
                            id, titulo, fotos, precio_desde, unidad_precio,
                            proveedores!inner(nombre, apellido_p, foto_perfil)
                        )
                    `)
                    .eq('client_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (!error && data) {
                    // DISTINCT by servicio_id
                    const seen = new Set<string>();
                    const unique: any[] = [];
                    for (const conv of data) {
                        const sp = conv.servicios_publicados as any;
                        if (!sp?.id || seen.has(sp.id)) continue;
                        seen.add(sp.id);
                        const prov = Array.isArray(sp.proveedores) ? sp.proveedores[0] : sp.proveedores;
                        unique.push({
                            conversation_id: conv.id,
                            servicio_id: sp.id,
                            titulo: sp.titulo,
                            foto: sp.fotos?.[0] || null,
                            precio_desde: sp.precio_desde,
                            unidad_precio: sp.unidad_precio,
                            proveedor_nombre: prov ? `${prov.nombre} ${prov.apellido_p ? prov.apellido_p.charAt(0) + '.' : ''}` : 'Proveedor',
                        });
                        if (unique.length >= 6) break;
                    }
                    if (isMounted) setContactedServices(unique);
                }
            } catch (err) {
                console.error('Error cargando servicios contactados:', err);
            }
        };

        loadPets();
        loadConversations();
        loadFavorites();
        loadContactedServices();

        return () => { isMounted = false; };
    }, [user]);

    // Helpers Interacciones
    const handleRemoveFavorite = async (idToRemove: string) => {
        setFavorites(prev => prev.filter(f => f.id !== idToRemove));
        try {
            await supabase.from('favoritos').delete().eq('id', idToRemove);
        } catch (err) {
            console.error("Error al quitar favorito:", err);
        }
    };

    const dismissBanner = () => {
        if (user && typeof window !== 'undefined') {
            localStorage.setItem(`pawnecta_onboarded_${user.id}`, '1');
        }
        setShowBanner(false);
    };

    if (!user) return <div className="p-8 text-center text-slate-500">Cargando panel...</div>;

    const firstName = profile?.nombre || 'Usuario';

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-12">

            {/* --- WELCOME BANNER (first visit only) --- */}
            {showBanner && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="font-bold text-slate-900">Bienvenido a Pawnecta, {firstName}</h2>
                            <p className="text-sm text-slate-600 mt-1">
                                Empieza por agregar el perfil de tu mascota para que los proveedores la conozcan.
                            </p>
                            <div className="flex flex-wrap gap-3 mt-4">
                                <Link
                                    href="/usuario/mascotas/nueva"
                                    className="bg-emerald-700 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-emerald-800 transition-colors"
                                >
                                    Agregar mi mascota
                                </Link>
                                <Link
                                    href="/explorar"
                                    className="bg-white border border-emerald-200 text-emerald-700 text-sm font-bold px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors"
                                >
                                    Buscar proveedores
                                </Link>
                            </div>
                        </div>
                        <button onClick={dismissBanner} aria-label="Cerrar" className="text-slate-400 hover:text-slate-600 shrink-0 mt-0.5">
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* --- WELCOME HEADER --- */}
            <section className="bg-white border border-slate-200 rounded-2xl p-6 mb-2">
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    Bienvenido de vuelta
                </p>
                <h1 className="text-2xl font-bold text-slate-900">{firstName}</h1>
                <p className="text-slate-500 mt-1 max-w-xl">
                    Desde aquí puedes gestionar tus mascotas y encontrar proveedores en tu zona.
                </p>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* --- SECCIÓN 1: Mis Mascotas (Ocupa 2/3 en desktop) --- */}
                <section className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                            <PawPrint className="text-emerald-500" />
                            Mis mascotas
                        </h2>
                        <Link
                            href="/usuario/mascotas/nueva"
                            className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-full px-4 py-2 text-sm font-bold flex items-center gap-2 transition-colors"
                        >
                            <PlusCircle size={18} />
                            Agregar mascota
                        </Link>
                    </div>

                    {isLoadingPets ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[1, 2].map(i => (
                                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm animate-pulse flex items-center gap-4">
                                    <div className="w-16 h-16 bg-slate-200 rounded-full shrink-0" />
                                    <div className="space-y-2 flex-1">
                                        <div className="h-5 w-24 bg-slate-200 rounded-md" />
                                        <div className="h-4 w-16 bg-slate-100 rounded-md" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : pets.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {pets.map(pet => (
                                <Link key={pet.id} href={`/usuario/mascotas/${pet.id}`}>
                                    <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 hover:border-emerald-200 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group cursor-pointer">
                                        <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200 group-hover:border-emerald-300">
                                            {pet.foto ? (
                                                <img src={pet.foto} alt={pet.nombre} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    <PawPrint size={24} />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg group-hover:text-emerald-700 transition-colors">{pet.nombre}</h3>
                                            <p className="text-sm text-slate-500 capitalize">{pet.especie} {pet.raza ? `• ${pet.raza}` : ''}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-300 mb-4 shadow-sm border border-slate-100">
                                <PawPrint size={32} />
                            </div>
                            <h3 className="text-slate-700 font-bold mb-1">Aún no has agregado mascotas</h3>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto mb-4">Crea un perfil para tu mascota para que los cuidadores la conozcan mejor.</p>
                            <Link
                                href="/usuario/mascotas/nueva"
                                className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-sm"
                            >
                                Registrar mi mascota
                            </Link>
                        </div>
                    )}
                </section>


                {/* --- SECCIÓN 2 & 3: Sidebar Derecha (Ocupa 1/3) --- */}
                <div className="space-y-8">

                    {/* Conversaciones Recientes */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                            <MessagesSquare className="text-blue-500" />
                            Mensajes
                        </h2>

                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                            {isLoadingConversations ? (
                                <div className="space-y-4">
                                    {[1, 2].map(i => (
                                        <div key={i} className="flex gap-3 items-center animate-pulse">
                                            <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0" />
                                            <div className="space-y-2 flex-1">
                                                <div className="h-4 w-20 bg-slate-200 rounded" />
                                                <div className="h-3 w-full bg-slate-100 rounded" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : conversations.length > 0 ? (
                                <div className="space-y-4">
                                    {conversations.map(conv => (
                                        <Link key={conv.id} href={`/mensajes?id=${conv.id}`} className="block group">
                                            <div className="flex items-center gap-3 p-2 -mx-2 rounded-xl group-hover:bg-slate-50 transition-colors">
                                                <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                                    {conv.partnerPhoto ? (
                                                        <img src={conv.partnerPhoto} alt={conv.partnerName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex justify-center items-center text-slate-400 font-bold">
                                                            {conv.partnerName.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline mb-0.5">
                                                        <p className="font-bold text-slate-900 text-sm truncate">{conv.partnerName}</p>
                                                        <span className="text-[10px] text-slate-400 shrink-0">
                                                            {new Date(conv.updatedAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 truncate group-hover:text-blue-600 transition-colors">
                                                        {conv.lastMessage}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                    <div className="pt-2">
                                        <Link href="/mensajes" className="text-sm font-bold text-blue-600 hover:text-blue-700 block text-center">
                                            Ver todos mis mensajes &rarr;
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-slate-500">
                                    <MessagesSquare size={32} className="mx-auto text-slate-200 mb-2" />
                                    <p className="text-sm">Sin conversaciones activas.</p>
                                    <p className="text-xs text-slate-400 mt-1">Busca un proveedor y escríbele.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Servicios Favoritos */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                            <Bookmark className="text-amber-500" />
                            Favoritos
                        </h2>

                        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center">
                            {isLoadingFavorites ? (
                                <div className="animate-pulse space-y-3">
                                    <div className="h-4 w-3/4 bg-slate-200 rounded mx-auto" />
                                    <div className="h-3 w-1/2 bg-slate-100 rounded mx-auto" />
                                </div>
                            ) : hasFavoritesError || favorites.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-3">
                                        <Bookmark size={20} />
                                    </div>
                                    <p className="text-slate-500 text-sm font-medium">
                                        Próximamente podrás guardar tus servicios favoritos
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4 text-left">
                                    {favorites.map(fav => (
                                        <Link key={fav.id} href={`/servicio/${fav.servicio_id}`} className="block group">
                                            <div className="flex gap-3 p-2 -mx-2 rounded-xl group-hover:bg-slate-50 transition-colors relative border border-transparent group-hover:border-slate-100">
                                                <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                                    {fav.foto ? (
                                                        <img src={fav.foto} alt={fav.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                    ) : (
                                                        <div className="w-full h-full flex justify-center items-center text-slate-400">
                                                            <PawPrint size={20} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 py-0.5">
                                                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2 group-hover:text-emerald-700 transition-colors pr-8">
                                                        {fav.titulo}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 mt-1 truncate">{fav.proveedor_nombre}</p>
                                                    <p className="font-bold text-slate-900 text-sm mt-0.5">
                                                        ${fav.precio_desde?.toLocaleString('es-CL')} <span className="text-[10px] font-normal text-slate-500">/ {fav.unidad_precio}</span>
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleRemoveFavorite(fav.id);
                                                    }}
                                                    className="absolute top-2 right-0 w-8 h-8 bg-white/90 rounded-full shadow-sm flex items-center justify-center hover:scale-110 transition-transform duration-150 border border-slate-100 z-10"
                                                    aria-label="Quitar de favoritos"
                                                    title="Quitar"
                                                >
                                                    <Heart fill="currentColor" size={16} className="text-red-500" />
                                                </button>
                                            </div>
                                        </Link>
                                    ))}
                                    <div className="pt-2 border-t border-slate-100 mt-2">
                                        <Link href="/explorar" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 block text-center mt-2">
                                            Buscar más servicios &rarr;
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {/* --- SECCIÓN: Servicios que has consultado --- */}
            {contactedServices.length > 0 && (
                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Servicios que has consultado</h2>
                    <div className="overflow-x-auto pb-2">
                        <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                            {contactedServices.map(item => (
                                <div key={item.servicio_id} className="w-56 shrink-0 border border-slate-200 rounded-xl shadow-sm overflow-hidden bg-white">
                                    <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                                        {item.foto ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={item.foto} alt={item.titulo} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <PawPrint size={28} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <h3 className="font-bold text-slate-900 text-sm line-clamp-2 mb-0.5">{item.titulo}</h3>
                                        <p className="text-xs text-slate-500 mb-3">{item.proveedor_nombre}</p>
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/servicio/${item.servicio_id}`}
                                                className="flex-1 text-center text-xs font-bold bg-emerald-50 text-emerald-700 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                                            >
                                                Ver servicio
                                            </Link>
                                            <Link
                                                href={`/mensajes?id=${item.conversation_id}`}
                                                className="flex-1 text-center text-xs font-bold bg-slate-100 text-slate-700 py-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                                            >
                                                Ver chat
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* --- SECCIÓN 4: Explorar CTA --- */}
            <section className="mt-8">
                <div className="bg-slate-900 rounded-2xl p-8 md:p-12 text-center shadow-2xl relative overflow-hidden">
                    {/* Deco cercles */}
                    <div className="absolute -top-24 -left-20 w-64 h-64 bg-slate-800 rounded-full opacity-50 blur-3xl"></div>
                    <div className="absolute -bottom-24 -right-20 w-64 h-64 bg-emerald-900 rounded-full opacity-30 blur-3xl"></div>

                    <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                        <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl mb-2 backdrop-blur-sm">
                            <Search size={32} className="text-emerald-400" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white">Encuentra al cuidador ideal</h2>
                        <p className="text-slate-300 text-lg mx-auto">
                            Revisa cientos de perfiles verificados de cuidadores de mascotas cerca de ti y organiza tu próximo viaje con tranquilidad absoluta.
                        </p>
                        <div className="pt-4">
                            <Link
                                href="/explorar"
                                className="inline-flex items-center justify-center h-14 px-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-lg shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:-translate-y-1 transition-all"
                            >
                                Buscar Servicios
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
}
