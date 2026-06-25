// components/Servicio/SolicitarAgendamientoModal.tsx
// ----------------------------------------------------------------------------
// Sprint 2 agendamiento — modal de solicitud del tutor.
//
// Flow:
//   1. Tutor ve "Solicitar agendamiento" en sidebar/sticky de la ficha.
//   2. Click abre este modal. Form: fecha+hora (required, futura) + mensaje
//      opcional (max 500).
//   3. Submit: resuelve usuarios_buscadores.id por auth_user_id, INSERT a
//      `agendamientos` con estado default 'pendiente'.
//   4. Success: toast + cierra modal. No redirect (la pagina /mis-solicitudes
//      llega en Sprint 4).
//
// NO incluye: emails al proveedor (Sprint 3), panel del proveedor (Sprint 3).
// ----------------------------------------------------------------------------
import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Calendar, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SolicitarAgendamientoModalProps {
    isOpen: boolean;
    onClose: () => void;
    servicioId: string;
    proveedorId: string;
    serviceTitle: string;
}

// Devuelve YYYY-MM-DDTHH:mm en horario local — formato esperado por
// <input type="datetime-local"/> para el atributo `min`.
function minDateTimeLocal(): string {
    const now = new Date();
    const off = now.getTimezoneOffset();
    const local = new Date(now.getTime() - off * 60 * 1000);
    return local.toISOString().slice(0, 16);
}

export default function SolicitarAgendamientoModal({
    isOpen,
    onClose,
    servicioId,
    proveedorId,
    serviceTitle,
}: SolicitarAgendamientoModalProps) {
    const [fechaPreferida, setFechaPreferida] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen) return null;

    const reset = () => {
        setFechaPreferida('');
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

        if (!fechaPreferida) {
            setErrorMsg('Selecciona una fecha y hora preferida.');
            return;
        }
        // Validar futuro client-side. Constraint adicional en BD si existe.
        const fechaDate = new Date(fechaPreferida);
        if (Number.isNaN(fechaDate.getTime()) || fechaDate.getTime() <= Date.now()) {
            setErrorMsg('La fecha y hora deben ser futuras.');
            return;
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
                    fecha_preferida: fechaDate.toISOString(),
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
                            disabled={submitting || !fechaPreferida}
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
