import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/Admin/AdminLayout';
import { getAllReviews, updateReviewStatus, createReview, Review } from '../../lib/reviewsService';
import { CheckCircle, XCircle, Clock, Plus, Loader, MapPin, User, ChevronDown, Search } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Image from 'next/image';

export default function AdminReviews() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pendiente' | 'aprobado' | 'rechazado'>('all');
    const [sitters, setSitters] = useState<any[]>([]); // For manual review creation

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [manualReview, setManualReview] = useState({
        sitter_id: '',
        calificacion: 5,
        comentario: '',
        nombre_cliente_manual: '',
        estado: 'aprobado' as const
    });

    // Searchable Dropdown State
    const [sitterSearchTerm, setSitterSearchTerm] = useState("");
    const [isSitterDropdownOpen, setIsSitterDropdownOpen] = useState(false);

    useEffect(() => {
        fetchReviews();
        fetchSitters();
    }, []);

    const fetchReviews = async () => {
        setLoading(true);
        const { data, error } = await getAllReviews();
        if (data) setReviews(data);
        if (error) console.error(error);
        setLoading(false);
    };

    const fetchSitters = async () => {
        const { data } = await supabase
            .from('registro_petmate')
            .select('user_id, nombre, apellido, comunas')
            .order('nombre');
        if (data) setSitters(data);
    };

    const handleStatusChange = async (id: string, status: 'aprobado' | 'rechazado') => {
        const { error } = await updateReviewStatus(id, status);
        if (!error) {
            setReviews(reviews.map(r => r.id === id ? { ...r, estado: status } : r));
        } else {
            alert("Error al actualizar estado");
        }
    };

    const handleCreateManualReview = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await createReview(manualReview);
        if (error) {
            alert("Error: " + error.message);
        } else {
            setIsModalOpen(false);
            setManualReview({ sitter_id: '', calificacion: 5, comentario: '', nombre_cliente_manual: '', estado: 'aprobado' });
            fetchReviews(); // Refresh list
        }
    };

    const filteredReviews = filter === 'all'
        ? reviews
        : reviews.filter(r => (r.estado || 'pendiente') === filter);

    return (
        <AdminLayout>
            <Head>
                <title>Gestión de Reseñas | Admin</title>
            </Head>

            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900">Gestión de Reseñas</h1>
                        <p className="text-slate-500 text-sm">Modera y administra las opiniones de los usuarios.</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 transition"
                    >
                        <Plus size={20} />
                        Generar Review
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {[
                        { id: 'all', label: 'Todas' },
                        { id: 'pendiente', label: 'Pendientes' },
                        { id: 'aprobado', label: 'Aprobadas' },
                        { id: 'rechazado', label: 'Rechazadas' }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id as any)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f.id
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'bg-white text-slate-600 border-2 border-slate-300 hover:bg-slate-50'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border-2 border-slate-300 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-300 text-xs uppercase text-slate-400 font-bold tracking-wider">
                                    <th className="p-4">Fecha</th>
                                    <th className="p-4">Cliente</th>
                                    <th className="p-4">Sitter</th>
                                    <th className="p-4">Calificación</th>
                                    <th className="p-4 w-1/3">Comentario</th>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader className="animate-spin" />
                                                Cargando reseñas...
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredReviews.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-slate-400">
                                            No se encontraron reseñas con este filtro.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReviews.map((review) => (
                                        <tr key={review.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 text-slate-500 whitespace-nowrap">
                                                {new Date(review.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 font-medium text-slate-900">
                                                {review.nombre_cliente_manual || review.cliente?.nombre || 'Anónimo'}
                                                {review.nombre_cliente_manual && (
                                                    <span className="ml-1 text-[10px] bg-slate-100 text-slate-500 px-1 rounded border-2 border-slate-300">Manual</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-slate-600">
                                                {/* Requires joining with sitter data ideally, but for now we rely on user knowing sitter IDs or fix backend join later */}
                                                <span className="font-mono text-xs bg-slate-100 px-1 rounded">{review.sitter_id.substring(0, 8)}...</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex text-amber-400 text-xs">
                                                    {[...Array(5)].map((_, i) => (
                                                        <span key={i}>{i < review.calificacion ? '★' : '☆'}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-600 leading-relaxed max-w-xs truncate" title={review.comentario}>
                                                {review.comentario}
                                            </td>
                                            <td className="p-4">
                                                <StatusBadge status={review.estado || 'pendiente'} />
                                            </td>
                                            <td className="p-4 text-right space-x-2">
                                                {(!review.estado || review.estado === 'pendiente') && (
                                                    <>
                                                        <button
                                                            onClick={() => handleStatusChange(review.id, 'aprobado')}
                                                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                                            title="Aprobar"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(review.id, 'rechazado')}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                            title="Rechazar"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                {review.estado === 'aprobado' && (
                                                    <button
                                                        onClick={() => handleStatusChange(review.id, 'rechazado')}
                                                        className="text-xs text-red-600 hover:underline"
                                                    >
                                                        Rechazar
                                                    </button>
                                                )}
                                                {review.estado === 'rechazado' && (
                                                    <button
                                                        onClick={() => handleStatusChange(review.id, 'aprobado')}
                                                        className="text-xs text-emerald-600 hover:underline"
                                                    >
                                                        Aprobar
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Manual Review */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in slide-in-from-bottom-4 zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900">Generar Review Manual</h3>
                            <button onClick={() => setIsModalOpen(false)}><XCircle className="text-slate-400 hover:text-slate-600" /></button>
                        </div>
                        <form onSubmit={handleCreateManualReview} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Sitter (Cuidador)</label>
                                <div className="relative">
                                    <button
                                        type="button" // Prevent form submission
                                        onClick={() => setIsSitterDropdownOpen(!isSitterDropdownOpen)}
                                        className="w-full border rounded-lg p-2 text-sm text-left flex justify-between items-center bg-white"
                                    >
                                        <span className={manualReview.sitter_id ? "text-slate-900" : "text-slate-400"}>
                                            {manualReview.sitter_id
                                                ? (() => {
                                                    const s = sitters.find(s => s.user_id === manualReview.sitter_id);
                                                    return s ? `${s.nombre} ${s.apellido} (${JSON.parse(s.comunas || '[]').join(', ') || 'Sin comuna'})` : "Cargando...";
                                                })()
                                                : "Selecciona un cuidador..."
                                            }
                                        </span>
                                        <ChevronDown size={16} className="text-slate-400" />
                                    </button>

                                    {isSitterDropdownOpen && (
                                        <div className="absolute z-10 w-full bg-white border-2 border-slate-300 rounded-lg mt-1 shadow-xl max-h-60 flex flex-col">
                                            {/* Search Input */}
                                            <div className="p-2 border-b border-slate-300 sticky top-0 bg-white rounded-t-lg">
                                                <div className="relative">
                                                    <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar por nombre..."
                                                        className="w-full pl-8 pr-2 py-1.5 text-xs border rounded-md focus:ring-1 focus:ring-emerald-500 outline-none"
                                                        value={sitterSearchTerm}
                                                        onChange={(e) => setSitterSearchTerm(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>

                                            {/* List */}
                                            <div className="overflow-y-auto flex-1">
                                                {sitters.filter(s => {
                                                    const fullName = `${s.nombre} ${s.apellido}`.toLowerCase();
                                                    return fullName.includes(sitterSearchTerm.toLowerCase());
                                                }).length === 0 ? (
                                                    <div className="p-3 text-center text-xs text-slate-400">
                                                        No se encontraron resultados.
                                                    </div>
                                                ) : (
                                                    sitters.filter(s => {
                                                        const fullName = `${s.nombre} ${s.apellido}`.toLowerCase();
                                                        return fullName.includes(sitterSearchTerm.toLowerCase());
                                                    }).map(s => (
                                                        <button
                                                            key={s.user_id}
                                                            type="button"
                                                            onClick={() => {
                                                                setManualReview({ ...manualReview, sitter_id: s.user_id });
                                                                setIsSitterDropdownOpen(false);
                                                                setSitterSearchTerm(""); // Reset search
                                                            }}
                                                            className={`w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 transition-colors flex flex-col
                                                                ${manualReview.sitter_id === s.user_id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700'}
                                                            `}
                                                        >
                                                            <span className="font-bold">{s.nombre} {s.apellido}</span>
                                                            <span className="text-[10px] text-slate-400 truncate">
                                                                {JSON.parse(s.comunas || '[]').join(', ') || 'Sin comuna'}
                                                            </span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Cliente (Simulado)</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border rounded-lg p-2 text-sm"
                                    placeholder="Ej: María P."
                                    value={manualReview.nombre_cliente_manual}
                                    onChange={e => setManualReview({ ...manualReview, nombre_cliente_manual: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Calificación</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            type="button"
                                            key={star}
                                            onClick={() => setManualReview({ ...manualReview, calificacion: star })}
                                            className={`text-2xl ${star <= manualReview.calificacion ? 'text-amber-400' : 'text-slate-200'}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Comentario</label>
                                <textarea
                                    required
                                    rows={4}
                                    className="w-full border rounded-lg p-2 text-sm"
                                    placeholder="Excelente servicio, muy atento..."
                                    value={manualReview.comentario}
                                    onChange={e => setManualReview({ ...manualReview, comentario: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end pt-4 gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">Crear Review</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        pendiente: 'bg-amber-100 text-amber-700 border-amber-200',
        aprobado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        rechazado: 'bg-red-100 text-red-700 border-red-200'
    };
    const icons = {
        pendiente: Clock,
        aprobado: CheckCircle,
        rechazado: XCircle
    };
    const Icon = icons[status as keyof typeof icons] || Clock;

    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.pendiente}`}>
            <Icon size={12} />
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}
