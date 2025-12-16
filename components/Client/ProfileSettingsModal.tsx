import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { X, Save, User, Phone, FileText } from 'lucide-react';
import AddressAutocomplete from '../AddressAutocomplete';

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
        latitud: null as number | null,
        longitud: null as number | null,
        videos: [] as string[],
        consentimiento_rrss: false,
        comuna: '', // para inicializar autocomplete
        region: ''
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
            .select('nombre, apellido_p, rut, telefono, latitud, longitud, videos, consentimiento_rrss, comuna, region')
            .eq('auth_user_id', userId)
            .single();

        if (data) {
            setFormData({
                nombre: data.nombre || '',
                apellido_p: data.apellido_p || '',
                rut: data.rut || '',
                telefono: data.telefono || '',
                latitud: data.latitud,
                longitud: data.longitud,
                videos: data.videos || [],
                consentimiento_rrss: data.consentimiento_rrss || false,
                comuna: data.comuna || '',
                region: data.region || ''
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
                    telefono: formData.telefono,
                    latitud: formData.latitud,
                    longitud: formData.longitud,
                    videos: formData.videos.filter(v => v.trim() !== ''),
                    consentimiento_rrss: formData.consentimiento_rrss
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

                            {/* Ubicación Sitter */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                    Tu Ubicación (para el mapa)
                                </label>
                                <AddressAutocomplete
                                    onSelect={(res) => {
                                        if (res.lat && res.lon) {
                                            setFormData(prev => ({ ...prev, latitud: parseFloat(res.lat), longitud: parseFloat(res.lon) }));
                                        }
                                    }}
                                    initialValue={formData.comuna ? `${formData.comuna}, ${formData.region || ''}` : ''}
                                    placeholder="Busca tu dirección o comuna..."
                                    className="w-full"
                                />
                                {formData.latitud && (
                                    <p className="text-[10px] text-emerald-600 mt-1">✓ Ubicación georeferenciada lista</p>
                                )}
                            </div>

                            {/* Videos */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                    Videos (Enlaces de YouTube o TikTok)
                                </label>
                                <div className="space-y-2">
                                    {formData.videos.map((vid, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={vid}
                                                onChange={(e) => {
                                                    const newVideos = [...formData.videos];
                                                    newVideos[idx] = e.target.value;
                                                    setFormData({ ...formData, videos: newVideos });
                                                }}
                                                className="w-full text-xs rounded-lg border-slate-200"
                                                placeholder="https://youtube.com/watch?v=..."
                                            />
                                            {idx > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newVideos = formData.videos.filter((_, i) => i !== idx);
                                                        setFormData({ ...formData, videos: newVideos });
                                                    }}
                                                    className="text-slate-400 hover:text-rose-500"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {formData.videos.length < 3 && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, videos: [...formData.videos, ''] })}
                                            className="text-xs text-emerald-600 font-bold hover:underline"
                                        >
                                            + Agregar otro video
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Consentimiento RRSS */}
                            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.consentimiento_rrss}
                                        onChange={(e) => setFormData({ ...formData, consentimiento_rrss: e.target.checked })}
                                        className="mt-1 w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                                    />
                                    <div className="text-sm text-emerald-800">
                                        <span className="font-bold block text-emerald-900">Permitir uso en Redes Sociales</span>
                                        Al marcar esto, permites que Pawnecta destaque tu perfil y videos en nuestras redes sociales.
                                        <span className="block text-xs mt-1 font-bold text-emerald-700">🚀 ¡Esto aumenta tus probabilidades de match!</span>
                                    </div>
                                </label>
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
