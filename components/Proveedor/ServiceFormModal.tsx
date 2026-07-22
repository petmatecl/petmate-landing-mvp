import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toast, Toaster } from 'sonner';
import { X, Upload, Loader2, Image as ImageIcon, ChevronDown, MapPin, Search } from 'lucide-react';
import { COMUNAS_CHILE, filtrarComunasPorTermino } from '../../lib/comunas';
import { CAMPOS_POR_CATEGORIA } from '../../lib/camposPorCategoria';
import { useUser } from '../../contexts/UserContext';
import { categoriaAdmiteAgendaF1, esCategoriaMultiDia, sustantivoAgendaPorCategoria } from '../../lib/categoriaTemporal';

// Fase 1 agenda con disponibilidad real — Incremento 2A.
// Constantes del editor semanal. Duracion en minutos: opciones canonicas
// que cubren el rango 5-480 (schema CHECK). ISO dia_semana 1=lunes, 7=domingo.
const DURACION_SLOT_OPCIONES = [15, 30, 45, 60, 90, 120, 180, 240] as const;
const DIAS_SEMANA: { iso: number; label: string; corto: string }[] = [
    { iso: 1, label: 'Lunes', corto: 'Lun' },
    { iso: 2, label: 'Martes', corto: 'Mar' },
    { iso: 3, label: 'Miércoles', corto: 'Mié' },
    { iso: 4, label: 'Jueves', corto: 'Jue' },
    { iso: 5, label: 'Viernes', corto: 'Vie' },
    { iso: 6, label: 'Sábado', corto: 'Sáb' },
    { iso: 7, label: 'Domingo', corto: 'Dom' },
];

// Franja semanal — id undefined para nuevas (aun no persistidas). El diff
// quirurgico al guardar compara vs snapshot inicial para decidir INSERT/
// UPDATE/DELETE por id. hora_desde/hora_hasta en formato HH:MM (input type=time).
type FranjaSemanal = {
    id?: string;
    dia_semana: number;
    hora_desde: string;
    hora_hasta: string;
};

// Excepcion de disponibilidad — bloqueo ad-hoc (vacaciones, dia libre, franja
// tapada). Sin horas = dia completo bloqueado. Con horas = franja bloqueada
// (ambas populadas o ambas null; el CHECK de BD lo protege). Motivo opcional.
type Excepcion = {
    id?: string;
    fecha: string;                  // YYYY-MM-DD (input type=date)
    hora_desde: string | null;      // HH:MM o null
    hora_hasta: string | null;      // HH:MM o null
    motivo: string | null;          // <=200 chars
};

const EXCEPCION_MOTIVO_MAX = 200;

// Mapeo de la clave castellano del JSONB legacy a ISO dia_semana. Usado por
// el import "traer mi horario actual". Los dias con tilde matchean lo que
// el editor legacy escribe.
const LEGACY_KEY_TO_ISO: Record<string, number> = {
    'Lunes': 1,
    'Martes': 2,
    'Miércoles': 3,
    'Jueves': 4,
    'Viernes': 5,
    'Sábado': 6,
    'Domingo': 7,
};

interface ServiceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    proveedorId: string;
    existingServiceId?: string | null;
    onSuccess: () => void;
}

// Set de campos por categoria viene de lib/camposPorCategoria.ts.
// Sprint 4 Fase 1: la definicion inline de este archivo (con shape `type` /
// `options: string[]` / `unit?`) fue eliminada para evitar duplicacion y
// drift de keys (ej. incluye_medicamentos vs administra_medicamentos). Ver
// comentario al tope de lib/camposPorCategoria.ts para el mapeo legacy.

// ─── Component ────────────────────────────────────────────────────────────────

