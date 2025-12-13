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
import { Linkedin, Music, Instagram, Facebook, Mail, User, PawPrint, Dog, Cat, Home, MapPin, AlignLeft } from "lucide-react";
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

    // Estado de edición
    const [isEditing, setIsEditing] = useState(false);

    // Estado de reservas
    const [bookings, setBookings] = useState<Booking[]>([]);

    // Estado de reviews
    const [reviews, setReviews] = useState<Review[]>([]);
    const [averageRating, setAverageRating] = useState<number>(0);

    // Estado para búsqueda de dirección (movido al componente)
    // const [searchQuery, setSearchQuery] = useState("");
    // const [addressResults, setAddressResults] = useState<any[]>([]);
    // const [searchingAddress, setSearchingAddress] = useState(false);

    // Estado del perfil
    const [profileData, setProfileData] = useState({
        descripcion: "",
        ocupacion: "",
        edad: "",
        tiene_mascotas: "no",
        tipo_vivienda: "casa",
        sexo: "otro",
        cuida_perros: false,
        cuida_gatos: false,
        servicio_en_casa: false,
        servicio_a_domicilio: false,
        foto_perfil: "",
        certificado_antecedentes: "",

        aprobado: false,
        region: "RM",
        comuna: "",
        rut: "",
        nombre: "",
        apellido_p: "",
        apellido_m: "",

        // Dirección Estructurada
        calle: "",
        numero: "",
        latitud: null as number | null,
        longitud: null as number | null,
        direccion_completa: "", // Para mostrar la dirección seleccionada

        universidad: "",

        carrera: "",
        ano_curso: "",
        telefono: "",
        fecha_nacimiento: "",
        galeria: [] as string[], // Galería de fotos
        detalles_mascotas: [] as { tipo: string; cantidad: number }[], // Detalles de mascotas
        redes_sociales: { linkedin: "", tiktok: "", instagram: "", facebook: "" }, // Redes Sociales
        tarifa_servicio_en_casa: null as number | null,
        tarifa_servicio_a_domicilio: null as number | null
    });

    const [backupProfileData, setBackupProfileData] = useState<typeof profileData | null>(null);

    // Estado para Lightbox de galería
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Estado para notificaciones
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        if (showToast) {
            const timer = setTimeout(() => setShowToast(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showToast]);

    useEffect(() => {
        async function loadProfile() {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setEmail(session.user.email || null);
                setUserId(session.user.id);

                if (session.user.user_metadata?.nombre) {
                    setNombre(session.user.user_metadata.nombre);
                }

                // Asegurar que userId esté setedo antes de cualquier operación
                const currentUserId = session.user.id;
                setUserId(currentUserId);

                const { data } = await supabase
                    .from("registro_petmate")
                    .select("*")

                    .eq("auth_user_id", session.user.id)
                    .single();

                if (data) {
                    if (data.nombre) setNombre(data.nombre); // Mantener por compatibilidad visual header si se usa

                    const loadedData = {
                        nombre: data.nombre || "",
                        apellido_p: data.apellido_p || "",
                        apellido_m: data.apellido_m || "",
                        descripcion: data.descripcion || "",
                        ocupacion: data.ocupacion || "",
                        edad: data.edad ? data.edad.toString() : "",
                        tiene_mascotas: data.tiene_mascotas ? "si" : "no",
                        tipo_vivienda: data.tipo_vivienda || "casa",
                        sexo: data.sexo || "otro",
                        cuida_perros: data.cuida_perros || false,
                        cuida_gatos: data.cuida_gatos || false,
                        servicio_en_casa: data.servicio_en_casa || false,
                        servicio_a_domicilio: data.servicio_a_domicilio || false,
                        foto_perfil: data.foto_perfil || "",
                        certificado_antecedentes: data.certificado_antecedentes || "",

                        aprobado: data.aprobado || false,
                        region: data.region || "RM",
                        comuna: data.comuna || "",
                        rut: data.rut || "",

                        calle: data.calle || "",
                        numero: data.numero || "",
                        latitud: data.latitud || null,
                        longitud: data.longitud || null,
                        direccion_completa: data.direccion_completa || "",

                        universidad: data.universidad || "",

                        carrera: data.carrera || "",
                        ano_curso: data.ano_curso || "",
                        telefono: data.telefono || "",
                        fecha_nacimiento: data.fecha_nacimiento || "",
                        galeria: data.galeria || [],
                        detalles_mascotas: data.detalles_mascotas || [],
                        redes_sociales: data.redes_sociales || { linkedin: "", tiktok: "", instagram: "", facebook: "" },
                        tarifa_servicio_en_casa: data.tarifa_servicio_en_casa || null,
                        tarifa_servicio_a_domicilio: data.tarifa_servicio_a_domicilio || null
                    };

                    setProfileData(loadedData);
                    setBackupProfileData(JSON.parse(JSON.stringify(loadedData)));

                    // Cargar reservas
                    fetchBookings(session.user.id);
                    // Cargar reviews
                    fetchReviews(session.user.id);
                }
            }
            setLoading(false);
        }
        loadProfile();
    }, []);

    async function fetchReviews(sitterId: string) {
        const { data, error } = await supabase
            .from("reviews")
            .select("*, cliente:cliente_id(nombre, apellido_p)") // Asumiendo relación o view
            .eq("sitter_id", sitterId)
            .order("created_at", { ascending: false });

        if (data) {
            // Si no hay relación real, mockeamos cliente
            const reviewsWithClient = data.map((r: any) => ({
                ...r,
                cliente: r.cliente || { nombre: "Cliente", apellido_p: "Anonimo" }
            }));
            setReviews(reviewsWithClient);

            if (reviewsWithClient.length > 0) {
                const avg = reviewsWithClient.reduce((acc: number, curr: Review) => acc + curr.calificacion, 0) / reviewsWithClient.length;
                setAverageRating(avg);
            }
        }
    }

    async function fetchBookings(sitterId: string) {
        // Nota: En una app real, haríamos join con la tabla de clientes (users o registro_petmate)
        // Por simplicidad, aquí asumimos que podríamos tener esos datos o solo mostramos ID.
        // Si queremos nombre del cliente, necesitamos relacionarlo.
        // Dado que 'cliente_id' es auth.users, y los perfiles están en 'registro_petmate' (vinculado por auth_user_id o email),
        // haremos una query simple por ahora.

        const { data, error } = await supabase
            .from("reservas")
            .select("*")
            .eq("sitter_id", sitterId)
            .order("created_at", { ascending: false });

        if (data) {
            // Mockeamos el nombre del cliente por ahora ya que requeriría un join complejo sin foreign keys explícitas en frontend
            // O podríamos hacer un fetch extra.
            const bookingsWithClient = data.map((b: any) => ({
                ...b,
                cliente: { nombre: "Cliente", apellido_p: "Ejemplo" } // Placeholder
            }));
            setBookings(bookingsWithClient);
        }
    }

    const displayName = profileData.nombre ? `${profileData.nombre} ${profileData.apellido_p}` : (nombre || "PetMate");

    // Función genérica para subir archivos
    const uploadFile = async (file: File, bucket: string, pathPrefix: string) => {
        try {
            if (!email) throw new Error("No user email");

            const fileExt = file.name.split('.').pop();
            const fileName = `${pathPrefix}_${Date.now()}.${fileExt}`;
            const filePath = `${email}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Obtener URL pública (para avatars)
            if (bucket === 'avatars') {
                const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
                return data.publicUrl;
            }

            // Para documentos, retornamos el path para guardarlo
            return filePath;

        } catch (error) {
            console.error(`Error uploading to ${bucket}:`, error);
            alert(`Error al subir archivo a ${bucket}. Verifica que el bucket exista.`);
            return null;
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        const file = e.target.files[0];

        const publicUrl = await uploadFile(file, 'avatars', 'profile');

        if (publicUrl) {
            setProfileData(prev => ({ ...prev, foto_perfil: publicUrl }));
            // Guardar inmediatamente la foto en DB
            if (userId) {
                await supabase.from("registro_petmate").update({ foto_perfil: publicUrl }).eq("auth_user_id", userId);
            }
        }
        setUploading(false);
    };

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        if (profileData.galeria.length >= 6) {
            alert("Máximo 6 fotos permitidas en la galería.");
            return;
        }

        setUploading(true);
        const file = e.target.files[0];

        const publicUrl = await uploadFile(file, 'avatars', 'gallery');

        if (publicUrl) {
            const newGallery = [...profileData.galeria, publicUrl];
            // Actualizar estado local inmediatamente
            setProfileData(prev => ({ ...prev, galeria: newGallery }));

            // Guardar inmediatamente en BD
            if (userId) {
                const { error } = await supabase
                    .from("registro_petmate")
                    .update({ galeria: newGallery })
                    .eq("auth_user_id", userId);

                if (error) {
                    console.error("Error saving gallery:", error);
                    alert(`Error al guardar la foto: ${error.message} - ${(error as any).details || ''}`);
                } else {
                    // Actualizar backup para evitar reversión al cancelar
                    setBackupProfileData(prev => {
                        if (!prev) return null;
                        return { ...prev, galeria: newGallery };
                    });
                }
            }
        }
        setUploading(false);
    };


    const handleDeletePhoto = async (index: number) => {
        if (!confirm("¿Eliminar esta foto?")) return;

        const newGallery = [...profileData.galeria];
        newGallery.splice(index, 1);
        setProfileData(prev => ({ ...prev, galeria: newGallery }));

        if (userId) {
            const { error } = await supabase
                .from("registro_petmate")
                .update({ galeria: newGallery })
                .eq("auth_user_id", userId);

            if (error) {
                console.error("Error updating gallery:", error);
                alert(`Error al eliminar la foto: ${error.message} - ${(error as any).details || ''}`);
            } else {
                setBackupProfileData(prev => {
                    if (!prev) return null;
                    return { ...prev, galeria: newGallery };
                });
            }
        }
    };

    const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        const file = e.target.files[0];

        // Asumiendo bucket 'documents' para certificados
        const filePath = await uploadFile(file, 'documents', 'cert_antecedentes');

        if (filePath) {
            setProfileData(prev => ({ ...prev, certificado_antecedentes: filePath }));
            // Guardar inmediatamente en DB
            if (userId) {
                await supabase.from("registro_petmate").update({ certificado_antecedentes: filePath }).eq("auth_user_id", userId);
            }
            alert("Certificado subido correctamente. Un administrador lo revisará.");
        }
        setUploading(false);
    };

    const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setProfileData({ ...profileData, rut: formatRut(val) });
    };

    const handleSelectAddress = (result: any) => {
        const address = result.address;

        // Intentar mapear campos
        const calle = address.road || address.pedestrian || address.street || "";
        const numero = address.house_number || "";
        const comuna = address.city || address.town || address.village || address.municipality || "";
        const region = address.state || "RM"; // Fallback simple

        setProfileData(prev => ({
            ...prev,
            latitud: parseFloat(result.lat),
            longitud: parseFloat(result.lon),
            direccion_completa: result.display_name,
            calle: calle,
            numero: numero,
            comuna: comuna, // Puede requerir ajuste manual si no coincide con nuestro select
            region: mapRegion(region) // Función helper simple o dejar que el usuario corrija
        }));
    };

    const mapRegion = (osRegion: string) => {
        // Mapeo básico, idealmente mejorar
        if (osRegion.includes("Metropolitana")) return "RM";
        if (osRegion.includes("Valparaíso")) return "Valparaíso";
        // ... añadir más si es necesario
        return "RM";
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        if (!userId) {
            alert("Sesión no válida o expirada.");
            setSaving(false);
            return;
        }



        // 1. Campos Obligatorios
        const requiredFields = [
            { key: 'telefono', label: 'Teléfono' },
            { key: 'region', label: 'Región' },
            { key: 'comuna', label: 'Comuna' },
            { key: 'rut', label: 'RUT' },
            { key: 'fecha_nacimiento', label: 'Fecha de Nacimiento' },
            { key: 'sexo', label: 'Sexo' },
            { key: 'ocupacion', label: 'Ocupación' },
            { key: 'tipo_vivienda', label: 'Tipo de Vivienda' },
            { key: 'tiene_mascotas', label: '¿Tienes mascotas?' },
            { key: 'descripcion', label: 'Sobre mí' },
        ] as const;

        for (const field of requiredFields) {
            // @ts-ignore
            if (!profileData[field.key] || profileData[field.key].toString().trim() === "") {
                alert(`El campo "${field.label}" es obligatorio.`);
                setSaving(false);
                return;
            }
        }

        if (profileData.ocupacion === 'Estudiante') {
            if (!profileData.universidad || !profileData.carrera || !profileData.ano_curso) {
                alert("Si eres estudiante, debes completar los datos de estudios.");
                setSaving(false);
                return;
            }
        }

        // 2. Validación de Edad
        const calculatedAge = profileData.fecha_nacimiento
            ? differenceInYears(new Date(), new Date(profileData.fecha_nacimiento))
            : 0;

        if (calculatedAge < 18) {
            setAgeAlertOpen(true);
            setSaving(false);
            return;
        }

        // 3. Largo de Descripción
        if (profileData.descripcion.length < 100) {
            alert(`La descripción "Sobre mí" debe tener al menos 100 caracteres. (Actual: ${profileData.descripcion.length})`);
            setSaving(false);
            return;
        }

        try {
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
                direccion_completa: profileData.direccion_completa
            };

            const { data, error } = await supabase
                .from("registro_petmate")
                .update(updates)
                .eq("auth_user_id", userId)
                .select();

            if (error) throw error;

            // Verificación extra: si data está vacío, es que no se actualizó nada (RLS o email incorrecto)
            if (!data || data.length === 0) {
                throw new Error("No se guardaron los cambios. Puede que tu sesión haya expirado.");
            }

            setShowToast(true);
            setBackupProfileData(JSON.parse(JSON.stringify(profileData))); // Actualizar backup
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Hubo un error al actualizar el perfil: " + (error as any).message);
        } finally {
            setSaving(false);
        }
    };

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
                                            {profileData.aprobado ? "✅ Verificado" : profileData.certificado_antecedentes ? "⏳ En Revisión" : "⚠️ No Verificado"}
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

                                    {/* Subida de certificado si no está aprobado */}
                                    {!profileData.aprobado && (
                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            <label className="block w-full py-2 px-3 border border-slate-300 border-dashed rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition-colors text-center">
                                                {uploading ? "Subiendo..." : (profileData.certificado_antecedentes ? "Actualizar Documento" : "📄 Subir Certificado Antecedentes")}
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    className="hidden"
                                                    onChange={handleCertUpload}
                                                    disabled={uploading}
                                                />
                                            </label>
                                        </div>
                                    )}

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

                                        {profileData.galeria.length > 0 ? (
                                            <div className="grid grid-cols-3 gap-2">
                                                {profileData.galeria.map((photo, index) => (
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

                            {/* BLOQUE 2: Datos del Perfil (Form Compacto) */}
                            <form onSubmit={handleSaveProfile} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                                    <h3 className="text-base font-bold text-slate-900">Perfil</h3>

                                    {!isEditing ? (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(true)}
                                            className="text-sm bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors"
                                        >
                                            Editar
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (backupProfileData) setProfileData(JSON.parse(JSON.stringify(backupProfileData)));
                                                    setIsEditing(false);
                                                }}
                                                className="text-sm text-slate-600 px-3 py-2 font-medium hover:text-slate-900"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                                            >
                                                {saving ? "Guardando..." : "Guardar"}
                                            </button>
                                        </div>
                                    )}
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
                                        <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-3 mb-4 flex items-center gap-2">
                                            <div className="bg-white p-1 rounded-md shadow-sm border border-slate-100"><Mail className="w-4 h-4 text-slate-500" /></div>
                                            Datos de Contacto
                                        </h4>
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
                                                    disabled={!isEditing}
                                                    maxLength={12}
                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"
                                                        }`}
                                                    value={profileData.telefono}
                                                    onChange={(e) => setProfileData({ ...profileData, telefono: e.target.value })}
                                                    placeholder="+569 1234 5678"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Región</label>
                                                <select
                                                    disabled={!isEditing}
                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500 appearance-none"
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
                                                    disabled={!isEditing}
                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500 appearance-none"
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
                                                        disabled={!isEditing}
                                                        className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
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
                                                        disabled={!isEditing}
                                                        className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
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
                                                        disabled={!isEditing}
                                                        className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
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
                                                        disabled={!isEditing}
                                                        className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                        value={profileData.redes_sociales?.facebook || ""}
                                                        onChange={(e) => setProfileData({ ...profileData, redes_sociales: { ...profileData.redes_sociales, facebook: e.target.value } })}
                                                        placeholder="URL Perfil"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>


                                    {/* BLOQUE 2: Información Personal */}
                                    <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                                        <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-3 mb-4 flex items-center gap-2">
                                            <div className="bg-white p-1 rounded-md shadow-sm border border-slate-100"><User className="w-4 h-4 text-slate-500" /></div>
                                            Información Personal
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                            <div className="sm:col-span-4">
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Nombres</label>
                                                <input
                                                    type="text"
                                                    disabled={!isEditing}
                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                    value={profileData.nombre}
                                                    onChange={(e) => setProfileData({ ...profileData, nombre: e.target.value })}
                                                />
                                            </div>
                                            <div className="sm:col-span-4">
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Apellido Paterno</label>
                                                <input
                                                    type="text"
                                                    disabled={!isEditing}
                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                    value={profileData.apellido_p}
                                                    onChange={(e) => setProfileData({ ...profileData, apellido_p: e.target.value })}
                                                />
                                            </div>
                                            <div className="sm:col-span-4">
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Apellido Materno</label>
                                                <input
                                                    type="text"
                                                    disabled={!isEditing}
                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                    value={profileData.apellido_m}
                                                    onChange={(e) => setProfileData({ ...profileData, apellido_m: e.target.value })}
                                                />
                                            </div>
                                            <div className="sm:col-span-6">
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">RUT {isEditing && <span className="text-slate-400 font-normal normal-case">(Ej: 12.345.678-9)</span>}</label>
                                                <input
                                                    type="text"
                                                    disabled={!isEditing}
                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"
                                                        } ${isEditing && profileData.rut && !validateRut(profileData.rut) ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}`}
                                                    value={profileData.rut}
                                                    onChange={handleRutChange}
                                                    placeholder="12.345.678-9"
                                                    maxLength={12}
                                                />
                                                {isEditing && profileData.rut && !validateRut(profileData.rut) && (
                                                    <p className="text-xs text-red-500 mt-1">RUT inválido</p>
                                                )}
                                            </div>
                                            <div className="sm:col-span-3">
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Fecha de Nacimiento</label>
                                                <div className={!isEditing ? "opacity-60 pointer-events-none" : ""}>
                                                    <DatePickerSingle
                                                        value={profileData.fecha_nacimiento ? new Date(profileData.fecha_nacimiento + "T12:00:00") : undefined}
                                                        onChange={(d) => setProfileData({ ...profileData, fecha_nacimiento: d ? format(d, "yyyy-MM-dd") : "" })}
                                                        disabled={!isEditing}
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
                                                    disabled={!isEditing}
                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500 appearance-none"
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
                                                    disabled={!isEditing}
                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500 appearance-none"
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
                                                            disabled={!isEditing}
                                                            className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"
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
                                                            disabled={!isEditing}
                                                            className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"
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
                                                            disabled={!isEditing}
                                                            className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"
                                                                }`}
                                                            value={profileData.ano_curso}
                                                            onChange={(e) => setProfileData({ ...profileData, ano_curso: e.target.value })}
                                                            placeholder="Ej: 3er Año"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                        </div>
                                    </div>

                                    {/* BLOQUE 3: Perfil */}
                                    <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                                        <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-3 mb-4 flex items-center gap-2">
                                            <div className="bg-white p-1 rounded-md shadow-sm border border-slate-100"><PawPrint className="w-4 h-4 text-slate-500" /></div>
                                            Perfil Sitter
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

                                            {/* Búsqueda de Dirección (Solo Edición) */}
                                            {isEditing && (
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
                                                    disabled={!isEditing}
                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                    value={profileData.calle || ""}
                                                    onChange={(e) => setProfileData({ ...profileData, calle: e.target.value })}
                                                />
                                            </div>
                                            <div className="sm:col-span-1">
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Número</label>
                                                <input
                                                    type="text"
                                                    disabled={!isEditing}
                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
                                                    value={profileData.numero || ""}
                                                    onChange={(e) => setProfileData({ ...profileData, numero: e.target.value })}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Vivienda</label>
                                                <select
                                                    disabled={!isEditing}
                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500 appearance-none"
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
                                                    disabled={!isEditing}
                                                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500 appearance-none"
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

                                                {profileData.detalles_mascotas.map((mascota, idx) => (
                                                    <div key={idx} className="flex gap-2 mb-2 items-center">
                                                        <select
                                                            className="text-sm rounded-lg px-2 py-1 border border-slate-300 flex-1 outline-none"
                                                            value={mascota.tipo}
                                                            onChange={(e) => {
                                                                const newDetails = [...profileData.detalles_mascotas];
                                                                newDetails[idx].tipo = e.target.value;
                                                                setProfileData({ ...profileData, detalles_mascotas: newDetails });
                                                            }}
                                                            disabled={!isEditing}
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
                                                                const newDetails = [...profileData.detalles_mascotas];
                                                                newDetails[idx].cantidad = parseInt(e.target.value) || 1;
                                                                setProfileData({ ...profileData, detalles_mascotas: newDetails });
                                                            }}
                                                            disabled={!isEditing}
                                                        />
                                                        {isEditing && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newDetails = profileData.detalles_mascotas.filter((_, i) => i !== idx);
                                                                    setProfileData({ ...profileData, detalles_mascotas: newDetails });
                                                                }}
                                                                className="text-red-500 hover:text-red-700 p-1"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}

                                                {isEditing && (
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
                                                disabled={!isEditing}
                                                className={`w-full text-sm rounded-lg px-3 py-2 outline-none resize-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"
                                                    }`}
                                                value={profileData.descripcion}
                                                onChange={(e) => setProfileData({ ...profileData, descripcion: e.target.value })}
                                                placeholder="Cuéntanos por qué eres el mejor sitter..."
                                            />
                                        </div>

                                        <div className="pt-2">
                                            <h5 className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wide">Preferencias & Servicios</h5>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                <label className={`flex items-center gap-2 p-2 rounded-lg border text-sm font-medium transition-all ${isEditing ? "bg-white border-slate-200 cursor-pointer hover:border-emerald-300" : "bg-white border-transparent opacity-75"}`}>
                                                    <input type="checkbox" disabled={!isEditing} checked={profileData.cuida_perros} onChange={(e) => setProfileData({ ...profileData, cuida_perros: e.target.checked })} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                                                    <span className="flex items-center gap-1"><Dog className="w-4 h-4 text-slate-500" /> Perros</span>
                                                </label>
                                                <label className={`flex items-center gap-2 p-2 rounded-lg border text-sm font-medium transition-all ${isEditing ? "bg-white border-slate-200 cursor-pointer hover:border-emerald-300" : "bg-white border-transparent opacity-75"}`}>
                                                    <input type="checkbox" disabled={!isEditing} checked={profileData.cuida_gatos} onChange={(e) => setProfileData({ ...profileData, cuida_gatos: e.target.checked })} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                                                    <span className="flex items-center gap-1"><Cat className="w-4 h-4 text-slate-500" /> Gatos</span>
                                                </label>
                                                <label className={`flex items-center gap-2 p-2 rounded-lg border text-sm font-medium transition-all ${isEditing ? "bg-white border-slate-200 cursor-pointer hover:border-emerald-300" : "bg-white border-transparent opacity-75"}`}>
                                                    <input type="checkbox" disabled={!isEditing} checked={profileData.servicio_a_domicilio} onChange={(e) => setProfileData({ ...profileData, servicio_a_domicilio: e.target.checked })} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                                                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-slate-500" /> A Domicilio</span>
                                                </label>
                                                <label className={`flex items-center gap-2 p-2 rounded-lg border text-sm font-medium transition-all ${isEditing ? "bg-white border-slate-200 cursor-pointer hover:border-emerald-300" : "bg-white border-transparent opacity-75"}`}>
                                                    <input type="checkbox" disabled={!isEditing} checked={profileData.servicio_en_casa} onChange={(e) => setProfileData({ ...profileData, servicio_en_casa: e.target.checked })} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
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
                                                                        disabled={!isEditing}
                                                                        className={`w-full pl-6 text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
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
                                                                        disabled={!isEditing}
                                                                        className={`w-full pl-6 text-sm rounded-lg px-3 py-2 outline-none transition-all ${isEditing ? "border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white" : "bg-white border border-slate-200 text-slate-500"}`}
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
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>


                    {/* SECCIÓN DERECHA: RESERVAS Y REVIEWS (Solo visible fuera de modo edición para "ver" como queda, o siempre visible para gestión) */}
                    {/* En este dashboard de Sitter (autoadministrable), mostramos las solicitudes y reservas reales */}

                </div>

                {/* TOAST SUCCESS */}
                <div className={`fixed bottom-5 right-5 z-50 transition-all duration-300 transform ${showToast ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"}`}>
                    <div className="bg-slate-900/90 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
                        <div className="bg-emerald-500 rounded-full w-5 h-5 flex items-center justify-center text-xs text-slate-900 font-bold">
                            ✓
                        </div>
                        <span className="font-medium text-sm">Cambios guardados correctamente</span>
                    </div>
                </div >

                {/* LIGHTBOX */}
                {selectedImage && (
                    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
                        <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
                            <Image
                                src={selectedImage}
                                alt="Galería completa"
                                fill
                                className="object-contain"
                                unoptimized
                            />
                            <button className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    </div>
                )}

            </main >
            {/* Lightbox */}
            {profileData.foto_perfil && (
                <ImageLightbox
                    src={profileData.foto_perfil}
                    alt="Foto de perfil"
                    isOpen={isLightboxOpen}
                    onClose={() => setIsLightboxOpen(false)}
                />
            )}
        </>
    );
}
