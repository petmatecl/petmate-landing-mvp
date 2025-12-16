import React from "react";
import { MapPin, Edit2, Trash2, CheckCircle2 } from "lucide-react";

export type Address = {
    id: string;
    nombre: string;
    direccion_completa: string;
    calle: string;
    numero: string;
    comuna: string;
    region: string;
    codigo_postal: string;
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
    return (
        <div className={`group relative rounded-xl border p-4 transition-all hover:shadow-md ${address.es_principal ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className={`mt-1 p-2 rounded-full ${address.es_principal ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        <MapPin size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900">{address.nombre}</h3>
                            {address.es_principal && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                                    Principal
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5 line-clamp-2" title={address.direccion_completa}>
                            {address.direccion_completa}
                        </p>
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
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
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