export default function ServiceFormModal({ isOpen, onClose, proveedorId, existingServiceId, onSuccess }: ServiceFormModalProps) {
    // Bug C10: gate de auth — esperamos a que la sesion de Supabase este
    // lista antes de disparar fetches. Sin esto, en cold start del tab el
    // cliente JS puede estar refresheando el token cuando salen las dos
    // queries en paralelo (fetchCategorias + fetchService); el lock interno
    // las encola y la promesa de `.single()` no entrega nunca el resultado
    // al callsite — spinner indefinido. Cubre AMBOS fetches por la misma
    // razon (contencion del lock, no "primera query cold").
    const { user, isLoading: userLoading } = useUser();

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [categorias, setCategorias] = useState<any[]>([]);

    // Form fields
    const [categoriaId, setCategoriaId] = useState('');
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [precioDesde, setPrecioDesde] = useState<number | ''>('');
    const [precioHasta, setPrecioHasta] = useState<number | ''>('');
    const [unidadPrecio, setUnidadPrecio] = useState('por noche');

    // Checkboxes
    const [perros, setPerros] = useState(false);
    const [gatos, setGatos] = useState(false);
    const [otras, setOtras] = useState(false);
    const [tamanoPequeno, setTamanoPequeno] = useState(false);
    const [tamanoMediano, setTamanoMediano] = useState(false);
    const [tamanoGrande, setTamanoGrande] = useState(false);

    const [disponibilidad, setDisponibilidad] = useState('');
    const [fotos, setFotos] = useState<string[]>([]);
    const [uploadingFotos, setUploadingFotos] = useState(false);
    const [showMobilePreview, setShowMobilePreview] = useState(false);

    // Sprint 1 agendamiento (UI). Toggle por servicio. La columna en BD
    // tiene default false; este state respeta ese default para nuevos.
    const [agendamientoHabilitado, setAgendamientoHabilitado] = useState(false);

    // F1 agenda con disponibilidad real (Incremento 2A). Opt-in por servicio.
    // usaAgendaReal se mapea a `duracion_slot_min IS NOT NULL` al load/save —
    // no persiste como columna propia; es puro state UI. Los defaults matchean
    // los defaults del schema (capacidad=1, antic 24h/60d, duracion 60min como
    // arranque comun).
    const [usaAgendaReal, setUsaAgendaReal] = useState(false);
    const [duracionSlotMin, setDuracionSlotMin] = useState<number>(60);
    const [capacidadSlot, setCapacidadSlot] = useState<number>(1);
    const [anticipacionMinHoras, setAnticipacionMinHoras] = useState<number>(24);
    const [anticipacionMaxDias, setAnticipacionMaxDias] = useState<number>(60);
    const [franjasSemana, setFranjasSemana] = useState<FranjaSemanal[]>([]);
    // Snapshot inicial para el diff quirurgico al guardar. Solo las franjas
    // que traiamos de BD llevan id — las nuevas no tienen, y las eliminadas
    // desaparecen de `franjasSemana` pero siguen en el snapshot inicial.
    const [franjasSemanaInicial, setFranjasSemanaInicial] = useState<FranjaSemanal[]>([]);

    // Excepciones futuras (fecha >= hoy). Historicas NO se traen ni se tocan
    // — el diff al save solo opera sobre las que trajimos aca.
    const [excepciones, setExcepciones] = useState<Excepcion[]>([]);
    const [excepcionesInicial, setExcepcionesInicial] = useState<Excepcion[]>([]);

    // F2 agenda por rango de noches (Incremento 2A). Opt-in para categoria
    // cuidado (mundo estadias). Semantica INVERTIDA respecto a F1: al
    // activarla, todas las fechas futuras estan disponibles por default y el
    // proveedor declara bloqueos (blackouts) en vez de definir semana tipo.
    // Los blackouts multi-dia (fecha_fin NOT NULL) los edita F2-2B — F2-2A
    // solo cubre el toggle + config de los 8 campos.
    //
    // usaAgendaEstadia se mapea a `capacidad_estadia IS NOT NULL` al load/
    // save — no persiste como columna propia. Los defaults matchean los
    // defaults del schema F2-1 (capacidad 1, antic 3/180 dias, min 1 noche,
    // sin max, cancel 48h antes, sin horas de check-in/out).
    const [usaAgendaEstadia, setUsaAgendaEstadia] = useState(false);
    const [capacidadEstadia, setCapacidadEstadia] = useState<number>(1);
    const [anticipacionMinDias, setAnticipacionMinDias] = useState<number>(3);
    const [anticipacionMaxDiasEstadia, setAnticipacionMaxDiasEstadia] = useState<number>(180);
    const [minNoches, setMinNoches] = useState<number>(1);
    // maxNoches null = sin tope. Input vacio = null; numero valido 1-365.
    const [maxNoches, setMaxNoches] = useState<number | null>(null);
    const [cancelacionMinHorasAntes, setCancelacionMinHorasAntes] = useState<number>(48);
    // check_in_hora / check_out_hora en formato HH:MM (input type=time).
    // Vacio '' = null en BD → "coordinar por chat" en la UI publica.
    const [checkInHora, setCheckInHora] = useState<string>('');
    const [checkOutHora, setCheckOutHora] = useState<string>('');

    // Category-specific fields (stored as JSONB)
    const [detalles, setDetalles] = useState<Record<string, any>>({});

    // Comunas coverage
    const [comunasCobertura, setComunasCobertura] = useState<string[]>([]);
    const [comunaSearch, setComunaSearch] = useState('');
    const [comunaDropdownOpen, setComunaDropdownOpen] = useState(false);
    const comunaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Gate de auth: si la sesion todavia no esta resuelta, no salimos a
        // pegarle a Supabase. Cuando `userLoading` baje a false y `user.id`
        // exista, el effect se vuelve a disparar (estan en las deps) y
        // recien ahi corren los fetches. resetForm es local y no necesita
        // auth, pero igual lo dejamos detras del gate para que el flujo de
        // creacion no muestre estado vacio mientras todavia no hay sesion.
        if (!isOpen || userLoading || !user?.id) return;
        fetchCategorias();
        if (existingServiceId) {
            fetchService(existingServiceId);
        } else {
            resetForm();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, existingServiceId, userLoading, user?.id]);

    // Close comunas dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (comunaRef.current && !comunaRef.current.contains(e.target as Node)) {
                setComunaDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // BACKLOG (Sprint 4 Fase 1 / Commit 3): cuando este modal abre para CREAR
    // un servicio (existingServiceId == null) y el proveedor tiene
    // `proveedores.datos_especificos` no nulo (data legacy pre-deprecacion),
    // ofrecer prefill: filtrar las keys cuyo `findCampoLegacy` matche la
    // `categoria_id` seleccionada y proponerlas como valores iniciales de
    // `detalles`. La data legacy queda intacta en BD (Commit 3 no la borro).
    // El UX puede ser un banner "Tenemos datos guardados de tu registro,
    // ¿quieres usarlos?" con un boton para aplicarlos.
    const resetForm = () => {
        setCategoriaId('');
        setTitulo('');
        setDescripcion('');
        setPrecioDesde('');
        setPrecioHasta('');
        setUnidadPrecio('por noche');
        setPerros(false);
        setGatos(false);
        setOtras(false);
        setTamanoPequeno(false);
        setTamanoMediano(false);
        setTamanoGrande(false);
        setDisponibilidad('');
        setFotos([]);
        setDetalles({});
        setComunasCobertura([]);
        setComunaSearch('');
        setAgendamientoHabilitado(false);
        setUsaAgendaReal(false);
        setDuracionSlotMin(60);
        setCapacidadSlot(1);
        setAnticipacionMinHoras(24);
        setAnticipacionMaxDias(60);
        setFranjasSemana([]);
        setFranjasSemanaInicial([]);
        setExcepciones([]);
        setExcepcionesInicial([]);
        setUsaAgendaEstadia(false);
        setCapacidadEstadia(1);
        setAnticipacionMinDias(3);
        setAnticipacionMaxDiasEstadia(180);
        setMinNoches(1);
        setMaxNoches(null);
        setCancelacionMinHorasAntes(48);
        setCheckInHora('');
        setCheckOutHora('');
    };

    const fetchCategorias = useCallback(async () => {
        const { data, error } = await supabase.from('categorias_servicio').select('id, nombre, icono, slug').order('nombre');
        if (!error && data) {
            setCategorias(data);
        }
    }, []);

    // Default de categoría solo para servicios nuevos. Separado de fetchCategorias
    // para evitar race condition con fetchService al editar: si fetchCategorias
    // resolvía último, sobrescribía el categoria_id real con data[0].id (primer
    // alfabético = 'Adiestramiento'). Riesgo de corrupción si user guardaba sin
    // tocar el select.
    useEffect(() => {
        if (!existingServiceId && categorias.length > 0 && !categoriaId) {
            setCategoriaId(categorias[0].id);
        }
    }, [existingServiceId, categorias, categoriaId]);

    const fetchService = async (id: string) => {
        setFetching(true);
        try {
            // Bug C10: watchdog. Si la promesa de Supabase queda colgada
            // (contencion de auth lock, retry interno, etc.), el spinner se
            // quedaba prendido para siempre. Promise.race contra un timeout
            // de 10s — generoso por el Nano lento, pero acotado: nunca mas
            // spinner infinito. Si gana el timeout, mostramos toast,
            // cerramos el modal y el usuario reintenta.
            const TIMEOUT_MS = 10_000;
            const query = supabase.from('servicios_publicados').select('*').eq('id', id).single();
            const timeout = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('fetch-timeout')), TIMEOUT_MS);
            });
            const { data, error } = await Promise.race([query, timeout]) as Awaited<typeof query>;
            if (!error && data) {
                setCategoriaId(data.categoria_id);
                setTitulo(data.titulo || '');
                setDescripcion(data.descripcion || '');
                setPrecioDesde(data.precio_desde || '');
                setPrecioHasta(data.precio_hasta || '');
                setUnidadPrecio(data.unidad_precio || 'por noche');
                setPerros(data.acepta_perros || false);
                setGatos(data.acepta_gatos || false);
                setOtras(data.acepta_otras || false);

                const sizes = data.tamanos_aceptados || [];
                setTamanoPequeno(sizes.includes('pequeño'));
                setTamanoMediano(sizes.includes('mediano'));
                setTamanoGrande(sizes.includes('grande'));

                setDisponibilidad(data.disponibilidad || '');
                setFotos(data.fotos || []);
                setDetalles(data.detalles || {});
                setComunasCobertura(data.comunas_cobertura || []);
                setAgendamientoHabilitado(!!data.agendamiento_habilitado);

                // F1 agenda: usaAgendaReal se deriva de que duracion_slot_min
                // este poblada. Si NULL el servicio esta opt-out del sistema
                // nuevo — sigue el flujo viejo aunque las otras columnas
                // (capacidad, anticipaciones) tengan defaults.
                const hasAgenda = data.duracion_slot_min !== null && data.duracion_slot_min !== undefined;
                setUsaAgendaReal(hasAgenda);
                if (hasAgenda) {
                    setDuracionSlotMin(data.duracion_slot_min);
                }
                setCapacidadSlot(data.capacidad_slot ?? 1);
                setAnticipacionMinHoras(data.anticipacion_min_horas ?? 24);
                setAnticipacionMaxDias(data.anticipacion_max_dias ?? 60);

                // F2 agenda estadia: usaAgendaEstadia se deriva de que
                // capacidad_estadia este poblada. Si NULL, opt-out (sigue el
                // flujo actual sin picker calendario ni EXCLUDE). Las otras
                // 7 columnas se cargan con sus defaults del schema si vienen
                // NULL (registros pre-F2-1) o con el valor persistido.
                const hasEstadia = data.capacidad_estadia !== null && data.capacidad_estadia !== undefined;
                setUsaAgendaEstadia(hasEstadia);
                if (hasEstadia) {
                    setCapacidadEstadia(data.capacidad_estadia);
                }
                setAnticipacionMinDias(data.anticipacion_min_dias ?? 3);
                setAnticipacionMaxDiasEstadia(data.anticipacion_max_dias_estadia ?? 180);
                setMinNoches(data.min_noches ?? 1);
                setMaxNoches(data.max_noches ?? null);
                setCancelacionMinHorasAntes(data.cancelacion_min_horas_antes ?? 48);
                setCheckInHora(data.check_in_hora ? (data.check_in_hora as string).slice(0, 5) : '');
                setCheckOutHora(data.check_out_hora ? (data.check_out_hora as string).slice(0, 5) : '');

                // Fetch franjas semanales del servicio. Sin importar si esta
                // opt-in ahora — si toggleamos opt-in mid-sesion queremos
                // mostrar lo ultimo que habia. RLS gatea acceso a lo del
                // proveedor logueado.
                const { data: franjas, error: franjasErr } = await supabase
                    .from('disponibilidad_semanal')
                    .select('id, dia_semana, hora_desde, hora_hasta')
                    .eq('servicio_id', id)
                    .order('dia_semana', { ascending: true })
                    .order('hora_desde', { ascending: true });
                if (franjasErr) {
                    console.warn('[ServiceFormModal] fetch franjas fallo:', franjasErr);
                } else {
                    // Postgres time viene como 'HH:MM:SS'; el input type=time
                    // espera 'HH:MM'. Truncamos aca para render consistente.
                    const parsed: FranjaSemanal[] = (franjas || []).map(f => ({
                        id: f.id,
                        dia_semana: f.dia_semana,
                        hora_desde: (f.hora_desde as string).slice(0, 5),
                        hora_hasta: (f.hora_hasta as string).slice(0, 5),
                    }));
                    setFranjasSemana(parsed);
                    setFranjasSemanaInicial(parsed);
                }

                // Excepciones futuras (fecha >= hoy). Solo las futuras se
                // traen y se muestran — el editor no gestiona las historicas
                // (bloqueos ya cumplidos). El diff al save opera solo sobre
                // este subset asi que las historicas quedan intactas en BD.
                const todayIso = new Date().toISOString().slice(0, 10);
                const { data: excs, error: excsErr } = await supabase
                    .from('excepciones_disponibilidad')
                    .select('id, fecha, hora_desde, hora_hasta, motivo')
                    .eq('servicio_id', id)
                    .gte('fecha', todayIso)
                    .order('fecha', { ascending: true })
                    .order('hora_desde', { ascending: true, nullsFirst: true });
                if (excsErr) {
                    console.warn('[ServiceFormModal] fetch excepciones fallo:', excsErr);
                } else {
                    const parsedExcs: Excepcion[] = (excs || []).map(e => ({
                        id: e.id,
                        fecha: e.fecha,
                        hora_desde: e.hora_desde ? (e.hora_desde as string).slice(0, 5) : null,
                        hora_hasta: e.hora_hasta ? (e.hora_hasta as string).slice(0, 5) : null,
                        motivo: e.motivo ?? null,
                    }));
                    setExcepciones(parsedExcs);
                    setExcepcionesInicial(parsedExcs);
                }
            }
        } catch (err: any) {
            if (err?.message === 'fetch-timeout') {
                toast.error('La carga tardó demasiado, inténtalo de nuevo');
                onClose();
            } else {
                // Otros errores inesperados — no silenciar.
                console.error('[ServiceFormModal] fetchService falló:', err);
                toast.error('No pudimos cargar el servicio');
                onClose();
            }
        } finally {
            // Garantiza que el spinner siempre baje, pase lo que pase.
            setFetching(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        if (fotos.length + files.length > 8) {
            toast.error('Puedes subir un máximo de 8 fotos.');
            return;
        }

        // El bucket `servicios-fotos` tiene politica INSERT que valida
        // `(storage.foldername(name))[1] = auth.uid()::text`. El path
        // arrancaba con `proveedorId` (id de proveedores) y NO auth.uid,
        // asi que fallaba con RLS violation para toda cuenta donde ambos
        // ids difieren (que son basicamente todas — proveedores es tabla
        // aparte con id propio). Bug historico desde el commit inicial del
        // panel (332ccf3). Alineado ahora al primer folder = auth.uid.
        const { data: { session } } = await supabase.auth.getSession();
        const authUid = session?.user?.id;
        if (!authUid) {
            toast.error('Tu sesion expiró. Recarga la página e inicia sesión de nuevo.');
            return;
        }

        setUploadingFotos(true);
        const newUrls: string[] = [];

        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`La imagen ${file.name} es muy grande. Máximo 5MB`);
                continue;
            }

            const ext = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
            const filePath = `${authUid}/${fileName}`;

            const { data, error } = await supabase.storage.from('servicios-fotos').upload(filePath, file);

            if (error) {
                toast.error(`Error al subir ${file.name}`);
                console.error(error);
            } else if (data) {
                const { data: publicUrl } = supabase.storage.from('servicios-fotos').getPublicUrl(filePath);
                newUrls.push(publicUrl.publicUrl);
            }
        }

        setFotos(prev => [...prev, ...newUrls]);
        setUploadingFotos(false);
    };

    const removeFoto = (urlStr: string) => {
        setFotos(prev => prev.filter(f => f !== urlStr));
    };

    const moveFoto = (index: number, direction: "left" | "right") => {
        setFotos(prev => {
            const arr = [...prev];
            const target = direction === "left" ? index - 1 : index + 1;
            if (target < 0 || target >= arr.length) return arr;
            [arr[index], arr[target]] = [arr[target], arr[index]];
            return arr;
        });
    };

    const setDetalle = (key: string, val: any) => {
        setDetalles(prev => ({ ...prev, [key]: val }));
    };

    const toggleComuna = (comuna: string) => {
        setComunasCobertura(prev =>
            prev.includes(comuna) ? prev.filter(c => c !== comuna) : [...prev, comuna]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoriaId) return toast.error("Selecciona una categoría.");
        if (!titulo.trim()) return toast.error("El título es obligatorio.");
        if (titulo.length > 80) return toast.error("El título es muy largo (máx. 80 caracteres).");
        if (!descripcion.trim()) return toast.error("La descripción es obligatoria.");
        if (descripcion.length > 500) return toast.error("La descripción es muy larga (máx. 500 caracteres).");
        if (!precioDesde) return toast.error("El precio desde es obligatorio.");
        if (!perros && !gatos && !otras) return toast.error("Selecciona al menos un tipo de mascota aceptada.");
        if (comunasCobertura.length === 0) return toast.error("Selecciona al menos una comuna de cobertura.");
        if (fotos.length === 0) return toast.error("Agrega al menos una foto — los servicios con fotos reciben muchas más consultas.");

        // F1 agenda — validaciones (solo si opt-in). El toggle no aparece si
        // la categoria no admite F1, asi que no re-validamos categoria aca.
        if (usaAgendaReal) {
            if (!DURACION_SLOT_OPCIONES.includes(duracionSlotMin as any)) {
                return toast.error(`Selecciona una duración ${sustantivo.del} válida.`);
            }
            if (!Number.isInteger(capacidadSlot) || capacidadSlot < 1 || capacidadSlot > 20) {
                return toast.error(`La capacidad por ${sustantivo.singular} debe estar entre 1 y 20.`);
            }
            if (!Number.isInteger(anticipacionMinHoras) || anticipacionMinHoras < 0 || anticipacionMinHoras > 168) {
                return toast.error('La anticipacion minima debe estar entre 0 y 168 horas.');
            }
            if (!Number.isInteger(anticipacionMaxDias) || anticipacionMaxDias < 1 || anticipacionMaxDias > 365) {
                return toast.error('La ventana maxima debe estar entre 1 y 365 dias.');
            }
            if (franjasSemana.length === 0) {
                return toast.error('Agrega al menos una franja horaria en tu semana tipo.');
            }
            // Validaciones por franja: hasta > desde + no solape dentro del
            // mismo dia. hh:mm en string compara lexicograficamente igual que
            // como time — evita parseo a Date.
            for (const f of franjasSemana) {
                if (f.hora_hasta <= f.hora_desde) {
                    const nombre = DIAS_SEMANA.find(d => d.iso === f.dia_semana)?.label ?? '';
                    return toast.error(`${nombre}: la hora de fin debe ser posterior a la de inicio.`);
                }
            }
            // Solape: para cada dia, ordenar por hora_desde y verificar que
            // la siguiente empieza >= la actual.hora_hasta.
            for (const dia of DIAS_SEMANA) {
                const franjasDia = franjasSemana
                    .filter(f => f.dia_semana === dia.iso)
                    .sort((a, b) => a.hora_desde.localeCompare(b.hora_desde));
                for (let i = 1; i < franjasDia.length; i++) {
                    if (franjasDia[i].hora_desde < franjasDia[i - 1].hora_hasta) {
                        return toast.error(`${dia.label}: hay franjas que se solapan.`);
                    }
                }
            }

            // Validaciones de excepciones. El editor solo muestra futuras,
            // asi que la BD-side date check por "no pasado" es redundante,
            // pero cubre el caso de que el usuario edite la fecha manualmente.
            const todayIso = new Date().toISOString().slice(0, 10);
            for (const e of excepciones) {
                if (!e.fecha) {
                    return toast.error('Todas las excepciones necesitan una fecha.');
                }
                if (e.fecha < todayIso) {
                    return toast.error(`Excepción del ${e.fecha}: la fecha debe ser desde hoy.`);
                }
                const desdeOn = !!e.hora_desde;
                const hastaOn = !!e.hora_hasta;
                if (desdeOn !== hastaOn) {
                    return toast.error(`Excepción del ${e.fecha}: si indicas una hora, indica ambas (inicio y fin).`);
                }
                if (desdeOn && hastaOn && (e.hora_hasta as string) <= (e.hora_desde as string)) {
                    return toast.error(`Excepción del ${e.fecha}: la hora de fin debe ser posterior a la de inicio.`);
                }
                if (e.motivo && e.motivo.length > EXCEPCION_MOTIVO_MAX) {
                    return toast.error(`Excepción del ${e.fecha}: el motivo supera ${EXCEPCION_MOTIVO_MAX} caracteres.`);
                }
            }
            // Duplicados (fecha + hora_desde) — el UNIQUE del schema lo
            // protege, pero avisamos amable client-side. NULL en hora_desde
            // se maneja como bucket propio ('__DIA_COMPLETO__').
            const seen = new Set<string>();
            for (const e of excepciones) {
                const key = `${e.fecha}::${e.hora_desde ?? '__DIA_COMPLETO__'}`;
                if (seen.has(key)) {
                    return toast.error(`Excepción duplicada el ${e.fecha}${e.hora_desde ? ' a las ' + e.hora_desde : ''}.`);
                }
                seen.add(key);
            }
        }

        // F2 agenda estadia — validaciones (solo si opt-in). El toggle no
        // aparece si la categoria no es cuidado, asi que no re-validamos
        // categoria aca. Todos los rangos matchean los CHECK constraints
        // del schema F2-1 para evitar rebotes SQL crudos al usuario.
        if (usaAgendaEstadia) {
            if (!Number.isInteger(capacidadEstadia) || capacidadEstadia < 1 || capacidadEstadia > 20) {
                return toast.error('La capacidad de estadías simultáneas debe estar entre 1 y 20.');
            }
            if (!Number.isInteger(anticipacionMinDias) || anticipacionMinDias < 0 || anticipacionMinDias > 30) {
                return toast.error('La anticipación mínima debe estar entre 0 y 30 días.');
            }
            if (!Number.isInteger(anticipacionMaxDiasEstadia) || anticipacionMaxDiasEstadia < 1 || anticipacionMaxDiasEstadia > 730) {
                return toast.error('La ventana máxima debe estar entre 1 y 730 días.');
            }
            if (!Number.isInteger(minNoches) || minNoches < 1 || minNoches > 90) {
                return toast.error('El mínimo de noches debe estar entre 1 y 90.');
            }
            if (maxNoches !== null) {
                if (!Number.isInteger(maxNoches) || maxNoches < 1 || maxNoches > 365) {
                    return toast.error('El máximo de noches debe estar entre 1 y 365, o vacío para sin tope.');
                }
                if (maxNoches < minNoches) {
                    return toast.error('El máximo de noches no puede ser menor al mínimo.');
                }
            }
            if (!Number.isInteger(cancelacionMinHorasAntes) || cancelacionMinHorasAntes < 0 || cancelacionMinHorasAntes > 168) {
                return toast.error('La ventana de cancelación debe estar entre 0 y 168 horas.');
            }
            // check_in/out son opcionales, pero si populadas deben tener
            // formato HH:MM valido (el input type=time ya lo garantiza; esto
            // es defensa contra manipulacion via devtools).
            const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
            if (checkInHora && !timeRegex.test(checkInHora)) {
                return toast.error('La hora de check-in no es válida.');
            }
            if (checkOutHora && !timeRegex.test(checkOutHora)) {
                return toast.error('La hora de check-out no es válida.');
            }
        }

        setLoading(true);

        // Endurecimiento del save (post-smoke de Aldo — cuelgue reportado con
        // spinner eterno):
        //   1. Wrap try/catch/finally garantiza que setLoading(false) se
        //      dispare pase lo que pase (throw de Supabase por sesion expirada,
        //      TypeError inesperado, etc.). Antes cada branch de error hacia
        //      setLoading(false) manual — cualquier throw silencioso escapaba.
        //   2. Timeout watchdog de 15s (patron del bug C10 en fetchService).
        //      El save toca 3 tablas (servicios_publicados + disponibilidad_
        //      semanal + excepciones_disponibilidad) y puede colgarse por
        //      contencion del lock de auth o network hiccup. Sin cap, el
        //      spinner queda para siempre.
        //   3. Toast visible en TODO fallo (bd, timeout o excepcion) —
        //      antes el catch mudo dejaba al proveedor sin feedback.

        const sizes = [];
        if (perros) {
            if (tamanoPequeno) sizes.push('pequeño');
            if (tamanoMediano) sizes.push('mediano');
            if (tamanoGrande) sizes.push('grande');
        }

        // Persistir detalles desde la vista canonica (mergedDetalles): garantiza
        // que TODOS los campos boolean de la categoria queden en BD, incluso
        // los que el proveedor no toco (van como false). Antes solo se mandaban
        // los keys que estaban en `detalles` state, y los booleans nunca tocados
        // quedaban ausentes en jsonb — el reporte indicaba administra_medicamentos
        // missing en SQL. Para campos vacios de texto/numero los guardamos como
        // null (mas limpio en jsonb que '').
        const detallesParaGuardar: Record<string, any> = {};
        for (const campo of camposCategoria) {
            // Campos `info` son nota explicativa, no entrada — no van al payload.
            if (campo.tipo === 'info') continue;
            const v = mergedDetalles[campo.key];
            if (campo.tipo === 'boolean') {
                detallesParaGuardar[campo.key] = v === true;
            } else if (campo.tipo === 'multiselect') {
                // Array vacio se persiste como [] (no null) para que el render
                // de ficha publica pueda distinguir "no llenado todavia" (clave
                // ausente) de "explicitamente vacio" (array vacio).
                detallesParaGuardar[campo.key] = Array.isArray(v) ? v : [];
            } else if (v === '' || v === undefined || v === null) {
                detallesParaGuardar[campo.key] = null;
            } else {
                detallesParaGuardar[campo.key] = v;
            }
        }

        const payload = {
            proveedor_id: proveedorId,
            categoria_id: categoriaId,
            titulo,
            descripcion,
            precio_desde: precioDesde,
            precio_hasta: precioHasta === '' ? null : precioHasta,
            unidad_precio: unidadPrecio,
            acepta_perros: perros,
            acepta_gatos: gatos,
            acepta_otras: otras,
            tamanos_aceptados: perros ? sizes : [],
            disponibilidad,
            fotos,
            detalles: detallesParaGuardar,
            comunas_cobertura: comunasCobertura,
            agendamiento_habilitado: agendamientoHabilitado,
            // F1 agenda: duracion_slot_min NULL = opt-out. Las otras 3
            // columnas siempre se envian con valor (default o custom); son
            // inertes cuando duracion_slot_min es NULL, pero mantener el
            // valor evita reset silencioso al re-activar. Si la categoria
            // no admite F1 (guarderia/cuidado), duracion siempre NULL —
            // defensivo aunque el toggle no aparezca en UI.
            duracion_slot_min: (usaAgendaReal && categoriaAdmiteAgendaF1(selectedCatSlug)) ? duracionSlotMin : null,
            capacidad_slot: capacidadSlot,
            anticipacion_min_horas: anticipacionMinHoras,
            anticipacion_max_dias: anticipacionMaxDias,
            // F2 agenda estadia: capacidad_estadia NULL = opt-out (mismo
            // patron que duracion_slot_min). Las otras 7 columnas siempre
            // se envian para preservar defaults del proveedor al re-activar.
            // Si la categoria no admite F2 (no-cuidado), capacidad siempre
            // NULL — defensivo aunque el toggle no aparezca en UI.
            capacidad_estadia: (usaAgendaEstadia && esCategoriaMultiDia(selectedCatSlug)) ? capacidadEstadia : null,
            anticipacion_min_dias: anticipacionMinDias,
            anticipacion_max_dias_estadia: anticipacionMaxDiasEstadia,
            min_noches: minNoches,
            max_noches: maxNoches,
            cancelacion_min_horas_antes: cancelacionMinHorasAntes,
            check_in_hora: checkInHora || null,
            check_out_hora: checkOutHora || null,
        };

        // Toda la logica de guardado — envuelta en promise para poder
        // race-la contra el timeout. Retorna true si el guardado se
        // completo sin errores propios (BD ok, diff ok); false si hubo
        // un error propio ya reportado con toast (asi el catch external
        // no lo re-reporta). Los throws inesperados escapan al catch
        // external.
        const savePromise = (async (): Promise<boolean> => {
            let savedServicioId: string | null = existingServiceId ?? null;
            if (existingServiceId) {
                const { error } = await supabase.from('servicios_publicados').update(payload).eq('id', existingServiceId);
                if (error) {
                    toast.error('Error al actualizar: ' + error.message);
                    return false;
                }
            } else {
                const { data: inserted, error } = await supabase
                    .from('servicios_publicados')
                    .insert({ ...payload, activo: true })
                    .select('id')
                    .single();
                if (error) {
                    toast.error('Error al publicar: ' + error.message);
                    return false;
                }
                savedServicioId = inserted?.id ?? null;
            }

            // F1 agenda: diff quirurgico de franjas semanales. Aplicamos
            // INSERT/UPDATE/DELETE por id contra el snapshot inicial. Si
            // opt-out (usaAgendaReal=false) preservamos las franjas
            // existentes — el proveedor puede re-activar sin re-armar la
            // semana. Los servicios nuevos no tienen snapshot, asi que
            // todo cae a INSERT. Best-effort: si algo falla, avisamos pero
            // el UPDATE del servicio ya paso.
            if (savedServicioId && usaAgendaReal) {
                const idsActuales = new Set(franjasSemana.filter(f => f.id).map(f => f.id!));
                const toDelete = franjasSemanaInicial.filter(f => f.id && !idsActuales.has(f.id));
                const toInsert = franjasSemana.filter(f => !f.id);
                const toUpdate: FranjaSemanal[] = [];
                for (const f of franjasSemana) {
                    if (!f.id) continue;
                    const inicial = franjasSemanaInicial.find(i => i.id === f.id);
                    if (!inicial) continue;
                    if (
                        inicial.dia_semana !== f.dia_semana ||
                        inicial.hora_desde !== f.hora_desde ||
                        inicial.hora_hasta !== f.hora_hasta
                    ) {
                        toUpdate.push(f);
                    }
                }

                let franjasErr: string | null = null;
                if (toDelete.length > 0) {
                    const { error } = await supabase
                        .from('disponibilidad_semanal')
                        .delete()
                        .in('id', toDelete.map(f => f.id!));
                    if (error) franjasErr = error.message;
                }
                if (!franjasErr && toInsert.length > 0) {
                    const { error } = await supabase
                        .from('disponibilidad_semanal')
                        .insert(toInsert.map(f => ({
                            servicio_id: savedServicioId,
                            dia_semana: f.dia_semana,
                            hora_desde: f.hora_desde,
                            hora_hasta: f.hora_hasta,
                        })));
                    if (error) franjasErr = error.message;
                }
                if (!franjasErr) {
                    for (const f of toUpdate) {
                        const { error } = await supabase
                            .from('disponibilidad_semanal')
                            .update({
                                dia_semana: f.dia_semana,
                                hora_desde: f.hora_desde,
                                hora_hasta: f.hora_hasta,
                            })
                            .eq('id', f.id!);
                        if (error) { franjasErr = error.message; break; }
                    }
                }

                if (franjasErr) {
                    toast.error('Servicio guardado, pero hubo un problema con la agenda: ' + franjasErr);
                    return false;
                }

                // Diff quirurgico de excepciones — mismo patron que franjas.
                // Comparamos vs snapshot inicial (solo futuras). Historicas
                // quedan intactas en BD porque nunca las trajimos ni las
                // tocamos.
                const idsExcActuales = new Set(excepciones.filter(e => e.id).map(e => e.id!));
                const excToDelete = excepcionesInicial.filter(e => e.id && !idsExcActuales.has(e.id));
                const excToInsert = excepciones.filter(e => !e.id);
                const excToUpdate: Excepcion[] = [];
                for (const e of excepciones) {
                    if (!e.id) continue;
                    const inicial = excepcionesInicial.find(i => i.id === e.id);
                    if (!inicial) continue;
                    if (
                        inicial.fecha !== e.fecha ||
                        inicial.hora_desde !== e.hora_desde ||
                        inicial.hora_hasta !== e.hora_hasta ||
                        (inicial.motivo ?? null) !== (e.motivo ?? null)
                    ) {
                        excToUpdate.push(e);
                    }
                }

                let excErr: string | null = null;
                if (excToDelete.length > 0) {
                    const { error } = await supabase
                        .from('excepciones_disponibilidad')
                        .delete()
                        .in('id', excToDelete.map(e => e.id!));
                    if (error) excErr = error.message;
                }
                if (!excErr && excToInsert.length > 0) {
                    const { error } = await supabase
                        .from('excepciones_disponibilidad')
                        .insert(excToInsert.map(e => ({
                            servicio_id: savedServicioId,
                            fecha: e.fecha,
                            hora_desde: e.hora_desde,
                            hora_hasta: e.hora_hasta,
                            motivo: e.motivo && e.motivo.trim() ? e.motivo.trim() : null,
                        })));
                    if (error) excErr = error.message;
                }
                if (!excErr) {
                    for (const e of excToUpdate) {
                        const { error } = await supabase
                            .from('excepciones_disponibilidad')
                            .update({
                                fecha: e.fecha,
                                hora_desde: e.hora_desde,
                                hora_hasta: e.hora_hasta,
                                motivo: e.motivo && e.motivo.trim() ? e.motivo.trim() : null,
                            })
                            .eq('id', e.id!);
                        if (error) { excErr = error.message; break; }
                    }
                }

                if (excErr) {
                    toast.error('Servicio guardado, pero hubo un problema con las excepciones: ' + excErr);
                    return false;
                }
            }

            return true;
        })();

        const SAVE_TIMEOUT_MS = 15_000;
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('save-timeout')), SAVE_TIMEOUT_MS);
        });

        try {
            const ok = await Promise.race([savePromise, timeoutPromise]);
            if (ok) {
                toast.success(existingServiceId ? 'Servicio actualizado correctamente' : 'Servicio publicado correctamente');
                onSuccess();
                onClose();
            }
        } catch (err: any) {
            if (err?.message === 'save-timeout') {
                toast.error('El guardado tardó demasiado (15s). Verifica tu conexión y vuelve a intentar.');
            } else {
                console.error('[ServiceFormModal] save error inesperado:', err);
                toast.error('Ocurrió un error inesperado al guardar. Intenta nuevamente.');
            }
        } finally {
            // Garantiza que el spinner siempre baje. Ante ok=true, ok=false y
            // ante cualquier throw (BD, timeout, TypeError, sesion expirada).
            setLoading(false);
        }
    };

    // Derivaciones que alimentan hooks o handleSubmit (closure). Suben arriba
    // del early return para respetar Rules of Hooks: useMemo abajo dispararia
    // "Rendered fewer hooks than expected" cuando isOpen pasa de true a false.
    const selectedCat = categorias.find(c => c.id === categoriaId);
    const selectedCatSlug = selectedCat?.slug || '';
    const camposCategoria = CAMPOS_POR_CATEGORIA[selectedCatSlug] || [];

    // mergedDetalles: vista canonica de detalles que combina defaults por tipo
    // de campo + lo cargado del state. El loaded SIEMPRE gana sobre el default
    // (Object.assign al final). Resuelve el bug de hidratacion de booleans
    // (reportado en Sprint 17): si por una race condition detalles llega vacio
    // o parcialmente al primer render con camposCategoria poblado, el merge
    // garantiza que el checkbox reflejara true cuando el state se hidrate.
    // Tambien garantiza que TODOS los campos boolean (incluso los no tocados)
    // queden en el payload al guardar, no solo los que el usuario toco.
    //
    // Debe estar ANTES del early return `if (!isOpen)` para cumplir Rules of
    // Hooks (mismo orden de hooks en todos los renders, abierto o cerrado).
    const mergedDetalles = useMemo(() => {
        const merged: Record<string, any> = {};
        for (const campo of camposCategoria) {
            // Default por tipo: booleans = false (no marcado), resto = '' (vacio).
            // Number guarda como '' tambien — el input lo parsea a Number al cambiar.
            if (campo.tipo === 'info') continue;
            merged[campo.key] = campo.tipo === 'boolean'
                ? false
                : campo.tipo === 'multiselect'
                    ? []
                    : '';
        }
        // Loaded values win. Object.assign en lugar de spread para que claves
        // con valor `false` (boolean valido) tambien se copien — spread tambien
        // las copia, pero Object.assign hace mas explicito el intento.
        Object.assign(merged, detalles || {});
        return merged;
    }, [camposCategoria, detalles]);

    // F1 agenda: handlers para el editor de semana tipo. Todos operan sobre
    // el state franjasSemana; el diff quirurgico al save compara vs snapshot
    // inicial para decidir INSERT/UPDATE/DELETE. Franjas nuevas nacen sin id.
    const addFranja = (diaIso: number) => {
        // Default sensato: si el dia ya tiene franjas, la nueva empieza en
        // la hora_hasta de la ultima (continuar), sino 09:00-13:00.
        const delDia = franjasSemana.filter(f => f.dia_semana === diaIso);
        const ultima = delDia.length > 0 ? delDia.sort((a, b) => a.hora_desde.localeCompare(b.hora_desde))[delDia.length - 1] : null;
        const desde = ultima ? ultima.hora_hasta : '09:00';
        // Sumar 4h como default. Si "hora + 4" pasa de 23:59, capamos a 23:59.
        const [h, m] = desde.split(':').map(n => parseInt(n, 10));
        const finMin = Math.min(23 * 60 + 59, h * 60 + m + 240);
        const hasta = `${String(Math.floor(finMin / 60)).padStart(2, '0')}:${String(finMin % 60).padStart(2, '0')}`;
        setFranjasSemana(prev => [...prev, { dia_semana: diaIso, hora_desde: desde, hora_hasta: hasta }]);
    };

    const removeFranja = (index: number) => {
        setFranjasSemana(prev => prev.filter((_, i) => i !== index));
    };

    const updateFranja = (index: number, field: 'hora_desde' | 'hora_hasta', value: string) => {
        setFranjasSemana(prev => prev.map((f, i) => i === index ? { ...f, [field]: value } : f));
    };

    // Excepciones: la nueva fila arranca con fecha = mañana (evita quedar en
    // el pasado si el user demora tocandola) y modo dia-completo (mas comun
    // que "franja tapada"). El toggle "dia completo / franja horaria" es un
    // radio pair que trae hora_desde/hora_hasta a null o a defaults.
    const addExcepcion = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const fecha = tomorrow.toISOString().slice(0, 10);
        setExcepciones(prev => [...prev, { fecha, hora_desde: null, hora_hasta: null, motivo: null }]);
    };

    const removeExcepcion = (index: number) => {
        setExcepciones(prev => prev.filter((_, i) => i !== index));
    };

    const updateExcepcion = <K extends keyof Excepcion>(index: number, field: K, value: Excepcion[K]) => {
        setExcepciones(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
    };

    const toggleExcepcionModo = (index: number, esDiaCompleto: boolean) => {
        // Dia completo → ambas null. Franja → defaults 09:00-13:00. Cambio
        // entre modos preserva el resto de la fila (fecha, motivo).
        setExcepciones(prev => prev.map((e, i) => {
            if (i !== index) return e;
            return esDiaCompleto
                ? { ...e, hora_desde: null, hora_hasta: null }
                : { ...e, hora_desde: e.hora_desde ?? '09:00', hora_hasta: e.hora_hasta ?? '13:00' };
        }));
    };

    // Import del horario legacy: parsea el JSONB text del campo `disponibilidad`
    // y mapea cada dia activo → 1 franja en la semana tipo. Ejecucion EXPLICITA
    // (botón). Si ya hay franjas cargadas, confirma antes de sobrescribir —
    // sino silencioso reemplaza. Franjas legacy nacen sin id → INSERT al save.
    const importarHorarioLegacy = () => {
        let parsed: Record<string, any> = {};
        try {
            const raw = JSON.parse(disponibilidad || '{}');
            if (raw && typeof raw === 'object' && !Array.isArray(raw)) parsed = raw;
        } catch {
            toast.error('No hay horario legacy válido para importar.');
            return;
        }

        const nuevasFranjas: FranjaSemanal[] = [];
        for (const [key, val] of Object.entries(parsed)) {
            const iso = LEGACY_KEY_TO_ISO[key];
            if (!iso) continue;
            if (!val || typeof val !== 'object') continue;
            if (val.activo !== true) continue;
            const desde = typeof val.desde === 'string' ? val.desde.slice(0, 5) : null;
            const hasta = typeof val.hasta === 'string' ? val.hasta.slice(0, 5) : null;
            if (!desde || !hasta || hasta <= desde) continue;
            nuevasFranjas.push({ dia_semana: iso, hora_desde: desde, hora_hasta: hasta });
        }

        if (nuevasFranjas.length === 0) {
            toast.error('No encontramos dias activos en tu horario legacy.');
            return;
        }

        if (franjasSemana.length > 0) {
            const ok = window.confirm(
                `Ya tienes ${franjasSemana.length} franja${franjasSemana.length === 1 ? '' : 's'} cargada${franjasSemana.length === 1 ? '' : 's'}. ` +
                `Al importar se reemplazan por ${nuevasFranjas.length} franja${nuevasFranjas.length === 1 ? '' : 's'} del horario legacy. ` +
                `¿Continuar?`
            );
            if (!ok) return;
        }

        setFranjasSemana(nuevasFranjas);
        toast.success(`Se importaron ${nuevasFranjas.length} franjas del horario legacy.`);
    };

    // Es importable solo si hay algo parseable con al menos un dia activo.
    // Cached simple — se recomputa en cada render, es barato.
    const puedeImportarLegacy = (() => {
        try {
            const parsed = JSON.parse(disponibilidad || '{}');
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
            return Object.entries(parsed).some(([k, v]: [string, any]) =>
                LEGACY_KEY_TO_ISO[k] && v?.activo === true
            );
        } catch {
            return false;
        }
    })();

    const admiteAgenda = categoriaAdmiteAgendaF1(selectedCatSlug);
    const admiteEstadia = esCategoriaMultiDia(selectedCatSlug);
    const sustantivo = sustantivoAgendaPorCategoria(selectedCatSlug);

    if (!isOpen) return null;

    const coverPreview = fotos[0] || null;

    // Ola 1 feat direcciones: match por "palabra empieza con" (no substring
    // "contiene") + normalizacion de tildes. Helper compartido — mismo
    // criterio en SearchBar, register, perfil proveedor, SidebarFiltros.
    const comunasFiltradas = filtrarComunasPorTermino(comunaSearch, COMUNAS_CHILE).slice(0, 50);

    const PreviewCard = () => (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="aspect-[4/3] bg-slate-100 relative">
                {coverPreview ? (
                    <img src={coverPreview} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon size={32} className="text-slate-300" />
                    </div>
                )}
                {selectedCat && (
                    <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-semibold px-2 py-1 rounded-full border border-slate-200">
                        {selectedCat.nombre}
                    </span>
                )}
            </div>
            <div className="p-4">
                <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-1 line-clamp-2">
                    {titulo || <span className="text-slate-400 font-normal">Título del servicio</span>}
                </h3>
                {descripcion && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-2">{descripcion}</p>
                )}
                {comunasCobertura.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {comunasCobertura.slice(0, 3).map(c => (
                            <span key={c} className="text-[10px] bg-accent-50 text-accent-600 px-1.5 py-0.5 rounded-full border border-accent-100">
                                {c}
                            </span>
                        ))}
                        {comunasCobertura.length > 3 && (
                            <span className="text-[10px] text-slate-400">+{comunasCobertura.length - 3} más</span>
                        )}
                    </div>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <div>
                        {precioDesde ? (
                            <span className="text-accent-700 font-semibold text-sm">
                                ${Number(precioDesde).toLocaleString('es-CL')}
                                <span className="text-slate-400 font-normal text-xs ml-1">{unidadPrecio}</span>
                            </span>
                        ) : (
                            <span className="text-slate-300 text-xs">Precio por definir</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-amber-400">
                        <span className="text-slate-400 text-xs">Sin reseñas aún</span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl relative my-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
                        {existingServiceId ? 'Editar Servicio' : 'Publicar Nuevo Servicio'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {fetching ? (
                    <div className="p-12 flex justify-center items-center">
                        <Loader2 className="w-8 h-8 text-accent-600 animate-spin" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row gap-0 min-h-0">
                        {/* FORM */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-0 lg:border-r lg:border-slate-100">

                            {/* ── SECCIÓN 1: Información básica ── */}
                            <div className="pb-6">
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Información básica</p>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-1">
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoría</label>
                                            <select
                                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                                value={categoriaId}
                                                onChange={(e) => { setCategoriaId(e.target.value); setDetalles({}); }}
                                                required
                                            >
                                                {categorias.map(c => (
                                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor="servicio-titulo" className="block text-sm font-medium text-slate-700 mb-1.5">Título <span className="text-red-500">*</span></label>
                                            <input
                                                id="servicio-titulo"
                                                name="servicio-titulo"
                                                autoComplete="off"
                                                type="text"
                                                value={titulo}
                                                onChange={e => setTitulo(e.target.value)}
                                                maxLength={80}
                                                required
                                                placeholder="Ej: Hospedaje cariñoso con amplio patio"
                                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white placeholder:text-slate-400 transition-colors"
                                            />
                                            <div className="text-right text-xs text-slate-400 mt-1">{titulo.length}/80</div>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="servicio-descripcion" className="block text-sm font-medium text-slate-700 mb-1.5">Descripción <span className="text-red-500">*</span></label>
                                        <textarea
                                            id="servicio-descripcion"
                                            name="servicio-descripcion"
                                            autoComplete="off"
                                            value={descripcion}
                                            onChange={e => setDescripcion(e.target.value)}
                                            maxLength={500}
                                            rows={3}
                                            placeholder="Describe tu servicio, qué incluye, el ambiente que ofreces..."
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white placeholder:text-slate-400 transition-colors resize-none"
                                        />
                                        <div className="text-right text-xs text-slate-400 mt-1">{descripcion.length}/500</div>
                                    </div>
                                </div>
                            </div>

                            {/* ── SECCIÓN 2: Precio y disponibilidad ── */}
                            <div className="border-t border-slate-100 py-6">
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Precio y disponibilidad</p>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label htmlFor="servicio-precio-desde" className="block text-sm font-medium text-slate-700 mb-1.5">Desde ($) <span className="text-red-500">*</span></label>
                                            <input
                                                id="servicio-precio-desde"
                                                name="servicio-precio-desde"
                                                autoComplete="off"
                                                type="text"
                                                inputMode="numeric"
                                                value={precioDesde ? Number(precioDesde).toLocaleString('es-CL') : ''}
                                                onChange={e => { const raw = e.target.value.replace(/\D/g, ''); setPrecioDesde(raw ? Number(raw) : ''); }}
                                                required
                                                placeholder="15.000"
                                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white placeholder:text-slate-400 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="servicio-precio-hasta" className="block text-sm font-medium text-slate-700 mb-1.5">Hasta ($)</label>
                                            <input
                                                id="servicio-precio-hasta"
                                                name="servicio-precio-hasta"
                                                autoComplete="off"
                                                type="text"
                                                inputMode="numeric"
                                                value={precioHasta ? Number(precioHasta).toLocaleString('es-CL') : ''}
                                                onChange={e => { const raw = e.target.value.replace(/\D/g, ''); setPrecioHasta(raw ? Number(raw) : ''); }}
                                                placeholder="Opcional"
                                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white placeholder:text-slate-400 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Unidad</label>
                                            <select
                                                value={unidadPrecio}
                                                onChange={e => setUnidadPrecio(e.target.value)}
                                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                            >
                                                <option value="por noche">por noche</option>
                                                <option value="por hora">por hora</option>
                                                <option value="por sesión">por sesión</option>
                                                <option value="por paseo">por paseo</option>
                                                <option value="por mes">por mes</option>
                                                <option value="por visita">por visita</option>
                                                <option value="por obra">por obra</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* F1 agenda: el editor legacy (7 dias × 1 franja
                                        JSONB text) se oculta cuando el modo agenda
                                        real esta ON. Al opt-out vuelve a aparecer. */}
                                    {!usaAgendaReal && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Disponibilidad</label>
                                        <div className="space-y-1.5">
                                            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(dia => {
                                                // Parse from disponibilidad string or use defaults
                                                const parsed = (() => {
                                                    try { return JSON.parse(disponibilidad); } catch { return {}; }
                                                })();
                                                const dayData = parsed[dia] || { activo: false, desde: '09:00', hasta: '18:00' };
                                                const updateDay = (field: string, value: any) => {
                                                    const current = (() => { try { return JSON.parse(disponibilidad); } catch { return {}; } })();
                                                    current[dia] = { ...current[dia] || { activo: false, desde: '09:00', hasta: '18:00' }, [field]: value };
                                                    setDisponibilidad(JSON.stringify(current));
                                                };
                                                return (
                                                    <div key={dia} className="flex flex-wrap items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateDay('activo', !dayData.activo)}
                                                            className={`w-20 shrink-0 text-xs font-semibold py-1.5 rounded-lg border text-center transition-colors ${
                                                                dayData.activo
                                                                    ? 'bg-accent-50 border-accent-600 text-accent-800'
                                                                    : 'border-slate-200 text-slate-400'
                                                            }`}
                                                        >
                                                            {dia.slice(0, 3)}
                                                        </button>
                                                        {dayData.activo ? (
                                                            <div className="flex items-center gap-1.5 text-sm">
                                                                <label htmlFor={`hora-desde-${dia}`} className="sr-only">{dia}: hora de inicio</label>
                                                                <input
                                                                    id={`hora-desde-${dia}`}
                                                                    name={`hora-desde-${dia}`}
                                                                    type="time"
                                                                    value={dayData.desde}
                                                                    onChange={e => updateDay('desde', e.target.value)}
                                                                    className="h-8 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-accent-600" />
                                                                <span className="text-slate-400 text-xs">a</span>
                                                                <label htmlFor={`hora-hasta-${dia}`} className="sr-only">{dia}: hora de fin</label>
                                                                <input
                                                                    id={`hora-hasta-${dia}`}
                                                                    name={`hora-hasta-${dia}`}
                                                                    type="time"
                                                                    value={dayData.hasta}
                                                                    onChange={e => updateDay('hasta', e.target.value)}
                                                                    className="h-8 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-accent-600" />
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-300">No disponible</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    )}
                                </div>
                            </div>

                            {/* ── SECCIÓN: Agendamiento (toggle maestro) ──
                                Interruptor per-servicio. Cuando esta OFF, el
                                CTA "Solicitar agendamiento" no aparece en la
                                ficha publica — el servicio no acepta agenda
                                de ningun tipo (ni flujo viejo ni agenda real).
                                Va PRIMERO porque es el gate del que depende la
                                seccion de agenda real (F1) que sigue abajo. */}
                            <div className="border-t border-slate-100 py-6">
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Agendamiento</p>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <div className="relative shrink-0 mt-0.5">
                                        <input
                                            type="checkbox"
                                            checked={agendamientoHabilitado}
                                            onChange={e => setAgendamientoHabilitado(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-10 h-6 bg-slate-200 peer-checked:bg-accent-600 rounded-full transition-colors" />
                                        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-sm text-slate-700 block">Habilitar solicitudes de agendamiento</span>
                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                            Si está habilitado, los tutores podrán solicitar agendamientos para este servicio desde la ficha pública. Confirmas o rechazas cada solicitud desde tu panel.
                                        </p>
                                    </div>
                                </label>
                            </div>

                            {/* ── SECCIÓN: Agenda con disponibilidad real (F1) ──
                                Toggle opt-in por servicio, subordinado al toggle
                                maestro de arriba. Solo aparece para categorias
                                de bloque horario (paseos, peluqueria, adiestramiento,
                                veterinario, traslado) Y con agendamiento maestro
                                habilitado. Cuidado y guarderia quedan para F2/F3.

                                Cuando esta ON:
                                  - Se oculta el editor legacy (7 dias x 1 franja
                                    JSONB text) — fuente de verdad pasa a las tablas
                                    disponibilidad_semanal + excepciones_disponibilidad.
                                  - El tutor ve un picker rigido de slots libres
                                    en vez de pedir fecha a ciegas (Incremento 4).

                                Nota: cuando el maestro se apaga, la config de agenda
                                (usaAgendaReal + franjas + excepciones) se preserva
                                en state y en BD — undo natural al reactivar. */}
                            {admiteAgenda && agendamientoHabilitado && (
                                <div className="border-t border-slate-100 py-6">
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Agenda con disponibilidad real</p>
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <div className="relative shrink-0 mt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={usaAgendaReal}
                                                onChange={e => setUsaAgendaReal(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-10 h-6 bg-slate-200 peer-checked:bg-accent-600 rounded-full transition-colors" />
                                            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-sm text-slate-700 block">Usar agenda con disponibilidad real</span>
                                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                Los tutores verán solo los horarios libres y tomarán hora directo — la solicitud queda confirmada sin que tengas que responder cada una. Se reemplaza el bloque de disponibilidad de arriba.
                                            </p>
                                        </div>
                                    </label>

                                    {usaAgendaReal && (
                                        <div className="mt-5 space-y-6">

                                            {/* Config del slot */}
                                            <div>
                                                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-3">Configuración {sustantivo.del}</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label htmlFor="agenda-duracion" className="block text-sm font-medium text-slate-700 mb-1.5">Duración {sustantivo.del}</label>
                                                        <select
                                                            id="agenda-duracion"
                                                            value={duracionSlotMin}
                                                            onChange={e => setDuracionSlotMin(parseInt(e.target.value, 10))}
                                                            className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                                        >
                                                            {DURACION_SLOT_OPCIONES.map(min => (
                                                                <option key={min} value={min}>
                                                                    {min < 60
                                                                        ? `${min} minutos`
                                                                        : min === 60
                                                                            ? '1 hora'
                                                                            : min % 60 === 0
                                                                                ? `${min / 60} horas`
                                                                                : `${Math.floor(min / 60)}h ${min % 60}min`}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <p className="text-xs text-slate-400 mt-1">Cada {sustantivo.singular} dura esto — se agenda dentro de tus franjas.</p>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="agenda-capacidad" className="block text-sm font-medium text-slate-700 mb-1.5">Capacidad por {sustantivo.singular}</label>
                                                        <input
                                                            id="agenda-capacidad"
                                                            type="number"
                                                            min={1}
                                                            max={20}
                                                            value={capacidadSlot}
                                                            onChange={e => setCapacidadSlot(Math.max(1, Math.min(20, parseInt(e.target.value || '1', 10))))}
                                                            className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                                        />
                                                        <p className="text-xs text-slate-400 mt-1">1 = individual. Mayor = grupal (varias mascotas por {sustantivo.singular}).</p>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="agenda-antic-min" className="block text-sm font-medium text-slate-700 mb-1.5">Anticipación mínima (horas)</label>
                                                        <input
                                                            id="agenda-antic-min"
                                                            type="number"
                                                            min={0}
                                                            max={168}
                                                            value={anticipacionMinHoras}
                                                            onChange={e => setAnticipacionMinHoras(Math.max(0, Math.min(168, parseInt(e.target.value || '0', 10))))}
                                                            className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                                        />
                                                        <p className="text-xs text-slate-400 mt-1">Los tutores no pueden reservar con menos anticipación.</p>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="agenda-antic-max" className="block text-sm font-medium text-slate-700 mb-1.5">Ventana máxima (días)</label>
                                                        <input
                                                            id="agenda-antic-max"
                                                            type="number"
                                                            min={1}
                                                            max={365}
                                                            value={anticipacionMaxDias}
                                                            onChange={e => setAnticipacionMaxDias(Math.max(1, Math.min(365, parseInt(e.target.value || '1', 10))))}
                                                            className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                                        />
                                                        <p className="text-xs text-slate-400 mt-1">Cuántos días hacia adelante se pueden reservar.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Semana tipo — recurrencia multi-franja */}
                                            <div>
                                                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Semana tipo</p>
                                                    <div className="flex items-center gap-3">
                                                        {puedeImportarLegacy && (
                                                            <button
                                                                type="button"
                                                                onClick={importarHorarioLegacy}
                                                                className="text-xs font-medium text-accent-700 hover:text-accent-800 hover:bg-accent-50 px-2 py-1 rounded-lg transition-colors"
                                                            >
                                                                Importar mi horario actual
                                                            </button>
                                                        )}
                                                        <span className="text-xs text-slate-400">{franjasSemana.length} {franjasSemana.length === 1 ? 'franja' : 'franjas'}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    {DIAS_SEMANA.map(dia => {
                                                        const franjasDia = franjasSemana
                                                            .map((f, i) => ({ f, i }))
                                                            .filter(({ f }) => f.dia_semana === dia.iso)
                                                            .sort((a, b) => a.f.hora_desde.localeCompare(b.f.hora_desde));
                                                        return (
                                                            <div key={dia.iso} className="flex flex-wrap items-start gap-2 py-2 border-b border-slate-100 last:border-b-0">
                                                                <div className="w-16 shrink-0 pt-1.5">
                                                                    <span className={`text-xs font-semibold ${franjasDia.length > 0 ? 'text-slate-700' : 'text-slate-400'}`}>{dia.corto}</span>
                                                                </div>
                                                                <div className="flex-1 min-w-0 space-y-1.5">
                                                                    {franjasDia.length === 0 ? (
                                                                        <p className="text-xs text-slate-300 italic pt-1.5">Sin franjas</p>
                                                                    ) : (
                                                                        franjasDia.map(({ f, i }) => (
                                                                            <div key={i} className="flex items-center gap-1.5">
                                                                                <input
                                                                                    type="time"
                                                                                    value={f.hora_desde}
                                                                                    onChange={e => updateFranja(i, 'hora_desde', e.target.value)}
                                                                                    className="h-8 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-accent-600"
                                                                                />
                                                                                <span className="text-slate-400 text-xs">a</span>
                                                                                <input
                                                                                    type="time"
                                                                                    value={f.hora_hasta}
                                                                                    onChange={e => updateFranja(i, 'hora_hasta', e.target.value)}
                                                                                    className="h-8 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-accent-600"
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => removeFranja(i)}
                                                                                    className="text-slate-400 hover:text-danger-600 transition-colors p-1"
                                                                                    aria-label="Eliminar franja"
                                                                                    title="Eliminar franja"
                                                                                >
                                                                                    <X size={14} />
                                                                                </button>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => addFranja(dia.iso)}
                                                                    className="text-xs font-medium text-accent-700 hover:text-accent-800 hover:bg-accent-50 px-2 py-1 rounded-lg transition-colors shrink-0"
                                                                >
                                                                    + Franja
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                                                    Define las franjas horarias de cada día. La misma semana se repite todas las semanas — las excepciones (vacaciones, días libres puntuales) las agregas por separado.
                                                </p>
                                            </div>

                                            {/* Excepciones — bloqueos ad-hoc futuros. Solo se
                                                muestran/gestionan las futuras (fecha >= hoy);
                                                las historicas quedan en BD sin tocar. */}
                                            <div>
                                                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Excepciones</p>
                                                    <button
                                                        type="button"
                                                        onClick={addExcepcion}
                                                        className="text-xs font-medium text-accent-700 hover:text-accent-800 hover:bg-accent-50 px-2 py-1 rounded-lg transition-colors"
                                                    >
                                                        + Agregar excepción
                                                    </button>
                                                </div>
                                                {excepciones.length === 0 ? (
                                                    <p className="text-xs text-slate-300 italic py-2">Sin excepciones futuras. Agrega una si tienes vacaciones o días bloqueados puntuales.</p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {excepciones.map((e, i) => {
                                                            const esDiaCompleto = e.hora_desde === null && e.hora_hasta === null;
                                                            return (
                                                                <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <input
                                                                            type="date"
                                                                            value={e.fecha}
                                                                            onChange={ev => updateExcepcion(i, 'fecha', ev.target.value)}
                                                                            className="h-8 px-2 border border-slate-200 rounded-lg bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-accent-600"
                                                                        />
                                                                        <div className="flex items-center gap-1 text-xs">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleExcepcionModo(i, true)}
                                                                                className={`px-2 py-1 rounded-lg border transition-colors ${
                                                                                    esDiaCompleto
                                                                                        ? 'bg-accent-600 text-white border-accent-600'
                                                                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                                                                }`}
                                                                            >
                                                                                Día completo
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleExcepcionModo(i, false)}
                                                                                className={`px-2 py-1 rounded-lg border transition-colors ${
                                                                                    !esDiaCompleto
                                                                                        ? 'bg-accent-600 text-white border-accent-600'
                                                                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                                                                }`}
                                                                            >
                                                                                Franja
                                                                            </button>
                                                                        </div>
                                                                        {!esDiaCompleto && (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <input
                                                                                    type="time"
                                                                                    value={e.hora_desde ?? ''}
                                                                                    onChange={ev => updateExcepcion(i, 'hora_desde', ev.target.value || null)}
                                                                                    className="h-8 px-2 border border-slate-200 rounded-lg bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-accent-600"
                                                                                />
                                                                                <span className="text-slate-400 text-xs">a</span>
                                                                                <input
                                                                                    type="time"
                                                                                    value={e.hora_hasta ?? ''}
                                                                                    onChange={ev => updateExcepcion(i, 'hora_hasta', ev.target.value || null)}
                                                                                    className="h-8 px-2 border border-slate-200 rounded-lg bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-accent-600"
                                                                                />
                                                                            </div>
                                                                        )}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeExcepcion(i)}
                                                                            className="ml-auto text-slate-400 hover:text-danger-600 transition-colors p-1"
                                                                            aria-label="Eliminar excepción"
                                                                            title="Eliminar excepción"
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                    <input
                                                                        type="text"
                                                                        value={e.motivo ?? ''}
                                                                        onChange={ev => updateExcepcion(i, 'motivo', ev.target.value || null)}
                                                                        maxLength={EXCEPCION_MOTIVO_MAX}
                                                                        placeholder="Motivo (opcional) — ej. vacaciones, feriado, veterinario"
                                                                        className="w-full h-8 px-2 border border-slate-200 rounded-lg bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-accent-600"
                                                                    />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                                                    Bloqueos puntuales para días o franjas específicas — cuando no cabe en la semana tipo. Solo se muestran las excepciones futuras.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── SECCIÓN: Agenda por rango de noches (F2) ──
                                Toggle opt-in para categoria cuidado. Semantica
                                INVERTIDA respecto a F1: al activarla, todas las
                                fechas futuras estan disponibles por default y
                                el proveedor declara bloqueos (F2-2B agrega el
                                editor). Subordinado al toggle maestro y mutuo-
                                excluyente con F1 por categoria (cuidado no
                                admite F1 y solo cuidado admite F2). */}
                            {admiteEstadia && agendamientoHabilitado && (
                                <div className="border-t border-slate-100 py-6">
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Agenda por rango de noches</p>
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <div className="relative shrink-0 mt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={usaAgendaEstadia}
                                                onChange={e => setUsaAgendaEstadia(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-10 h-6 bg-slate-200 peer-checked:bg-accent-600 rounded-full transition-colors" />
                                            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-sm text-slate-700 block">Aceptar reservas por rango de noches</span>
                                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                Al activarla, todas las fechas futuras quedan disponibles para reservar, salvo los bloqueos que definas.
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                                                La agenda por noches aplica a estadías (en casa del cuidador, recinto o casa del tutor). Los servicios por horas siguen coordinándose como hasta ahora.
                                            </p>
                                        </div>
                                    </label>

                                    {usaAgendaEstadia && (
                                        <div className="mt-5 space-y-6">
                                            {/* Config de la estadia — 8 campos */}
                                            <div>
                                                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-3">Configuración de la estadía</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label htmlFor="estadia-capacidad" className="block text-sm font-medium text-slate-700 mb-1.5">Estadías simultáneas</label>
                                                        <input
                                                            id="estadia-capacidad"
                                                            type="number"
                                                            min={1}
                                                            max={20}
                                                            value={capacidadEstadia}
                                                            onChange={e => setCapacidadEstadia(Math.max(1, Math.min(20, parseInt(e.target.value || '1', 10))))}
                                                            className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                                        />
                                                        <p className="text-xs text-slate-400 mt-1">Cuántas estadías puedes atender al mismo tiempo. 1 = individual; mayor = varias mascotas alojadas a la vez.</p>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="estadia-cancel" className="block text-sm font-medium text-slate-700 mb-1.5">Cancelación (horas antes)</label>
                                                        <input
                                                            id="estadia-cancel"
                                                            type="number"
                                                            min={0}
                                                            max={168}
                                                            value={cancelacionMinHorasAntes}
                                                            onChange={e => setCancelacionMinHorasAntes(Math.max(0, Math.min(168, parseInt(e.target.value || '0', 10))))}
                                                            className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                                        />
                                                        <p className="text-xs text-slate-400 mt-1">Ventana antes del check-in en la que el tutor ya no puede cancelar.</p>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="estadia-antic-min" className="block text-sm font-medium text-slate-700 mb-1.5">Anticipación mínima (días)</label>
                                                        <input
                                                            id="estadia-antic-min"
                                                            type="number"
                                                            min={0}
                                                            max={30}
                                                            value={anticipacionMinDias}
                                                            onChange={e => setAnticipacionMinDias(Math.max(0, Math.min(30, parseInt(e.target.value || '0', 10))))}
                                                            className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                                        />
                                                        <p className="text-xs text-slate-400 mt-1">Los tutores no pueden reservar con menos anticipación.</p>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="estadia-antic-max" className="block text-sm font-medium text-slate-700 mb-1.5">Ventana máxima (días)</label>
                                                        <input
                                                            id="estadia-antic-max"
                                                            type="number"
                                                            min={1}
                                                            max={730}
                                                            value={anticipacionMaxDiasEstadia}
                                                            onChange={e => setAnticipacionMaxDiasEstadia(Math.max(1, Math.min(730, parseInt(e.target.value || '1', 10))))}
                                                            className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                                        />
                                                        <p className="text-xs text-slate-400 mt-1">Cuántos días hacia adelante se puede reservar.</p>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="estadia-min-noches" className="block text-sm font-medium text-slate-700 mb-1.5">Mínimo de noches</label>
                                                        <input
                                                            id="estadia-min-noches"
                                                            type="number"
                                                            min={1}
                                                            max={90}
                                                            value={minNoches}
                                                            onChange={e => setMinNoches(Math.max(1, Math.min(90, parseInt(e.target.value || '1', 10))))}
                                                            className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                                        />
                                                        <p className="text-xs text-slate-400 mt-1">Estadía más corta que aceptas.</p>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="estadia-max-noches" className="block text-sm font-medium text-slate-700 mb-1.5">Máximo de noches</label>
                                                        <input
                                                            id="estadia-max-noches"
                                                            type="number"
                                                            min={1}
                                                            max={365}
                                                            value={maxNoches ?? ''}
                                                            placeholder="Sin límite"
                                                            onChange={e => {
                                                                const raw = e.target.value.trim();
                                                                if (raw === '') { setMaxNoches(null); return; }
                                                                const n = parseInt(raw, 10);
                                                                if (Number.isNaN(n)) { setMaxNoches(null); return; }
                                                                setMaxNoches(Math.max(1, Math.min(365, n)));
                                                            }}
                                                            className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                                        />
                                                        <p className="text-xs text-slate-400 mt-1">Estadía más larga que aceptas. Déjalo vacío si no tienes tope.</p>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="estadia-checkin" className="block text-sm font-medium text-slate-700 mb-1.5">Hora de check-in (opcional)</label>
                                                        <input
                                                            id="estadia-checkin"
                                                            type="time"
                                                            value={checkInHora}
                                                            onChange={e => setCheckInHora(e.target.value)}
                                                            className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                                        />
                                                        <p className="text-xs text-slate-400 mt-1">Si la dejas vacía, la coordinas por chat.</p>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="estadia-checkout" className="block text-sm font-medium text-slate-700 mb-1.5">Hora de check-out (opcional)</label>
                                                        <input
                                                            id="estadia-checkout"
                                                            type="time"
                                                            value={checkOutHora}
                                                            onChange={e => setCheckOutHora(e.target.value)}
                                                            className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                                        />
                                                        <p className="text-xs text-slate-400 mt-1">Si la dejas vacía, la coordinas por chat.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── SECCIÓN 3: Mascotas ── */}
                            <div className="border-t border-slate-100 py-6">
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Mascotas aceptadas <span className="text-red-500">*</span></p>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {[
                                        { label: 'Perros', checked: perros, set: setPerros },
                                        { label: 'Gatos', checked: gatos, set: setGatos },
                                        { label: 'Otras', checked: otras, set: setOtras },
                                    ].map(m => (
                                        <button key={m.label} type="button" onClick={() => m.set(!m.checked)}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${m.checked
                                                ? 'bg-accent-50 border-accent-600 text-accent-800'
                                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                            }`}>
                                            {m.label}
                                        </button>
                                    ))}
                                </div>

                                {perros && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs text-slate-500 font-medium mr-1">Tamaños:</span>
                                        {[
                                            { label: 'Pequeño', checked: tamanoPequeno, set: setTamanoPequeno },
                                            { label: 'Mediano', checked: tamanoMediano, set: setTamanoMediano },
                                            { label: 'Grande', checked: tamanoGrande, set: setTamanoGrande },
                                        ].map(t => (
                                            <button key={t.label} type="button" onClick={() => t.set(!t.checked)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${t.checked
                                                    ? 'bg-slate-900 border-slate-900 text-white'
                                                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                                }`}>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── COMUNAS DE COBERTURA ── */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                    <MapPin size={14} className="text-slate-400" />
                                    Comunas donde prestas el servicio <span className="text-red-500">*</span>
                                </label>
                                <p className="text-xs text-slate-400 mb-2">
                                    Selecciona todas las comunas donde ofreces este servicio. Los clientes podrán encontrarte al filtrar por su zona.
                                </p>

                                {/* Selected chips */}
                                {comunasCobertura.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {comunasCobertura.map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => toggleComuna(c)}
                                                className="flex items-center gap-1 bg-accent-100 text-accent-800 text-xs font-medium px-2.5 py-1 rounded-full hover:bg-accent-200 transition-colors"
                                            >
                                                {c}
                                                <X size={10} />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Dropdown */}
                                <div ref={comunaRef} className="relative">
                                    <div
                                        className="flex items-center gap-2 w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50 cursor-text"
                                        onClick={() => setComunaDropdownOpen(true)}
                                    >
                                        <Search size={14} className="text-slate-400 shrink-0" />
                                        <label htmlFor="comuna-search" className="sr-only">Buscar comuna</label>
                                        <input
                                            id="comuna-search"
                                            name="comuna-search"
                                            autoComplete="off"
                                            type="text"
                                            value={comunaSearch}
                                            onChange={e => { setComunaSearch(e.target.value); setComunaDropdownOpen(true); }}
                                            onFocus={() => setComunaDropdownOpen(true)}
                                            placeholder="Buscar y agregar comunas..."
                                            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                                        />
                                    </div>

                                    {comunaDropdownOpen && (
                                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                            {comunasFiltradas.length === 0 ? (
                                                <p className="text-xs text-slate-400 p-3 text-center">Sin resultados</p>
                                            ) : (
                                                comunasFiltradas.map(c => (
                                                    <button
                                                        key={c}
                                                        type="button"
                                                        onClick={() => { toggleComuna(c); setComunaSearch(''); }}
                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between ${comunasCobertura.includes(c) ? 'text-accent-700 font-semibold' : 'text-slate-700'}`}
                                                    >
                                                        {c}
                                                        {comunasCobertura.includes(c) && (
                                                            <span className="text-accent-600 text-xs">✓</span>
                                                        )}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── CAMPOS ESPECÍFICOS POR CATEGORÍA ── */}
                            {camposCategoria.length > 0 && (
                                <div className="border-t border-slate-100 pt-6 pb-2">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                        <span className="text-sm font-semibold text-accent-700">{selectedCat?.nombre?.charAt(0)}</span>
                                        Detalles de {selectedCat?.nombre}
                                    </h3>
                                    <div className="space-y-4">
                                        {camposCategoria.map(campo => (
                                            <div key={campo.key}>
                                                {campo.tipo === 'info' ? (
                                                    <p className="text-sm text-slate-600 px-3 py-2 bg-accent-50 rounded-lg border border-accent-100 italic">
                                                        {campo.label}
                                                    </p>
                                                ) : campo.tipo === 'boolean' ? (
                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <div className="relative shrink-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={mergedDetalles[campo.key] === true}
                                                                onChange={e => setDetalle(campo.key, e.target.checked)}
                                                                className="sr-only peer"
                                                            />
                                                            <div className="w-10 h-6 bg-slate-200 peer-checked:bg-accent-600 rounded-full transition-colors" />
                                                            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                                                        </div>
                                                        <span className="text-sm text-slate-700">{campo.label}</span>
                                                    </label>
                                                ) : campo.tipo === 'select' ? (
                                                    <div>
                                                        <label htmlFor={`campo-${campo.key}`} className="block text-sm font-medium text-slate-700 mb-1.5">{campo.label}</label>
                                                        <select
                                                            id={`campo-${campo.key}`}
                                                            name={`campo-${campo.key}`}
                                                            value={mergedDetalles[campo.key] ?? ''}
                                                            onChange={e => setDetalle(campo.key, e.target.value)}
                                                            className="w-full h-11 px-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                                        >
                                                            <option value="">Seleccionar...</option>
                                                            {campo.opciones?.map(opt => (
                                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ) : campo.tipo === 'multiselect' ? (() => {
                                                    // Chips toggle: mismo patron que idiomas / comunas_cobertura.
                                                    // El valor se persiste como text[] en jsonb.
                                                    const selected: string[] = Array.isArray(mergedDetalles[campo.key]) ? mergedDetalles[campo.key] : [];
                                                    const toggle = (slug: string) => {
                                                        setDetalle(campo.key, selected.includes(slug)
                                                            ? selected.filter(s => s !== slug)
                                                            : [...selected, slug]);
                                                    };
                                                    return (
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">{campo.label}</label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {campo.opciones?.map(opt => {
                                                                    const active = selected.includes(opt.value);
                                                                    return (
                                                                        <button
                                                                            key={opt.value}
                                                                            type="button"
                                                                            onClick={() => toggle(opt.value)}
                                                                            className={
                                                                                active
                                                                                    ? 'flex items-center gap-1.5 bg-accent-100 text-accent-800 text-sm font-medium px-3 py-1.5 rounded-full hover:bg-accent-200 transition-colors'
                                                                                    : 'flex items-center gap-1.5 bg-slate-50 text-slate-600 text-sm font-medium px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100 transition-colors'
                                                                            }
                                                                        >
                                                                            {opt.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })() : campo.tipo === 'textarea' ? (() => {
                                                    // Tope 300 chars con contador visible. Aplica a
                                                    // todos los campos `textarea` (post Fase 2 solo
                                                    // queda `notas`); consistente para futuros.
                                                    const valor: string = typeof mergedDetalles[campo.key] === 'string' ? mergedDetalles[campo.key] : '';
                                                    return (
                                                        <div>
                                                            <label htmlFor={`campo-${campo.key}`} className="block text-sm font-medium text-slate-700 mb-1.5">{campo.label}</label>
                                                            <textarea
                                                                id={`campo-${campo.key}`}
                                                                name={`campo-${campo.key}`}
                                                                autoComplete="off"
                                                                value={valor}
                                                                onChange={e => setDetalle(campo.key, e.target.value)}
                                                                placeholder={campo.placeholder}
                                                                rows={3}
                                                                maxLength={300}
                                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white placeholder:text-slate-400 transition-colors resize-none"
                                                            />
                                                            <p className="text-xs text-slate-400 mt-1 text-right">{valor.length} / 300</p>
                                                        </div>
                                                    );
                                                })() : campo.tipo === 'number' ? (
                                                    <div>
                                                        <label htmlFor={`campo-${campo.key}`} className="block text-sm font-medium text-slate-700 mb-1.5">{campo.label}</label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                id={`campo-${campo.key}`}
                                                                name={`campo-${campo.key}`}
                                                                autoComplete="off"
                                                                type="number"
                                                                value={mergedDetalles[campo.key] ?? ''}
                                                                onChange={e => setDetalle(campo.key, e.target.value ? Number(e.target.value) : '')}
                                                                placeholder={campo.placeholder}
                                                                min={0}
                                                                className="w-32 h-11 px-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white placeholder:text-slate-400 transition-colors"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <label htmlFor={`campo-${campo.key}`} className="block text-sm font-medium text-slate-700 mb-1.5">{campo.label}</label>
                                                        <input
                                                            id={`campo-${campo.key}`}
                                                            name={`campo-${campo.key}`}
                                                            autoComplete="off"
                                                            type="text"
                                                            value={mergedDetalles[campo.key] ?? ''}
                                                            onChange={e => setDetalle(campo.key, e.target.value)}
                                                            placeholder={campo.placeholder}
                                                            className="w-full h-11 px-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white placeholder:text-slate-400 transition-colors"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Fotos */}
                            <div className="border-t border-slate-100 pt-6 mt-6">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                                        Fotos del servicio <span className="text-danger-500 normal-case">*</span>
                                    </p>
                                    <span className="text-xs text-slate-400 font-medium">{fotos.length}/8</span>
                                </div>
                                <p className="text-xs text-slate-500 mb-3">
                                    Al menos 1 foto. Los servicios con fotos reciben muchas más consultas.
                                </p>

                                {uploadingFotos && (
                                    <div className="w-full h-1 bg-slate-100 rounded-full mb-3 overflow-hidden">
                                        <div className="h-full bg-accent-600 animate-pulse w-2/3 rounded-full" />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                    {fotos.map((url, i) => (
                                        <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group">
                                            <img src={url} alt={"Foto " + (i + 1)} className="absolute inset-0 w-full h-full object-cover" />

                                            {i === 0 && (
                                                <div className="absolute top-1.5 left-1.5 bg-accent-600 text-white text-[10px] font-medium uppercase tracking-widest px-1.5 py-0.5 rounded-full leading-none">
                                                    PORTADA
                                                </div>
                                            )}

                                            <div className="absolute bottom-1.5 inset-x-1.5 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                                <div className="flex gap-1">
                                                    {i > 0 && (
                                                        <button type="button" onClick={() => moveFoto(i, "left")}
                                                            className="bg-black/60 hover:bg-black/80 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold transition-colors"
                                                            title="Mover a la izquierda">
                                                            ←
                                                        </button>
                                                    )}
                                                    {i < fotos.length - 1 && (
                                                        <button type="button" onClick={() => moveFoto(i, "right")}
                                                            className="bg-black/60 hover:bg-black/80 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold transition-colors"
                                                            title="Mover a la derecha">
                                                            →
                                                        </button>
                                                    )}
                                                </div>
                                                <button type="button" onClick={() => removeFoto(url)}
                                                    className="bg-danger-500 hover:bg-danger-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                                                    title="Eliminar foto">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {fotos.length < 8 && (
                                        <label className={[
                                            "rounded-xl border-2 border-dashed border-slate-300 bg-slate-50",
                                            "flex flex-col items-center justify-center cursor-pointer",
                                            "hover:bg-slate-100 hover:border-accent-600 transition-colors",
                                            fotos.length === 0 ? "col-span-2 sm:col-span-4 py-10" : "aspect-square"
                                        ].join(" ")}
                                        >
                                            {uploadingFotos ? (
                                                <Loader2 size={24} className="text-slate-400 animate-spin" />
                                            ) : (
                                                <>
                                                    <Upload size={fotos.length === 0 ? 32 : 22} className="text-slate-400 mb-2" />
                                                    <span className="text-xs text-slate-500 font-semibold text-center px-2">
                                                        {fotos.length === 0 ? "Haz click para subir fotos" : "Agregar"}
                                                    </span>
                                                    {fotos.length === 0 && (
                                                        <span className="text-[11px] text-slate-400 mt-1">
                                                            JPG, PNG, WebP — max 5MB c/u
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                            <input type="file" multiple accept="image/*" className="hidden"
                                                onChange={handleFileUpload} disabled={uploadingFotos} />
                                        </label>
                                    )}
                                </div>

                                <p className="text-xs text-slate-400 leading-relaxed">
                                    <span className="font-semibold text-accent-600">La primera foto es la portada</span>
                                    {" "}y es la que aparece en el listado. Usa las flechas para reordenar. Puedes subir hasta 8 fotos (JPG, PNG, WebP, max 5MB cada una).
                                </p>
                            </div>
                        </form>

                        {/* PREVIEW PANEL — desktop right column */}
                        <div className="hidden lg:flex flex-col w-72 shrink-0 p-6 bg-slate-50/50">
                            <p className="text-sm text-slate-500 font-medium mb-4">Vista previa</p>
                            <PreviewCard />
                            <p className="text-xs text-slate-400 mt-3 text-center">Así verán tu servicio los clientes</p>
                        </div>

                        {/* PREVIEW PANEL — mobile collapsible */}
                        <div className="lg:hidden border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowMobilePreview(v => !v)}
                                className="w-full flex items-center justify-between px-6 py-3 text-sm text-slate-600 font-semibold hover:bg-slate-50"
                            >
                                Vista previa
                                <ChevronDown size={16} className={`transition-transform ${showMobilePreview ? 'rotate-180' : ''}`} />
                            </button>
                            {showMobilePreview && (
                                <div className="px-6 pb-6">
                                    <PreviewCard />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-600 font-normal hover:bg-slate-100 transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || fetching || uploadingFotos}
                        className="px-6 py-2.5 bg-accent-600 text-white font-medium tracking-wide rounded-xl hover:bg-accent-700 transition-colors shadow-lg shadow-accent-600/20 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {existingServiceId ? 'Guardar Cambios' : 'Publicar Servicio'}
                    </button>
                </div>
            </div>
            <Toaster position="top-center" richColors />
        </div>
    );
}
