import React, { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Edit2, Trash2, Calendar, Home, Hotel, CheckCircle2, Users, User, Phone, MapPin, Mail, ChevronDown, ChevronUp, Clock, Dog, Cat, Search, FileText, Download } from "lucide-react";
import ContactSitterButton from "../Shared/ContactSitterButton";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDFPreviewModal } from "../Shared/PDFPreviewModal";

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
    // Other hooks ...
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




    // ... inside component ...
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

    const getPDFDoc = () => {
        const doc = new jsPDF();

        // Brand Colors
        const emeraldColor = '#10b981'; // Emerald 500
        const slateColor = '#334155'; // Slate 700

        // Header
        doc.setFontSize(22);
        doc.setTextColor(emeraldColor);
        doc.text("Ficha de Servicio - Pawnecta", 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(slateColor);
        doc.text(`ID Reserva: #${trip.id.slice(0, 8).toUpperCase()}`, 14, 28);
        doc.text(`Fecha de Emisión: ${format(new Date(), "d 'de' MMMM yyyy", { locale: es })}`, 14, 33);

        // Service Details
        autoTable(doc, {
            startY: 40,
            head: [['Detalle del Servicio', 'Información']],
            body: [
                ['Tipo de Servicio', trip.servicio.charAt(0).toUpperCase() + trip.servicio.slice(1)],
                ['Fecha Inicio', format(startDate, "d 'de' MMMM yyyy", { locale: es })],
                ['Fecha Fin', endDate ? format(endDate, "d 'de' MMMM yyyy", { locale: es }) : '-'],
                ['Duración', `${days} ${days === 1 ? 'noche' : 'noches'}`],
                ['Mascotas', pets ? pets.map(p => p.name).join(', ') : (petNames || 'N/A')],
            ],
            theme: 'grid',
            headStyles: { fillColor: emeraldColor },
            styles: { fontSize: 10 }
        });

        // Sitter Details
        if (trip.sitter) {
            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 10,
                head: [['Datos del Sitter', '']],
                body: [
                    ['Nombre', `${trip.sitter.nombre} ${trip.sitter.apellido_p || ''}`],
                    ['Teléfono', trip.sitter.telefono || 'No registrado'],
                    ['Email', trip.sitter.email || 'No registrado'],
                    ['Dirección', trip.sitter.direccion_completa || `${trip.sitter.calle || ''} ${trip.sitter.numero || ''}, ${trip.sitter.comuna || ''}`],
                ],
                theme: 'grid',
                headStyles: { fillColor: slateColor },
                styles: { fontSize: 10 }
            });
        }

        // Location Details
        const locationText = trip.servicio === 'hospedaje'
            ? (trip.sitter?.direccion_completa || 'Dirección del Sitter')
            : (serviceAddress || 'Domicilio del Cliente');

        doc.text("Ubicación del Cuidado:", 14, (doc as any).lastAutoTable.finalY + 10);
        doc.setFontSize(10);
        doc.text(locationText, 14, (doc as any).lastAutoTable.finalY + 16);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Pawnecta - Cuidado de mascotas de confianza.", 14, 280);

        return doc;
    };

    const handlePreviewPDF = () => {
        const doc = getPDFDoc();
        const pdfBlob = doc.output('bloburl');
        setPdfPreviewUrl(pdfBlob.toString());
        setShowPdfPreview(true);
    };

    const handleDownloadPDF = () => {
        const doc = getPDFDoc();
        doc.save(`Ficha_Pawnecta_${trip.id.slice(0, 8)}.pdf`);
    };

    return (
        <div className={`bg-white rounded-2xl p-5 border-2 transition-all hover:shadow-lg relative overflow-hidden ${['reservado'].includes(trip.estado)
            ? 'border-amber-200 bg-amber-50/10 shadow-md ring-1 ring-amber-100'
            : ['confirmado', 'aceptado', 'pagado', 'en_curso'].includes(trip.estado)
                ? 'border-emerald-100 shadow-sm'
                : 'border-slate-400'
            }`}>

            {/* ID Badge */}
            <div className="absolute top-0 left-0 bg-slate-100 text-slate-500 text-[10px] font-mono px-2 py-0.5 rounded-br-lg border-b border-r border-slate-300">
                #{trip.id.slice(0, 8).toUpperCase()}
            </div>

            {/* Application Badge */}
            {!trip.sitter_asignado && hasApplications && (
                <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10 animate-pulse">
                    {trip.postulaciones_count} {trip.postulaciones_count === 1 ? 'Postulación' : 'Postulaciones'}
                </div>
            )}

            <div className="flex flex-col gap-4 pt-3">
                {/* Header Section: Icon + Date + Basic Info */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full shrink-0 ${trip.servicio === 'hospedaje' ? 'bg-emerald-50 text-emerald-600' :
                            trip.servicio === 'domicilio' ? 'bg-emerald-50 text-emerald-600' :
                                trip.servicio === 'paseo' ? 'bg-orange-50 text-orange-600' :
                                    'bg-slate-100 text-slate-600'
                            }`}>
                            {trip.servicio === 'hospedaje' && <Hotel size={24} />}
                            {trip.servicio === 'domicilio' && <Home size={24} />}
                            {trip.servicio === 'paseo' && <CheckCircle2 size={24} />}
                            {trip.servicio === 'guarderia' && <Calendar size={24} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-lg">
                                {format(startDate, "d 'de' MMMM", { locale: es })}
                                {endDate && ` – ${format(endDate, "d 'de' MMMM", { locale: es })}`}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                <span className="bg-slate-50 px-2 py-0.5 rounded border-2 border-slate-300 capitalize font-medium">
                                    {trip.servicio}
                                </span>
                                <span className="flex items-center gap-1">
                                    {days} {days === 1 ? 'noche' : 'noches'}
                                </span>
                                <span className="text-slate-300">|</span>
                                <span className="flex items-center flex-wrap gap-2">
                                    {pets && pets.length > 0 ? (
                                        pets.map((pet, idx) => (
                                            <span key={idx} className="flex items-center gap-1 text-slate-600 font-medium">
                                                {pet.type === 'perro' ? <Dog size={14} className="text-slate-400" /> : <Cat size={14} className="text-slate-400" />}
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
                        </div>
                    </div>

                    {/* Top Actions: Edit/Delete (Only if not active/completed to avoid accidents, or always keep them small) */}
                    <div className="flex gap-1">
                        <button onClick={() => onEdit(trip)} className="p-2 text-slate-300 hover:text-emerald-600 transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => onDelete(trip.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={16} /></button>
                    </div>
                </div>

                <hr className="border-slate-300" />

                {/* 3-Column Layout for Confirmed/Assigned Trips */}
                {trip.sitter_asignado && trip.sitter ? (
                    ['confirmado', 'aceptado', 'pagado', 'en_curso', 'completado'].includes(trip.estado) ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* Column 1: Sitter Data */}
                            <div className="flex flex-col gap-3">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Datos del Sitter</p>
                                <div className="flex items-center gap-3">
                                    <Link href={`/sitter/${trip.sitter?.id}?returnTo=/usuario`} className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 overflow-hidden shrink-0 flex items-center justify-center">
                                        {trip.sitter?.foto_perfil ? <img src={trip.sitter.foto_perfil} className="w-full h-full object-cover" /> : <User size={20} className="text-emerald-700" />}
                                    </Link>
                                    <div>
                                        <Link href={`/sitter/${trip.sitter?.id}?returnTo=/usuario`} className="font-bold text-slate-900 hover:text-emerald-700 hover:underline">
                                            {trip.sitter?.nombre} {trip.sitter?.apellido_p}
                                        </Link>
                                        <p className="text-xs text-slate-500">Sitter Certificado</p>
                                    </div>
                                </div>
                                <div className="space-y-2 pl-1">
                                    <a href={`tel:${trip.sitter?.telefono}`} className="text-xs text-slate-600 hover:text-emerald-600 flex items-center gap-2">
                                        <Phone size={14} className="text-slate-400" /> {trip.sitter?.telefono || 'No registrado'}
                                    </a>
                                    <a href={`mailto:${trip.sitter?.email}`} className="text-xs text-slate-600 hover:text-emerald-600 flex items-center gap-2">
                                        <Mail size={14} className="text-slate-400" /> {trip.sitter?.email || 'No registrado'}
                                    </a>
                                </div>
                            </div>

                            {/* Column 2: Location */}
                            <div className="flex flex-col gap-3 md:border-l md:border-slate-300 md:pl-6">
                                <div className="flex justify-between items-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ubicación del Cuidado</p>
                                    {((trip.servicio === 'hospedaje' && (trip.sitter?.direccion_completa || trip.sitter?.comuna)) || (trip.servicio === 'domicilio' && serviceAddress)) && (
                                        <button onClick={() => toggleMap(trip.servicio === 'hospedaje' ? 'sitter' : 'client')} className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-1">
                                            Ver Mapa {activeMap ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-start gap-2">
                                    <MapPin size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm text-slate-800 leading-snug">
                                            {(() => {
                                                const originalAddress = trip.servicio === 'hospedaje'
                                                    ? (trip.sitter?.calle && trip.sitter?.numero && trip.sitter?.comuna
                                                        ? `${trip.sitter.calle} ${trip.sitter.numero}, ${trip.sitter.comuna}`
                                                        : (trip.sitter?.direccion_completa || 'Dirección no disponible'))
                                                    : (serviceAddress || 'Dirección no disponible');

                                                // Clean up address: Remove generic suffixes like "Región Metrop...", "Chile", Zip Codes
                                                return originalAddress
                                                    .replace(/, Región Metropolitana.*$/, '')
                                                    .replace(/, Provincia de.*$/, '')
                                                    .replace(/, \d{7}.*$/, '') // Remove zip + ending
                                                    .replace(/, Chile$/, '');
                                            })()}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {trip.servicio === 'hospedaje' ? 'Debes llevar a tu mascota aquí' : 'El Sitter vendrá a esta dirección'}
                                        </p>
                                    </div>
                                </div>
                                {/* Map */}
                                {activeMap && (
                                    <div className="rounded-lg overflow-hidden border-2 border-slate-300 shadow-inner h-32 w-full">
                                        <iframe
                                            width="100%" height="100%" frameBorder="0" style={{ border: 0 }}
                                            src={`https://maps.google.com/maps?q=${encodeURIComponent(
                                                trip.servicio === 'hospedaje' ? (trip.sitter?.direccion_completa || '') : (serviceAddress || '')
                                            )}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                        ></iframe>
                                    </div>
                                )}
                            </div>

                            {/* Column 3: Actions */}
                            <div className="flex flex-col gap-3 md:border-l md:border-slate-300 md:pl-6 justify-center">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider md:hidden">Acciones</p>
                                {trip.sitter?.auth_user_id && (
                                    <ContactSitterButton
                                        sitterId={trip.sitter.auth_user_id}
                                        className="w-full bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-sm text-sm"
                                        label="Chat con Sitter"
                                    />
                                )}
                                <button
                                    onClick={handlePreviewPDF}
                                    className="w-full bg-white text-slate-700 border-2 border-slate-300 font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 hover:text-emerald-600 transition-colors text-sm"
                                >
                                    <FileText size={16} /> Ver Ficha
                                </button>
                            </div>

                        </div>
                    ) : (
                        // RESERVADO BUT NOT CONFIRMED STATE
                        trip.estado === 'reservado' ? (
                            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 flex flex-col md:flex-row items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold border border-amber-200">
                                        {trip.sitter?.foto_perfil ? <img src={trip.sitter.foto_perfil} className="w-full h-full rounded-full object-cover" /> : trip.sitter.nombre.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">{trip.sitter.nombre} ha aceptado</p>
                                        <p className="text-xs text-amber-700">Confirma para completar la reserva.</p>
                                    </div>
                                </div>
                                <div className="flex-1 w-full md:w-auto flex justify-end">
                                    {onConfirm && (
                                        <button onClick={() => onConfirm(trip)} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 shadow-lg flex gap-2 items-center w-full md:w-auto justify-center">
                                            <CheckCircle2 size={16} /> Confirmar Reserva
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // PENDING STATE
                            <div className="bg-slate-50 rounded-lg p-4 text-center text-slate-500 text-sm">
                                Esperando respuesta del sitter...
                            </div>
                        )
                    )
                ) : (
                    // NO SITTER ASSIGNED (Borrador/Marketplace/Pending Application)
                    <div className="flex flex-col items-center justify-center py-4 gap-3 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        {hasApplications ? (
                            <div className="text-center">
                                <p className="font-bold text-slate-700 mb-2">¡Tienes {trip.postulaciones_count} postulantes!</p>
                                <button onClick={() => onViewApplications && onViewApplications(trip)} className="bg-rose-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-rose-700 animate-pulse">
                                    Ver Postulantes
                                </button>
                            </div>
                        ) : (
                            <div className="text-center">
                                <p className="font-medium text-slate-500 mb-2">Publicado en el muro</p>
                                <p className="text-xs text-slate-400">Los sitters se postularán pronto.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <PDFPreviewModal
                isOpen={showPdfPreview}
                onClose={() => setShowPdfPreview(false)}
                pdfUrl={pdfPreviewUrl}
                title={`Ficha - ${trip.servicio}`}
                onDownload={handleDownloadPDF}
            />
        </div >
    );
}
