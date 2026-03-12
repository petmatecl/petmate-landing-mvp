import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toast, Toaster } from 'sonner';
import { X, Upload, Loader2, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { SERVICE_DETAILS_CONFIG, DIAS_SEMANA, type ServiceField } from '../../lib/serviceDetailsConfig';

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
    const [showMobilePreview, setShowMobilePreview] = useState(false);

    // Detalles específicos por categoría (JSONB)
    const [detallesServicio, setDetallesServicio] = useState<Record<string, any>>({});

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
        setDetallesServicio({});
    };

    const fetchCategorias = async () => {
        const { data, error } = await supabase.from('categorias_servicio').select('id, nombre, icono, slug').order('nombre');
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
            setDetallesServicio(data.detalles_servicio || {});
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

    const moveFoto = (index: number, direction: "left" | "right") => {
        setFotos(prev => {
            const arr = [...prev];
            const target = direction === "left" ? index - 1 : index + 1;
            if (target < 0 || target >= arr.length) return arr;
            [arr[index], arr[target]] = [arr[target], arr[index]];
            return arr;
        });
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
            fotos,
            detalles_servicio: detallesServicio
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

    const updateDetalle = (key: string, value: any) => {
        setDetallesServicio(prev => ({ ...prev, [key]: value }));
    };

    const toggleDia = (dia: string) => {
        const current: string[] = detallesServicio.dias_disponibles || [];
        if (current.includes(dia)) {
            updateDetalle('dias_disponibles', current.filter((d: string) => d !== dia));
        } else {
            updateDetalle('dias_disponibles', [...current, dia]);
        }
    };

    if (!isOpen) return null;

    const selectedCat = categorias.find(c => c.id === categoriaId);
    const categorySlug = selectedCat?.slug || '';
    const detailsConfig = SERVICE_DETAILS_CONFIG[categorySlug];
    const coverPreview = fotos[0] || null;

    const PreviewCard = () => (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="aspect-[4/3] bg-slate-100 relative">
                {coverPreview ? (
                    <img src={coverPreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon size={32} className="text-slate-300" />
                    </div>
                )}
                {selectedCat && (
                    <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-semibold px-2 py-1 rounded-full border border-slate-200">
                        {selectedCat.icono} {selectedCat.nombre}
                    </span>
                )}
            </div>
            <div className="p-4">
                <h3 className="font-bold text-slate-900 text-sm leading-snug mb-1 line-clamp-2">
                    {titulo || <span className="text-slate-400 font-normal">Título del servicio</span>}
                </h3>
                {descripcion && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-2">{descripcion}</p>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <div>
                        {precioDesde ? (
                            <span className="text-emerald-700 font-bold text-sm">
                                ${Number(precioDesde).toLocaleString('es-CL')}
                                <span className="text-slate-400 font-normal text-xs ml-1">{unidadPrecio}</span>
                            </span>
                        ) : (
                            <span className="text-slate-300 text-xs">Precio por definir</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-amber-400">
                        <span className="text-slate-400 text-xs">Sin reseñas aún</span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl relative my-auto">
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
                    <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row gap-0 min-h-0">
                        {/* FORM */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 lg:border-r lg:border-slate-100">
                            {/* Categoría y Título */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Categoría</label>
                                    <select
                                        className="w-full h-12 px-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white transition-colors"
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
                                        className="w-full h-12 px-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 transition-colors"
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
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 transition-colors resize-none"
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
                                        className="w-full h-12 px-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 transition-colors"
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
                                        className="w-full h-12 px-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Unidad</label>
                                    <select
                                        value={unidadPrecio}
                                        onChange={e => setUnidadPrecio(e.target.value)}
                                        className="w-full h-12 px-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white transition-colors"
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
                                        <input type="checkbox" checked={perros} onChange={e => setPerros(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-600" />
                                        Perros
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                        <input type="checkbox" checked={gatos} onChange={e => setGatos(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-600" />
                                        Gatos
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                        <input type="checkbox" checked={otras} onChange={e => setOtras(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-600" />
                                        Otras especies
                                    </label>
                                </div>

                                {perros && (
                                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-wrap gap-4">
                                        <span className="text-sm font-semibold text-emerald-900 mr-2 w-full sm:w-auto">Tamaños P. permitidos:</span>
                                        <label className="flex items-center gap-2 text-sm text-emerald-800 cursor-pointer">
                                            <input type="checkbox" checked={tamanoPequeno} onChange={e => setTamanoPequeno(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-600" />
                                            Pequeño
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-emerald-800 cursor-pointer">
                                            <input type="checkbox" checked={tamanoMediano} onChange={e => setTamanoMediano(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-600" />
                                            Mediano
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-emerald-800 cursor-pointer">
                                            <input type="checkbox" checked={tamanoGrande} onChange={e => setTamanoGrande(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-600" />
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
                                    className="w-full h-12 px-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 transition-colors"
                                />
                            </div>

                            {/* Detalles específicos del servicio */}
                            {detailsConfig && (
                                <div className="border border-emerald-200 bg-emerald-50/50 rounded-2xl p-5 space-y-4">
                                    <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                        {detailsConfig.sectionTitle}
                                    </h3>
                                    <p className="text-xs text-emerald-700/70">Estos datos ayudan a los clientes a tomar mejores decisiones. Completa lo que aplique a tu servicio.</p>

                                    <div className="space-y-4">
                                        {detailsConfig.fields.map((field) => {
                                            if (field.type === 'days') {
                                                const selectedDays: string[] = detallesServicio.dias_disponibles || [];
                                                return (
                                                    <div key={field.key}>
                                                        <label className="block text-sm font-semibold text-slate-700 mb-2">{field.icon} {field.label}</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {DIAS_SEMANA.map(dia => (
                                                                <button
                                                                    key={dia}
                                                                    type="button"
                                                                    onClick={() => toggleDia(dia)}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                                                        selectedDays.includes(dia)
                                                                            ? 'bg-emerald-600 text-white'
                                                                            : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-400'
                                                                    }`}
                                                                >
                                                                    {dia}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            if (field.type === 'time') {
                                                return (
                                                    <div key={field.key} className="inline-block mr-4">
                                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{field.icon} {field.label}</label>
                                                        <input
                                                            type="time"
                                                            value={detallesServicio[field.key] || ''}
                                                            onChange={e => updateDetalle(field.key, e.target.value)}
                                                            className="w-36 h-10 px-3 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors"
                                                        />
                                                    </div>
                                                );
                                            }

                                            if (field.type === 'select') {
                                                return (
                                                    <div key={field.key}>
                                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{field.icon} {field.label}</label>
                                                        <select
                                                            value={detallesServicio[field.key] || ''}
                                                            onChange={e => updateDetalle(field.key, e.target.value)}
                                                            className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors"
                                                        >
                                                            <option value="">{field.placeholder || 'Seleccionar...'}</option>
                                                            {field.options?.map(opt => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                );
                                            }

                                            if (field.type === 'number') {
                                                return (
                                                    <div key={field.key}>
                                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{field.icon} {field.label}</label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                value={detallesServicio[field.key] || ''}
                                                                onChange={e => updateDetalle(field.key, e.target.value ? Number(e.target.value) : '')}
                                                                min={1}
                                                                placeholder={field.placeholder}
                                                                className="w-28 h-10 px-3 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors"
                                                            />
                                                            {field.suffix && <span className="text-xs text-slate-500">{field.suffix}</span>}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            if (field.type === 'boolean') {
                                                return (
                                                    <label key={field.key} className="flex items-center gap-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={detallesServicio[field.key] || false}
                                                            onChange={e => updateDetalle(field.key, e.target.checked)}
                                                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-600"
                                                        />
                                                        <span className="text-sm text-slate-700">{field.icon} {field.label}</span>
                                                    </label>
                                                );
                                            }

                                            // text
                                            return (
                                                <div key={field.key}>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{field.icon} {field.label}</label>
                                                    <input
                                                        type="text"
                                                        value={detallesServicio[field.key] || ''}
                                                        onChange={e => updateDetalle(field.key, e.target.value)}
                                                        placeholder={field.placeholder}
                                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 placeholder:text-slate-400 transition-colors"
                                                    />
                                                    {field.helpText && <p className="text-xs text-slate-400 mt-1">{field.helpText}</p>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Fotos */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-semibold text-slate-700">
                                        Fotos del servicio
                                    </label>
                                    <span className="text-xs text-slate-400 font-medium">{fotos.length}/8</span>
                                </div>

                                {/* Barra de progreso al subir */}
                                {uploadingFotos && (
                                    <div className="w-full h-1 bg-slate-100 rounded-full mb-3 overflow-hidden">
                                        <div className="h-full bg-emerald-500 animate-pulse w-2/3 rounded-full" />
                                    </div>
                                )}

                                {/* Grid de fotos + boton de subir */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                    {fotos.map((url, i) => (
                                        <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group">
                                            <img src={url} alt={"Foto " + (i + 1)} className="w-full h-full object-cover" />

                                            {/* Badge portada solo en la primera */}
                                            {i === 0 && (
                                                <div className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                                    PORTADA
                                                </div>
                                            )}

                                            {/* Controles: flechas + eliminar (visible al hover) */}
                                            <div className="absolute bottom-1.5 inset-x-1.5 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                                <div className="flex gap-1">
                                                    {i > 0 && (
                                                        <button type="button" onClick={() => moveFoto(i, "left")}
                                                            className="bg-black/60 hover:bg-black/80 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold transition-colors"
                                                            title="Mover a la izquierda">
                                                            ←
                                                        </button>
                                                    )}
                                                    {i < fotos.length - 1 && (
                                                        <button type="button" onClick={() => moveFoto(i, "right")}
                                                            className="bg-black/60 hover:bg-black/80 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold transition-colors"
                                                            title="Mover a la derecha">
                                                            →
                                                        </button>
                                                    )}
                                                </div>
                                                <button type="button" onClick={() => removeFoto(url)}
                                                    className="bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                                                    title="Eliminar foto">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Boton de subir — mas grande si no hay fotos aun */}
                                    {fotos.length < 8 && (
                                        <label className={[
                                            "rounded-xl border-2 border-dashed border-slate-300 bg-slate-50",
                                            "flex flex-col items-center justify-center cursor-pointer",
                                            "hover:bg-slate-100 hover:border-emerald-400 transition-colors",
                                            fotos.length === 0 ? "col-span-2 sm:col-span-4 py-10" : "aspect-square"
                                        ].join(" ")}
                                        >
                                            {uploadingFotos ? (
                                                <Loader2 size={24} className="text-slate-400 animate-spin" />
                                            ) : (
                                                <>
                                                    <Upload size={fotos.length === 0 ? 32 : 22} className="text-slate-400 mb-2" />
                                                    <span className="text-xs text-slate-500 font-semibold text-center px-2">
                                                        {fotos.length === 0 ? "Haz click para subir fotos" : "Agregar"}
                                                    </span>
                                                    {fotos.length === 0 && (
                                                        <span className="text-[11px] text-slate-400 mt-1">
                                                            JPG, PNG, WebP — max 5MB c/u
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                            <input type="file" multiple accept="image/*" className="hidden"
                                                onChange={handleFileUpload} disabled={uploadingFotos} />
                                        </label>
                                    )}
                                </div>

                                {/* Texto de ayuda */}
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    <span className="font-semibold text-emerald-700">La primera foto es la portada</span>
                                    {" "}y es la que aparece en el listado. Usa las flechas para reordenar. Puedes subir hasta 8 fotos (JPG, PNG, WebP, max 5MB cada una).
                                </p>
                            </div>
                        </form>

                        {/* PREVIEW PANEL — desktop right column */}
                        <div className="hidden lg:flex flex-col w-72 shrink-0 p-6 bg-slate-50/50">
                            <p className="text-sm text-slate-500 font-medium mb-4">Vista previa</p>
                            <PreviewCard />
                            <p className="text-xs text-slate-400 mt-3 text-center">Así verán tu servicio los clientes</p>
                        </div>

                        {/* PREVIEW PANEL — mobile collapsible */}
                        <div className="lg:hidden border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowMobilePreview(v => !v)}
                                className="w-full flex items-center justify-between px-6 py-3 text-sm text-slate-600 font-semibold hover:bg-slate-50"
                            >
                                Vista previa
                                <ChevronDown size={16} className={`transition-transform ${showMobilePreview ? 'rotate-180' : ''}`} />
                            </button>
                            {showMobilePreview && (
                                <div className="px-6 pb-6">
                                    <PreviewCard />
                                </div>
                            )}
                        </div>
                    </div>
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
