import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { format, differenceInYears, subYears, isAfter } from "date-fns";
import { es } from "date-fns/locale";
import { formatRut, validateRut, cleanRut } from "../lib/rutValidation";
import DatePickerSingle from "../components/DatePickerSingle";
import ModalAlert from "../components/ModalAlert";
import AddressAutocomplete from "../components/AddressAutocomplete";
import { Linkedin, Music, Instagram, Facebook, Mail, User, PawPrint, Dog, Cat, Home, MapPin, AlignLeft, ChevronDown, ChevronUp } from "lucide-react";
import ImageLightbox from "../components/ImageLightbox"; // Added

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
    "Lo Prado", "Macul", "Maipú", "Ñuñoa", "Pedro Aguirre Cerda", "Peñalolén", "Providencia", "Pudahuel",
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
    const [isLightboxOpen, setIsLightboxOpen] = useState(false); // Added Lightbox State
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [averageRating, setAverageRating] = useState(0);
    const [bookings, setBookings] = useState<any[]>([]);

    // Fetch Bookings
    useEffect(() => {
        if (!userId) return;
        const fetchBookings = async () => {
            const { data, error } = await supabase
                .from('viajes')
                .select('*, cliente:cliente_id(*), mascotas:mascotas_id(*)')
                .eq('sitter_id', userId)
                .order('fecha_inicio', { ascending: true });

            if (!error && data) {
                setBookings(data);
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
        profile: true
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
        universidad: "",
        carrera: "",
        ano_curso: "",
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
        videos: [],
        latitud: null,
        longitud: null,
        direccion_completa: ""
    });

    const [backupProfileData, setBackupProfileData] = useState<any>(null);

    const handleViewDocument = (url: string) => {
        if (url) window.open(url, '_blank');
    };

    const handleDeleteDocument = () => {
        setProfileData({ ...profileData, certificado_antecedentes: null });
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
        } catch (error: any) {
            alert('Error al subir documento: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

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
        } catch (error: any) {
            alert('Error al subir imagen: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        if (profileData.galeria && profileData.galeria.length >= 3) {
            alert("Máximo 3 fotos en la galería.");
            return;
        }

        setUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/gallery-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('sitter-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('sitter-images')
                .getPublicUrl(filePath);

            setProfileData({ ...profileData, galeria: [...(profileData.galeria || []), publicUrlData.publicUrl] });
        } catch (error: any) {
            alert('Error al subir imagen: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDeletePhoto = (index: number) => {
        const newGallery = [...profileData.galeria];
        newGallery.splice(index, 1);
        setProfileData({ ...profileData, galeria: newGallery });
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

    const handleSaveSection = async (section: string) => {
        // e.preventDefault(); // If called from button type button, no event. If form, needs event.
        // We will make buttons type="button" and call this.
        setSaving(true);
        setErrorMsg(null);

        if (!userId) {
            alert("Sesión no válida o expirada.");
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

            if (profileData.ocupacion === 'Estudiante') {
                if (!profileData.universidad || !profileData.carrera || !profileData.ano_curso) {
                    alert("Si eres estudiante, debes completar los datos de estudios.");
                    setSaving(false);
                    return;
                }
            }

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
                alert(`La descripción "Sobre mí" debe tener al menos 100 caracteres. (Actual: ${profileData.descripcion.length})`);
                setSaving(false);
                return;
            }
            if (!profileData.tipo_vivienda) errors.push("Tipo de Vivienda");
            if (!profileData.tiene_mascotas) errors.push("¿Tienes mascotas?");
        }

        if (errors.length > 0) {
            alert(`Por favor completa los siguientes campos obligatorios: ${errors.join(", ")}`);
            setSaving(false);
            return;
        }

        try {
            // Construir updates basados en la sección para evitar sobrescribir con datos antiguos si hubiera desincronización (aunque el estado es unico)
            // En React `profileData` es la fuente de verdad, así que mandamos todo o solo lo relevante. 
            // Mandar todo es más seguro para mantener consistencia si el backend espera el objeto completo, 
            // pero Supabase acepta partials. Mandaremos todo el objeto `profileData` ya que lo tenemos en memoria actualizado.

            const updates = {
                nombre: profileData.nombre,
                apellido_p: profileData.apellido_p,
                apellido_m: profileData.apellido_m,
                descripcion: profileData.descripcion,
                ocupacion: profileData.ocupacion,
                edad: parseInt(profileData.edad) || null,
                tiene_mascotas: profileData.tiene_mascotas === "si",
                tipo_vivienda: profileData.tipo_vivienda,
                sexo: profileData.sexo,
                cuida_perros: profileData.cuida_perros,
                cuida_gatos: profileData.cuida_gatos,
                servicio_en_casa: profileData.servicio_en_casa,
                servicio_a_domicilio: profileData.servicio_a_domicilio,
                region: profileData.region,
                comuna: profileData.comuna,
                rut: cleanRut(profileData.rut),
                universidad: profileData.universidad,
                carrera: profileData.carrera,
                ano_curso: profileData.ano_curso,
                telefono: profileData.telefono,
                galeria: profileData.galeria,
                detalles_mascotas: profileData.detalles_mascotas,
                redes_sociales: profileData.redes_sociales,
                tarifa_servicio_en_casa: profileData.tarifa_servicio_en_casa,
                tarifa_servicio_a_domicilio: profileData.tarifa_servicio_a_domicilio,
                calle: profileData.calle,
                numero: profileData.numero,
                latitud: profileData.latitud,
                longitud: profileData.longitud,
                direccion_completa: profileData.direccion_completa,
                videos: profileData.videos
            };

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
            alert("Hubo un error al actualizar el perfil: " + (error as any).message);
        } finally {
            setSaving(false);
        }
    };

    const displayName = profileData?.nombre || nombre || "Sitter";

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
                            </h1>
                            <p className="text-sm text-slate-600">
                                Gestiona tus reservas y perfil.
                            </p>
                        </div>
                        <Link href="/explorar" className="hidden sm:inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                            Ver perfil público ↗
                        </Link>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                        {/* SIDEBAR: Identidad y Verificación (Col-span-4) */}
                        <div className="lg:col-span-4 space-y-6">

                            {/* Tarjeta de Identidad Consolidada */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="h-24 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                                <div className="px-6 pb-6 text-center -mt-12 relative">
                                    <div className="relative w-24 h-24 mx-auto">
                                        <div
                                            className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md bg-white cursor-pointer group"
                                            onClick={() => setIsLightboxOpen(true)}
                                        >
                                            {profileData.foto_perfil ? (
                                                <Image
                                                    src={profileData.foto_perfil}
                                                    alt="Foto perfil"
                                                    fill
                                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-slate-300 text-3xl">
                                                    👤
                                                </div>
                                            )}
                                        </div>

                                        {/* Botón Editar (Lápiz) */}
                                        <label className="absolute bottom-0 right-0 p-1.5 bg-white border border-slate-200 rounded-full shadow-sm cursor-pointer hover:bg-slate-50 text-slate-600 transition-colors z-10">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handlePhotoUpload}
                                                disabled={uploading}
                                            />
                                            {uploading ? (
                                                <span className="block w-3.5 h-3.5 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin"></span>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                            )}
                                        </label>
                                    </div>

                                    <h2 className="mt-3 text-lg font-bold text-slate-900">{displayName}</h2>
                                    <p className="text-xs text-slate-500 mb-2">{email}</p>

                                    {/* Instrucciones Foto */}
                                    <p className="text-[10px] text-slate-400 mb-4 px-2 leading-tight">
                                        📷 La foto debe ser frontal, visualizando claramente el rostro, sin gorros ni gafas de sol.
                                    </p>

                                    {/* Estado de Verificación Integrado */}
                                    <div className={`rounded-lg p-3 text-left text-xs border ${profileData.aprobado
                                        ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                                        : profileData.certificado_antecedentes
                                            ? "bg-blue-50 border-blue-100 text-blue-800"
                                            : "bg-orange-50 border-orange-100 text-orange-800"
                                        }`}>
                                        <div className="flex items-center gap-2 mb-1 font-bold">
                                            {profileData.aprobado ? "✅ Verificado" : profileData.certificado_antecedentes ? <span className="flex items-center gap-1 text-amber-600"><span className="inline-block animate-spin w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full"></span> En Revisión</span> : "⚠️ No Verificado"}
                                        </div>
                                        <p className="opacity-90 leading-relaxed">
                                            {profileData.aprobado
                                                ? "Tu perfil es visible para todos."
                                                : profileData.certificado_antecedentes
                                                    ? "Estamos validando tus documentos."
                                                    : "Sube tu certificado para ser visible."}
                                        </p>
                                    </div>

                                    {/* Reviews Summary (Sidebar) */}
                                    <div className="flex items-center justify-between mb-4 px-2 py-2 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-amber-400 text-base">★</span>
                                            <span className="text-sm font-bold text-slate-900">{averageRating.toFixed(1)}</span>
                                            <span className="text-xs text-slate-400">({reviews.length})</span>
                                        </div>
                                        <Link href="/sitter/reviews" className="text-xs text-emerald-600 font-medium hover:underline">
                                            Ver todas
                                        </Link>
                                    </div>

                                    {/* Subida y Gestión de documentos */}
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        {profileData.certificado_antecedentes ? (
                                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xl">📄</span>
                                                    <div className="text-xs text-slate-600 truncate flex-1 font-medium">
                                                        Certificado Antecedentes
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleViewDocument(profileData.certificado_antecedentes)}
                                                        className="flex-1 text-[10px] bg-white border border-slate-200 text-slate-700 py-1.5 rounded hover:bg-slate-50 font-bold transition-colors"
                                                    >
                                                        Ver
                                                    </button>
                                                    <button
                                                        onClick={handleDeleteDocument}
                                                        disabled={uploading}
                                                        className="flex-1 text-[10px] bg-white border border-red-200 text-red-600 py-1.5 rounded hover:bg-red-50 font-bold transition-colors"
                                                    >
                                                        {uploading ? "..." : "Eliminar"}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <label className="block w-full py-3 px-3 border border-slate-300 border-dashed rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition-colors text-center">
                                                {uploading ? "Subiendo..." : "📄 Subir Certificado Antecedentes"}
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

                                    {/* Gallery Section */}
                                    <div className="mt-6 pt-6 border-t border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                                            <span>📸 Galería ({profileData.galeria.length}/6)</span>
                                            {profileData.galeria.length < 6 && (
                                                <label className="cursor-pointer text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded transition-colors">
                                                    + Añadir
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleGalleryUpload}
                                                        disabled={uploading}
                                                    />
                                                </label>
                                            )}
                                        </h3>

                                        {profileData.galeria && profileData.galeria.length > 0 ? (
                                            <div className="grid grid-cols-3 gap-2">
                                                {(profileData.galeria as string[]).map((photo, index) => (
                                                    <div
                                                        key={index}
                                                        className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group cursor-pointer"
                                                        onClick={() => setSelectedImage(photo)}
                                                    >
                                                        <Image
                                                            src={photo}
                                                            alt={`Foto ${index + 1}`}
                                                            fill
                                                            className="object-cover"
                                                            unoptimized
                                                        />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeletePhoto(index);
                                                            }}
                                                            className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Eliminar"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-lg dashed border border-slate-200">
                                                Sube fotos de ti con mascotas
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-100 sm:hidden">
                                        <Link href="/explorar" className="block w-full py-2 text-xs font-medium text-slate-600 hover:text-emerald-600 text-center">
                                            Ver cómo aparece mi perfil
                                        </Link>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* MAIN CONTENT: Reservas y Datos (Col-span-8) */}
                        <div className="lg:col-span-8 space-y-6">

                            {/* BLOQUE NUEVO: Solicitudes Pendientes (Prioridad Alta) */}
                            {bookings.some(b => b.estado === 'pendiente') && (
                                <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-5 bg-orange-50/30">
                                    <h3 className="text-base font-bold text-orange-900 mb-4 flex items-center gap-2">
                                        📩 Solicitudes Pendientes
                                    </h3>
                                    <div className="grid gap-3">
                                        {bookings.filter(b => b.estado === 'pendiente').map(booking => (
                                            <div key={booking.id} className="p-4 bg-white rounded-lg border border-orange-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-bold text-slate-900">{booking.cliente.nombre} {booking.cliente.apellido_p}</span>
                                                        <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold uppercase">Nueva</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                                        📅 {format(new Date(booking.fecha_inicio), "d MMM", { locale: es })} - {format(new Date(booking.fecha_fin), "d MMM", { locale: es })}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 w-full sm:w-auto">
                                                    <button className="flex-1 sm:flex-none bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-emerald-700 shadow-sm transition-colors">
                                                        Aceptar
                                                    </button>
                                                    <button className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-600 text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors">
                                                        Rechazar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* BLOQUE 1: Próximas Reservas (Confirmadas) */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    📅 Reservas Agendadas
                                </h3>

                                {bookings.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">Reserva</th>
                                                    <th className="px-4 py-3 font-medium">Cliente</th>
                                                    <th className="px-4 py-3 font-medium">Fechas</th>
                                                    <th className="px-4 py-3 font-medium">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {bookings.map((book) => (
                                                    <tr key={book.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-3 font-bold text-slate-900">
                                                            #{book.id.slice(0, 6)}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">
                                                            {/* Placeholder */}
                                                            Cliente
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">
                                                            {format(new Date(book.fecha_inicio), "d MMM", { locale: es })} - {format(new Date(book.fecha_fin), "d MMM", { locale: es })}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${book.estado === 'confirmada' ? 'bg-emerald-100 text-emerald-800' :
                                                                book.estado === 'pendiente' ? 'bg-orange-100 text-orange-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {book.estado}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                        <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-xl">
                                            📭
                                        </div>
                                        <p className="text-sm font-medium text-slate-900">No tienes reservas próximas</p>
                                        <p className="text-xs text-slate-500 mt-1">Cuando recibas una solicitud, aparecerá aquí.</p>
                                    </div>
                                )}
                            </div>

                            {/* BLOQUE 2: Datos del Perfil (Form Compacto -> Div) */}
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
                                                {profileData.ocupacion === "Estudiante" && (
                                                    <>
                                                        <div className="sm:col-span-6">
                                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Universidad / Instituto</label>
                                                            <input
                                                                type="text"
                                                                disabled={activeSection !== 'personal'}
                                                                className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'personal' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"
                                                                    }`}
                                                                value={profileData.universidad}
                                                                onChange={(e) => setProfileData({ ...profileData, universidad: e.target.value })}
                                                                placeholder="Ej: PUC, U. de Chile"
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-6">
                                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Carrera</label>
                                                            <input
                                                                type="text"
                                                                disabled={activeSection !== 'personal'}
                                                                className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'personal' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"
                                                                    }`}
                                                                value={profileData.carrera}
                                                                onChange={(e) => setProfileData({ ...profileData, carrera: e.target.value })}
                                                                placeholder="Ej: Medicina Veterinaria"
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-6">
                                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Año en Curso</label>
                                                            <input
                                                                type="text"
                                                                disabled={activeSection !== 'personal'}
                                                                className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'personal' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"
                                                                    }`}
                                                                value={profileData.ano_curso}
                                                                onChange={(e) => setProfileData({ ...profileData, ano_curso: e.target.value })}
                                                                placeholder="Ej: 3er Año"
                                                            />
                                                        </div>
                                                    </>
                                                )}

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
                                                                        ✕
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

                                                <div className="pt-2">
                                                    <h5 className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wide">Preferencias & Servicios</h5>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        <label className={`flex items-center gap-2 p-2 rounded-lg border text-sm font-medium transition-all ${activeSection === 'profile' ? "bg-white border-slate-200 cursor-pointer hover:border-emerald-300" : "bg-white border-transparent opacity-75"}`}>
                                                            <input type="checkbox" disabled={activeSection !== 'profile'} checked={profileData.cuida_perros} onChange={(e) => setProfileData({ ...profileData, cuida_perros: e.target.checked })} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                                                            <span className="flex items-center gap-1"><Dog className="w-4 h-4 text-slate-500" /> Perros</span>
                                                        </label>
                                                        <label className={`flex items-center gap-2 p-2 rounded-lg border text-sm font-medium transition-all ${activeSection === 'profile' ? "bg-white border-slate-200 cursor-pointer hover:border-emerald-300" : "bg-white border-transparent opacity-75"}`}>
                                                            <input type="checkbox" disabled={activeSection !== 'profile'} checked={profileData.cuida_gatos} onChange={(e) => setProfileData({ ...profileData, cuida_gatos: e.target.checked })} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                                                            <span className="flex items-center gap-1"><Cat className="w-4 h-4 text-slate-500" /> Gatos</span>
                                                        </label>
                                                        <label className={`flex items-center gap-2 p-2 rounded-lg border text-sm font-medium transition-all ${activeSection === 'profile' ? "bg-white border-slate-200 cursor-pointer hover:border-emerald-300" : "bg-white border-transparent opacity-75"}`}>
                                                            <input type="checkbox" disabled={activeSection !== 'profile'} checked={profileData.servicio_a_domicilio} onChange={(e) => setProfileData({ ...profileData, servicio_a_domicilio: e.target.checked })} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                                                            <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-slate-500" /> A Domicilio</span>
                                                        </label>
                                                        <label className={`flex items-center gap-2 p-2 rounded-lg border text-sm font-medium transition-all ${activeSection === 'profile' ? "bg-white border-slate-200 cursor-pointer hover:border-emerald-300" : "bg-white border-transparent opacity-75"}`}>
                                                            <input type="checkbox" disabled={activeSection !== 'profile'} checked={profileData.servicio_en_casa} onChange={(e) => setProfileData({ ...profileData, servicio_en_casa: e.target.checked })} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                                                            <span className="flex items-center gap-1"><Home className="w-4 h-4 text-slate-500" /> En mi Casa</span>
                                                        </label>
                                                    </div>

                                                    {/* Tarifas */}
                                                    {(profileData.servicio_a_domicilio || profileData.servicio_en_casa) && (
                                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                                            <h5 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">Tarifas Esperadas <span className="text-slate-400 font-normal normal-case">(CLP por día/paseo)</span></h5>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                {profileData.servicio_a_domicilio && (
                                                                    <div>
                                                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Tarifa A Domicilio</label>
                                                                        <div className="relative">
                                                                            <span className="absolute left-3 top-2 text-slate-400">$</span>
                                                                            <input
                                                                                type="number"
                                                                                disabled={activeSection !== 'profile'}
                                                                                className={`w-full pl-6 text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'profile' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                                                value={profileData.tarifa_servicio_a_domicilio || ""}
                                                                                onChange={(e) => setProfileData({ ...profileData, tarifa_servicio_a_domicilio: parseInt(e.target.value) || null })}
                                                                                placeholder="Ej: 15000"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {profileData.servicio_en_casa && (
                                                                    <div>
                                                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Tarifa En mi Casa</label>
                                                                        <div className="relative">
                                                                            <span className="absolute left-3 top-2 text-slate-400">$</span>
                                                                            <input
                                                                                type="number"
                                                                                disabled={activeSection !== 'profile'}
                                                                                className={`w-full pl-6 text-sm rounded-lg px-3 py-2 outline-none transition-all ${activeSection === 'profile' ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                                                value={profileData.tarifa_servicio_en_casa || ""}
                                                                                onChange={(e) => setProfileData({ ...profileData, tarifa_servicio_en_casa: parseInt(e.target.value) || null })}
                                                                                placeholder="Ej: 20000"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
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
                                                                    ✕
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
                        </div>
                    </div>
                </div>


                {/* SECCIÓN DERECHA: RESERVAS Y REVIEWS (Solo visible fuera de modo edición para "ver" como queda, o siempre visible para gestión) */}
                {/* En este dashboard de Sitter (autoadministrable), mostramos las solicitudes y reservas reales */}



                {/* TOAST SUCCESS */}
                <div className={`fixed bottom-5 right-5 z-50 transition-all duration-300 transform ${showToast ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"}`}>
                    <div className="bg-slate-900/90 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
                        <div className="bg-emerald-500 rounded-full w-5 h-5 flex items-center justify-center text-xs text-slate-900 font-bold">
                            ✓
                        </div>
                        <span className="font-medium text-sm">Cambios guardados correctamente</span>
                    </div>
                </div>

                {/* LIGHTBOX DE GALERÍA */}
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
                {profileData.foto_perfil && (
                    <ImageLightbox
                        src={profileData.foto_perfil}
                        alt="Foto de perfil"
                        isOpen={isLightboxOpen}
                        onClose={() => setIsLightboxOpen(false)}
                    />
                )}
            </main>

        </>
    );
}
