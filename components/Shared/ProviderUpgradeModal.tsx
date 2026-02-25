import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { validateRut, formatRut } from '../../lib/rutValidation';

interface ProviderUpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ProviderUpgradeModal({ isOpen, onClose, onSuccess }: ProviderUpgradeModalProps) {
    const [step, setStep] = useState(1);
    const [nombre, setNombre] = useState('');
    const [apellidoP, setApellidoP] = useState('');
    const [apellidoM, setApellidoM] = useState('');
    const [rut, setRut] = useState('');
    const [telefono, setTelefono] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [comuna, setComuna] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Instead of splitting steps across multiple submits and partially creating the record,
    // let's do it in a cleaner way: Step 1 collects data, Step 2 collects file, 
    // and final submit does the insertions together.

    if (!isOpen) return null;

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!validateRut(rut)) {
            setError('El RUT ingresado no es válido.');
            return;
        }
        setStep(2);
    };

    const handleFinalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!file) {
            setError('Por favor selecciona una imagen de tu carnet.');
            return;
        }

        setLoading(true);
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session?.user) throw new Error('Error de sesión.');

            const authUserId = session.user.id;
            const email = session.user.email;

            // 1. Upload carnet
            const fileExt = file.name.split('.').pop();
            const filePath = `${authUserId}/carnet.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('carnets')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // 2. Insert into proveedores
            const { data: newProvider, error: insertError } = await supabase.from('proveedores').insert([{
                auth_user_id: authUserId,
                nombre: nombre.trim(),
                apellido_p: apellidoP.trim(),
                apellido_m: apellidoM.trim() || null,
                rut: formatRut(rut),
                telefono: telefono.trim(),
                whatsapp: whatsapp.trim() || null,
                comuna: comuna.trim(),
                estado: 'pendiente',
                email_publico: email,
                foto_carnet: filePath
            }]).select('id').single();

            if (insertError) throw insertError;

            const provId = newProvider.id;

            // 3. Link inside usuarios_buscadores
            const { error: linkError } = await supabase.from('usuarios_buscadores')
                .update({ proveedor_id: provId })
                .eq('auth_user_id', authUserId);

            if (linkError) {
                console.error("Link error:", linkError);
                // Non-fatal if they don't have a buscador profile yet (unlikely if they are here, but just logging)
            }

            setStep(3);
            setTimeout(() => {
                onSuccess();
            }, 3000);

        } catch (err: any) {
            setError(err.message || 'Error al enviar la solicitud.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 relative shrink-0">
                    <h3 className="text-lg font-bold text-slate-800 text-center w-full">Convertirme en Proveedor</h3>
                    <button
                        onClick={onClose}
                        className="absolute right-4 text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 border border-slate-200 hover:bg-slate-50 transition-colors"
                        disabled={loading}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto w-full">
                    {/* Progress Bar */}
                    {step < 3 && (
                        <div className="flex gap-2 mb-6">
                            {[1, 2].map((s) => (
                                <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="p-3 mb-6 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm flex items-center gap-2">
                            <span>🚫</span> {error}
                        </div>
                    )}

                    {step === 1 && (
                        <form onSubmit={handleNext} className="space-y-4 animate-fade-in">
                            <h4 className="font-semibold text-slate-700">Paso 1: Datos de Identidad</h4>
                            <p className="text-sm text-slate-500 mb-4">Para publicar servicios debes validar tu identidad. Estos datos son privados.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-1">
                                    <label className="text-sm font-semibold text-slate-700">Nombre</label>
                                    <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none transition-all text-sm" />
                                </div>
                                <div className="grid gap-1">
                                    <label className="text-sm font-semibold text-slate-700">Apellido Paterno</label>
                                    <input type="text" required value={apellidoP} onChange={e => setApellidoP(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none transition-all text-sm" />
                                </div>
                                <div className="grid gap-1">
                                    <label className="text-sm font-semibold text-slate-700">Apellido Materno (Opcional)</label>
                                    <input type="text" value={apellidoM} onChange={e => setApellidoM(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none transition-all text-sm" />
                                </div>
                                <div className="grid gap-1">
                                    <label className="text-sm font-semibold text-slate-700">RUT</label>
                                    <input type="text" required value={rut} onChange={e => setRut(formatRut(e.target.value))} placeholder="12.345.678-9" className="w-full h-10 px-3 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none transition-all text-sm" />
                                </div>
                                <div className="grid gap-1">
                                    <label className="text-sm font-semibold text-slate-700">Teléfono</label>
                                    <input type="tel" required value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+56 9 1234 5678" className="w-full h-10 px-3 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none transition-all text-sm" />
                                </div>
                                <div className="grid gap-1">
                                    <label className="text-sm font-semibold text-slate-700">WhatsApp (Opcional)</label>
                                    <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+56 9 1234 5678" className="w-full h-10 px-3 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none transition-all text-sm" />
                                </div>
                                <div className="grid gap-1 md:col-span-2">
                                    <label className="text-sm font-semibold text-slate-700">Comuna</label>
                                    <input type="text" required value={comuna} onChange={e => setComuna(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none transition-all text-sm" />
                                </div>
                            </div>

                            <button type="submit" className="w-full h-12 mt-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm">
                                Siguiente
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleFinalSubmit} className="space-y-4 animate-fade-in">
                            <h4 className="font-semibold text-slate-700">Paso 2: Foto de Carnet</h4>
                            <p className="text-sm text-slate-600 mb-4">Sube una foto clara de tu carnet de identidad por ambos lados para verificar que eres una persona real (formato JPG o PNG).</p>

                            <div className="h-40 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center bg-slate-50 relative hover:bg-slate-100 transition cursor-pointer">
                                <input type="file" required accept="image/jpeg, image/png, image/webp" onChange={e => setFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <div className="text-center pointer-events-none p-4">
                                    {file ? (
                                        <div className="text-emerald-600 font-semibold">{file.name}</div>
                                    ) : (
                                        <div className="text-slate-500 flex flex-col items-center gap-2">
                                            <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                            <span>Haz clic o arrastra tu imagen aquí</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-4 pt-2">
                                <button type="button" onClick={() => setStep(1)} disabled={loading} className="w-1/3 h-12 border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition">
                                    Atrás
                                </button>
                                <button type="submit" disabled={loading} className="w-2/3 h-12 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null}
                                    {loading ? 'Procesando...' : 'Enviar Solicitud'}
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 3 && (
                        <div className="text-center py-8 animate-fade-in flex flex-col items-center">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">¡Solicitud enviada!</h3>
                            <p className="text-slate-600 text-sm">
                                Revisaremos tu cuenta en 24-48 horas.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
