import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Calendar, User, Mail, Phone, Dog, Cat, PawPrint, DollarSign, Clock } from 'lucide-react';

type BookingDatasheetProps = {
    booking: any;
    sitter: {
        nombre: string;
        apellido: string;
        email: string;
        telefono: string;
        direccion: string;
    } | null;
    pets: any[];
};

export default function BookingDatasheet({ booking, sitter, pets }: BookingDatasheetProps) {
    if (!booking) return null;

    const startDate = new Date(booking.fecha_inicio);
    const endDate = new Date(booking.fecha_fin);
    const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return (
        <div className="p-8 max-w-[21cm] mx-auto bg-white text-slate-900 leading-relaxed font-sans" id="datasheet-content">
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold uppercase tracking-tight text-slate-900">Ficha de Servicio</h1>
                    <p className="text-slate-500 mt-1 font-medium">Reserva #{booking.id.slice(0, 8)}</p>
                </div>
                <div className="text-right">
                    <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded font-bold text-sm uppercase tracking-wide">
                        {booking.estado === 'confirmado' || booking.estado === 'confirmada' ? 'Confirmado' : booking.estado}
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                        Impreso el: {format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                </div>
            </div>

            {/* General Info Grid */}
            <div className="grid grid-cols-2 gap-12 mb-10">
                {/* Fechas */}
                <div>
                    <h3 className="text-xs font-bold uppercase text-slate-400 mb-4 tracking-wider border-b border-slate-100 pb-2">Detalles del Servicio</h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-slate-100 rounded-lg">
                                <Calendar className="w-5 h-5 text-slate-700" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">Fechas</p>
                                <p className="text-base text-slate-700">
                                    {format(startDate, "EEEE d 'de' MMMM", { locale: es })}
                                    <br />
                                    hasta
                                    <br />
                                    {format(endDate, "EEEE d 'de' MMMM", { locale: es })}
                                </p>
                                <p className="text-xs text-slate-500 mt-1 font-medium">({nights} {nights === 1 ? 'noche' : 'noches'})</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-slate-100 rounded-lg">
                                <Clock className="w-5 h-5 text-slate-700" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">Horarios</p>
                                <p className="text-sm text-slate-700">Check-in: 12:00 PM</p>
                                <p className="text-sm text-slate-700">Check-out: 12:00 PM</p>
                            </div>
                        </div>

                        {/* Location Logic */}
                        <div className="mt-6 border-t border-slate-100 pt-4">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-slate-100 rounded-lg">
                                    <MapPin className="w-5 h-5 text-slate-700" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Lugar del Servicio</p>
                                    {booking.servicio === 'hospedaje' ? (
                                        <>
                                            <span className="text-xs font-bold text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded">En casa del Sitter</span>
                                            <p className="text-sm text-slate-700 mt-1">{sitter?.direccion || 'Dirección no disponible'}</p>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-xs font-bold text-sky-600 uppercase bg-sky-50 px-1.5 py-0.5 rounded">
                                                {booking.servicio === 'paseo' ? 'Punto de Encuentro' : 'En casa del Cliente'}
                                            </span>
                                            <p className="text-sm text-slate-700 mt-1">{booking.direccion?.direccion_completa || booking.direccion_cliente || 'Dirección no especificada'}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cliente */}
                <div>
                    <h3 className="text-xs font-bold uppercase text-slate-400 mb-4 tracking-wider border-b border-slate-100 pb-2">Datos del Cliente</h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-lg font-bold text-slate-900">{booking.cliente?.nombre} {booking.cliente?.apellido_p}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-700">{booking.cliente?.telefono || 'No registrado'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-700">{booking.cliente?.email}</span>
                        </div>
                        {/* Address moved to Service Details */}
                    </div>
                </div>
            </div>

            {/* Mascotas */}
            <div className="mb-10">
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-6 tracking-wider border-b border-slate-100 pb-2">Mascotas a Cuidar</h3>
                <div className="grid grid-cols-1 gap-6">
                    {pets.map((pet, index) => (
                        <div key={index} className="flex gap-6 p-4 rounded-xl border border-slate-200 bg-slate-50/50 break-inside-avoid">
                            {/* Icon / Image Placeholder */}
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-2 border-slate-100 shadow-sm shrink-0">
                                {pet.tipo === 'perro' ? <Dog className="w-8 h-8 text-slate-400" /> :
                                    pet.tipo === 'gato' ? <Cat className="w-8 h-8 text-slate-400" /> :
                                        <PawPrint className="w-8 h-8 text-slate-400" />}
                            </div>

                            <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-2">
                                <div className="col-span-2 mb-1 flex items-center gap-2">
                                    <h4 className="text-lg font-bold text-slate-900">{pet.nombre}</h4>
                                    <span className="text-xs font-medium px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-500 uppercase">{pet.tipo}</span>
                                </div>

                                <div>
                                    <span className="text-xs font-bold text-slate-400 block">Raza</span>
                                    <span className="text-sm text-slate-900">{pet.raza || 'No especificada'}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-slate-400 block">Edad</span>
                                    <span className="text-sm text-slate-900">{pet.edad_anos} años, {pet.edad_meses} meses</span>
                                </div>

                                <div className="col-span-2 mt-2 pt-2 border-t border-slate-200/50">
                                    <span className="text-xs font-bold text-slate-400 block mb-1">Cuidados Especiales / Nota</span>
                                    <p className="text-sm text-slate-700 italic">{pet.descripcion || 'Sin descripción adicional.'}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {pets.length === 0 && (
                        <p className="text-slate-500 italic">No hay información detallada de las mascotas disponible.</p>
                    )}
                </div>
            </div>

            {/* Sitter Info (Footer) */}
            <div className="border-t-2 border-slate-100 pt-8 mt-12 flex items-center justify-between text-slate-500 text-sm">
                <div>
                    <p className="font-bold text-slate-900 mb-1">Cuidado por PetMate</p>
                    <p>Sitter: {sitter?.nombre} {sitter?.apellido}</p>
                    <p>{sitter?.email}</p>
                </div>
                <div className="text-right">
                    <p className="italic">Generado por PetMate.cl</p>
                </div>
            </div>
        </div>
    );
}
