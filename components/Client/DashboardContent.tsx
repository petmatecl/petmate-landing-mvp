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
import ModalConfirm from "../ModalConfirm";
import AddressCard, { Address } from "./AddressCard";
import AddressFormModal from "./AddressFormModal";
import TripCard, { Trip } from "./TripCard";
import ApplicationsModal from "./ApplicationsModal"; // Import Modal
import { useClientData } from "./ClientContext";
import { Home, Hotel, Calendar, MapPin, Plus, PawPrint, User, FileText, Save, Phone, X, CheckCircle2, Clock } from "lucide-react";
import { useRouter } from "next/router";
import AddressAutocomplete from "../AddressAutocomplete";
import dynamic from "next/dynamic";

export default function DashboardContent() {
    const router = useRouter();
    const { userId, addresses, loadingAddresses, refreshAddresses } = useClientData();

    // Dynamic Map
    const LocationMap = dynamic(() => import("../Shared/LocationMap"), {
        ssr: false,
        loading: () => <div className="h-48 w-full bg-slate-100 animate-pulse rounded-lg" />
    });

    const [nombre, setNombre] = useState<string | null>(null);
    const [clientProfile, setClientProfile] = useState<any>(null);

    // Profile Form State
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileFormData, setProfileFormData] = useState({
        nombre: '',
        apellido_p: '',
        rut: '',
        telefono: '',
        latitud: null as number | null,
        longitud: null as number | null,
        videos: [] as string[],
        consentimiento_rrss: false,
        comuna: '',
        region: ''
    });

    // Estado del buscador
    const [rango, setRango] = useState<DateRange | undefined>();
    const [servicio, setServicio] = useState("domicilio");
    const [mascotas, setMascotas] = useState<PetsValue>({ dogs: 0, cats: 0 });

    // Nueva lógica: Selección de mascotas específicas
    const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);

    // Tab State
    const [activeTab, setActiveTab] = useState<'datos' | 'solicitudes' | 'mascotas' | 'direcciones'>('solicitudes');

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

    // Applications Modal State
    const [isAppsModalOpen, setIsAppsModalOpen] = useState(false);
    const [selectedTripAppsId, setSelectedTripAppsId] = useState<string | null>(null);

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
                    .select("auth_user_id, nombre, apellido_p, foto_perfil, id, telefono, email, direccion_completa, region, comuna, calle, numero") // Fetch needed fields
                    .in("auth_user_id", sitterIds);

                if (sitters) {
                    sitters.forEach(s => {
                        sittersMap[s.auth_user_id] = s;
                    });
                }
            }

            // Fetch applications count for these trips
            const tripIds = data.map((t: any) => t.id);
            let appCountsMap: any = {};

            if (tripIds.length > 0) {
                const { data: apps } = await supabase
                    .from("postulaciones")
                    .select("viaje_id, estado")
                    .in("viaje_id", tripIds); // Fetch all apps for these trips

                if (apps) {
                    apps.forEach((app: any) => {
                        if (!appCountsMap[app.viaje_id]) appCountsMap[app.viaje_id] = 0;
                        if (app.estado === 'pendiente') { // Only count pending? Or all? Let's count pending for badge
                            appCountsMap[app.viaje_id]++;
                        }
                    });
                }
            }

            const tripsWithStatus = data.map((t: any) => ({
                ...t,
                sitter_asignado: !!t.sitter_id,
                sitter: t.sitter_id ? sittersMap[t.sitter_id] : null,
                postulaciones_count: appCountsMap[t.id] || 0
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

            // Populate Form Data
            setProfileFormData({
                nombre: data.nombre || '',
                apellido_p: data.apellido_p || '',
                rut: data.rut || '',
                telefono: data.telefono || '',
                latitud: data.latitud,
                longitud: data.longitud,
                videos: data.videos || [],
                consentimiento_rrss: data.consentimiento_rrss || false,
                comuna: data.comuna || '',
                region: data.region || ''
            });

            if (data.mascotas_viaje && Array.isArray(data.mascotas_viaje)) {
                setSelectedPetIds(data.mascotas_viaje);
            } else {
                setMascotas({ dogs: data.perros || 0, cats: data.gatos || 0 });
            }

            if (data.fecha_inicio && data.fecha_fin) {
                setRango({ from: new Date(data.fecha_inicio + "T12:00:00"), to: new Date(data.fecha_fin + "T12:00:00") });
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

    // Privacy Notice State
    const [showSecurityNotice, setShowSecurityNotice] = useState(true);
    const isClientIncomplete = !clientProfile?.nombre || !clientProfile?.apellido_p || !clientProfile?.telefono || !clientProfile?.region || !clientProfile?.comuna;

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        setAlertConfig({ isOpen: true, title, message, type });
    };

    const closeAlert = () => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
    };

    // Confirmation Modal State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        confirmText?: string;
        cancelText?: string;
        isDestructive?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        isDestructive: false
    });

    const closeConfirm = () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
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

    const handleDeleteAddress = (id: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "Eliminar Dirección",
            message: "¿Estás seguro de que deseas eliminar esta dirección? Esta acción no se puede deshacer.",
            confirmText: "Eliminar",
            isDestructive: true,
            onConfirm: async () => {
                try {
                    const { error } = await supabase.from("direcciones").delete().eq("id", id);
                    if (error) throw error;
                    refreshAddresses(); // Refresh global context
                    showAlert("Dirección eliminada", "La dirección ha sido eliminada correctamente.", "success");
                } catch (err: any) {
                    console.error(err);
                    showAlert("Error", "No se pudo eliminar la dirección.", "error");
                }
                closeConfirm();
            }
        });
    };

    const handleSetDefaultAddress = async (addressId: string) => {
        if (!userId) return;
        try {
            // 1. Set all to false
            await supabase.from('direcciones').update({ es_principal: false }).eq('user_id', userId);

            // 2. Set selected to true
            const { error } = await supabase.from('direcciones').update({ es_principal: true }).eq('id', addressId);

            if (error) throw error;

            await refreshAddresses();
            showAlert('Dirección actualizada', 'Se ha establecido la dirección principal.', 'success');
        } catch (error) {
            console.error(error);
            showAlert('Error', 'No se pudo actualizar la dirección principal.', 'error');
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingProfile(true);

        try {
            const { error } = await supabase
                .from('registro_petmate')
                .update({
                    nombre: profileFormData.nombre,
                    apellido_p: profileFormData.apellido_p,
                    rut: profileFormData.rut,
                    telefono: profileFormData.telefono,
                    latitud: profileFormData.latitud,
                    longitud: profileFormData.longitud,
                    videos: profileFormData.videos.filter(v => v.trim() !== ''),
                    consentimiento_rrss: profileFormData.consentimiento_rrss
                })
                .eq('auth_user_id', userId);

            if (error) throw error;

            await fetchClientProfile(userId!); // Refresh data
            showAlert('Perfil actualizado', 'Tus datos han sido guardados correctamente.', 'success');
        } catch (err: any) {
            console.error(err);
            showAlert('Error', 'Error al actualizar el perfil: ' + err.message, 'error');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfileFormData({ ...profileFormData, [e.target.name]: e.target.value });
    };

    // Helper: Rut Formatter
    const formatRut = (value: string) => {
        const cleaned = value.replace(/[^\dKk]/g, '');
        if (cleaned.length <= 1) return cleaned;

        const body = cleaned.slice(0, -1);
        const dv = cleaned.slice(-1).toUpperCase();

        return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
    };

    const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const formatted = formatRut(val);
        setProfileFormData({ ...profileFormData, rut: formatted });
    };

    // Calculate Completion Status
    const isProfileComplete = Boolean(profileFormData.nombre && profileFormData.apellido_p && profileFormData.rut && profileFormData.telefono && profileFormData.latitud && profileFormData.comuna);
    const isPetsComplete = myPets.length > 0;
    const isAddressesComplete = addresses.length > 0;

    const handleDeleteTrip = (id: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "Eliminar Solicitud",
            message: "¿Estás seguro de que deseas eliminar este viaje? Si ya tienes un sitter asigando, se le notificará la cancelación.",
            confirmText: "Eliminar",
            isDestructive: true,
            onConfirm: async () => {
                try {
                    const { error } = await supabase.from("viajes").delete().eq("id", id);
                    if (error) throw error;
                    if (userId) fetchTrips(userId);
                    showAlert("Viaje eliminado", "El viaje ha sido eliminado correctamente.", "success");
                } catch (err: any) {
                    console.error(err);
                    showAlert("Error", "No se pudo eliminar el viaje.", "error");
                }
                closeConfirm();
            }
        });
    };

    const handleRemoveSitter = (tripId: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "Cancelar Servicio",
            message: "¿Estás seguro de que deseas cancelar el servicio con este Sitter? Tu solicitud volverá a estar pública para recibir nuevas ofertas.",
            confirmText: "Sí, Cancelar Servicio",
            isDestructive: true,
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from("viajes")
                        .update({
                            sitter_id: null,
                            estado: 'publicado'
                        })
                        .eq("id", tripId);

                    if (error) throw error;

                    if (userId) fetchTrips(userId);
                    showAlert("Sitter Desvinculado", "El sitter ha sido removido de tu viaje. Tu solicitud vuelve a estar pública.", "success");
                } catch (err: any) {
                    console.error(err);
                    showAlert("Error", "No se pudo remover al sitter.", "error");
                }
                closeConfirm();
            }
        });
    };

    const [editingTripId, setEditingTripId] = useState<string | null>(null);

    // ... (existing code)

    const handleEditTripNew = (trip: Trip) => {
        setEditingTripId(trip.id);
        if (trip.fecha_inicio && trip.fecha_fin) {
            setRango({ from: new Date(trip.fecha_inicio + "T12:00:00"), to: new Date(trip.fecha_fin + "T12:00:00") });
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

    // --- New Application Handlers ---
    const handleViewApplications = (trip: Trip) => {
        setSelectedTripAppsId(trip.id);
        setIsAppsModalOpen(true);
    };

    const handleAppAccepted = () => {
        if (userId) fetchTrips(userId); // Refresh trips to show new status and assigned sitter
        showAlert("¡Sitter Aceptado!", "Has reservado tu servicio con éxito. ¡Ponte en contacto con tu sitter!", "success");
    };

    const handleSearchSitter = (trip: Trip) => {
        const params = new URLSearchParams();

        // 1. Pet Type Logic
        if (trip.perros > 0 && trip.gatos > 0) {
            params.append('type', 'both');
        } else if (trip.perros > 0) {
            params.append('type', 'dogs');
        } else if (trip.gatos > 0) {
            params.append('type', 'cats');
        } else {
            params.append('type', 'any');
        }

        // 2. Service Logic
        // trip.servicio is 'domicilio' | 'hospedaje'
        // explorar expects 'a_domicilio' | 'en_casa_petmate'
        if (trip.servicio === 'domicilio') {
            params.append('service', 'a_domicilio');
        } else if (trip.servicio === 'hospedaje') {
            params.append('service', 'en_casa_petmate');
        } else {
            params.append('service', 'all');
        }

        router.push(`/explorar?${params.toString()}`);
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
                mascotas_ids: selectedPetIds,
                estado: 'publicado'
            };

            if (servicio === 'domicilio') {
                if (!selectedAddressId) {
                    showAlert('Dirección requerida', 'Para servicio a domicilio debes seleccionar una dirección.', 'warning');
                    return;
                }
                payload.direccion_id = selectedAddressId;
            }

            console.log("Saving trip payload:", payload);

            let error;
            if (editingTripId) {
                // Update
                const res = await supabase.from("viajes").update(payload).eq("id", editingTripId);
                error = res.error;
            } else {
                // Insert
                const res = await supabase.from("viajes").insert(payload);
                error = res.error;
            }

            if (error) {
                console.error("Error saving trip:", error);
                showAlert('Error', `Error guardando el viaje: ${error.message}`, 'error');
            } else {
                await fetchTrips(userId);
                setRango(undefined);
                setSelectedPetIds([]);
                setMascotas({ dogs: 0, cats: 0 });
                setEditingTripId(null); // Reset
                setShowTripForm(false);
                showAlert(
                    editingTripId ? '¡Viaje Actualizado!' : '¡Solicitud Publicada!',
                    editingTripId ? 'Los cambios se han guardado correctamente.' : 'Los sitters recibirán tu solicitud y podrás ver sus postulaciones aquí.',
                    'success'
                );
            }

        } catch (e) {
            console.error(e);
            showAlert('Error', 'Ocurrió un error inesperado.', 'error');
        }
    };

    // Helper to reset form
    const resetForm = () => {
        setRango(undefined);
        setSelectedPetIds([]);
        setMascotas({ dogs: 0, cats: 0 });
        setEditingTripId(null);
        setShowTripForm(false);
    };

    const hasPets = myPets.length > 0;

    return (
        <div className="space-y-8">


            {/* Mensaje de Seguridad / Privacidad */}


            {/* TABS NAVIGATION */}
            <div className="flex w-full border border-slate-200 rounded-xl p-1 bg-white shadow-sm mb-6">
                <button
                    onClick={() => setActiveTab('solicitudes')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'solicitudes' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Calendar size={18} /> Solicitudes
                </button>
                <div className="w-px bg-slate-100 my-2"></div>
                <button
                    onClick={() => setActiveTab('datos')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'datos' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <User size={18} /> Datos
                    {isProfileComplete ? <div className="w-2 h-2 rounded-full bg-emerald-500" title="Completo"></div> : <div className="w-2 h-2 rounded-full bg-amber-400" title="Pendiente"></div>}
                </button>
                <div className="w-px bg-slate-100 my-2"></div>
                <button
                    onClick={() => setActiveTab('mascotas')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'mascotas' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <PawPrint size={18} /> Mascotas
                    {isPetsComplete ? <div className="w-2 h-2 rounded-full bg-emerald-500" title="Completo"></div> : <div className="w-2 h-2 rounded-full bg-amber-400" title="Pendiente"></div>}
                </button>
                <div className="w-px bg-slate-100 my-2"></div>
                <button
                    onClick={() => setActiveTab('direcciones')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'direcciones' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <MapPin size={18} /> Direcciones
                    {isAddressesComplete ? <div className="w-2 h-2 rounded-full bg-emerald-500" title="Completo"></div> : <div className="w-2 h-2 rounded-full bg-amber-400" title="Pendiente"></div>}
                </button>
            </div>


            {/* TAB: SOLICITUDES */}
            {activeTab === 'solicitudes' && (
                <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">

                    {/* COMPLETION WARNING BANNER */}

                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            Mis Solicitudes
                        </h2>
                        {!showTripForm && (
                            <button
                                onClick={() => setShowTripForm(true)}
                                className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center gap-2"
                            >
                                <Plus size={16} /> Nueva Solicitud
                            </button>
                        )}
                    </div>

                    {/* Lista de Viajes */}
                    {!loadingTrips && !showTripForm && trips.length > 0 && (
                        <div className="space-y-8 mb-8">
                            {/* Section 1: Confirmed / Active Trips */}
                            {trips.filter(t => ['reservado', 'confirmado', 'completado'].includes(t.estado)).length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wide mb-3 pl-1 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-2">
                                        <CheckCircle2 size={16} /> Solicitudes Confirmadas
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {trips
                                            .filter(t => ['reservado', 'confirmado', 'completado'].includes(t.estado))
                                            .map(trip => (
                                                <TripCard
                                                    key={trip.id}
                                                    trip={trip}
                                                    onEdit={handleEditTripNew}
                                                    onDelete={handleDeleteTrip}
                                                    onViewApplications={handleViewApplications}
                                                    onRemoveSitter={handleRemoveSitter}
                                                    onSearchSitter={handleSearchSitter}
                                                    petNames={myPets.filter(p => trip.mascotas_ids?.includes(p.id)).map(p => p.nombre).join(", ")}
                                                    pets={myPets.filter(p => trip.mascotas_ids?.includes(p.id)).map(p => ({ name: p.nombre, type: p.tipo }))}
                                                    clientName={clientProfile ? `${clientProfile.nombre} ${clientProfile.apellido_p}` : ""}
                                                    serviceAddress={addresses.find(a => a.id === trip.direccion_id)?.direccion_completa || ""}
                                                />
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Section 2: Pending / Published / Draft Trips */}
                            {trips.filter(t => ['borrador', 'publicado', 'pendiente', 'solicitado'].includes(t.estado)).length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 pl-1 flex items-center gap-2">
                                        <Clock size={16} /> Solicitudes Pendientes
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {trips
                                            .filter(t => ['borrador', 'publicado', 'pendiente', 'solicitado'].includes(t.estado))
                                            .map(trip => (
                                                <TripCard
                                                    key={trip.id}
                                                    trip={trip}
                                                    onEdit={handleEditTripNew}
                                                    onDelete={handleDeleteTrip}
                                                    onViewApplications={handleViewApplications}
                                                    onRemoveSitter={handleRemoveSitter}
                                                    onSearchSitter={handleSearchSitter}
                                                    petNames={myPets.filter(p => trip.mascotas_ids?.includes(p.id)).map(p => p.nombre).join(", ")}
                                                    pets={myPets.filter(p => trip.mascotas_ids?.includes(p.id)).map(p => ({ name: p.nombre, type: p.tipo }))}
                                                    clientName={clientProfile ? `${clientProfile.nombre} ${clientProfile.apellido_p}` : ""}
                                                    serviceAddress={addresses.find(a => a.id === trip.direccion_id)?.direccion_completa || ""}
                                                />
                                            ))}
                                    </div>
                                </div>
                            )}
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
                        <div id="trip-form-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm relative animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Background Decoration Container - Clipped */}
                            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-0">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[100px] -mr-16 -mt-16"></div>
                            </div>

                            <div className="relative z-10 p-6 lg:p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-slate-900">
                                        {rango ? 'Editando Solicitud' : 'Nueva Solicitud'}
                                    </h3>
                                    <button onClick={() => setShowTripForm(false)} className="text-sm text-slate-500 hover:text-slate-800 underline">
                                        Cancelar
                                    </button>
                                </div>

                                <div>
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
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                                                        Dirección del Servicio
                                                    </label>
                                                    <button
                                                        onClick={handleAddAddress}
                                                        className="text-xs text-emerald-600 font-bold hover:text-emerald-700 flex items-center gap-1 hover:underline"
                                                    >
                                                        <Plus size={14} /> Nueva Dirección
                                                    </button>
                                                </div>
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
                                            {loadingTrips ? 'Guardando...' : (editingTripId ? 'Guardar Cambios' : 'Publicar Solicitud')} <span className="text-slate-400 text-sm font-normal">({rango?.from ? format(rango.from, 'd MMM', { locale: es }) : '...'})</span> ✈️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {/* TAB: MIS MASCOTAS */}
            {activeTab === 'mascotas' && (
                <section className="rounded-2xl border bg-white p-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-slate-900">Mis Mascotas</h2>
                        <button onClick={handleAdd} className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">+ Agregar</button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {loadingPets ? (
                            <p className="text-xs text-slate-400">Cargando...</p>
                        ) : myPets.length > 0 ? (
                            myPets.map(pet => (
                                <PetCard key={pet.id} pet={pet} onEdit={handleEdit} />
                            ))
                        ) : (
                            <div className="text-center py-6 col-span-2">
                                <span className="text-2xl block mb-2">🐾</span>
                                <p className="text-xs text-slate-500">Agrega a tus peludos aquí.</p>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* TAB: DATOS PERSONALES */}
            {activeTab === 'datos' && (
                <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-slate-900">Datos Personales</h2>
                            <button
                                type="submit"
                                form="profile-form-tab"
                                disabled={savingProfile}
                                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50 text-sm"
                            >
                                {savingProfile ? 'Guardando...' : 'Guardar Cambios'}
                                {!savingProfile && <Save size={16} />}
                            </button>
                        </div>

                        <form id="profile-form-tab" onSubmit={handleSaveProfile} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Nombre y Apellido */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nombre</label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={profileFormData.nombre}
                                        onChange={handleProfileChange}
                                        className="w-full rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                                        placeholder="Tu nombre"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Apellido</label>
                                    <input
                                        type="text"
                                        name="apellido_p"
                                        value={profileFormData.apellido_p}
                                        onChange={handleProfileChange}
                                        className="w-full rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                                        placeholder="Tu apellido"
                                    />
                                </div>

                                {/* RUT y Teléfono */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                        <FileText size={14} /> RUT
                                    </label>
                                    <input
                                        type="text"
                                        name="rut"
                                        value={profileFormData.rut}
                                        onChange={handleRutChange}
                                        className="w-full rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 bg-slate-50 font-mono tracking-wide"
                                        placeholder="12.345.678-9"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">El RUT es único por cuenta.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                        <Phone size={14} /> Teléfono
                                    </label>
                                    <input
                                        type="tel"
                                        name="telefono"
                                        value={profileFormData.telefono}
                                        onChange={handleProfileChange}
                                        className="w-full rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                                        placeholder="+56 9 1234 5678"
                                    />
                                </div>
                            </div>

                            {/* Ubicación */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                    Tu Ubicación Base (para el mapa)
                                </label>
                                <AddressAutocomplete
                                    onSelect={(res) => {
                                        if (res.lat && res.lon) {
                                            setProfileFormData(prev => ({ ...prev, latitud: parseFloat(res.lat), longitud: parseFloat(res.lon) }));
                                        }
                                    }}
                                    initialValue={profileFormData.comuna ? `${profileFormData.comuna}, ${profileFormData.region || ''}` : ''}
                                    placeholder="Busca tu dirección o comuna..."
                                    className="w-full"
                                />
                                {profileFormData.latitud && profileFormData.longitud && (
                                    <div className="mt-3 rounded-lg overflow-hidden border border-slate-200 h-48 animate-in fade-in zoom-in-95 duration-200">
                                        <LocationMap
                                            key={`${profileFormData.latitud}-${profileFormData.longitud}`}
                                            lat={profileFormData.latitud}
                                            lng={profileFormData.longitud}
                                            approximate={false}
                                        />
                                    </div>
                                )}
                                {profileFormData.latitud && (
                                    <p className="text-[10px] text-emerald-600 mt-1">✓ Ubicación georeferenciada lista</p>
                                )}
                            </div>

                            {/* Videos */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                    Videos (Enlaces de YouTube o TikTok)
                                </label>
                                <div className="space-y-2">
                                    {profileFormData.videos.map((vid, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={vid}
                                                onChange={(e) => {
                                                    const newVideos = [...profileFormData.videos];
                                                    newVideos[idx] = e.target.value;
                                                    setProfileFormData({ ...profileFormData, videos: newVideos });
                                                }}
                                                className="w-full text-xs rounded-lg border-slate-200"
                                                placeholder="https://youtube.com/watch?v=..."
                                            />
                                            {idx > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newVideos = profileFormData.videos.filter((_, i) => i !== idx);
                                                        setProfileFormData({ ...profileFormData, videos: newVideos });
                                                    }}
                                                    className="text-slate-400 hover:text-rose-500"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {profileFormData.videos.length < 3 && (
                                        <button
                                            type="button"
                                            onClick={() => setProfileFormData({ ...profileFormData, videos: [...profileFormData.videos, ''] })}
                                            className="text-xs text-emerald-600 font-bold hover:underline"
                                        >
                                            + Agregar otro video
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Consentimiento RRSS */}
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={profileFormData.consentimiento_rrss}
                                        onChange={(e) => setProfileFormData({ ...profileFormData, consentimiento_rrss: e.target.checked })}
                                        className="mt-1 w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                                    />
                                    <div className="text-sm text-emerald-800">
                                        <span className="font-bold block text-emerald-900">Permitir uso en Redes Sociales</span>
                                        Al marcar esto, permites que Pawnecta destaque tu perfil y videos en nuestras redes sociales.
                                        <span className="block text-xs mt-1 font-bold text-emerald-700">🚀 ¡Esto aumenta tus probabilidades de match!</span>
                                    </div>
                                </label>
                            </div>
                        </form>
                    </div>
                </section>
            )}

            {/* TAB: DIRECCIONES */}
            {activeTab === 'direcciones' && (
                <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-900">Mis Direcciones</h2>
                            <button onClick={handleAddAddress} className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">+ Agregar</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {addresses.map(addr => (
                                <AddressCard
                                    key={addr.id}
                                    address={addr}
                                    onEdit={handleEditAddress}
                                    onDelete={handleDeleteAddress}
                                    onSetDefault={handleSetDefaultAddress}
                                />
                            ))}
                            {addresses.length === 0 && (
                                <div className="text-center py-6 col-span-2">
                                    <span className="text-2xl block mb-2">📍</span>
                                    <p className="text-xs text-slate-500">Agrega tus direcciones para solicitar servicios a domicilio.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

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

            {/* Modal Postulaciones */}
            {userId && selectedTripAppsId && (
                <ApplicationsModal
                    isOpen={isAppsModalOpen}
                    onClose={() => setIsAppsModalOpen(false)}
                    tripId={selectedTripAppsId}
                    onAccepted={handleAppAccepted}
                />
            )}

            <ModalAlert
                isOpen={alertConfig.isOpen}
                onClose={closeAlert}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
            />

            {/* Confirmation Modal */}
            <ModalConfirm
                isOpen={confirmConfig.isOpen}
                onClose={closeConfirm}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText={confirmConfig.confirmText}
                cancelText={confirmConfig.cancelText}
                isDestructive={confirmConfig.isDestructive}
            />
        </div>
    );
}
