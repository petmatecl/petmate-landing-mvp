import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../contexts/UserContext';
import { getProxyImageUrl } from '../../lib/utils';
import { useProveedorStats } from '../../lib/useProveedorStats';
import RoleGuard from '../../components/Shared/RoleGuard';
import ServiceFormModal from '../../components/Proveedor/ServiceFormModal';
import VerificationGateModal from '../../components/Proveedor/VerificationGateModal';
import ConversationList from '../../components/Chat/ConversationList';
import MessageThread from '../../components/Chat/MessageThread';
import ReviewSummary from '../../components/Service/ReviewSummary';
import EvaluacionesTab from '../../components/Proveedor/EvaluacionesTab';
import CertificacionesSection from '../../components/Proveedor/CertificacionesSection';
import ServicioDetallesForm from '../../components/Proveedor/ServicioDetallesForm';
import ConfirmDialog from '../../components/Shared/ConfirmDialog';
import UserInitialsAvatar from '../../components/Shared/UserInitialsAvatar';
import dynamic from 'next/dynamic';
// LocationPicker carga Leaflet, que rompe en SSR — next/dynamic({ ssr: false })
// sigue el mismo patron de CaregiverMap en /explorar.
const LocationPicker = dynamic(() => import('../../components/Shared/LocationPicker'), {
    ssr: false,
    loading: () => (
        <div className="h-[280px] w-full rounded-xl bg-slate-100 flex items-center justify-center">
            <p className="text-slate-400 text-sm">Cargando mapa...</p>
        </div>
    ),
});
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast, Toaster } from 'sonner';
import { validateRut, formatRut } from '../../lib/rutValidation';
import { normalizeUrl, normalizeChileanPhone, normalizeInstagram, normalizeFacebook, normalizeTiktok, normalizeYoutube } from '../../lib/validators';
import { COMUNAS_CHILE } from '../../lib/comunas';
import { IDIOMAS_DISPONIBLES } from '../../lib/idiomas';
import type { PoliticaCancelacion } from '../../types';
import Link from 'next/link';
import {
    Clock, AlertTriangle, Briefcase, User as UserIcon, Shield, ShieldCheck, ShieldX,
    Star, MessageSquare, BarChart, Edit, Trash2, LayoutDashboard, Eye, Camera,
    Image as ImageIcon, Loader2, CheckCircle, XCircle, CheckCircle2, Circle, Upload, ExternalLink, X,
    Home, Sun, PawPrint, Scissors, Truck, Stethoscope, Dumbbell, MapPin,
    type LucideIcon
} from 'lucide-react';

// Map slug → componente Lucide. Misma estetica que SidebarFiltros y
// ServiceDetailView. Reemplaza el render anterior `{servicio.categoria?.icono}`
// que leakeaba el nombre del icono guardado en BD ("camera", "scissors")
// como texto literal en la badge de la card.
const SLUG_ICONS: Record<string, LucideIcon> = {
    cuidado: Home,
    guarderia: Sun,
    paseos: PawPrint,
    peluqueria: Scissors,
    traslado: Truck,
    veterinario: Stethoscope,
    adiestramiento: Dumbbell,
    fotografia: Camera,
    // Aliases backwards-compat para servicios legacy con slug viejo.
    hospedaje: Home,
    domicilio: MapPin,
};

type TabType = 'servicios' | 'perfil' | 'info_servicio' | 'evaluaciones' | 'mensajes' | 'estadisticas';

// Sub-tabs dentro de Mi Perfil. Refactor a 5 pestanas — el form sigue
// siendo uno solo con un unico saveProfile; las tabs solo dividen UI.
type PerfilTabType = 'identidad' | 'informacion' | 'credenciales' | 'galeria' | 'operacion';

const PERFIL_TABS: { id: PerfilTabType; label: string }[] = [
    { id: 'identidad', label: 'Identidad' },
    { id: 'informacion', label: 'Información' },
    { id: 'credenciales', label: 'Credenciales' },
    { id: 'galeria', label: 'Galería y presencia' },
    { id: 'operacion', label: 'Operación' },
];

const PERFIL_TAB_IDS: PerfilTabType[] = ['identidad', 'informacion', 'credenciales', 'galeria', 'operacion'];

// URL param para el sub-tab. Usamos `seccion` (no `tab`) para no chocar
// con el `?tab=` ya existente del top-level (servicios/perfil/...).
// Deep-link al sub-tab requiere `?tab=perfil&seccion=identidad`.
const PERFIL_QUERY_PARAM = 'seccion';

/** Convert a relative storage path to a full public URL */
function toServicePhotoUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
    if (!base) return null;
    const KNOWN_BUCKETS = ['avatars', 'servicios-fotos', 'documents'];
    const bucket = KNOWN_BUCKETS.find(b => path.startsWith(b + '/'));
    if (bucket) {
        return `${base}/storage/v1/object/public/${path}`;
    }
    return `${base}/storage/v1/object/public/servicios-fotos/${path}`;
}

