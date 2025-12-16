import React from "react";
import Image from "next/image";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type SitterData = {
    id: string;
    // Personal
    nombre: string;
    apellido_p?: string; // Sometimes separate or in 'nombre' depending on legacy
    email?: string; // Often joined from auth
    rut: string;
    fecha_nacimiento: string;
    edad: number;
    sexo: string;
    telefono: string;
    foto_perfil: string;

    // Profile
    descripcion: string;
    ocupacion: string;
    universidad?: string;
    carrera?: string;
    ano_curso?: string;
    tiene_mascotas: boolean;
    detalles_mascotas?: { tipo: string; cantidad: number }[];

    // Services
    cuida_perros: boolean;
    cuida_gatos: boolean;
    servicio_en_casa: boolean;
    servicio_a_domicilio: boolean;
    tarifa_servicio_en_casa?: number;
    tarifa_servicio_a_domicilio?: number;

    // Location
    region: string;
    comuna: string;
    direccion_completa?: string;
    calle?: string;
    numero?: string;

    // Docs
    certificado_antecedentes?: string;
    aprobado: boolean;

    // Gallery
    galeria?: string[];

    // Social
    redes_sociales?: { linkedin?: string; tiktok?: string; instagram?: string; facebook?: string };

    // Extra for Clients/Admin
    pets?: any[]; // Full pet objects
    missingFields?: string[]; // List of missing field names

    created_at: string;
};

type Props = {
    sitter: SitterData | null;
    open: boolean;
    onClose: () => void;
    onApprove: (id: string, currentStatus: boolean) => void;
};

