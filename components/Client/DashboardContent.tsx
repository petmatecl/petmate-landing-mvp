import Head from "next/head";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import DateRangeAirbnb from "../DateRangeAirbnb";
import PetsSelectorAirbnb, { PetsValue } from "../PetsSelectorAirbnb";
import MyPetsSelector from "./MyPetsSelector";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import PetCard, { Pet } from "./PetCard";
import ModalAlert from "../ModalAlert";
import AddressCard, { Address } from "./AddressCard";
import AddressFormModal from "./AddressFormModal";
import TripCard, { Trip } from "./TripCard";
import { useClientData } from "./ClientContext";
import { Home, Hotel, Calendar, MapPin, Plus } from "lucide-react";
import { useRouter } from "next/router";

export default function DashboardContent() {
    const router = useRouter();
    const { userId, addresses, loadingAddresses, refreshAddresses } = useClientData();

    const [nombre, setNombre] = useState<string | null>(null);
    const [clientProfile, setClientProfile] = useState<any>(null);

    // Estado del buscador
    const [rango, setRango] = useState<DateRange | undefined>();
    const [servicio, setServicio] = useState("domicilio");
    const [mascotas, setMascotas] = useState<PetsValue>({ dogs: 0, cats: 0 });

    // Nueva lógica: Selección de mascotas específicas
    const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);

    // Estado de gestión de mascotas
    const [myPets, setMyPets] = useState<Pet[]>([]);
    const [loadingPets, setLoadingPets] = useState(true);

    // Address State (for local Modal)
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);

    // Trips State
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loadingTrips, setLoadingTrips] = useState(true);
    const [showTripForm, setShowTripForm] = useState(false);
    const [selectedAddressId, setSelectedAddressId] = useState<string>("");

    useEffect(() => {
        if (userId) {
            // Fetch specific dashboard data
            fetchPets(userId);
            fetchClientProfile(userId);
            fetchTrips(userId);
        }
    }, [userId]);

    async function fetchTrips(uid: string) {
        try {
            setLoadingTrips(true);
            const { data, error } = await supabase
                .from("viajes")
                .select("*")
                .eq("user_id", uid)
                .order("fecha_inicio", { ascending: true });

            if (error) throw error;

            // Get unique sitter IDs
            const sitterIds = Array.from(new Set(data.filter((t: any) => t.sitter_id).map((t: any) => t.sitter_id)));
            let sittersMap: any = {};

            if (sitterIds.length > 0) {
                const { data: sitters } = await supabase
                    .from("registro_petmate")
                    .select("auth_user_id, nombre, apellido_p, foto_perfil, id") // Fetch needed fields
                    .in("auth_user_id", sitterIds);

                if (sitters) {
                    sitters.forEach(s => {
                        sittersMap[s.auth_user_id] = s;
                    });
                }
            }

            const tripsWithStatus = data.map((t: any) => ({
                ...t,
                sitter_asignado: !!t.sitter_id,
                sitter: t.sitter_id ? sittersMap[t.sitter_id] : null
            }));

            setTrips(tripsWithStatus as Trip[]);

            if (data.length === 0) setShowTripForm(true);

        } catch (err) {
            console.error("Error fetching trips:", err);
        } finally {
            setLoadingTrips(false);
        }
    }

    async function fetchClientProfile(uid: string) {
        const { data } = await supabase.from("registro_petmate").select("*").eq("auth_user_id", uid).single();
        if (data) {
            setClientProfile(data);
            if (data.nombre && !nombre) setNombre(data.nombre);

            if (data.mascotas_viaje && Array.isArray(data.mascotas_viaje)) {
                setSelectedPetIds(data.mascotas_viaje);
            } else {
                setMascotas({ dogs: data.perros || 0, cats: data.gatos || 0 });
            }

            if (data.fecha_inicio && data.fecha_fin) {
                setRango({ from: new Date(data.fecha_inicio), to: new Date(data.fecha_fin) });
            }
        }
    }

    async function fetchPets(uid: string) {
        try {
            setLoadingPets(true);
            const { data, error } = await supabase
                .from("mascotas")
                .select("*")
                .eq("user_id", uid)
                .order("created_at", { ascending: false });

            if (error) throw error;

            if (data) {
                setMyPets(data as Pet[]);
            }
        } catch (err) {
            console.error("Error fetching pets:", err);
        } finally {
            setLoadingPets(false);
        }
    }

    useEffect(() => {
        if (myPets.length > 0 && selectedPetIds.length > 0) {
            const selected = myPets.filter(p => selectedPetIds.includes(p.id));
            // Case insensitive check
            const dogs = selected.filter(p => p.tipo?.toLowerCase() === 'perro').length;
            const cats = selected.filter(p => p.tipo?.toLowerCase() === 'gato').length;
            setMascotas({ dogs, cats });
        }
    }, [myPets, selectedPetIds]);

    const handleEdit = (pet: Pet) => {
        router.push(`/cliente/mascotas/${pet.id}`);
    };

    const handleAdd = () => {
        router.push("/cliente/mascotas/nueva");
    };

    // Modal Alert State
    const [alertConfig, setAlertConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        setAlertConfig({ isOpen: true, title, message, type });
    };

    const closeAlert = () => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
    };

    // --- Address Handlers ---
    const handleAddAddress = () => {
        setEditingAddress(null);
        setIsAddressModalOpen(true);
    };

    const handleEditAddress = (addr: Address) => {
        setEditingAddress(addr);
        setIsAddressModalOpen(true);
    };

    const handleAddressSaved = () => {
        refreshAddresses(); // Refresh global context
    };

    const handleDeleteAddress = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta dirección?")) return;
        try {
            const { error } = await supabase.from("direcciones").delete().eq("id", id);
            if (error) throw error;
            refreshAddresses(); // Refresh global context
            showAlert("Dirección eliminada", "La dirección ha sido eliminada correctamente.", "success");
        } catch (err: any) {
            console.error(err);
            showAlert("Error", "No se pudo eliminar la dirección.", "error");
        }
    };

    const handleDeleteTrip = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este viaje?")) return;
        try {
            const { error } = await supabase.from("viajes").delete().eq("id", id);
            if (error) throw error;
            if (userId) fetchTrips(userId);
            showAlert("Viaje eliminado", "El viaje ha sido eliminado correctamente.", "success");
        } catch (err: any) {
            console.error(err);
            showAlert("Error", "No se pudo eliminar el viaje.", "error");
        }
    };

    const handleEditTripNew = (trip: Trip) => {
        if (trip.fecha_inicio && trip.fecha_fin) {
            setRango({ from: new Date(trip.fecha_inicio), to: new Date(trip.fecha_fin) });
        }
        setServicio(trip.servicio);
        if (trip.mascotas_ids && Array.isArray(trip.mascotas_ids)) {
            setSelectedPetIds(trip.mascotas_ids);
        }
        setMascotas({ dogs: trip.perros, cats: trip.gatos });

        setShowTripForm(true);
        const formElement = document.getElementById("trip-form-section");
        if (formElement) formElement.scrollIntoView({ behavior: "smooth" });

        if (trip.direccion_id) {
            setSelectedAddressId(trip.direccion_id);
        } else {
            setSelectedAddressId("");
        }
    };

    const handleSaveTrip = async () => {
        if (!userId) return;

        try {
            if (!rango?.from || !rango?.to) {
                showAlert('Fechas requeridas', 'Por favor selecciona las fechas de inicio y fin.', 'warning');
                return;
            }
            if (mascotas.dogs === 0 && mascotas.cats === 0) {
                showAlert('Mascotas requeridas', 'Debes indicar cuántos perros y/o gatos viajarán.', 'warning');
                return;
            }

            const payload: any = {
                user_id: userId,
                fecha_inicio: format(rango.from, 'yyyy-MM-dd'),
                fecha_fin: format(rango.to, 'yyyy-MM-dd'),
                servicio,
                perros: mascotas.dogs,
                gatos: mascotas.cats,
                mascotas_ids: selectedPetIds, // Ensure this matches DB column types
                estado: 'borrador'
            };

            if (servicio === 'domicilio') {
                if (!selectedAddressId) {
                    showAlert('Dirección requerida', 'Para servicio a domicilio debes seleccionar una dirección.', 'warning');
                    return;
                }
                payload.direccion_id = selectedAddressId;
            }

            console.log("Saving trip payload:", payload);

            const { error } = await supabase.from("viajes").insert(payload);

            if (error) {
                console.error("Error saving trip:", error);
                // If column doesn't exist, this will throw
                showAlert('Error', `Error guardando el viaje: ${error.message}`, 'error');
            } else {
                await fetchTrips(userId);
                setRango(undefined);
                setSelectedPetIds([]);
                setMascotas({ dogs: 0, cats: 0 });
                setShowTripForm(false);
                showAlert('¡Viaje Registrado!', 'Tu viaje ha sido creado con éxito.', 'success');
            }

        } catch (e) {
            console.error(e);
            showAlert('Error', 'Ocurrió un error inesperado.', 'error');
        }
    };

    const hasPets = myPets.length > 0;

    return (
        <div className="space-y-8">
            {/* SECTION: Mis Viajes & Crear Viaje */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Calendar className="text-emerald-600" /> Tus Viajes
                    </h2>
                    {!showTripForm && (
                        <button
                            onClick={() => setShowTripForm(true)}
                            className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center gap-2"
                        >
                            <Plus size={16} /> Nuevo Viaje
                        </button>
                    )}
                </div>

                {/* Lista de Viajes */}
                {!loadingTrips && trips.length > 0 && !showTripForm && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {trips.map(trip => (
                            <TripCard
                                key={trip.id}
                                trip={trip}
                                onEdit={handleEditTripNew}
                                onDelete={handleDeleteTrip}
                                petNames={myPets.filter(p => trip.mascotas_ids?.includes(p.id)).map(p => p.nombre).join(", ")}
                            />
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loadingTrips && trips.length === 0 && !showTripForm && (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center mb-8">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✈️</div>
                        <h3 className="text-lg font-bold text-slate-900">Aún no tienes viajes planeados</h3>
                        <p className="text-slate-500 mb-6 max-w-md mx-auto">Crea un viaje para que los sitters disponibles puedan postular y cuidar a tus mascotas.</p>
                        <button
                            onClick={() => setShowTripForm(true)}
                            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg"
                        >
                            Planear mi primer viaje
                        </button>
                    </div>
                )}

                {/* Formulario de Creación / Edición */}
                {showTripForm && (
                    <div id="trip-form-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[100px] -mr-16 -mt-16 z-0"></div>

                        <div className="flex items-center justify-between relative z-10 mb-6">
                            <h3 className="text-lg font-bold text-slate-900">
                                {rango ? 'Editando Viaje' : 'Planear Nuevo Viaje'}
                            </h3>
                            <button onClick={() => setShowTripForm(false)} className="text-sm text-slate-500 hover:text-slate-800 underline">
                                Cancelar
                            </button>
                        </div>

                        <div className="relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                {/* Fecha */}
                                <div className="md:col-span-12 xl:col-span-5 flex flex-col h-full">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 h-4">
                                        Fechas del viaje
                                    </label>
                                    <DateRangeAirbnb className="w-full" value={rango} onChange={setRango} hideLabel />
                                </div>

                                {/* Servicio */}
                                <div className="md:col-span-12 xl:col-span-3 flex flex-col h-full">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 h-4">
                                        Tipo de Servicio
                                    </label>
                                    <div className="flex flex-col gap-2 flex-1">
                                        <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${servicio === 'domicilio' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-sm' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}>
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${servicio === 'domicilio' ? 'border-emerald-500 bg-white' : 'border-slate-300 bg-white'}`}>
                                                {servicio === 'domicilio' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                                            </div>
                                            <input type="radio" name="servicio" value="domicilio" checked={servicio === 'domicilio'} onChange={(e) => setServicio(e.target.value)} className="hidden" />
                                            <div className="flex items-center gap-2">
                                                <Home size={18} />
                                                <span className="text-sm">Domicilio</span>
                                            </div>
                                        </label>
                                        <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${servicio === 'hospedaje' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-sm' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}>
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${servicio === 'hospedaje' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-sm' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}>
                                                {servicio === 'hospedaje' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                                            </div>
                                            <input type="radio" name="servicio" value="hospedaje" checked={servicio === 'hospedaje'} onChange={(e) => setServicio(e.target.value)} className="hidden" />
                                            <div className="flex items-center gap-2">
                                                <Hotel size={18} />
                                                <span className="text-sm">Hospedaje</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="md:col-span-12 xl:col-span-4 flex flex-col h-full">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 h-4">
                                        Mascotas
                                    </label>
                                    {hasPets ? (
                                        <MyPetsSelector
                                            myPets={myPets}
                                            selectedIds={selectedPetIds}
                                            onChange={(ids, counts) => {
                                                setSelectedPetIds(ids);
                                                setMascotas(counts);
                                            }}
                                            hideLabel
                                        />
                                    ) : (
                                        <PetsSelectorAirbnb
                                            value={mascotas}
                                            onChange={setMascotas}
                                            className="w-full"
                                            hideLabel
                                        />
                                    )}
                                </div>


                                {/* Dirección (Solo Domicilio) */}
                                {servicio === 'domicilio' && (
                                    <div className="md:col-span-12">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                                            Dirección del Servicio
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {addresses.map(addr => (
                                                <label key={addr.id} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedAddressId === addr.id ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-emerald-300 bg-white'}`}>
                                                    <div className="mt-0.5">
                                                        <input
                                                            type="radio"
                                                            name="tripAddress"
                                                            value={addr.id}
                                                            checked={selectedAddressId === addr.id}
                                                            onChange={(e) => setSelectedAddressId(e.target.value)}
                                                            className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-900 text-sm">{addr.nombre}</span>
                                                            {addr.es_principal && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">Principal</span>}
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{addr.direccion_completa}</p>
                                                    </div>
                                                </label>
                                            ))}

                                            <button
                                                onClick={handleAddAddress}
                                                className="flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all font-medium text-sm h-full min-h-[80px]"
                                            >
                                                <Plus size={18} /> Nueva Dirección
                                            </button>
                                        </div>
                                        {addresses.length === 0 && (
                                            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                                ⚠️ Necesitas agregar una dirección para solicitar servicio a domicilio.
                                            </p>
                                        )}
                                    </div>
                                )}

                            </div>

                            <div className="mt-8 flex justify-end">
                                <button
                                    onClick={handleSaveTrip}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-slate-900/20 active:scale-95"
                                >
                                    {loadingTrips ? 'Guardando...' : 'Guardar Viaje'} <span className="text-slate-400 text-sm font-normal">({rango?.from ? format(rango.from, 'd MMM', { locale: es }) : '...'})</span> ✈️
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Mis Mascotas */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-slate-900">Mis Mascotas</h2>
                    <button onClick={handleAdd} className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-1 rounded hover:bg-emerald-100 transition-colors">+ Agregar</button>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px] pr-1">
                    {loadingPets ? (
                        <p className="text-xs text-slate-400">Cargando...</p>
                    ) : myPets.length > 0 ? (
                        myPets.map(pet => (
                            <PetCard key={pet.id} pet={pet} onEdit={handleEdit} />
                        ))
                    ) : (
                        <div className="text-center py-6">
                            <span className="text-2xl block mb-2">🐾</span>
                            <p className="text-xs text-slate-500">Agrega a tus peludos aquí.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* 3. Empty History / Others */}
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">Historial y Favoritos</h2>
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    Aún no tienes historial. Tus reservas pasadas aparecerán aquí.
                </div>
            </section>

            {/* Modal Dirección */}
            {userId && (
                <AddressFormModal
                    isOpen={isAddressModalOpen}
                    onClose={() => setIsAddressModalOpen(false)}
                    onSaved={handleAddressSaved}
                    initialData={editingAddress}
                    userId={userId}
                />
            )}

            <ModalAlert
                isOpen={alertConfig.isOpen}
                onClose={closeAlert}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
            />
        </div>
    );
}
