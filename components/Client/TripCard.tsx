import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Edit2, Trash2, Calendar, Home, Hotel, CheckCircle2, Users, UserX, Search, User, Phone, MapPin, Mail } from "lucide-react";

export type Trip = {
    id: string;
    fecha_inicio: string;
    fecha_fin: string;
    servicio: 'domicilio' | 'hospedaje';
    perros: number;
    gatos: number;
    mascotas_ids: string[];
    direccion_id?: string;
    sitter_id?: string;
    estado: string;
    sitter_asignado?: boolean; // Derivado o cargado
    sitter?: { // Perfil del sitter
        id: string;
        nombre: string;
        apellido_p?: string;
        foto_perfil?: string;
        telefono?: string;
        email?: string;
        direccion_completa?: string;
        calle?: string;
        numero?: string;
        comuna?: string;
    };
    // New prop for marketplace logic
    postulaciones_count?: number;
};

type Props = {
    trip: Trip;
    petNames?: string;
    onEdit: (trip: Trip) => void;
    onDelete: (id: string) => void;
    onViewApplications?: (trip: Trip) => void;
    onRemoveSitter?: (id: string) => void;
    onSearchSitter?: (trip: Trip) => void;
    clientName?: string;
    serviceAddress?: string;
};

export default function TripCard({ trip, petNames, onEdit, onDelete, onViewApplications, onRemoveSitter, onSearchSitter, clientName, serviceAddress }: Props) {
    // Safe date parsing to avoid UTC/Timezone shifts
    const parseDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const startDate = parseDate(trip.fecha_inicio);
    const endDate = trip.fecha_fin ? parseDate(trip.fecha_fin) : null;
    const hasApplications = (trip.postulaciones_count || 0) > 0;

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow relative overflow-hidden">
            {/* Application Badge */}
            {!trip.sitter_asignado && hasApplications && (
                <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10 animate-pulse">
                    {trip.postulaciones_count} {trip.postulaciones_count === 1 ? 'Postulación' : 'Postulaciones'}
                </div>
            )}

            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-grow">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${trip.sitter_asignado ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        {trip.servicio === 'hospedaje' ? <Hotel size={20} /> : <Home size={20} />}
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-slate-900 leading-tight">
                                    {format(startDate, "d 'de' MMMM", { locale: es })}
                                    {endDate && ` - ${format(endDate, "d 'de' MMMM", { locale: es })}`}
                                </h3>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                    {trip.servicio === 'domicilio' ? 'Domicilio' : 'Hospedaje'}
                                </span>
                                <span>
                                    {trip.perros > 0 ? `${trip.perros} 🐶` : ''} {trip.gatos > 0 ? `${trip.gatos} 🐱` : ''}
                                </span>
                                {petNames && (
                                    <span className="text-slate-400 border-l border-slate-200 pl-2">
                                        {petNames}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Logic for buttons:
                                1. If assigned -> Show Sitter
                                2. If has applications -> Show "Ver Postulantes"
                                3. Else -> Show "Buscando..." status
                            */}

                            {trip.sitter_asignado && trip.sitter ? (
                                <div className="flex flex-col gap-2 w-full">
                                    <Link href={`/sitter/${trip.sitter.id}?returnTo=/cliente`} className="flex items-center gap-3 bg-emerald-50 rounded-full pl-1 pr-4 py-1 border border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200 transition-colors group w-fit">
                                        {trip.sitter.foto_perfil ? (
                                            <img
                                                src={trip.sitter.foto_perfil}
                                                alt={trip.sitter.nombre}
                                                className="w-8 h-8 rounded-full object-cover border border-emerald-200 group-hover:border-emerald-300"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 text-xs font-bold">
                                                {trip.sitter.nombre.charAt(0)}
                                            </div>
                                        )}
                                        <div className="flex flex-col leading-none">
                                            <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider group-hover:text-emerald-700">Cuidado por</span>
                                            <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">{trip.sitter.nombre} {trip.sitter.apellido_p?.charAt(0)}.</span>
                                        </div>
                                    </Link>


                                    {/* Contact Info Block - Only visible if trip is confirmed */}
                                    {['reservado', 'confirmado', 'aceptado', 'pagado', 'en_curso', 'completado'].includes(trip.estado) && (
                                        <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-2">
                                            <div>
                                                <p className="font-bold text-slate-900 mb-1">Datos de Contacto:</p>
                                                <div className="space-y-1">
                                                    <p className="flex items-center gap-2">
                                                        <User size={14} className="text-slate-400" />
                                                        <span className="font-semibold text-slate-900">{trip.sitter.nombre} {trip.sitter.apellido_p}</span>
                                                    </p>
                                                    <p className="flex items-center gap-2">
                                                        <Phone size={14} className="text-slate-400" />
                                                        <a href={`tel:${trip.sitter.telefono}`} className="hover:text-emerald-600 hover:underline">{trip.sitter.telefono || 'No registrado'}</a>
                                                    </p>
                                                    <p className="flex items-center gap-2">
                                                        <Mail size={14} className="text-slate-400" />
                                                        <a href={`mailto:${trip.sitter.email}`} className="hover:text-emerald-600 hover:underline">{trip.sitter.email || 'No registrado'}</a>
                                                    </p>
                                                </div>
                                            </div>

                                            {trip.servicio === 'hospedaje' && (
                                                <div className="pt-2 border-t border-slate-200">
                                                    <p className="font-bold text-slate-900 mb-1">Dirección del Sitter:</p>
                                                    <p className="flex items-start gap-2">
                                                        <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                                        <span>
                                                            {trip.sitter.direccion_completa ||
                                                                (trip.sitter.calle ? `${trip.sitter.calle} ${trip.sitter.numero || ''}, ${trip.sitter.comuna || ''}` : 'Dirección no disponible')}
                                                        </span>
                                                    </p>
                                                </div>
                                            )}

                                            {trip.servicio === 'domicilio' && (
                                                <div className="pt-2 border-t border-slate-200">
                                                    <p className="font-bold text-slate-900 mb-1">Ubicación del Cuidado:</p>
                                                    <div className="space-y-1">
                                                        <p className="flex items-center gap-2">
                                                            <User size={14} className="text-slate-400" />
                                                            <span>{clientName || 'Cliente'}</span>
                                                        </p>
                                                        <p className="flex items-start gap-2">
                                                            <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                                            <span>{serviceAddress || 'Dirección no disponible'}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : hasApplications ? (
                                <button
                                    onClick={() => onViewApplications && onViewApplications(trip)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-sm animate-pulse"
                                >
                                    <Users size={14} /> Ver {trip.postulaciones_count} Postulantes
                                </button>
                            ) : trip.estado === 'publicado' || trip.estado === 'borrador' ? ( // Treat borrador as published for now in UI flow or handle specifically
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                                    Publicado (Esperando respuestas...)
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 text-xs font-bold border border-slate-200">
                                    {trip.estado}
                                </span>
                            )}

                            {/* Search Sitter Button - Only if not assigned */}
                            {!trip.sitter_asignado && onSearchSitter && (
                                <button
                                    onClick={() => onSearchSitter(trip)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold hover:bg-emerald-200 transition-colors border border-emerald-200"
                                >
                                    <Search size={14} /> Buscar Sitter
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                    <button
                        onClick={() => onEdit(trip)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Editar viaje"
                    >
                        <Edit2 size={16} />
                    </button>

                    <button
                        onClick={() => onDelete(trip.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar viaje"
                    >
                        <Trash2 size={16} />
                    </button>

                    {/* Botón para desvincular sitter */}
                    {trip.sitter_asignado && onRemoveSitter && (
                        <button
                            onClick={() => onRemoveSitter(trip.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Cancelar servicio / Desvincular Sitter"
                        >
                            <UserX size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
