import React, { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Edit2, Trash2, Calendar, Home, Hotel, CheckCircle2, Users, User, Phone, MapPin, Mail, ChevronDown, ChevronUp, Clock, Dog, Cat, Search } from "lucide-react";
import ContactSitterButton from "../Shared/ContactSitterButton";

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
        auth_user_id: string; // Needed for chat
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
    petNames?: string; // Keep for fallback or legacy
    pets?: { name: string; type: string }[]; // New structured prop
    onEdit: (trip: Trip) => void;
    onDelete: (id: string) => void;
    onViewApplications?: (trip: Trip) => void;
    onConfirm?: (trip: Trip) => void;
    onRemoveSitter?: (tripId: string) => void;
    onSearchSitter?: (trip: Trip) => void;
    serviceAddress?: string;
};

export default function TripCard({ trip, petNames, pets, onEdit, onDelete, onViewApplications, onConfirm, onRemoveSitter, onSearchSitter, serviceAddress }: Props) {
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
        <div className={`bg-white rounded-2xl p-5 border transition-all hover:shadow-lg relative overflow-hidden ${['reservado'].includes(trip.estado)
            ? 'border-amber-200 bg-amber-50/10 shadow-md ring-1 ring-amber-100'
            : ['confirmado', 'aceptado', 'pagado', 'en_curso'].includes(trip.estado)
                ? 'border-emerald-100 shadow-sm'
                : 'border-slate-200'
            }`}>

            {/* ID Badge */}
            <div className="absolute top-0 left-0 bg-slate-100 text-slate-500 text-[10px] font-mono px-2 py-0.5 rounded-br-lg border-b border-r border-slate-200">
                #{trip.id.slice(0, 8).toUpperCase()}
            </div>

            {/* Application Badge */}
            {!trip.sitter_asignado && hasApplications && (
                <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10 animate-pulse">
                    {trip.postulaciones_count} {trip.postulaciones_count === 1 ? 'Postulación' : 'Postulaciones'}
                </div>
            )}

            <div className="flex items-start justify-between gap-4 pt-3">
                <div className="flex items-start gap-4 w-full">
                    {/* Icono del Servicio */}
                    <div className={`p-3 rounded-full shrink-0 ${trip.servicio === 'hospedaje' ? 'bg-emerald-50 text-emerald-600' :
                        trip.servicio === 'domicilio' ? 'bg-emerald-50 text-emerald-600' :
                            trip.servicio === 'paseo' ? 'bg-orange-50 text-orange-600' :
                                'bg-slate-100 text-slate-600'
                        }`}>
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
                                {endDate && ` – ${format(endDate, "d 'de' MMMM", { locale: es })}`}
                            </h3>

                            {/* Status Pill */}
                            {trip.estado === 'reservado' && (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                                    Por Confirmar
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                            <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 capitalize font-medium">
                                {trip.servicio}
                            </span>
                            <span className="flex items-center gap-1">
                                {days} {days === 1 ? 'noche' : 'noches'}
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="flex items-center flex-wrap gap-3">
                                {pets && pets.length > 0 ? (
                                    pets.map((pet, idx) => (
                                        <span key={idx} className="flex items-center gap-1 text-slate-600 font-medium">
                                            {pet.type === 'perro' ? <Dog size={12} className="text-slate-400" /> : <Cat size={12} className="text-slate-400" />}
                                            {pet.name}
                                        </span>
                                    ))
                                ) : (
                                    <span className="truncate max-w-[200px]" title={petNames}>
                                        {petNames || 'Sin mascotas'}
                                    </span>
                                )}
                            </span>
                        </div>

                        <div className="flex flex-col gap-2 mt-1 w-full max-w-md">
                            {/* Logic for buttons:
                                1. If assigned -> Show Sitter
                                2. If has applications -> Show "Ver Postulantes"
                                3. Else -> Show "Buscando..." status
                            */}

                            {/* ACTION BUTTON FOR 'RESERVADO' */}
                            {trip.estado === 'reservado' && onConfirm && (
                                <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                    <p className="text-xs text-amber-800 font-bold mb-2">
                                        ¡El Sitter ha aceptado! Confirma para finalizar.
                                    </p>
                                    <button
                                        onClick={() => onConfirm(trip)}
                                        className="w-full bg-slate-900 text-white font-bold py-2 rounded-lg text-xs hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 size={14} /> Confirmar Reserva
                                    </button>
                                </div>
                            )}

                            {/* Contact Info Block - Only visible if trip is confirmed */}
                            {trip.sitter_asignado && trip.sitter ? (
                                <div className="w-full">
                                    {/* CONFIRMED STATE: Show Contact Info */}
                                    {['confirmado', 'aceptado', 'pagado', 'en_curso', 'completado'].includes(trip.estado) ? (
                                        <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 relative pr-14">
                                            {/* Sitter Photo Top-Right */}
                                            {trip.sitter?.id ? (
                                                <Link href={`/sitter/${trip.sitter.id}?returnTo=/usuario`} className="absolute top-3 right-3 w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 hover:border-emerald-400 overflow-hidden transition-colors" title="Ver perfil del Sitter">
                                                    {trip.sitter.foto_perfil ? (
                                                        <img
                                                            src={trip.sitter.foto_perfil}
                                                            alt={trip.sitter.nombre}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-emerald-700 font-bold text-sm">
                                                            {trip.sitter.nombre?.charAt(0)}
                                                        </div>
                                                    )}
                                                </Link>
                                            ) : (
                                                <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-400 font-bold text-sm" title="Sitter asignado">
                                                    {trip.sitter?.nombre?.charAt(0) || <User size={16} />}
                                                </div>
                                            )}

                                            <div className="mb-3">
                                                <p className="font-bold text-slate-900 mb-1.5">Datos de Contacto:</p>
                                                <div className="space-y-1.5">
                                                    <p className="flex items-center gap-2">
                                                        <User size={14} className="text-slate-400" />
                                                        {trip.sitter?.id ? (
                                                            <Link href={`/sitter/${trip.sitter.id}?returnTo=/usuario`} className="font-bold text-slate-900 hover:text-emerald-700 hover:underline">
                                                                {trip.sitter.nombre} {trip.sitter.apellido_p}
                                                            </Link>
                                                        ) : (
                                                            <span className="font-bold text-slate-900">
                                                                {trip.sitter?.nombre} {trip.sitter?.apellido_p}
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="flex items-center gap-2">
                                                        <Phone size={14} className="text-slate-400" />
                                                        <a href={`tel:${trip.sitter?.telefono}`} className="hover:text-emerald-600 hover:underline">{trip.sitter?.telefono || 'No registrado'}</a>
                                                    </p>
                                                    <p className="flex items-center gap-2">
                                                        <Mail size={14} className="text-slate-400" />
                                                        <a href={`mailto:${trip.sitter?.email}`} className="hover:text-emerald-600 hover:underline">{trip.sitter?.email || 'No registrado'}</a>
                                                    </p>
                                                    {trip.sitter?.auth_user_id && (
                                                        <div className="pt-2">
                                                            <ContactSitterButton
                                                                sitterId={trip.sitter.auth_user_id}
                                                                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 transition-colors"
                                                                label="Chat"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {trip.servicio === 'hospedaje' && (
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
                                            )}

                                            {trip.servicio === 'domicilio' && (
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
                                            )}
                                        </div>
                                    ) : (
                                        // RESERVADO STATE (Specific Message if we didn't use the action above, or just a placeholder)
                                        trip.estado === 'reservado' ? (
                                            <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-slate-700 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-amber-100 overflow-hidden shrink-0 border border-amber-200">
                                                    {trip.sitter?.foto_perfil ? (
                                                        <img
                                                            src={trip.sitter.foto_perfil}
                                                            alt={trip.sitter.nombre}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-amber-700 font-bold text-sm">
                                                            {trip.sitter?.nombre?.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-900">
                                                        {trip.sitter.nombre} aceptó tu solicitud
                                                    </p>
                                                    <p className="text-amber-700 flex items-center gap-1.5 mt-0.5 font-medium">
                                                        Pendiente de tu confirmación
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            /* PENDING STATE: Show "Waiting for Sitter" */
                                            <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-slate-700 flex items-center gap-3">
                                                {/* Sitter Avatar */}
                                                <div className="w-10 h-10 rounded-full bg-amber-100 overflow-hidden shrink-0 border border-amber-200">
                                                    {trip.sitter?.foto_perfil ? (
                                                        <img
                                                            src={trip.sitter.foto_perfil}
                                                            alt={trip.sitter.nombre}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-amber-700 font-bold text-sm">
                                                            {trip.sitter?.nombre?.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-900">
                                                        Solicitud enviada a {trip.sitter.nombre}
                                                    </p>
                                                    <p className="text-amber-700 flex items-center gap-1.5 mt-0.5 font-medium">
                                                        <Clock size={12} /> Esperando respuesta...
                                                    </p>
                                                    {onRemoveSitter && (
                                                        <div className="mt-2 pt-2 border-t border-amber-200">
                                                            <button
                                                                onClick={() => onRemoveSitter(trip.id)}
                                                                className="w-full text-center text-[10px] text-rose-600 font-bold hover:underline"
                                                            >
                                                                Cancelar solicitud
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            ) : hasApplications ? (
                                <button
                                    onClick={() => onViewApplications && onViewApplications(trip)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-sm animate-pulse"
                                >
                                    <Users size={14} /> Ver {trip.postulaciones_count} Postulantes
                                </button>
                            ) : trip.estado === 'publicado' || trip.estado === 'borrador' ? ( // Treat borrador as published for now in UI flow or handle specifically
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                                        Publicado (Esperando respuestas...)
                                    </span>
                                    {onSearchSitter && (
                                        <button
                                            onClick={() => onSearchSitter(trip)}
                                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                                        >
                                            <Search size={12} /> Buscar
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 text-xs font-bold border border-slate-200">
                                    {trip.estado}
                                </span>
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


                </div>
            </div>
        </div >
    );
}
