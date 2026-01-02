import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { format, differenceInYears, subYears, isAfter, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { formatRut, validateRut, cleanRut } from "../lib/rutValidation";
import DatePickerSingle from "../components/DatePickerSingle";
import ModalAlert from "../components/ModalAlert";
import ModalConfirm from "../components/ModalConfirm";
import BookingDatasheet from "../components/Sitter/BookingDatasheet";
import AddressAutocomplete from "../components/AddressAutocomplete";
import {
    MapPin, Calendar, Clock, DollarSign, Star, Menu, X, Check,
    User, Mail, Phone, Home, FileText, Upload, Plus, Trash2,
    ChevronDown, ChevronUp, Dog, Cat, Play, Linkedin, Facebook,
    Instagram, Music, ShieldCheck, CheckCircle2, ShieldAlert,
    Eye, ImagePlus, Loader2, Edit2, FileCheck, BarChart, Briefcase,
    PawPrint, AlignLeft, Inbox, Send, CalendarCheck, Printer, Download, Ruler
} from 'lucide-react';
import ApplicationDialog from "../components/Sitter/ApplicationDialog";
import ClientDetailsDialog from "../components/Sitter/ClientDetailsDialog";
import PetDetailsDialog from "../components/Sitter/PetDetailsDialog";
import ImageLightbox from "../components/ImageLightbox";
import AvailabilityCalendar from "../components/Sitter/AvailabilityCalendar";

type Booking = {
    id: string;
    fecha_inicio: string;
    fecha_fin: string;
    estado: string;
    total: number;
    cliente: {
        nombre: string;
        apellido_p: string;
    }
};

type Review = {
    id: string;
    calificacion: number;
    comentario: string;
    created_at: string;
    cliente: {
        nombre: string;
        apellido_p: string;
    }
};

const COMUNAS_SANTIAGO = [
    "Cerrillos", "Cerro Navia", "Conchalí", "El Bosque", "Estación Central", "Huechuraba", "Independencia",
    "La Cisterna", "La Florida", "La Granja", "La Pintana", "La Reina", "Las Condes", "Lo Barnechea", "Lo Espejo",
    "Lo Prado", "Macul", "Maipú", "Ã‘uñoa", "Pedro Aguirre Cerda", "Peñalolén", "Providencia", "Pudahuel",
    "Quilicura", "Quinta Normal", "Recoleta", "Renca", "San Joaquín", "San Miguel", "San Ramón", "Santiago",
    "Vitacura"
];

const OCUPACIONES = [
    "Estudiante",
    "Trabajador Full-time",
    "Trabajador Part-time",
    "Independiente",
    "Jubilado",
    "Sin Ocupación",
    "Otro"
];

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function SitterDashboardPage() {
    const [nombre, setNombre] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [ageAlertOpen, setAgeAlertOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Alert State
    const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'warning' | 'success' | 'info' }>({
        isOpen: false,
        title: "",
        message: "",
        type: "warning"
    });

    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const [reviews, setReviews] = useState<Review[]>([]);
    const [averageRating, setAverageRating] = useState(0);
    const [bookings, setBookings] = useState<any[]>([]);
    const [applications, setApplications] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'solicitudes' | 'servicios' | 'perfil' | 'disponibilidad'>('solicitudes');

    // Helpers for Price Formatting
    const formatPrice = (value: number | null | undefined) => {
        if (value === null || value === undefined) return "";
        return value.toLocaleString('es-CL');
    };

    const parsePrice = (value: string) => {
        const numericValue = value.replace(/\./g, '').replace(/[^0-9]/g, '');
        return numericValue === "" ? null : parseInt(numericValue, 10);
    };

    // Restore Auth & Load Profile Logic
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                setUserId(session.user.id);
                setEmail(session.user.email || null);

                // Fetch Profile Data
                const { data: profile, error } = await supabase
                    .from('registro_petmate')
                    .select('*')
                    .eq('auth_user_id', session.user.id)
                    .single();

                // SECURITY CHECK: This page is for managing YOUR OWN profile.
                // We rely on session.user.id, so it is impossible to view another user's private dashboard.


                if (profile) {
                    setProfileData({
                        nombre: profile.nombre || "",
                        apellido_p: profile.apellido_p || "",
                        apellido_m: profile.apellido_m || "",
                        rut: profile.rut || "",
                        fecha_nacimiento: profile.fecha_nacimiento || "", // YYYY-MM-DD
                        telefono: profile.telefono || "",
                        region: profile.region || "Metropolitana",
                        comuna: profile.comuna || "",
                        calle: profile.calle || "",
                        numero: profile.numero || "",
                        tipo_vivienda: profile.tipo_vivienda || "casa",
                        tiene_mascotas: profile.tiene_mascotas ? "si" : "no",
                        sexo: profile.sexo || "",
                        ocupacion: profile.ocupacion || "",
                        // universidad removed
                        // carrera removed
                        // ano_curso removed
                        descripcion: profile.descripcion || "",
                        cuida_perros: profile.cuida_perros || false,
                        cuida_gatos: profile.cuida_gatos || false,
                        servicio_a_domicilio: profile.servicio_a_domicilio || false,
                        servicio_en_casa: profile.servicio_en_casa || false,
                        tarifa_servicio_a_domicilio: profile.tarifa_servicio_a_domicilio,
                        tarifa_servicio_en_casa: profile.tarifa_servicio_en_casa,
                        foto_perfil: profile.foto_perfil || null,
                        certificado_antecedentes: profile.certificado_antecedentes || null,
                        galeria: profile.galeria || [],
                        roles: profile.roles || [profile.rol || 'cliente'], // Handle migration fallback
                        redes_sociales: profile.redes_sociales || { linkedin: "", tiktok: "", instagram: "", facebook: "" },
                        detalles_mascotas: profile.detalles_mascotas || [],
                        videos: profile.videos || [],
                        latitud: profile.latitud,
                        longitud: profile.longitud,
                        direccion_completa: profile.direccion_completa || "",
                        tamanos_perros: profile.tamanos_perros || []
                    });
                    setBackupProfileData(profile); // Save backup for cancel
                }
            } else {
                // Not logged in
                window.location.href = '/login';
            }
            setLoading(false);
        };
        init();
    }, []);

    // Fetch Bookings
    useEffect(() => {
        if (!userId) return;
        const fetchBookings = async () => {
            // 1. Fetch Bookings (Direct Requests)
            const { data: bookingData, error: bookingError } = await supabase
                .from('viajes')
                .select('*, cliente:user_id(*), direccion:direccion_id(*)') // Removed broken relation, relying on mascotas_ids
                .eq('sitter_id', userId)
                .order('fecha_inicio', { ascending: true });

            if (!bookingError && bookingData) {
                setBookings(bookingData);
            }

            // 2. Fetch Applications (Oportunidades)
            const { data: appData, error: appError } = await supabase
                .from('postulaciones')
                .select('*, viaje:viajes(*, cliente:user_id(*))')
                .eq('sitter_id', userId)
                .order('created_at', { ascending: false });

            if (!appError && appData) {
                setApplications(appData);
            }

            // 3. Fetch Pets (Bulk)
            const allTrips = [...(bookingData || []), ...(appData?.map(a => a.viaje).filter(Boolean) || [])];
            const allPetIds = Array.from(new Set(allTrips.flatMap(t => t.mascotas_ids || [])));

            if (allPetIds.length > 0) {
                const { data: petsData } = await supabase
                    .from('mascotas')
                    .select('*')
                    .in('id', allPetIds);

                if (petsData) {
                    const cache: Record<string, any> = {};
                    petsData.forEach(p => { cache[p.id] = p; });
                    setPetsCache(cache);
                }
            }
        };
        fetchBookings();
    }, [userId]);

    // Estado de edición granular
    const [activeSection, setActiveSection] = useState<string | null>(null);

    // Estado para "minimizar/maximizar" secciones
    const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
        contact: true,
        personal: true,
        profile: true,
        services: true
    });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Asegurar que al editar se expanda
    useEffect(() => {
        if (activeSection) {
            setExpandedSections(prev => ({ ...prev, [activeSection]: true }));
        }
    }, [activeSection]);

    const [showToast, setShowToast] = useState(false);

    // Core Profile Data State
    const [profileData, setProfileData] = useState<any>({
        nombre: "",
        apellido_p: "",
        apellido_m: "",
        rut: "",
        fecha_nacimiento: "",
        telefono: "",
        region: "Metropolitana",
        comuna: "",
        calle: "",
        numero: "",
        tipo_vivienda: "casa",
        tiene_mascotas: "no",
        sexo: "",
        ocupacion: "",
        // universidad removed
        // carrera removed
        // ano_curso removed
        descripcion: "",
        cuida_perros: false,
        cuida_gatos: false,
        servicio_a_domicilio: false,
        servicio_en_casa: false,
        tarifa_servicio_a_domicilio: null,
        tarifa_servicio_en_casa: null,
        foto_perfil: null,
        certificado_antecedentes: null, // Added field
        galeria: [],
        redes_sociales: { linkedin: "", tiktok: "", instagram: "", facebook: "" },
        detalles_mascotas: [],
        roles: ["cliente"], // Default
        videos: [],
        latitud: null,
        longitud: null,
        direccion_completa: "",
        tamanos_perros: []
    });

    // Privacy Notice State
    const [showSecurityNotice, setShowSecurityNotice] = useState(true);
    const [petsCache, setPetsCache] = useState<Record<string, any>>({});

    // Details Dialogs State
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; bookingId: string | null; clientName: string }>({
        isOpen: false,
        bookingId: null,
        clientName: ""
    });

    const [printBooking, setPrintBooking] = useState<{ booking: any; pets: any[] } | null>(null);

    const [showClientDialog, setShowClientDialog] = useState(false);
    const [selectedPets, setSelectedPets] = useState<any[]>([]);
    const [showPetDialog, setShowPetDialog] = useState(false);

    // Application Dialog State
    const [selectedTrip, setSelectedTrip] = useState<any>(null);
    const handleApplicationSuccess = () => {
        // Refresh triggers or toast
        setShowToast(true);
        // data refresh is handled by useEffect deps or manual recall if separated
    };

    const [backupProfileData, setBackupProfileData] = useState<any>(null);

    const handleViewDocument = (url: string) => {
        if (url) window.open(url, '_blank');
    };

    const handleDeleteDocument = async () => {
        setProfileData({ ...profileData, certificado_antecedentes: null });
        if (userId) {
            await supabase.from('registro_petmate').update({ certificado_antecedentes: null }).eq('auth_user_id', userId);
        }
    };

    const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatRut(e.target.value);
        setProfileData({ ...profileData, rut: formatted });
    };

    const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/cert-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('sitter-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('sitter-images')
                .getPublicUrl(filePath);

            setProfileData({ ...profileData, certificado_antecedentes: publicUrlData.publicUrl });

            // Auto-save
            await supabase.from('registro_petmate').update({ certificado_antecedentes: publicUrlData.publicUrl }).eq('auth_user_id', userId);

        } catch (error: any) {
            setAlertState({ isOpen: true, title: "Error", message: 'Error al subir documento: ' + error.message, type: "error" });
        } finally {
            setUploading(false);
        }
    };



    const isProfileComplete = Boolean(
        profileData.nombre &&
        profileData.apellido_p &&
        profileData.rut &&
        profileData.fecha_nacimiento &&
        profileData.sexo &&
        profileData.ocupacion &&
        profileData.telefono &&
        profileData.region &&
        profileData.comuna &&
        profileData.calle &&
        profileData.numero &&
        profileData.descripcion &&
        profileData.descripcion.length >= 50 && // Adjusted to be less strict or match validation
        profileData.foto_perfil &&
        profileData.tipo_vivienda &&
        profileData.tiene_mascotas
    );

    const isProfileIncomplete = !isProfileComplete;

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/profile-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('sitter-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('sitter-images')
                .getPublicUrl(filePath);

            setProfileData({ ...profileData, foto_perfil: publicUrlData.publicUrl });

            // Auto-save
            await supabase.from('registro_petmate').update({ foto_perfil: publicUrlData.publicUrl }).eq('auth_user_id', userId);

        } catch (error: any) {
            alert('Error al subir imagen: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const files = Array.from(e.target.files);
        const currentCount = profileData.galeria?.length || 0;

        if (currentCount + files.length > 6) {
            setAlertState({ isOpen: true, title: "Límite excedido", message: `Solo puedes tener hasta 6 fotos. Puedes subir ${6 - currentCount} más.`, type: "warning" });
            return;
        }

        setUploading(true);

        try {
            const uploadPromises = files.map(async (file) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${userId}/gallery-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('sitter-images')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('sitter-images')
                    .getPublicUrl(filePath);

                return publicUrlData.publicUrl;
            });

            const newUrls = await Promise.all(uploadPromises);
            const newGallery = [...(profileData.galeria || []), ...newUrls];

            setProfileData({ ...profileData, galeria: newGallery });

            // Auto-save
            if (userId) {
                await supabase.from('registro_petmate').update({ galeria: newGallery }).eq('auth_user_id', userId);
            }

        } catch (error: any) {
            alert('Error al subir imagenes: ' + (error.message || error));
        } finally {
            setUploading(false);
            // Reset input value to allow selecting same files again if needed (though tricky with multiple)
            e.target.value = "";
        }
    };

    const handleDeletePhoto = async (index: number) => {
        const newGallery = [...profileData.galeria];
        newGallery.splice(index, 1);
        setProfileData({ ...profileData, galeria: newGallery });

        if (userId) {
            await supabase.from('registro_petmate').update({ galeria: newGallery }).eq('auth_user_id', userId);
        }
    };

    const handleSelectAddress = (address: any) => {
        // Simple mapping attempt
        const calle = address.address?.road || address.address?.pedestrian || address.address?.street || "";
        const numero = address.address?.house_number || "";
        const comuna = address.address?.city || address.address?.town || address.address?.village || address.address?.municipality || "";

        setProfileData({
            ...profileData,
            calle: calle,
            numero: numero,
            // Only update comuna/region if they seem valid/present, otherwise keep existing or let user edit
            latitud: address.lat,
            longitud: address.lon,
            direccion_completa: address.display_name
        });
    };


    const handleAcceptClick = (bookingId: string, clientName: string) => {
        setConfirmModal({
            isOpen: true,
            bookingId,
            clientName
        });
    };

    const handleConfirmAccept = async () => {
        if (!confirmModal.bookingId) return;

        try {
            const { error } = await supabase.from('viajes').update({ estado: 'confirmado' }).eq('id', confirmModal.bookingId);
            if (error) throw error;
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("Error al aceptar");
        } finally {
            setConfirmModal({ isOpen: false, bookingId: null, clientName: "" });
        }
    };

    const handleSaveSection = async (section: string) => {
        // e.preventDefault(); // If called from button type button, no event. If form, needs event.
        // We will make buttons type="button" and call this.
        setSaving(true);
        setErrorMsg(null);

        if (!userId) {
            setAlertState({
                isOpen: true,
                title: "Sesión inválida",
                message: "Sesión no válida o expirada.",
                type: "error"
            });
            setSaving(false);
            return;
        }

        // Validaciones por Sección
        const errors: string[] = [];

        if (section === 'contact') {
            if (!profileData.telefono) errors.push("Teléfono");
            if (!profileData.region) errors.push("Región");
            if (!profileData.comuna) errors.push("Comuna");
        }

        if (section === 'personal') {
            if (!profileData.nombre) errors.push("Nombres");
            if (!profileData.apellido_p) errors.push("Apellido Paterno");
            if (!profileData.fecha_nacimiento) errors.push("Fecha de Nacimiento");
            if (!profileData.sexo) errors.push("Sexo");
            if (!profileData.ocupacion) errors.push("Ocupación");

            /* Student validation removed */

            // Validación Edad
            const calculatedAge = profileData.fecha_nacimiento
                ? differenceInYears(new Date(), new Date(profileData.fecha_nacimiento))
                : 0;

            if (calculatedAge < 18) {
                setAgeAlertOpen(true);
                setSaving(false);
                return;
            }
        }

        if (section === 'profile') {
            if (!profileData.descripcion) errors.push("Sobre mí");
            if (profileData.descripcion && profileData.descripcion.length < 100) {
                setAlertState({
                    isOpen: true,
                    title: "Descripción muy corta",
                    message: `La descripción "Sobre mí" debe tener al menos 100 caracteres. (Actual: ${profileData.descripcion.length})`,
                    type: "warning"
                });
                setSaving(false);
                return;
            }
            if (!profileData.tipo_vivienda) errors.push("Tipo de Vivienda");
            if (!profileData.tiene_mascotas) errors.push("¿Tienes mascotas?");
        }

        if (errors.length > 0) {
            setAlertState({
                isOpen: true,
                title: "Faltan datos",
                message: `Por favor completa los siguientes campos obligatorios: ${errors.join(", ")}`,
                type: "warning"
            });
            setSaving(false);
            return;
        }

        try {
            // Construir updates basados en la sección para evitar sobrescribir con datos antiguos si hubiera desincronización (aunque el estado es unico)
            // En React `profileData` es la fuente de verdad, así que mandamos todo o solo lo relevante. 
            // Mandar todo es más seguro para mantener consistencia si el backend espera el objeto completo, 
            // pero Supabase acepta partials. Mandaremos todo el objeto `profileData` ya que lo tenemos en memoria actualizado.

            // ADMIN FIX: Ensure 'petmate' role is assigned
            let currentRoles = profileData.roles || [];
            if (!currentRoles.includes('petmate')) {
                currentRoles = [...currentRoles, 'petmate'];
            }

            let updates: any = { roles: currentRoles };


            if (section === 'contact') {
                updates = {
                    ...updates,
                    telefono: profileData.telefono,
                    region: profileData.region,
                    comuna: profileData.comuna,
                    redes_sociales: profileData.redes_sociales,
                };
            } else if (section === 'personal') {
                updates = {
                    ...updates,
                    nombre: profileData.nombre,
                    apellido_p: profileData.apellido_p,
                    apellido_m: profileData.apellido_m,
                    rut: cleanRut(profileData.rut),
                    fecha_nacimiento: profileData.fecha_nacimiento,
                    sexo: profileData.sexo,
                    ocupacion: profileData.ocupacion,
                    // Student fields if they existed
                };
            } else if (section === 'profile') {
                updates = {
                    ...updates,
                    descripcion: profileData.descripcion,
                    tipo_vivienda: profileData.tipo_vivienda,
                    tiene_mascotas: profileData.tiene_mascotas === "si",
                    detalles_mascotas: profileData.detalles_mascotas,
                    videos: profileData.videos,
                    calle: profileData.calle,
                    numero: profileData.numero,
                    latitud: profileData.latitud,
                    longitud: profileData.longitud,
                    direccion_completa: profileData.direccion_completa,
                };
            } else if (section === 'services') {
                updates = {
                    ...updates,
                    cuida_perros: profileData.cuida_perros,
                    cuida_gatos: profileData.cuida_gatos,
                    servicio_a_domicilio: profileData.servicio_a_domicilio,
                    servicio_en_casa: profileData.servicio_en_casa,
                    tarifa_servicio_a_domicilio: profileData.tarifa_servicio_a_domicilio,
                    tarifa_servicio_en_casa: profileData.tarifa_servicio_en_casa,
                    tamanos_perros: profileData.tamanos_perros
                };
            } else {
                // Should not happen, but fallback to full object if section is null or unknown
                // Or easier: just return if no section matches
                setSaving(false);
                return;
            }

            const { data, error } = await supabase
                .from("registro_petmate")
                .update(updates)
                .eq("auth_user_id", userId)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error("No se guardaron los cambios. Puede que tu sesión haya expirado.");
            }

            setShowToast(true);
            setBackupProfileData(JSON.parse(JSON.stringify(profileData)));
            setActiveSection(null);

        } catch (error) {
            console.error("Error updating profile:", error);
            setAlertState({
                isOpen: true,
                title: "Error al actualizar",
                message: "Hubo un error al actualizar el perfil: " + (error as any).message,
                type: "error"
            });
        } finally {
            setSaving(false);
        }
    };

    const displayName = profileData?.nombre || nombre || "Sitter";

    // Completion Logic
    const contactComplete = Boolean(profileData.telefono && profileData.region && profileData.comuna);
    const personalComplete = Boolean(profileData.nombre && profileData.apellido_p && profileData.rut && profileData.fecha_nacimiento && profileData.sexo && profileData.ocupacion);
    const profileComplete = Boolean(profileData.descripcion && profileData.descripcion.length >= 100 && profileData.tipo_vivienda && profileData.tiene_mascotas);


    return (
        <>
            <Head>
                <title>Panel Sitter — Pawnecta</title>
            </Head>

            <main className="bg-slate-50 min-h-[calc(100vh-80px)]">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">

                    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                Hola, {displayName} 👋
                                {isProfileComplete && (
                                    <span className="ml-3 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-sm">
                                        Perfl Completo ✅
                                    </span>
                                )}
                            </h1>
                            <p className="text-sm text-slate-600">
                                Gestiona tus reservas y perfil.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 mt-4 sm:mt-0">
                            <Link href="/sitter/explorar" className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 transition-all hover:-translate-y-0.5">
                                🔍 Buscar Oportunidades
                            </Link>
                            <Link href={userId ? `/sitter/${userId}` : '/explorar'} target="_blank" className="hidden sm:inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                                Ver perfil público ↗
                            </Link>
                        </div>
                    </header>



                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                        {/* SIDEBAR: Identidad y Verificación (Col-span-4) */}
                        <div className="lg:col-span-4 space-y-6">

                            {/* Tarjeta de Identidad Consolidada */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden group hover:shadow-2xl hover:shadow-emerald-900/10 transition-all duration-300">
                                {/* Header con gradiente premium */}
                                <div className="h-32 bg-gradient-to-br from-emerald-600 to-teal-800 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                </div>

                                <div className="px-6 pb-6 text-center -mt-16 relative">
                                    <div className="relative w-32 h-32 mx-auto mb-4">
                                        <div
                                            className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-white cursor-pointer group-avatar"
                                            onClick={() => setIsLightboxOpen(true)}
                                        >
                                            {profileData.foto_perfil ? (
                                                <Image
                                                    src={profileData.foto_perfil}
                                                    alt="Foto perfil"
                                                    fill
                                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full bg-slate-50 text-slate-300">
                                                    <User size={48} strokeWidth={1.5} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Botón Editar (Lápiz) Flotante */}
                                        <label className="absolute bottom-1 right-1 p-2 bg-white/90 backdrop-blur-sm border border-slate-100 rounded-full shadow-lg cursor-pointer hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 transition-all z-10 hover:scale-110 active:scale-95">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handlePhotoUpload}
                                                disabled={uploading}
                                            />
                                            {uploading ? (
                                                <Loader2 className="animate-spin w-4 h-4" />
                                            ) : (
                                                <Edit2 size={16} />
                                            )}
                                        </label>
                                    </div>

                                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">{displayName}</h2>
                                    <p className="text-sm text-slate-500 font-medium">{email}</p>

                                    {/* Estado de Verificación Premium */}
                                    <div className="mt-6 flex items-center justify-center gap-2">
                                        <div className={`
                                            px-4 py-2 rounded-xl border flex items-center gap-2 text-sm font-semibold transition-colors
                                            ${profileData.aprobado
                                                ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                                : profileData.certificado_antecedentes
                                                    ? "bg-amber-50 border-amber-100 text-amber-700"
                                                    : "bg-slate-50 border-slate-100 text-slate-600"
                                            }
                                        `}>
                                            {profileData.aprobado ? (
                                                <> <ShieldCheck size={18} /> <span>Verificado</span> </>
                                            ) : profileData.certificado_antecedentes ? (
                                                <> <Clock size={18} /> <span>En Revisión</span> </>
                                            ) : (
                                                <> <ShieldAlert size={18} /> <span>No Verificado</span> </>
                                            )}
                                        </div>
                                    </div>

                                    <p className="mt-3 text-xs text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                                        {profileData.aprobado
                                            ? "Perfil activo y visible para clientes."
                                            : profileData.certificado_antecedentes
                                                ? "Validando documentos..."
                                                : "Sube tu certificado para activar."}
                                    </p>

                                </div>

                                {/* Stats & Documents Section */}
                                <div className="bg-slate-50/50 border-t border-slate-100 p-6 space-y-6">

                                    {/* Reviews Stats */}
                                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                                <Star size={18} fill="currentColor" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Valoración</p>
                                                <p className="text-sm font-bold text-slate-900 flex items-center gap-1">
                                                    {averageRating.toFixed(1)} <span className="text-slate-400 font-normal">({reviews.length})</span>
                                                </p>
                                            </div>
                                        </div>
                                        <Link href="/sitter/reviews" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline">
                                            Ver todas
                                        </Link>
                                    </div>

                                    {/* Documentos */}
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <FileCheck size={14} className="text-slate-400" /> Documentación
                                        </h4>
                                        {profileData.certificado_antecedentes ? (
                                            <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm group/file hover:border-emerald-200 transition-colors">
                                                <div className="p-2.5 bg-slate-100 text-slate-500 rounded-lg group-hover/file:bg-emerald-50 group-hover/file:text-emerald-600 transition-colors">
                                                    <FileText size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-slate-700 truncate">Antecedentes.pdf</p>
                                                    <div className="flex gap-3 mt-1.5">
                                                        <button
                                                            onClick={() => handleViewDocument(profileData.certificado_antecedentes)}
                                                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                                        >
                                                            <Eye size={10} /> Ver
                                                        </button>
                                                        <button
                                                            onClick={handleDeleteDocument}
                                                            disabled={uploading}
                                                            className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
                                                        >
                                                            {uploading ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />} Eliminar
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="text-emerald-500">
                                                    <CheckCircle2 size={16} />
                                                </div>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-400 hover:bg-emerald-50/30 cursor-pointer transition-all group/upload">
                                                <div className="p-3 bg-slate-100 text-slate-400 rounded-full group-hover/upload:bg-emerald-100 group-hover/upload:text-emerald-600 transition-colors">
                                                    <Upload size={20} />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs font-bold text-slate-700 group-hover/upload:text-emerald-700">Subir Certificado</p>
                                                    <p className="text-[10px] text-slate-400">PDF o Imagen</p>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    className="hidden"
                                                    onChange={handleCertUpload}
                                                    disabled={uploading}
                                                />
                                            </label>
                                        )}
                                    </div>

                                    {/* Galería */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                                <ImagePlus size={14} className="text-slate-400" /> Galería
                                            </h4>
                                            <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                                                {profileData.galeria.length}/6
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            {(profileData.galeria as string[]).map((photo, index) => (
                                                <div
                                                    key={index}
                                                    className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group/photo shadow-sm hover:shadow-md transition-all"
                                                    onClick={() => setSelectedImage(photo)}
                                                >
                                                    <Image
                                                        src={photo}
                                                        alt={`Foto ${index + 1}`}
                                                        fill
                                                        className="object-cover transition-transform duration-500 group-hover/photo:scale-110"
                                                        unoptimized
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeletePhoto(index);
                                                            }}
                                                            className="p-1 bg-white/20 hover:bg-red-500 backdrop-blur-md rounded-full text-white transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Add Button */}
                                            {profileData.galeria.length < 6 && (
                                                <label className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 text-slate-400 hover:text-emerald-600 transition-all">
                                                    <Plus size={24} />
                                                    <span className="text-[10px] font-bold">Añadir</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        className="hidden"
                                                        onChange={handleGalleryUpload}
                                                        disabled={uploading}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-2 sm:hidden text-center">
                                        <Link href={userId ? `/sitter/${userId}` : '/explorar'} target="_blank" className="text-xs font-bold text-emerald-600 hover:underline">
                                            Ver perfil público ↗
                                        </Link>
                                    </div>

                                </div>
                            </div>
                        </div>


                        {/* MAIN CONTENT: Reservas y Datos (Col-span-8) */}
                        <div className="lg:col-span-8 space-y-6">

                            {/* TAB NAVIGATION */}
                            {/* TABS NAVIGATION */}
                            {/* TABS NAVIGATION */}
                            <div className="flex w-full border border-slate-200 rounded-xl p-1 bg-white shadow-sm mb-6">
                                <button
                                    onClick={() => setActiveTab('solicitudes')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'solicitudes' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <BarChart size={18} /> Solicitudes
                                </button>
                                <div className="w-px bg-slate-100 my-2"></div>
                                <button
                                    onClick={() => setActiveTab('servicios')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'servicios' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <Briefcase size={18} /> Servicios
                                </button>
                                <div className="w-px bg-slate-100 my-2"></div>
                                <button
                                    onClick={() => setActiveTab('disponibilidad')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'disponibilidad' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <Calendar size={18} /> Disponibilidad
                                </button>
                                <div className="w-px bg-slate-100 my-2"></div>
                                <button
                                    onClick={() => setActiveTab('perfil')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'perfil' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <User size={18} /> Mi Perfil
                                    {isProfileComplete ? <div className="w-2 h-2 rounded-full bg-emerald-500" title="Completo"></div> : <div className="w-2 h-2 rounded-full bg-amber-400" title="Pendiente"></div>}
                                </button>
                            </div>




                            {/* BLOQUE NUEVO: Solicitudes Pendientes (Prioridad Alta) */}

                            {/* DISPONIBILIDAD TAB */}
                            {activeTab === 'disponibilidad' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {userId ? (
                                        <AvailabilityCalendar sitterId={userId} />
                                    ) : (
                                        <div className="p-8 text-center text-slate-500">Cargando perfil...</div>
                                    )}
                                </div>
                            )}

                            {/* BLOQUE 0: Preferencias y Servicios (MOVIDO AL TOP) */}
                            {activeTab === 'servicios' && (

                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                                        <div className="flex items-center gap-2 flex-1">
                                            <button
                                                onClick={() => toggleSection('services')}
                                                className="p-1.5 bg-white border border-slate-200 rounded-md shadow-sm text-slate-500 hover:text-emerald-600 hover:border-emerald-300 transition-all mr-1"
                                            >
                                                {expandedSections.services ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                            </button>
                                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                                âš™ï¸ Mis Servicios y Tarifas
                                            </h3>
                                        </div>
                                        {activeSection === 'services' ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        if (backupProfileData) setProfileData(JSON.parse(JSON.stringify(backupProfileData)));
                                                        setActiveSection(null);
                                                    }}
                                                    className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={() => handleSaveSection('services')}
                                                    disabled={saving}
                                                    className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-md font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                                >
                                                    {saving ? "..." : "Guardar"}
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setActiveSection('services')}
                                                disabled={activeSection !== null && activeSection !== 'services'}
                                                className="text-xs text-emerald-600 font-bold hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                Editar
                                            </button>
                                        )}
                                    </div>

                                    {expandedSections.services && (
                                        <div>
                                            <div className="mb-6 space-y-6">
                                                {/* Group 1: Mascotas */}
                                                <div>
                                                    <h5 className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wide">¿Qué mascotas cuidas?</h5>
                                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                                        <label className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${activeSection === 'services' ? "bg-white border-slate-200 cursor-pointer hover:border-emerald-300" : "bg-white border-transparent opacity-75"}`}>
                                                            <input type="checkbox" disabled={activeSection !== 'services'} checked={profileData.cuida_perros} onChange={(e) => setProfileData({ ...profileData, cuida_perros: e.target.checked })} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                                                            <span className="flex items-center gap-1"><Dog className="w-4 h-4 text-slate-500" /> Perros</span>
                                                        </label>
                                                        <label className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${activeSection === 'services' ? "bg-white border-slate-200 cursor-pointer hover:border-emerald-300" : "bg-white border-transparent opacity-75"}`}>
                                                            <input type="checkbox" disabled={activeSection !== 'services'} checked={profileData.cuida_gatos} onChange={(e) => setProfileData({ ...profileData, cuida_gatos: e.target.checked })} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                                                            <span className="flex items-center gap-1"><Cat className="w-4 h-4 text-slate-500" /> Gatos</span>
                                                        </label>
                                                    </div>

                                                    {/* Dog Sizes Selector (Conditional) */}
                                                    {profileData.cuida_perros && (
                                                        <div className="pl-2 border-l-2 border-slate-100 ml-1">
                                                            <label className="block text-xs font-bold text-slate-500 mb-2">¿Qué tamaños de perro aceptas?</label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {['Pequeño', 'Mediano', 'Grande', 'Gigante'].map((size) => (
                                                                    <label key={size} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${activeSection === 'services' ? "cursor-pointer" : "opacity-75 cursor-not-allowed"} ${profileData.tamanos_perros?.includes(size) ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                                                                        <input
                                                                            type="checkbox"
                                                                            disabled={activeSection !== 'services'}
                                                                            className="hidden"
                                                                            checked={profileData.tamanos_perros?.includes(size) || false}
                                                                            onChange={(e) => {
                                                                                const current = profileData.tamanos_perros || [];
                                                                                const newSizes = e.target.checked
                                                                                    ? [...current, size]
                                                                                    : current.filter((s: string) => s !== size);
                                                                                setProfileData({ ...profileData, tamanos_perros: newSizes });
                                                                            }}
                                                                        />
                                                                        {size}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Group 2: Ubicación */}
                                                <div>
                                                    <h5 className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wide">¿Dónde las cuidas?</h5>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <label className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${activeSection === 'services' ? "bg-white border-slate-200 cursor-pointer hover:border-emerald-300" : "bg-white border-transparent opacity-75"}`}>
                                                            <input type="checkbox" disabled={activeSection !== 'services'} checked={profileData.servicio_a_domicilio} onChange={(e) => setProfileData({ ...profileData, servicio_a_domicilio: e.target.checked })} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                                                            <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-slate-500" /> A Domicilio</span>
                                                        </label>
                                                        <label className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${activeSection === 'services' ? "bg-white border-slate-200 cursor-pointer hover:border-emerald-300" : "bg-white border-transparent opacity-75"}`}>
                                                            <input type="checkbox" disabled={activeSection !== 'services'} checked={profileData.servicio_en_casa} onChange={(e) => setProfileData({ ...profileData, servicio_en_casa: e.target.checked })} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                                                            <span className="flex items-center gap-1"><Home className="w-4 h-4 text-slate-500" /> En mi Casa</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tarifas */}
                                            {(profileData.servicio_a_domicilio || profileData.servicio_en_casa) && (
                                                <div className="mt-4 pt-4 border-t border-slate-100">
                                                    <h5 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">Tarifas (CLP)</h5>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {profileData.servicio_a_domicilio && (
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-700 mb-1.5">A Domicilio (por visita)</label>
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-2 text-slate-400">$</span>
                                                                    <input
                                                                        type="text"
                                                                        disabled={activeSection !== 'services'}
                                                                        className={`w-full pl-6 text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'services' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                                        value={formatPrice(profileData.tarifa_servicio_a_domicilio)}
                                                                        onChange={(e) => setProfileData({ ...profileData, tarifa_servicio_a_domicilio: parsePrice(e.target.value) })}
                                                                        placeholder="Ej: 15.000"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {profileData.servicio_en_casa && (
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-700 mb-1.5">En mi Casa (por noche)</label>
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-2 text-slate-400">$</span>
                                                                    <input
                                                                        type="text"
                                                                        disabled={activeSection !== 'services'}
                                                                        className={`w-full pl-6 text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'services' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                                        value={formatPrice(profileData.tarifa_servicio_en_casa)}
                                                                        onChange={(e) => setProfileData({ ...profileData, tarifa_servicio_en_casa: parsePrice(e.target.value) })}
                                                                        placeholder="Ej: 20.000"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'solicitudes' && (
                                <>
                                    {/* BLOQUE NUEVO: Solicitudes por Aceptar (Entrantes) */}
                                    {bookings.some(b => b.estado === 'publicado') && (
                                        <div className="bg-amber-50 rounded-xl border border-amber-200 shadow-sm p-5 mb-6">
                                            <h3 className="text-base font-bold text-amber-900 mb-4 flex items-center gap-2">
                                                <Inbox size={18} /> Solicitudes por Aceptar
                                            </h3>
                                            <div className="grid gap-3">
                                                {bookings.filter(b => b.estado === 'publicado').map(booking => (
                                                    <div key={booking.id} className="p-4 bg-white rounded-lg border border-amber-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-sm font-bold text-slate-900">{booking.cliente.nombre} {booking.cliente.apellido_p}</span>
                                                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase border border-amber-200">Nueva Solicitud</span>
                                                            </div>
                                                            <div className="text-xs text-slate-500 flex flex-col gap-1">
                                                                <span className="flex items-center gap-1 font-medium text-slate-700">
                                                                    <Calendar size={12} /> {format(new Date(booking.fecha_inicio), "d MMM", { locale: es })} - {format(new Date(booking.fecha_fin), "d MMM", { locale: es })}
                                                                </span>
                                                                {/* Pet Summary for this request */}
                                                                {(() => {
                                                                    const petIds = booking.mascotas_ids || [];
                                                                    const pets = petIds.map((pid: string) => petsCache[pid]).filter(Boolean);
                                                                    return (
                                                                        <div className="flex gap-1 mt-1">
                                                                            {pets.map((p: any) => (
                                                                                <span key={p.id} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                                                                                    {p.tipo === 'perro' ? <Dog size={10} /> : <Cat size={10} />} {p.nombre}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )
                                                                })()}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 w-full sm:w-auto">
                                                            <button
                                                                onClick={() => handleAcceptClick(booking.id, `${booking.cliente.nombre} ${booking.cliente.apellido_p}`)}
                                                                className="flex-1 sm:flex-none bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-emerald-700 shadow-sm transition-colors flex items-center justify-center gap-2"
                                                            >
                                                                <Check size={14} /> Aceptar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* BLOQUE: Esperando Confirmación (Reservado) */}
                                    {bookings.some(b => b.estado === 'reservado') && (
                                        <div className="bg-indigo-50 rounded-xl border border-indigo-200 shadow-sm p-5 mb-6">
                                            <h3 className="text-base font-bold text-indigo-900 mb-4 flex items-center gap-2">
                                                <Clock size={18} /> Esperando Confirmación
                                            </h3>
                                            <div className="grid gap-3">
                                                {bookings.filter(b => b.estado === 'reservado').map(booking => (
                                                    <div key={booking.id} className="p-4 bg-white rounded-lg border border-indigo-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-sm font-bold text-slate-900">{booking.cliente.nombre} {booking.cliente.apellido_p}</span>
                                                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase border border-indigo-200">Aceptado</span>
                                                            </div>
                                                            <div className="text-xs text-slate-500 flex flex-col gap-1">
                                                                <span className="flex items-center gap-1 font-medium text-slate-700">
                                                                    <Calendar size={12} /> {format(new Date(booking.fecha_inicio), "d MMM", { locale: es })} - {format(new Date(booking.fecha_fin), "d MMM", { locale: es })}
                                                                </span>
                                                                {(() => {
                                                                    const petIds = booking.mascotas_ids || [];
                                                                    const pets = petIds.map((pid: string) => petsCache[pid]).filter(Boolean);
                                                                    return (
                                                                        <div className="flex gap-1 mt-1">
                                                                            {pets.map((p: any) => (
                                                                                <span key={p.id} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                                                                                    {p.tipo === 'perro' ? <Dog size={10} /> : <Cat size={10} />} {p.nombre}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )
                                                                })()}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-indigo-600 font-medium bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 max-w-[200px] text-center">
                                                            Has aceptado esta solicitud. Esperando confirmación final.
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Existing Pending Logic (kept for 'pendiente' status if any remain) */}
                                    {bookings.some(b => b.estado === 'pendiente') && (
                                        <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-5 bg-orange-50/30 mb-6">
                                            <h3 className="text-base font-bold text-orange-900 mb-4 flex items-center gap-2">
                                                <Inbox size={18} /> Solicitudes Pendientes (Otros Estados)
                                            </h3>
                                            <div className="grid gap-3">
                                                {bookings.filter(b => b.estado === 'pendiente').map(booking => (
                                                    <div key={booking.id} className="p-4 bg-white rounded-lg border border-orange-100 shadow-sm">
                                                        <span className="text-sm font-bold">{booking.cliente.nombre}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* BLOQUE NUEVO: Mis Postulaciones (Oportunidades) */}
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4">
                                        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                                            <Send size={18} /> Mis Postulaciones
                                        </h3>
                                        {applications.filter(app => app.estado !== 'aceptada').length > 0 ? (
                                            <div className="grid gap-3">
                                                {applications.filter(app => app.estado !== 'aceptada').map((app) => (
                                                    <div key={app.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-sm font-bold text-slate-900">
                                                                    {app.viaje?.cliente?.nombre || "Cliente"} {app.viaje?.cliente?.apellido_p || ""}
                                                                </span>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase
                                                                    ${app.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-red-100 text-red-700'}`}>
                                                                    {app.estado}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-slate-500 mb-2 flex flex-wrap gap-2">
                                                                <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded"><MapPin size={12} /> {app.viaje?.comuna || "Santiago"}</span>
                                                                <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded"><Calendar size={12} /> {app.viaje?.fecha_inicio ? format(new Date(app.viaje.fecha_inicio), "d MMM", { locale: es }) : "?"}</span>
                                                                {/* Pets Display */}
                                                                {(app.viaje?.mascotas_ids || []).map((pid: string) => {
                                                                    const pet = petsCache[pid];
                                                                    if (!pet) return null;
                                                                    return (
                                                                        <span key={pid} className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100" title={pet.nombre}>
                                                                            {pet.tipo === 'perro' ? <Dog size={12} /> : pet.tipo === 'gato' ? <Cat size={12} /> : <PawPrint size={12} />}
                                                                            {pet.nombre}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                            {app.mensaje && (
                                                                <p className="text-xs text-slate-600 italic">"{app.mensaje}"</p>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="block text-xs text-slate-400 font-medium">Oferta</span>
                                                            <span className="text-sm font-bold text-slate-900">
                                                                ${formatPrice(app.precio_oferta || app.viaje?.presupuesto_total || 0)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-slate-400 text-sm">
                                                No has postulado a ninguna oportunidad aún.
                                            </div>
                                        )}
                                    </div>

                                    {/* BLOQUE 1: Próximas Reservas (Confirmadas) */}
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
                                            <span className="flex items-center gap-2"><CalendarCheck size={18} /> Solicitudes Agendadas</span>
                                        </h3>

                                        {(() => {
                                            // 1. Normalize accepted applications (which are effectively confirmed bookings)
                                            const acceptedAppsAsBookings = applications
                                                .filter(app => app.estado === 'aceptada')
                                                .map(app => ({
                                                    id: app.viaje?.id || app.id,
                                                    cliente: app.viaje?.cliente,
                                                    mascotas_ids: app.viaje?.mascotas_ids,
                                                    fecha_inicio: app.viaje?.fecha_inicio,
                                                    fecha_fin: app.viaje?.fecha_fin,
                                                    estado: 'confirmada', // Treat as confirmed
                                                    isApplication: true
                                                }));

                                            // 2. Merge bookings and accepted applications
                                            // KEY CHANGE: Strictly show ONLY confirmed services here.
                                            // 'publicado' goes to "Solicitudes por Aceptar"
                                            // 'pendiente' goes to "Solicitudes Pendientes" (if enabled) or remains in limbo until accepted/rejected
                                            const confirmedServices = bookings
                                                .filter(b => b.estado === 'confirmado' || b.estado === 'confirmada')
                                                .concat(acceptedAppsAsBookings.filter(app => !bookings.some(b => b.id === app.id)))
                                                .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime());

                                            return confirmedServices.length > 0 ? (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                                                            <tr>
                                                                <th className="px-4 py-3 font-medium">Reserva</th>
                                                                <th className="px-4 py-3 font-medium">Cliente</th>
                                                                <th className="px-4 py-3 font-medium">Mascota</th>
                                                                <th className="px-4 py-3 font-medium">Fechas</th>
                                                                <th className="px-4 py-3 font-medium">Estado</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {confirmedServices.map((book: any) => (
                                                                <tr key={book.id} className="hover:bg-slate-50 transition-colors">
                                                                    <td className="px-4 py-3 font-bold text-slate-900">
                                                                        #{book.id.slice(0, 6)}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-slate-600">
                                                                        <div className="flex flex-col">
                                                                            <button
                                                                                onClick={() => { setSelectedClient(book.cliente); setShowClientDialog(true); }}
                                                                                className="font-bold text-slate-900 hover:text-emerald-600 text-left transition-colors flex items-center gap-1 group"
                                                                            >
                                                                                {book.cliente?.nombre} {book.cliente?.apellido_p}
                                                                                <Eye size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500" />
                                                                            </button>
                                                                            <a href={`mailto:${book.cliente?.email}`} className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                                                                                <Mail size={10} /> {book.cliente?.email}
                                                                            </a>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-slate-600">
                                                                        {(() => {
                                                                            const petIds = book.mascotas_ids || [];
                                                                            const pets = petIds.map((pid: string) => petsCache[pid]).filter(Boolean);
                                                                            const dogCount = pets.filter((p: any) => p.tipo === 'perro').length;
                                                                            const catCount = pets.filter((p: any) => p.tipo === 'gato').length;
                                                                            const otherCount = pets.length - dogCount - catCount;

                                                                            if (pets.length === 0) return <span className="text-xs italic text-slate-400">Sin ficha</span>;

                                                                            return (
                                                                                <button
                                                                                    onClick={() => { setSelectedPets(pets); setShowPetDialog(true); }}
                                                                                    className="group flex flex-wrap gap-2 items-center hover:scale-105 transition-transform p-1 rounded-lg border border-transparent hover:border-slate-200 hover:bg-white hover:shadow-sm"
                                                                                    title="Ver ficha de mascotas"
                                                                                >
                                                                                    {dogCount > 0 && <span className="flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100"><Dog size={12} /> {dogCount}</span>}
                                                                                    {catCount > 0 && <span className="flex items-center gap-1 text-xs font-medium bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full border border-sky-100"><Cat size={12} /> {catCount}</span>}
                                                                                    {otherCount > 0 && <span className="flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full border border-gray-200"><PawPrint size={12} /> {otherCount}</span>}
                                                                                </button>
                                                                            );
                                                                        })()}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-slate-600">
                                                                        <div className="flex flex-col">
                                                                            <span>{format(new Date(book.fecha_inicio), "d MMM", { locale: es })} - {format(new Date(book.fecha_fin), "d MMM", { locale: es })}</span>

                                                                            {/* Countdown Logic */}
                                                                            {(() => {
                                                                                const daysLeft = differenceInDays(new Date(book.fecha_inicio), new Date());
                                                                                if (daysLeft < 0) return <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 w-fit px-1.5 rounded mt-0.5">En curso / Finalizado</span>;
                                                                                if (daysLeft === 0) return <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 w-fit px-1.5 rounded mt-0.5 animate-pulse">¡Comienza hoy!</span>;
                                                                                return <span className="text-[10px] font-bold text-sky-600 uppercase bg-sky-50 w-fit px-1.5 rounded mt-0.5">Faltan {daysLeft} días</span>;
                                                                            })()}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex flex-col gap-2 align-top">
                                                                            {(() => {
                                                                                const getStatusConfig = (status: string) => {
                                                                                    switch (status) {
                                                                                        case 'publicado': return { label: 'Solicitado', color: 'bg-amber-100 text-amber-800', tooltip: 'El cliente ha solicitado este servicio. Pendiente de tu confirmación final o pago.' };
                                                                                        case 'reservado': return { label: 'Reservado', color: 'bg-indigo-100 text-indigo-800', tooltip: 'Tu postulación fue elegida. Esperando detalles finales.' };
                                                                                        case 'confirmada': return { label: 'Confirmado', color: 'bg-emerald-100 text-emerald-800', tooltip: '¡Todo listo! El servicio está pagado y agendado.' };
                                                                                        case 'pendiente': return { label: 'Pendiente', color: 'bg-orange-100 text-orange-800', tooltip: 'Tu postulación está en espera de respuesta del cliente.' };
                                                                                        default: return { label: status, color: 'bg-gray-100 text-gray-800', tooltip: 'Estado del servicio' };
                                                                                    }
                                                                                };

                                                                                // Override for accepted applications being treated as bookings
                                                                                const displayStatus = book.isApplication ? 'confirmada' : book.estado;
                                                                                const config = getStatusConfig(displayStatus);

                                                                                return (
                                                                                    <div className="group relative w-fit">
                                                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium cursor-help ${config.color}`}>
                                                                                            {config.label}
                                                                                        </span>
                                                                                        {/* Tooltip */}
                                                                                        <div className="absolute right-0 top-full mt-1 hidden group-hover:block w-48 z-20">
                                                                                            <div className="bg-slate-800 text-white text-[10px] rounded p-2 shadow-lg leading-tight w-40">
                                                                                                {config.tooltip}
                                                                                                <div className="w-2 h-2 bg-slate-800 rotate-45 absolute right-4 -top-1"></div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })()}

                                                                            <button
                                                                                onClick={() => {
                                                                                    const petIds = book.mascotas_ids || [];
                                                                                    const pets = petIds.map((pid: string) => petsCache[pid]).filter(Boolean);
                                                                                    setPrintBooking({ booking: book, pets: pets });
                                                                                    setTimeout(() => window.print(), 100);
                                                                                }}
                                                                                className="text-xs flex items-center gap-1 text-slate-500 hover:text-emerald-600 transition-colors font-medium border border-slate-200 rounded px-2 py-1 bg-white hover:border-emerald-300 w-fit"
                                                                                title="Imprimir Ficha de Servicio"
                                                                            >
                                                                                <Printer size={12} /> Ficha
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                                    <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                                                        <Inbox size={24} className="text-slate-300" />
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-900">No tienes servicios agendados</p>
                                                    <p className="text-xs text-slate-500 mt-1">Cuando aceptes una solicitud, aparecerá aquí.</p>
                                                </div>
                                            );
                                        })()}
                                    </div >
                                </>
                            )
                            }

                            {
                                activeTab === 'perfil' && (
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">


                                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                                            <h3 className="text-base font-bold text-slate-900">Perfil</h3>
                                        </div>

                                        {/* Alerta de Perfil Incompleto */}
                                        {(!profileData.fecha_nacimiento || !profileData.ocupacion || !profileData.descripcion) && (
                                            <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
                                                <div className="text-orange-500 mt-0.5">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-orange-800">Completa tu Perfil</h4>
                                                    <p className="text-xs text-orange-700 mt-1">
                                                        Para activar tu cuenta y recibir reservas, es necesario que completes tu información personal (Fecha de Nacimiento, Ocupación y Sobre mí).
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-8">

                                            {/* BLOQUE 1: Datos de Contacto */}
                                            <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                                                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <button
                                                            onClick={() => toggleSection('contact')}
                                                            className="p-1.5 bg-white border border-slate-200 rounded-md shadow-sm text-slate-500 hover:text-emerald-600 hover:border-emerald-300 transition-all mr-1"
                                                        >
                                                            {expandedSections.contact ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                        </button>
                                                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                            <div className="bg-white p-1 rounded-md shadow-sm border border-slate-100"><Mail className="w-4 h-4 text-slate-500" /></div>
                                                            Datos de Contacto
                                                            {contactComplete ? (
                                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase ml-2">Completo</span>
                                                            ) : (
                                                                <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold uppercase ml-2">Incompleto</span>
                                                            )}
                                                        </h4>
                                                    </div>
                                                    {activeSection === 'contact' ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    if (backupProfileData) setProfileData(JSON.parse(JSON.stringify(backupProfileData)));
                                                                    setActiveSection(null);
                                                                }}
                                                                className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                onClick={() => handleSaveSection('contact')}
                                                                disabled={saving}
                                                                className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-md font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                                            >
                                                                {saving ? "..." : "Guardar"}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setActiveSection('contact')}
                                                            disabled={activeSection !== null && activeSection !== 'contact'}
                                                            className="text-xs text-emerald-600 font-bold hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            Editar
                                                        </button>
                                                    )}
                                                </div>
                                                {expandedSections.contact && (
                                                    <>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Email</label>
                                                                <input
                                                                    type="email"
                                                                    disabled
                                                                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-500 cursor-not-allowed"
                                                                    value={email || ""}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Teléfono</label>
                                                                <input
                                                                    type="tel"
                                                                    disabled={activeSection !== 'contact'}
                                                                    maxLength={12}
                                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'contact' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"
                                                                        }`}
                                                                    value={profileData.telefono}
                                                                    onChange={(e) => setProfileData({ ...profileData, telefono: e.target.value })}
                                                                    placeholder="+569 1234 5678"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Región</label>
                                                                <select
                                                                    disabled={activeSection !== 'contact'}
                                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'contact' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500 appearance-none"
                                                                        }`}
                                                                    value={profileData.region}
                                                                    onChange={(e) => setProfileData({ ...profileData, region: e.target.value })}
                                                                >
                                                                    <option value="RM">Metropolitana</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Comuna</label>
                                                                <select
                                                                    disabled={activeSection !== 'contact'}
                                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'contact' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500 appearance-none"
                                                                        }`}
                                                                    value={profileData.comuna}
                                                                    onChange={(e) => setProfileData({ ...profileData, comuna: e.target.value })}
                                                                >
                                                                    <option value="" disabled>Seleccionar</option>
                                                                    {COMUNAS_SANTIAGO.map(c => (
                                                                        <option key={c} value={c}>{c}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="sm:col-span-2 mt-2 pt-2 border-t border-slate-100">
                                                            <h5 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">Redes Sociales (Opcional)</h5>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                                                                        <Linkedin className="w-4 h-4 text-slate-500" /> LinkedIn
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        disabled={activeSection !== 'contact'}
                                                                        className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'contact' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                                        value={profileData.redes_sociales?.linkedin || ""}
                                                                        onChange={(e) => setProfileData({ ...profileData, redes_sociales: { ...profileData.redes_sociales, linkedin: e.target.value } })}
                                                                        placeholder="URL Perfil"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                                                                        <Music className="w-4 h-4 text-slate-500" /> TikTok
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        disabled={activeSection !== 'contact'}
                                                                        className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'contact' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                                        value={profileData.redes_sociales?.tiktok || ""}
                                                                        onChange={(e) => setProfileData({ ...profileData, redes_sociales: { ...profileData.redes_sociales, tiktok: e.target.value } })}
                                                                        placeholder="@usuario"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                                                                        <Instagram className="w-4 h-4 text-slate-500" /> Instagram
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        disabled={activeSection !== 'contact'}
                                                                        className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'contact' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                                        value={profileData.redes_sociales?.instagram || ""}
                                                                        onChange={(e) => setProfileData({ ...profileData, redes_sociales: { ...profileData.redes_sociales, instagram: e.target.value } })}
                                                                        placeholder="@usuario"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                                                                        <Facebook className="w-4 h-4 text-slate-500" /> Facebook
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        disabled={activeSection !== 'contact'}
                                                                        className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'contact' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                                        value={profileData.redes_sociales?.facebook || ""}
                                                                        onChange={(e) => setProfileData({ ...profileData, redes_sociales: { ...profileData.redes_sociales, facebook: e.target.value } })}
                                                                        placeholder="URL Perfil"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>


                                            {/* BLOQUE 2: Información Personal */}
                                            <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                                                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <button
                                                            onClick={() => toggleSection('personal')}
                                                            className="p-1.5 bg-white border border-slate-200 rounded-md shadow-sm text-slate-500 hover:text-emerald-600 hover:border-emerald-300 transition-all mr-1"
                                                        >
                                                            {expandedSections.personal ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                        </button>
                                                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                            <div className="bg-white p-1 rounded-md shadow-sm border border-slate-100"><User className="w-4 h-4 text-slate-500" /></div>
                                                            Información Personal
                                                            {personalComplete ? (
                                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase ml-2">Completo</span>
                                                            ) : (
                                                                <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold uppercase ml-2">Incompleto</span>
                                                            )}
                                                        </h4>
                                                    </div>
                                                    {activeSection === 'personal' ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    if (backupProfileData) setProfileData(JSON.parse(JSON.stringify(backupProfileData)));
                                                                    setActiveSection(null);
                                                                }}
                                                                className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                onClick={() => handleSaveSection('personal')}
                                                                disabled={saving}
                                                                className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-md font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                                            >
                                                                {saving ? "..." : "Guardar"}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setActiveSection('personal')}
                                                            disabled={activeSection !== null && activeSection !== 'personal'}
                                                            className="text-xs text-emerald-600 font-bold hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            Editar
                                                        </button>
                                                    )}
                                                </div>
                                                {expandedSections.personal && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                                        <div className="sm:col-span-4">
                                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Nombres</label>
                                                            <input
                                                                type="text"
                                                                disabled={activeSection !== 'personal'}
                                                                className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'personal' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                                value={profileData.nombre}
                                                                onChange={(e) => setProfileData({ ...profileData, nombre: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-4">
                                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Apellido Paterno</label>
                                                            <input
                                                                type="text"
                                                                disabled={activeSection !== 'personal'}
                                                                className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'personal' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                                value={profileData.apellido_p}
                                                                onChange={(e) => setProfileData({ ...profileData, apellido_p: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-4">
                                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Apellido Materno</label>
                                                            <input
                                                                type="text"
                                                                disabled={activeSection !== 'personal'}
                                                                className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'personal' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                                value={profileData.apellido_m}
                                                                onChange={(e) => setProfileData({ ...profileData, apellido_m: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-6">
                                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">RUT {activeSection === 'personal' && <span className="text-slate-400 font-normal normal-case">(Ej: 12.345.678-9)</span>}</label>
                                                            <input
                                                                type="text"
                                                                disabled={activeSection !== 'personal'}
                                                                className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'personal' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"
                                                                    } ${activeSection === 'personal' && profileData.rut && !validateRut(profileData.rut) ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}`}
                                                                value={profileData.rut}
                                                                onChange={handleRutChange}
                                                                placeholder="12.345.678-9"
                                                                maxLength={12}
                                                            />
                                                            {activeSection === 'personal' && profileData.rut && !validateRut(profileData.rut) && (
                                                                <p className="text-xs text-red-500 mt-1">RUT inválido</p>
                                                            )}
                                                        </div>
                                                        <div className="sm:col-span-3">
                                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Fecha de Nacimiento</label>
                                                            <div className={activeSection !== 'personal' ? "opacity-60 pointer-events-none" : ""}>
                                                                <DatePickerSingle
                                                                    value={profileData.fecha_nacimiento ? new Date(profileData.fecha_nacimiento + "T12:00:00") : undefined}
                                                                    onChange={(d) => setProfileData({ ...profileData, fecha_nacimiento: d ? format(d, "yyyy-MM-dd") : "" })}
                                                                    disabled={activeSection !== 'personal'}
                                                                    // Solo deshabilitar fechas futuras
                                                                    maxDate={new Date()}
                                                                    // Validar que sea mayor de 18 años al seleccionar
                                                                    validateDate={(d) => differenceInYears(new Date(), d) >= 18}
                                                                    onValidationFail={() => setAgeAlertOpen(true)}
                                                                    defaultMonth={subYears(new Date(), 20)}
                                                                    fromYear={1940}
                                                                    toYear={new Date().getFullYear()}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="sm:col-span-3">
                                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Sexo</label>
                                                            <select
                                                                disabled={activeSection !== 'personal'}
                                                                className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'personal' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500 appearance-none"
                                                                    }`}
                                                                value={profileData.sexo}
                                                                onChange={(e) => setProfileData({ ...profileData, sexo: e.target.value })}
                                                            >
                                                                <option value="masculino">Masculino</option>
                                                                <option value="femenino">Femenino</option>
                                                                <option value="otro">Otro</option>
                                                            </select>
                                                        </div>
                                                        <div className="sm:col-span-6">
                                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Ocupación</label>
                                                            <select
                                                                disabled={activeSection !== 'personal'}
                                                                className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'personal' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500 appearance-none"
                                                                    }`}
                                                                value={profileData.ocupacion}
                                                                onChange={(e) => setProfileData({ ...profileData, ocupacion: e.target.value })}
                                                            >
                                                                <option value="" disabled>Selecciona tu ocupación</option>
                                                                {OCUPACIONES.map(op => (
                                                                    <option key={op} value={op}>{op}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        {/* Campos condicionales para Estudiantes */}
                                                        {/* Student fields removed */}

                                                    </div>
                                                )}
                                            </div>

                                            {/* BLOQUE 3: Perfil */}
                                            <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                                                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">

                                                    <div className="flex items-center gap-2 flex-1">
                                                        <button
                                                            onClick={() => toggleSection('profile')}
                                                            className="p-1.5 bg-white border border-slate-200 rounded-md shadow-sm text-slate-500 hover:text-emerald-600 hover:border-emerald-300 transition-all mr-1"
                                                        >
                                                            {expandedSections.profile ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                        </button>
                                                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                            <div className="bg-white p-1 rounded-md shadow-sm border border-slate-100"><PawPrint className="w-4 h-4 text-slate-500" /></div>
                                                            Perfil Sitter
                                                            {profileComplete ? (
                                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase ml-2">Completo</span>
                                                            ) : (
                                                                <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold uppercase ml-2">Incompleto</span>
                                                            )}
                                                        </h4>
                                                    </div>
                                                    {activeSection === 'profile' ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    if (backupProfileData) setProfileData(JSON.parse(JSON.stringify(backupProfileData)));
                                                                    setActiveSection(null);
                                                                }}
                                                                className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                onClick={() => handleSaveSection('profile')}
                                                                disabled={saving}
                                                                className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-md font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                                            >
                                                                {saving ? "..." : "Guardar"}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setActiveSection('profile')}
                                                            disabled={activeSection !== null && activeSection !== 'profile'}
                                                            className="text-xs text-emerald-600 font-bold hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            Editar
                                                        </button>
                                                    )}
                                                </div>
                                                {expandedSections.profile && (
                                                    <div>


                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

                                                            {/* Búsqueda de Dirección (Solo Edición) */}
                                                            {/* Búsqueda de Dirección (Solo Edición) */}
                                                            {activeSection === 'profile' && (
                                                                <div className="sm:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200 mb-2">
                                                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Buscar Dirección (OpenStreetMap)</label>
                                                                    <AddressAutocomplete
                                                                        onSelect={handleSelectAddress}
                                                                        placeholder="Ej: Av Providencia 1234"
                                                                    />
                                                                    <p className="text-[10px] text-slate-400 mt-1">Busca tu dirección y selecciónala para autocompletar.</p>
                                                                </div>
                                                            )}

                                                            <div className="sm:col-span-2">
                                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Dirección Completa</label>
                                                                <input
                                                                    type="text"
                                                                    disabled={true}
                                                                    className="w-full text-sm bg-slate-100 rounded-lg px-3 py-2 border border-slate-200 text-slate-600 cursor-not-allowed"
                                                                    value={profileData.direccion_completa || "No definida"}
                                                                    readOnly
                                                                />
                                                            </div>

                                                            <div className="sm:col-span-1">
                                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Calle</label>
                                                                <input
                                                                    type="text"
                                                                    disabled={activeSection !== 'profile'}
                                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'profile' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                                    value={profileData.calle || ""}
                                                                    onChange={(e) => setProfileData({ ...profileData, calle: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="sm:col-span-1">
                                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Número</label>
                                                                <input
                                                                    type="text"
                                                                    disabled={activeSection !== 'profile'}
                                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'profile' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                                    value={profileData.numero || ""}
                                                                    onChange={(e) => setProfileData({ ...profileData, numero: e.target.value })}
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Vivienda</label>
                                                                <select
                                                                    disabled={activeSection !== 'profile'}
                                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'profile' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500 appearance-none"
                                                                        }`}
                                                                    value={profileData.tipo_vivienda}
                                                                    onChange={(e) => setProfileData({ ...profileData, tipo_vivienda: e.target.value })}
                                                                >
                                                                    <option value="casa">Casa</option>
                                                                    <option value="departamento">Depto</option>
                                                                    <option value="parcela">Parcela</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">¿Tienes mascotas?</label>
                                                                <select
                                                                    disabled={activeSection !== 'profile'}
                                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'profile' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500 appearance-none"
                                                                        }`}
                                                                    value={profileData.tiene_mascotas}
                                                                    onChange={(e) => setProfileData({ ...profileData, tiene_mascotas: e.target.value })}
                                                                >
                                                                    <option value="no">No</option>
                                                                    <option value="si">Sí</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* Detalles de mascotas si selecciona "Sí" */}
                                                        {profileData.tiene_mascotas === "si" && (
                                                            <div className="mb-4 bg-slate-100 rounded-lg p-3">
                                                                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Cuéntanos sobre tus mascotas</label>

                                                                {(profileData.detalles_mascotas || []).map((mascota: any, idx: number) => (
                                                                    <div key={idx} className="flex gap-2 mb-2 items-center">
                                                                        <select
                                                                            className="text-sm rounded-lg px-2 py-1 border border-slate-300 flex-1 outline-none"
                                                                            value={mascota.tipo}
                                                                            onChange={(e) => {
                                                                                const newDetails = [...(profileData.detalles_mascotas || [])];
                                                                                newDetails[idx].tipo = e.target.value;
                                                                                setProfileData({ ...profileData, detalles_mascotas: newDetails });
                                                                            }}
                                                                            disabled={activeSection !== 'profile'}
                                                                        >
                                                                            <option value="perro">Perro</option>
                                                                            <option value="gato">Gato</option>
                                                                            <option value="otro">Otro</option>
                                                                        </select>
                                                                        <input
                                                                            type="number"
                                                                            min="1"
                                                                            className="w-16 text-sm rounded-lg px-2 py-1 border border-slate-300 outline-none"
                                                                            value={mascota.cantidad}
                                                                            onChange={(e) => {
                                                                                const newDetails = [...(profileData.detalles_mascotas || [])];
                                                                                newDetails[idx].cantidad = parseInt(e.target.value) || 1;
                                                                                setProfileData({ ...profileData, detalles_mascotas: newDetails });
                                                                            }}
                                                                            disabled={activeSection !== 'profile'}
                                                                        />
                                                                        {activeSection === 'profile' && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const newDetails = (profileData.detalles_mascotas || []).filter((_: any, i: number) => i !== idx);
                                                                                    setProfileData({ ...profileData, detalles_mascotas: newDetails });
                                                                                }}
                                                                                className="text-red-500 hover:text-red-700 p-1"
                                                                            >
                                                                                âœ•
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ))}

                                                                {activeSection === 'profile' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setProfileData({
                                                                                ...profileData,
                                                                                detalles_mascotas: [...profileData.detalles_mascotas, { tipo: "perro", cantidad: 1 }]
                                                                            });
                                                                        }}
                                                                        className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1 mt-1"
                                                                    >
                                                                        + Agregar otra mascota
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="mb-4">
                                                            <div className="flex justify-between items-end mb-1.5">
                                                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                                                                    <AlignLeft className="w-4 h-4 text-slate-500" /> Sobre mí
                                                                </label>
                                                                <span className={`text-xs ${profileData.descripcion.length >= 100 ? 'text-emerald-600 font-medium' : 'text-slate-400'
                                                                    }`}>
                                                                    {profileData.descripcion.length} / 100 caracteres mín.
                                                                </span>
                                                            </div>
                                                            <textarea
                                                                rows={4}
                                                                disabled={activeSection !== 'profile'}
                                                                className={`w-full text-sm rounded-lg px-3 py-2 outline-none resize-none transition-all ${activeSection === 'profile' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"
                                                                    }`}
                                                                value={profileData.descripcion}
                                                                onChange={(e) => setProfileData({ ...profileData, descripcion: e.target.value })}
                                                                placeholder="Cuéntanos por qué eres el mejor sitter..."
                                                            />
                                                        </div>



                                                        {/* Videos */}
                                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                                            <h5 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">Videos (YouTube/TikTok)</h5>
                                                            {(profileData.videos || []).map((video: string, idx: number) => (
                                                                <div key={idx} className="flex gap-2 mb-2 items-center">
                                                                    <input
                                                                        type="text"
                                                                        value={video}
                                                                        disabled={activeSection !== 'profile'}
                                                                        onChange={(e) => {
                                                                            const newVideos = [...(profileData.videos || [])];
                                                                            newVideos[idx] = e.target.value;
                                                                            setProfileData({ ...profileData, videos: newVideos });
                                                                        }}
                                                                        className={`flex-1 text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'profile' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                                        placeholder="Ej: https://youtube.com/..."
                                                                    />
                                                                    {activeSection === 'profile' && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const newVideos = profileData.videos.filter((_: any, i: number) => i !== idx);
                                                                                setProfileData({ ...profileData, videos: newVideos });
                                                                            }}
                                                                            className="text-red-500 hover:text-red-700 p-1"
                                                                        >
                                                                            âœ•
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {activeSection === 'profile' && (profileData.videos?.length || 0) < 3 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setProfileData({ ...profileData, videos: [...(profileData.videos || []), ""] })}
                                                                    className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1 mt-1"
                                                                >
                                                                    + Agregar Video
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                        </div>
                                    </div>
                                )
                            }
                        </div >
                    </div >
                </div >





                {/* SECCIÃ“N DERECHA: RESERVAS Y REVIEWS (Solo visible fuera de modo edición para "ver" como queda, o siempre visible para gestión) */}
                {/* En este dashboard de Sitter (autoadministrable), mostramos las solicitudes y reservas reales */}



                {/* TOAST SUCCESS */}
                <div className={`fixed bottom-5 right-5 z-50 transition-all duration-300 transform ${showToast ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"}`}>
                    <div className="bg-slate-900/90 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
                        <div className="bg-emerald-500 rounded-full w-5 h-5 flex items-center justify-center text-xs text-slate-900 font-bold">
                            âœ“
                        </div>
                        <span className="font-medium text-sm">Cambios guardados correctamente</span>
                    </div>
                </div>

                {/* LIGHTBOX DE GALERÃA */}
                {
                    selectedImage && (
                        <ImageLightbox
                            src={selectedImage}
                            alt="Galería completa"
                            isOpen={!!selectedImage}
                            onClose={() => setSelectedImage(null)}
                        />
                    )
                }

                {/* LIGHTBOX DE FOTO PERFIL */}
                {
                    profileData.foto_perfil && (
                        <ImageLightbox
                            src={profileData.foto_perfil}
                            alt="Foto de perfil"
                            isOpen={isLightboxOpen}
                            onClose={() => setIsLightboxOpen(false)}
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
            </main >

            <ClientDetailsDialog
                isOpen={showClientDialog}
                onClose={() => setShowClientDialog(false)}
                client={selectedClient}
            />

            <PetDetailsDialog
                isOpen={showPetDialog}
                onClose={() => setShowPetDialog(false)}
                pets={selectedPets}
            />

            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    header, footer, nav, aside, #dashboard-main { display: none !important; }
                }
            `}</style>

            {/* Hidden Print Area */}
            <div id="print-area" className="hidden print:block">
                {printBooking && (
                    <BookingDatasheet
                        booking={printBooking.booking}
                        sitter={{
                            nombre: profileData.nombre || "",
                            apellido: profileData.apellido_p || "",
                            email: email || "",
                            telefono: profileData.telefono || "",
                            direccion: profileData.direccion || ""
                        }}
                        pets={printBooking.pets}
                    />
                )}
            </div>

            {/* Modal de Confirmación */}
            <ModalConfirm
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirmAccept}
                title="Aceptar Solicitud"
                message={`¿Estás seguro de que deseas aceptar la solicitud de reserva de ${confirmModal.clientName}? El cliente será notificado.`}
                confirmText="Aceptar y Confirmar"
                cancelText="Cancelar"
            />
        </>
    );
}

