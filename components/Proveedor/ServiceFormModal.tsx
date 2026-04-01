import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toast, Toaster } from 'sonner';
import { X, Upload, Loader2, Image as ImageIcon, ChevronDown, MapPin, Search } from 'lucide-react';
import { COMUNAS_CHILE } from '../../lib/comunas';

interface ServiceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    proveedorId: string;
    existingServiceId?: string | null;
    onSuccess: () => void;
}

// ─── Category-specific field definitions ──────────────────────────────────────

type FieldType = 'boolean' | 'text' | 'number' | 'select' | 'textarea';

interface CategoryField {
    key: string;
    label: string;
    type: FieldType;
    options?: string[];        // for select
    placeholder?: string;
    hint?: string;
    unit?: string;             // shown after number inputs
}

const CAMPOS_POR_CATEGORIA: Record<string, CategoryField[]> = {
    hospedaje: [
        { key: 'capacidad', label: 'Capacidad máxima de mascotas', type: 'number', placeholder: '2', unit: 'mascotas' },
        { key: 'tipo_espacio', label: 'Tipo de espacio', type: 'select', options: ['Casa', 'Departamento', 'Campo / parcela'] },
        { key: 'tiene_patio', label: 'Tiene patio o jardín', type: 'boolean' },
        { key: 'camara_vigilancia', label: 'Cámara de vigilancia', type: 'boolean' },
        { key: 'incluye_alimentacion', label: 'Incluye alimentación', type: 'boolean' },
        { key: 'incluye_paseos', label: 'Incluye paseos diarios', type: 'boolean' },
        { key: 'mascotas_propias', label: 'Hay mascotas propias en el hogar', type: 'boolean' },
        { key: 'ninos_en_hogar', label: 'Hay niños en el hogar', type: 'boolean' },
        { key: 'fotos_durante_estadia', label: 'Envía fotos durante la estadía', type: 'boolean' },
    ],
    guarderia: [
        { key: 'horario', label: 'Horario de atención', type: 'text', placeholder: 'Lun–Vie 8:00–18:00' },
        { key: 'capacidad', label: 'Capacidad máxima', type: 'number', placeholder: '5', unit: 'mascotas' },
        { key: 'tiene_patio', label: 'Tiene patio o área al aire libre', type: 'boolean' },
        { key: 'actividades', label: 'Actividades incluidas', type: 'text', placeholder: 'Socialización, juegos, siesta...' },
        { key: 'camara_vigilancia', label: 'Cámara de vigilancia', type: 'boolean' },
        { key: 'fotos_durante', label: 'Envía fotos / reporte del día', type: 'boolean' },
    ],
    paseos: [
        { key: 'duracion_minutos', label: 'Duración del paseo', type: 'select', options: ['30 minutos', '45 minutos', '60 minutos', '90 minutos'] },
        { key: 'max_perros', label: 'Máx. perros por paseo', type: 'number', placeholder: '4', unit: 'perros' },
        { key: 'zona_paseo', label: 'Zona / parque donde se pasea', type: 'text', placeholder: 'Parque O\'Higgins, Parque Forestal...' },
        { key: 'lleva_gps', label: 'Usa GPS durante el paseo', type: 'boolean' },
        { key: 'envia_fotos', label: 'Envía fotos del paseo', type: 'boolean' },
        { key: 'razas_fuerza', label: 'Acepta razas de fuerza / gran porte', type: 'boolean' },
    ],
    peluqueria: [
        { key: 'modalidad', label: 'Modalidad', type: 'select', options: ['En local', 'A domicilio', 'Ambas'] },
        { key: 'duracion_estimada', label: 'Duración estimada', type: 'text', placeholder: '1–2 horas según tamaño' },
        { key: 'que_incluye', label: 'Qué incluye el servicio', type: 'textarea', placeholder: 'Baño, corte, secado, corte de uñas...' },
        { key: 'razas_especiales', label: 'Trabaja razas de doble pelaje / razas especiales', type: 'boolean' },
        { key: 'mesa_hidraulica', label: 'Cuenta con mesa hidráulica', type: 'boolean' },
    ],
    veterinario: [
        { key: 'servicios_ofrecidos', label: 'Servicios ofrecidos', type: 'textarea', placeholder: 'Consulta general, vacunas, desparasitación...' },
        { key: 'atiende_urgencias', label: 'Atiende urgencias', type: 'boolean' },
        { key: 'emite_boleta', label: 'Emite boleta / factura', type: 'boolean' },
        { key: 'especialidades', label: 'Especialidades (si aplica)', type: 'text', placeholder: 'Dermatología, cardiología...' },
        { key: 'examenes_disponibles', label: 'Exámenes disponibles', type: 'text', placeholder: 'Hemograma, ecografía, radiografía...' },
    ],
    adiestramiento: [
        { key: 'metodo', label: 'Método de entrenamiento', type: 'select', options: ['Refuerzo positivo', 'Mixto', 'Clicker training', 'Otro'] },
        { key: 'modalidad', label: 'Modalidad', type: 'select', options: ['A domicilio', 'Online', 'Academia / local'] },
        { key: 'duracion_sesion', label: 'Duración de sesión', type: 'number', placeholder: '60', unit: 'minutos' },
        { key: 'problemas_que_resuelve', label: 'Problemas que trabaja', type: 'textarea', placeholder: 'Ansiedad por separación, agresividad, ladrido...' },
        { key: 'certificaciones', label: 'Certificaciones o estudios', type: 'text', placeholder: 'Certificado IAC, Universidad...' },
    ],
    traslado: [
        { key: 'tipo_vehiculo', label: 'Tipo de vehículo', type: 'text', placeholder: 'Van, SUV, furgón...' },
        { key: 'equipamiento', label: 'Equipamiento de seguridad', type: 'text', placeholder: 'Jaulas certificadas, arnés, red divisoria...' },
        { key: 'mascotas_grandes', label: 'Acepta mascotas de gran tamaño', type: 'boolean' },
    ],
    domicilio: [
        { key: 'visitas_por_dia', label: 'Visitas por día', type: 'number', placeholder: '2', unit: 'visitas' },
        { key: 'duracion_visita', label: 'Duración de cada visita', type: 'number', placeholder: '30', unit: 'minutos' },
        { key: 'que_incluye', label: 'Qué incluye la visita', type: 'textarea', placeholder: 'Alimentación, juego, paseo corto, limpieza...' },
        { key: 'envia_foto_reporte', label: 'Envía foto y reporte de cada visita', type: 'boolean' },
        { key: 'administra_medicamentos', label: 'Administra medicamentos', type: 'boolean' },
    ],
};

