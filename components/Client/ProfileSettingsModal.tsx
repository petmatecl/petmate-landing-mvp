import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { X, Save, User, Phone, FileText } from 'lucide-react';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onSaved: () => void;
};

export default function ProfileSettingsModal({ isOpen, onClose, userId, onSaved }: Props) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        apellido_p: '',
        rut: '',
        telefono: '',
    });

    useEffect(() => {
        if (isOpen && userId) {
            fetchProfile();
        }
    }, [isOpen, userId]);

    const fetchProfile = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('registro_petmate')
            .select('nombre, apellido_p, rut, telefono')
            .eq('auth_user_id', userId)
            .single();

        if (data) {
            setFormData({
                nombre: data.nombre || '',
                apellido_p: data.apellido_p || '',
                rut: data.rut || '',
                telefono: data.telefono || ''
            });
        }
        setLoading(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const { error } = await supabase
                .from('registro_petmate')
                .update({
                    nombre: formData.nombre,
                    apellido_p: formData.apellido_p,
                    rut: formData.rut,
                    telefono: formData.telefono
                })
                .eq('auth_user_id', userId);

            if (error) throw error;
            onSaved();
            onClose();
            alert('Perfil actualizado correctamente');
        } catch (err: any) {
            console.error(err);
            alert('Error al actualizar el perfil: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <User className="text-emerald-600" size={20} />
                        Configuración de Perfil
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    {loading ? (
                        <div className="text-center py-8 text-slate-400">Cargando datos...</div>
                    ) : (
                        <form id="profile-form" onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nombre</label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={formData.nombre}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                                        placeholder="Tu nombre"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Apellido</label>
                                    <input
                                        type="text"
                                        name="apellido_p"
                                        value={formData.apellido_p}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                                        placeholder="Tu apellido"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                    <FileText size={14} /> RUT
                                </label>
                                <input
                                    type="text"
                                    name="rut"
                                    value={formData.rut}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 bg-slate-50"
                                    placeholder="12.345.678-9"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">El RUT es único por cuenta.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                    <Phone size={14} /> Teléfono
                                </label>
                                <input
                                    type="tel"
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                                    placeholder="+56 9 1234 5678"
                                />
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="profile-form"
                        disabled={saving}
                        className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                        {!saving && <Save size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
