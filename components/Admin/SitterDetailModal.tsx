import React from "react";
import Image from "next/image";
import { getProxyImageUrl } from "../../lib/utils";
import { CheckCircle, User, Instagram, Music, Briefcase, Facebook, FileText, Video, AlertTriangle } from "lucide-react";

type ProveedorData = {
    id: string;
    nombre: string;
    apellido_p?: string;
    email?: string;
    rut?: string;
    telefono?: string;
    foto_perfil?: string;
    bio?: string;
    comuna?: string;
    region?: string;
    sitio_web?: string;
    instagram?: string;
    video_presentacion?: string;
    certificado_antecedentes?: string;
    galeria?: string[];
    anios_experiencia?: number;
    certificaciones?: string;
    aprobado: boolean;
    rut_verificado?: boolean;
    missingFields?: string[];
    created_at: string;
    redes_sociales?: { linkedin?: string; tiktok?: string; instagram?: string; facebook?: string };
};

type Props = {
    sitter: ProveedorData | null;
    open: boolean;
    onClose: () => void;
    onApprove: (id: string, currentStatus: boolean) => void;
    onViewDocument: (path: string) => void;
};

export default function SitterDetailModal({ sitter, open, onClose, onApprove, onViewDocument }: Props) {
    if (!open || !sitter) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative flex flex-col z-50">
                {/* Header */}
                <div className="p-4 border-b border-slate-300 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">Detalle del Proveedor</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content Scrollable */}
                <div className="overflow-y-auto p-6 flex-1 bg-white">

                    {/* Alerta de Perfil Incompleto */}
                    {sitter.missingFields && sitter.missingFields.length > 0 && (
                        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle className="text-amber-500" size={24} />
                            <div>
                                <h4 className="font-bold text-amber-800 text-sm uppercase">Perfil Incompleto</h4>
                                <p className="text-xs text-amber-700 mt-1">
                                    Para ser verificado, el usuario debe completar los siguientes campos:
                                </p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {sitter.missingFields.map(field => (
                                        <span key={field} className="px-2 py-0.5 bg-white bg-opacity-50 border border-amber-200 rounded text-[10px] font-bold text-amber-800 uppercase">
                                            {field}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

                        {/* Left Col: Photo & Main Info */}
                        <div className="md:col-span-4 space-y-6">
                            <div className="text-center">
                                <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-slate-300 shadow-sm mb-3">
                                    {sitter.foto_perfil ? (
                                        <Image
                                            src={getProxyImageUrl(sitter.foto_perfil) || ''}
                                            alt="Perfil"
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-slate-200 flex items-center justify-center text-3xl">
                                            <User size={48} className="text-slate-400" />
                                        </div>
                                    )}
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">{sitter.nombre} {sitter.apellido_p || ""}</h2>
                                <p className="text-sm text-slate-500">{sitter.email || "Sin email"}</p>
                                <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                    {sitter.aprobado && (!sitter.missingFields || sitter.missingFields.length === 0)
                                        ? <span className="flex items-center gap-1"><CheckCircle size={14} /> Aprobado</span>
                                        : sitter.aprobado
                                            ? <span className="flex items-center gap-1 text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Aprobado (Falta Info) <AlertTriangle size={14} /></span>
                                            : <span className="flex items-center gap-1">Pendiente <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" /></span>
                                    }
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 border-2 border-slate-300 space-y-3 text-sm">
                                {sitter.rut && (
                                    <div>
                                        <span className="block text-xs font-bold text-slate-400 uppercase">RUT</span>
                                        <span className="text-slate-700 font-medium">{sitter.rut}</span>
                                    </div>
                                )}
                                {sitter.telefono && (
                                    <div>
                                        <span className="block text-xs font-bold text-slate-400 uppercase">Teléfono</span>
                                        <span className="text-slate-700 font-medium">{sitter.telefono}</span>
                                    </div>
                                )}
                                {(sitter.comuna || sitter.region) && (
                                    <div>
                                        <span className="block text-xs font-bold text-slate-400 uppercase">Ubicación</span>
                                        <span className="text-slate-700 font-medium">{sitter.comuna}{sitter.region ? `, ${sitter.region}` : ''}</span>
                                    </div>
                                )}
                                {sitter.anios_experiencia !== undefined && sitter.anios_experiencia > 0 && (
                                    <div>
                                        <span className="block text-xs font-bold text-slate-400 uppercase">Experiencia</span>
                                        <span className="text-slate-700 font-medium">{sitter.anios_experiencia} años</span>
                                    </div>
                                )}
                                {sitter.certificaciones && (
                                    <div>
                                        <span className="block text-xs font-bold text-slate-400 uppercase">Certificaciones</span>
                                        <span className="text-slate-700 font-medium">{sitter.certificaciones}</span>
                                    </div>
                                )}
                                <div>
                                    <span className="block text-xs font-bold text-slate-400 uppercase">Identidad</span>
                                    <span className={`text-sm font-bold ${sitter.rut_verificado ? 'text-emerald-700' : 'text-slate-500'}`}>
                                        {sitter.rut_verificado ? '✓ Verificada' : 'Sin verificar'}
                                    </span>
                                </div>
                            </div>

                            {/* Social Media */}
                            {sitter.redes_sociales && Object.values(sitter.redes_sociales).some(v => v) && (
                                <div className="bg-slate-50 rounded-xl p-4 border-2 border-slate-300">
                                    <span className="block text-xs font-bold text-slate-400 uppercase mb-2">Redes Sociales</span>
                                    <div className="flex flex-col gap-2">
                                        {sitter.redes_sociales.instagram && (
                                            <a href={`https://instagram.com/${sitter.redes_sociales.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-700 flex items-center gap-2 text-sm font-medium">
                                                <Instagram size={16} /> {sitter.redes_sociales.instagram}
                                            </a>
                                        )}
                                        {sitter.redes_sociales.tiktok && (
                                            <a href={`https://tiktok.com/@${sitter.redes_sociales.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-black hover:text-gray-700 flex items-center gap-2 text-sm font-medium">
                                                <Music size={16} /> {sitter.redes_sociales.tiktok}
                                            </a>
                                        )}
                                        {sitter.redes_sociales.linkedin && (
                                            <a href={sitter.redes_sociales.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-800 flex items-center gap-2 text-sm font-medium overflow-hidden">
                                                <Briefcase size={16} className="shrink-0" /> <span className="truncate">LinkedIn</span>
                                            </a>
                                        )}
                                        {sitter.redes_sociales.facebook && (
                                            <a href={sitter.redes_sociales.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 flex items-center gap-2 text-sm font-medium overflow-hidden">
                                                <Facebook size={16} className="shrink-0" /> <span className="truncate">Facebook</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Documents */}
                            {sitter.certificado_antecedentes && (
                                <button
                                    onClick={() => onViewDocument(sitter.certificado_antecedentes!)}
                                    className="flex items-center justify-center gap-2 w-full py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                                >
                                    <FileText size={16} /> Ver Certificado
                                </button>
                            )}
                            {sitter.video_presentacion && (
                                <a
                                    href={sitter.video_presentacion}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    className="flex items-center justify-center gap-2 w-full py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-bold hover:bg-purple-100 transition-colors"
                                >
                                    <Video size={16} /> Descargar Video Presentación
                                </a>
                            )}
                        </div>

                        {/* Right Col: Details */}
                        <div className="md:col-span-8 space-y-6">

                            {/* Bio */}
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm uppercase border-b border-slate-300 pb-2 mb-3">Descripción / Bio</h4>
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                    {sitter.bio || "Sin descripción."}
                                </p>
                            </div>

                            {/* Sitio web */}
                            {sitter.sitio_web && (
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm uppercase border-b border-slate-300 pb-2 mb-3">Sitio Web</h4>
                                    <a href={sitter.sitio_web.startsWith('http') ? sitter.sitio_web : `https://${sitter.sitio_web}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="text-emerald-700 hover:underline text-sm"
                                    >
                                        {sitter.sitio_web}
                                    </a>
                                </div>
                            )}

                            {/* Gallery */}
                            {sitter.galeria && sitter.galeria.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm uppercase border-b border-slate-300 pb-2 mb-3">
                                        Galería ({sitter.galeria.length})
                                    </h4>
                                    <div className="grid grid-cols-4 gap-2">
                                        {sitter.galeria.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border-2 border-slate-300">
                                                <Image src={getProxyImageUrl(img) || ''} alt="Galeria" fill className="object-cover" unoptimized />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-300 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border-2 border-slate-300 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-50"
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={() => {
                            onApprove(sitter.id, sitter.aprobado);
                            onClose();
                        }}
                        className={`px-6 py-2 rounded-lg text-white font-bold text-sm shadow-sm transition-all ${sitter.aprobado
                            ? "bg-red-500 hover:bg-red-600 ring-4 ring-red-500/20"
                            : "bg-emerald-700 hover:bg-emerald-800 ring-4 ring-emerald-600/20"
                            }`}
                    >
                        {sitter.aprobado ? "Revocar Aprobación" : "Aprobar Proveedor"}
                    </button>
                </div>
            </div>
        </div>
    );
}
