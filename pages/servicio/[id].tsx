import React, { useState } from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

import LoginRequiredModal from '../../components/Shared/LoginRequiredModal';
import ReviewModal from '../../components/Service/ReviewModal';

interface ServiceDetailProps {
    service: any; // Using any for brevity, structure defined below
    reviews: any[];
}

export default function ServicioPage({ service, reviews }: ServiceDetailProps) {
    const router = useRouter();
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Derived state
    const proveedor = service.proveedores;
    const categoria = service.categorias_servicio;
    const coverImage = service.fotos?.[0] || proveedor.foto_perfil || 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=1200';

    // Rating distribution math
    const totalReviews = reviews.length;
    const calculatePercentage = (stars: number) => {
        if (totalReviews === 0) return 0;
        const count = reviews.filter(r => r.rating === stars).length;
        return (count / totalReviews) * 100;
    };

    const handleChatClick = async () => {
        setIsChatLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setLoginModalOpen(true);
                return;
            }

            // Look for existing conversation
            const { data: existingConv } = await supabase
                .from('conversations')
                .select('id')
                .eq('client_id', session.user.id)
                .eq('sitter_id', proveedor.id)
                .eq('servicio_id', service.id)
                .maybeSingle();

            if (existingConv) {
                router.push(`/mensajes?id=${existingConv.id}`);
                return;
            }

            // Create new conversation
            const { data: newConv, error } = await supabase
                .from('conversations')
                .insert({
                    client_id: session.user.id,
                    sitter_id: proveedor.id,
                    servicio_id: service.id,
                    proveedor_auth_id: proveedor.auth_user_id
                })
                .select()
                .single();

            if (error) throw error;
            if (newConv) {
                router.push(`/mensajes?id=${newConv.id}`);
            }

        } catch (error) {
            console.error('Error starting conversation:', error);
            alert('Hubo un error al intentar abrir el chat.');
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleWhatsApp = () => {
        if (!proveedor.telefono) return;
        const phone = proveedor.telefono.replace(/\D/g, '');
        const text = encodeURIComponent(`Hola ${proveedor.nombre}, te contacto desde Pawnecta por tu servicio de "${service.titulo}".`);
        window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    };

    const handleLeaveReview = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setLoginModalOpen(true);
        } else {
            setReviewModalOpen(true);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Head>
                <title>{service.titulo} - {proveedor.nombre} | Pawnecta</title>
                <meta name="description" content={service.descripcion?.substring(0, 160)} />
            </Head>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Back Link */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-medium transition-colors mb-6"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Volver
                </button>

                <div className="flex flex-col lg:flex-row gap-8">

                    {/* COLUMNA IZQUIERDA: DETALLES */}
                    <div className="w-full lg:w-2/3 flex flex-col gap-8">

                        {/* Galeria / Portada */}
                        <div className="w-full h-[300px] md:h-[450px] bg-slate-200 rounded-3xl overflow-hidden relative shadow-sm">
                            <img
                                src={coverImage}
                                alt={service.titulo}
                                className="w-full h-full object-cover"
                            />
                            {/* Overlay subtil para mejor contraste */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-transparent"></div>

                            {/* Badge Categoria Flotante */}
                            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 bg-white/90 backdrop-blur-md text-slate-800 text-sm md:text-base font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                                <span>{categoria.icono}</span>
                                <span>{categoria.nombre}</span>
                            </div>

                            {/* Acciones flotantes fotos */}
                            {service.fotos?.length > 1 && (
                                <div className="absolute bottom-4 right-4 z-10 bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                                    1 / {service.fotos.length}
                                </div>
                            )}
                        </div>

                        {/* Encabezado del Servicio */}
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-4">
                                {service.titulo}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 text-slate-600 text-sm md:text-base font-medium">
                                <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg">
                                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    {proveedor.comuna}
                                </span>
                                <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-lg">
                                    <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                    {(totalReviews > 0 ? (reviews.reduce((acc, r: any) => acc + r.rating, 0) / totalReviews) : 0).toFixed(1)} Rating
                                </span>
                            </div>
                        </div>

                        {/* Mascotas Aceptadas */}
                        {service.tipos_mascota && service.tipos_mascota.length > 0 && (
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Tipos de mascota</h3>
                                <div className="flex flex-wrap gap-2">
                                    {service.tipos_mascota.map((tm: string) => (
                                        <div key={tm} className="bg-slate-50 text-slate-700 font-medium border border-slate-200 px-4 py-2 rounded-full uppercase text-sm tracking-wide">
                                            {tm === 'perros' && '🐕 Perros'}
                                            {tm === 'gatos' && '🐈 Gatos'}
                                            {tm === 'exoticos' && '🦜 Exóticos'}
                                            {!['perros', 'gatos', 'exoticos'].includes(tm) && `🐾 ${tm}`}
                                        </div>
                                    ))}
                                    {service.tamanos_permitidos?.length > 0 && (
                                        <div className="bg-indigo-50 text-indigo-700 font-medium border border-indigo-100 px-4 py-2 rounded-full text-sm">
                                            Tallas: {service.tamanos_permitidos.join(', ')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Descripcion */}
                        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                Acerca del Servicio
                            </h3>
                            <div className="prose prose-slate prose-emerald max-w-none break-words whitespace-pre-wrap text-slate-600 leading-relaxed">
                                {service.descripcion}
                            </div>
                        </div>

                        {/* Que Incluye */}
                        {service.que_incluye && service.que_incluye.length > 0 && (
                            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
                                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                    ¿Qué incluye?
                                </h3>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {service.que_incluye.map((inc: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-slate-600">
                                            <svg className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            <span>{inc}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Evaluaciones */}
                        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    Evaluaciones
                                </h3>
                                <button
                                    onClick={handleLeaveReview}
                                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-2 px-4 rounded-xl transition-colors text-sm"
                                >
                                    Dejar mi evaluación
                                </button>
                            </div>

                            {totalReviews > 0 ? (
                                <div>
                                    {/* Resumen Numerico Barra */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-10">
                                        <div className="md:col-span-4 flex flex-col items-center justify-center bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                            <span className="text-5xl font-black text-slate-900">
                                                {(reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)}
                                            </span>
                                            <div className="flex items-center text-amber-400 mt-2 mb-1">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                                ))}
                                            </div>
                                            <span className="text-sm text-slate-500 font-medium">{totalReviews} evaluaciones</span>
                                        </div>
                                        <div className="md:col-span-8 flex flex-col justify-center gap-2">
                                            {[5, 4, 3, 2, 1].map(stars => (
                                                <div key={stars} className="flex items-center gap-3">
                                                    <span className="text-sm font-medium text-slate-600 w-3">{stars}</span>
                                                    <svg className="w-4 h-4 text-slate-300 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${calculatePercentage(stars)}%` }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Lista de Reviews */}
                                    <div className="flex flex-col gap-6">
                                        {reviews.map(review => {
                                            const u = review.usuarios_buscadores;
                                            return (
                                                <div key={review.id} className="border-t border-slate-100 pt-6 flex flex-col gap-2">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                                                {u?.foto_perfil ? (
                                                                    <img src={u.foto_perfil} alt={u.nombre} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm">{u?.nombre?.[0] || '?'}</div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-slate-900 text-sm">{u?.nombre} {u?.apellido_p}</h4>
                                                                <p className="text-xs text-slate-500">{new Date(review.created_at).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex text-amber-400">
                                                            {[...Array(5)].map((_, i) => (
                                                                <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-slate-200 fill-current'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <p className="text-slate-600 mt-2 text-sm leading-relaxed whitespace-pre-wrap">{review.comentario}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-slate-500 font-medium">Aún no hay evaluaciones para este servicio. ¡Sé el primero en dejar una!</p>
                                </div>
                            )}

                        </div>

                    </div>

                    {/* COLUMNA DERECHA: SIDEBAR (Sticky) */}
                    <div className="w-full lg:w-1/3 space-y-6">
                        <div className="sticky top-24 bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/40 border border-slate-200 flex flex-col relative overflow-hidden">
                            {/* Accent Top Bar */}
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>

                            {/* Precio Gigante */}
                            <div className="flex flex-col pb-6 border-b border-slate-100 mb-6 mt-2">
                                <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Precio desde</span>
                                <div className="flex items-end gap-1 text-slate-900">
                                    <span className="text-4xl font-black">${service.precio_desde?.toLocaleString('es-CL')}</span>
                                    <span className="text-slate-500 font-medium mb-1">/{service.unidad_precio}</span>
                                </div>
                            </div>

                            {/* Card del Proveedor */}
                            <div className="flex flex-col items-center justify-center gap-2 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="w-20 h-20 rounded-full border-4 border-white shadow-md relative overflow-hidden bg-slate-200">
                                    {proveedor.foto_perfil ? (
                                        <img src={proveedor.foto_perfil} alt={proveedor.nombre} className="w-full h-full object-cover" />
                                    ) : (
                                        <svg className="w-full h-full text-slate-400 p-2" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    )}
                                </div>

                                <div className="text-center">
                                    <h2 className="text-lg font-bold text-slate-900 flex items-center justify-center gap-1.5">
                                        {proveedor.nombre} {proveedor.apellido_p}
                                        {proveedor.rut_verificado && (
                                            <span className="bg-emerald-100 text-emerald-600 p-0.5 rounded-full" title="Identidad Verificada">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            </span>
                                        )}
                                    </h2>
                                    <p className="text-slate-500 text-sm">Prestador en Pawnecta</p>
                                </div>
                            </div>

                            {/* Acciones */}
                            <div className="flex flex-col gap-3">

                                <button
                                    onClick={handleChatClick}
                                    disabled={isChatLoading}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-200"
                                >
                                    {isChatLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                            Enviar Mensaje
                                        </>
                                    )}
                                </button>

                                {proveedor.mostrar_whatsapp && proveedor.telefono && (
                                    <button
                                        onClick={handleWhatsApp}
                                        className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-[#25D366]/20"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                        Contactar por WhatsApp
                                    </button>
                                )}

                                {proveedor.mostrar_telefono && proveedor.telefono && (
                                    <a
                                        href={`tel:${proveedor.telefono}`}
                                        className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border-2 border-slate-200"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                        Llamar al Sitter
                                    </a>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <LoginRequiredModal
                isOpen={loginModalOpen}
                onClose={() => setLoginModalOpen(false)}
            />
            <ReviewModal
                isOpen={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                servicioId={service.id}
                proveedorId={proveedor.id}
                serviceTitle={service.titulo}
            />
        </div>
    );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { id } = context.params as { id: string };

    try {
        // Fetch Service details
        const { data: service, error: serviceError } = await supabase
            .from('servicios_publicados')
            .select(`
                *,
                proveedores!inner(
                    id, auth_user_id, nombre, apellido_p, rut_verificado, foto_perfil, comuna, mostrar_whatsapp, mostrar_telefono, telefono
                ),
                categorias_servicio!inner(
                    nombre, slug, icono
                )
            `)
            .eq('id', id)
            .eq('activo', true)
            .eq('proveedores.estado', 'aprobado')
            .maybeSingle();

        if (serviceError || !service) {
            console.error("Servicio no encontrado o inactivo", serviceError);
            return {
                redirect: {
                    destination: '/explorar',
                    permanent: false,
                },
            };
        }

        // Fetch Reviews
        const { data: reviews, error: reviewsError } = await supabase
            .from('evaluaciones')
            .select(`
                *,
                usuarios_buscadores(nombre, apellido_p, foto_perfil)
            `)
            .eq('servicio_id', id)
            .eq('estado', 'aprobado')
            .order('created_at', { ascending: false });

        return {
            props: {
                service,
                reviews: reviews || []
            }
        };

    } catch (e) {
        console.error("Error en getServerSideProps de servicio", e);
        return {
            redirect: {
                destination: '/explorar',
                permanent: false,
            },
        };
    }
};