export default function SitterDetailModal({ sitter, open, onClose, onApprove }: Props) {
    if (!open || !sitter) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative flex flex-col z-50">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">Detalle del Cuidador</h3>
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
                            <span className="text-2xl">⚠️</span>
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
                                <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-slate-100 shadow-sm mb-3">
                                    {sitter.foto_perfil ? (
                                        <Image
                                            src={sitter.foto_perfil}
                                            alt="Perfil"
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-slate-200 flex items-center justify-center text-3xl">👤</div>
                                    )}
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">{sitter.nombre} {sitter.apellido_p || ""}</h2>
                                <p className="text-sm text-slate-500">{sitter.email || "Sin email"}</p>
                                <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                    {sitter.aprobado && (!sitter.missingFields || sitter.missingFields.length === 0)
                                        ? "Verificado ✅"
                                        : sitter.aprobado
                                            ? <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Aprobado (Falta Info) ⚠️</span>
                                            : <span className="flex items-center gap-1">Pendiente <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full"></div></span>
                                    }
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 text-sm">
                                <div>
                                    <span className="block text-xs font-bold text-slate-400 uppercase">RUT</span>
                                    <span className="text-slate-700 font-medium">{sitter.rut || "No informado"}</span>
                                </div>
                                <div>
                                    <span className="block text-xs font-bold text-slate-400 uppercase">Teléfono</span>
                                    <span className="text-slate-700 font-medium">{sitter.telefono || "No informado"}</span>
                                </div>
                                <div>
                                    <span className="block text-xs font-bold text-slate-400 uppercase">Edad / Sexo</span>
                                    <span className="text-slate-700 font-medium">
                                        {sitter.edad ? `${sitter.edad} años` : "N/A"} • {sitter.sexo || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs font-bold text-slate-400 uppercase">Ubicación</span>
                                    <span className="text-slate-700 font-medium">{sitter.comuna}, {sitter.region}</span>
                                    {sitter.direccion_completa && (
                                        <p className="text-xs text-slate-500 mt-1">{sitter.direccion_completa}</p>
                                    )}
                                </div>
                            </div>

                            {/* Social Media */}
                            {sitter.redes_sociales && Object.values(sitter.redes_sociales).some(v => v) && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <span className="block text-xs font-bold text-slate-400 uppercase mb-2">Redes Sociales</span>
                                    <div className="flex flex-col gap-2">
                                        {sitter.redes_sociales.instagram && (
                                            <a href={`https://instagram.com/${sitter.redes_sociales.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-700 flex items-center gap-2 text-sm font-medium">
                                                <span>📸</span> {sitter.redes_sociales.instagram}
                                            </a>
                                        )}
                                        {sitter.redes_sociales.tiktok && (
                                            <a href={`https://tiktok.com/@${sitter.redes_sociales.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-black hover:text-gray-700 flex items-center gap-2 text-sm font-medium">
                                                <span>🎵</span> {sitter.redes_sociales.tiktok}
                                            </a>
                                        )}
                                        {sitter.redes_sociales.linkedin && (
                                            <a href={sitter.redes_sociales.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-800 flex items-center gap-2 text-sm font-medium text-ellipsis overflow-hidden whitespace-nowrap block max-w-full">
                                                <span className="shrink-0">💼</span> <span className="truncate">LinkedIn</span>
                                            </a>
                                        )}
                                        {sitter.redes_sociales.facebook && (
                                            <a href={sitter.redes_sociales.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 flex items-center gap-2 text-sm font-medium text-ellipsis overflow-hidden whitespace-nowrap block max-w-full">
                                                <span className="shrink-0">📘</span> <span className="truncate">Facebook</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Downloads */}
                            {sitter.certificado_antecedentes && (
                                <a
                                    href={`https://vujyabfrlqjnjrccylmp.supabase.co/storage/v1/object/public/documents/${sitter.certificado_antecedentes}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                                >
                                    📄 Ver Certificado
                                </a>
                            )}
                        </div>

                        {/* Right Col: Details */}
                        <div className="md:col-span-8 space-y-6">

                            {/* Bio */}
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm uppercase border-b border-slate-100 pb-2 mb-3">Sobre mí</h4>
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                    {sitter.descripcion || "Sin descripción."}
                                </p>
                            </div>

                            {/* Occupation / Student */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm uppercase border-b border-slate-100 pb-2 mb-3">Ocupación</h4>
                                    <p className="text-sm text-slate-600">{sitter.ocupacion}</p>
                                    {sitter.ocupacion === "Estudiante" && (
                                        <div className="mt-1 text-xs text-slate-500">
                                            {sitter.carrera} en {sitter.universidad} ({sitter.ano_curso})
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm uppercase border-b border-slate-100 pb-2 mb-3">Mascotas</h4>
                                    <p className="text-sm text-slate-600">
                                        {sitter.tiene_mascotas ? "Tiene mascotas propias" : "No tiene mascotas"}
                                    </p>
                                    {sitter.detalles_mascotas && sitter.detalles_mascotas.length > 0 && (
                                        <ul className="mt-1 text-xs text-slate-500 list-disc list-inside">
                                            {sitter.detalles_mascotas.map((m, i) => (
                                                <li key={i}>{m.cantidad} {m.tipo}(s)</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            {/* Services */}
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm uppercase border-b border-slate-100 pb-2 mb-3">Servicios & Tarifas</h4>
                                <div className="flex flex-wrap gap-2">
                                    {sitter.cuida_perros && <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">🐶 Perros</span>}
                                    {sitter.cuida_gatos && <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">🐱 Gatos</span>}
                                </div>
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {sitter.servicio_en_casa && (
                                        <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                            <span className="block text-xs font-bold text-emerald-800 uppercase">En mi Casa</span>
                                            <span className="text-sm text-emerald-900 font-bold">${sitter.tarifa_servicio_en_casa?.toLocaleString('es-CL') || 0} / día</span>
                                        </div>
                                    )}
                                    {sitter.servicio_a_domicilio && (
                                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                            <span className="block text-xs font-bold text-blue-800 uppercase">A Domicilio</span>
                                            <span className="text-sm text-blue-900 font-bold">${sitter.tarifa_servicio_a_domicilio?.toLocaleString('es-CL') || 0} / visita</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Gallery */}
                            {sitter.galeria && sitter.galeria.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm uppercase border-b border-slate-100 pb-2 mb-3">Galería ({sitter.galeria.length})</h4>
                                    <div className="grid grid-cols-4 gap-2">
                                        {sitter.galeria.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                                                <Image src={img} alt="Galeria" fill className="object-cover" unoptimized />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-50"
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
                            : "bg-emerald-600 hover:bg-emerald-700 ring-4 ring-emerald-600/20"
                            }`}
                    >
                        {sitter.aprobado ? "Revocar Aprobación" : "Aprobar Cuidador"}
                    </button>
                </div>
            </div>
        </div>
    );
}
