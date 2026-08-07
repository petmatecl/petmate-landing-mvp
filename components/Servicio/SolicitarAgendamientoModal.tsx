// components/Servicio/SolicitarAgendamientoModal.tsx
// ----------------------------------------------------------------------------
// Sprint 2 agendamiento — modal de solicitud del tutor.
// Fase 1: branching V1 (puntual fecha+hora) vs V2 (cuidado rango noches).
// Fase 2: agrega chip selector de modalidad + toggle noches/horas (V4a/V4b)
// + textarea de direccion cuando modalidad='casa_tutor'.
//
// Flow segun categoria:
//   - NO cuidado → V1 (datetime-local). Sin cambios desde Sprint 2.
//   - cuidado con UNA sola modalidad → auto-select, sin chip selector.
//   - cuidado con MULTIPLES modalidades → chip selector arriba, tutor elige
//     antes de ver el resto del form.
//
// Y dentro de cuidado, segun modalidad elegida:
//   - casa_cuidador | recinto → V2 (rango noches sin direccion).
//   - casa_tutor → toggle "Por noches" / "Por horas":
//       'noches' → V4a (rango + direccion).
//       'horas'  → V4b (datetime + duracion 1-12 + direccion).
//
// State preservation cuando el tutor cambia chip mid-form:
//   - mensaje y direccion se preservan (la direccion del tutor es la misma
//     independiente de la modalidad del servicio; el mensaje tambien).
//   - fechas se resetean (el shape cambia: date vs datetime, etc.). Lo
//     hacemos via useEffect deps modalidadElegida + modoTarifa.
// ----------------------------------------------------------------------------
import React, { useEffect, useId, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Calendar, X, Loader2, MapPin, Home, PawPrint } from 'lucide-react';
import { toast } from 'sonner';
import { useModalDialog } from '../../lib/useModalDialog';
import {
    esCategoriaMultiDia,
    esModalidadValida,
    getVarianteFormulario,
    MODALIDAD_LABELS,
    type ModalidadCuidado,
    type ModoTarifa,
} from '../../lib/categoriaTemporal';
import { formatRangoNoches, nochesEntre } from '../../lib/formatFecha';
import { DayPicker, type DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { es } from 'date-fns/locale';
import RegionComunaPicker from '../Shared/RegionComunaPicker';

interface SolicitarAgendamientoModalProps {
    isOpen: boolean;
    onClose: () => void;
    servicioId: string;
    proveedorId: string;
    serviceTitle: string;
    // Fase 1: slug de la categoria. Si no se pasa, V1 puntual.
    categoriaSlug?: string | null;
    // Fase 2: modalidades que ofrece el servicio (solo aplica cuidado).
    // Viene de detalles.modalidad del servicio (JSONB array). Si el shape
    // legacy es invalido, ServiceDetailView pasa [] como defensa.
    modalidades?: string[];
    // F1 agenda con disponibilidad real. Si duracionSlotMin es un numero,
    // el modal cambia al PICKER RIGIDO — reemplaza el datetime-local V1
    // por un strip de dias + grid de slots derivados del endpoint
    // /api/servicios/[id]/slots. Solicitud nace estado='confirmada'.
    // Si es null/undefined, sigue el flujo V1/V2/V4 existente.
    duracionSlotMin?: number | null;
    capacidadSlot?: number;
    anticipacionMaxDias?: number;
    // F2 agenda por rango de noches. Si capacidadEstadia es un numero,
    // el modal cambia al PICKER DE CALENDARIO (react-day-picker range mode)
    // — reemplaza los datepickers V2/V4a con un calendario que muestra
    // disponibilidad diaria del endpoint /api/servicios/[id]/disponibilidad-
    // noches. Solicitud nace estado='confirmada' + fecha_fin +
    // capacidad_snapshot_estadia. Precedencia sobre el flow V2/V4a existente
    // cuando la categoria es cuidado. Null/undefined → flow V2/V4a intacto.
    capacidadEstadia?: number | null;
}

// Tipo del response del endpoint de slots (espeja lib/slotsAgenda.ts).
type SlotDelPicker = {
    fecha: string;         // YYYY-MM-DD (Chile)
    hora_inicio: string;   // HH:MM
    hora_fin: string;      // HH:MM
    disponible: boolean;
    restantes: number;
};

// F2 — tipo del response del endpoint de disponibilidad de noches
// (espeja lib/nochesAgenda.ts). Cada dia trae la razon por la que esta
// (o no) disponible como check-in de una estadia.
type DiaCalendarioEstadia = {
    fecha: string;              // YYYY-MM-DD (Chile)
    disponible: boolean;
    restantes: number;
    razon: 'ok' | 'pasado' | 'anticipacion_min' | 'anticipacion_max' | 'blackout' | 'lleno';
};

type ConfigEstadia = {
    capacidad_estadia: number;
    min_noches: number;
    max_noches: number | null;
    cancelacion_min_horas_antes: number;
    check_in_hora: string | null;   // 'HH:MM:SS' o null (Postgres time)
    check_out_hora: string | null;
};

type DisponibilidadNochesResponse = {
    dias: DiaCalendarioEstadia[];
    config: ConfigEstadia;
};

// Devuelve YYYY-MM-DDTHH:mm en horario local — formato esperado por
// <input type="datetime-local"/> para el atributo `min`.
function minDateTimeLocal(): string {
    const now = new Date();
    const off = now.getTimezoneOffset();
    const local = new Date(now.getTime() - off * 60 * 1000);
    return local.toISOString().slice(0, 16);
}

// YYYY-MM-DD en horario local — formato esperado por <input type="date"/>
// para el atributo `min`. Day-granularity (sin hora) para V2/V4a.
function minDateLocal(): string {
    const now = new Date();
    const off = now.getTimezoneOffset();
    const local = new Date(now.getTime() - off * 60 * 1000);
    return local.toISOString().slice(0, 10);
}

// ────────────────────────────────────────────────────────────────────────────
// F1 picker helpers (fecha en TZ Chile como YYYY-MM-DD).
// ────────────────────────────────────────────────────────────────────────────
const CHILE_TZ = 'America/Santiago';

function localTodayIso(): string {
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: CHILE_TZ,
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
}

function shiftDate(iso: string, deltaDias: number): string {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + deltaDias));
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

function diasEntreIso(desde: string, hasta: string): number {
    const [y1, m1, d1] = desde.split('-').map(Number);
    const [y2, m2, d2] = hasta.split('-').map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

// Convierte una fecha civil chilena ('YYYY-MM-DD') a un Date en el
// momento absoluto que corresponde a la medianoche chilena de ese dia
// (invierno: 04:00 UTC, verano: 03:00 UTC). Usado para F2 al INSERT:
// fecha_preferida = medianoche Chile check-in, fecha_fin = medianoche Chile
// check-out. Respeta DST via Intl (mismo patron que el F1 picker en el
// bloque V1 puntual).
function chileMidnightUtc(fecha: string): Date {
    const [y, m, d] = fecha.split('-').map(Number);
    const guessUtcMs = Date.UTC(y, m - 1, d, 0, 0);
    const parts = new Intl.DateTimeFormat('sv-SE', {
        timeZone: CHILE_TZ,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
    }).formatToParts(new Date(guessUtcMs));
    const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10);
    const chileWallMs = Date.UTC(
        get('year'), get('month') - 1, get('day'),
        get('hour'), get('minute'), get('second')
    );
    return new Date(guessUtcMs - (chileWallMs - guessUtcMs));
}

// Formato local 'YYYY-MM-DD' de un Date del browser. react-day-picker
// devuelve Date objects (createos en TZ del sistema); esta funcion los
// baja a componente civil para matchear los keys del map de disponibilidad.
function ymdFromDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

// Primer y ultimo dia del mes de una fecha 'YYYY-MM-DD' (para el fetch
// mensual del picker F2). Ambos como 'YYYY-MM-DD'.
function primerDiaDelMes(iso: string): string {
    return iso.slice(0, 7) + '-01';
}
function ultimoDiaDelMes(iso: string): string {
    const [y, m] = iso.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return `${iso.slice(0, 7)}-${String(last).padStart(2, '0')}`;
}

