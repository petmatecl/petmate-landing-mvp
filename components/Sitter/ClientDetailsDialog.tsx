import { X, Mail, Phone, MapPin, User } from "lucide-react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    client: any; // Using any for flexibility with Supabase join results
};

export default function ClientDetailsDialog({ isOpen, onClose, client }: Props) {
    if (!isOpen || !client) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-300 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <User size={20} className="text-emerald-500" /> Confirmación del Usuario
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="flex flex-col items-center mb-4">
                        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                            <span className="text-3xl font-bold text-slate-400">
                                {client.nombre?.[0]}{client.apellido_p?.[0]}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 text-center">
                            {client.nombre} {client.apellido_p}
                        </h3>
                        <p className="text-sm text-slate-500">Usuario de Pawnecta</p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                <Mail size={16} />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs text-slate-500 uppercase font-bold">Email</p>
                                <a href={`mailto:${client.email}`} className="text-sm text-emerald-600 hover:underline truncate block">
                                    {client.email}
                                </a>
                            </div>
                        </div>

                        {client.telefono && (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                    <Phone size={16} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Teléfono</p>
                                    <a href={`tel:${client.telefono}`} className="text-sm text-slate-700 hover:text-emerald-600 font-medium">
                                        {client.telefono}
                                    </a>
                                </div>
                            </div>
                        )}

                        {(client.comuna || client.region) && (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                    <MapPin size={16} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Ubicación</p>
                                    <p className="text-sm text-slate-700">
                                        {client.comuna} {client.comuna && client.region ? ', ' : ''} {client.region}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
