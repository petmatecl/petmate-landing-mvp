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

import { Card } from "../Shared/Card";

export default function AddressCard({ address, onEdit, onDelete, onSetDefault }: Props) {
    const [showMap, setShowMap] = useState(false);

    return (
        <Card
            hoverable
            padding="m"
            className={`transition-all duration-300 ${address.es_principal
                ? '!bg-emerald-50/40 border-emerald-200/60 ring-1 ring-emerald-100/50'
                : 'border-slate-200 hover:shadow-md'}`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 w-full">
                    <div className={`mt-1 p-2.5 rounded-xl shrink-0 border shadow-sm ${address.es_principal
                        ? 'bg-emerald-100 text-emerald-600 border-emerald-200'
                        : 'bg-white text-slate-400 border-slate-100'}`}>
                        <MapPin size={20} />
                    </div>
                    <div className="w-full">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-900 text-lg">{address.nombre}</h3>
                            {address.es_principal && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                                    Principal
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed" title={address.direccion_completa}>
                            {address.calle} #{address.numero} {address.depto ? `, Depto/Casa ${address.depto}` : ''}<br />
                            <span className="text-slate-500">{address.comuna}, {address.region}</span>
                        </p>

                        {/* Inline Map Toggle */}
                        <div className="mt-3">
                            <button
                                onClick={() => setShowMap(!showMap)}
                                className="text-xs text-emerald-600 font-bold hover:text-emerald-700 flex items-center gap-1 transition-colors"
                            >
                                {showMap ? 'Ocultar mapa' : 'Ver mapa'}
                                {showMap ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {showMap && (
                                <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
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
                            <div className="mt-3 bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                                <p className="text-xs text-slate-500 italic flex items-start gap-2">
                                    <span className="not-italic opacity-60">📝</span> {address.notas}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <button
                        onClick={() => onEdit(address)}
                        className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        title="Editar"
                    >
                        <Edit2 size={18} />
                    </button>
                    <button
                        onClick={() => onDelete(address.id)}
                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Eliminar"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {!address.es_principal && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={() => onSetDefault(address.id)}
                        className="text-xs font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <CheckCircle2 size={16} />
                        Establecer como principal
                    </button>
                </div>
            )}
        </Card>
    );
}