const DIAS_ES_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_ES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function nombreDiaCorto(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return DIAS_ES_CORTO[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function nombreMesCorto(iso: string): string {
    const m = parseInt(iso.split('-')[1], 10);
    return MESES_ES_CORTO[m - 1];
}

function diaNumero(iso: string): number {
    return parseInt(iso.split('-')[2], 10);
}

// Ola 1: limites de los campos estructurados (matchean los CHECK de BD).
const CALLE_MIN_CHARS = 2;
const CALLE_MAX_CHARS = 200;
const NUMERO_MIN_CHARS = 1;
const NUMERO_MAX_CHARS = 30;
const DIRECCION_INFO_MAX_CHARS = 200;
const DURACION_MIN_HORAS = 1;
const DURACION_MAX_HORAS = 12;

export default function SolicitarAgendamientoModal({
    isOpen,
    onClose,
    servicioId,
    proveedorId,
    serviceTitle,
    categoriaSlug,
    modalidades = [],
    duracionSlotMin,
    capacidadSlot,
    anticipacionMaxDias,
    capacidadEstadia,
}: SolicitarAgendamientoModalProps) {
    // F1 agenda con disponibilidad real: activa el picker rigido si el
    // servicio tiene duracionSlotMin. Tiene precedencia sobre las variantes
    // V1/V2/V4 (aunque F1 solo aplica a categorias de bloque horario que
    // caen en V1 — este check es defensivo por si en el futuro F1 se
    // extiende a otras categorias).
    const usaPicker = typeof duracionSlotMin === 'number' && duracionSlotMin > 0;
    // F2 agenda por rango de noches: activa el picker de calendario si el
    // servicio tiene capacidadEstadia populada. Tiene precedencia sobre
    // V2/V4a (rango legacy sin picker) cuando la categoria es cuidado.
    // F1 y F2 son mutuamente excluyentes por categoria: F1 solo aplica a
    // categorias de bloque horario, F2 solo a cuidado; no se pisan.
    const usaPickerEstadia = typeof capacidadEstadia === 'number' && capacidadEstadia > 0;

    const isCuidado = esCategoriaMultiDia(categoriaSlug);
    const modalidadesValidas: ModalidadCuidado[] = isCuidado
        ? modalidades.filter(esModalidadValida)
        : [];
    const requiereChipSelector = modalidadesValidas.length > 1;
    const modalidadAutoSelect: ModalidadCuidado | null =
        isCuidado && modalidadesValidas.length === 1 ? modalidadesValidas[0] : null;

    const [modalidadElegida, setModalidadElegida] = useState<ModalidadCuidado | null>(
        modalidadAutoSelect
    );
    const [modoTarifa, setModoTarifa] = useState<ModoTarifa | null>(null);

    const [fechaPreferida, setFechaPreferida] = useState(''); // V1: datetime-local; V2/V4a: date inicio; V4b: datetime-local
    const [fechaFin, setFechaFin] = useState(''); // V2/V4a: date fin
    const [duracionHoras, setDuracionHoras] = useState(''); // V4b
    // Ola 1 feat direcciones: 5 campos estructurados (solo V4a/V4b). State
    // se preserva al cambiar chip/toggle (la direccion del tutor es
    // invariante a la modalidad del servicio).
    const [region, setRegion] = useState<string | null>(null);
    const [comuna, setComuna] = useState<string | null>(null);
    const [calle, setCalle] = useState('');
    const [numero, setNumero] = useState('');
    const [direccionInfo, setDireccionInfo] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // F1 picker state — solo relevante cuando usaPicker.
    // desdeVisible = fecha del primer dia del strip (7 dias). Se navega con
    // botones "semana anterior/siguiente". slotElegido queda como null hasta
    // que el tutor clickea uno disponible.
    const [pickerDesde, setPickerDesde] = useState<string>(() => localTodayIso());
    const [pickerSlots, setPickerSlots] = useState<SlotDelPicker[]>([]);
    const [pickerLoading, setPickerLoading] = useState(false);
    const [pickerError, setPickerError] = useState<string | null>(null);
    const [pickerDiaElegido, setPickerDiaElegido] = useState<string>(() => localTodayIso());
    const [slotElegido, setSlotElegido] = useState<SlotDelPicker | null>(null);

    // F2 picker state — solo relevante cuando usaPickerEstadia.
    //
    // pickerEstMesActual = primer dia del mes visible en el DayPicker (YYYY-MM-01).
    // pickerEstDias = map de disponibilidad diaria del mes actual + siguiente
    //     (fetch de 2 meses para que el DayPicker con numberOfMonths=2 tenga
    //     ambos poblados).
    // pickerEstConfig = min/max noches + horas + capacidad del servicio.
    // rangoEst = DateRange seleccionado por el tutor (from + to). Ambos undefined
    //     al inicio; onSelect actualiza incrementalmente.
    // rangoEstError = mensaje inline debajo del picker cuando la seleccion no
    //     cumple validacion (incluye disabled, min/max noches, etc). Se limpia
    //     al reset de la seleccion.
    const [pickerEstMesActual, setPickerEstMesActual] = useState<string>(() => primerDiaDelMes(localTodayIso()));
    const [pickerEstDiasMap, setPickerEstDiasMap] = useState<Map<string, DiaCalendarioEstadia>>(new Map());
    const [pickerEstConfig, setPickerEstConfig] = useState<ConfigEstadia | null>(null);
    const [pickerEstLoading, setPickerEstLoading] = useState(false);
    const [pickerEstError, setPickerEstError] = useState<string | null>(null);
    const [rangoEst, setRangoEst] = useState<DateRange | undefined>(undefined);
    const [rangoEstError, setRangoEstError] = useState<string | null>(null);
    // ZB2 Dim 6: DayPicker responsive — 2 meses en desktop (≥sm 640px),
    // 1 en mobile. El fetch ya trae mes+siguiente (ver comentario L292),
    // solo faltaba que el prop `numberOfMonths` acompañara.
    const [pickerEstMonths, setPickerEstMonths] = useState(1);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mql = window.matchMedia('(min-width: 640px)');
        const update = () => setPickerEstMonths(mql.matches ? 2 : 1);
        update();
        mql.addEventListener('change', update);
        return () => mql.removeEventListener('change', update);
    }, []);

    // Feature "fichas de mascotas → solicitud":
    // Cargamos las mascotas del tutor logueado al abrir el modal. El selector
    // asocia la ficha real (mascota_id) o cae a texto libre (tipo_mascota_texto)
    // mutuamente exclusivos en la UI. Ambos NULLABLE en DB — solicitudes sin
    // mascota siguen siendo válidas (retrocompat).
    type MascotaFicha = { id: string; nombre: string; tipo: string; foto_mascota: string | null };
    const [misMascotas, setMisMascotas] = useState<MascotaFicha[]>([]);
    const [mascotaId, setMascotaId] = useState<string | null>(null);
    const [tipoMascotaTexto, setTipoMascotaTexto] = useState('');
    // 'otra' → tutor con mascotas eligió "no está en mi lista" y ve el input libre.
    const [otraSeleccionada, setOtraSeleccionada] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;
            const { data, error } = await supabase
                .from('mascotas')
                .select('id, nombre, tipo, foto_mascota')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: true });
            if (error) {
                console.warn('[SolicitarAgendamientoModal] fetch mascotas falló:', error);
                setMisMascotas([]);
                return;
            }
            setMisMascotas(data || []);
        })();
    }, [isOpen]);

    // Reset fechas cuando cambia el shape del form. Mensaje y direccion se
    // preservan (la direccion del tutor es invariante a la modalidad del
    // servicio, el mensaje es comentario libre). En el mount inicial,
    // modalidadElegida/modoTarifa pasan de su valor de init (null o
    // auto-select) a si mismo — fechas ya son '' asi que no hay efecto
    // visible.
    useEffect(() => {
        setFechaPreferida('');
        setFechaFin('');
        setDuracionHoras('');
    }, [modalidadElegida, modoTarifa]);

    // F1 picker — fetch de slots cada vez que cambia el rango visible o el
    // modal se abre. Ventana de 7 dias, capada por anticipacion_max_dias.
    // Al open, reset al hoy y limpiar seleccion previa.
    useEffect(() => {
        if (!isOpen || !usaPicker) return;
        setPickerDesde(localTodayIso());
        setPickerDiaElegido(localTodayIso());
        setSlotElegido(null);
    }, [isOpen, usaPicker, servicioId]);

    useEffect(() => {
        if (!isOpen || !usaPicker) return;
        const controller = new AbortController();
        (async () => {
            setPickerLoading(true);
            setPickerError(null);
            try {
                // Ventana de 7 dias desde pickerDesde. Si excede
                // anticipacion_max_dias, cortamos.
                const hoy = localTodayIso();
                const topeMax = anticipacionMaxDias
                    ? shiftDate(hoy, anticipacionMaxDias)
                    : shiftDate(hoy, 90);
                let hasta = shiftDate(pickerDesde, 6);
                if (hasta > topeMax) hasta = topeMax;
                if (hasta < pickerDesde) hasta = pickerDesde;

                const r = await fetch(
                    `/api/servicios/${servicioId}/slots?desde=${pickerDesde}&hasta=${hasta}`,
                    { signal: controller.signal }
                );
                if (!r.ok) {
                    throw new Error(`HTTP ${r.status}`);
                }
                const data = (await r.json()) as SlotDelPicker[];
                setPickerSlots(data);
            } catch (err: any) {
                if (err?.name === 'AbortError') return;
                console.error('[picker] fetch slots error:', err);
                setPickerError('No pudimos cargar los horarios. Intenta de nuevo.');
                setPickerSlots([]);
            } finally {
                setPickerLoading(false);
            }
        })();
        return () => controller.abort();
    }, [isOpen, usaPicker, servicioId, pickerDesde, anticipacionMaxDias]);

    // F2 picker — reset al abrir el modal / cambiar de servicio. El mes
    // arranca en el mes actual chileno; la seleccion queda vacia hasta que
    // el tutor arma un rango.
    useEffect(() => {
        if (!isOpen || !usaPickerEstadia) return;
        setPickerEstMesActual(primerDiaDelMes(localTodayIso()));
        setRangoEst(undefined);
        setRangoEstError(null);
    }, [isOpen, usaPickerEstadia, servicioId]);

    // F2 picker — fetch de disponibilidad al abrir el modal / cambiar mes.
    // Rango del fetch: primer dia del mes visible → ultimo dia del mes
    // SIGUIENTE, para que un DayPicker con numberOfMonths=2 tenga ambos
    // meses poblados sin refetch por scroll. Al cambiar mes, refetch trae
    // el nuevo par de meses.
    useEffect(() => {
        if (!isOpen || !usaPickerEstadia) return;
        const controller = new AbortController();
        (async () => {
            setPickerEstLoading(true);
            setPickerEstError(null);
            try {
                const desde = primerDiaDelMes(pickerEstMesActual);
                // Mes siguiente: sumar 1 al mes del pickerEstMesActual.
                const [y, m] = pickerEstMesActual.split('-').map(Number);
                const proxMesFirst = m === 12
                    ? `${y + 1}-01-01`
                    : `${y}-${String(m + 1).padStart(2, '0')}-01`;
                const hasta = ultimoDiaDelMes(proxMesFirst);

                const r = await fetch(
                    `/api/servicios/${servicioId}/disponibilidad-noches?desde=${desde}&hasta=${hasta}`,
                    { signal: controller.signal }
                );
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const data = (await r.json()) as DisponibilidadNochesResponse;
                const map = new Map<string, DiaCalendarioEstadia>();
                for (const d of data.dias) map.set(d.fecha, d);
                setPickerEstDiasMap(map);
                setPickerEstConfig(data.config);
            } catch (err: any) {
                if (err?.name === 'AbortError') return;
                console.error('[picker-estadia] fetch disponibilidad error:', err);
                setPickerEstError('No pudimos cargar la disponibilidad. Intenta de nuevo.');
                setPickerEstDiasMap(new Map());
            } finally {
                setPickerEstLoading(false);
            }
        })();
        return () => controller.abort();
    }, [isOpen, usaPickerEstadia, servicioId, pickerEstMesActual]);

    // Sweep #2 finding [82]: accesibilidad del modal como dialog — id para
    // aria-labelledby, ref al container para el focus trap del hook.
    // Los hooks van ANTES del early return `if (!isOpen)` para respetar
    // Rules of Hooks (fix del build fail en Vercel — ambos hooks debajo
    // del return violaban la regla y ESLint mataba el build). Mismo patrón
    // que ServiceFormModal.tsx.
    //
    // Para el onClose usamos una lambda con captura tardía: `handleClose`
    // se define más abajo (usa `reset` que también vive debajo por
    // cantidad de state). El lambda no evalúa `handleClose` en render —
    // solo cuando el usuario presiona Escape (dentro del useEffect del
    // hook, corrido después del render), en cuyo punto `handleClose` ya
    // está definida en scope.
    const titleId = useId();
    const dialogContainerRef = useRef<HTMLDivElement>(null);
    useModalDialog({
        isOpen,
        onClose: () => handleClose(),
        blockClose: submitting,
        containerRef: dialogContainerRef,
    });

    if (!isOpen) return null;

    const variante = getVarianteFormulario(categoriaSlug, modalidadElegida, modoTarifa);

    // El form se oculta hasta que tengamos suficiente info para renderizar:
    //   - cuidado multi-modalidad: hasta que el tutor elija chip.
    //   - cuidado casa_tutor: hasta que el tutor elija modo (noches/horas).
    //   - V1 / V2 con modalidad auto-seleccionada: form visible al instante.
    const necesitaElegirModalidad = isCuidado && !modalidadElegida;
    const necesitaElegirModo = isCuidado && modalidadElegida === 'casa_tutor' && !modoTarifa;
    const formVisible = !necesitaElegirModalidad && !necesitaElegirModo;

    const reset = () => {
        setModalidadElegida(modalidadAutoSelect);
        setModoTarifa(null);
        setFechaPreferida('');
        setFechaFin('');
        setDuracionHoras('');
        setRegion(null);
        setComuna(null);
        setCalle('');
        setNumero('');
        setDireccionInfo('');
        setMensaje('');
        setMascotaId(null);
        setTipoMascotaTexto('');
        setOtraSeleccionada(false);
        setErrorMsg('');
        // F2 picker — dejamos mes+config+dias intactos (siguen siendo utiles
        // si el modal se reabre para el mismo servicio). Solo limpiamos la
        // seleccion + error inline.
        setRangoEst(undefined);
        setRangoEstError(null);
    };

    // F2 picker — handler de seleccion. Implementa manualmente lo que en
    // v9 haria excludeDisabled + resetOnSelect (no disponibles en v8.10.1):
    //
    //   1. resetOnSelect manual: si el rango YA esta completo (from + to
    //      distintos) y el usuario clickea otro dia, arranca rango nuevo
    //      desde ese click. react-day-picker v8 sin resetOnSelect
    //      extenderia el rango existente, comportamiento raro.
    //
    //   2. excludeDisabled manual: si el rango final incluye algun dia
    //      disabled (blackout/lleno/anticipacion/pasado), limpia con
    //      mensaje amable "elige otras noches". Sin esto, el rango
    //      podria abarcar dias no reservables.
    //
    //   3. Validacion min/max noches: si el rango cae fuera del rango
    //      valido del servicio, mostramos error inline con la cifra.
    const isDiaDisabledEst = (date: Date): boolean => {
        const ymd = ymdFromDate(date);
        const dia = pickerEstDiasMap.get(ymd);
        // Sin data (fuera del fetch actual) → no bloqueamos aca (el fetch
        // se dispara al cambiar mes; los dias del mes visible siempre
        // deberian estar en el map).
        if (!dia) return false;
        return !dia.disponible;
    };

    const handleRangeSelectEst = (
        nuevoRango: DateRange | undefined,
        triggerDate: Date
    ) => {
        setRangoEstError(null);

        // Caso 1: seleccion vacia (el usuario clickeo un dia disabled o
        // limpio el rango). react-day-picker en v8 devuelve undefined en
        // esos casos.
        if (!nuevoRango || !nuevoRango.from) {
            setRangoEst(undefined);
            return;
        }

        // Caso 2 (resetOnSelect manual — cubre TODOS los casos donde el
        // usuario tenia un rango completo y hace un click nuevo, incluyendo
        // el forward-extend que v8 acepta silenciosamente):
        //
        // Sin resetOnSelect (prop v9.14+), react-day-picker v8 con rango
        // completo trata cualquier click como extension: click ANTES del
        // from → cambia from; click DESPUES del to → extiende to. Ambos
        // son sorpresa para el usuario que espera "click nuevo = rango
        // nuevo". Usamos triggerDate (el dia realmente clickeado) para
        // detectar: si venia un rango completo, TODO click nuevo dispara
        // reset a {from: triggerDate, to: undefined} — sin importar si
        // v8 lo interpreto como forward-extend, backward-extend o restart.
        if (rangoEst?.from && rangoEst?.to) {
            const triggerIso = ymdFromDate(triggerDate);
            const diaTrigger = pickerEstDiasMap.get(triggerIso);
            if (diaTrigger && !diaTrigger.disponible) {
                // El click cayo en un dia disabled — no permitimos ni
                // arrancar rango ahi. Mantenemos el rango previo intacto.
                return;
            }
            setRangoEst({ from: triggerDate, to: undefined });
            return;
        }

        // Caso 3: rango completo (from + to). Validar excludeDisabled +
        // min/max noches antes de aceptarlo.
        if (nuevoRango.from && nuevoRango.to) {
            const desdeIso = ymdFromDate(nuevoRango.from);
            const hastaIso = ymdFromDate(nuevoRango.to);

            // 3a. excludeDisabled manual: iterar todos los dias de check-in
            //    en [desde, hasta) — hasta es el check-out, no cuenta. Si
            //    alguno tiene disponible=false, rebotar.
            let tieneDisabled = false;
            for (let cursor = desdeIso; cursor < hastaIso; cursor = shiftDate(cursor, 1)) {
                const dia = pickerEstDiasMap.get(cursor);
                if (dia && !dia.disponible) {
                    tieneDisabled = true;
                    break;
                }
            }
            if (tieneDisabled) {
                setRangoEst(undefined);
                setRangoEstError('El rango elegido incluye fechas no disponibles — elige otras noches.');
                return;
            }

            // 3b. min/max noches — validar contra config del servicio.
            const noches = nochesEntre(desdeIso, hastaIso);
            const min = pickerEstConfig?.min_noches ?? 1;
            const max = pickerEstConfig?.max_noches ?? null;
            if (noches < min) {
                setRangoEst(nuevoRango);
                setRangoEstError(
                    min === 1
                        ? 'La estadía mínima es de 1 noche.'
                        : `La estadía mínima es de ${min} noches.`
                );
                return;
            }
            if (max !== null && noches > max) {
                setRangoEst(nuevoRango);
                setRangoEstError(
                    max === 1
                        ? 'La estadía máxima es de 1 noche.'
                        : `La estadía máxima es de ${max} noches.`
                );
                return;
            }
        }

        // Caso 4: rango parcial (solo from) o completo y valido.
        setRangoEst(nuevoRango);
    };

    const handleClose = () => {
        if (submitting) return;
        reset();
        onClose();
    };
    // Los hooks de accesibilidad del modal (useId + useRef + useModalDialog)
    // están arriba del early return `if (!isOpen)` — ver bloque comentado
    // en el header del componente.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        // F2 PICKER (rango de noches) — camino paralelo al F1 picker y a
        // V1/V2/V4. La reserva nace estado='confirmada' + fecha_fin +
        // capacidad_snapshot_estadia (bandera F2). El EXCLUDE
        // agendamientos_no_solape_estadias protege contra doble-booking
        // cuando capacidad_snapshot_estadia=1; grupales (>1) tienen la
        // misma race window documentada como deuda en e2e/README.md.
        // Rebote 23P01 mapea al mismo copy "Esas noches acaban de
        // ocuparse. Elige otras." + refetch del mes visible.
        if (usaPickerEstadia) {
            if (!rangoEst || !rangoEst.from || !rangoEst.to) {
                setErrorMsg('Elige las fechas de tu estadía.');
                return;
            }
            if (rangoEstError) {
                // Ya hay un mensaje inline visible; no repetimos en el toast
                // general para no ser redundantes.
                return;
            }

            setSubmitting(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setErrorMsg('Tu sesión expiró. Te llevamos al login.');
                    // Hard redirect al login con el path actual como retorno.
                    // Hard reload (no router.push) para limpiar el estado del
                    // modal y evitar submit-en-espera al volver.
                    window.location.assign(`/login?reason=expired&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
                    return;
                }
                const { data: buscador, error: buscadorErr } = await supabase
                    .from('usuarios_buscadores')
                    .select('id, nombre')
                    .eq('auth_user_id', session.user.id)
                    .maybeSingle();
                if (buscadorErr) throw buscadorErr;
                if (!buscador) {
                    setErrorMsg('Necesitas completar tu perfil de tutor antes de reservar. Regístrate como tutor para continuar.');
                    return;
                }
                if (mensaje.length > 500) {
                    setErrorMsg('El mensaje supera el máximo de 500 caracteres.');
                    return;
                }

                const desdeIso = ymdFromDate(rangoEst.from);
                const hastaIso = ymdFromDate(rangoEst.to);
                const fechaPreferidaIso = chileMidnightUtc(desdeIso).toISOString();
                const fechaFinIso = chileMidnightUtc(hastaIso).toISOString();

                const { data: inserted, error: insertErr } = await supabase
                    .from('agendamientos')
                    .insert({
                        servicio_id: servicioId,
                        proveedor_id: proveedorId,
                        tutor_id: buscador.id,
                        fecha_preferida: fechaPreferidaIso,
                        fecha_fin: fechaFinIso,
                        estado: 'confirmada',
                        capacidad_snapshot_estadia: pickerEstConfig?.capacidad_estadia ?? capacidadEstadia ?? 1,
                        mensaje: mensaje.trim() || null,
                        mascota_id: mascotaId,
                        tipo_mascota_texto: !mascotaId && tipoMascotaTexto.trim()
                            ? tipoMascotaTexto.trim()
                            : null,
                        tutor_nombre: buscador.nombre || null,
                    })
                    .select('id')
                    .single();

                if (insertErr) {
                    // 23P01 = exclusion_violation. En F2 el constraint es
                    // agendamientos_no_solape_estadias (schema F2-1).
                    const isRebote = insertErr.code === '23P01'
                        || (insertErr.message || '').includes('agendamientos_no_solape_estadias');
                    if (isRebote) {
                        setErrorMsg('Esas noches acaban de ocuparse. Elige otras.');
                        setRangoEst(undefined);
                        setRangoEstError(null);
                        // Refetch inline del mes visible para reflejar la
                        // reserva ajena que se acaba de crear.
                        try {
                            const desde = primerDiaDelMes(pickerEstMesActual);
                            const [y, m] = pickerEstMesActual.split('-').map(Number);
                            const proxMesFirst = m === 12
                                ? `${y + 1}-01-01`
                                : `${y}-${String(m + 1).padStart(2, '0')}-01`;
                            const hastaFetch = ultimoDiaDelMes(proxMesFirst);
                            const r = await fetch(
                                `/api/servicios/${servicioId}/disponibilidad-noches?desde=${desde}&hasta=${hastaFetch}`
                            );
                            if (r.ok) {
                                const data = (await r.json()) as DisponibilidadNochesResponse;
                                const map = new Map<string, DiaCalendarioEstadia>();
                                for (const d of data.dias) map.set(d.fecha, d);
                                setPickerEstDiasMap(map);
                                setPickerEstConfig(data.config);
                            }
                        } catch { /* silencioso — el toast ya explico */ }
                        return;
                    }
                    if (insertErr.code === '23505') {
                        setErrorMsg('Ya tienes una reserva para estas fechas.');
                        return;
                    }
                    throw insertErr;
                }

                if (inserted?.id) {
                    // Mismo par de notify que F1 picker. El endpoint
                    // notify-tutor-reserva-confirmada acepta F2 por el
                    // guard capacidad_snapshot_estadia != null (F2-3-B).
                    fetch('/api/agendamientos/notify-proveedor', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({ agendamientoId: inserted.id }),
                    }).catch(err => console.warn('[picker-estadia] notify-proveedor fallo:', err));

                    fetch('/api/agendamientos/notify-tutor-reserva-confirmada', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({ agendamientoId: inserted.id }),
                    }).catch(err => console.warn('[picker-estadia] notify-tutor-reserva-confirmada fallo:', err));

                    supabase
                        .from('conversations')
                        .update({ agendamiento_id: inserted.id })
                        .eq('client_id', session.user.id)
                        .eq('servicio_id', servicioId)
                        .then(({ error }) => {
                            if (error) console.warn('[picker-estadia] vinculo conv fallo:', error);
                        });
                }

                toast.success('Reserva confirmada. El proveedor recibirá el aviso por email.', {
                    action: {
                        label: 'Ver mis reservas',
                        onClick: () => { window.location.href = '/mis-solicitudes'; },
                    },
                    duration: 8000,
                });
                reset();
                onClose();
            } catch (err: any) {
                console.error('[picker-estadia] insert error:', err);
                setErrorMsg(err?.message || 'Hubo un error al reservar. Intenta de nuevo.');
            } finally {
                setSubmitting(false);
            }
            return;
        }

        // F1 PICKER — camino paralelo al de las variantes V1/V2/V4. La
        // solicitud nace estado='confirmada' + duracion_min + capacidad_snapshot
        // poblados desde el servicio. El EXCLUDE constraint en BD protege
        // contra doble-booking en capacidad=1; grupales (>1) tienen race
        // window pequena que F1.5 va a cubrir con endpoint POST + advisory
        // lock. Este camino NO usa las validaciones de fecha/direccion/modo
        // — no aplican.
        if (usaPicker) {
            if (!slotElegido) {
                setErrorMsg('Elige un horario disponible.');
                return;
            }

            setSubmitting(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setErrorMsg('Tu sesión expiró. Te llevamos al login.');
                    // Hard redirect al login con el path actual como retorno.
                    // Hard reload (no router.push) para limpiar el estado del
                    // modal y evitar submit-en-espera al volver.
                    window.location.assign(`/login?reason=expired&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
                    return;
                }
                const { data: buscador, error: buscadorErr } = await supabase
                    .from('usuarios_buscadores')
                    .select('id, nombre')
                    .eq('auth_user_id', session.user.id)
                    .maybeSingle();
                if (buscadorErr) throw buscadorErr;
                if (!buscador) {
                    setErrorMsg('Necesitas completar tu perfil de tutor antes de reservar. Regístrate como tutor para continuar.');
                    return;
                }

                if (mensaje.length > 500) {
                    setErrorMsg('El mensaje supera el máximo de 500 caracteres.');
                    return;
                }

                // Convertir wall-clock chileno del slot → ISO UTC absoluto.
                // Uso la misma tecnica que lib/slotsAgenda.ts: crear como UTC,
                // medir la wall clock chilena, diferencia = offset, corregir.
                const [y, m, d] = slotElegido.fecha.split('-').map(Number);
                const [hh, mm] = slotElegido.hora_inicio.split(':').map(Number);
                const guessUtcMs = Date.UTC(y, m - 1, d, hh, mm);
                const parts = new Intl.DateTimeFormat('sv-SE', {
                    timeZone: CHILE_TZ,
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    hour12: false,
                }).formatToParts(new Date(guessUtcMs));
                const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10);
                const chileWallMs = Date.UTC(
                    get('year'), get('month') - 1, get('day'),
                    get('hour'), get('minute'), get('second')
                );
                const fechaPreferidaIso = new Date(guessUtcMs - (chileWallMs - guessUtcMs)).toISOString();

                const { data: inserted, error: insertErr } = await supabase
                    .from('agendamientos')
                    .insert({
                        servicio_id: servicioId,
                        proveedor_id: proveedorId,
                        tutor_id: buscador.id,
                        fecha_preferida: fechaPreferidaIso,
                        estado: 'confirmada',
                        duracion_min: duracionSlotMin,
                        capacidad_snapshot: capacidadSlot ?? 1,
                        mensaje: mensaje.trim() || null,
                        mascota_id: mascotaId,
                        tipo_mascota_texto: !mascotaId && tipoMascotaTexto.trim()
                            ? tipoMascotaTexto.trim()
                            : null,
                        // F1 agenda: denormalizacion del nombre del tutor.
                        // RLS de usuarios_buscadores es owner-only — el proveedor
                        // no puede leer via join. Guardamos aca el nombre al
                        // momento del INSERT (patron espejo de
                        // evaluaciones.nombre_autor). Ver migration
                        // 20260714_agendamientos_tutor_nombre.sql.
                        tutor_nombre: buscador.nombre || null,
                    })
                    .select('id')
                    .single();

                if (insertErr) {
                    // Rebote del EXCLUDE constraint: alguien tomo el slot
                    // entre nuestro fetch y el INSERT. Postgres devuelve
                    // 23P01 (exclusion_violation). Codigo constraint es
                    // 'agendamientos_no_solape_confirmadas'.
                    const isRebote = insertErr.code === '23P01'
                        || (insertErr.message || '').includes('agendamientos_no_solape_confirmadas');
                    if (isRebote) {
                        setErrorMsg('Ese horario acaba de ocuparse. Elige otro.');
                        setSlotElegido(null);
                        // Refetch de slots — trigger via bump del pickerDesde
                        // a si mismo forzando re-run del useEffect. Truco:
                        // shiftear 0 dias produce el mismo string, no re-run.
                        // Uso una key ficticia mediante set-same-value que
                        // React igual dispara si el ref cambia. La forma
                        // limpia: refetch inline.
                        try {
                            const hoy = localTodayIso();
                            const topeMax = anticipacionMaxDias
                                ? shiftDate(hoy, anticipacionMaxDias)
                                : shiftDate(hoy, 90);
                            let hasta = shiftDate(pickerDesde, 6);
                            if (hasta > topeMax) hasta = topeMax;
                            if (hasta < pickerDesde) hasta = pickerDesde;
                            const r = await fetch(
                                `/api/servicios/${servicioId}/slots?desde=${pickerDesde}&hasta=${hasta}`
                            );
                            if (r.ok) setPickerSlots(await r.json());
                        } catch { /* silencioso — el toast ya explico */ }
                        return;
                    }
                    if (insertErr.code === '23505') {
                        setErrorMsg('Ya tienes una solicitud pendiente para este servicio.');
                        return;
                    }
                    throw insertErr;
                }

                if (inserted?.id) {
                    // Email al proveedor — mismo endpoint, el copy se ajusta
                    // server-side segun estado='confirmada' vs 'pendiente'.
                    fetch('/api/agendamientos/notify-proveedor', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({ agendamientoId: inserted.id }),
                    }).catch(err => console.warn('[picker] notify-proveedor fallo:', err));

                    // F1.5 — email de comprobante al tutor. Solo para el
                    // picker (endpoint gated por duracion_min IS NOT NULL).
                    // Fire-and-forget en paralelo al del proveedor.
                    fetch('/api/agendamientos/notify-tutor-reserva-confirmada', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({ agendamientoId: inserted.id }),
                    }).catch(err => console.warn('[picker] notify-tutor-reserva-confirmada fallo:', err));

                    // Vinculo conversation → agendamiento (idem V1/V2/V4).
                    supabase
                        .from('conversations')
                        .update({ agendamiento_id: inserted.id })
                        .eq('client_id', session.user.id)
                        .eq('servicio_id', servicioId)
                        .then(({ error }) => {
                            if (error) console.warn('[picker] vinculo conv fallo:', error);
                        });
                }

                toast.success('Reserva confirmada. El proveedor recibirá el aviso por email.', {
                    action: {
                        label: 'Ver mis reservas',
                        onClick: () => { window.location.href = '/mis-solicitudes'; },
                    },
                    duration: 8000,
                });
                reset();
                onClose();
            } catch (err: any) {
                console.error('[picker] insert error:', err);
                setErrorMsg(err?.message || 'Hubo un error al reservar. Intenta de nuevo.');
            } finally {
                setSubmitting(false);
            }
            return;
        }

        if (necesitaElegirModalidad) {
            setErrorMsg('Selecciona cómo quieres el cuidado.');
            return;
        }
        if (necesitaElegirModo) {
            setErrorMsg('Selecciona si el servicio será por noches o por horas.');
            return;
        }

        // Validacion + armado de payload por variante. Cada variante setea
        // las columnas que persiste; el resto queda null en el INSERT.
        let fechaInicioIso: string;
        let fechaFinIso: string | null = null;
        let duracionInt: number | null = null;
        // Ola 1: direccion estructurada (5 campos). Se popula solo V4a/V4b.
        let calleTrim: string | null = null;
        let numeroTrim: string | null = null;
        let direccionInfoTrim: string | null = null;

        if (variante === 'V2' || variante === 'V4a') {
            // 2 inputs date sin hora — parsear como medianoche local.
            if (!fechaPreferida || !fechaFin) {
                setErrorMsg('Selecciona la fecha de inicio y la fecha de término.');
                return;
            }
            const inicioDate = new Date(`${fechaPreferida}T00:00:00`);
            const finDate = new Date(`${fechaFin}T00:00:00`);
            if (Number.isNaN(inicioDate.getTime()) || Number.isNaN(finDate.getTime())) {
                setErrorMsg('Las fechas seleccionadas no son válidas.');
                return;
            }
            const hoyMidnight = new Date();
            hoyMidnight.setHours(0, 0, 0, 0);
            if (inicioDate.getTime() < hoyMidnight.getTime()) {
                setErrorMsg('La fecha de inicio debe ser desde hoy en adelante.');
                return;
            }
            if (finDate.getTime() <= inicioDate.getTime()) {
                setErrorMsg('La fecha de término debe ser posterior a la de inicio.');
                return;
            }
            fechaInicioIso = inicioDate.toISOString();
            fechaFinIso = finDate.toISOString();
        } else if (variante === 'V4b') {
            // datetime-local + duracion en horas.
            if (!fechaPreferida) {
                setErrorMsg('Selecciona una fecha y hora.');
                return;
            }
            const fechaDate = new Date(fechaPreferida);
            if (Number.isNaN(fechaDate.getTime()) || fechaDate.getTime() <= Date.now()) {
                setErrorMsg('La fecha y hora deben ser futuras.');
                return;
            }
            const horasNum = parseInt(duracionHoras, 10);
            if (!Number.isFinite(horasNum) || horasNum < DURACION_MIN_HORAS || horasNum > DURACION_MAX_HORAS) {
                setErrorMsg(`Indica la duración en horas (entre ${DURACION_MIN_HORAS} y ${DURACION_MAX_HORAS}).`);
                return;
            }
            fechaInicioIso = fechaDate.toISOString();
            duracionInt = horasNum;
        } else {
            // V1
            if (!fechaPreferida) {
                setErrorMsg('Selecciona una fecha y hora preferida.');
                return;
            }
            const fechaDate = new Date(fechaPreferida);
            if (Number.isNaN(fechaDate.getTime()) || fechaDate.getTime() <= Date.now()) {
                setErrorMsg('La fecha y hora deben ser futuras.');
                return;
            }
            fechaInicioIso = fechaDate.toISOString();
        }

        // Direccion estructurada (Ola 1) requerida en V4a y V4b.
        // Region + comuna + calle + numero obligatorios. Info adicional
        // opcional. Numero acepta texto ("S/N", "1290-A", "12 Bis").
        if (variante === 'V4a' || variante === 'V4b') {
            if (!region) {
                setErrorMsg('Selecciona la región.');
                return;
            }
            if (!comuna) {
                setErrorMsg('Selecciona la comuna.');
                return;
            }
            const c = calle.trim();
            if (c.length < CALLE_MIN_CHARS) {
                setErrorMsg('Ingresa la calle.');
                return;
            }
            if (c.length > CALLE_MAX_CHARS) {
                setErrorMsg(`La calle supera el máximo de ${CALLE_MAX_CHARS} caracteres.`);
                return;
            }
            const n = numero.trim();
            if (n.length < NUMERO_MIN_CHARS) {
                setErrorMsg('Ingresa el número (puedes poner "S/N" si la dirección no tiene).');
                return;
            }
            if (n.length > NUMERO_MAX_CHARS) {
                setErrorMsg(`El número supera el máximo de ${NUMERO_MAX_CHARS} caracteres.`);
                return;
            }
            const info = direccionInfo.trim();
            if (info.length > DIRECCION_INFO_MAX_CHARS) {
                setErrorMsg(`La info adicional supera el máximo de ${DIRECCION_INFO_MAX_CHARS} caracteres.`);
                return;
            }
            calleTrim = c;
            numeroTrim = n;
            direccionInfoTrim = info || null;
        }

        if (mensaje.length > 500) {
            setErrorMsg('El mensaje supera el máximo de 500 caracteres.');
            return;
        }

        setSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setErrorMsg('Tu sesión expiró. Recarga la página e inicia sesión de nuevo.');
                return;
            }

            const { data: buscador, error: buscadorErr } = await supabase
                .from('usuarios_buscadores')
                .select('id, nombre')
                .eq('auth_user_id', session.user.id)
                .maybeSingle();

            if (buscadorErr) throw buscadorErr;
            if (!buscador) {
                setErrorMsg('Necesitas completar tu perfil de tutor antes de reservar. Regístrate como tutor para continuar.');
                return;
            }

            // INSERT — pobla columnas segun variante. Las que no aplican
            // quedan null. modalidad_elegida se popula siempre que isCuidado
            // (incluyendo V2 con casa_cuidador o recinto — info util para
            // el proveedor, no breaking para Fase 1 historica).
            //
            // Ola 1: las nuevas solicitudes V4a/V4b pueblan region+comuna+
            // calle+numero+direccion_info y dejan direccion_servicio=null.
            // El campo direccion_servicio legacy sigue existiendo en BD
            // pero ya no se popula desde el modal — los renders/emails
            // tienen branching que cae a el solo si los 5 estructurados
            // estan null (filas historicas de Fase 2).
            const esV4 = variante === 'V4a' || variante === 'V4b';
            const { data: inserted, error: insertErr } = await supabase
                .from('agendamientos')
                .insert({
                    servicio_id: servicioId,
                    proveedor_id: proveedorId,
                    tutor_id: buscador.id,
                    fecha_preferida: fechaInicioIso,
                    fecha_fin: fechaFinIso,
                    modalidad_elegida: isCuidado ? modalidadElegida : null,
                    modo_tarifa: variante === 'V4a' ? 'noches' : variante === 'V4b' ? 'horas' : null,
                    duracion_horas: duracionInt,
                    direccion_servicio: null,
                    region: esV4 ? region : null,
                    comuna: esV4 ? comuna : null,
                    calle: esV4 ? calleTrim : null,
                    numero: esV4 ? numeroTrim : null,
                    direccion_info: esV4 ? direccionInfoTrim : null,
                    mensaje: mensaje.trim() || null,
                    // Feature mascotas: mutuamente exclusivos por UI. Si el tutor
                    // eligió ficha real → mascota_id set, tipo_mascota_texto null.
                    // Si eligió "otra" o no tiene fichas y escribió texto → mascota_id
                    // null, tipo_mascota_texto set. Si no seleccionó nada → ambos null
                    // (retrocompat con solicitudes sin mascota).
                    mascota_id: mascotaId,
                    tipo_mascota_texto: !mascotaId && tipoMascotaTexto.trim()
                        ? tipoMascotaTexto.trim()
                        : null,
                    // F1 agenda — denormalizacion del nombre del tutor
                    // (patron espejo de evaluaciones.nombre_autor). RLS de
                    // usuarios_buscadores es owner-only; el proveedor no
                    // puede leer via join. Ver migration
                    // 20260714_agendamientos_tutor_nombre.sql.
                    tutor_nombre: buscador.nombre || null,
                })
                .select('id')
                .single();

            if (insertErr) throw insertErr;

            if (inserted?.id) {
                fetch('/api/agendamientos/notify-proveedor', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ agendamientoId: inserted.id }),
                }).catch(err => console.warn('[SolicitarAgendamientoModal] notify-proveedor falló:', err));

                // Vinculo conversation → agendamiento (modelo b, punto 1).
                // Si YA existe conversation entre este tutor y este servicio,
                // apuntamos su agendamiento_id a la solicitud recien creada
                // (la "activa" pasa a ser la mas reciente). Si no hay conv,
                // no forzamos crearla — el chat nace cuando alguien escribe.
                // Match por (client_id, servicio_id): un servicio tiene un
                // solo proveedor, asi que ese par ya identifica la conv sin
                // necesidad de resolver sitter_id (auth_user_id del proveedor).
                // Fire-and-forget: el vinculo es contexto, no critico.
                supabase
                    .from('conversations')
                    .update({ agendamiento_id: inserted.id })
                    .eq('client_id', session.user.id)
                    .eq('servicio_id', servicioId)
                    .then(({ error }) => {
                        if (error) console.warn('[SolicitarAgendamientoModal] vinculo conv-agendamiento falló:', error);
                    });
            }

            toast.success('Solicitud enviada. El proveedor te responderá pronto.', {
                action: {
                    label: 'Ver mis reservas',
                    onClick: () => { window.location.href = '/mis-solicitudes'; },
                },
                duration: 8000,
            });
            reset();
            onClose();
        } catch (err: any) {
            console.error('[SolicitarAgendamientoModal] insert error:', err);
            if (err?.code === '23505') {
                setErrorMsg(
                    'Ya tienes una solicitud pendiente para este servicio. ' +
                    'Espera a que el proveedor responda, o revísala desde "Mis reservas".'
                );
                return;
            }
            setErrorMsg(err?.message || 'Hubo un error al enviar la solicitud. Intenta de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    const minDt = minDateTimeLocal();
    const minD = minDateLocal();

    // Render helpers — chip y toggle siguen el mismo patron visual: button
    // group con estado seleccionado en accent-600, no seleccionado en slate.
    const renderChipModalidad = (mod: ModalidadCuidado) => {
        const selected = modalidadElegida === mod;
        return (
            <button
                key={mod}
                role="radio"
                aria-checked={selected}
                type="button"
                onClick={() => setModalidadElegida(mod)}
                disabled={submitting}
                className={`text-sm font-medium px-3 py-2 rounded-xl border transition-colors ${
                    selected
                        ? 'bg-accent-600 text-white border-accent-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
            >
                {MODALIDAD_LABELS[mod]}
            </button>
        );
    };

    const renderToggleModo = (modo: ModoTarifa, label: string) => {
        const selected = modoTarifa === modo;
        return (
            <button
                key={modo}
                role="radio"
                aria-checked={selected}
                type="button"
                onClick={() => setModoTarifa(modo)}
                disabled={submitting}
                className={`flex-1 text-sm font-medium px-3 py-2 rounded-xl border transition-colors ${
                    selected
                        ? 'bg-accent-600 text-white border-accent-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
            >
                {label}
            </button>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div
                ref={dialogContainerRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden relative max-h-[95vh] flex flex-col"
            >

                {/* Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-start gap-3 shrink-0">
                    <div className="min-w-0">
                        <h2 id={titleId} className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                            <Calendar size={20} className="text-accent-600 shrink-0" />
                            {usaPicker
                                ? 'Reservar horario'
                                : usaPickerEstadia
                                    ? 'Reservar estadía'
                                    : 'Solicitar servicio'}
                        </h2>
                        <p className="text-sm text-slate-500 truncate mt-0.5">{serviceTitle}</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={submitting}
                        aria-label="Cerrar"
                        className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">

                    {/* F2 PICKER — calendario range (react-day-picker) para
                        cuidado con capacidad_estadia populada. Reemplaza los
                        datepickers V2/V4a. Los otros bloques del form
                        (mascota, mensaje) quedan iguales debajo. */}
                    {usaPickerEstadia && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">
                                Elige las noches de tu estadía <span className="text-red-500">*</span>
                            </label>

                            {/* Hints de config del servicio (min/max noches + check-in/out).
                                Se pintan una vez que el fetch devolvio la config. */}
                            {pickerEstConfig && (
                                <div className="text-xs text-slate-500 mb-3 space-y-0.5">
                                    <p>
                                        {pickerEstConfig.max_noches
                                            ? (pickerEstConfig.min_noches === pickerEstConfig.max_noches
                                                ? `Estadía de exactamente ${pickerEstConfig.min_noches} ${pickerEstConfig.min_noches === 1 ? 'noche' : 'noches'}.`
                                                : `Estadía entre ${pickerEstConfig.min_noches} y ${pickerEstConfig.max_noches} noches.`)
                                            : (pickerEstConfig.min_noches === 1
                                                ? 'Mínimo 1 noche.'
                                                : `Mínimo ${pickerEstConfig.min_noches} noches.`)}
                                    </p>
                                    {(pickerEstConfig.check_in_hora || pickerEstConfig.check_out_hora) ? (
                                        <p>
                                            {pickerEstConfig.check_in_hora && (
                                                <>Check-in: <strong>{pickerEstConfig.check_in_hora.slice(0, 5)}</strong></>
                                            )}
                                            {pickerEstConfig.check_in_hora && pickerEstConfig.check_out_hora && ' · '}
                                            {pickerEstConfig.check_out_hora && (
                                                <>Check-out: <strong>{pickerEstConfig.check_out_hora.slice(0, 5)}</strong></>
                                            )}
                                        </p>
                                    ) : (
                                        <p>Check-in y check-out se coordinan por chat.</p>
                                    )}
                                </div>
                            )}

                            {pickerEstLoading && pickerEstDiasMap.size === 0 ? (
                                <div className="h-64 bg-slate-100 rounded-xl animate-pulse flex items-center justify-center">
                                    <Loader2 size={20} className="text-slate-400 animate-spin" />
                                </div>
                            ) : pickerEstError ? (
                                <div role="alert" aria-live="polite" className="p-3 bg-danger-50 border border-danger-100 rounded-lg text-sm text-danger-700">
                                    {pickerEstError}
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-xl p-2 sm:p-3 bg-white">
                                    <DayPicker
                                        mode="range"
                                        numberOfMonths={pickerEstMonths}
                                        selected={rangoEst}
                                        onSelect={handleRangeSelectEst}
                                        disabled={isDiaDisabledEst}
                                        month={new Date(`${pickerEstMesActual}T00:00:00`)}
                                        onMonthChange={(date) => {
                                            const y = date.getFullYear();
                                            const m = String(date.getMonth() + 1).padStart(2, '0');
                                            setPickerEstMesActual(`${y}-${m}-01`);
                                            // Al cambiar mes no reseteamos la seleccion —
                                            // el rango puede cruzar meses.
                                        }}
                                        locale={es}
                                        weekStartsOn={1}
                                        fromDate={new Date()}
                                        showOutsideDays={false}
                                    />
                                </div>
                            )}

                            {/* Preview del rango seleccionado (solo cuando completo). */}
                            {rangoEst?.from && rangoEst?.to && !rangoEstError && (
                                <div className="mt-3 p-3 bg-accent-50 border border-accent-100 rounded-lg">
                                    <p className="text-sm text-accent-900 font-medium">
                                        {formatRangoNoches(
                                            chileMidnightUtc(ymdFromDate(rangoEst.from)).toISOString(),
                                            chileMidnightUtc(ymdFromDate(rangoEst.to)).toISOString()
                                        )}
                                    </p>
                                </div>
                            )}

                            {/* Error inline (rango con dias disabled / fuera de min-max). */}
                            {rangoEstError && (
                                <p role="alert" aria-live="polite" className="mt-3 text-sm text-danger-700 font-medium">
                                    {rangoEstError}
                                </p>
                            )}

                            <p className="text-xs text-slate-500 mt-3">
                                La reserva queda confirmada al instante en las noches que elijas.
                            </p>
                        </div>
                    )}

                    {/* F1 PICKER — strip de dias + grid de slots del dia elegido.
                        Reemplaza el datetime-local V1 cuando el servicio tiene
                        duracion_slot_min NOT NULL. Los otros bloques del form
                        (mascota, mensaje) quedan iguales debajo. */}
                    {usaPicker && (() => {
                        const strip = Array.from({ length: 7 }, (_, i) => shiftDate(pickerDesde, i));
                        const hoy = localTodayIso();
                        const topeMax = anticipacionMaxDias ? shiftDate(hoy, anticipacionMaxDias) : shiftDate(hoy, 90);
                        const puedeIrAtras = pickerDesde > hoy;
                        const proximoDesde = shiftDate(pickerDesde, 7);
                        const puedeIrAdelante = proximoDesde <= topeMax;

                        const slotsDelDia = pickerSlots.filter(s => s.fecha === pickerDiaElegido);
                        const slotsPorDia = new Map<string, SlotDelPicker[]>();
                        for (const s of pickerSlots) {
                            const list = slotsPorDia.get(s.fecha) ?? [];
                            list.push(s);
                            slotsPorDia.set(s.fecha, list);
                        }
                        const cuentaDisponibles = (fecha: string) =>
                            (slotsPorDia.get(fecha) ?? []).filter(s => s.disponible).length;

                        return (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-3">
                                    Elige un horario <span className="text-red-500">*</span>
                                </label>

                                {/* Navegacion semana */}
                                <div className="flex items-center justify-between mb-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nuevo = shiftDate(pickerDesde, -7);
                                            const clamp = nuevo < hoy ? hoy : nuevo;
                                            setPickerDesde(clamp);
                                            setPickerDiaElegido(clamp);
                                            setSlotElegido(null);
                                        }}
                                        disabled={!puedeIrAtras || pickerLoading || submitting}
                                        className="text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1"
                                    >
                                        ← Semana anterior
                                    </button>
                                    <span className="text-xs text-slate-500">
                                        {nombreMesCorto(pickerDesde)} {diaNumero(pickerDesde)} – {nombreMesCorto(shiftDate(pickerDesde, 6))} {diaNumero(shiftDate(pickerDesde, 6))}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPickerDesde(proximoDesde);
                                            setPickerDiaElegido(proximoDesde);
                                            setSlotElegido(null);
                                        }}
                                        disabled={!puedeIrAdelante || pickerLoading || submitting}
                                        className="text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1"
                                    >
                                        Semana siguiente →
                                    </button>
                                </div>

                                {/* Strip dias */}
                                <div role="radiogroup" aria-label="Elige el día" className="grid grid-cols-7 gap-1.5 mb-4">
                                    {strip.map(fecha => {
                                        const count = cuentaDisponibles(fecha);
                                        const isSel = fecha === pickerDiaElegido;
                                        return (
                                            <button
                                                key={fecha}
                                                role="radio"
                                                aria-checked={isSel}
                                                type="button"
                                                onClick={() => {
                                                    setPickerDiaElegido(fecha);
                                                    setSlotElegido(null);
                                                }}
                                                disabled={submitting}
                                                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-colors ${
                                                    isSel
                                                        ? 'bg-accent-600 text-white border-accent-600'
                                                        : count > 0
                                                            ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                                            : 'bg-slate-50 text-slate-400 border-slate-100'
                                                }`}
                                            >
                                                <span className={`text-[10px] uppercase tracking-wider ${isSel ? 'text-white/80' : 'text-slate-400'}`}>
                                                    {nombreDiaCorto(fecha)}
                                                </span>
                                                <span className="text-base font-semibold">{diaNumero(fecha)}</span>
                                                <span className={`text-[10px] mt-0.5 ${isSel ? 'text-white/80' : count > 0 ? 'text-accent-700' : 'text-slate-400'}`}>
                                                    {count > 0 ? `${count} libre${count === 1 ? '' : 's'}` : '—'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Grid slots del dia elegido */}
                                {pickerLoading ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {[1, 2, 3, 4, 5, 6].map(i => (
                                            <div key={i} className="h-11 bg-slate-100 rounded-xl animate-pulse" />
                                        ))}
                                    </div>
                                ) : pickerError ? (
                                    <div role="alert" aria-live="polite" className="p-3 bg-danger-50 border border-danger-100 rounded-lg text-sm text-danger-700">
                                        {pickerError}
                                    </div>
                                ) : slotsDelDia.length === 0 ? (
                                    <p className="text-sm text-slate-500 py-4 text-center">
                                        Este día no tiene horarios disponibles.
                                    </p>
                                ) : slotsDelDia.every(s => !s.disponible) ? (
                                    <p className="text-sm text-slate-500 py-4 text-center">
                                        Todos los horarios de este día están ocupados o fuera del plazo de reserva.
                                    </p>
                                ) : (
                                    <div role="radiogroup" aria-label="Elige un horario" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {slotsDelDia.map(s => {
                                            const isSel = slotElegido?.fecha === s.fecha && slotElegido?.hora_inicio === s.hora_inicio;
                                            return (
                                                <button
                                                    key={`${s.fecha}-${s.hora_inicio}`}
                                                    role="radio"
                                                    aria-checked={isSel}
                                                    type="button"
                                                    disabled={!s.disponible || submitting}
                                                    onClick={() => setSlotElegido(s)}
                                                    className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                                                        isSel
                                                            ? 'bg-accent-600 text-white border-accent-600'
                                                            : s.disponible
                                                                ? 'bg-white text-slate-700 border-slate-200 hover:border-accent-600 hover:bg-accent-50'
                                                                : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through'
                                                    }`}
                                                    title={s.disponible ? '' : 'No disponible'}
                                                >
                                                    {s.hora_inicio}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                <p className="text-xs text-slate-500 mt-2">
                                    La reserva queda confirmada al instante en el horario que elijas.
                                </p>
                            </div>
                        );
                    })()}

                    {/* Chip selector — solo cuidado con multiples modalidades */}
                    {!usaPicker && !usaPickerEstadia && requiereChipSelector && (
                        <div>
                            <label id="modalidad-cuidado-label" className="block text-sm font-medium text-slate-700 mb-2">
                                ¿Cómo quieres el cuidado? <span className="text-red-500">*</span>
                            </label>
                            <div role="radiogroup" aria-labelledby="modalidad-cuidado-label" className="flex flex-wrap gap-2">
                                {modalidadesValidas.map(renderChipModalidad)}
                            </div>
                        </div>
                    )}

                    {/* Toggle noches/horas — solo casa_tutor */}
                    {!usaPicker && !usaPickerEstadia && isCuidado && modalidadElegida === 'casa_tutor' && (
                        <div>
                            <label id="modo-tarifa-label" className="block text-sm font-medium text-slate-700 mb-2">
                                ¿Cuánto dura el servicio? <span className="text-red-500">*</span>
                            </label>
                            <div role="radiogroup" aria-labelledby="modo-tarifa-label" className="flex gap-2">
                                {renderToggleModo('noches', 'Por noches (estadía multi-día)')}
                                {renderToggleModo('horas', 'Por horas (un día puntual)')}
                            </div>
                        </div>
                    )}

                    {/* Form de fechas — varia segun variante */}
                    {!usaPicker && !usaPickerEstadia && formVisible && (variante === 'V2' || variante === 'V4a') && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="agend-fecha-inicio" className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Fecha de inicio <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="agend-fecha-inicio"
                                    name="agend-fecha-inicio"
                                    type="date"
                                    value={fechaPreferida}
                                    onChange={e => setFechaPreferida(e.target.value)}
                                    min={minD}
                                    required
                                    className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                />
                            </div>
                            <div>
                                <label htmlFor="agend-fecha-fin" className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Fecha de término <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="agend-fecha-fin"
                                    name="agend-fecha-fin"
                                    type="date"
                                    value={fechaFin}
                                    onChange={e => setFechaFin(e.target.value)}
                                    min={fechaPreferida || minD}
                                    required
                                    className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed sm:col-span-2">
                                Período de cuidado (sin hora). El horario de entrega y retiro lo coordinas con el proveedor por chat una vez confirmada la solicitud.
                            </p>
                        </div>
                    )}

                    {!usaPicker && !usaPickerEstadia && formVisible && variante === 'V4b' && (
                        <>
                            <div>
                                <label htmlFor="agend-fecha-hora" className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Fecha y hora <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="agend-fecha-hora"
                                    name="agend-fecha-hora"
                                    type="datetime-local"
                                    value={fechaPreferida}
                                    onChange={e => setFechaPreferida(e.target.value)}
                                    min={minDt}
                                    required
                                    className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                />
                            </div>
                            <div>
                                <label htmlFor="agend-duracion" className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Duración en horas <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="agend-duracion"
                                    name="agend-duracion"
                                    type="number"
                                    inputMode="numeric"
                                    value={duracionHoras}
                                    onChange={e => setDuracionHoras(e.target.value)}
                                    min={DURACION_MIN_HORAS}
                                    max={DURACION_MAX_HORAS}
                                    step={1}
                                    placeholder="Ej: 3"
                                    required
                                    className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                />
                                <p className="text-xs text-slate-500 mt-1">Entre {DURACION_MIN_HORAS} y {DURACION_MAX_HORAS} horas.</p>
                            </div>
                        </>
                    )}

                    {!usaPicker && !usaPickerEstadia && formVisible && variante === 'V1' && (
                        <div>
                            <label htmlFor="agend-fecha" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Fecha y hora preferida <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="agend-fecha"
                                name="agend-fecha"
                                type="datetime-local"
                                value={fechaPreferida}
                                onChange={e => setFechaPreferida(e.target.value)}
                                min={minDt}
                                required
                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                            />
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Cuándo te gustaría recibir el servicio. El proveedor confirmará o propondrá otra opción.
                            </p>
                        </div>
                    )}

                    {/* Direccion estructurada — solo V4a/V4b (modalidad
                        casa_tutor). Ola 1: region+comuna via picker
                        encadenado, calle/numero/info en inputs. */}
                    {!usaPicker && !usaPickerEstadia && formVisible && (variante === 'V4a' || variante === 'V4b') && (
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-slate-700 inline-flex items-center gap-1.5">
                                <Home size={14} className="text-slate-500" />
                                Dirección donde se prestará el servicio
                            </p>

                            <RegionComunaPicker
                                region={region}
                                comuna={comuna}
                                onChange={next => {
                                    setRegion(next.region);
                                    setComuna(next.comuna);
                                }}
                                required
                                disabled={submitting}
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
                                <div>
                                    <label htmlFor="agend-calle" className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Calle <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="agend-calle"
                                        name="agend-calle"
                                        type="text"
                                        value={calle}
                                        onChange={e => setCalle(e.target.value)}
                                        maxLength={CALLE_MAX_CHARS}
                                        placeholder="Ej: Mayecura"
                                        required
                                        className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="agend-numero" className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Número <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="agend-numero"
                                        name="agend-numero"
                                        type="text"
                                        value={numero}
                                        onChange={e => setNumero(e.target.value)}
                                        maxLength={NUMERO_MAX_CHARS}
                                        placeholder='Ej: 1290 o "S/N"'
                                        required
                                        className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="agend-direccion-info" className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Información adicional <span className="text-slate-400 font-normal text-xs">(opcional)</span>
                                </label>
                                <input
                                    id="agend-direccion-info"
                                    name="agend-direccion-info"
                                    type="text"
                                    value={direccionInfo}
                                    onChange={e => setDireccionInfo(e.target.value)}
                                    maxLength={DIRECCION_INFO_MAX_CHARS}
                                    placeholder="Ej: Depto 502 torre B, casa interior, timbre 3 veces"
                                    className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                />
                                <p className="text-xs text-slate-500 mt-1 text-right">{direccionInfo.length} / {DIRECCION_INFO_MAX_CHARS}</p>
                            </div>
                        </div>
                    )}

                    {/* Selector de mascota — Feature "fichas de mascotas → solicitud":
                        Si el tutor tiene fichas: dropdown con sus mascotas + opción "Otra"
                        que revela input libre. Si no tiene: input libre directo + CTA
                        "Agregar una mascota". Ficha vs texto son mutuamente exclusivos. */}
                    <div>
                        <label htmlFor="agend-mascota" className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <PawPrint size={14} className="text-slate-400" />
                            ¿Para cuál de tus mascotas? (opcional)
                        </label>
                        {misMascotas.length > 0 ? (
                            <>
                                {/* Chip selector: cada mascota es un chip con mini-foto + nombre.
                                    Nativo <select> no soporta imagenes; el chip pattern ya se
                                    usa en el resto de la app (modalidad, tamanos, etc). */}
                                <div id="agend-mascota" className="flex flex-wrap gap-2">
                                    {misMascotas.map(m => {
                                        const selected = !otraSeleccionada && mascotaId === m.id;
                                        return (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => {
                                                    setOtraSeleccionada(false);
                                                    setMascotaId(m.id);
                                                    setTipoMascotaTexto('');
                                                }}
                                                disabled={submitting}
                                                className={`inline-flex items-center gap-2 rounded-xl border py-1.5 pl-1.5 pr-3 text-sm font-medium transition-colors ${
                                                    selected
                                                        ? 'bg-accent-600 text-white border-accent-600'
                                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                {m.foto_mascota ? (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img
                                                        src={m.foto_mascota}
                                                        alt=""
                                                        className="w-7 h-7 rounded-lg object-cover shrink-0"
                                                    />
                                                ) : (
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                        <PawPrint size={14} />
                                                    </span>
                                                )}
                                                <span className="truncate max-w-[9rem]">
                                                    {m.nombre}
                                                    <span className={`font-normal ${selected ? 'text-white/80' : 'text-slate-500'}`}> · {m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1)}</span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOtraSeleccionada(true);
                                            setMascotaId(null);
                                        }}
                                        disabled={submitting}
                                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                                            otraSeleccionada
                                                ? 'bg-accent-600 text-white border-accent-600'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 border-dashed'
                                        }`}
                                    >
                                        Otra / no está en mi lista
                                    </button>
                                    {(mascotaId || otraSeleccionada) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOtraSeleccionada(false);
                                                setMascotaId(null);
                                                setTipoMascotaTexto('');
                                            }}
                                            disabled={submitting}
                                            className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
                                        >
                                            Quitar selección
                                        </button>
                                    )}
                                </div>
                                {otraSeleccionada && (
                                    <input
                                        type="text"
                                        value={tipoMascotaTexto}
                                        onChange={e => setTipoMascotaTexto(e.target.value.slice(0, 140))}
                                        maxLength={140}
                                        placeholder="Describe brevemente tu mascota (ej. Perro Beagle 3 años)"
                                        className="mt-2 w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                    />
                                )}
                            </>
                        ) : (
                            <>
                                <input
                                    id="agend-mascota"
                                    type="text"
                                    value={tipoMascotaTexto}
                                    onChange={e => setTipoMascotaTexto(e.target.value.slice(0, 140))}
                                    maxLength={140}
                                    placeholder="Describe brevemente tu mascota (ej. Perro Beagle 3 años)"
                                    className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors"
                                />
                                <a
                                    href="/usuario/mascotas"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1.5 inline-flex items-center gap-1 text-xs text-accent-700 hover:text-accent-800 font-medium"
                                >
                                    <PawPrint size={12} /> Agregar una mascota a tu perfil
                                </a>
                            </>
                        )}
                    </div>

                    {/* Mensaje — siempre presente */}
                    <div>
                        <label htmlFor="agend-mensaje" className="block text-sm font-medium text-slate-700 mb-1.5">
                            Detalles adicionales (opcional)
                        </label>
                        <textarea
                            id="agend-mensaje"
                            name="agend-mensaje"
                            value={mensaje}
                            onChange={e => setMensaje(e.target.value)}
                            maxLength={500}
                            rows={4}
                            placeholder="Cualquier info adicional para el proveedor (condiciones, horarios, contexto)."
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors resize-none"
                        />
                        <p className="text-xs text-slate-500 mt-1 text-right">{mensaje.length} / 500</p>
                    </div>

                    {errorMsg && (
                        <div role="alert" aria-live="polite" className="p-3 bg-danger-50 border border-danger-100 rounded-lg text-sm text-danger-700">
                            {errorMsg}
                        </div>
                    )}

                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={submitting}
                            className="px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={
                                submitting
                                || (usaPicker
                                    ? !slotElegido
                                    : usaPickerEstadia
                                        ? (!rangoEst?.from || !rangoEst?.to || !!rangoEstError)
                                        : (necesitaElegirModalidad || necesitaElegirModo))
                            }
                            className="bg-accent-600 hover:bg-accent-700 text-white font-medium tracking-wide py-2.5 px-5 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting && <Loader2 size={16} className="animate-spin" />}
                            {usaPicker
                                ? 'Confirmar reserva'
                                : usaPickerEstadia
                                    ? 'Confirmar reserva'
                                    : 'Enviar solicitud'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
