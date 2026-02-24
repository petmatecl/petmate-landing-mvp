import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { validateRut, formatRut } from '../../lib/rutValidation';

export default function ProviderRegistrationFlow({ onCancel }: { onCancel: () => void }) {
    const router = useRouter();

    // Steps: 1 = Cuenta, 2 = Identidad, 3 = Carnet, 4 = Exito
    const [step, setStep] = useState(1);

    // Step 1 State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');

    // Step 2 State
    const [nombre, setNombre] = useState('');
    const [apellidoP, setApellidoP] = useState('');
    const [apellidoM, setApellidoM] = useState('');
    const [rut, setRut] = useState('');
    const [telefono, setTelefono] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [comuna, setComuna] = useState('');

    // Step 3 State
    const [file, setFile] = useState<File | null>(null);

    // Common State
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [authUserId, setAuthUserId] = useState<string | null>(null);

    const handleStep1 = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (password !== passwordConfirm) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/email-confirmado`,
                },
            });

            if (signUpError) throw signUpError;

            const userId = data.user?.id;
            if (!userId) throw new Error("No se pudo obtener el ID del usuario.");

            setAuthUserId(userId);
            setStep(2);
        } catch (err: any) {
            setError(err.message || 'Error al crear la cuenta.');
        } finally {
            setLoading(false);
        }
    };

    const handleStep2 = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!validateRut(rut)) {
            setError('El RUT ingresado no es válido.');
            return;
        }

        if (!authUserId) {
            setError('Error de sesión. Por favor recarga la página.');
            return;
        }

        setLoading(true);
        try {
            const { error: insertError } = await supabase.from('proveedores').insert([{
                auth_user_id: authUserId,
                nombre: nombre.trim(),
                apellido_p: apellidoP.trim(),
                apellido_m: apellidoM.trim() || null,
                rut: formatRut(rut),
                telefono: telefono.trim(),
                whatsapp: whatsapp.trim() || undefined,
                comuna: comuna.trim(),
                estado: 'pendiente',
                email_publico: email
            }]);

            if (insertError) throw insertError;

            setStep(3);
        } catch (err: any) {
            setError(err.message || 'Error al guardar los datos de identidad.');
        } finally {
            setLoading(false);
        }
    };

    const handleStep3 = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!file) {
            setError('Por favor selecciona una imagen de tu carnet.');
            return;
        }

        if (!authUserId) {
            setError('Error de sesión. Por favor recarga la página.');
            return;
        }

        setLoading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${authUserId}/carnet.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('carnets')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { error: updateError } = await supabase.from('proveedores')
                .update({ foto_carnet: filePath })
                .eq('auth_user_id', authUserId);

            if (updateError) throw updateError;

            setStep(4);
        } catch (err: any) {
            setError(err.message || 'Error al subir la imagen del carnet.');
        } finally {
            setLoading(false);
        }
    };

    if (step === 4) {
        return (
            <div className="text-center p-8 bg-white border border-emerald-100 rounded-xl shadow-sm">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Registro completado!</h2>
                <p className="text-slate-600">
                    Tu cuenta está en revisión. Te notificaremos por email cuando sea aprobada (plazo: 24-48 horas).
                </p>
                <button onClick={() => router.push('/')} className="mt-6 px-6 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition">
                    Volver al Inicio
                </button>
            </div>
        );
    }

    return (
        <div className="mt-8 transition-all animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">
                    Registro de Proveedor
                </h2>
                <button onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-800 underline">
                    Cambiar rol
                </button>
            </div>

            {/* Progress Bar */}
            <div className="flex gap-2 mb-8">
                {[1, 2, 3].map((s) => (
                    <div key={s} className={`h-2 flex-1 rounded-full ${step >= s ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                ))}
            </div>

            {error && (
                <div className="p-3 mb-6 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm flex items-center gap-2">
                    <span>🚫</span> {error}
                </div>
            )}

            {step === 1 && (
                <form onSubmit={handleStep1} className="grid gap-4">
                    <h3 className="font-semibold text-slate-700 mb-2">Paso 1: Datos de Cuenta</h3>
                    <div className="grid gap-1">
                        <label className="text-sm font-semibold text-slate-700">Email</label>
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full h-[46px] px-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all" placeholder="tu@correo.com" />
                    </div>
                    <div className="grid gap-1">
                        <label className="text-sm font-semibold text-slate-700">Contraseña</label>
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} minLength={8} className="w-full h-[46px] px-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all" placeholder="••••••••" />
                    </div>
                    <div className="grid gap-1">
                        <label className="text-sm font-semibold text-slate-700">Confirmar Contraseña</label>
                        <input type="password" required value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} minLength={8} className="w-full h-[46px] px-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all" placeholder="••••••••" />
                    </div>
                    <button type="submit" disabled={loading} className="w-full h-[50px] mt-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm disabled:opacity-50">
                        {loading ? 'Procesando...' : 'Siguiente'}
                    </button>
                </form>
            )}

            {step === 2 && (
                <form onSubmit={handleStep2} className="grid gap-4">
                    <h3 className="font-semibold text-slate-700 mb-2">Paso 2: Datos de Identidad</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-1">
                            <label className="text-sm font-semibold text-slate-700">Nombre</label>
                            <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)} className="w-full h-[46px] px-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all" />
                        </div>
                        <div className="grid gap-1">
                            <label className="text-sm font-semibold text-slate-700">Apellido Paterno</label>
                            <input type="text" required value={apellidoP} onChange={e => setApellidoP(e.target.value)} className="w-full h-[46px] px-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all" />
                        </div>
                        <div className="grid gap-1">
                            <label className="text-sm font-semibold text-slate-700">Apellido Materno (Opcional)</label>
                            <input type="text" value={apellidoM} onChange={e => setApellidoM(e.target.value)} className="w-full h-[46px] px-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all" />
                        </div>
                        <div className="grid gap-1">
                            <label className="text-sm font-semibold text-slate-700">RUT</label>
                            <input type="text" required value={rut} onChange={e => setRut(formatRut(e.target.value))} placeholder="12.345.678-9" className="w-full h-[46px] px-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all" />
                        </div>
                        <div className="grid gap-1">
                            <label className="text-sm font-semibold text-slate-700">Teléfono</label>
                            <input type="tel" required value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+56 9 1234 5678" className="w-full h-[46px] px-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all" />
                        </div>
                        <div className="grid gap-1">
                            <label className="text-sm font-semibold text-slate-700">WhatsApp (Opcional)</label>
                            <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+56 9 1234 5678" className="w-full h-[46px] px-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all" />
                        </div>
                        <div className="grid gap-1 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700">Comuna</label>
                            <input type="text" required value={comuna} onChange={e => setComuna(e.target.value)} className="w-full h-[46px] px-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all" />
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full h-[50px] mt-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm disabled:opacity-50">
                        {loading ? 'Guardando...' : 'Siguiente'}
                    </button>
                </form>
            )}

            {step === 3 && (
                <form onSubmit={handleStep3} className="grid gap-4">
                    <h3 className="font-semibold text-slate-700 mb-2">Paso 3: Veridad de Identidad</h3>
                    <p className="text-sm text-slate-600 mb-4">Para garantizar la seguridad de la plataforma, necesitamos una foto de tu carnet de identidad por ambos lados o clara por el reverso y anverso (puedes subir un archivo que contenga ambas caras si es necesario, formato JPG o PNG).</p>

                    <div className="grid gap-1 h-32 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center bg-slate-50 relative hover:bg-slate-100 transition cursor-pointer">
                        <input type="file" required accept="image/jpeg, image/png, image/webp" onChange={e => setFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <div className="text-center pointer-events-none">
                            {file ? (
                                <span className="text-emerald-600 font-semibold">{file.name}</span>
                            ) : (
                                <span className="text-slate-500">Haz clic o arrastra tu imagen aquí</span>
                            )}
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full h-[50px] mt-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm disabled:opacity-50">
                        {loading ? 'Subiendo...' : 'Finalizar Registro'}
                    </button>
                </form>
            )}
        </div>
    );
}
