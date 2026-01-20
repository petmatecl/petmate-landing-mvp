import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { createNotification } from "../lib/notifications";
import { Card } from "../components/Shared/Card";
import { format, differenceInYears, subYears, isAfter, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { formatRut, validateRut, cleanRut } from "../lib/rutValidation";
import DatePickerSingle from "../components/DatePickerSingle";
import ModalAlert from "../components/ModalAlert";
import ModalConfirm from "../components/ModalConfirm";
import BookingDatasheet from "../components/Sitter/BookingDatasheet";
import AddressAutocomplete from "../components/AddressAutocomplete";
import {
    MapPin, Calendar, Clock, DollarSign, Star, Menu, X, Check, Info,
    User, Mail, Phone, Home, FileText, Upload, Plus, Trash2,
    ChevronDown, ChevronUp, Dog, Cat, Play, Linkedin, Facebook,
    Instagram, Music, ShieldCheck, CheckCircle2, ShieldAlert,
    Eye, ImagePlus, Loader2, Edit2, FileCheck, BarChart, Briefcase,
    PawPrint, AlignLeft, Inbox, Send, CalendarCheck, Printer, Download, Ruler,
    MessageSquare, AlertCircle, RefreshCw, Search
} from 'lucide-react';
import UnreadBadge from "../components/Shared/UnreadBadge";
import ApplicationDialog from "../components/Sitter/ApplicationDialog";
import ClientDetailsDialog from "../components/Sitter/ClientDetailsDialog";
import PetDetailsDialog from "../components/Sitter/PetDetailsDialog";
import ImageLightbox from "../components/ImageLightbox";
import AvailabilityCalendar from "../components/Sitter/AvailabilityCalendar";
import { Skeleton } from "../components/Shared/Skeleton";
import ChatLayout from "../components/Chat/ChatLayout";

function SitterDashboardSkeleton() {
    return (
        <div className="animate-pulse space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-3">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-40 rounded-xl" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <Skeleton className="h-96 w-full rounded-2xl" />
                    <Skeleton className="h-48 w-full rounded-2xl" />
                </div>
                {/* Main Content */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Tabs */}
                    <div className="flex gap-4">
                        <Skeleton className="h-10 w-32 rounded-lg" />
                        <Skeleton className="h-10 w-32 rounded-lg" />
                        <Skeleton className="h-10 w-32 rounded-lg" />
                    </div>
                    {/* Content */}
                    <Skeleton className="h-64 w-full rounded-2xl" />
                    <Skeleton className="h-48 w-full rounded-2xl" />
                </div>
            </div>
        </div>
    );
}

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
    const [profileId, setProfileId] = useState<string | null>(null);

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
    const [openOpportunities, setOpenOpportunities] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'solicitudes' | 'servicios' | 'perfil' | 'disponibilidad' | 'mensajes'>('solicitudes');
    const [selectedChatUser, setSelectedChatUser] = useState<string | null>(null);
    const [availabilityCount, setAvailabilityCount] = useState(0);

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
                    setProfileId(profile.id);
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
                        tamanos_perros: profile.tamanos_perros || [],
                        dimensiones_vivienda: profile.dimensiones_vivienda || "",
                        fotos_vivienda: profile.fotos_vivienda || [],
                        tiene_patio: profile.tiene_patio || false,
                        tiene_malla: profile.tiene_malla || false,
                        tiene_ninos: profile.tiene_ninos || false,
                        fumador: profile.fumador || false,
                        video_presentacion: profile.video_presentacion || null,
                        consentimiento_rrss: profile.consentimiento_rrss || false,
                        aprobado: profile.aprobado || false
                    });
                    setBackupProfileData(profile); // Save backup for cancel

                    // Determine collapsed state based on completion (COLLAPSE if complete)
                    const isContactComplete = Boolean(profile.telefono && profile.region && profile.comuna);
                    const isPersonalComplete = Boolean(profile.nombre && profile.apellido_p && profile.rut && profile.fecha_nacimiento && profile.ocupacion && profile.sexo);
                    const isProfileComplete = Boolean(profile.descripcion && profile.descripcion.length >= 100 && profile.tipo_vivienda && profile.tiene_mascotas);
                    const isServicesComplete = Boolean(profile.tarifa_servicio_a_domicilio !== null || profile.tarifa_servicio_en_casa !== null);
                    const isDocsComplete = Boolean(profile.certificado_antecedentes);
                    const isVideoComplete = Boolean(profile.video_presentacion);

                    setExpandedSections({
                        contact: !isContactComplete,
                        personal: !isPersonalComplete,
                        profile: !isProfileComplete,
                        services: !isServicesComplete,
                        documents: !isDocsComplete,
                        video: !isVideoComplete
                    });
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
                .select('*, viaje:viajes(*, cliente:user_id(*), direccion:direccion_id(*))')
                .eq('sitter_id', userId)
                .order('created_at', { ascending: false });

            if (!appError && appData) {
                setApplications(appData);
            }

            // 3. Fetch Open Opportunities (Viajes without sitter, pending)
            // Assuming 'pendiente_pago' or 'pendiente' is the status for open trips
            const { data: openData } = await supabase
                .from('viajes')
                .select('*, cliente:user_id(*), direccion:direccion_id(*)')
                .is('sitter_id', null)
                .in('estado', ['pendiente', 'pendiente_pago']) // Check valid states
                .neq('user_id', userId) // Don't show own trips if any
                .order('created_at', { ascending: false });

            if (openData) {
                setOpenOpportunities(openData);
            }

            // 4. Fetch Pets (Bulk)
            const allTrips = [...(bookingData || []), ...(appData?.map(a => a.viaje).filter(Boolean) || []), ...(openData || [])];
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

            setAvailabilityCount(0); // Will be updated by the other effect
        };
        fetchBookings();
    }, [userId]);

    // Separate effect for availability count that depends on profileId
    useEffect(() => {
        if (!profileId) return;
        const fetchAvailabilityCount = async () => {
            const { count: availCount } = await supabase
                .from('sitter_availability')
                .select('*', { count: 'exact', head: true })
                .eq('sitter_id', profileId) // Use profileId, not userId
                .gte('available_date', format(new Date(), 'yyyy-MM-dd'));

            setAvailabilityCount(availCount || 0);
        };
        fetchAvailabilityCount();
    }, [profileId]);

    // Estado de edición granular
    const [activeSection, setActiveSection] = useState<string | null>(null);

    // Estado para "minimizar/maximizar" secciones
    const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
        contact: true,
        personal: true,
        profile: true,
        services: true,
        documents: true,
        video: true
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
        tamanos_perros: [],

        dimensiones_vivienda: "",
        fotos_vivienda: [],
        tiene_patio: false,
        tiene_malla: false,
        video_presentacion: null,
        consentimiento_rrss: false,
        aprobado: false // Initialize
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
            if (profileId) {
                await supabase.from('registro_petmate').update({ certificado_antecedentes: null }).eq('id', profileId);
            } else if (userId) {
                await supabase.from('registro_petmate').update({ certificado_antecedentes: null }).eq('auth_user_id', userId);
            }
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
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setProfileData({ ...profileData, certificado_antecedentes: publicUrlData.publicUrl });

            // Auto-save
            // Auto-save
            if (profileId) {
                await supabase.from('registro_petmate').update({ certificado_antecedentes: publicUrlData.publicUrl }).eq('id', profileId);
            } else {
                await supabase.from('registro_petmate').update({ certificado_antecedentes: publicUrlData.publicUrl }).eq('auth_user_id', userId);
            }

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

    const isServicesComplete = Boolean(
        (profileData.servicio_a_domicilio && profileData.tarifa_servicio_a_domicilio) ||
        (profileData.servicio_en_casa && profileData.tarifa_servicio_en_casa)
    );

    const isAvailabilityComplete = availabilityCount > 0;

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/profile-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setProfileData({ ...profileData, foto_perfil: publicUrlData.publicUrl });

            // Auto-save
            // Auto-save
            if (profileId) {
                await supabase.from('registro_petmate').update({ foto_perfil: publicUrlData.publicUrl }).eq('id', profileId);
            } else {
                await supabase.from('registro_petmate').update({ foto_perfil: publicUrlData.publicUrl }).eq('auth_user_id', userId);
            }

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
                    .from('avatars')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);

                return publicUrlData.publicUrl;
            });

            const newUrls = await Promise.all(uploadPromises);
            const newGallery = [...(profileData.galeria || []), ...newUrls];

            setProfileData({ ...profileData, galeria: newGallery });

            // Auto-save
            if (profileId) {
                const { error: dbError } = await supabase
                    .from('registro_petmate')
                    .update({ galeria: newGallery })
                    .eq('id', profileId);

                if (dbError) {
                    throw new Error("Error al guardar en base de datos (ID): " + dbError.message);
                }
            } else if (userId) {
                const { error: dbError } = await supabase
                    .from('registro_petmate')
                    .update({ galeria: newGallery })
                    .eq('auth_user_id', userId);

                if (dbError) {
                    throw new Error("Error al guardar en base de datos (Auth): " + dbError.message);
                }
            }

        } catch (error: any) {
            console.error("Upload error:", error);
            alert('Error al subir imagenes: ' + (error.message || error));
        } finally {
            setUploading(false);
            // Reset input value to allow selecting same files again if needed (though tricky with multiple)
            e.target.value = "";
        }
    };

    const handleDeletePhoto = async (index: number) => {
        try {
            const newGallery = [...profileData.galeria];
            newGallery.splice(index, 1);
            setProfileData({ ...profileData, galeria: newGallery });

            if (profileId) {
                const { error } = await supabase
                    .from('registro_petmate')
                    .update({ galeria: newGallery })
                    .eq('id', profileId);
                if (error) throw error;
            } else if (userId) {
                const { error } = await supabase
                    .from('registro_petmate')
                    .update({ galeria: newGallery })
                    .eq('auth_user_id', userId);

                if (error) {
                    throw error;
                }
            }
        } catch (error: any) {
            console.error("Delete error:", error);
            alert("Error al eliminar foto: " + error.message);
            // Revert state if needed, but for simplicity we keep it as is or reload
        }
    };

    // --- Housing Gallery Handlers ---

    const handleHousingGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const files = Array.from(e.target.files);
        const currentCount = profileData.fotos_vivienda?.length || 0;

        if (currentCount + files.length > 10) { // Limit to 10 for housing
            setAlertState({ isOpen: true, title: "Límite excedido", message: `Solo puedes subir hasta 10 fotos de tu hogar.`, type: "warning" });
            return;
        }

        setUploading(true);

        try {
            const uploadPromises = files.map(async (file) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${userId}/housing-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);

                return publicUrlData.publicUrl;
            });

            const newUrls = await Promise.all(uploadPromises);
            const newGallery = [...(profileData.fotos_vivienda || []), ...newUrls];

            setProfileData({ ...profileData, fotos_vivienda: newGallery });

            // Auto-save
            if (profileId) {
                const { error: dbError } = await supabase
                    .from('registro_petmate')
                    .update({ fotos_vivienda: newGallery })
                    .eq('id', profileId);

                if (dbError) {
                    throw new Error("Error al guardar (ID): " + dbError.message);
                }
            } else if (userId) {
                const { error: dbError } = await supabase
                    .from('registro_petmate')
                    .update({ fotos_vivienda: newGallery })
                    .eq('auth_user_id', userId);

                if (dbError) {
                    throw new Error("Error al guardar en base de datos: " + dbError.message);
                }
            }

        } catch (error: any) {
            console.error("Housing upload error:", error);
            alert('Error al subir fotos del hogar: ' + (error.message || error));
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    const handleDeleteHousingPhoto = async (index: number) => {
        try {
            const newGallery = [...(profileData.fotos_vivienda || [])];
            newGallery.splice(index, 1);
            setProfileData({ ...profileData, fotos_vivienda: newGallery });

            if (profileId) {
                const { error } = await supabase
                    .from('registro_petmate')
                    .update({ fotos_vivienda: newGallery })
                    .eq('id', profileId);
                if (error) throw error;
            } else if (userId) {
                const { error } = await supabase
                    .from('registro_petmate')
                    .update({ fotos_vivienda: newGallery })
                    .eq('auth_user_id', userId);

                if (error) throw error;
            }
        } catch (error: any) {
            console.error("Delete housing error:", error);
            alert("Error al eliminar foto del hogar: " + error.message);
        }
    };

    const handleVideoPresentacionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        try {
            const file = e.target.files[0];

            // Validation
            if (file.size > 50 * 1024 * 1024) throw new Error("El video no puede superar los 50MB");
            const fileType = file.type;
            if (!['video/mp4', 'video/quicktime', 'video/webm'].includes(fileType)) {
                throw new Error("Formato no soportado. Usa MP4, MOV o WEBM.");
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}/presentacion_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload
            const { error: uploadError } = await supabase.storage
                .from('videos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('videos')
                .getPublicUrl(filePath);

            setProfileData({ ...profileData, video_presentacion: publicUrl });
            setAlertState({
                isOpen: true,
                title: "Éxito", // Using escaped connection for unicode safety if needed but UTF8 is standard
                message: "Video de presentación subido correctamente",
                type: "success"
            });

        } catch (error: any) {
            console.error("Error uploading video:", error);
            setAlertState({
                isOpen: true,
                title: "Error",
                message: error.message || "Error al subir el video",
                type: "error"
            });
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteVideoPresentacion = () => {
        setProfileData({ ...profileData, video_presentacion: null });
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
            // Option A: Set to 'reservado' (waiting for client) and assign self as sitter
            const { data, error } = await supabase
                .from('viajes')
                .update({
                    sitter_id: userId
                })
                .eq('id', confirmModal.bookingId)
                .select('user_id')
                .single();

            if (error) throw error;

            if (data) {
                await createNotification({
                    userId: data.user_id,
                    type: 'acceptance',
                    title: '¡Sitter Confirmado!',
                    message: `El sitter ${profileData.nombre} ha aceptado tu solicitud de reserva.`,
                    link: '/usuario' // Redirect to dashboard to see it
                });
            }
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

            // ADMIN FIX: Ensure 'sitter' role is assigned
            let currentRoles = profileData.roles || [];
            if (!currentRoles.includes('sitter')) {
                currentRoles = [...currentRoles, 'sitter'];
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
                    // New Housing Fields
                    dimensiones_vivienda: profileData.dimensiones_vivienda,
                    fotos_vivienda: profileData.fotos_vivienda,

                    tiene_patio: profileData.tiene_patio,
                    tiene_malla: profileData.tiene_malla,
                    tiene_ninos: profileData.tiene_ninos,
                    fumador: profileData.fumador,
                    video_presentacion: profileData.video_presentacion,
                    consentimiento_rrss: profileData.consentimiento_rrss
                };
            } else if (section === 'services') {
                // Validation: If Cuida Perros is checked, must have sizes
                if (profileData.cuida_perros && (!profileData.tamanos_perros || profileData.tamanos_perros.length === 0)) {
                    setAlertState({
                        isOpen: true,
                        title: "Faltan Tamaños",
                        message: "Si cuidas perros, debes seleccionar al menos un tamaño de perro aceptado.",
                        type: "warning"
                    });
                    setSaving(false);
                    return;
                }

                updates = {
                    ...updates,
                    cuida_perros: profileData.cuida_perros,
                    cuida_gatos: profileData.cuida_gatos,
                    servicio_a_domicilio: profileData.servicio_a_domicilio,
                    servicio_en_casa: profileData.servicio_en_casa,
                    tarifa_servicio_a_domicilio: profileData.tarifa_servicio_a_domicilio,
                    tarifa_servicio_en_casa: profileData.tarifa_servicio_en_casa,
                    price: profileData.tarifa_servicio_en_casa, // Sync legacy 'price' column with 'tarifa_servicio_en_casa'
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
    const docsComplete = Boolean(profileData.certificado_antecedentes);
    const videoComplete = Boolean(profileData.video_presentacion);



    if (loading) {
        return (
            <>
                <Head>
                    <title>Cargando... — Pawnecta</title>
                </Head>
                <main className="bg-slate-50 min-h-[calc(100vh-80px)]">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                        <SitterDashboardSkeleton />
                    </div>
                </main>
            </>
        );
    }

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
                                Hola, {displayName}
                            </h1>
                            <div className="flex items-center gap-3 sm:hidden mt-2 mb-1">
                                <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
                                    {profileData.foto_perfil ? (
                                        <Image
                                            src={profileData.foto_perfil}
                                            alt="Perfil"
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                                            <User size={20} className="text-slate-400" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    {profileData.aprobado ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                            <ShieldCheck size={10} /> Verificado
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold border-2 border-slate-400">
                                            <ShieldAlert size={10} /> No Verificado
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm text-slate-600">
                                Gestiona tus reservas y perfil.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 mt-4 sm:mt-0">
                            <Link href="/sitter/explorar" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 transition-all hover:-translate-y-0.5">
                                <Search size={18} /> Buscar Oportunidades
                            </Link>
                            <Link href={profileId ? `/sitter/${profileId}` : '/explorar'} target="_blank" className="hidden sm:inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-colors">
                                Ver perfil público ↗
                            </Link>
                        </div>
                    </header>



                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                        {/* SIDEBAR: Identidad y Verificación (Col-span-4) - Order 2 on Mobile */}
                        <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">

                            {/* Tarjeta de Identidad Consolidada (CLEAN WHITE STYLE) */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300">
                                {/* Header Sutil */}
                                <div className="h-24 bg-gradient-to-b from-slate-50 to-white"></div>

                                <div className="px-6 pb-6 text-center -mt-16 relative flex flex-col items-center">
                                    <div className="relative w-32 h-32 mb-4">
                                        <div
                                            className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-white flex items-center justify-center cursor-pointer group-avatar"
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
                                        <label className="absolute bottom-1 right-1 p-2 bg-white/90 backdrop-blur-sm border-2 border-slate-400 rounded-full shadow-lg cursor-pointer hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all z-10 hover:scale-110 active:scale-95">
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

                                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">{displayName}</h2>

                                    {/* Email Pill */}
                                    <div className="flex flex-col items-center gap-2 mb-4">
                                        <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 text-sm">
                                            <Mail size={14} className="text-slate-400" />
                                            {email}
                                        </div>
                                        {profileData.telefono && (
                                            <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 text-sm">
                                                <Phone size={14} className="text-slate-400" />
                                                {profileData.telefono}
                                            </div>
                                        )}
                                    </div>

                                    {/* Estado de Verificación UNIFICADO */}
                                    <div className="mt-2 flex flex-col items-center justify-center gap-2">
                                        {profileData.aprobado ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold shadow-sm">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                                    <span>Perfil Activo</span>
                                                </div>
                                                <span className="text-[10px] text-emerald-600 font-medium">Recibiendo Pedidos</span>
                                            </div>
                                        ) : profileData.certificado_antecedentes ? (
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200 text-xs font-semibold">
                                                <Clock size={14} />
                                                <span>En Revisión</span>
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 text-xs font-semibold">
                                                <ShieldAlert size={14} />
                                                <span>No Verificado</span>
                                            </div>
                                        )}

                                        {!profileData.aprobado && profileData.certificado_antecedentes && (
                                            <p className="text-[10px] text-slate-400">Validando documentos...</p>
                                        )}
                                    </div>

                                </div>

                                {/* Stats & Documents Section */}
                                <div className="bg-slate-50/50 border-t border-slate-100 p-6 space-y-6">

                                    {/* Reviews Stats */}
                                    {/* Reviews Stats */}
                                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
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

                                    {/* Documentación MOVED TO MI PERFIL TAB */}

                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                                <ImagePlus size={14} className="text-slate-400" /> Galería con Mascotas
                                            </h4>
                                            <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                                                {profileData.galeria?.length || 0}/6
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
                                                                if (window.confirm("¿Seguro que deseas eliminar esta imagen?")) {
                                                                    handleDeletePhoto(index);
                                                                }
                                                            }}
                                                            className="p-1 bg-white/20 hover:bg-red-500 backdrop-blur-md rounded-full text-white transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Add Button - Moved outside grid */}
                                        {(profileData.galeria?.length || 0) < 6 && (
                                            <label className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 font-bold text-sm cursor-pointer transition-all group">
                                                <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                                Añadir foto
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

                                    {/* Housing Gallery (Check valid variable name for 'En mi Casa' service) */}
                                    {profileData.servicio_en_casa && (
                                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                                    <Home size={14} className="text-slate-400" /> Galería de mi hogar
                                                </h4>
                                                <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                                                    {profileData.fotos_vivienda?.length || 0}/10
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2">
                                                {(profileData.fotos_vivienda || []).map((photo: string, index: number) => (
                                                    <div
                                                        key={index}
                                                        className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group/photo shadow-sm hover:shadow-md transition-all"
                                                        onClick={() => setSelectedImage(photo)}
                                                    >
                                                        <Image
                                                            src={photo}
                                                            alt={`Espacio ${index + 1}`}
                                                            fill
                                                            className="object-cover transition-transform duration-500 group-hover/photo:scale-110"
                                                            unoptimized
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (window.confirm("¿Seguro que deseas eliminar esta imagen de tu hogar?")) {
                                                                        handleDeleteHousingPhoto(index);
                                                                    }
                                                                }}
                                                                className="p-1 bg-white/20 hover:bg-red-500 backdrop-blur-md rounded-full text-white transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add Button - Moved outside grid */}
                                            {(profileData.fotos_vivienda || []).length < 10 && (
                                                <label className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 font-bold text-sm cursor-pointer transition-all group">
                                                    <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                                    Añadir foto
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        className="hidden"
                                                        onChange={handleHousingGalleryUpload}
                                                        disabled={uploading}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    )}

                                    <div className="pt-2 sm:hidden text-center">
                                        <Link href={userId ? `/sitter/${userId}` : '/explorar'} target="_blank" className="text-xs font-bold text-emerald-600 hover:underline">
                                            Ver perfil público ↗
                                        </Link>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* MAIN CONTENT: Reservas y Datos (Col-span-8) - Order 1 on Mobile */}
                        <div className="lg:col-span-8 space-y-6 order-1 lg:order-2">

                            {/* TAB NAVIGATION */}
                            {/* TABS NAVIGATION */}
                            {/* TABS NAVIGATION */}
                            {/* TABS NAVIGATION (Soft Pill Style + Container) */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 mb-8 flex flex-wrap gap-2">
                                <button
                                    onClick={() => setActiveTab('solicitudes')}
                                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'solicitudes' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm ring-1 ring-emerald-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                                >
                                    <BarChart size={16} /> Solicitudes
                                </button>
                                <button
                                    onClick={() => setActiveTab('servicios')}
                                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'servicios' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm ring-1 ring-emerald-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                                >
                                    <Briefcase size={16} /> Servicios
                                    {isServicesComplete ? <div className="w-2 h-2 rounded-full bg-emerald-400" title="Completo" /> : <div className="w-2 h-2 rounded-full bg-amber-400" title="Incompleto" />}
                                </button>
                                <button
                                    onClick={() => setActiveTab('disponibilidad')}
                                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'disponibilidad' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm ring-1 ring-emerald-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                                >
                                    <Calendar size={16} /> Calendario
                                    {isAvailabilityComplete ? <div className="w-2 h-2 rounded-full bg-emerald-400" title="Completo" /> : <div className="w-2 h-2 rounded-full bg-amber-400" title="Incompleto" />}
                                </button>
                                <button
                                    onClick={() => setActiveTab('perfil')}
                                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'perfil' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm ring-1 ring-emerald-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                                >
                                    <User size={16} /> Mi Perfil
                                    {isProfileComplete ? <div className="w-2 h-2 rounded-full bg-emerald-400" title="Completo" /> : <div className="w-2 h-2 rounded-full bg-amber-400" title="Incompleto" />}
                                </button>
                                <button
                                    onClick={() => setActiveTab('mensajes')}
                                    className={`relative flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'mensajes' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm ring-1 ring-emerald-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                                >
                                    <Inbox size={16} /> Mensajes
                                    {userId && <UnreadBadge userId={userId} className="-top-1 -right-1 absolute" />}
                                </button>
                            </div>



                            {/* MESSAGES TAB */}
                            {activeTab === 'mensajes' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <ChatLayout
                                        userId={userId}
                                        onBack={() => {
                                            setActiveTab('solicitudes');
                                            setSelectedChatUser(null);
                                        }}
                                        initialClientUserId={selectedChatUser}
                                    />
                                </div>
                            )}

                            {/* BLOQUE NUEVO: Solicitudes Pendientes (Prioridad Alta) */}
                            {activeTab === 'solicitudes' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

                                    {/* SECCIÓN 1: OPORTUNIDADES (Nuevas) */}
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <Search className="w-5 h-5 text-emerald-500" />
                                            Oportunidades para ti
                                        </h3>

                                        {openOpportunities.length === 0 ? (
                                            <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-200 border-dashed">
                                                <div className="bg-white mx-auto w-12 h-12 rounded-full flex items-center justify-center shadow-sm mb-3">
                                                    <Search className="w-6 h-6 text-slate-300" />
                                                </div>
                                                <p className="text-slate-500 font-medium">No hay oportunidades disponibles en este momento.</p>
                                                <p className="text-xs text-slate-400 mt-1">Te avisaremos cuando haya nuevas solicitudes.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {openOpportunities.map((trip) => (
                                                    <Card key={trip.id} padding="none" className="overflow-hidden border-l-4 border-l-emerald-400 group hover:shadow-md transition-all">
                                                        <div className="p-5">
                                                            <div className="flex justify-between items-start mb-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                                                                        {trip.cliente?.nombre?.[0] || 'C'}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-bold text-slate-800 text-base">{trip.cliente?.nombre} {trip.cliente?.apellido_p}</h4>
                                                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                                                            <MapPin size={12} /> {trip.direccion?.comuna || 'Ubicación pendiente'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                                                                    Nueva Oportunidad
                                                                </span>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                                    <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Servicio</span>
                                                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                                        {trip.tipo_servicio === 'paseo' ? <Dog size={14} className="text-emerald-500" /> : <Home size={14} className="text-emerald-500" />}
                                                                        {trip.tipo_servicio === 'paseo' ? 'Paseo' : 'Cuidado en Casa'}
                                                                    </div>
                                                                </div>
                                                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                                    <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Mascotas</span>
                                                                    <span className="text-sm font-semibold text-slate-700">{trip.mascotas_ids?.length || 1} mascota(s)</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-100">
                                                                <div className="text-xs text-slate-400 font-medium">
                                                                    Publicado hace {differenceInDays(new Date(), new Date(trip.created_at))} días
                                                                </div>
                                                                <button
                                                                    onClick={() => handleAcceptClick(trip.id, trip.cliente?.nombre || 'Cliente')}
                                                                    className="bg-emerald-600 text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200"
                                                                >
                                                                    Ver Detalles y Postular
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* SECCIÓN 2: MIS POSTULACIONES */}
                                    {applications.length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                <Send className="w-5 h-5 text-indigo-500" />
                                                Mis Postulaciones
                                            </h3>
                                            <div className="space-y-4">
                                                {applications.map((app) => (
                                                    <Card key={app.id} padding="none" className="opacity-75 hover:opacity-100 transition-opacity">
                                                        <div className="p-5">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <h4 className="font-bold text-slate-700">Solicitud #{app.viaje?.id?.slice(0, 6)}</h4>
                                                                    <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                                        Esperando respuesta
                                                                    </span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="text-sm font-bold text-slate-600 block">
                                                                        ${formatPrice(app.viaje?.total)}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400">Total</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* SECCIÓN 3: RESERVAS CONFIRMADAS */}
                                    {bookings.length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                <CalendarCheck className="w-5 h-5 text-emerald-600" />
                                                Próximas Reservas
                                            </h3>
                                            <div className="space-y-4">
                                                {bookings.map((booking) => (
                                                    <Card key={booking.id} padding="none" className="border-l-4 border-l-emerald-600">
                                                        <div className="p-5">
                                                            <div className="flex justify-between items-center mb-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                                                                        {booking.cliente?.nombre?.[0]}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-bold text-slate-800">{booking.cliente?.nombre} {booking.cliente?.apellido_p}</h4>
                                                                        <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                                            Confirmado
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <button className="text-slate-400 hover:text-emerald-600 transition-colors">
                                                                    <MessageSquare size={20} />
                                                                </button>
                                                            </div>
                                                            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 flex justify-between items-center">
                                                                <div className="flex items-center gap-2">
                                                                    <Calendar size={14} className="text-slate-400" />
                                                                    <span>
                                                                        {format(new Date(booking.fecha_inicio), "d MMM", { locale: es })} - {format(new Date(booking.fecha_fin), "d MMM", { locale: es })}
                                                                    </span>
                                                                </div>
                                                                <span className="font-bold text-slate-800">${formatPrice(booking.total)}</span>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* DISPONIBILIDAD TAB */}
                            {activeTab === 'disponibilidad' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {profileId ? (
                                        <AvailabilityCalendar
                                            sitterId={profileId}
                                            confirmedBookings={bookings.map(b => ({
                                                start: b.fecha_inicio,
                                                end: b.fecha_fin
                                            }))}
                                            pendingBookings={applications
                                                .filter(a => a.status === 'pending')
                                                .map(a => ({
                                                    start: a.fecha_inicio,
                                                    end: a.fecha_fin
                                                }))
                                            }
                                            onSaveSuccess={() => {
                                                const fetchAvailabilityCount = async () => {
                                                    const { count: availCount } = await supabase
                                                        .from('sitter_availability')
                                                        .select('*', { count: 'exact', head: true })
                                                        .eq('sitter_id', profileId)
                                                        .gte('available_date', format(new Date(), 'yyyy-MM-dd'));
                                                    setAvailabilityCount(availCount || 0);
                                                };
                                                fetchAvailabilityCount();
                                            }}
                                        />
                                    ) : (
                                        <div className="p-8 text-center text-slate-500">Cargando perfil...</div>
                                    )}
                                </div>
                            )}

                            {/* BLOQUE 0: Preferencias y Servicios (MOVIDO AL TOP) */}
                            {activeTab === 'servicios' && (
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md mb-6">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                                        <div className="flex items-center gap-3 flex-1">
                                            <button
                                                onClick={() => toggleSection('profile')}
                                                className="p-2 bg-slate-50 border border-slate-200 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
                                            >
                                                {expandedSections.profile ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                            </button>
                                            <div>
                                                <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                                    Perfil Sitter
                                                    {profileComplete ? (
                                                        <div className="w-2 h-2 rounded-full bg-emerald-400" title="Completo" />
                                                    ) : (
                                                        <div className="w-2 h-2 rounded-full bg-amber-400" title="Incompleto" />
                                                    )}
                                                </h4>
                                                <p className="text-xs text-slate-400 font-medium">Descripción y ubicación</p>
                                            </div>
                                        </div>
                                        {activeSection === 'profile' ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        if (backupProfileData) setProfileData(JSON.parse(JSON.stringify(backupProfileData)));
                                                        setActiveSection(null);
                                                    }}
                                                    className="text-xs text-slate-500 hover:text-slate-800 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={() => handleSaveSection('profile')}
                                                    disabled={saving}
                                                    className="text-xs bg-emerald-600 text-white px-4 py-1.5 rounded-lg font-bold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 disabled:opacity-50 disabled:shadow-none"
                                                >
                                                    {saving ? "Guardando..." : "Guardar Cambios"}
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setActiveSection('profile')}
                                                disabled={activeSection !== null && activeSection !== 'profile'}
                                                className="text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-30 disabled:bg-transparent"
                                            >
                                                Editar
                                            </button>
                                        )}
                                    </div>

                                    {expandedSections.profile && (
                                        <div>


                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

                                                {/* Búsqueda de Dirección (Solo Edición) */}
                                                {activeSection === 'profile' && (
                                                    <div className="sm:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-2">
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
                                                        className="w-full text-sm bg-slate-100 rounded-lg px-3 py-2 border border-slate-300 text-slate-600 cursor-not-allowed"
                                                        value={profileData.direccion_completa || "No definida"}
                                                        readOnly
                                                    />
                                                </div>

                                                <div className="sm:col-span-1">
                                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Calle</label>
                                                    <input
                                                        type="text"
                                                        disabled={activeSection !== 'profile'}
                                                        className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'profile' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-300 text-slate-500"}`}
                                                        value={profileData.calle || ""}
                                                        onChange={(e) => setProfileData({ ...profileData, calle: e.target.value })}
                                                    />
                                                </div>
                                                <div className="sm:col-span-1">
                                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Número / Depto / Casa</label>
                                                    <input
                                                        type="text"
                                                        disabled={activeSection !== 'profile'}
                                                        className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'profile' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-300 text-slate-500"}`}
                                                        value={profileData.numero || ""}
                                                        onChange={(e) => setProfileData({ ...profileData, numero: e.target.value })}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Vivienda</label>
                                                    <select
                                                        disabled={activeSection !== 'profile'}
                                                        className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'profile' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-300 text-slate-500 appearance-none"
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
                                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Dimensiones</label>
                                                    <select
                                                        disabled={activeSection !== 'profile'}
                                                        className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'profile' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-300 text-slate-500 appearance-none"
                                                            }`}
                                                        value={profileData.dimensiones_vivienda || ""}
                                                        onChange={(e) => setProfileData({ ...profileData, dimensiones_vivienda: e.target.value })}
                                                    >
                                                        <option value="" disabled>Seleccionar</option>
                                                        <option value="Menos de 30m2">Menos de 30m²</option>
                                                        <option value="30-50m2">30 - 50m²</option>
                                                        <option value="30-70m2">30 - 70m²</option>
                                                        <option value="70-130m2">70 - 130m²</option>
                                                        <option value="Más de 130m2">Más de 130m²</option>
                                                    </select>
                                                </div>

                                                <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                                                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${profileData.tiene_patio ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-300 text-slate-500'}`}>
                                                        <input
                                                            type="checkbox"
                                                            disabled={activeSection !== 'profile'}
                                                            checked={profileData.tiene_patio || false}
                                                            onChange={(e) => setProfileData({ ...profileData, tiene_patio: e.target.checked })}
                                                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                                        />
                                                        <span className="text-sm font-bold">Tiene Patio/Jardín</span>
                                                    </label>

                                                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${profileData.tiene_malla ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-300 text-slate-500'}`}>
                                                        <input
                                                            type="checkbox"
                                                            disabled={activeSection !== 'profile'}
                                                            checked={profileData.tiene_malla || false}
                                                            onChange={(e) => setProfileData({ ...profileData, tiene_malla: e.target.checked })}
                                                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                                        />
                                                        <span className="text-sm font-bold">Mallas de Seguridad</span>
                                                    </label>

                                                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${profileData.tiene_ninos ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-300 text-slate-500'}`}>
                                                        <input
                                                            type="checkbox"
                                                            disabled={activeSection !== 'profile'}
                                                            checked={profileData.tiene_ninos || false}
                                                            onChange={(e) => setProfileData({ ...profileData, tiene_ninos: e.target.checked })}
                                                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                                        />
                                                        <span className="text-sm font-bold">Niños en Casa</span>
                                                    </label>

                                                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${profileData.fumador ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-300 text-slate-500'}`}>
                                                        <input
                                                            type="checkbox"
                                                            disabled={activeSection !== 'profile'}
                                                            checked={profileData.fumador || false}
                                                            onChange={(e) => setProfileData({ ...profileData, fumador: e.target.checked })}
                                                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                                        />
                                                        <span className="text-sm font-bold">Fumador</span>
                                                    </label>
                                                </div>



                                            </div>

                                            {/* Detalles de mascotas (Siempre visible para agregar) */}
                                            {activeSection === 'profile' && (
                                                <div className="mb-4 bg-slate-50 rounded-lg p-4 border border-slate-100">
                                                    <label className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">Tus Mascotas</label>

                                                    {(profileData.detalles_mascotas || []).map((mascota: any, idx: number) => (
                                                        <div key={idx} className="flex gap-2 mb-2 items-center">
                                                            <select
                                                                className="text-sm rounded-lg px-3 py-2 border border-slate-300 flex-1 outline-none bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
                                                                className="w-20 text-sm rounded-lg px-3 py-2 border border-slate-300 outline-none bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                                value={mascota.cantidad}
                                                                onChange={(e) => {
                                                                    const newDetails = [...(profileData.detalles_mascotas || [])];
                                                                    newDetails[idx].cantidad = parseInt(e.target.value) || 1;
                                                                    setProfileData({ ...profileData, detalles_mascotas: newDetails });
                                                                }}
                                                                disabled={activeSection !== 'profile'}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newDetails = (profileData.detalles_mascotas || []).filter((_: any, i: number) => i !== idx);
                                                                    setProfileData({ ...profileData, detalles_mascotas: newDetails });
                                                                }}
                                                                className="text-slate-400 hover:text-red-500 p-2 transition-colors"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    ))}

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setProfileData({
                                                                ...profileData,
                                                                detalles_mascotas: [...(profileData.detalles_mascotas || []), { tipo: "perro", cantidad: 1 }]
                                                            });
                                                        }}
                                                        className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1 mt-2"
                                                    >
                                                        <Plus size={14} /> Agregar mascota
                                                    </button>
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
                                                    className={`w-full text-sm rounded-xl px-3 py-2 outline-none resize-none transition-all ${activeSection === 'profile' ? "border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"
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
                                                            className={`flex-1 text-sm rounded-xl px-3 py-2 outline-none transition-all ${activeSection === 'profile' ? "border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
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
                                                                <Trash2 size={16} />
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
                            )}

                            {activeTab === 'servicios' && (

                                <Card padding="m">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                                        <div className="flex items-center gap-3 flex-1">
                                            <button
                                                onClick={() => toggleSection('services')}
                                                className="p-2 bg-slate-50 border border-slate-200 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
                                            >
                                                {expandedSections.services ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                            </button>
                                            <div>
                                                <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                                    Mis Servicios y Tarifas
                                                    {(profileData.cuida_perros || profileData.cuida_gatos) ? (
                                                        <div className="w-2 h-2 rounded-full bg-emerald-400" title="Completo" />
                                                    ) : (
                                                        <div className="w-2 h-2 rounded-full bg-amber-400" title="Incompleto" />
                                                    )}
                                                </h4>
                                                <p className="text-xs text-slate-400 font-medium">Gestiona los servicios que ofreces y sus precios</p>
                                            </div>
                                        </div>
                                        {activeSection === 'services' ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        if (backupProfileData) setProfileData(JSON.parse(JSON.stringify(backupProfileData)));
                                                        setActiveSection(null);
                                                    }}
                                                    className="text-xs text-slate-500 hover:text-slate-800 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={() => handleSaveSection('services')}
                                                    disabled={saving}
                                                    className="text-xs bg-emerald-600 text-white px-4 py-1.5 rounded-lg font-bold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 disabled:opacity-50 disabled:shadow-none"
                                                >
                                                    {saving ? "Guardando..." : "Guardar Cambios"}
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setActiveSection('services')}
                                                disabled={activeSection !== null && activeSection !== 'services'}
                                                className="text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-30 disabled:bg-transparent"
                                            >
                                                Editar
                                            </button>
                                        )}
                                    </div>

                                    {expandedSections.services && (
                                        <>
                                            {/* Read-Only Notice */}
                                            {activeSection !== 'services' && (
                                                <div className="mx-6 mt-4 mb-2 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-xs text-slate-500">
                                                    <Info size={16} className="text-slate-400" />
                                                    <span>Estás en modo visualización. Para modificar tus servicios y tarifas, haz clic en el botón <b>Editar</b> de arriba.</span>
                                                </div>
                                            )}

                                            <div className={`grid md:grid-cols-2 gap-8 md:divide-x md:divide-slate-100 p-6 ${activeSection !== 'services' ? 'opacity-80 pointer-events-none grayscale-[0.5]' : ''}`}>
                                                {/* Column 1: Pets & Sizes */}
                                                <div className="space-y-8">
                                                    {/* Pets */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wide">¿Qué mascotas cuidas?</h5>
                                                            {(profileData.cuida_perros || profileData.cuida_gatos) && (
                                                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Completado</span>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <label className={`relative group cursor-pointer rounded-2xl border transition-all p-4 flex items-center gap-4 ${profileData.cuida_perros ? "border-slate-800 bg-slate-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                                                                <input type="checkbox" disabled={activeSection !== 'services'} checked={profileData.cuida_perros} onChange={(e) => setProfileData({ ...profileData, cuida_perros: e.target.checked })} className="hidden" />
                                                                <div className={`p-2 rounded-full transition-colors ${profileData.cuida_perros ? "bg-white border border-slate-100 text-slate-700 shadow-sm" : "bg-slate-100 text-slate-400"}`}>
                                                                    <Dog size={20} />
                                                                </div>
                                                                <span className={`font-semibold ${profileData.cuida_perros ? "text-slate-800" : "text-slate-500"}`}>Perros</span>
                                                                {profileData.cuida_perros && <CheckCircle2 size={20} className="absolute top-4 right-4 text-emerald-500" />}
                                                            </label>

                                                            <label className={`relative group cursor-pointer rounded-2xl border transition-all p-4 flex items-center gap-4 ${profileData.cuida_gatos ? "border-slate-800 bg-slate-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                                                                <input type="checkbox" disabled={activeSection !== 'services'} checked={profileData.cuida_gatos} onChange={(e) => setProfileData({ ...profileData, cuida_gatos: e.target.checked })} className="hidden" />
                                                                <div className={`p-2 rounded-full transition-colors ${profileData.cuida_gatos ? "bg-white border border-slate-100 text-slate-700 shadow-sm" : "bg-slate-100 text-slate-400"}`}>
                                                                    <Cat size={20} />
                                                                </div>
                                                                <span className={`font-semibold ${profileData.cuida_gatos ? "text-slate-800" : "text-slate-500"}`}>Gatos</span>
                                                                {profileData.cuida_gatos && <CheckCircle2 size={20} className="absolute top-4 right-4 text-emerald-500" />}
                                                            </label>
                                                        </div>
                                                    </div>

                                                    {/* Dog Sizes */}
                                                    {profileData.cuida_perros && (
                                                        <div className="animate-in fade-in slide-in-from-top-2">
                                                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">¿Qué tamaños de perro aceptas?</h5>
                                                            <div className="flex flex-wrap gap-3">
                                                                {['Pequeño', 'Mediano', 'Grande', 'Gigante'].map((size) => (
                                                                    <label key={size} className={`cursor-pointer px-4 py-2 rounded-full border text-sm font-semibold transition-all ${activeSection !== 'services' && !profileData.tamanos_perros?.includes(size) ? "opacity-50 cursor-not-allowed" : ""} ${profileData.tamanos_perros?.includes(size) ? "bg-slate-100 border-slate-400 text-slate-800" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                                                                        <input
                                                                            type="checkbox"
                                                                            className="hidden"
                                                                            disabled={activeSection !== 'services'}
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

                                                {/* Column 2: Services & Rates */}
                                                <div className="md:pl-8 space-y-6">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wide">¿Dónde las cuidas?</h5>
                                                        <span className="text-xs font-medium text-slate-400 italic">Configura tus tarifas</span>
                                                    </div>

                                                    {/* Service 1: A Domicilio */}
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                                                                    <MapPin size={20} />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="font-semibold text-slate-700 text-sm">A Domicilio</span>
                                                                    <span className="text-xs text-slate-400 font-normal">por noche</span>
                                                                </div>
                                                            </div>
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input type="checkbox" disabled={activeSection !== 'services'} checked={profileData.servicio_a_domicilio} onChange={(e) => setProfileData({ ...profileData, servicio_a_domicilio: e.target.checked })} className="sr-only peer" />
                                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                                            </label>
                                                        </div>
                                                        {profileData.servicio_a_domicilio && (
                                                            <div className="relative animate-in fade-in slide-in-from-top-1 ml-12">
                                                                <span className="absolute left-4 top-3.5 text-slate-400 font-bold">$</span>
                                                                <input
                                                                    type="text"
                                                                    disabled={activeSection !== 'services'}
                                                                    className={`w-full bg-slate-50 border-none rounded-xl py-3 pl-8 text-lg font-semibold text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/50 transition-all ${activeSection !== 'services' ? "opacity-75" : ""}`}
                                                                    value={formatPrice(profileData.tarifa_servicio_a_domicilio)}
                                                                    onChange={(e) => setProfileData({ ...profileData, tarifa_servicio_a_domicilio: parsePrice(e.target.value) })}
                                                                    placeholder="35.000"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Service 2: En mi Casa */}
                                                    <div className="space-y-3 pt-4 border-t border-slate-50">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                                                                    <Home size={20} />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="font-semibold text-slate-700 text-sm">En mi Casa</span>
                                                                    <span className="text-xs text-slate-400 font-normal">por noche</span>
                                                                </div>
                                                            </div>
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input type="checkbox" disabled={activeSection !== 'services'} checked={profileData.servicio_en_casa} onChange={(e) => setProfileData({ ...profileData, servicio_en_casa: e.target.checked })} className="sr-only peer" />
                                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                                            </label>
                                                        </div>
                                                        {profileData.servicio_en_casa && (
                                                            <div className="relative animate-in fade-in slide-in-from-top-1 ml-12">
                                                                <span className="absolute left-4 top-3.5 text-slate-400 font-bold">$</span>
                                                                <input
                                                                    type="text"
                                                                    disabled={activeSection !== 'services'}
                                                                    className={`w-full bg-slate-50 border-none rounded-xl py-3 pl-8 text-lg font-semibold text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/50 transition-all ${activeSection !== 'services' ? "opacity-75" : ""}`}
                                                                    value={formatPrice(profileData.tarifa_servicio_en_casa)}
                                                                    onChange={(e) => setProfileData({ ...profileData, tarifa_servicio_en_casa: parsePrice(e.target.value) })}
                                                                    placeholder="20.000"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </Card>
                            )}

                            {activeTab === 'solicitudes' && (
                                <>
                                    {/* BLOQUE NUEVO: Solicitudes por Aceptar (Entrantes) */}
                                    {bookings.some(b => b.estado === 'publicado') && (
                                        <Card padding="m" className="mb-6">
                                            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                <Inbox size={18} /> Solicitudes por Aceptar
                                            </h3>
                                            <div className="grid gap-3">
                                                {bookings.filter(b => b.estado === 'publicado').map(booking => (
                                                    <div key={booking.id} className="p-4 bg-white rounded-lg border-2 border-slate-400 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-sm font-bold text-slate-900">{booking.cliente.nombre} {booking.cliente.apellido_p} <span className="font-mono text-xs text-slate-400 font-normal">#{booking.id.slice(0, 6).toUpperCase()}</span></span>
                                                                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold uppercase border-2 border-slate-400">Nueva Solicitud</span>
                                                            </div>
                                                            <div className="text-xs text-slate-500 flex flex-col gap-1">
                                                                <span className="flex items-center gap-1 font-medium text-slate-700">
                                                                    <Calendar size={12} /> {format(new Date(booking.fecha_inicio), "d MMM", { locale: es })} - {format(new Date(booking.fecha_fin), "d MMM", { locale: es })}
                                                                </span>
                                                                {/* Pet Summary for this request */}
                                                                {(() => {
                                                                    const petIds = booking.mascotas_ids || [];
                                                                    const pets = petIds.map((pid: string) => petsCache[pid]).filter(Boolean);
                                                                    const dogCount = pets.filter((p: any) => p.tipo === 'perro').length;
                                                                    const catCount = pets.filter((p: any) => p.tipo === 'gato').length;
                                                                    const otherCount = pets.length - dogCount - catCount;

                                                                    let textParts = [];
                                                                    if (dogCount > 0) textParts.push(`${dogCount} Perro${dogCount > 1 ? 's' : ''}`);
                                                                    if (catCount > 0) textParts.push(`${catCount} Gato${catCount > 1 ? 's' : ''}`);
                                                                    if (otherCount > 0) textParts.push(`${otherCount} Otro${otherCount > 1 ? 's' : ''}`);

                                                                    const text = textParts.join(', ') || "Sin mascotas";

                                                                    return (
                                                                        <div className="flex gap-1 mt-1">
                                                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 font-medium">
                                                                                <PawPrint size={10} /> {text}
                                                                            </span>
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
                                        </Card>
                                    )}

                                    {/* BLOQUE: Esperando Confirmación (Reservado) */}
                                    {bookings.some(b => b.estado === 'reservado') && (
                                        <Card padding="m" className="mb-6">
                                            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                <Clock size={18} /> Esperando Confirmación
                                            </h3>
                                            <div className="grid gap-3">
                                                {bookings.filter(b => b.estado === 'reservado').map(booking => (
                                                    <div key={booking.id} className="p-4 bg-white rounded-lg border-2 border-slate-400 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-sm font-bold text-slate-900">{booking.cliente.nombre} {booking.cliente.apellido_p} <span className="font-mono text-xs text-slate-400 font-normal">#{booking.id.slice(0, 6).toUpperCase()}</span></span>
                                                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase border border-amber-200">Por Confirmar</span>
                                                            </div>
                                                            <div className="text-xs text-slate-500 flex flex-col gap-1">
                                                                <span className="flex items-center gap-1 font-medium text-slate-700">
                                                                    <Calendar size={12} /> {format(new Date(booking.fecha_inicio), "d MMM", { locale: es })} - {format(new Date(booking.fecha_fin), "d MMM", { locale: es })}
                                                                </span>
                                                                {(() => {
                                                                    const petIds = booking.mascotas_ids || [];
                                                                    const pets = petIds.map((pid: string) => petsCache[pid]).filter(Boolean);
                                                                    const dogCount = pets.filter((p: any) => p.tipo === 'perro').length;
                                                                    const catCount = pets.filter((p: any) => p.tipo === 'gato').length;
                                                                    const otherCount = pets.length - dogCount - catCount;

                                                                    let textParts = [];
                                                                    if (dogCount > 0) textParts.push(`${dogCount} Perro${dogCount > 1 ? 's' : ''}`);
                                                                    if (catCount > 0) textParts.push(`${catCount} Gato${catCount > 1 ? 's' : ''}`);
                                                                    if (otherCount > 0) textParts.push(`${otherCount} Otro${otherCount > 1 ? 's' : ''}`);

                                                                    const text = textParts.join(', ') || "Sin mascotas";

                                                                    return (
                                                                        <div className="flex gap-1 mt-1">
                                                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 font-medium">
                                                                                <PawPrint size={10} /> {text}
                                                                            </span>
                                                                        </div>
                                                                    )
                                                                })()}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-slate-500 font-medium bg-slate-50 px-3 py-2 rounded-lg border-2 border-slate-400 max-w-[200px] text-center">
                                                            Has aceptado esta solicitud. Esperando confirmación final.
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                    )}

                                    {/* Existing Pending Logic (kept for 'pendiente' status if any remain) */}
                                    {bookings.some(b => b.estado === 'pendiente') && (
                                        <Card padding="m" className="mb-6">
                                            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                <Inbox size={18} /> Solicitudes Pendientes (Otros Estados)
                                            </h3>
                                            <div className="grid gap-3">
                                                {bookings.filter(b => b.estado === 'pendiente').map(booking => (
                                                    <div key={booking.id} className="p-4 bg-white rounded-lg border-2 border-slate-400 shadow-sm">
                                                        <span className="text-sm font-bold">{booking.cliente.nombre} <span className="font-mono text-xs text-slate-400 font-normal">#{booking.id.slice(0, 6).toUpperCase()}</span></span>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                    )}

                                    {/* BLOQUE NUEVO: Mis Postulaciones (Oportunidades) */}
                                    <Card padding="m" className="mb-4">
                                        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                                            <Send size={18} /> Mis Postulaciones
                                        </h3>
                                        {applications.filter(app => app.estado !== 'aceptada').length > 0 ? (
                                            <div className="grid gap-3">
                                                {applications.filter(app => app.estado !== 'aceptada').map((app) => (
                                                    <div key={app.id} className="p-4 bg-slate-50 rounded-lg border-2 border-slate-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-sm font-bold text-slate-900">
                                                                    {app.viaje?.cliente?.nombre || "Cliente"} {app.viaje?.cliente?.apellido_p || ""}
                                                                    {app.viaje?.id && <span className="font-mono text-xs text-slate-400 font-normal ml-1">#{app.viaje.id.slice(0, 6).toUpperCase()}</span>}
                                                                </span>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase
                                                                    ${app.estado === 'pendiente' ? 'bg-slate-100 text-slate-700' :
                                                                        'bg-slate-100 text-slate-500'}`}>
                                                                    {app.estado}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-slate-500 mb-2 flex flex-wrap gap-2">
                                                                <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded"><MapPin size={12} /> {app.viaje?.comuna || "Santiago"}</span>
                                                                <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded"><Calendar size={12} /> {app.viaje?.fecha_inicio ? format(new Date(app.viaje.fecha_inicio), "d MMM", { locale: es }) : "?"}</span>
                                                                {/* Pets Display */}
                                                                {(() => {
                                                                    const petIds = app.viaje?.mascotas_ids || [];
                                                                    const pets = petIds.map((pid: string) => petsCache[pid]).filter(Boolean);
                                                                    const dogCount = pets.filter((p: any) => p.tipo === 'perro').length;
                                                                    const catCount = pets.filter((p: any) => p.tipo === 'gato').length;
                                                                    const otherCount = pets.length - dogCount - catCount;

                                                                    let textParts = [];
                                                                    if (dogCount > 0) textParts.push(`${dogCount} Perro${dogCount > 1 ? 's' : ''}`);
                                                                    if (catCount > 0) textParts.push(`${catCount} Gato${catCount > 1 ? 's' : ''}`);
                                                                    if (otherCount > 0) textParts.push(`${otherCount} Otro${otherCount > 1 ? 's' : ''}`);

                                                                    const text = textParts.join(', ') || "Sin mascotas";
                                                                    return (
                                                                        <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-slate-600 font-medium">
                                                                            <PawPrint size={12} /> {text}
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </div>
                                                            {app.mensaje && (
                                                                <p className="text-xs text-slate-600 italic">&quot;{app.mensaje}&quot;</p>
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
                                    </Card>

                                    {/* BLOQUE 1: Próximas Reservas (Confirmadas) - CARD LAYOUT */}
                                    <Card padding="m">
                                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                            <CheckCircle2 size={20} className="text-emerald-600" /> Solicitudes Confirmadas
                                        </h3>

                                        {(() => {
                                            const acceptedAppsAsBookings = applications
                                                .filter(app => app.estado === 'aceptada')
                                                .map(app => ({
                                                    id: app.viaje?.id || app.id,
                                                    cliente: app.viaje?.cliente,
                                                    mascotas_ids: app.viaje?.mascotas_ids,
                                                    fecha_inicio: app.viaje?.fecha_inicio,
                                                    fecha_fin: app.viaje?.fecha_fin,
                                                    estado: 'confirmada',
                                                    servicio: app.viaje?.servicio,
                                                    direccion: app.viaje?.direccion,
                                                    direccion_cliente: app.viaje?.direccion_cliente,
                                                    cliente_id: app.viaje?.cliente?.auth_user_id || app.viaje?.user_id // Ensure we have ID for chat
                                                }));

                                            const confirmedServices = bookings
                                                .filter(b => b.estado === 'confirmado' || b.estado === 'confirmada')
                                                .concat(acceptedAppsAsBookings.filter(app => !bookings.some(b => b.id === app.id)))
                                                .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime());

                                            return confirmedServices.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
                                                    {confirmedServices.map((book: any) => {
                                                        const clientUserId = book.cliente_id || book.cliente?.auth_user_id || book.user_id; // Try multiple paths
                                                        const petIds = book.mascotas_ids || [];
                                                        const pets = petIds.map((pid: string) => petsCache[pid]).filter(Boolean);
                                                        const petNames = pets.map((p: any) => p.nombre).join(", ");
                                                        const startDate = new Date(book.fecha_inicio);
                                                        const endDate = new Date(book.fecha_fin);
                                                        const duration = differenceInDays(endDate, startDate) + 1; // Include end date

                                                        return (
                                                            <Card key={book.id} padding="l" className="hover:shadow-md transition-shadow relative overflow-hidden group">
                                                                {/* Decorative Top Border */}
                                                                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400"></div>

                                                                <div className="flex flex-col gap-6 pt-2">

                                                                    {/* Header section with Dates and Actions */}
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="space-y-2">
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="bg-slate-100 text-slate-500 font-mono text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">#{book.id.slice(0, 8)}</span>
                                                                                {book.servicio && (
                                                                                    <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-100">
                                                                                        {book.servicio === 'hospedaje' ? <Home size={10} /> : <MapPin size={10} />}
                                                                                        {book.servicio === 'hospedaje' ? 'Hospedaje' : 'Domicilio'}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <h4 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                                                                {format(startDate, "d 'de' MMMM", { locale: es })} – {format(endDate, "d 'de' MMMM", { locale: es })}
                                                                            </h4>
                                                                            <p className="text-sm text-slate-500 font-medium ml-1">
                                                                                {duration} noche{duration !== 1 ? 's' : ''} · {pets.length} mascota{pets.length !== 1 ? 's' : ''} {petNames && <span className="text-slate-400 font-normal">({petNames})</span>}
                                                                            </p>
                                                                        </div>

                                                                        {/* Top Right Actions */}
                                                                        <button
                                                                            onClick={() => {
                                                                                setPrintBooking({ booking: book, pets: pets });
                                                                                setTimeout(() => window.print(), 100);
                                                                            }}
                                                                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all"
                                                                            title="Imprimir Ficha"
                                                                        >
                                                                            <Printer size={18} />
                                                                        </button>
                                                                    </div>

                                                                    {/* Details Grid */}
                                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                                                                        {/* Contact Card */}
                                                                        <div className="bg-slate-50 rounded-xl p-4 border-2 border-slate-400 flex flex-col justify-between h-full gap-4">
                                                                            <div className="space-y-3">
                                                                                <div className="flex justify-between items-start">
                                                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Datos de Contacto</p>
                                                                                    {clientUserId && (
                                                                                        <div className={`w-2 h-2 rounded-full ${selectedChatUser === clientUserId ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} title="Estado chat"></div>
                                                                                    )}
                                                                                </div>

                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg border border-emerald-200">
                                                                                        {book.cliente?.nombre?.[0] || <User size={18} />}
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-sm font-bold text-slate-900">{book.cliente?.nombre} {book.cliente?.apellido_p}</p>
                                                                                        <p className="text-xs text-slate-500">Cliente</p>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="space-y-1.5 pl-1">
                                                                                    <a href={`tel:${book.cliente?.telefono}`} className="text-sm text-slate-600 hover:text-emerald-600 flex items-center gap-2 group/link">
                                                                                        <div className="w-6 flex justify-center"><Phone size={14} className="text-slate-400 group-hover/link:text-emerald-500" /></div>
                                                                                        {book.cliente?.telefono || "No registrado"}
                                                                                    </a>
                                                                                    <a href={`mailto:${book.cliente?.email}`} className="text-sm text-slate-600 hover:text-emerald-600 flex items-center gap-2 group/link">
                                                                                        <div className="w-6 flex justify-center"><Mail size={14} className="text-slate-400 group-hover/link:text-emerald-500" /></div>
                                                                                        {book.cliente?.email}
                                                                                    </a>
                                                                                </div>
                                                                            </div>

                                                                            <button
                                                                                onClick={() => {
                                                                                    if (clientUserId) {
                                                                                        setSelectedChatUser(clientUserId);
                                                                                        setActiveTab('mensajes');
                                                                                    } else {
                                                                                        alert("No se pudo identificar al usuario para el chat.");
                                                                                    }
                                                                                }}
                                                                                className="w-full bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/20 transition-all active:scale-95"
                                                                            >
                                                                                <MessageSquare size={16} />
                                                                                Enviar Mensaje
                                                                            </button>
                                                                        </div>

                                                                        {/* Location Card */}
                                                                        <div className="bg-slate-50 rounded-xl p-4 border-2 border-slate-400 flex flex-col h-full gap-2">
                                                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ubicación del Cuidado</p>

                                                                            <div className="flex-1 flex items-start gap-3 mt-1">
                                                                                <div className="mt-1 bg-white p-1.5 rounded-full border-2 border-slate-400 text-emerald-600 shadow-sm">
                                                                                    <MapPin size={16} />
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-sm font-medium text-slate-900 leading-snug">
                                                                                        {book.direccion ? (
                                                                                            <>
                                                                                                {book.direccion.calle} #{book.direccion.numero}
                                                                                                {book.direccion.depto && <span className="text-slate-500">, Depto {book.direccion.depto}</span>}
                                                                                                <br />
                                                                                                <span className="text-xs text-slate-500">{book.direccion.comuna}, {book.direccion.region}</span>
                                                                                            </>
                                                                                        ) : (
                                                                                            book.direccion_cliente || "Dirección no disponible"
                                                                                        )}
                                                                                    </p>
                                                                                    <p className="text-xs text-slate-500 mt-1">
                                                                                        {book.servicio === 'hospedaje' ? 'Tu Domicilio (Sitter)' : 'Domicilio del Cliente'}
                                                                                    </p>
                                                                                </div>
                                                                            </div>

                                                                            {(book.direccion || book.direccion_cliente) && (
                                                                                <a
                                                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(book.direccion?.display_name || book.direccion_cliente || "")}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="mt-auto w-full bg-white border-2 border-slate-400 text-slate-600 font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 hover:border-emerald-300 hover:text-emerald-600 transition-all text-sm"
                                                                                >
                                                                                    Ver en Mapa <ChevronDown size={14} className="-rotate-90" />
                                                                                </a>
                                                                            )}
                                                                            {(!book.direccion && !book.direccion_cliente) && (
                                                                                <div className="mt-auto w-full py-2.5 px-4 text-center text-xs text-slate-400 italic">
                                                                                    Sin ubicación registrada
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </Card>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-400 rounded-xl">
                                                    <CalendarCheck size={48} className="mx-auto text-slate-300 mb-3" />
                                                    <p className="text-slate-500 font-medium">No tienes solicitudes confirmadas próximas.</p>
                                                </div>
                                            );
                                        })()}
                                    </Card>

                                </>
                            )
                            }

                            {
                                activeTab === 'perfil' && (
                                    <Card padding="m">


                                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                                            <div>
                                                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Mi Perfil</h3>
                                                {(() => {
                                                    const missing = [];
                                                    if (!contactComplete) missing.push("Datos de Contacto");
                                                    if (!personalComplete) missing.push("Información Personal");
                                                    if (!profileComplete) missing.push("Perfil Sitter");
                                                    if (!docsComplete) missing.push("Documentación");
                                                    if (!profileData.foto_perfil) missing.push("Foto de Perfil");
                                                    if (!profileData.galeria || profileData.galeria.length === 0) missing.push("Galería con Mascotas");

                                                    if (!videoComplete) missing.push("Video de Presentación (Opcional pero recomendado)");

                                                    if (missing.length > 0) {
                                                        return (
                                                            <p className="text-red-500 font-bold text-xs mt-1">
                                                                Falta: {missing.join(', ')}
                                                            </p>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                            <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                                Gestiona tu información pública
                                            </span>
                                        </div>

                                        {/* Alerta de Perfil Incompleto */}
                                        {(!profileData.fecha_nacimiento || !profileData.ocupacion || !profileData.descripcion) && (
                                            <div className="mb-8 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                                                <div className="text-amber-500 mt-0.5 bg-amber-100 p-1.5 rounded-full">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-amber-900">Completa tu Perfil</h4>
                                                    <p className="text-sm text-amber-800/80 mt-1 leading-relaxed">
                                                        Para activar tu cuenta y recibir reservas, es necesario que completes tu información personal (Fecha de Nacimiento, Ocupación y Sobre mí).
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-9">

                                            {/* BLOQUE 1: Datos de Contacto (Clean White) */}
                                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                                                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <button
                                                            onClick={() => toggleSection('contact')}
                                                            className="p-2 bg-slate-50 border border-slate-200 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
                                                        >
                                                            {expandedSections.contact ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                        </button>
                                                        <div>
                                                            <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                                                Datos de Contacto
                                                                {contactComplete ? (
                                                                    <div className="w-2 h-2 rounded-full bg-emerald-400" title="Completo" />
                                                                ) : (
                                                                    <div className="w-2 h-2 rounded-full bg-amber-400" title="Incompleto" />
                                                                )}
                                                            </h4>
                                                            <p className="text-xs text-slate-400 font-medium">Email, teléfono y redes sociales</p>
                                                        </div>
                                                    </div>
                                                    {activeSection === 'contact' ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    if (backupProfileData) setProfileData(JSON.parse(JSON.stringify(backupProfileData)));
                                                                    setActiveSection(null);
                                                                }}
                                                                className="text-xs text-slate-500 hover:text-slate-800 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                onClick={() => handleSaveSection('contact')}
                                                                disabled={saving}
                                                                className="text-xs bg-emerald-600 text-white px-4 py-1.5 rounded-lg font-bold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 disabled:opacity-50 disabled:shadow-none"
                                                            >
                                                                {saving ? "Guardando..." : "Guardar Cambios"}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setActiveSection('contact')}
                                                            disabled={activeSection !== null && activeSection !== 'contact'}
                                                            className="text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-30 disabled:bg-transparent"
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
                                                                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-500 font-medium cursor-not-allowed"
                                                                    value={email || ""}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Teléfono</label>
                                                                <input
                                                                    type="tel"
                                                                    disabled={activeSection !== 'contact'}
                                                                    maxLength={12}
                                                                    className={`w-full text-sm rounded-xl px-4 py-2.5 outline-none transition-all ${activeSection === 'contact' ? "border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 bg-white shadow-sm" : "bg-white border border-slate-200 text-slate-600"
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
                                                                    className={`w-full text-sm rounded-xl px-4 py-2.5 outline-none transition-all ${activeSection === 'contact' ? "border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 bg-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 appearance-none"
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
                                                                    className={`w-full text-sm rounded-xl px-4 py-2.5 outline-none transition-all ${activeSection === 'contact' ? "border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 bg-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 appearance-none"
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
                                                        <div className="sm:col-span-2 mt-2 pt-4 border-t border-slate-100">
                                                            <h5 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">Redes Sociales (Opcional)</h5>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                                                                        <Linkedin className="w-4 h-4 text-slate-500" /> LinkedIn
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        disabled={activeSection !== 'contact'}
                                                                        className={`w-full text-sm rounded-xl px-4 py-2.5 outline-none transition-all ${activeSection === 'contact' ? "border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 bg-white shadow-sm" : "bg-white border border-slate-200 text-slate-600"}`}
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
                                                                        className={`w-full text-sm rounded-xl px-4 py-2.5 outline-none transition-all ${activeSection === 'contact' ? "border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 bg-white shadow-sm" : "bg-white border border-slate-200 text-slate-600"}`}
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
                                                                        className={`w-full text-sm rounded-xl px-4 py-2.5 outline-none transition-all ${activeSection === 'contact' ? "border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 bg-white shadow-sm" : "bg-white border border-slate-200 text-slate-600"}`}
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
                                                                        className={`w-full text-sm rounded-xl px-4 py-2.5 outline-none transition-all ${activeSection === 'contact' ? "border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 bg-white shadow-sm" : "bg-white border border-slate-200 text-slate-600"}`}
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


                                            {/* BLOQUE 2: Información Personal (Clean White) */}
                                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                                                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <button
                                                            onClick={() => toggleSection('personal')}
                                                            className="p-2 bg-slate-50 border border-slate-200 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
                                                        >
                                                            {expandedSections.personal ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                        </button>
                                                        <div>
                                                            <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                                                Información Personal
                                                                {personalComplete ? (
                                                                    <div className="w-2 h-2 rounded-full bg-emerald-400" title="Completo" />
                                                                ) : (
                                                                    <div className="w-2 h-2 rounded-full bg-amber-400" title="Incompleto" />
                                                                )}
                                                            </h4>
                                                            <p className="text-xs text-slate-400 font-medium">Datos básicos de identificación</p>
                                                        </div>
                                                    </div>
                                                    {activeSection === 'personal' ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    if (backupProfileData) setProfileData(JSON.parse(JSON.stringify(backupProfileData)));
                                                                    setActiveSection(null);
                                                                }}
                                                                className="text-xs text-slate-500 hover:text-slate-800 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                onClick={() => handleSaveSection('personal')}
                                                                disabled={saving}
                                                                className="text-xs bg-emerald-600 text-white px-4 py-1.5 rounded-lg font-bold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 disabled:opacity-50 disabled:shadow-none"
                                                            >
                                                                {saving ? "Guardando..." : "Guardar Cambios"}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setActiveSection('personal')}
                                                            disabled={activeSection !== null && activeSection !== 'personal'}
                                                            className="text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-30 disabled:bg-transparent"
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
                                                                className={`w-full text-sm rounded-xl px-4 py-2.5 outline-none transition-all ${activeSection === 'personal' ? "border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 bg-white shadow-sm" : "bg-white border border-slate-200 text-slate-600"}`}
                                                                value={profileData.nombre}
                                                                onChange={(e) => setProfileData({ ...profileData, nombre: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-4">
                                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Apellido Paterno</label>
                                                            <input
                                                                type="text"
                                                                disabled={activeSection !== 'personal'}
                                                                className={`w-full text-sm rounded-xl px-4 py-2.5 outline-none transition-all ${activeSection === 'personal' ? "border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 bg-white shadow-sm" : "bg-white border border-slate-200 text-slate-600"}`}
                                                                value={profileData.apellido_p}
                                                                onChange={(e) => setProfileData({ ...profileData, apellido_p: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-4">
                                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Apellido Materno</label>
                                                            <input
                                                                type="text"
                                                                disabled={activeSection !== 'personal'}
                                                                className={`w-full text-sm rounded-xl px-4 py-2.5 outline-none transition-all ${activeSection === 'personal' ? "border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 bg-white shadow-sm" : "bg-white border border-slate-200 text-slate-600"}`}
                                                                value={profileData.apellido_m}
                                                                onChange={(e) => setProfileData({ ...profileData, apellido_m: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-6">
                                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">RUT {activeSection === 'personal' && <span className="text-slate-400 font-normal normal-case">(Ej: 12.345.678-9)</span>}</label>
                                                            <input
                                                                type="text"
                                                                disabled={activeSection !== 'personal'}
                                                                className={`w-full text-sm rounded-xl px-4 py-2.5 outline-none transition-all ${activeSection === 'personal' ? "border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 bg-white shadow-sm" : "bg-white border border-slate-200 text-slate-600"
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
                                                                className={`w-full text-sm rounded-xl px-4 py-2.5 outline-none transition-all ${activeSection === 'personal' ? "border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 bg-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 appearance-none"
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
                                                                className={`w-full text-sm rounded-xl px-4 py-2.5 outline-none transition-all ${activeSection === 'personal' ? "border border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 bg-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 appearance-none"
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
                                                    </div>
                                                )}
                                            </div>



                                            {/* BLOQUE 4: Documentación */}
                                            <div className="bg-white p-5 rounded-2xl border border-slate-200">
                                                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <button
                                                            onClick={() => toggleSection('documents')}
                                                            className="p-2 bg-slate-50 border border-slate-200 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
                                                        >
                                                            {expandedSections.documents ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                        </button>
                                                        <div>
                                                            <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                                                Documentación
                                                                {profileData.certificado_antecedentes ? (
                                                                    <div className="w-2 h-2 rounded-full bg-emerald-400" title="Completo" />
                                                                ) : (
                                                                    <div className="w-2 h-2 rounded-full bg-amber-400" title="Pendiente" />
                                                                )}
                                                            </h4>
                                                            <p className="text-xs text-slate-400 font-medium">Gestiona tus documentos legales</p>
                                                        </div>
                                                    </div>
                                                    {activeSection === 'documents' ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setActiveSection(null)}
                                                                className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1"
                                                            >
                                                                Listo
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setActiveSection('documents')}
                                                            disabled={activeSection !== null && activeSection !== 'documents'}
                                                            className="text-xs text-emerald-600 font-bold hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            Editar
                                                        </button>
                                                    )}
                                                </div>

                                                {expandedSections.documents && (
                                                    <div>
                                                        {profileData.certificado_antecedentes ? (
                                                            <div className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm group/file transition-colors max-w-md">
                                                                <div className="p-3 bg-slate-100 text-slate-500 rounded-lg transition-colors">
                                                                    <FileText size={24} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-bold text-slate-700 truncate">Antecedentes.pdf</p>
                                                                    <p className="text-xs text-slate-400 mt-0.5">Certificado de Antecedentes</p>
                                                                    <div className="flex gap-3 mt-3">
                                                                        <button
                                                                            onClick={() => handleViewDocument(profileData.certificado_antecedentes)}
                                                                            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors px-2 py-1 bg-slate-50 rounded border border-slate-200 hover:bg-white"
                                                                        >
                                                                            <Eye size={12} /> Ver Documento
                                                                        </button>
                                                                        {activeSection === 'documents' && (
                                                                            <button
                                                                                onClick={handleDeleteDocument}
                                                                                disabled={uploading}
                                                                                className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors px-2 py-1 bg-red-50 rounded border border-red-100 hover:bg-white"
                                                                            >
                                                                                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Eliminar
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="text-emerald-500">
                                                                    <CheckCircle2 size={20} />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="max-w-md">
                                                                <label className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-2xl transition-all group/upload ${activeSection === 'documents' ? "border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/10 cursor-pointer" : "border-slate-200 opacity-60 cursor-not-allowed"}`}>
                                                                    <div className={`p-4 rounded-full transition-colors ${activeSection === 'documents' ? "bg-slate-50 text-slate-400 group-hover/upload:text-emerald-600 group-hover/upload:bg-emerald-100" : "bg-slate-50 text-slate-300"}`}>
                                                                        <Upload size={24} />
                                                                    </div>
                                                                    <div className="text-center mt-2">
                                                                        <p className={`text-sm font-bold ${activeSection === 'documents' ? "text-slate-600 group-hover/upload:text-emerald-700" : "text-slate-400"}`}>Subir Certificado de Antecedentes</p>
                                                                        <p className="text-xs text-slate-400 mt-1">Sube tu archivo PDF o Imagen</p>
                                                                    </div>
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*,.pdf"
                                                                        className="hidden"
                                                                        onChange={handleCertUpload}
                                                                        disabled={activeSection !== 'documents' || uploading}
                                                                    />
                                                                </label>
                                                                {activeSection !== 'documents' && (
                                                                    <p className="text-xs text-slate-400 mt-2 text-center text-balance">
                                                                        Haz clic en <span className="font-bold">Editar</span> para gestionar tus documentos.
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Video Presentacion Component */}
                                            <div className="bg-white p-5 rounded-2xl border border-slate-200">
                                                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <button
                                                            onClick={() => toggleSection('video')}
                                                            className="p-2 bg-slate-50 border border-slate-200 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
                                                        >
                                                            {expandedSections.video ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                        </button>
                                                        <div>
                                                            <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                                                Video de Presentación
                                                                {profileData.video_presentacion ? (
                                                                    <div className="w-2 h-2 rounded-full bg-emerald-400" title="Completo" />
                                                                ) : (
                                                                    <div className="w-2 h-2 rounded-full bg-amber-400" title="Pendiente" />
                                                                )}
                                                            </h4>
                                                            <p className="text-xs text-slate-400 font-medium">Sube un video presentándote</p>
                                                        </div>
                                                    </div>
                                                    {activeSection === 'video' ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setActiveSection(null)}
                                                                className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1"
                                                            >
                                                                Listo
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setActiveSection('video')}
                                                            disabled={activeSection !== null && activeSection !== 'video'}
                                                            className="text-xs text-emerald-600 font-bold hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            Editar
                                                        </button>
                                                    )}
                                                </div>

                                                {expandedSections.video && (
                                                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                                                        <p className="text-xs text-slate-500 mb-4">
                                                            Sube un video corto presentándote a los dueños de mascotas. Esto aumenta significativamente tus posibilidades de ser contratado.
                                                        </p>

                                                        {profileData.video_presentacion ? (
                                                            <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-w-sm mx-auto shadow-md group">
                                                                <video
                                                                    src={profileData.video_presentacion}
                                                                    controls
                                                                    className="w-full h-full object-contain"
                                                                />
                                                                {activeSection === 'video' && (
                                                                    <button
                                                                        onClick={handleDeleteVideoPresentacion}
                                                                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                                        title="Eliminar Video"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            activeSection === 'video' ? (
                                                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-emerald-400 hover:bg-emerald-50/10 transition-all cursor-pointer relative">
                                                                    <input
                                                                        type="file"
                                                                        accept="video/mp4,video/quicktime,video/webm"
                                                                        onChange={handleVideoPresentacionUpload}
                                                                        disabled={uploading}
                                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                                    />
                                                                    {uploading ? (
                                                                        <Loader2 size={32} className="text-emerald-500 animate-spin mb-2" />
                                                                    ) : (
                                                                        <Upload size={32} className="text-slate-300 mb-2" />
                                                                    )}
                                                                    <h5 className="text-sm font-bold text-slate-700">Sube tu video aquí</h5>
                                                                    <p className="text-xs text-slate-400 mt-1">MP4, MOV o WEBM (Máx 50MB)</p>
                                                                </div>
                                                            ) : (
                                                                <div className="border border-slate-200 bg-slate-50 rounded-2xl p-8 text-center">
                                                                    <p className="text-sm text-slate-400 italic">No has subido un video de presentación.</p>
                                                                </div>
                                                            )
                                                        )}

                                                        {/* Consentimiento RRSS */}
                                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                                            <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${profileData.consentimiento_rrss ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                                                                <div className="pt-0.5">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={profileData.consentimiento_rrss}
                                                                        onChange={(e) => setProfileData({ ...profileData, consentimiento_rrss: e.target.checked })}
                                                                        disabled={activeSection !== 'video'}
                                                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <span className={`text-sm font-bold block ${profileData.consentimiento_rrss ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                                        Consentimiento para Redes Sociales
                                                                    </span>
                                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                                        Doy mi consentimiento para que Pawnecta pueda publicar este video en sus redes sociales (Instagram, TikTok) para promocionar mi perfil.
                                                                    </p>
                                                                </div>
                                                            </label>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                )}





                            {/* SECCIÃ“N DERECHA: RESERVAS Y REVIEWS (Solo visible fuera de modo edición para "ver" como queda, o siempre visible para gestión) */}
                            {/* En este dashboard de Sitter (autoadministrable), mostramos las solicitudes y reservas reales */}



                            {/* TOAST SUCCESS */}
                            <div className={`fixed bottom-5 right-5 z-50 transition-all duration-300 transform ${showToast ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"}`}>
                                <div className="bg-emerald-600/90 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
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
                        </div>




                    </div>
                </div >
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