export default function ProveedorDashboard() {
    const router = useRouter();
    const { user, isLoading: userLoading, softReset, proveedorRow, refreshProveedorRow } = useUser();
    const [proveedor, setProveedor] = useState<any>(null);
    const [statusLoading, setStatusLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<TabType>('servicios');

    // Sub-tab activo dentro de Mi Perfil. Default 'identidad' segun spec.
    const [perfilTab, setPerfilTab] = useState<PerfilTabType>('identidad');
    // Set de tabs con errores de validacion tras intentar guardar. Se
    // recalcula cada saveProfile — vacio = sin errores, no bloquea
    // navegacion entre tabs (spec).
    const [perfilTabErrors, setPerfilTabErrors] = useState<Set<PerfilTabType>>(new Set());
    // Dirty = hay cambios sin guardar. Disparada por effect que compara
    // snapshot actual del payload contra baseline post-hidratacion.
    const [perfilDirty, setPerfilDirty] = useState(false);

    // Modals
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    // ID del servicio cuya seccion de detalles esta expandida en el tab
    // "Info del Servicio" (per-servicio, Sprint 4 Fase 1). null = todas las
    // cards colapsadas. Solo una expandida a la vez.
    const [expandedInfoServicioId, setExpandedInfoServicioId] = useState<string | null>(null);

    // Tab Data
    const [servicios, setServicios] = useState<any[]>([]);
    const [evaluaciones, setEvaluaciones] = useState<any[]>([]);

    // Stats via shared hook — uses proveedor.id once loaded
    const { stats, refetch: fetchStats } = useProveedorStats(
        proveedor?.id || '',
        proveedor?.auth_user_id || ''
    );

    // Chat Data
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

    // Profile Edit State
    const [bio, setBio] = useState('');
    const [galeria, setGaleria] = useState<string[]>([]);
    const [uploadingGaleria, setUploadingGaleria] = useState(false);
    const [comuna, setComuna] = useState('');
    const [comunaOpen, setComunaOpen] = useState(false);
    // Pin de ubicacion (Sprint 3B). null/null = sin pin → ficha publica cae al
    // centroide de la comuna. Al guardar se redondea a 3 decimales (~111m) en
    // saveProfile para no exponer precision de calle.
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [whatsapp, setWhatsapp] = useState('');
    const [telefono, setTelefono] = useState('');
    const [emailPublico, setEmailPublico] = useState('');
    const [mostrarWhatsapp, setMostrarWhatsapp] = useState(true);
    const [mostrarTelefono, setMostrarTelefono] = useState(false);
    const [mostrarEmail, setMostrarEmail] = useState(false);
    const [fotoPerfil, setFotoPerfil] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    // Nuevos campos Perfil-01 (Empresa)
    const [tipoEntidad, setTipoEntidad] = useState<'persona_natural' | 'empresa'>('persona_natural');
    const [razonSocial, setRazonSocial] = useState('');
    const [rutEmpresa, setRutEmpresa] = useState('');
    const [nombreFantasia, setNombreFantasia] = useState('');
    const [giro, setGiro] = useState('');

    // Persona natural
    const [genero, setGenero] = useState('');
    const [ocupacion, setOcupacion] = useState('');
    const [nombrePublico, setNombrePublico] = useState('');

    // Nuevos campos Perfil-02 (Credenciales)
    const [aniosExperiencia, setAniosExperiencia] = useState<string>('');
    const [certificaciones, setCertificaciones] = useState('');
    const [sitioWeb, setSitioWeb] = useState('');
    const [instagram, setInstagram] = useState('');
    const [primeraAyuda, setPrimeraAyuda] = useState(false);

    // Eje B — perfil completo (columnas ya existen en BD).
    const [facebook, setFacebook] = useState('');
    const [tiktok, setTiktok] = useState('');
    const [youtube, setYoutube] = useState('');
    const [idiomas, setIdiomas] = useState<string[]>([]);
    const [politicaCancelacion, setPoliticaCancelacion] = useState<PoliticaCancelacion | ''>('');
    const [politicaCancelacionNota, setPoliticaCancelacionNota] = useState('');

    // P12 - Verificación de identidad
    const [verificacionEstado, setVerificacionEstado] = useState<'sin_enviar' | 'pendiente' | 'aprobado' | 'rechazado'>('sin_enviar');
    const [verificacionNota, setVerificacionNota] = useState<string | null>(null);
    const [rutInput, setRutInput] = useState('');
    const [rutInputError, setRutInputError] = useState('');
    const [carnetFile, setCarnetFile] = useState<File | null>(null);
    const [carnetPreview, setCarnetPreview] = useState<string | null>(null);
    const [carnetDorsoFile, setCarnetDorsoFile] = useState<File | null>(null);
    const [carnetDorsoPreview, setCarnetDorsoPreview] = useState<string | null>(null);
    const [uploadingCarnet, setUploadingCarnet] = useState(false);
    const [showVerificationGate, setShowVerificationGate] = useState(false);

    const handlePublishClick = () => {
        if (verificacionEstado !== 'aprobado') {
            setShowVerificationGate(true);
            return;
        }
        setEditingServiceId(null);
        setIsServiceModalOpen(true);
    };

    const handleGoToVerification = () => {
        setShowVerificationGate(false);
        setActiveTab('perfil');
        // Refactor de tabs: verificacion vive dentro del sub-tab Identidad.
        // Si no forzamos el sub-tab, el #verificacion-section no esta en el
        // DOM cuando intentamos scrollIntoView (renderiza solo si perfilTab
        // === 'identidad') y el scroll falla silente.
        setPerfilTab('identidad');
        router.replace(
            { query: { ...router.query, tab: 'perfil', [PERFIL_QUERY_PARAM]: 'identidad' } },
            undefined,
            { shallow: true }
        );
        setTimeout(() => {
            document.getElementById('verificacion-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    useEffect(() => {
        if (userLoading) return;
        if (!user) {
            // No user after loading = session expired, redirect to login.
            // Keep statusLoading=true so spinner persists during redirect
            // (avoids JSX render with proveedor=null between redirect call and unmount)
            router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
            return;
        }
        // Path comun: UserContext ya hidrato proveedorRow en el mismo
        // round-trip que el resto del perfil. Lo hidratamos local sin un
        // segundo fetch a `proveedores`. Si proveedorRow es null (caso raro:
        // tutor sin perfil proveedor que llega aqui por URL directa), caemos
        // al fetch legacy para preservar el manejo de error original.
        if (proveedorRow) {
            hydrateLocalFromRow(proveedorRow);
        } else {
            checkProviderStatus();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, userLoading, proveedorRow]);

    // Hidrata todo el form state local desde el row de `proveedores`. Se usa
    // desde el effect de mount (via proveedorRow del context) y desde
    // checkProviderStatus (fallback con fetch). Centralizado para que ambos
    // paths compartan la misma logica de mapeo.
    const hydrateLocalFromRow = (data: any) => {
        setProveedor(data);
        setBio(data.bio || '');
        setComuna(data.comuna || '');
        setWhatsapp(data.whatsapp || '');
        setTelefono(data.telefono || '');
        setEmailPublico(data.email_publico || '');
        setMostrarWhatsapp(data.mostrar_whatsapp ?? true);
        setMostrarTelefono(data.mostrar_telefono ?? false);
        setMostrarEmail(data.mostrar_email ?? false);
        setFotoPerfil(getProxyImageUrl(data.foto_perfil) || data.foto_perfil || '');
        setGaleria((data.galeria || []).map((url: string) => getProxyImageUrl(url) || url));

        setTipoEntidad(data.tipo_entidad || 'persona_natural');
        setRazonSocial(data.razon_social || '');
        setRutEmpresa(data.rut_empresa || '');
        setNombreFantasia(data.nombre_fantasia || '');
        setGiro(data.giro || '');

        setGenero(data.genero || '');
        setOcupacion(data.ocupacion || '');
        setNombrePublico(data.nombre_publico || '');
        setAniosExperiencia(data.anios_experiencia?.toString() || '');
        setCertificaciones(data.certificaciones || '');
        setSitioWeb(data.sitio_web || '');
        setInstagram(data.instagram || '');
        setPrimeraAyuda(data.primera_ayuda ?? false);

        setFacebook(data.facebook || '');
        setTiktok(data.tiktok || '');
        setYoutube(data.youtube || '');
        setIdiomas(Array.isArray(data.idiomas) ? data.idiomas : []);
        setPoliticaCancelacion(data.politica_cancelacion || '');
        setPoliticaCancelacionNota(data.politica_cancelacion_nota || '');

        setLat(typeof data.lat === 'number' ? data.lat : null);
        setLng(typeof data.lng === 'number' ? data.lng : null);

        setVerificacionEstado(data.verificacion_estado || 'sin_enviar');
        setVerificacionNota(data.verificacion_nota || null);
        setRutInput(data.rut ? formatRut(data.rut) : '');

        if (data.estado === 'aprobado') {
            loadTabData('servicios', data.id, data.auth_user_id);
        }
        // Reset baseline de dirty tracking. Cualquier re-hidratacion (mount
        // o post-save refresh) re-toma el snapshot post-hydrate como
        // baseline. Sin esto, la normalizacion server-side de campos (ej.
        // whatsapp '912345678' -> '+56912345678') marcaria dirty=true
        // inmediatamente despues de guardar.
        perfilBaselineRef.current = null;
        setPerfilDirty(false);
        setStatusLoading(false);
    };

    // Fallback path: si proveedorRow no esta en el context (caso raro o
    // sesion sin perfil proveedor), fetch directo + reuso de hydrateLocalFromRow.
    // hydrateLocalFromRow ya hace setStatusLoading(false), asi que aqui solo
    // garantizamos el finally para el caso de error.
    const checkProviderStatus = async () => {
        setStatusLoading(true);
        try {
            const { data, error } = await supabase
                .from('proveedores')
                .select('*')
                .eq('auth_user_id', user.id)
                .single();

            if (error) throw error;
            hydrateLocalFromRow(data);
        } catch (e) {
            console.error(e);
            setStatusLoading(false);
        }
    };

    const loadTabData = async (tab: TabType, provId: string, authId: string) => {
        if (tab === 'servicios' || tab === 'info_servicio') {
            const { data } = await supabase
                .from('servicios_publicados')
                .select(`*, categoria:categorias_servicio(nombre, icono, slug)`)
                .eq('proveedor_id', provId)
                .order('created_at', { ascending: false });
            setServicios(data || []);
        } else if (tab === 'evaluaciones') {
            const { data } = await supabase
                .from('evaluaciones')
                .select(`*, servicio:servicios_publicados(titulo)`)
                .eq('proveedor_id', provId)
                .order('created_at', { ascending: false });
            setEvaluaciones(data || []);
        } else if (tab === 'estadisticas') {
            await fetchStats();
        }
    };

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        // Sync URL so users can share/bookmark a specific tab
        router.replace({ query: { ...router.query, tab } }, undefined, { shallow: true });
        if (proveedor) {
            loadTabData(tab, proveedor.id, proveedor.auth_user_id);
        }
    };

    // URL sync — read ?tab= on mount and when query changes
    useEffect(() => {
        if (!router.isReady) return;
        const queryTab = router.query.tab as TabType | undefined;
        const validTabs: TabType[] = ['servicios', 'perfil', 'info_servicio', 'evaluaciones', 'mensajes', 'estadisticas'];
        if (queryTab && validTabs.includes(queryTab) && queryTab !== activeTab) {
            setActiveTab(queryTab);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.isReady, router.query.tab]);

    // URL sync para sub-tab de Mi Perfil — `?seccion=identidad|informacion|...`
    useEffect(() => {
        if (!router.isReady) return;
        const querySeccion = router.query[PERFIL_QUERY_PARAM] as PerfilTabType | undefined;
        if (querySeccion && PERFIL_TAB_IDS.includes(querySeccion) && querySeccion !== perfilTab) {
            setPerfilTab(querySeccion);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.isReady, router.query[PERFIL_QUERY_PARAM]]);

    const handlePerfilTabChange = (t: PerfilTabType) => {
        setPerfilTab(t);
        router.replace(
            { query: { ...router.query, [PERFIL_QUERY_PARAM]: t } },
            undefined,
            { shallow: true }
        );
    };

    // ── Dirty tracking ────────────────────────────────────────────────────
    // Baseline = snapshot del payload tras hidratacion. Cualquier desviacion
    // del snapshot actual contra el baseline => dirty.
    //
    // Solo trackeamos campos que viajan en el payload de saveProfile
    // (lineas ~454-492). Excluimos fotoPerfil (uploadAvatar persiste solo,
    // no va en el payload) y los inputs de verificacion (carnet/rut tienen
    // su propio flow handleEnviarVerificacion).
    const perfilSnapshot = useMemo(() => JSON.stringify({
        nombrePublico, bio, comuna, whatsapp, telefono, emailPublico,
        mostrarWhatsapp, mostrarTelefono, mostrarEmail,
        tipoEntidad, razonSocial, rutEmpresa, nombreFantasia, giro,
        genero, ocupacion, aniosExperiencia, certificaciones,
        sitioWeb, instagram, facebook, tiktok, youtube,
        primeraAyuda, idiomas, politicaCancelacion, politicaCancelacionNota,
        lat, lng, galeria,
    }), [
        nombrePublico, bio, comuna, whatsapp, telefono, emailPublico,
        mostrarWhatsapp, mostrarTelefono, mostrarEmail,
        tipoEntidad, razonSocial, rutEmpresa, nombreFantasia, giro,
        genero, ocupacion, aniosExperiencia, certificaciones,
        sitioWeb, instagram, facebook, tiktok, youtube,
        primeraAyuda, idiomas, politicaCancelacion, politicaCancelacionNota,
        lat, lng, galeria,
    ]);

    const perfilBaselineRef = useRef<string | null>(null);

    useEffect(() => {
        if (!proveedor) return;
        if (perfilBaselineRef.current === null) {
            // Primera evaluacion post-hidratacion: este snapshot ES el baseline.
            perfilBaselineRef.current = perfilSnapshot;
            setPerfilDirty(false);
            return;
        }
        setPerfilDirty(perfilSnapshot !== perfilBaselineRef.current);
    }, [proveedor, perfilSnapshot]);

    // Profile Handlers
    const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploadingAvatar(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/avatar.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const url = `${publicData.publicUrl}?t=${Date.now()}`;

            // Show preview immediately from local file
            setFotoPerfil(URL.createObjectURL(file));

            const { error: updateError } = await supabase.from('proveedores').update({ foto_perfil: url }).eq('auth_user_id', user.id);
            if (updateError) throw updateError;

            // Update with real URL
            setFotoPerfil(url);
            toast.success('Foto de perfil actualizada');
        } catch (err: any) {
            console.error('Avatar upload error:', err);
            toast.error(err.message || 'Error al subir imagen');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const uploadGaleriaFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !proveedor) return;
        if (galeria.length >= 8) {
            toast.error('Puedes subir máximo 8 fotos');
            return;
        }

        setUploadingGaleria(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `proveedor-galeria/${proveedor.id}/${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage.from('servicios-fotos').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('servicios-fotos').getPublicUrl(filePath);
            setGaleria(prev => [...prev, publicUrl]);
        } catch (error) {
            console.error('Error uploading photo:', error);
            toast.error('Error al subir la foto');
        } finally {
            setUploadingGaleria(false);
        }
    };

    const removeGaleriaFoto = (index: number) => {
        setGaleria(prev => prev.filter((_, i) => i !== index));
    };

    const moveGaleriaFoto = (index: number, direction: 'left' | 'right') => {
        if (direction === 'left' && index === 0) return;
        if (direction === 'right' && index === galeria.length - 1) return;

        const newGaleria = [...galeria];
        const swapIndex = direction === 'left' ? index - 1 : index + 1;
        [newGaleria[index], newGaleria[swapIndex]] = [newGaleria[swapIndex], newGaleria[index]];
        setGaleria(newGaleria);
    };

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) {
            toast.error('Tu sesión expiró. Recarga la página e intenta nuevamente.');
            return;
        }

        // Validaciones de formato. Acumulamos TODOS los errores (no
        // early-return) para que el indicador rojo de tabs pueda mostrar
        // simultaneamente todas las pestanas con campos invalidos. El
        // primer error tambien se muestra como toast.
        const tabErrors = new Set<PerfilTabType>();
        const errorMessages: string[] = [];
        const addError = (tab: PerfilTabType, msg: string) => {
            tabErrors.add(tab);
            errorMessages.push(msg);
        };

        // Identidad — rut_empresa solo si tipo empresa
        if (tipoEntidad === 'empresa' && rutEmpresa && !validateRut(rutEmpresa)) {
            addError('identidad', 'El RUT de la empresa no es válido. Verifica el dígito verificador.');
        }

        // Galeria y presencia — URLs/redes
        const sitioWebNormalizado = sitioWeb ? normalizeUrl(sitioWeb) : null;
        if (sitioWeb && !sitioWebNormalizado) {
            addError('galeria', 'El sitio web no es una URL válida. Ej: midominio.cl');
        }
        const instagramNormalizado = instagram ? normalizeInstagram(instagram) : null;
        if (instagram && !instagramNormalizado) {
            addError('galeria', 'El usuario de Instagram no es válido. Ej: @mi_cuenta');
        }
        const facebookNormalizado = facebook ? normalizeFacebook(facebook) : null;
        if (facebook && !facebookNormalizado) {
            addError('galeria', 'El Facebook no es válido. Ej: tu.pagina o facebook.com/tu.pagina');
        }
        const tiktokNormalizado = tiktok ? normalizeTiktok(tiktok) : null;
        if (tiktok && !tiktokNormalizado) {
            addError('galeria', 'El TikTok no es válido. Ej: @tucuenta');
        }
        const youtubeNormalizado = youtube ? normalizeYoutube(youtube) : null;
        if (youtube && !youtubeNormalizado) {
            addError('galeria', 'El YouTube no es válido. Ej: @tucanal o youtube.com/@tucanal');
        }

        // Operacion — telefonos, politica
        const whatsappNormalizado = whatsapp ? normalizeChileanPhone(whatsapp) : null;
        if (whatsapp && !whatsappNormalizado) {
            addError('operacion', 'El WhatsApp no es un número chileno válido. Ej: +56912345678');
        }
        const telefonoNormalizado = telefono ? normalizeChileanPhone(telefono) : null;
        if (telefono && !telefonoNormalizado) {
            addError('operacion', 'El teléfono no es un número chileno válido. Ej: +56912345678');
        }
        if (politicaCancelacionNota.trim() && !politicaCancelacion) {
            addError('operacion', 'Selecciona un tipo de política de cancelación antes de agregar una nota.');
        }

        setPerfilTabErrors(tabErrors);
        if (tabErrors.size > 0) {
            toast.error(errorMessages[0]);
            return;
        }

        setSavingProfile(true);
        try {
            const payload: Record<string, any> = {
                nombre_publico: nombrePublico.trim() || null,
                bio: bio || null,
                comuna: comuna || null,
                whatsapp: whatsappNormalizado,
                telefono: telefonoNormalizado,
                email_publico: emailPublico || null,
                mostrar_whatsapp: mostrarWhatsapp,
                mostrar_telefono: mostrarTelefono,
                mostrar_email: mostrarEmail,
                tipo_entidad: tipoEntidad,
                razon_social: tipoEntidad === 'empresa' ? (razonSocial || null) : null,
                rut_empresa: tipoEntidad === 'empresa' ? (rutEmpresa ? formatRut(rutEmpresa) : null) : null,
                nombre_fantasia: tipoEntidad === 'empresa' ? (nombreFantasia || null) : null,
                giro: tipoEntidad === 'empresa' ? (giro || null) : null,
                genero: tipoEntidad === 'persona_natural' ? (genero || null) : null,
                ocupacion: tipoEntidad === 'persona_natural' ? (ocupacion || null) : null,
                anios_experiencia: aniosExperiencia && !isNaN(Number(aniosExperiencia)) ? parseInt(aniosExperiencia) : null,
                certificaciones: certificaciones || null,
                sitio_web: sitioWebNormalizado,
                instagram: instagramNormalizado,
                facebook: facebookNormalizado,
                tiktok: tiktokNormalizado,
                youtube: youtubeNormalizado,
                idiomas: idiomas.length > 0 ? idiomas : null,
                politica_cancelacion: politicaCancelacion || null,
                politica_cancelacion_nota: politicaCancelacion && politicaCancelacionNota.trim()
                    ? politicaCancelacionNota.trim()
                    : null,
                // Redondeo a 3 decimales (~111m por grado de lat / ~93m E-W a
                // 33° lat S) — privacidad: no exponemos precision de calle.
                // La ficha publica de todas formas renderiza como Circle de
                // ~500m, asi que la precision adicional no aportaba al user
                // pero si dejaba un rastro fino en BD.
                lat: lat != null ? Math.round(lat * 1000) / 1000 : null,
                lng: lng != null ? Math.round(lng * 1000) / 1000 : null,
                primera_ayuda: primeraAyuda,
                galeria,
            };

            const { error } = await supabase
                .from('proveedores')
                .update(payload)
                .eq('auth_user_id', user.id);

            if (error) {
                console.error('Save profile error:', error);
                toast.error(`Error al guardar: ${error.message}`);
            } else {
                toast.success('Perfil actualizado correctamente');
                // Reset baseline + dirty: el snapshot actual es ahora el
                // "limpio". Sin esto, el sticky save bar se quedaria visible
                // post-save porque el effect compararia contra el baseline viejo.
                perfilBaselineRef.current = perfilSnapshot;
                setPerfilDirty(false);
                setPerfilTabErrors(new Set());
                // Refresca el cache de proveedorRow en UserContext para que si
                // el user navega fuera y vuelve, el dashboard hidrate con los
                // valores recien guardados (no con los del login original).
                await refreshProveedorRow();
            }
        } catch (err: any) {
            console.error('Save profile exception:', err);
            toast.error(`Error al guardar: ${err?.message || 'Error inesperado. Recarga la página.'}`);

        } finally {
            setSavingProfile(false);
        }
    };

    // P12 - Upload carnet handler
    const handleCarnetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCarnetFile(file);
        setCarnetPreview(URL.createObjectURL(file));
    };

    const handleCarnetDorsoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCarnetDorsoFile(file);
        setCarnetDorsoPreview(URL.createObjectURL(file));
    };

    const handleEnviarVerificacion = async () => {
        // Validate RUT
        const cleanedRut = rutInput.replace(/[^0-9kK]/g, '');
        if (!validateRut(cleanedRut)) {
            setRutInputError('RUT inválido. Verifica el dígito verificador.');
            return;
        }
        if (!carnetFile && !proveedor.foto_carnet) {
            toast.error('Debes subir la foto frontal de tu carnet de identidad.');
            return;
        }
        if (!carnetDorsoFile && !proveedor.foto_carnet_dorso) {
            toast.error('Debes subir la foto del dorso (trasera) de tu carnet de identidad.');
            return;
        }
        setRutInputError('');
        setUploadingCarnet(true);
        try {
            // Upload frontal
            let carnetUrl = proveedor.foto_carnet || null;
            if (carnetFile) {
                const ext = carnetFile.name.split('.').pop();
                const path = `carnets/${user.id}/carnet.${ext}`;
                const { error: upErr } = await supabase.storage
                    .from('documents')
                    .upload(path, carnetFile, { upsert: true });
                if (upErr) throw upErr;
                const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
                carnetUrl = urlData.publicUrl;
            }
            // Upload dorso
            let dorsoUrl = proveedor.foto_carnet_dorso || null;
            if (carnetDorsoFile) {
                const ext = carnetDorsoFile.name.split('.').pop();
                const path = `carnets/${user.id}/carnet_dorso.${ext}`;
                const { error: upErr } = await supabase.storage
                    .from('documents')
                    .upload(path, carnetDorsoFile, { upsert: true });
                if (upErr) throw upErr;
                const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
                dorsoUrl = urlData.publicUrl;
            }
            const formatted = formatRut(cleanedRut);
            const { error: saveErr } = await supabase.from('proveedores').update({
                rut: formatted,
                foto_carnet: carnetUrl,
                foto_carnet_dorso: dorsoUrl,
                verificacion_estado: 'pendiente',
                verificacion_nota: null,
            }).eq('auth_user_id', user.id);
            if (saveErr) throw saveErr;
            setVerificacionEstado('pendiente');
            setRutInput(formatted);
            toast.success('Solicitud de verificación enviada. Revisaremos en 24-48h.');
        } catch (err: any) {
            toast.error(err.message || 'Error al enviar verificación');
        } finally {
            setUploadingCarnet(false);
        }
    };

    const handleReiniciarVerificacion = async () => {
        await supabase.from('proveedores').update({
            verificacion_estado: 'sin_enviar',
            verificacion_nota: null,
        }).eq('auth_user_id', user.id);
        setVerificacionEstado('sin_enviar');
        setCarnetFile(null);
        setCarnetPreview(null);
    };

    // Services Handlers
    // ConfirmDialog para acciones destructivas (eliminar) o pausa (toggle off).
    // Eliminar = hard delete real (DELETE FROM). Limpiamos favoritos polimorficos
    // antes para evitar orphans (no hay FK directo). Otras tablas con servicio_id
    // (evaluaciones, etc.) viven server-side: si tienen FK sin CASCADE, el DELETE
    // falla y reportamos error claro en toast.
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        title: string;
        message: string;
        confirmLabel: string;
        variant: 'default' | 'danger';
        onConfirm: () => void;
    }>({ open: false, title: '', message: '', confirmLabel: '', variant: 'default', onConfirm: () => {} });
    const [actionLoading, setActionLoading] = useState(false);

    const closeConfirm = () => setConfirmDialog(d => ({ ...d, open: false }));

    const performDelete = async (id: string) => {
        setActionLoading(true);
        try {
            // 1. Cleanup favoritos polimorficos (no hay FK directo, dejarian orphans).
            await supabase
                .from('favoritos')
                .delete()
                .eq('entidad_tipo', 'servicio')
                .eq('entidad_id', id);

            // 2. Hard delete del servicio.
            const { error } = await supabase
                .from('servicios_publicados')
                .delete()
                .eq('id', id);

            if (error) {
                // FK violation u otro: surface mensaje legible.
                const msg = error.message?.toLowerCase().includes('foreign key') || error.code === '23503'
                    ? 'No se puede eliminar: este servicio tiene evaluaciones u otra informacion asociada. Desactivalo en su lugar.'
                    : `Error al eliminar: ${error.message}`;
                toast.error(msg);
                return;
            }

            setServicios(prev => prev.filter(s => s.id !== id));
            toast.success('Servicio eliminado');
            closeConfirm();
        } catch (err: any) {
            toast.error(err?.message || 'Error al eliminar el servicio.');
        } finally {
            setActionLoading(false);
        }
    };

    const applyToggleStatus = async (id: string, currentStatus: boolean) => {
        setActionLoading(true);
        try {
            const { error } = await supabase.from('servicios_publicados').update({ activo: !currentStatus }).eq('id', id);
            if (!error) {
                setServicios(prev => prev.map(s => s.id === id ? { ...s, activo: !currentStatus } : s));
                toast.success(currentStatus ? 'Servicio pausado' : 'Servicio activado');
                closeConfirm();
            } else {
                toast.error(`Error: ${error.message}`);
            }
        } finally {
            setActionLoading(false);
        }
    };

    const toggleServiceStatus = (id: string, currentStatus: boolean) => {
        // Activar de inactivo a activo: directo, sin confirmacion (es accion
        // positiva y reversible con el mismo switch). Solo confirmamos al
        // PAUSAR un servicio activo, porque deja de aparecer en /explorar.
        if (!currentStatus) {
            void applyToggleStatus(id, currentStatus);
            return;
        }
        setConfirmDialog({
            open: true,
            title: '¿Pausar este servicio?',
            message: 'Dejara de aparecer en /explorar hasta que lo reactives. Puedes volver a activarlo en cualquier momento desde este mismo switch.',
            confirmLabel: 'Pausar servicio',
            variant: 'default',
            onConfirm: () => applyToggleStatus(id, currentStatus),
        });
    };

    const deleteService = (id: string) => {
        setConfirmDialog({
            open: true,
            title: '¿Eliminar este servicio?',
            message: 'Esta acción no se puede deshacer. El servicio se eliminará de forma permanente. Si solo quieres pausarlo, usa el switch Activo.',
            confirmLabel: 'Eliminar',
            variant: 'danger',
            onConfirm: () => performDelete(id),
        });
    };


    // Safety: si la carga se cuelga > 10s, hacemos softReset() (limpia sesion
    // local + signOut sin redirect) antes de mandar a /login con redirect=...
    // Antes saltabamos directo a /login con la sesion stale cacheada, lo que
    // causaba que el login posterior con signInWithPassword timeoutee porque
    // ya habia una sesion "fantasma" en memoria.
    useEffect(() => {
        if (!userLoading && !statusLoading) return;
        const timer = setTimeout(async () => {
            if (userLoading || statusLoading) {
                await softReset();
                router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
            }
        }, 10000);
        return () => clearTimeout(timer);
    }, [userLoading, statusLoading, router, softReset]);

    if (userLoading || statusLoading || !proveedor) {
        return (
            <>
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </>
        );
    }

    if (proveedor?.estado === 'pendiente') {
        return (
            <>
                <Head><title>Cuenta en revisión | Pawnecta</title></Head>
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                    <div className="bg-white max-w-lg w-full rounded-2xl shadow-sm border border-slate-200 p-8">
                        {/* Header Centralizado */}
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Clock size={40} className="text-amber-500" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                                Tu solicitud está en revisión
                            </h1>
                            <p className="text-slate-600 leading-relaxed text-sm">
                                Revisamos cada proveedor manualmente para garantizar la confianza en la plataforma.
                            </p>
                        </div>

                        {/* Timeline de 3 pasos */}
                        <div className="mb-8 pl-4 space-y-6">
                            {/* Paso 1: Completado */}
                            <div className="relative flex items-center gap-4">
                                <div className="absolute left-[11px] top-8 w-[2px] h-6 bg-slate-200"></div>
                                <div className="bg-white z-10 text-emerald-500 rounded-full bg-emerald-50 w-6 h-6 flex items-center justify-center shrink-0">
                                    <CheckCircle2 size={24} className="fill-current text-white bg-emerald-500 rounded-full border-2 border-white" />
                                </div>
                                <span className="text-slate-900 font-medium line-through decoration-slate-300">Solicitud recibida</span>
                            </div>

                            {/* Paso 2: Activo */}
                            <div className="relative flex items-center gap-4">
                                <div className="absolute left-[11px] top-8 w-[2px] h-6 bg-slate-100"></div>
                                <div className="bg-white z-10 text-amber-500 shrink-0">
                                    <Clock size={24} className="bg-white" />
                                </div>
                                <span className="text-amber-700 font-semibold">En revisión por el equipo</span>
                            </div>

                            {/* Paso 3: Pendiente */}
                            <div className="relative flex items-center gap-4">
                                <div className="bg-white z-10 text-slate-300 shrink-0">
                                    <Circle size={24} className="bg-white" />
                                </div>
                                <span className="text-slate-400 font-medium">Perfil aprobado y activo</span>
                            </div>
                        </div>

                        {/* Mensaje de Plaza */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8 flex items-start gap-3">
                            <Clock size={20} className="text-slate-400 shrink-0 mt-0.5" />
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Te notificaremos a tu correo en un plazo de <strong>24 a 48 horas</strong> hábiles.
                            </p>
                        </div>

                        {/* Mientras esperas */}
                        <div className="border border-slate-100 rounded-xl p-5 mb-8 bg-white shadow-sm">
                            <h3 className="font-semibold text-slate-900 text-sm mb-3">Mientras esperas...</h3>
                            <ul className="space-y-3">
                                <li className="flex gap-2 items-start text-sm text-slate-600">
                                    <span className="text-slate-300 mt-0.5">•</span>
                                    <span>Prepara fotos de tu espacio o de los servicios que ofreces para subirlas apenas tu perfil esté activo.</span>
                                </li>
                                <li className="flex gap-2 items-start text-sm text-slate-600">
                                    <span className="text-slate-300 mt-0.5">•</span>
                                    <span>Revisa los consejos para proveedores en nuestra sección de ayuda o FAQs.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Acciones */}
                        <button
                            onClick={() => router.push('/')}
                            className="w-full bg-slate-100 text-slate-700 font-medium py-3 px-6 rounded-xl hover:bg-slate-200 transition-colors shadow-sm"
                        >
                            Volver al inicio
                        </button>
                    </div>
                </div>
            </>
        );
    }

    if (proveedor?.estado === 'suspendido') {
        return (
            <>
                <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 p-4">
                    <div className="bg-white max-w-lg w-full rounded-2xl shadow-sm border border-slate-200 p-8 text-center flex flex-col items-center">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-4">Tu cuenta fue suspendida</h1>
                        <p className="text-slate-600 mb-8 leading-relaxed">
                            Si crees que esto es un error o deseas apelar esta decisión, por favor contáctanos en soporte@pawnecta.com.
                        </p>
                    </div>
                </div>
            </>
        );
    }

    // MAIN DASHBOARD
    return (
        <>
            <Head><title>Mi Panel | Pawnecta</title></Head>
            <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
                {/* Desktop Sidebar */}
                <aside className="hidden lg:flex w-[260px] flex-col bg-white border-r border-slate-200 shrink-0 sticky top-0 h-screen overflow-y-auto">
                    <div className="p-6">
                        {/* Bloque identidad: reemplaza el header "MENU PRINCIPAL".
                            Avatar 40px + nombre completo + subtitulo "Proveedor". */}
                        <div className="flex items-center gap-3 mt-2 mb-4">
                            <UserInitialsAvatar
                                nombre={proveedor.nombre}
                                apellidoP={proveedor.apellido_p}
                                size="lg"
                                bgColor="bg-emerald-600"
                            />
                            <div className="flex flex-col min-w-0">
                                <span className="text-base font-semibold text-slate-900 truncate">
                                    {proveedor.nombre} {proveedor.apellido_p}
                                </span>
                                <span className="text-[13px] font-normal text-slate-500">Proveedor</span>
                            </div>
                        </div>
                        <div className="border-t border-slate-200 mb-4" />
                        <nav className="flex flex-col gap-2">
                            {[
                                { id: 'servicios', label: 'Mis Servicios', icon: <Briefcase size={20} /> },
                                { id: 'perfil', label: 'Mi Perfil', icon: <UserIcon size={20} /> },
                                { id: 'info_servicio', label: 'Info del Servicio', icon: <LayoutDashboard size={20} /> },
                                { id: 'evaluaciones', label: 'Evaluaciones', icon: <Star size={20} /> },
                                { id: 'mensajes', label: 'Mensajes', icon: <MessageSquare size={20} /> },
                                { id: 'estadisticas', label: 'Estadísticas', icon: <BarChart size={20} /> },
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => handleTabChange(item.id as TabType)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left ${activeTab === item.id ? 'bg-emerald-50 text-[#1A6B4A] font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                >
                                    {item.icon}
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Mobile Tabs (Horizontal Scroll) */}
                <div className="lg:hidden w-full bg-white border-b border-slate-200 overflow-x-auto flex px-4 pt-2 pb-0 snap-x hide-scrollbar sticky top-16 z-20">
                    {[
                        { id: 'servicios', label: 'Servicios', icon: <Briefcase size={16} /> },
                        { id: 'perfil', label: 'Perfil', icon: <UserIcon size={16} /> },
                        { id: 'info_servicio', label: 'Info Servicio', icon: <LayoutDashboard size={16} /> },
                        { id: 'evaluaciones', label: 'Evaluaciones', icon: <Star size={16} /> },
                        { id: 'mensajes', label: 'Mensajes', icon: <MessageSquare size={16} /> },
                        { id: 'estadisticas', label: 'Métricas', icon: <BarChart size={16} /> },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id as TabType)}
                            className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm whitespace-nowrap snap-start border-b-2 transition-all ${activeTab === item.id ? 'border-[#1A6B4A] text-[#1A6B4A]' : 'border-transparent text-slate-500'}`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full">

                    {/* MIS SERVICIOS */}
                    {activeTab === 'servicios' && (
                        <div className="animate-in fade-in duration-300">

                            {/* INDICADOR DE COMPLETITUD */}
                            {(() => {
                                const pasos = [
                                    { label: 'Foto de perfil', done: !!fotoPerfil, puntos: 15 },
                                    { label: 'Nombre público definido', done: !!nombrePublico, puntos: 10 },
                                    { label: 'Descripción de más de 100 caracteres', done: (bio?.length || 0) > 100, puntos: 15 },
                                    { label: 'Número de WhatsApp o teléfono', done: !!(whatsapp || telefono), puntos: 15 },
                                    { label: 'Al menos 1 servicio activo', done: servicios.some(s => s.activo), puntos: 15 },
                                    { label: 'Fotos de tu espacio (3+ fotos)', done: galeria.length >= 3, puntos: 10 },
                                    { label: 'Comuna de residencia', done: !!comuna, puntos: 10 },
                                    { label: 'Experiencia o certificación', done: !!(aniosExperiencia || certificaciones), puntos: 10 },
                                ];
                                const computedScore = pasos.filter(p => p.done).reduce((a, p) => a + p.puntos, 0);
                                const score = computedScore > 100 ? 100 : computedScore;
                                const pendientes = pasos.filter(p => !p.done);

                                if (score >= 100) {
                                    return (
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                                                    <CheckCircle size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900 text-sm">¡Perfil completo!</h3>
                                                    <p className="text-slate-600 text-sm mt-0.5">
                                                        Los clientes ven tu perfil mejor posicionado en los resultados.
                                                    </p>
                                                </div>
                                            </div>
                                            <a href={`/proveedor/${proveedor.id}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-emerald-700 font-medium text-sm bg-white border border-emerald-200 px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors inline-block text-center whitespace-nowrap w-full sm:w-auto">
                                                Ver mi perfil público
                                            </a>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold text-slate-900 text-sm">Completitud del perfil</h3>
                                            <span className="text-sm font-semibold text-emerald-600">{score}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-700 rounded-full transition-all duration-500" style={{ width: score + '%' }} />
                                        </div>
                                        <div className="mt-4 space-y-2">
                                            {pendientes.map(p => (
                                                <div key={p.label} className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Circle size={14} className="text-slate-300 shrink-0" />
                                                    {p.label}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="flex justify-between items-center mb-8">
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mis Servicios</h1>
                                <button
                                    onClick={handlePublishClick}
                                    className="bg-[#1A6B4A] hover:bg-emerald-800 text-white font-medium tracking-wide py-2.5 px-5 rounded-xl transition-colors shadow-sm flex items-center gap-2"
                                >
                                    <span>+</span><span className="hidden sm:inline">Publicar nuevo servicio</span><span className="sm:hidden">Nuevo</span>
                                </button>
                            </div>

                            {servicios.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                                    <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Briefcase size={32} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No tienes servicios publicados</h3>
                                    <p className="text-slate-500 mb-6">Ofrece hospedaje, guardería, paseos o visitas para empezar a ganar clientes.</p>
                                    <button
                                        onClick={handlePublishClick}
                                        className="bg-emerald-700 hover:bg-emerald-800 transition-colors text-white font-medium tracking-wide py-2.5 px-6 rounded-xl"
                                    >
                                        Crear mi primer servicio
                                    </button>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {servicios.map(servicio => (
                                        <div key={servicio.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row gap-5 shadow-sm hover:shadow-md transition-shadow">
                                            {/* Imagen */}
                                            <div className="w-full sm:w-40 sm:h-32 h-40 shrink-0 rounded-xl overflow-hidden bg-slate-100 relative">
                                                {servicio.fotos && servicio.fotos[0] ? (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img src={toServicePhotoUrl(servicio.fotos[0]) || ''} alt={servicio.titulo} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={32} /></div>
                                                )}
                                                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded-lg flex items-center gap-1.5 text-slate-700">
                                                    {(() => {
                                                        const CatIcon = SLUG_ICONS[servicio.categoria?.slug] ?? Briefcase;
                                                        return <CatIcon size={12} className="text-slate-500 shrink-0" />;
                                                    })()}
                                                    <span className="truncate max-w-[80px]">{servicio.categoria?.nombre}</span>
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 flex flex-col">
                                                <h3 className="text-lg font-semibold text-slate-900 mb-1">{servicio.titulo}</h3>
                                                <div className="flex items-center gap-4 text-sm text-slate-500 font-medium mb-3">
                                                    <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">${servicio.precio_desde?.toLocaleString('es-CL')} / {servicio.unidad_precio}</span>
                                                    <span className="flex items-center gap-1 text-slate-400"><Eye size={14} /> {servicio.vistas || 0} vistas</span>
                                                </div>

                                                {/* Actions */}
                                                <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 mr-auto">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={servicio.activo}
                                                            onChange={() => toggleServiceStatus(servicio.id, servicio.activo)}
                                                        />
                                                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1A6B4A] relative"></div>
                                                        <span className="text-sm font-medium text-slate-700">{servicio.activo ? 'Activo' : 'Pausado'}</span>
                                                    </label>

                                                    <Link
                                                        href={`/servicio/${servicio.id}`}
                                                        target="_blank"
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors flex items-center gap-1.5 text-sm font-semibold"
                                                    >
                                                        <ExternalLink size={16} /> <span className="hidden sm:inline">Ver</span>
                                                    </Link>
                                                    <button
                                                        onClick={() => { setEditingServiceId(servicio.id); setIsServiceModalOpen(true); }}
                                                        className="p-2 text-emerald-600 hover:text-[#1A6B4A] hover:bg-emerald-50 rounded-xl transition-colors tooltip flex items-center gap-1.5 text-sm font-semibold"
                                                    >
                                                        <Edit size={16} /> <span className="hidden sm:inline">Editar</span>
                                                    </button>
                                                    <button
                                                        onClick={() => deleteService(servicio.id)}
                                                        className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors tooltip flex items-center gap-1.5 text-sm font-semibold"
                                                    >
                                                        <Trash2 size={16} /> <span className="hidden sm:inline">Eliminar</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <ServiceFormModal
                                isOpen={isServiceModalOpen}
                                onClose={() => setIsServiceModalOpen(false)}
                                proveedorId={proveedor.id}
                                existingServiceId={editingServiceId}
                                onSuccess={() => loadTabData('servicios', proveedor.id, proveedor.auth_user_id)}
                            />
                        </div>
                    )}

                    {/* MI PERFIL — refactor a 5 sub-tabs. Sigue siendo UN solo
                        <form> con UN solo saveProfile; las tabs solo dividen UI.
                        State del form se preserva al cambiar de tab porque todos
                        los useState viven en este componente, no en hijos.
                        Sticky save bar aparece SOLO si perfilDirty. */}
                    {activeTab === 'perfil' && (
                        <div className="animate-in fade-in duration-300 max-w-3xl pb-32">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-6">Mi Perfil</h1>

                            {/* Sub-tabs nav. Scroll horizontal en mobile si no
                                entran (spec: no colapsar a dropdown). */}
                            <div className="mb-6 border-b border-slate-200 overflow-x-auto hide-scrollbar">
                                <nav className="flex gap-1 min-w-max">
                                    {PERFIL_TABS.map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => handlePerfilTabChange(t.id)}
                                            className={`relative px-4 py-3 font-semibold text-sm whitespace-nowrap border-b-2 transition-all ${perfilTab === t.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {t.label}
                                            {perfilTabErrors.has(t.id) && (
                                                <span
                                                    aria-label="Tiene errores de validación"
                                                    className="ml-1.5 inline-block w-1.5 h-1.5 bg-red-500 rounded-full align-middle"
                                                />
                                            )}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            <form id="perfil-form" onSubmit={saveProfile} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                                {/* ════════════════════════════════════════
                                    TAB: IDENTIDAD
                                    Avatar + Nombre legal/publico + Verificacion
                                    + Tipo de Cuenta (Persona Natural / Empresa)
                                    ════════════════════════════════════════ */}
                                {perfilTab === 'identidad' && (
                                    <>
                                        {/* Avatar Section */}
                                        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-6 bg-slate-50/50">
                                            <div className="relative">
                                                <div className="w-24 h-24 rounded-full bg-slate-200 overflow-hidden border-4 border-white shadow-sm flex items-center justify-center text-slate-400">
                                                    {fotoPerfil ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={fotoPerfil} alt="Avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <UserIcon size={40} />
                                                    )}
                                                </div>
                                                <label className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 cursor-pointer hover:text-[#1A6B4A] hover:border-[#1A6B4A] transition-colors">
                                                    {uploadingAvatar ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                                                    <input type="file" className="hidden" accept="image/*" onChange={uploadAvatar} disabled={uploadingAvatar} />
                                                </label>
                                            </div>
                                            <div className="text-center sm:text-left">
                                                <h3 className="font-semibold text-slate-900 text-lg flex items-center justify-center sm:justify-start gap-2">
                                                    {proveedor.nombre} {proveedor.apellido_p}
                                                    <span className="text-slate-400"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span>
                                                </h3>
                                                <p className="text-slate-500 text-sm mt-1">Proveedor desde {new Date(proveedor.created_at).getFullYear()}</p>
                                            </div>
                                        </div>

                                        <div className="p-6 sm:p-8 space-y-6">
                                            {/* Datos legales (no editables) + nombre público */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="opacity-70">
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre legal</label>
                                                    <div className="bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium flex items-center justify-between">
                                                        {proveedor.nombre} {proveedor.apellido_p} {proveedor.apellido_m}
                                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 mt-1">Datos de registro. No se muestran públicamente.</p>
                                                </div>
                                                <div>
                                                    <label htmlFor="nombre-publico" className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre público</label>
                                                    <input
                                                        id="nombre-publico"
                                                        name="nombre-publico"
                                                        autoComplete="off"
                                                        type="text"
                                                        value={nombrePublico}
                                                        onChange={e => setNombrePublico(e.target.value)}
                                                        placeholder={`${proveedor.nombre} ${proveedor.apellido_p}`}
                                                        maxLength={60}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                                    />
                                                    <p className="text-[11px] text-slate-400 mt-1">Así te verán los clientes en tu perfil y servicios.</p>
                                                </div>
                                            </div>

                                            {/* === P12: VERIFICACIÓN DE IDENTIDAD === */}
                                            <div id="verificacion-section" className="border border-slate-200 rounded-2xl overflow-hidden">
                                                <div className="flex items-center gap-3 p-5 border-b border-slate-100 bg-slate-50/50">
                                                    {verificacionEstado === 'aprobado'
                                                        ? <ShieldCheck size={22} className="text-emerald-500" />
                                                        : verificacionEstado === 'rechazado'
                                                            ? <ShieldX size={22} className="text-red-500" />
                                                            : <Shield size={22} className="text-slate-400" />
                                                    }
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-slate-900 text-sm">Verificación de Identidad</h3>
                                                <p className="text-xs text-slate-500 mt-0.5">Confirma tu identidad con tu RUT y una foto de tu carnet</p>
                                            </div>
                                            {verificacionEstado === 'aprobado' && (
                                                <span className="bg-emerald-100 text-emerald-600 text-xs font-medium uppercase tracking-widest px-3 py-1 rounded-full">Verificado</span>
                                            )}
                                            {verificacionEstado === 'pendiente' && (
                                                <span className="bg-amber-100 text-amber-700 text-xs font-medium uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                                    En revisión
                                                </span>
                                            )}
                                            {verificacionEstado === 'rechazado' && (
                                                <span className="bg-red-100 text-red-700 text-xs font-medium uppercase tracking-widest px-3 py-1 rounded-full">Rechazado</span>
                                            )}
                                        </div>

                                        <div className="p-5">
                                            {/* ESTADO: aprobado */}
                                            {verificacionEstado === 'aprobado' && (
                                                <div className="flex items-center gap-3 text-emerald-600">
                                                    <CheckCircle size={20} className="shrink-0" />
                                                    <div>
                                                        <p className="font-semibold text-sm">Identidad verificada</p>
                                                        <p className="text-xs text-emerald-600 mt-0.5">Tu RUT <span className="font-mono font-semibold">{rutInput}</span> fue validado por el equipo de Pawnecta.</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ESTADO: pendiente */}
                                            {verificacionEstado === 'pendiente' && (
                                                <div className="flex items-center gap-3 text-amber-700 bg-amber-50 rounded-xl p-4">
                                                    <Clock size={20} className="shrink-0" />
                                                    <div>
                                                        <p className="font-semibold text-sm">Solicitud enviada — en revisión</p>
                                                        <p className="text-xs text-amber-600 mt-0.5">Revisamos las solicitudes en un plazo de 24 a 48 horas hábiles.</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ESTADO: rechazado */}
                                            {verificacionEstado === 'rechazado' && (
                                                <div className="space-y-4">
                                                    <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
                                                        <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="font-semibold text-sm text-red-800">Verificación rechazada</p>
                                                            {verificacionNota && <p className="text-xs text-red-700 mt-1 leading-relaxed">{verificacionNota}</p>}
                                                        </div>
                                                    </div>
                                                    <button type="button" onClick={handleReiniciarVerificacion}
                                                        className="w-full py-2.5 border border-slate-200 rounded-xl text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors">
                                                        Volver a intentar
                                                    </button>
                                                </div>
                                            )}

                                            {/* ESTADO: sin_enviar */}
                                            {verificacionEstado === 'sin_enviar' && (
                                                <div className="space-y-4">
                                                    <div>
                                                        <label htmlFor="verif-rut" className="block text-sm font-semibold text-slate-700 mb-1.5">RUT Chileno <span className="text-red-500">*</span></label>
                                                        <input
                                                            id="verif-rut"
                                                            name="verif-rut"
                                                            autoComplete="off"
                                                            type="text"
                                                            value={rutInput}
                                                            onChange={e => {
                                                                const formatted = formatRut(e.target.value);
                                                                setRutInput(formatted);
                                                                setRutInputError('');
                                                            }}
                                                            placeholder="Ej: 12.345.678-9"
                                                            maxLength={12}
                                                            className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono ${rutInputError ? 'border-red-400 focus:border-red-400 focus:ring-red-300' : 'border-slate-200 focus:border-emerald-500'
                                                                }`}
                                                        />
                                                        {rutInputError && <p className="text-xs text-red-500 mt-1 font-medium">{rutInputError}</p>}
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                            Foto del Carnet de Identidad <span className="text-red-500">*</span>
                                                            <span className="text-slate-400 font-normal ml-1">(lado con tu foto)</span>
                                                        </label>
                                                        <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${carnetPreview ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50'
                                                            }`}>
                                                            {carnetPreview ? (
                                                                <div className="flex items-center gap-3">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img src={carnetPreview} alt="Vista previa carnet" className="h-16 w-24 object-cover rounded-lg border border-emerald-200" />
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-emerald-600">Foto lista</p>
                                                                        <p className="text-xs text-slate-500">{carnetFile?.name}</p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <Upload size={24} className="text-slate-400" />
                                                                    <p className="text-sm text-slate-500 font-medium">Arrastra o haz click para subir la foto</p>
                                                                    <p className="text-xs text-slate-400">JPG, PNG o HEIC — Máx. 5 MB</p>
                                                                </>
                                                            )}
                                                            <input type="file" className="hidden" accept="image/*" onChange={handleCarnetChange} />
                                                        </label>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                            Dorso del Carnet <span className="text-red-500">*</span>
                                                            <span className="text-slate-400 font-normal ml-1">(lado trasero)</span>
                                                        </label>
                                                        <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${carnetDorsoPreview ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50'
                                                            }`}>
                                                            {carnetDorsoPreview ? (
                                                                <div className="flex items-center gap-3">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img src={carnetDorsoPreview} alt="Vista previa dorso" className="h-16 w-24 object-cover rounded-lg border border-emerald-200" />
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-emerald-600">Foto lista</p>
                                                                        <p className="text-xs text-slate-500">{carnetDorsoFile?.name}</p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <Upload size={24} className="text-slate-400" />
                                                                    <p className="text-sm text-slate-500 font-medium">Arrastra o haz click para subir el dorso</p>
                                                                    <p className="text-xs text-slate-400">JPG, PNG o HEIC — Máx. 5 MB</p>
                                                                </>
                                                            )}
                                                            <input type="file" className="hidden" accept="image/*" onChange={handleCarnetDorsoChange} />
                                                        </label>
                                                    </div>

                                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2 text-xs text-blue-700">
                                                        <Shield size={14} className="shrink-0 mt-0.5" />
                                                        <span>Tu documento es tratado de forma confidencial y solo lo revisa el equipo de Pawnecta para validar tu identidad.</span>
                                                    </div>

                                                    <button type="button" onClick={handleEnviarVerificacion} disabled={uploadingCarnet}
                                                        className="w-full py-3 bg-[#1A6B4A] hover:bg-emerald-800 text-white font-medium tracking-wide rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60">
                                                        {uploadingCarnet ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                                                        {uploadingCarnet ? 'Enviando...' : 'Enviar para verificación'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tipo de Entidad */}
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 mt-8 mb-4">Tipo de Cuenta</h3>
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <button type="button"
                                            onClick={() => setTipoEntidad("persona_natural")}
                                            className={`p-4 rounded-xl border-2 text-left transition-colors ${tipoEntidad === "persona_natural"
                                                ? "border-emerald-500 bg-emerald-50"
                                                : "border-slate-200 hover:border-slate-300"
                                                }`}
                                        >
                                            <p className="font-semibold text-slate-900 text-sm">Persona Natural</p>
                                        </button>
                                        <button type="button"
                                            onClick={() => setTipoEntidad("empresa")}
                                            className={`p-4 rounded-xl border-2 text-left transition-colors ${tipoEntidad === "empresa"
                                                ? "border-emerald-500 bg-emerald-50"
                                                : "border-slate-200 hover:border-slate-300"
                                                }`}
                                        >
                                            <p className="font-semibold text-slate-900 text-sm">Empresa o Emprendimiento</p>
                                        </button>
                                    </div>

                                    {tipoEntidad === 'empresa' && (
                                        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6">
                                            <div>
                                                <label htmlFor="razon-social" className="block text-sm font-medium text-slate-700 mb-1">Razón social *</label>
                                                <input id="razon-social" name="razon-social" autoComplete="organization" type="text" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                            </div>
                                            <div>
                                                <label htmlFor="rut-empresa" className="block text-sm font-medium text-slate-700 mb-1">RUT de la empresa *</label>
                                                <input id="rut-empresa" name="rut-empresa" autoComplete="off" type="text" value={rutEmpresa} onChange={e => setRutEmpresa(e.target.value)} maxLength={12} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                            </div>
                                            <div>
                                                <label htmlFor="nombre-fantasia" className="block text-sm font-medium text-slate-700 mb-1">Nombre fantasía (marca)</label>
                                                <input id="nombre-fantasia" name="nombre-fantasia" autoComplete="organization" type="text" value={nombreFantasia} onChange={e => setNombreFantasia(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                            </div>
                                            <div>
                                                <label htmlFor="giro" className="block text-sm font-medium text-slate-700 mb-1">Giro o rubro</label>
                                                <input id="giro" name="giro" autoComplete="off" type="text" value={giro} onChange={e => setGiro(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                            </div>
                                        </div>
                                    )}
                                        </div>
                                    </>
                                )}

                                {/* ════════════════════════════════════════
                                    TAB: INFORMACIÓN
                                    Datos generales + bio + comuna + mapa + idiomas
                                    ════════════════════════════════════════ */}
                                {perfilTab === 'informacion' && (
                                    <div className="p-6 sm:p-8 space-y-6">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 mb-4">Información General</h3>

                                    {tipoEntidad === 'persona_natural' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label htmlFor="ocupacion" className="block text-sm font-semibold text-slate-700 mb-1.5">Ocupación o profesión</label>
                                                <input
                                                    id="ocupacion"
                                                    name="ocupacion"
                                                    autoComplete="off"
                                                    type="text"
                                                    value={ocupacion}
                                                    onChange={e => setOcupacion(e.target.value)}
                                                    placeholder="Ej: Veterinaria, Paseadora, Bióloga..."
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Género</label>
                                                <select
                                                    value={genero}
                                                    onChange={e => setGenero(e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                                >
                                                    <option value="">Prefiero no indicar</option>
                                                    <option value="mujer">Mujer</option>
                                                    <option value="hombre">Hombre</option>
                                                    <option value="no_binario">No binario</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* Editables */}
                                    <div>
                                        <label htmlFor="bio" className="block text-sm font-semibold text-slate-700 mb-1.5">Biografía / Acerca de mí</label>
                                        <textarea
                                            id="bio"
                                            name="bio"
                                            autoComplete="off"
                                            value={bio} onChange={e => setBio(e.target.value)}
                                            rows={6} maxLength={1000}
                                            placeholder="Cuéntale a los clientes sobre tu experiencia y amor por las mascotas..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                                        />
                                        <div className="text-right text-xs text-slate-400 mt-1">{bio?.length || 0}/1000</div>
                                    </div>

                                    <div className="relative">
                                        <label htmlFor="comuna" className="block text-sm font-semibold text-slate-700 mb-1.5">Comuna de Residencia <span className="text-red-500">*</span></label>
                                        <input
                                            id="comuna"
                                            name="comuna"
                                            autoComplete="off"
                                            type="text"
                                            value={comuna}
                                            onChange={e => { setComuna(e.target.value); setComunaOpen(true); }}
                                            onFocus={() => setComunaOpen(true)}
                                            onBlur={() => setTimeout(() => setComunaOpen(false), 150)}
                                            placeholder="Escribe tu comuna..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                        />
                                        {comunaOpen && comuna && (
                                            <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                {COMUNAS_CHILE.filter(c => c.toLowerCase().includes(comuna.toLowerCase())).slice(0, 8).map(c => (
                                                    <li key={c}>
                                                        <button
                                                            type="button"
                                                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                                            onMouseDown={() => { setComuna(c); setComunaOpen(false); }}
                                                        >
                                                            {c}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Ubicacion en el mapa — Sprint 3B. Pin opcional; si queda
                                        null, la ficha publica usa el centroide de la comuna como
                                        fallback. */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ubicación en el mapa</label>
                                        <p className="text-xs text-slate-500 mb-2">Opcional. Posiciona el pin donde atiendes para que aparezcas en el mapa de búsqueda con mayor precisión que solo la comuna.</p>
                                        <LocationPicker
                                            lat={lat}
                                            lng={lng}
                                            comuna={comuna}
                                            onChange={(newLat, newLng) => {
                                                setLat(newLat);
                                                setLng(newLng);
                                            }}
                                        />
                                    </div>

                                    {/* Idiomas — multi-select por chips toggle. Movido aqui en
                                        el refactor de tabs (antes vivia entre Presencia Web
                                        y Politica de cancelacion). Reusa pattern visual de
                                        comunas_cobertura. */}
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 mt-8 mb-4">Idiomas que hablo</h3>
                                    <p className="text-sm text-slate-500 mb-3">Marca los idiomas en los que puedes atender.</p>
                                    <div className="flex flex-wrap gap-2">
                                        {IDIOMAS_DISPONIBLES.map((idioma) => {
                                            const activo = idiomas.includes(idioma);
                                            return (
                                                <button
                                                    key={idioma}
                                                    type="button"
                                                    onClick={() => setIdiomas(prev => activo ? prev.filter(i => i !== idioma) : [...prev, idioma])}
                                                    className={
                                                        activo
                                                            ? 'flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-sm font-medium px-3 py-1.5 rounded-full hover:bg-emerald-200 transition-colors'
                                                            : 'flex items-center gap-1.5 bg-slate-50 text-slate-600 text-sm font-medium px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100 transition-colors'
                                                    }
                                                >
                                                    {idioma}
                                                    {activo && <X size={12} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    </div>
                                )}

                                {/* ════════════════════════════════════════
                                    TAB: CREDENCIALES
                                    Anios + Cert relevantes + Primera ayuda
                                    + Certificaciones y diplomas (upload)
                                    ════════════════════════════════════════ */}
                                {perfilTab === 'credenciales' && (
                                    <div className="p-6 sm:p-8 space-y-6">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 mb-4">Credenciales y Confianza</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="anios-experiencia" className="block text-sm font-semibold text-slate-700 mb-1.5">Años de experiencia (Gral.)</label>
                                            <input id="anios-experiencia" name="anios-experiencia" autoComplete="off" type="number" min="0" value={aniosExperiencia} onChange={e => setAniosExperiencia(e.target.value)} placeholder="Ej: 3" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                        </div>
                                        <div>
                                            <label htmlFor="certificaciones" className="block text-sm font-semibold text-slate-700 mb-1.5">Certificaciones Relevantes</label>
                                            <input id="certificaciones" name="certificaciones" autoComplete="off" type="text" value={certificaciones} onChange={e => setCertificaciones(e.target.value)} placeholder="Ej: Adiestrador CCPDT, Auxiliar Veterinario..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 border border-slate-200 rounded-xl w-fit">
                                            <input type="checkbox" checked={primeraAyuda} onChange={e => setPrimeraAyuda(e.target.checked)} className="w-5 h-5 rounded text-emerald-700 border-slate-300 focus:ring-emerald-500" />
                                            <div>
                                                <span className="text-sm font-semibold text-slate-700 block">Primeros auxilios para mascotas</span>
                                                <span className="text-xs text-slate-500 block">Tengo conocimientos en primeros auxilios veterinarios</span>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Certificaciones verificables */}
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 mt-8 mb-4">Certificaciones y diplomas</h3>
                                    <p className="text-sm text-slate-500 mb-4">Sube tus certificaciones para que Pawnecta las verifique. Los usuarios verán un badge de certificación verificada en tu perfil.</p>
                                    <CertificacionesSection proveedorId={proveedor.id} />
                                    </div>
                                )}

                                {/* ════════════════════════════════════════
                                    TAB: GALERÍA Y PRESENCIA
                                    Fotos del espacio + Sitio Web + redes sociales
                                    ════════════════════════════════════════ */}
                                {perfilTab === 'galeria' && (
                                    <div className="p-6 sm:p-8 space-y-6">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 mb-4">Fotos de tu espacio / galería</h3>
                                    <p className="text-sm text-slate-500 mb-4">Muestra tu espacio, ambiente y forma de trabajar (Máx 8 fotos).</p>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                                        {galeria.map((url, idx) => (
                                            <div key={idx} className="aspect-square bg-slate-100 rounded-xl border border-slate-200 overflow-hidden relative group">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={url} alt={`Foto espacio ${idx + 1}`} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                                    <div className="flex justify-end">
                                                        <button type="button" onClick={() => removeGaleriaFoto(idx)} className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 tooltip">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-white/90 rounded-lg p-1">
                                                        <button type="button" disabled={idx === 0} onClick={() => moveGaleriaFoto(idx, 'left')} className="p-1 disabled:opacity-30 hover:text-[#1A6B4A]">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                                        </button>
                                                        {idx === 0 && <span className="text-[10px] font-medium uppercase tracking-widest text-[#1A6B4A]">PORTADA</span>}
                                                        <button type="button" disabled={idx === galeria.length - 1} onClick={() => moveGaleriaFoto(idx, 'right')} className="p-1 disabled:opacity-30 hover:text-[#1A6B4A]">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {galeria.length < 8 && (
                                            <label className="aspect-square bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#1A6B4A] hover:bg-emerald-50 transition-colors text-slate-500 hover:text-[#1A6B4A]">
                                                {uploadingGaleria ? (
                                                    <Loader2 className="w-8 h-8 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Camera size={24} className="mb-2" />
                                                        <span className="text-sm font-semibold">Añadir foto</span>
                                                    </>
                                                )}
                                                <input type="file" accept="image/*" className="hidden" onChange={uploadGaleriaFoto} disabled={uploadingGaleria} />
                                            </label>
                                        )}
                                    </div>

                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 mt-8 mb-4">Presencia Web</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="sitio-web" className="block text-sm font-semibold text-slate-700 mb-1.5">Sitio Web</label>
                                            {/* type="text" (no "url") segun convencion CLAUDE.md: acepta www. sin https://. */}
                                            <input id="sitio-web" name="sitio-web" autoComplete="url" type="text" value={sitioWeb} onChange={e => setSitioWeb(e.target.value)} placeholder="Ej: midominio.cl o https://linktr.ee/tu-perfil" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                        </div>
                                        <div>
                                            <label htmlFor="instagram" className="block text-sm font-semibold text-slate-700 mb-1.5">Instagram</label>
                                            <input id="instagram" name="instagram" autoComplete="off" type="text" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="Ej: @tucuenta" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                        </div>
                                        <div>
                                            <label htmlFor="facebook" className="block text-sm font-semibold text-slate-700 mb-1.5">Facebook</label>
                                            <input id="facebook" name="facebook" autoComplete="off" type="text" value={facebook} onChange={e => setFacebook(e.target.value)} placeholder="Ej: tu.pagina o facebook.com/tu.pagina" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                        </div>
                                        <div>
                                            <label htmlFor="tiktok" className="block text-sm font-semibold text-slate-700 mb-1.5">TikTok</label>
                                            <input id="tiktok" name="tiktok" autoComplete="off" type="text" value={tiktok} onChange={e => setTiktok(e.target.value)} placeholder="Ej: @tucuenta" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                        </div>
                                        <div>
                                            <label htmlFor="youtube" className="block text-sm font-semibold text-slate-700 mb-1.5">YouTube</label>
                                            <input id="youtube" name="youtube" autoComplete="off" type="text" value={youtube} onChange={e => setYoutube(e.target.value)} placeholder="Ej: @tucanal o youtube.com/@tucanal" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                        </div>
                                    </div>
                                    </div>
                                )}

                                {/* ════════════════════════════════════════
                                    TAB: OPERACIÓN
                                    Politica de cancelacion + Informacion de
                                    Contacto Externo (WhatsApp / Telefono +
                                    visibilidad publica).
                                    ════════════════════════════════════════ */}
                                {perfilTab === 'operacion' && (
                                    <div className="p-6 sm:p-8 space-y-6">
                                    {/* Politica de cancelacion — select 3 niveles + nota opcional.
                                        Pawnecta no procesa pagos, asi que esto es expectativa de aviso,
                                        no clausula contractual con reembolso. */}
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 mb-4">Política de cancelación</h3>
                                    <p className="text-sm text-slate-500 mb-3">Define con cuánta anticipación necesitas que te avisen si el cliente cancela.</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="politica-cancelacion" className="block text-sm font-semibold text-slate-700 mb-1.5">Nivel</label>
                                            <select
                                                id="politica-cancelacion"
                                                name="politica-cancelacion"
                                                value={politicaCancelacion}
                                                onChange={e => setPoliticaCancelacion(e.target.value as PoliticaCancelacion | '')}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                                            >
                                                <option value="">Sin definir</option>
                                                <option value="flexible">Flexible — aviso con 24h</option>
                                                <option value="moderada">Moderada — aviso con 48h a 7 días</option>
                                                <option value="estricta">Estricta — aviso con más de 7 días</option>
                                            </select>
                                        </div>
                                    </div>
                                    {politicaCancelacion && (
                                        <div className="mt-4">
                                            <label htmlFor="politica-cancelacion-nota" className="block text-sm font-semibold text-slate-700 mb-1.5">Nota adicional (opcional)</label>
                                            <textarea
                                                id="politica-cancelacion-nota"
                                                name="politica-cancelacion-nota"
                                                value={politicaCancelacionNota}
                                                onChange={e => setPoliticaCancelacionNota(e.target.value)}
                                                maxLength={300}
                                                rows={3}
                                                placeholder="Ej: Para servicios de hospedaje pido aviso con al menos 72h. Para paseos basta con 12h."
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none"
                                            />
                                            <p className="text-xs text-slate-400 mt-1">{politicaCancelacionNota.length}/300</p>
                                        </div>
                                    )}

                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 mt-8 mb-4">Información de Contacto Externo</h3>

                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6 flex gap-3">
                                        <div className="text-blue-500 mt-0.5"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></div>
                                        <p className="text-sm text-blue-800 leading-relaxed">
                                            El chat interno de Pawnecta es seguro y siempre está disponible para tus clientes. Además, puedes configurar qué datos externos mostrar públicamente en tu perfil.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label htmlFor="whatsapp" className="block text-sm font-semibold text-slate-700 mb-1.5">WhatsApp</label>
                                                <input id="whatsapp" name="whatsapp" autoComplete="tel" type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+56912345678" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                            </div>
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" checked={mostrarWhatsapp} onChange={e => setMostrarWhatsapp(e.target.checked)} className="w-5 h-5 rounded text-emerald-700 border-slate-300 focus:ring-emerald-500" />
                                                <span className="text-sm font-semibold text-slate-700">Mostrar botón de WhatsApp público</span>
                                            </label>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label htmlFor="telefono" className="block text-sm font-semibold text-slate-700 mb-1.5">Teléfono Alternativo</label>
                                                <input id="telefono" name="telefono" autoComplete="tel" type="text" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+56912345678" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                            </div>
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" checked={mostrarTelefono} onChange={e => setMostrarTelefono(e.target.checked)} className="w-5 h-5 rounded text-emerald-700 border-slate-300 focus:ring-emerald-500" />
                                                <span className="text-sm font-semibold text-slate-700">Mostrar botón Llamar Teléfono</span>
                                            </label>
                                        </div>
                                    </div>
                                    </div>
                                )}

                            </form>

                            {/* Sticky save bar — aparece SOLO si el form esta
                                dirty. Submitea el form externo via attr `form`.
                                lg:left-[260px] respeta el sidebar fijo. */}
                            {perfilDirty && (
                                <div className="fixed bottom-0 left-0 right-0 lg:left-[260px] bg-white border-t border-slate-200 shadow-lg z-30 animate-in slide-in-from-bottom duration-200">
                                    <div className="max-w-3xl mx-auto p-4 flex items-center justify-between gap-4">
                                        <p className="text-sm font-medium text-slate-700">Tienes cambios sin guardar</p>
                                        <button
                                            type="submit"
                                            form="perfil-form"
                                            disabled={savingProfile}
                                            className="bg-[#1A6B4A] text-white font-medium tracking-wide py-3 px-6 sm:px-8 rounded-xl hover:bg-emerald-800 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {savingProfile && <Loader2 size={18} className="animate-spin" />}
                                            Guardar Cambios
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* INFO DEL SERVICIO — Sprint 4 Fase 1: per-servicio.
                        Antes este tab editaba proveedores.datos_especificos asumiendo
                        UNA categoria inferida del servicio mas reciente. Ahora lista
                        TODOS los servicios del proveedor y permite editar los detalles
                        de cada uno (servicios_publicados.detalles) — soporta proveedores
                        multi-categoria sin mezclar campos entre rubros. */}
                    {activeTab === 'info_servicio' && (() => {
                        if (!servicios || servicios.length === 0) {
                            return (
                                <div className="animate-in fade-in duration-300 max-w-3xl">
                                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-8">Información del Servicio</h1>
                                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                                        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Briefcase size={28} />
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Publica tu primer servicio</h3>
                                        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                                            Para configurar la información específica de un rubro, primero publica un servicio. La categoría que elijas determina los campos.
                                        </p>
                                        <button
                                            onClick={() => handleTabChange('servicios')}
                                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium tracking-wide py-2.5 px-6 rounded-lg transition-colors shadow-sm"
                                        >
                                            Ir a Mis Servicios
                                        </button>
                                    </div>
                                </div>
                            );
                        }

                        const updateDetallesServicio = async (servicioId: string, values: Record<string, any>) => {
                            const { error } = await supabase
                                .from('servicios_publicados')
                                .update({ detalles: values })
                                .eq('id', servicioId);
                            if (error) {
                                toast.error(`Error al guardar: ${error.message}`);
                                throw error;
                            }
                            setServicios(prev => prev.map(s => s.id === servicioId ? { ...s, detalles: values } : s));
                            toast.success('Información del servicio actualizada');
                        };

                        return (
                            <div className="animate-in fade-in duration-300 max-w-3xl">
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Información del Servicio</h1>
                                <p className="text-sm text-slate-500 mb-6">
                                    Detalles específicos por servicio. Los clientes los ven en la ficha de cada servicio. Cada servicio tiene los campos de su categoría.
                                </p>

                                <div className="space-y-3">
                                    {servicios.map(servicio => {
                                        const isExpanded = expandedInfoServicioId === servicio.id;
                                        const categoriaSlug = servicio.categoria?.slug || '';
                                        const categoriaNombre = servicio.categoria?.nombre || categoriaSlug;
                                        const detalles = (servicio.detalles as Record<string, any>) || {};
                                        return (
                                            <div key={servicio.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedInfoServicioId(isExpanded ? null : servicio.id)}
                                                    className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors text-left"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="inline-flex items-center bg-slate-100 text-slate-700 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full">
                                                                {categoriaNombre}
                                                            </span>
                                                            {!servicio.activo && (
                                                                <span className="inline-flex items-center bg-amber-50 text-amber-700 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full border border-amber-100">
                                                                    Pausado
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm font-semibold text-slate-900 truncate">{servicio.titulo}</p>
                                                    </div>
                                                    <Edit size={16} className={`shrink-0 transition-transform ${isExpanded ? 'rotate-90 text-emerald-700' : 'text-slate-400'}`} />
                                                </button>
                                                {isExpanded && (
                                                    <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-slate-100">
                                                        {categoriaSlug ? (
                                                            <ServicioDetallesForm
                                                                key={servicio.id}
                                                                categoria={categoriaSlug}
                                                                initialValues={detalles}
                                                                onSave={(values) => updateDetallesServicio(servicio.id, values)}
                                                            />
                                                        ) : (
                                                            <p className="text-sm text-slate-500 py-4">Este servicio no tiene categoría asignada. Edítalo desde la pestaña Mis Servicios para asignar una.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {/* EVALUACIONES */}
                    {activeTab === 'evaluaciones' && (
                        <EvaluacionesTab evaluaciones={evaluaciones} proveedorId={proveedor.id} />
                    )}
                    {activeTab === 'mensajes' && (
                        <div className="animate-in fade-in duration-300 h-[calc(100vh-140px)] min-h-[500px]">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex overflow-hidden">
                                <div className={`${selectedChatId ? 'hidden sm:block' : 'block'} w-full sm:w-[320px] shrink-0 border-r border-slate-200 h-full flex flex-col`}>
                                    <div className="p-4 border-b border-slate-200 bg-slate-50">
                                        <h2 className="font-semibold text-slate-900">Bandeja de Entrada</h2>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        <ConversationList
                                            userId={proveedor.auth_user_id}
                                            selectedId={selectedChatId}
                                            onSelect={setSelectedChatId}
                                        />
                                    </div>
                                </div>
                                <div className={`${!selectedChatId ? 'hidden sm:flex' : 'flex'} flex-1 flex-col bg-slate-50 h-full relative`}>
                                    {selectedChatId ? (
                                        <>
                                            <button onClick={() => setSelectedChatId(null)} className="sm:hidden absolute top-3 left-3 z-20 bg-white p-2 rounded-full shadow-md text-slate-700">← Volver</button>
                                            <MessageThread userId={proveedor.auth_user_id} conversationId={selectedChatId} />
                                        </>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                            <MessageSquare size={48} className="mb-4 text-slate-300" />
                                            <p>Selecciona una conversación para responder</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ESTADÍSTICAS */}
                    {activeTab === 'estadisticas' && (
                        <div className="animate-in fade-in duration-300">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-8">Tus Resultados en Pawnecta</h1>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* STAT 1: Vistas */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col pt-5">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3"><Eye size={20} /></div>
                                    <h3 className="text-slate-900 text-3xl mb-1">{stats.vistas}</h3>
                                    <p className="text-slate-600 text-sm font-medium mb-1">Vistas de Perfil (7 días)</p>
                                    {stats.vistasTrend && (
                                        <p className={`text-xs font-semibold ${stats.vistasTrendValue >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {stats.vistasTrend}
                                        </p>
                                    )}
                                </div>

                                {/* STAT 2: Conversaciones */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col pt-5">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3"><MessageSquare size={20} /></div>
                                    <h3 className="text-slate-900 text-3xl mb-1">{stats.consultas}</h3>
                                    <p className="text-slate-600 text-sm font-medium">Nuevos mensajes (30 días)</p>
                                </div>

                                {/* STAT 3: WhatsApp Clicks */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col pt-5">
                                    <div className="w-10 h-10 bg-[#25D366]/10 text-[#25D366] rounded-lg flex items-center justify-center mb-3">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                    </div>
                                    <h3 className="text-slate-900 text-3xl mb-1">{stats.whatsappClicks}</h3>
                                    <p className="text-slate-600 text-sm font-medium">Clics en WhatsApp (30 días)</p>
                                </div>

                                {/* STAT: Contactos totales */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col pt-5">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                    </div>
                                    <h3 className="text-slate-900 text-3xl mb-1">{stats.contactosTotal}</h3>
                                    <p className="text-slate-600 text-sm font-medium">Contactos recibidos (30 días)</p>
                                    <p className="text-xs text-slate-400 mt-1">Mensajes + WhatsApp + Llamadas</p>
                                </div>

                                {/* STAT 4: Tasa de Conversión */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col pt-5">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                                    </div>
                                    <h3 className="text-slate-900 text-3xl mb-1">{stats.conversionRate}</h3>
                                    <p className="text-slate-600 text-sm font-medium">Tasa de conversión</p>
                                    <p className="text-xs font-semibold text-slate-500 mt-1">
                                        (Contactos / Vistas)
                                    </p>
                                </div>

                                {/* STAT 5: Rating */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col pt-5">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3"><Star size={20} /></div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-slate-900 text-3xl">{stats.ratingAvg}</h3>
                                        <div className="flex text-amber-400">
                                            <Star size={20} fill="currentColor" />
                                        </div>
                                    </div>
                                    <p className="text-slate-600 text-sm font-medium">Rating promedio ({stats.evalCount} reseñas)</p>
                                </div>
                            </div>

                        </div>
                    )}

                </div>
            </div>
            <VerificationGateModal
                isOpen={showVerificationGate}
                onClose={() => setShowVerificationGate(false)}
                verificacionEstado={verificacionEstado}
                verificacionNota={verificacionNota}
                onGoToVerification={handleGoToVerification}
            />
            <ConfirmDialog
                open={confirmDialog.open}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={confirmDialog.confirmLabel}
                variant={confirmDialog.variant}
                loading={actionLoading}
                onConfirm={confirmDialog.onConfirm}
                onCancel={closeConfirm}
            />
            <Toaster position="top-center" richColors />
        </>
    );
}
