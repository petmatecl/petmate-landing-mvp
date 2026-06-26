// components/Servicio/SolicitarAgendamientoModal.tsx
// ----------------------------------------------------------------------------
// Sprint 2 agendamiento — modal de solicitud del tutor.
// Fase 1 del feature multi-dia: branching del form segun categoria del
// servicio (V1 puntual fecha+hora vs V2 cuidado rango de noches sin hora).
//
// Flow:
//   1. Tutor ve "Solicitar agendamiento" en sidebar/sticky de la ficha.
//   2. Click abre este modal.
//      - V1 (default, todas las categorias salvo cuidado): fecha+hora
//        (required, futura) + mensaje opcional (max 500).
//      - V2 (categoria 'cuidado'): fecha inicio + fecha fin (ambas dia, sin
//        hora; fin > inicio; ambas futuras) + mensaje opcional.
//   3. Submit: resuelve usuarios_buscadores.id por auth_user_id, INSERT a
//      `agendamientos` con estado default 'pendiente'. Para V2 incluye
//      fecha_fin; para V1 fecha_fin queda null.
//   4. Success: toast + cierra modal. No redirect (la pagina /mis-solicitudes
//      llega en Sprint 4).
// ----------------------------------------------------------------------------
import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Calendar, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getVarianteFormulario } from '../../lib/categoriaTemporal';

interface SolicitarAgendamientoModalProps {
    isOpen: boolean;
    onClose: () => void;
    servicioId: string;
    proveedorId: string;
    serviceTitle: string;
    // Fase 1: slug de la categoria del servicio para decidir variante de
    // form. Si no se pasa (legacy callers), cae en V1 (puntual fecha+hora).
    categoriaSlug?: string | null;
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
// para el atributo `min`. Day-granularity (sin hora) para V2.
function minDateLocal(): string {
    const now = new Date();
    const off = now.getTimezoneOffset();
    const local = new Date(now.getTime() - off * 60 * 1000);
    return local.toISOString().slice(0, 10);
}

export default function SolicitarAgendamientoModal({
    isOpen,
    onClose,
    servicioId,
    proveedorId,
    serviceTitle,
    categoriaSlug,
}: SolicitarAgendamientoModalProps) {
    const variante = getVarianteFormulario(categoriaSlug);
    const isV2 = variante === 'V2';

    const [fechaPreferida, setFechaPreferida] = useState(''); // V1: datetime-local; V2: date inicio
    const [fechaFin, setFechaFin] = useState(''); // V2: date fin
    const [mensaje, setMensaje] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen) return null;

    const reset = () => {
        setFechaPreferida('');
        setFechaFin('');
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

        // Validacion branching V1 vs V2. Ambos extremos en hora LOCAL del
        // tutor: V1 = datetime-local (input ya devuelve sin TZ), V2 = date
        // que parseamos como medianoche local (00:00 CLT) — la diferencia
        // entre check-in y check-out en dias de calendario es lo que cuenta.
        let fechaInicioIso: string;
        let fechaFinIso: string | null = null;

        if (isV2) {
            if (!fechaPreferida || !fechaFin) {
                setErrorMsg('Selecciona la fecha de inicio y la fecha de término.');
                return;
            }
            // Input type="date" → parsear como medianoche local agregando T00:00.
            const inicioDate = new Date(`${fechaPreferida}T00:00:00`);
            const finDate = new Date(`${fechaFin}T00:00:00`);
            if (Number.isNaN(inicioDate.getTime()) || Number.isNaN(finDate.getTime())) {
                setErrorMsg('Las fechas seleccionadas no son válidas.');
                return;
            }
            // Ambas futuras (medianoche del dia >= hoy 00:00).
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
        } else {
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

        if (mensaje.length > 500) {
            setErrorMsg('El mensaje supera el máximo de 500 caracteres.');
            return;
        }

        setSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setErrorMsg('Tu sesión expiró. Recarga la página e iniciá sesión de nuevo.');
                return;
            }

            // Resolver el tutor_id (usuarios_buscadores.id) por auth_user_id.
            // Sprint 2 no expone este id en UserContext; query fresh por
            // simplicidad. Si el user tiene solo cuenta de proveedor (sin
            // perfil de buscador), buscador retorna null — error accionable.
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

            const { data: inserted, error: insertErr } = await supabase
                .from('agendamientos')
                .insert({
                    servicio_id: servicioId,
                    proveedor_id: proveedorId,
                    tutor_id: buscador.id,
                    fecha_preferida: fechaInicioIso,
                    fecha_fin: fechaFinIso, // V1: null, V2: ISO del check-out
                    mensaje: mensaje.trim() || null,
                    // estado default 'pendiente' viene de la BD.
                })
                .select('id')
                .single();

            if (insertErr) throw insertErr;

            // Sprint 3 parte B: notificar al proveedor por email. Fire-and-
            // forget — si falla loggea pero NO rollback del INSERT (spec).
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

            // Sprint 4: toast con accion "Ver mis solicitudes" — cierra el
            // loop visual de "cree una solicitud → puedo verla aca". Sonner
            // soporta action prop con label + onClick.
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
            // Mejora A: el index parcial UNIQUE (tutor_id, servicio_id)
            // WHERE estado='pendiente' tira 23505 (unique_violation) cuando el
            // tutor ya tiene una pendiente para este servicio. Catcheamos para
            // mostrar mensaje accionable en vez del error crudo de BD.
            if (err?.code === '23505') {
                setErrorMsg(
                    'Ya tienes una solicitud pendiente para este servicio. ' +
                    'Espera a que el proveedor responda, o revisa tus solicitudes desde "Mis solicitudes".'
                );
                return;
            }
            setErrorMsg(err?.message || 'Hubo un error al enviar la solicitud. Intentá de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    const minDt = minDateTimeLocal();
    const minD = minDateLocal();
    const submitDisabled = submitting || !fechaPreferida || (isV2 && !fechaFin);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden relative">

                {/* Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-start gap-3">
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
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {isV2 ? (
                        // V2 — cuidado rango de noches (sin hora; entrega/retiro
                        // se conversa en chat). Dos inputs date, fin > inicio.
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
                    ) : (
                        // V1 — puntual fecha+hora (sin cambios desde Sprint 2).
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
                            disabled={submitDisabled}
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
