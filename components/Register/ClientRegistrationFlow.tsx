import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function ClientRegistrationFlow({ onCancel }: { onCancel: () => void }) {
    const router = useRouter();

    const [nombre, setNombre] = useState('');
    const [apellidoP, setApellidoP] = useState('');
    const [apellidoM, setApellidoM] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (password !== passwordConfirm) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            // 1) Auth
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/email-confirmado`,
                },
            });

            if (signUpError) throw signUpError;

            const authUserId = data.user?.id;
            if (!authUserId) throw new Error("No se pudo obtener el ID del usuario.");

            // 2) Insert profile in usuarios_buscadores
            const { error: insertError } = await supabase.from('usuarios_buscadores').insert([{
                auth_user_id: authUserId,
                nombre: nombre.trim(),
                apellido_p: apellidoP.trim(),
                apellido_m: apellidoM.trim() || null,
                email: email
            }]);

            if (insertError) throw insertError;

            // Log consent implicitly since there isn't a checkbox in this rapid flow (or we can add one if needed, keeping it simple right now)
            fetch('/api/log-consent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: authUserId, documentVersion: "v1.0 - Dic 2025" })
            }).catch(console.error);

            fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'welcome', to: email, data: { firstName: nombre } })
            }).catch(err => console.error(err));

            // 3) Push to success page
            router.push(`/registro-exitoso?role=cliente`);

        } catch (err: any) {
            setError(err.message || 'Error al crear la cuenta.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-8 transition-all animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">
                    Registro de Usuario
                </h2>
                <button onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-800 underline">
                    Cambiar rol
                </button>
            </div>

            {error && (
                <div className="p-3 mb-6 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm flex items-center gap-2">
                    <span>🚫</span> {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-1">
                        <label className="text-sm font-semibold text-slate-700">Nombre</label>
                        <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)} className="w-full h-[46px] px-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all" />
                    </div>
                    <div className="grid gap-1">
                        <label className="text-sm font-semibold text-slate-700">Apellido Paterno</label>
                        <input type="text" required value={apellidoP} onChange={e => setApellidoP(e.target.value)} className="w-full h-[46px] px-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all" />
                    </div>
                    <div className="grid gap-1 md:col-span-2">
                        <label className="text-sm font-semibold text-slate-700">Apellido Materno (Opcional)</label>
                        <input type="text" value={apellidoM} onChange={e => setApellidoM(e.target.value)} className="w-full h-[46px] px-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all" />
                    </div>

                    <div className="grid gap-1 md:col-span-2">
                        <label className="text-sm font-semibold text-slate-700">Correo electrónico</label>
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full h-[46px] px-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all" placeholder="tu@correo.com" />
                    </div>

                    <div className="grid gap-1">
                        <label className="text-sm font-semibold text-slate-700">Contraseña</label>
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} minLength={6} className="w-full h-[46px] px-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all" placeholder="••••••••" />
                    </div>
                    <div className="grid gap-1">
                        <label className="text-sm font-semibold text-slate-700">Confirmar Contraseña</label>
                        <input type="password" required value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} minLength={6} className="w-full h-[46px] px-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all" placeholder="••••••••" />
                    </div>
                </div>

                <button type="submit" disabled={loading} className="w-full h-[50px] mt-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm disabled:opacity-50">
                    {loading ? 'Procesando...' : 'Crear Cuenta'}
                </button>
            </form>
        </div>
    );
}
