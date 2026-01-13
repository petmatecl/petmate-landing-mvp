import React, { useState } from "react";
import { MapPin, Edit2, Trash2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

export type Address = {
    id: string;
    nombre: string;
    direccion_completa: string;
    calle: string;
    numero: string;
    comuna: string;
    region: string;
    codigo_postal: string;
    depto?: string; // New field
    notas: string;
    es_principal: boolean;
    latitud?: number;
    longitud?: number;
};

type Props = {
    address: Address;
    onEdit: (address: Address) => void;
    onDelete: (id: string) => void;
    onSetDefault: (id: string) => void;
};

export default function AddressCard({ address, onEdit, onDelete, onSetDefault }: Props) {
    const [showMap, setShowMap] = useState(false);

    return (
        <div className={`group relative rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${address.es_principal ? 'bg-emerald-50/60 border-2 border-emerald-200 shadow-md shadow-emerald-100/40' : 'glass-panel hover:border-slate-400'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 w-full">
                    <div className={`mt-1 p-2 rounded-full shrink-0 ${address.es_principal ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        <MapPin size={18} />
                    </div>
                    <div className="w-full">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900">{address.nombre}</h3>
                            {address.es_principal && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                                    Principal
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5 line-clamp-2" title={address.direccion_completa}>
                            {address.calle} #{address.numero} {address.depto ? `, Depto/Casa ${address.depto}` : ''}, {address.comuna}
                        </p>

                        {/* Inline Map Toggle */}
                        <div className="mt-1">
                            <button
                                onClick={() => setShowMap(!showMap)}
                                className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-1"
                            >
                                {showMap ? 'Ocultar mapa' : 'Ver mapa'}
                                {showMap ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                            {showMap && (
                                <div className="mt-2 rounded-lg overflow-hidden border-2 border-slate-300">
                                    <iframe
                                        width="100%"
                                        height="150"
                                        frameBorder="0"
                                        style={{ border: 0 }}
                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(address.direccion_completa)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            )}
                        </div>

                        {address.notas && (
                            <p className="text-xs text-slate-400 mt-2 italic flex items-start gap-1">
                                <span className="not-italic">📝</span> {address.notas}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(address)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Editar"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(address.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {!address.es_principal && (
                <div className="mt-4 pt-3 border-t border-slate-300 flex justify-end">
                    <button
                        onClick={() => onSetDefault(address.id)}
                        className="text-xs font-semibold text-slate-500 hover:text-emerald-600 flex items-center gap-1.5 px-2 py-1 rounded hover:bg-emerald-50 transition-colors"
                    >
                        <CheckCircle2 size={14} />
                        Establecer como principal
                    </button>
                </div>
            )}
        </div>
    );
}
