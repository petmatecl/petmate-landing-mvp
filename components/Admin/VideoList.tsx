import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Download, Play, Search, User } from 'lucide-react';
import { Skeleton } from '../Shared/Skeleton';
import { getProxyImageUrl } from '../../lib/utils';

export default function VideoList() {
    const [sitters, setSitters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [playingVideo, setPlayingVideo] = useState<string | null>(null);

    useEffect(() => {
        fetchSittersWithVideos();
    }, []);

    const fetchSittersWithVideos = async () => {
        setLoading(true);
        try {
            // Fetch sitters who have a video_presentacion that is not null and not empty string
            const { data, error } = await supabase
                .from('registro_petmate')
                .select('id, auth_user_id, nombre, apellido_p, email, video_presentacion, created_at, approved:aprobado, foto_perfil')
                .neq('video_presentacion', null)
                .neq('video_presentacion', '') // simplistic check, ideally we use 'is not null' but supabase neq null works
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSitters(data || []);
        } catch (error) {
            console.error("Error fetching videos:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSitters = sitters.filter(sitter =>
    (sitter.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sitter.apellido_p?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sitter.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleDownload = (e: React.MouseEvent, url: string, name: string) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = url;
        link.download = `Presentacion_${name.replace(/\s+/g, '_')}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-slate-800">Videos de Presentación</h2>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar sitter..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border-2 border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:w-64"
                    />
                    <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-white p-4 rounded-xl border-2 border-slate-300 shadow-sm animate-pulse">
                            <Skeleton className="h-40 w-full rounded-lg mb-4" />
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {filteredSitters.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-slate-300">
                            <p className="text-slate-500">No se encontraron videos.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredSitters.map(sitter => (
                                <div key={sitter.id} className="bg-white rounded-2xl border-2 border-slate-300 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                                    {/* Video Thumbnail / Player */}
                                    <div className="relative bg-slate-900 aspect-video group">
                                        <video
                                            src={sitter.video_presentacion}
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <button
                                                onClick={() => setPlayingVideo(sitter.video_presentacion)}
                                                className="bg-white/20 hover:bg-white/40 backdrop-blur-sm p-4 rounded-full text-white transition-all transform hover:scale-110"
                                            >
                                                <Play fill="currentColor" size={24} />
                                            </button>
                                        </div>
                                        <div className="absolute top-3 right-3">
                                            <button
                                                onClick={(e) => handleDownload(e, sitter.video_presentacion, sitter.nombre)}
                                                className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg backdrop-blur-sm transition-colors"
                                                title="Descargar Video"
                                            >
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Footer Info */}
                                    <div className="p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            {sitter.foto_perfil ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={getProxyImageUrl(sitter.foto_perfil) || ''} alt={sitter.nombre} className="w-10 h-10 rounded-full object-cover border-2 border-slate-300" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <User size={20} />
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
                                                    {sitter.nombre} {sitter.apellido_p}
                                                </h4>
                                                <p className="text-xs text-slate-500">{sitter.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                ID: {sitter.id.slice(0, 8)}...
                                            </span>
                                            {sitter.approved ? (
                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                                                    Aprobado
                                                </span>
                                            ) : (
                                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                                                    Pendiente
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Modal for Playing Video */}
            {playingVideo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setPlayingVideo(null)}>
                    <div className="relative w-full max-w-4xl max-h-[90vh] aspect-video bg-black rounded-lg overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <button
                            className="absolute top-4 right-4 text-white/50 hover:text-white z-10 p-2"
                            onClick={() => setPlayingVideo(null)}
                        >
                            ✕
                        </button>
                        <video
                            src={playingVideo}
                            controls
                            autoPlay
                            className="w-full h-full object-contain"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