// ─── Component ────────────────────────────────────────────────────────────────

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

    // Category-specific fields (stored as JSONB)
    const [detalles, setDetalles] = useState<Record<string, any>>({});

    // Comunas coverage
    const [comunasCobertura, setComunasCobertura] = useState<string[]>([]);
    const [comunaSearch, setComunaSearch] = useState('');
    const [comunaDropdownOpen, setComunaDropdownOpen] = useState(false);
    const comunaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            fetchCategorias();
            if (existingServiceId) {
                fetchService(existingServiceId);
            } else {
                resetForm();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, existingServiceId]);

    // Close comunas dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (comunaRef.current && !comunaRef.current.contains(e.target as Node)) {
                setComunaDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

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
        setDetalles({});
        setComunasCobertura([]);
        setComunaSearch('');
    };

    const fetchCategorias = useCallback(async () => {
        const { data, error } = await supabase.from('categorias_servicio').select('id, nombre, icono, slug').order('nombre');
        if (!error && data) {
            setCategorias(data);
            if (!existingServiceId && data.length > 0) {
                setCategoriaId(data[0].id);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
            setDetalles(data.detalles || {});
            setComunasCobertura(data.comunas_cobertura || []);
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

    const setDetalle = (key: string, val: any) => {
        setDetalles(prev => ({ ...prev, [key]: val }));
    };

    const toggleComuna = (comuna: string) => {
        setComunasCobertura(prev =>
            prev.includes(comuna) ? prev.filter(c => c !== comuna) : [...prev, comuna]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoriaId) return toast.error("Selecciona una categoría.");
        if (!titulo.trim()) return toast.error("El título es obligatorio.");
        if (titulo.length > 80) return toast.error("El título es muy largo (máx. 80 caracteres).");
        if (!descripcion.trim()) return toast.error("La descripción es obligatoria.");
        if (descripcion.length > 500) return toast.error("La descripción es muy larga (máx. 500 caracteres).");
        if (!precioDesde) return toast.error("El precio desde es obligatorio.");
        if (!perros && !gatos && !otras) return toast.error("Selecciona al menos un tipo de mascota aceptada.");
        if (comunasCobertura.length === 0) return toast.error("Selecciona al menos una comuna de cobertura.");

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
            detalles,
            comunas_cobertura: comunasCobertura,
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

    const selectedCat = categorias.find(c => c.id === categoriaId);
    const selectedCatSlug = selectedCat?.slug || '';
    const camposCategoria = CAMPOS_POR_CATEGORIA[selectedCatSlug] || [];
    const coverPreview = fotos[0] || null;

    const comunasFiltradas = COMUNAS_CHILE.filter(c =>
        comunaSearch ? c.toLowerCase().includes(comunaSearch.toLowerCase()) : true
    ).slice(0, 50);

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
                {comunasCobertura.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {comunasCobertura.slice(0, 3).map(c => (
                            <span key={c} className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-100">
                                {c}
                            </span>
                        ))}
                        {comunasCobertura.length > 3 && (
                            <span className="text-[10px] text-slate-400">+{comunasCobertura.length - 3} más</span>
                        )}
                    </div>
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
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-0 lg:border-r lg:border-slate-100">

                            {/* ── SECCIÓN 1: Información básica ── */}
                            <div className="pb-6">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Información básica</p>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-1">
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoría</label>
                                            <select
                                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white transition-colors"
                                                value={categoriaId}
                                                onChange={(e) => { setCategoriaId(e.target.value); setDetalles({}); }}
                                                required
                                            >
                                                {categorias.map(c => (
                                                    <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Título <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                value={titulo}
                                                onChange={e => setTitulo(e.target.value)}
                                                maxLength={80}
                                                required
                                                placeholder="Ej: Hospedaje cariñoso con amplio patio"
                                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 transition-colors"
                                            />
                                            <div className="text-right text-xs text-slate-400 mt-1">{titulo.length}/80</div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripción <span className="text-red-500">*</span></label>
                                        <textarea
                                            value={descripcion}
                                            onChange={e => setDescripcion(e.target.value)}
                                            maxLength={500}
                                            rows={3}
                                            placeholder="Describe tu servicio, qué incluye, el ambiente que ofreces..."
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 transition-colors resize-none"
                                        />
                                        <div className="text-right text-xs text-slate-400 mt-1">{descripcion.length}/500</div>
                                    </div>
                                </div>
                            </div>

                            {/* ── SECCIÓN 2: Precio y disponibilidad ── */}
                            <div className="border-t border-slate-100 py-6">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Precio y disponibilidad</p>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Desde ($) <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={precioDesde ? Number(precioDesde).toLocaleString('es-CL') : ''}
                                                onChange={e => { const raw = e.target.value.replace(/\D/g, ''); setPrecioDesde(raw ? Number(raw) : ''); }}
                                                required
                                                placeholder="15.000"
                                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Hasta ($)</label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={precioHasta ? Number(precioHasta).toLocaleString('es-CL') : ''}
                                                onChange={e => { const raw = e.target.value.replace(/\D/g, ''); setPrecioHasta(raw ? Number(raw) : ''); }}
                                                placeholder="Opcional"
                                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Unidad</label>
                                            <select
                                                value={unidadPrecio}
                                                onChange={e => setUnidadPrecio(e.target.value)}
                                                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white transition-colors"
                                            >
                                                <option value="por noche">por noche</option>
                                                <option value="por hora">por hora</option>
                                                <option value="por sesión">por sesión</option>
                                                <option value="por paseo">por paseo</option>
                                                <option value="por mes">por mes</option>
                                                <option value="por visita">por visita</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Disponibilidad</label>
                                        <input
                                            type="text"
                                            value={disponibilidad}
                                            onChange={e => setDisponibilidad(e.target.value)}
                                            placeholder="Ej: Lunes a viernes, 9:00 a 18:00"
                                            className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── SECCIÓN 3: Mascotas ── */}
                            <div className="border-t border-slate-100 py-6">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Mascotas aceptadas <span className="text-red-500">*</span></p>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {[
                                        { label: 'Perros', checked: perros, set: setPerros, emoji: '🐶' },
                                        { label: 'Gatos', checked: gatos, set: setGatos, emoji: '🐱' },
                                        { label: 'Otras', checked: otras, set: setOtras, emoji: '🐾' },
                                    ].map(m => (
                                        <button key={m.label} type="button" onClick={() => m.set(!m.checked)}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${m.checked
                                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                            }`}>
                                            <span>{m.emoji}</span> {m.label}
                                        </button>
                                    ))}
                                </div>

                                {perros && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs text-slate-500 font-medium mr-1">Tamaños:</span>
                                        {[
                                            { label: 'Pequeño', checked: tamanoPequeno, set: setTamanoPequeno },
                                            { label: 'Mediano', checked: tamanoMediano, set: setTamanoMediano },
                                            { label: 'Grande', checked: tamanoGrande, set: setTamanoGrande },
                                        ].map(t => (
                                            <button key={t.label} type="button" onClick={() => t.set(!t.checked)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${t.checked
                                                    ? 'bg-slate-900 border-slate-900 text-white'
                                                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                                }`}>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── COMUNAS DE COBERTURA ── */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                    <MapPin size={14} className="text-emerald-600" />
                                    Comunas donde prestas el servicio <span className="text-red-500">*</span>
                                </label>
                                <p className="text-xs text-slate-400 mb-2">
                                    Selecciona todas las comunas donde ofreces este servicio. Los clientes podrán encontrarte al filtrar por su zona.
                                </p>

                                {/* Selected chips */}
                                {comunasCobertura.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {comunasCobertura.map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => toggleComuna(c)}
                                                className="flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-1 rounded-full hover:bg-emerald-200 transition-colors"
                                            >
                                                {c}
                                                <X size={10} />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Dropdown */}
                                <div ref={comunaRef} className="relative">
                                    <div
                                        className="flex items-center gap-2 w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50 cursor-text"
                                        onClick={() => setComunaDropdownOpen(true)}
                                    >
                                        <Search size={14} className="text-slate-400 shrink-0" />
                                        <input
                                            type="text"
                                            value={comunaSearch}
                                            onChange={e => { setComunaSearch(e.target.value); setComunaDropdownOpen(true); }}
                                            onFocus={() => setComunaDropdownOpen(true)}
                                            placeholder="Buscar y agregar comunas..."
                                            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                                        />
                                    </div>

                                    {comunaDropdownOpen && (
                                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                            {comunasFiltradas.length === 0 ? (
                                                <p className="text-xs text-slate-400 p-3 text-center">Sin resultados</p>
                                            ) : (
                                                comunasFiltradas.map(c => (
                                                    <button
                                                        key={c}
                                                        type="button"
                                                        onClick={() => { toggleComuna(c); setComunaSearch(''); }}
                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between ${comunasCobertura.includes(c) ? 'text-emerald-700 font-semibold' : 'text-slate-700'}`}
                                                    >
                                                        {c}
                                                        {comunasCobertura.includes(c) && (
                                                            <span className="text-emerald-500 text-xs">✓</span>
                                                        )}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── CAMPOS ESPECÍFICOS POR CATEGORÍA ── */}
                            {camposCategoria.length > 0 && (
                                <div className="border-t border-slate-100 pt-6">
                                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                        <span className="text-base">{selectedCat?.icono}</span>
                                        Detalles de {selectedCat?.nombre}
                                    </h3>
                                    <div className="space-y-4">
                                        {camposCategoria.map(campo => (
                                            <div key={campo.key}>
                                                {campo.type === 'boolean' ? (
                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <div className="relative shrink-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!detalles[campo.key]}
                                                                onChange={e => setDetalle(campo.key, e.target.checked)}
                                                                className="sr-only peer"
                                                            />
                                                            <div className="w-10 h-6 bg-slate-200 peer-checked:bg-emerald-500 rounded-full transition-colors" />
                                                            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                                                        </div>
                                                        <span className="text-sm text-slate-700">{campo.label}</span>
                                                    </label>
                                                ) : campo.type === 'select' ? (
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">{campo.label}</label>
                                                        <select
                                                            value={detalles[campo.key] || ''}
                                                            onChange={e => setDetalle(campo.key, e.target.value)}
                                                            className="w-full h-11 px-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white transition-colors"
                                                        >
                                                            <option value="">Seleccionar...</option>
                                                            {campo.options?.map(opt => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ) : campo.type === 'textarea' ? (
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">{campo.label}</label>
                                                        <textarea
                                                            value={detalles[campo.key] || ''}
                                                            onChange={e => setDetalle(campo.key, e.target.value)}
                                                            placeholder={campo.placeholder}
                                                            rows={2}
                                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 transition-colors resize-none"
                                                        />
                                                    </div>
                                                ) : campo.type === 'number' ? (
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">{campo.label}</label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                value={detalles[campo.key] || ''}
                                                                onChange={e => setDetalle(campo.key, e.target.value ? Number(e.target.value) : '')}
                                                                placeholder={campo.placeholder}
                                                                min={0}
                                                                className="w-32 h-11 px-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 transition-colors"
                                                            />
                                                            {campo.unit && <span className="text-sm text-slate-500">{campo.unit}</span>}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">{campo.label}</label>
                                                        <input
                                                            type="text"
                                                            value={detalles[campo.key] || ''}
                                                            onChange={e => setDetalle(campo.key, e.target.value)}
                                                            placeholder={campo.placeholder}
                                                            className="w-full h-11 px-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 transition-colors"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
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

                                {uploadingFotos && (
                                    <div className="w-full h-1 bg-slate-100 rounded-full mb-3 overflow-hidden">
                                        <div className="h-full bg-emerald-500 animate-pulse w-2/3 rounded-full" />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                    {fotos.map((url, i) => (
                                        <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group">
                                            <img src={url} alt={"Foto " + (i + 1)} className="w-full h-full object-cover" />

                                            {i === 0 && (
                                                <div className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                                    PORTADA
                                                </div>
                                            )}

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
