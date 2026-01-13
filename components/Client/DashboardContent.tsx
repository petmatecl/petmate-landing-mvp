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
import { Home, Hotel, Calendar, MapPin, Plus, PawPrint, User, FileText, Save, Phone, X, CheckCircle2, Clock, Megaphone, Edit } from "lucide-react";
import { useRouter } from "next/router";
import AddressAutocomplete from "../AddressAutocomplete";
import dynamic from "next/dynamic";
import { Skeleton } from "../Shared/Skeleton";
import { createNotification } from "../../lib/notifications";

function TripCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl border-2 border-slate-300 p-6 space-y-4 shadow-sm animate-pulse">
            <div className="flex justify-between items-start">
                <div className="space-y-3 w-full">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-24 rounded" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 w-24 rounded" />
                    </div>
                    <Skeleton className="h-6 w-3/4 rounded" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-full max-w-md rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-50 mt-2">
                <Skeleton className="h-10 w-24 rounded-xl" />
                <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
        </div>
    );
}

function ItemsSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
    );
}

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
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [backupProfileData, setBackupProfileData] = useState<any>(null);

    const [profileFormData, setProfileFormData] = useState({
        nombre: '',
        apellido_p: '',
        rut: '',
        telefono: '',
        latitud: null as number | null,
        longitud: null as number | null,
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
    const [showStrategySelection, setShowStrategySelection] = useState(false);

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

            // if (data.length === 0) setShowTripForm(true); // Removed to enforce pet validation on button click

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
        router.push(`/usuario/mascotas/${pet.id}`);
    };

    const handleAdd = () => {
        router.push("/usuario/mascotas/nueva");
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
    // COMPLETION CHECKS
    const isProfileComplete = clientProfile?.nombre && clientProfile?.apellido_p && clientProfile?.telefono && clientProfile?.rut && clientProfile?.foto_perfil;
    const isPetsComplete = myPets.length > 0;
    const isAddressesComplete = addresses.length > 0;

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

    const handleEditProfile = () => {
        setBackupProfileData({ ...profileFormData });
        setIsEditingProfile(true);
    };

    const handleCancelEdit = () => {
        if (backupProfileData) {
            setProfileFormData(backupProfileData);
        }
        setIsEditingProfile(false);
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
                    // latitud & longitud managed by addresses now, preserving existing values if needed or handled separately
                })
                .eq('auth_user_id', userId);

            if (error) throw error;

            await fetchClientProfile(userId!); // Refresh data
            setIsEditingProfile(false); // EXIT EDIT MODE
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

                    // [NEW] Notification to Sitter (Cancellation/Removal)
                    // We need to know who was removed. But after update, we can't get it from DB.
                    // We should use the trip object passed to find sitter_id roughly? 
                    // handleRemoveSitter only gets tripId. We need to fetch trip first or use state if we had it.
                    // But for now, let's assume we can fetch it BEFORE update or just skip if too complex for MVP.
                    // Actually, let's skip "Removal" notification for now to avoid complexity of fetching "who was assigned".
                    // The user asked for "new opportunities, applications, accepted". Cancellation was not explicitly requested but good to have.
                    // User Request: "notificar al sitter cuando el cliente le ha enviado una solicitud, notificar al sitter cuando un cliente ha aceptado una solicitud"
                    // NOT "cancelled". I will skip cancellation notification to stick to strict requirements + safe changes.

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
            params.append('service', 'hospedaje');
        } else {
            params.append('service', 'all');
        }

        router.push(`/explorar?${params.toString()}`);
    };

    const handleConfirmBooking = (trip: Trip) => {
        setConfirmConfig({
            isOpen: true,
            title: "Confirmar Reserva",
            message: "Al confirmar, notificaremos al Sitter que estás listo para comenzar. Revisa que los detalles sean correctos.",
            confirmText: "Sí, Confirmar Reserva",
            isDestructive: false,
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from("viajes")
                        .update({ estado: 'confirmado' })
                        .eq("id", trip.id);

                    if (error) throw error;

                    if (userId) fetchTrips(userId);

                    // [NEW] Notification to Sitter
                    if (trip.sitter_id) {
                        await createNotification({
                            userId: trip.sitter_id,
                            type: 'acceptance',
                            title: '¡Reserva Confirmada!',
                            message: `El cliente ha confirmado la reserva. ¡Prepárate para el servicio!`,
                            link: '/sitter'
                        });
                    }

                    showAlert("¡Reserva Confirmada!", "El servicio ha sido confirmado exitosamente.", "success");
                } catch (err: any) {
                    console.error(err);
                    showAlert("Error", "No se pudo confirmar la reserva.", "error");
                }
                closeConfirm();
            }
        });
    };

    const handleSaveTrip = async () => {
        if (!userId) return;

        try {
            if (!validateForm()) return;

            const payload: any = {
                user_id: userId,
                fecha_inicio: format(rango!.from!, 'yyyy-MM-dd'),
                fecha_fin: format(rango!.to!, 'yyyy-MM-dd'),
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
                setEditingTripId(null); // Reset
                setShowTripForm(false);
                setShowStrategySelection(false);
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
        setShowStrategySelection(false);
    };

    // --- Validation Helper ---
    const validateForm = (): boolean => {
        if (!rango?.from || !rango?.to) {
            showAlert('Fechas requeridas', 'Por favor selecciona las fechas de inicio y fin.', 'warning');
            return false;
        }
        if (mascotas.dogs === 0 && mascotas.cats === 0) {
            showAlert('Mascotas requeridas', 'Debes indicar cuántos perros y/o gatos viajarán.', 'warning');
            return false;
        }
        if (servicio === 'domicilio' && !selectedAddressId) {
            showAlert('Dirección requerida', 'Para servicio a domicilio debes seleccionar una dirección.', 'warning');
            return false;
        }
        return true;
    }

    const handleContinue = () => {
        if (validateForm()) {
            setShowStrategySelection(true);
        }
    };


    // --- New Handler: Search Directly with Validation ---
    const handleSearchDirectly = () => {
        // Validation already done if coming from Strategy Screen, but safe to keep or rely on caller.
        // If called directly validation is good.
        if (!validateForm()) return;

        // 2. Build Query Params
        const params = new URLSearchParams();

        // Dates
        params.append('from', format(rango!.from!, 'yyyy-MM-dd'));
        params.append('to', format(rango!.to!, 'yyyy-MM-dd'));

        // Service (explorar uses 'a_domicilio', 'en_casa_petmate')
        if (servicio === 'domicilio') {
            params.append('service', 'a_domicilio');
            // If domicilio, we might want to pass lat/lng of selected address to filter nearby sitters
            // (Assuming 'addresses' has this data if needed, or we rely on user filtering in Explore)
            const addr = addresses.find(a => a.id === selectedAddressId);
            if (addr && addr.latitud && addr.longitud) {
                params.append('lat', addr.latitud.toString());
                params.append('lng', addr.longitud.toString());
                params.append('comuna', addr.comuna || '');
            }
        } else {
            params.append('service', 'hospedaje');
            // If hosting, maybe filter by user's base location or let them choose? 
            // Currently Explore uses map center. We can pass user's base district if known.
            if (profileFormData.comuna) {
                params.append('location', profileFormData.comuna);
            }
        }

        // Pets
        params.append('dogs', mascotas.dogs.toString());
        params.append('cats', mascotas.cats.toString());

        // Redirect
        router.push(`/explorar?${params.toString()}`);
    };

    const hasPets = myPets.length > 0;

    const getFormattedAddress = (addressId?: string) => {
        const addr = addresses.find(a => a.id === addressId);
        if (!addr) return "";
        if (addr.calle && addr.numero && addr.comuna) {
            return `${addr.calle} ${addr.numero}, ${addr.comuna}`;
        }
        return addr.direccion_completa || "";
    };

    return (
        <div className="space-y-8">


            {/* Mensaje de Seguridad / Privacidad */}


            {/* TABS NAVIGATION */}
            <div className="grid grid-cols-2 sm:flex w-full border-2 border-slate-300 rounded-xl p-1 bg-white shadow-sm mb-6 gap-1">
                <button
                    onClick={() => setActiveTab('solicitudes')}
                    className={`w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'solicitudes' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Calendar size={18} /> Solicitudes
                </button>
                <button
                    onClick={() => setActiveTab('datos')}
                    className={`w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'datos' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <User size={18} /> Datos
                    {isProfileComplete ?
                        <div className="w-2 h-2 rounded-full bg-emerald-500" title="Completo"></div> :
                        <div className="w-2 h-2 rounded-full bg-amber-400" title={!clientProfile?.foto_perfil ? "Falta Foto de Perfil" : "Pendiente"}></div>
                    }
                </button>
                <button
                    onClick={() => setActiveTab('mascotas')}
                    className={`w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'mascotas' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <PawPrint size={18} /> Mascotas
                    {isPetsComplete ? <div className="w-2 h-2 rounded-full bg-emerald-500" title="Completo"></div> : <div className="w-2 h-2 rounded-full bg-amber-400" title="Pendiente"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('direcciones')}
                    className={`w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'direcciones' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
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
                                onClick={() => {
                                    if (!isProfileComplete) {
                                        showAlert('Perfil Incompleto', 'Debes completar tus datos personales y agregar una foto de perfil antes de crear una solicitud.', 'warning');
                                        setActiveTab('datos');
                                        return;
                                    }
                                    if (!isPetsComplete) {
                                        showAlert('Faltan Mascotas', 'Debes agregar al menos una mascota antes de solicitar cuidado.', 'warning');
                                        setActiveTab('mascotas');
                                        return;
                                    }
                                    if (!isAddressesComplete) {
                                        showAlert('Faltan Direcciones', 'Debes agregar al menos una dirección antes de solicitar cuidado.', 'warning');
                                        setActiveTab('direcciones');
                                        return;
                                    }
                                    setShowTripForm(true);
                                }}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 transition-all flex items-center gap-2"
                            >
                                <Plus size={16} /> Nueva Solicitud
                            </button>
                        )}
                    </div>


                    {/* Loading State */}
                    {loadingTrips && (
                        <div className="space-y-8 mb-8 animate-in fade-in duration-500">
                            <div className="grid grid-cols-1 gap-4">
                                <TripCardSkeleton />
                                <TripCardSkeleton />
                                <TripCardSkeleton />
                            </div>
                        </div>
                    )}

                    {/* Lista de Viajes */}
                    {!loadingTrips && !showTripForm && trips.length > 0 && (
                        <div className="space-y-8 mb-8">

                            {/* Section 0: REQUIRES ACTION (Reservado) */}
                            {trips.filter(t => t.estado === 'reservado').length > 0 && (
                                <div className="animate-in slide-in-from-left-4 duration-500">
                                    <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wide mb-3 pl-1 bg-amber-50 w-fit px-3 py-1 rounded-full border border-amber-100 flex items-center gap-2">
                                        <Clock size={16} /> Requiere tu Atención
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {trips
                                            .filter(t => t.estado === 'reservado')
                                            .map(trip => (
                                                <TripCard
                                                    key={trip.id}
                                                    trip={trip}
                                                    onEdit={handleEditTripNew}
                                                    onDelete={handleDeleteTrip}
                                                    onConfirm={handleConfirmBooking}
                                                    onViewApplications={handleViewApplications}
                                                    onRemoveSitter={handleRemoveSitter}
                                                    onSearchSitter={handleSearchSitter}
                                                    petNames={myPets.filter(p => trip.mascotas_ids?.includes(p.id)).map(p => p.nombre).join(", ")}
                                                    pets={myPets.filter(p => trip.mascotas_ids?.includes(p.id)).map(p => ({ name: p.nombre, type: p.tipo }))}
                                                    serviceAddress={getFormattedAddress(trip.direccion_id)}
                                                />
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Section 1: Confirmed / Active Trips */}
                            {trips.filter(t => ['confirmado', 'completado'].includes(t.estado)).length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wide mb-3 pl-1 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-2">
                                        <CheckCircle2 size={16} /> Solicitudes Confirmadas
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {trips
                                            .filter(t => ['confirmado', 'completado'].includes(t.estado))
                                            .map(trip => (
                                                <TripCard
                                                    key={trip.id}
                                                    trip={trip}
                                                    onEdit={handleEditTripNew}
                                                    onDelete={handleDeleteTrip} // No confirm needed here
                                                    onViewApplications={handleViewApplications}
                                                    onRemoveSitter={handleRemoveSitter}
                                                    onSearchSitter={handleSearchSitter}
                                                    petNames={myPets.filter(p => trip.mascotas_ids?.includes(p.id)).map(p => p.nombre).join(", ")}
                                                    pets={myPets.filter(p => trip.mascotas_ids?.includes(p.id)).map(p => ({ name: p.nombre, type: p.tipo }))}
                                                    serviceAddress={getFormattedAddress(trip.direccion_id)}
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
                                                    serviceAddress={getFormattedAddress(trip.direccion_id)}
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
                        <div id="trip-form-section" className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm relative animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Background Decoration Container - Clipped */}
                            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-0">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[100px] -mr-16 -mt-16"></div>
                            </div>

                            {/* STRATEGY SELECTION VIEW */}
                            {showStrategySelection ? (
                                <div className="relative z-10 p-6 lg:p-12 text-center animate-in zoom-in-95 duration-300">
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2">¿Cómo deseas continuar?</h3>
                                    <p className="text-slate-500 mb-8 max-w-lg mx-auto">Ya tenemos los detalles de tu solicitud. Ahora elige la mejor opción para ti.</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                                        {/* Option 2: Search (Secondary) */}
                                        <button
                                            onClick={handleSearchDirectly}
                                            className="group flex flex-col items-center p-8 rounded-2xl border-2 border-slate-300 bg-slate-50/50 hover:bg-white hover:border-sky-500 hover:shadow-xl hover:shadow-sky-500/10 transition-all duration-300 text-center"
                                        >
                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-sky-600 mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300 ring-1 ring-slate-100">
                                                <User size={32} />
                                            </div>
                                            <h4 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-sky-700 transition-colors">Elegir Sitter</h4>
                                            <p className="text-sm text-slate-500 leading-relaxed">
                                                Explora el catálogo y elige manualmente.<br />(Recomendado si buscas algo muy específico)
                                            </p>
                                        </button>

                                        {/* Option 1: Publish (Recommended) */}
                                        <button
                                            onClick={handleSaveTrip}
                                            className="group relative flex flex-col items-center p-8 rounded-2xl border-2 border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 text-center"
                                        >
                                            <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                Recomendado
                                            </div>
                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-emerald-600 mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300 ring-1 ring-emerald-100">
                                                <Megaphone size={32} />
                                            </div>
                                            <h4 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">Publicar Solicitud</h4>
                                            <p className="text-sm text-slate-500 leading-relaxed">
                                                Deja que los sitters postulen a tu viaje.<br />Recibirás ofertas de cuidadores disponibles.
                                            </p>
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => setShowStrategySelection(false)}
                                        className="mt-8 text-sm text-slate-400 hover:text-slate-600 font-medium underline decoration-slate-300 underline-offset-4"
                                    >
                                        Volver a editar solicitud
                                    </button>
                                </div>
                            ) : (
                                /* FORM VIEW */
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
                                                    <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${servicio === 'domicilio' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-sm' : 'border-slate-300 hover:border-emerald-300 hover:bg-slate-50'}`}>
                                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${servicio === 'domicilio' ? 'border-emerald-500 bg-white' : 'border-slate-300 bg-white'}`}>
                                                            {servicio === 'domicilio' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                                                        </div>
                                                        <input type="radio" name="servicio" value="domicilio" checked={servicio === 'domicilio'} onChange={(e) => setServicio(e.target.value)} className="hidden" />
                                                        <div className="flex items-center gap-2">
                                                            <Home size={18} />
                                                            <span className="text-sm">Domicilio</span>
                                                        </div>
                                                    </label>
                                                    <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${servicio === 'hospedaje' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-sm' : 'border-slate-300 hover:border-emerald-300 hover:bg-slate-50'}`}>
                                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${servicio === 'hospedaje' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-sm' : 'border-slate-300 hover:border-emerald-300 hover:bg-slate-50'}`}>
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
                                                            <label key={addr.id} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedAddressId === addr.id ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-300 hover:border-emerald-300 bg-white'}`}>
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

                                        <div className="mt-8 flex flex-col md:flex-row gap-4 justify-end items-center border-t border-slate-300 pt-6">

                                            {!editingTripId && (
                                                <div className="flex-1 w-full md:w-auto text-left">
                                                    <p className="text-xs text-slate-400">
                                                        Completa los datos para continuar.
                                                    </p>
                                                </div>
                                            )}

                                            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                                                {/* Primary Action: Continuar (New Flow) or Save (Edit Mode) */}
                                                {editingTripId ? (
                                                    <button
                                                        onClick={handleSaveTrip}
                                                        className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                                                    >
                                                        {loadingTrips ? 'Guardando...' : 'Guardar Cambios'}
                                                        <Save size={14} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={handleContinue}
                                                        className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 group"
                                                    >
                                                        Continuar
                                                        <div className="group-hover:translate-x-1 transition-transform">→</div>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
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

                    {loadingPets ? (
                        <ItemsSkeleton />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {myPets.length > 0 ? (
                                myPets.map(pet => (
                                    <PetCard key={pet.id} pet={pet} onEdit={handleEdit} />
                                ))
                            ) : (
                                <div className="text-center py-6 col-span-2 flex flex-col items-center justify-center">
                                    <PawPrint className="w-12 h-12 text-slate-200 mb-2" />
                                    <p className="text-xs text-slate-500">Agrega a tus peludos aquí.</p>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            )}

            {/* TAB: DATOS PERSONALES */}
            {activeTab === 'datos' && (
                <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white rounded-2xl border-2 border-slate-300 p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Datos Personales</h2>
                                {!clientProfile?.foto_perfil && (
                                    <p className="text-xs text-amber-600 font-bold mt-1 flex items-center gap-1">
                                        ⚠️ Falta tu foto de perfil. Súbela desde la barra lateral izquierda.
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {isEditingProfile ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            disabled={savingProfile}
                                            className="px-4 py-2 rounded-lg text-slate-500 hover:text-slate-800 font-bold transition-all text-sm"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            form="profile-form-tab"
                                            disabled={savingProfile}
                                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50 text-sm"
                                        >
                                            {savingProfile ? 'Guardando...' : 'Guardar'}
                                            {!savingProfile && <Save size={16} />}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleEditProfile}
                                        className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold transition-all flex items-center gap-2 text-sm"
                                    >
                                        Editar
                                        <Edit size={16} />
                                    </button>
                                )}
                            </div>
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
                                        disabled={!isEditingProfile}
                                        className={`w-full rounded-xl border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 ${!isEditingProfile ? 'bg-slate-50 text-slate-600' : ''}`}
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
                                        disabled={!isEditingProfile}
                                        className={`w-full rounded-xl border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 ${!isEditingProfile ? 'bg-slate-50 text-slate-600' : ''}`}
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
                                        disabled={!isEditingProfile}
                                        className={`w-full rounded-xl border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 font-mono tracking-wide ${!isEditingProfile ? 'bg-slate-100 text-slate-500' : 'bg-slate-50'}`}
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
                                        disabled={!isEditingProfile}
                                        className={`w-full rounded-xl border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 ${!isEditingProfile ? 'bg-slate-50 text-slate-600' : ''}`}
                                        placeholder="+56 9 1234 5678"
                                    />
                                </div>
                            </div>

                            {/* Ubicación */}



                        </form>
                    </div>
                </section>
            )}

            {/* TAB: DIRECCIONES */}
            {activeTab === 'direcciones' && (
                <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white rounded-2xl border-2 border-slate-300 p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-900">Mis Direcciones</h2>
                            <button onClick={handleAddAddress} className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">+ Agregar</button>
                        </div>

                        {loadingAddresses ? (
                            <ItemsSkeleton />
                        ) : (
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
                                    <div className="text-center py-6 col-span-2 flex flex-col items-center justify-center">
                                        <MapPin className="w-12 h-12 text-slate-200 mb-2" />
                                        <p className="text-xs text-slate-500">Agrega tus direcciones para solicitar servicios a domicilio.</p>
                                    </div>
                                )}
                            </div>
                        )}
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
