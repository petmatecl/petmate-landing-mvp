```javascript
import React, { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Edit2, Trash2, Calendar, Home, Hotel, CheckCircle2, Users, UserX, Search, User, Phone, MapPin, Mail, ChevronDown, ChevronUp } from "lucide-react";

export type Trip = {
    id: string;
    fecha_inicio: string;
    fecha_fin: string;
    servicio: 'paseo' | 'hospedaje' | 'guarderia' | 'domicilio';
    perros: number;
    gatos: number;
    mascotas_ids?: string[];
    direccion_id?: string;
    sitter_id?: string;
    estado: 'borrador' | 'publicado' | 'reservado' | 'confirmado' | 'en_curso' | 'completado' | 'cancelado' | 'pagado' | 'aceptado';
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
    total?: number;
};

type Props = {
    trip: Trip;
    petNames: string;
    onEdit: (trip: Trip) => void;
    onDelete: (id: string) => void;
    onViewApplications?: (trip: Trip) => void;
    onRemoveSitter?: (tripId: string) => void;
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
    const days = endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 1;

    // State for inline map visibility
    const [activeMap, setActiveMap] = useState<'sitter' | 'client' | null>(null);

    const toggleMap = (type: 'sitter' | 'client') => {
        if (activeMap === type) {
            setActiveMap(null);
        } else {
            setActiveMap(type);
        }
    };

    return (
        <div className={`bg - white rounded - 2xl p - 5 border transition - all hover: shadow - lg ${
    ['reservado', 'confirmado', 'aceptado', 'pagado', 'en_curso'].includes(trip.estado)
    ? 'border-emerald-100 shadow-sm'
    : 'border-slate-200'
} `}>
            {/* Application Badge */}
            {!trip.sitter_asignado && hasApplications && (
                <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10 animate-pulse">
                    {trip.postulaciones_count} {trip.postulaciones_count === 1 ? 'Postulación' : 'Postulaciones'}
                </div>
            )}

            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 w-full">
                    {/* Icono del Servicio */}
                    <div className={`p - 3 rounded - full shrink - 0 ${
    trip.servicio === 'hospedaje' ? 'bg-indigo-50 text-indigo-600' :
    trip.servicio === 'domicilio' ? 'bg-emerald-50 text-emerald-600' :
        trip.servicio === 'paseo' ? 'bg-orange-50 text-orange-600' :
            'bg-slate-100 text-slate-600'
} `}>
                        {trip.servicio === 'hospedaje' && <Hotel size={20} />}
                        {trip.servicio === 'domicilio' && <Home size={20} />}
                        {trip.servicio === 'paseo' && <CheckCircle2 size={20} />}
                        {trip.servicio === 'guarderia' && <Calendar size={20} />}
                    </div>

                    <div className="flex flex-col gap-1 w-full relative">
                        {/* Status Dots/Badges can go here if needed, or stick to simple layout */}
                        
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 text-base">
                                {format(startDate, "d 'de' MMMM", { locale: es })}
                                {endDate && ` – ${ format(endDate, "d 'de' MMMM", { locale: es }) } `}
                            </h3>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                            <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 capitalize font-medium">
                                {trip.servicio}
                            </span>
                            <span className="flex items-center gap-1">
                                {days} {days === 1 ? 'noche' : 'noches'}
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="truncate max-w-[200px]" title={petNames}>
                                {petNames || 'Sin mascotas'}
                            </span>
                        </div>

                        <div className="flex flex-col gap-2 mt-1 w-full max-w-md">
                            {/* Logic for buttons:
                                1. If assigned -> Show Sitter
                                2. If has applications -> Show "Ver Postulantes"
                                3. Else -> Show "Buscando..." status
                            */}

                            {/* Contact Info Block - Only visible if trip is confirmed */}
                            {trip.sitter_asignado && trip.sitter ? (
                                <div className="w-full">
                                    {/* Contact Info Block - Only visible if trip is confirmed */}
                                    {['reservado', 'confirmado', 'aceptado', 'pagado', 'en_curso', 'completado'].includes(trip.estado) && (
                                        <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 relative pr-14">
                                            {/* Sitter Photo Top-Right */}
                                            <Link href={`/ sitter / ${ trip.sitter?.id }?returnTo =/cliente`} className = "absolute top-3 right-3 w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 hover:border-emerald-400 overflow-hidden transition-colors" title = "Ver perfil del Sitter" >
{
    trip.sitter?.foto_perfil ? (
        <img
            src={trip.sitter.foto_perfil}
            alt={trip.sitter.nombre}
            className="w-full h-full object-cover"
        />
    ) : (
        <div className="w-full h-full flex items-center justify-center text-emerald-700 font-bold text-sm">
            {trip.sitter?.nombre?.charAt(0)}
        </div>
    )
}
                                            </Link >

    <div className="mb-3">
        <p className="font-bold text-slate-900 mb-1.5">Datos de Contacto:</p>
        <div className="space-y-1.5">
            <p className="flex items-center gap-2">
                <User size={14} className="text-slate-400" />
                <Link href={`/sitter/${trip.sitter?.id}?returnTo=/cliente`} className="font-bold text-slate-900 hover:text-emerald-700 hover:underline">
                    {trip.sitter?.nombre} {trip.sitter?.apellido_p}
                </Link>
            </p>
            <p className="flex items-center gap-2">
                <Phone size={14} className="text-slate-400" />
                <a href={`tel:${trip.sitter?.telefono}`} className="hover:text-emerald-600 hover:underline">{trip.sitter?.telefono || 'No registrado'}</a>
            </p>
            <p className="flex items-center gap-2">
                <Mail size={14} className="text-slate-400" />
                <a href={`mailto:${trip.sitter?.email}`} className="hover:text-emerald-600 hover:underline">{trip.sitter?.email || 'No registrado'}</a>
            </p>
        </div>
    </div>

{
    trip.servicio === 'hospedaje' && (
        <div className="pt-2 border-t border-slate-200 mt-2">
            <p className="font-bold text-slate-900 mb-1">Dirección del Sitter:</p>
            <div className="flex flex-col gap-1">
                <p className="flex items-start gap-2">
                    <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>
                        {trip.sitter?.direccion_completa ||
                            (trip.sitter?.calle ? `${trip.sitter.calle} ${trip.sitter.numero || ''}, ${trip.sitter.comuna || ''}` : 'Dirección no disponible')}
                    </span>
                </p>
                {(trip.sitter?.direccion_completa || trip.sitter?.comuna) && (
                    <div className="w-full">
                        <button
                            onClick={() => toggleMap('sitter')}
                            className="text-[10px] text-emerald-600 font-bold hover:underline pl-6 flex items-center gap-1"
                        >
                            {activeMap === 'sitter' ? 'Ocultar mapa' : 'Ver mapa'}
                            {activeMap === 'sitter' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>

                        {activeMap === 'sitter' && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-slate-200">
                                <iframe
                                    width="100%"
                                    height="200"
                                    frameBorder="0"
                                    style={{ border: 0 }}
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(trip.sitter.direccion_completa || `${trip.sitter.calle} ${trip.sitter.numero} ${trip.sitter.comuna}`)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                    allowFullScreen
                                ></iframe>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

{
    trip.servicio === 'domicilio' && (
        <div className="pt-2 border-t border-slate-200 mt-2">
            <p className="font-bold text-slate-900 mb-1">Ubicación del Cuidado (Tu Casa):</p>
            <div className="flex flex-col gap-1">
                <p className="flex items-start gap-2">
                    <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>{serviceAddress || 'Dirección no disponible'}</span>
                </p>
                {serviceAddress && (
                    <div className="w-full">
                        <button
                            onClick={() => toggleMap('client')}
                            className="text-[10px] text-emerald-600 font-bold hover:underline pl-6 flex items-center gap-1"
                        >
                            {activeMap === 'client' ? 'Ocultar mapa' : 'Ver mapa'}
                            {activeMap === 'client' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>

                        {activeMap === 'client' && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-slate-200">
                                <iframe
                                    width="100%"
                                    height="200"
                                    frameBorder="0"
                                    style={{ border: 0 }}
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(serviceAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                    allowFullScreen
                                ></iframe>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
                                        </div >
                                    )}
                                </div >
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

{/* Search Sitter Button - Only if not assigned */ }
{
    !trip.sitter_asignado && onSearchSitter && (
        <button
            onClick={() => onSearchSitter(trip)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold hover:bg-emerald-200 transition-colors border border-emerald-200"
        >
            <Search size={14} /> Buscar Sitter
        </button>
    )
}
                        </div >
                    </div >
                </div >

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
            </div >
        </div >
    );
}
