import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Upload, Loader2, CheckCircle, Clock, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    proveedorId: string;
}

export default function CertificacionesSection({ proveedorId }: Props) {
    const [certs, setCerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [titulo, setTitulo] = useState('');
    const [institucion, setInstitucion] = useState('');
    const [anio, setAnio] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        fetchCerts();
    }, [proveedorId]);

    const fetchCerts = async () => {
        const { data } = await supabase
            .from('certificaciones')
            .select('*')
            .eq('proveedor_id', proveedorId)
            .order('created_at', { ascending: false });
        setCerts(data || []);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!titulo.trim()) return toast.error('El título es obligatorio');
        if (!file) return toast.error('Sube el documento o foto del certificado');

        setUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const path = `certificaciones/${proveedorId}/${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
                .from('documents')
                .upload(path, file, { upsert: true });
            if (upErr) throw upErr;

            const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);

            const { error } = await supabase.from('certificaciones').insert({
                proveedor_id: proveedorId,
                titulo: titulo.trim(),
                institucion: institucion.trim() || null,
                anio: anio ? parseInt(anio) : null,
                documento_url: urlData.publicUrl,
            });
            if (error) throw error;

            toast.success('Certificación enviada para revisión');
            setTitulo('');
            setInstitucion('');
            setAnio('');
            setFile(null);
            setShowForm(false);
            fetchCerts();
        } catch (err: any) {
            toast.error(err.message || 'Error al subir certificación');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('certificaciones').delete().eq('id', id);
        if (error) toast.error('Error al eliminar');
        else { toast.success('Certificación eliminada'); fetchCerts(); }
    };

    if (loading) return <div className="h-20 bg-slate-50 rounded-xl animate-pulse" />;

    const statusBadge = (estado: string) => {
        if (estado === 'aprobado') return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle size={10} /> Verificada</span>;
        if (estado === 'pendiente') return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full"><Clock size={10} /> En revisión</span>;
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><XCircle size={10} /> Rechazada</span>;
    };

    return (
        <div className="space-y-3">
            {certs.map(cert => (
                <div key={cert.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-slate-800 truncate">{cert.titulo}</p>
                            {statusBadge(cert.estado)}
                        </div>
                        <p className="text-xs text-slate-400">
                            {cert.institucion && `${cert.institucion} `}
                            {cert.anio && `(${cert.anio})`}
                        </p>
                        {cert.estado === 'rechazado' && cert.nota_admin && (
                            <p className="text-xs text-red-500 mt-1">Motivo: {cert.nota_admin}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                        {cert.documento_url && (
                            <a href={cert.documento_url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline font-medium">Ver</a>
                        )}
                        {cert.estado !== 'aprobado' && (
                            <button onClick={() => handleDelete(cert.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>
            ))}

            {showForm ? (
                <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <input
                        type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
                        placeholder="Nombre del certificado *"
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="text" value={institucion} onChange={e => setInstitucion(e.target.value)}
                            placeholder="Institución (opcional)"
                            className="h-10 px-3 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <input
                            type="number" value={anio} onChange={e => setAnio(e.target.value)}
                            placeholder="Año" min="1990" max={new Date().getFullYear()}
                            className="h-10 px-3 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-slate-300 rounded-lg px-4 py-3 hover:border-emerald-400 transition-colors">
                        <Upload size={16} className="text-slate-400" />
                        <span className="text-sm text-slate-500">{file ? file.name : 'Subir documento (PDF, JPG, PNG)'}</span>
                        <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
                    </label>
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-50">Cancelar</button>
                        <button type="submit" disabled={uploading}
                            className="text-sm font-bold bg-emerald-700 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-1.5">
                            {uploading && <Loader2 size={14} className="animate-spin" />}
                            Enviar para revisión
                        </button>
                    </div>
                </form>
            ) : (
                <button onClick={() => setShowForm(true)}
                    className="w-full border-2 border-dashed border-slate-200 rounded-xl py-3 text-sm font-medium text-slate-500 hover:border-emerald-400 hover:text-emerald-700 transition-colors">
                    + Agregar certificación
                </button>
            )}
        </div>
    );
}
