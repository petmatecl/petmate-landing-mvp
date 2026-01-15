import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { X, Calendar, MapPin, Dog, Cat, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
                                                <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4 shadow-sm">
                                                    <div className="shrink-0">
                                                        {pet.foto_mascota ? (
                                                            <img src={pet.foto_mascota} className="w-12 h-12 rounded-full object-cover border border-slate-100" alt={pet.nombre} />
                                                        ) : (
                                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${pet.tipo === 'perro' ? 'bg-orange-50 text-orange-500 border-orange-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>
                                                                {pet.tipo === 'perro' ? <Dog size={20} /> : <Cat size={20} />}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <h5 className="font-bold text-slate-900">{pet.nombre}</h5>
                                                            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full border border-slate-200 capitalize">
                                                                {pet.raza || pet.tipo}
                                                            </span>
                                                        </div>

                                                        {/* Special Care Note */}
                                                        {pet.trato_especial && pet.trato_especial_desc ? (
                                                            <div className="mt-2 bg-amber-50 p-2.5 rounded-xl border border-amber-100/50 flex gap-2 items-start">
                                                                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                                                <p className="text-xs text-amber-800 leading-relaxed">
                                                                    <span className="font-bold block text-amber-900/80 mb-0.5">Cuidados Especiales:</span>
                                                                    {pet.trato_especial_desc}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                                                                <CheckCircle2 size={12} /> Sin cuidados especiales registrados
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-500 italic">No se encontraron detalles de las mascotas.</p>
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
                                            : (serviceAddress || 'Tu dirección registrada')
                                        }
                                    </div>
                                </div>

                            </div>

                            {/* Footer */}
                            <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
                                <p className="text-xs text-slate-400">Esta es la información que verán los cuidadores al postular.</p>
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
}
