import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toast, Toaster } from 'sonner';
import { X, Upload, Loader2, Image as ImageIcon } from 'lucide-react';

interface ServiceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    proveedorId: string;
    existingServiceId?: string | null;
    onSuccess: () => void;
}

export default function ServiceFormModal({ isOpen, onClose, proveedorId, existingServiceId, onSuccess }: ServiceFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [categorias, setCategorias] = useState<any[]>([]);

    // Form fields
    const [categoriaId, setCategoriaId] = useState('');
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [precioDesde, setPrecioDesde] = useState<number | ''>('');
    const [precioHasta, setPrecioHasta] = useState<number | ''>('');
    const [unidadPrecio, setUnidadPrecio] = useState('por noche');

    // Checkboxes
    const [perros, setPerros] = useState(false);
    const [gatos, setGatos] = useState(false);
    const [otras, setOtras] = useState(false);
    const [tamanoPequeno, setTamanoPequeno] = useState(false);
    const [tamanoMediano, setTamanoMediano] = useState(false);
    const [tamanoGrande, setTamanoGrande] = useState(false);

    const [disponibilidad, setDisponibilidad] = useState('');
    const [fotos, setFotos] = useState<string[]>([]);
    const [uploadingFotos, setUploadingFotos] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchCategorias();
            if (existingServiceId) {
                fetchService(existingServiceId);
            } else {
                resetForm();
            }
        }
    }, [isOpen, existingServiceId]);

    const resetForm = () => {
        setCategoriaId('');
        setTitulo('');
        setDescripcion('');
        setPrecioDesde('');
        setPrecioHasta('');
        setUnidadPrecio('por noche');
        setPerros(false);
        setGatos(false);
        setOtras(false);
        setTamanoPequeno(false);
        setTamanoMediano(false);
        setTamanoGrande(false);
        setDisponibilidad('');
        setFotos([]);
    };

    const fetchCategorias = async () => {
        const { data, error } = await supabase.from('categorias_servicio').select('id, nombre, icono').order('nombre');
        if (!error && data) {
            setCategorias(data);
            if (!existingServiceId && data.length > 0) {
                setCategoriaId(data[0].id);
            }
        }
    };

    const fetchService = async (id: string) => {
        setFetching(true);
        const { data, error } = await supabase.from('servicios_publicados').select('*').eq('id', id).single();
        if (!error && data) {
            setCategoriaId(data.categoria_id);
            setTitulo(data.titulo || '');
            setDescripcion(data.descripcion || '');
            setPrecioDesde(data.precio_desde || '');
            setPrecioHasta(data.precio_hasta || '');
            setUnidadPrecio(data.unidad_precio || 'por noche');
            setPerros(data.acepta_perros || false);
            setGatos(data.acepta_gatos || false);
            setOtras(data.acepta_otras || false);

            const sizes = data.tamanos_aceptados || [];
            setTamanoPequeno(sizes.includes('pequeño'));
            setTamanoMediano(sizes.includes('mediano'));
            setTamanoGrande(sizes.includes('grande'));

            setDisponibilidad(data.disponibilidad || '');
            setFotos(data.fotos || []);
        }
        setFetching(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        if (fotos.length + files.length > 8) {
            toast.error('Puedes subir un máximo de 8 fotos.');
            return;
        }

        setUploadingFotos(true);
        const newUrls: string[] = [];

        for (const file of files) {
            // Check sizes/types briefly
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`La imagen ${file.name} es muy grande. Máximo 5MB`);
                continue;
            }

            const ext = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
            const filePath = `${proveedorId}/${fileName}`;

            const { data, error } = await supabase.storage.from('servicios-fotos').upload(filePath, file);

            if (error) {
                toast.error(`Error al subir ${file.name}`);
                console.error(error);
            } else if (data) {
                const { data: publicUrl } = supabase.storage.from('servicios-fotos').getPublicUrl(filePath);
                newUrls.push(publicUrl.publicUrl);
            }
        }

        setFotos(prev => [...prev, ...newUrls]);
        setUploadingFotos(false);
    };

    const removeFoto = (urlStr: string) => {
        setFotos(prev => prev.filter(f => f !== urlStr));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (titulo.length > 80) return toast.error("El título es muy largo.");
        if (descripcion.length > 500) return toast.error("La descripción es muy larga.");
        if (!precioDesde) return toast.error("El precio desde es obligatorio.");

        setLoading(true);

        const sizes = [];
        if (perros) {
            if (tamanoPequeno) sizes.push('pequeño');
            if (tamanoMediano) sizes.push('mediano');
            if (tamanoGrande) sizes.push('grande');
        }

        const payload = {
            proveedor_id: proveedorId,
            categoria_id: categoriaId,
            titulo,
            descripcion,
            precio_desde: precioDesde,
            precio_hasta: precioHasta === '' ? null : precioHasta,
            unidad_precio: unidadPrecio,
            acepta_perros: perros,
            acepta_gatos: gatos,
            acepta_otras: otras,
            tamanos_aceptados: perros ? sizes : [],
            disponibilidad,
            fotos
        };

        if (existingServiceId) {
            const { error } = await supabase.from('servicios_publicados').update(payload).eq('id', existingServiceId);
            if (error) {
                toast.error('Error al actualizar: ' + error.message);
            } else {
                toast.success('Servicio actualizado correctamente');
                onSuccess();
                onClose();
            }
        } else {
            const { error } = await supabase.from('servicios_publicados').insert({ ...payload, activo: true });
            if (error) {
                toast.error('Error al publicar: ' + error.message);
            } else {
                toast.success('Servicio publicado correctamente');
                onSuccess();
                onClose();
            }
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative my-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
                    <h2 className="text-xl font-bold text-slate-900">
                        {existingServiceId ? 'Editar Servicio' : 'Publicar Nuevo Servicio'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {fetching ? (
                    <div className="p-12 flex justify-center items-center">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Categoría y Título */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Categoría</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    value={categoriaId}
                                    onChange={(e) => setCategoriaId(e.target.value)}
                                    required
                                >
                                    {categorias.map(c => (
                                        <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Título <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={titulo}
                                    onChange={e => setTitulo(e.target.value)}
                                    maxLength={80}
                                    required
                                    placeholder="Ej: Hospedaje cariñoso con amplio patio"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                />
                                <div className="text-right text-xs text-slate-400 mt-1">{titulo.length}/80</div>
                            </div>
                        </div>

                        {/* Descripción */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descripción</label>
                            <textarea
                                value={descripcion}
                                onChange={e => setDescripcion(e.target.value)}
                                maxLength={500}
                                rows={4}
                                placeholder="Describe tu servicio, qué incluye, el ambiente que ofreces..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                            />
                            <div className="text-right text-xs text-slate-400 mt-1">{descripcion.length}/500</div>
                        </div>

                        {/* Precios */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Precio desde ($) <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    value={precioDesde}
                                    onChange={e => setPrecioDesde(Number(e.target.value))}
                                    required
                                    min={0}
                                    placeholder="15000"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Precio máximo (opcional)</label>
                                <input
                                    type="number"
                                    value={precioHasta}
                                    onChange={e => setPrecioHasta(e.target.value ? Number(e.target.value) : '')}
                                    min={0}
                                    placeholder="30000"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Unidad</label>
                                <select
                                    value={unidadPrecio}
                                    onChange={e => setUnidadPrecio(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                >
                                    <option value="por noche">por noche</option>
                                    <option value="por hora">por hora</option>
                                    <option value="por sesión">por sesión</option>
                                    <option value="por paseo">por paseo</option>
                                    <option value="por mes">por mes</option>
                                </select>
                            </div>
                        </div>

                        {/* Mascotas */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Mascotas Aceptadas</label>
                            <div className="flex flex-wrap gap-4 mb-4">
                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <input type="checkbox" checked={perros} onChange={e => setPerros(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                                    Perros
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <input type="checkbox" checked={gatos} onChange={e => setGatos(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                                    Gatos
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <input type="checkbox" checked={otras} onChange={e => setOtras(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                                    Otras especies
                                </label>
                            </div>

                            {perros && (
                                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-wrap gap-4">
                                    <span className="text-sm font-semibold text-emerald-900 mr-2 w-full sm:w-auto">Tamaños P. permitidos:</span>
                                    <label className="flex items-center gap-2 text-sm text-emerald-800 cursor-pointer">
                                        <input type="checkbox" checked={tamanoPequeno} onChange={e => setTamanoPequeno(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500" />
                                        Pequeño
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-emerald-800 cursor-pointer">
                                        <input type="checkbox" checked={tamanoMediano} onChange={e => setTamanoMediano(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500" />
                                        Mediano
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-emerald-800 cursor-pointer">
                                        <input type="checkbox" checked={tamanoGrande} onChange={e => setTamanoGrande(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500" />
                                        Grande
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Disponibilidad */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Disponibilidad (Texto Libre)</label>
                            <input
                                type="text"
                                value={disponibilidad}
                                onChange={e => setDisponibilidad(e.target.value)}
                                placeholder="Ej: Lunes a viernes, 9:00 a 18:00"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                        </div>

                        {/* Fotos */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between">
                                Galería de Fotos
                                <span className="font-normal text-slate-400">{fotos.length}/8 fotos</span>
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                {fotos.map((url, i) => (
                                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group">
                                        <img src={url} alt={`Foto ${i}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeFoto(url)}
                                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                                {fotos.length < 8 && (
                                    <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 hover:border-emerald-400 transition-colors">
                                        {uploadingFotos ? (
                                            <Loader2 size={24} className="text-slate-400 animate-spin" />
                                        ) : (
                                            <>
                                                <Upload size={24} className="text-slate-400 mb-2" />
                                                <span className="text-xs text-slate-500 font-medium tracking-wide">SUBIR FOTO</span>
                                            </>
                                        )}
                                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploadingFotos} />
                                    </label>
                                )}
                            </div>
                        </div>
                    </form>
                )}

                {/* Footer Buttons */}
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || fetching || uploadingFotos}
                        className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {existingServiceId ? 'Guardar Cambios' : 'Publicar Servicio'}
                    </button>
                </div>
            </div>
            <Toaster position="top-center" richColors />
        </div>
    );
}
