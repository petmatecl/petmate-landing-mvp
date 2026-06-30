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
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Calendar, X, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import {
    esCategoriaMultiDia,
    esModalidadValida,
    getVarianteFormulario,
    MODALIDAD_LABELS,
    type ModalidadCuidado,
    type ModoTarifa,
} from '../../lib/categoriaTemporal';

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
}

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

const DIRECCION_MIN_CHARS = 10;
const DIRECCION_MAX_CHARS = 500;
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
}: SolicitarAgendamientoModalProps) {
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
    const [direccion, setDireccion] = useState(''); // V4a/V4b
    const [mensaje, setMensaje] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

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
        setDireccion('');
        setMensaje('');
        setErrorMsg('');
    };

    const handleClose = () => {
        if (submitting) return;
        reset();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

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
        let direccionTrim: string | null = null;

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

        // Direccion requerida en V4a y V4b. >=10 chars trim + <=500.
        if (variante === 'V4a' || variante === 'V4b') {
            const t = direccion.trim();
            if (t.length < DIRECCION_MIN_CHARS) {
                setErrorMsg(`Ingresa la dirección donde se prestará el servicio (mínimo ${DIRECCION_MIN_CHARS} caracteres).`);
                return;
            }
            if (t.length > DIRECCION_MAX_CHARS) {
                setErrorMsg(`La dirección supera el máximo de ${DIRECCION_MAX_CHARS} caracteres.`);
                return;
            }
            direccionTrim = t;
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
                .select('id')
                .eq('auth_user_id', session.user.id)
                .maybeSingle();

            if (buscadorErr) throw buscadorErr;
            if (!buscador) {
                setErrorMsg('Necesitas completar tu perfil de tutor antes de agendar. Regístrate como tutor para continuar.');
                return;
            }

            // INSERT — pobla columnas segun variante. Las que no aplican
            // quedan null. modalidad_elegida se popula siempre que isCuidado
            // (incluyendo V2 con casa_cuidador o recinto — info util para
            // el proveedor, no breaking para Fase 1 historica).
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
                    direccion_servicio: direccionTrim,
                    mensaje: mensaje.trim() || null,
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
            }

            toast.success('Solicitud enviada. El proveedor te responderá pronto.', {
                action: {
                    label: 'Ver mis solicitudes',
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
                    'Espera a que el proveedor responda, o revisa tus solicitudes desde "Mis solicitudes".'
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
    // group con estado seleccionado en emerald-700, no seleccionado en slate.
    const renderChipModalidad = (mod: ModalidadCuidado) => {
        const selected = modalidadElegida === mod;
        return (
            <button
                key={mod}
                type="button"
                onClick={() => setModalidadElegida(mod)}
                disabled={submitting}
                className={`text-sm font-medium px-3 py-2 rounded-xl border transition-colors ${
                    selected
                        ? 'bg-emerald-700 text-white border-emerald-700'
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
                type="button"
                onClick={() => setModoTarifa(modo)}
                disabled={submitting}
                className={`flex-1 text-sm font-medium px-3 py-2 rounded-xl border transition-colors ${
                    selected
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
            >
                {label}
            </button>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden relative max-h-[95vh] flex flex-col">

                {/* Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-start gap-3 shrink-0">
                    <div className="min-w-0">
                        <h2 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                            <Calendar size={20} className="text-emerald-600 shrink-0" />
                            Solicitar agendamiento
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

                    {/* Chip selector — solo cuidado con multiples modalidades */}
                    {requiereChipSelector && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                ¿Cómo quieres el cuidado? <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {modalidadesValidas.map(renderChipModalidad)}
                            </div>
                        </div>
                    )}

                    {/* Toggle noches/horas — solo casa_tutor */}
                    {isCuidado && modalidadElegida === 'casa_tutor' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                ¿Cuánto dura el servicio? <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                                {renderToggleModo('noches', 'Por noches (estadía multi-día)')}
                                {renderToggleModo('horas', 'Por horas (un día puntual)')}
                            </div>
                        </div>
                    )}

                    {/* Form de fechas — varia segun variante */}
                    {formVisible && (variante === 'V2' || variante === 'V4a') && (
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
                                    className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white transition-colors"
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
                                    className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white transition-colors"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed sm:col-span-2">
                                Período de cuidado (sin hora). El horario de entrega y retiro lo coordinas con el proveedor por chat una vez confirmada la solicitud.
                            </p>
                        </div>
                    )}

                    {formVisible && variante === 'V4b' && (
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
                                    className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white transition-colors"
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
                                    className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white transition-colors"
                                />
                                <p className="text-xs text-slate-500 mt-1">Entre {DURACION_MIN_HORAS} y {DURACION_MAX_HORAS} horas.</p>
                            </div>
                        </>
                    )}

                    {formVisible && variante === 'V1' && (
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
                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white transition-colors"
                            />
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Cuándo te gustaría recibir el servicio. El proveedor confirmará o propondrá otra opción.
                            </p>
                        </div>
                    )}

                    {/* Direccion — solo V4a/V4b (modalidad casa_tutor) */}
                    {formVisible && (variante === 'V4a' || variante === 'V4b') && (
                        <div>
                            <label htmlFor="agend-direccion" className="block text-sm font-medium text-slate-700 mb-1.5">
                                <span className="inline-flex items-center gap-1.5">
                                    <MapPin size={14} className="text-slate-500" />
                                    Dirección donde se prestará el servicio
                                </span>
                                {' '}<span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="agend-direccion"
                                name="agend-direccion"
                                value={direccion}
                                onChange={e => setDireccion(e.target.value)}
                                maxLength={DIRECCION_MAX_CHARS}
                                rows={3}
                                placeholder="Calle, número, depto o casa, comuna. El proveedor lo necesita para llegar."
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white transition-colors resize-none"
                            />
                            <p className="text-xs text-slate-400 mt-1 text-right">{direccion.length} / {DIRECCION_MAX_CHARS}</p>
                        </div>
                    )}

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
                            placeholder="Cuéntanos detalles de tu mascota, condiciones especiales, o cualquier cosa que el proveedor necesite saber."
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white transition-colors resize-none"
                        />
                        <p className="text-xs text-slate-400 mt-1 text-right">{mensaje.length} / 500</p>
                    </div>

                    {errorMsg && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
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
                            disabled={submitting || necesitaElegirModalidad || necesitaElegirModo}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium tracking-wide py-2.5 px-5 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting && <Loader2 size={16} className="animate-spin" />}
                            Enviar solicitud
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
