import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { X, Calendar, MapPin, Dog, Cat, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getProxyImageUrl } from "../../lib/utils";

type TripDetailsModalProps = {
    isOpen: boolean;
    onClose: () => void;
    trip: any;
    pets: any[]; // Array of pet objects included in the trip
    serviceAddress?: string;
};

export default function TripDetailsModal({ isOpen, onClose, trip, pets, serviceAddress }: TripDetailsModalProps) {
    if (!trip) return null;

    const startDate = new Date(trip.fecha_inicio + 'T00:00:00');
    const endDate = trip.fecha_fin ? new Date(trip.fecha_fin + 'T00:00:00') : null;
    const days = endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 1;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <Dialog.Panel className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
                            {/* Header */}
                            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Detalles de la Solicitud</h3>
                                    <p className="text-xs text-slate-500 font-mono">ID: #{trip.id.slice(0, 8).toUpperCase()}</p>
                                </div>
                                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

                                {/* 1. Resumen Servicio */}
                                <div className="flex gap-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                                    <div className="p-3 bg-white rounded-xl shadow-sm border border-emerald-100 h-fit">
                                        <Calendar size={24} className="text-emerald-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 capitalize text-lg">{trip.servicio}</h4>
                                        <p className="text-slate-600 text-sm mt-1">
                                            Del <span className="font-semibold">{format(startDate, "d 'de' MMMM", { locale: es })}</span> al <span className="font-semibold">{endDate ? format(endDate, "d 'de' MMMM", { locale: es }) : '?'}</span>
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                            <span className="text-xs font-medium px-2 py-0.5 bg-white border border-emerald-100 text-emerald-700 rounded-lg">
                                                {days} {days === 1 ? 'noche' : 'noches'}
                                            </span>
                                            <span className="text-xs font-medium px-2 py-0.5 bg-white border border-emerald-100 text-emerald-700 rounded-lg capitalize">
                                                {format(startDate, 'yyyy')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Mascotas y Cuidados */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Dog size={14} /> Mascotas & Cuidados
                                    </h4>
                                    <div className="space-y-3">
                                        {pets && pets.length > 0 ? (
                                            pets.map((pet, idx) => (
                                                <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4 shadow-sm items-start">
                                                    <div className="shrink-0">
                                                        {pet.foto_mascota ? (
                                                            <img src={getProxyImageUrl(pet.foto_mascota) || ''} className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-sm" alt={pet.nombre} />
                                                        ) : (
                                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border text-xl font-bold ${pet.tipo === 'perro' ? 'bg-orange-50 text-orange-500 border-orange-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>
                                                                {pet.nombre ? pet.nombre.charAt(0).toUpperCase() : (pet.tipo === 'perro' ? <Dog size={24} /> : <Cat size={24} />)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h5 className="font-bold text-slate-900 text-lg leading-tight">{pet.nombre}</h5>
                                                                <p className="text-xs text-slate-500 font-medium mt-0.5 capitalize">
                                                                    {pet.tipo} • {pet.raza || 'Raza no esp.'}
                                                                </p>
                                                            </div>
                                                            {pet.edad && (
                                                                <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200 shadow-sm">
                                                                    {pet.edad} años
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Special Care Note */}
                                                        {pet.trato_especial && pet.trato_especial_desc ? (
                                                            <div className="mt-3 bg-amber-50 p-3 rounded-xl border border-amber-100/60 flex gap-2.5 items-start">
                                                                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                                                <div className="text-xs text-amber-900">
                                                                    <span className="font-bold block text-amber-950 mb-0.5">Cuidados Especiales:</span>
                                                                    <p className="leading-relaxed opacity-90">{pet.trato_especial_desc}</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="mt-3 text-xs text-slate-400 flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 border-dashed">
                                                                <CheckCircle2 size={14} className="text-slate-300" />
                                                                <span>Sin cuidados especiales registrados</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-500 italic text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                No se encontraron detalles de las mascotas.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* 3. Ubicación */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <MapPin size={14} /> Ubicación
                                    </h4>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm text-slate-700">
                                        {trip.servicio === 'hospedaje'
                                            ? 'En domicilio del Cuidador (dirección se revelará al confirmar)'
                                            : (serviceAddress ? (() => {
                                                // Clean Address Logic
                                                return serviceAddress
                                                    .replace(/, Región Metropolitana.*$/, '')
                                                    .replace(/, Provincia de.*$/, '')
                                                    .replace(/, \d{7}.*$/, '')
                                                    .replace(/, Chile$/, '');
                                            })() : 'Tu dirección registrada')
                                        }
                                    </div>
                                </div>

                            </div>

                            {/* 4. Sitter Info (If available) */}
                            {trip.sitter && (
                                <div>
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <CheckCircle2 size={14} /> Sitter Asignado / Solicitado
                                    </h4>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                                            {trip.sitter.foto_perfil ? (
                                                <img src={getProxyImageUrl(trip.sitter.foto_perfil) || ''} alt={trip.sitter.nombre} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="font-bold text-slate-400 text-lg">{trip.sitter.nombre.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900">{trip.sitter.nombre} {trip.sitter.apellido_p}</p>
                                            {trip.estado === 'pendiente' || trip.estado === 'publicado' ? (
                                                <p className="text-xs text-slate-500 font-medium bg-slate-200/50 px-2 py-0.5 rounded-lg inline-block mt-0.5">
                                                    Esperando respuesta...
                                                </p>
                                            ) : (
                                                <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                                                    <CheckCircle2 size={12} /> Confirmado
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}


                            {/* Footer */}
                            <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
                                <p className="text-xs text-slate-400">Esta es la información que verán los cuidadores al postular.</p>
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition >
    );
}
