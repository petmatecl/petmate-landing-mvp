import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Edit2, Trash2, Calendar, Home, Hotel, CheckCircle2 } from "lucide-react";

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
    };
};

type Props = {
    trip: Trip;
    petNames?: string;
    onEdit: (trip: Trip) => void;
    onDelete: (id: string) => void;
};

export default function TripCard({ trip, petNames, onEdit, onDelete }: Props) {
    const startDate = new Date(trip.fecha_inicio);
    const endDate = trip.fecha_fin ? new Date(trip.fecha_fin) : null;

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
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
                            {/* Botón Buscar Sitter - Solo si no hay asignado y no está cancelado/completado */}
                            {!trip.sitter_asignado && trip.estado !== 'cancelado' && trip.estado !== 'completado' && (
                                <Link
                                    href={`/explorar?service=${trip.servicio === 'domicilio' ? 'a_domicilio' : 'en_casa_petmate'}&type=${(trip.perros > 0 && trip.gatos > 0) ? 'both' : (trip.perros > 0 ? 'dogs' : (trip.gatos > 0 ? 'cats' : 'any'))}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                                >
                                    🔍 Buscar Sitter
                                </Link>
                            )}

                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                    {trip.sitter && trip.sitter_asignado ? (
                                        <Link href={`/sitter/${trip.sitter.id}`} className="flex items-center gap-3 bg-emerald-50 rounded-full pl-1 pr-4 py-1 border border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200 transition-colors group">
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
                                    ) : trip.sitter_asignado ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                                            <CheckCircle2 size={12} /> Sitter Asignado
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                                            Buscando Sitter (Publicado)
                                        </span>
                                    )}
                                </div>
                            </div>
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

                    {/* Solo permitir borrar si no hay sitter asignado o está cancelado */}
                    {!trip.sitter_asignado && (
                        <button
                            onClick={() => onDelete(trip.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar viaje"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
