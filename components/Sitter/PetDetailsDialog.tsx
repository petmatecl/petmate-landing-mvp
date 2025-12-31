import React, { useState } from 'react';
import { X, Dog, Cat, PawPrint, Calendar, Activity, Info } from 'lucide-react';
import { differenceInYears } from 'date-fns';

interface Pet {
    id: string;
    nombre: string;
    tipo: string;
    raza: string;
    fecha_nacimiento: string;
    descripcion: string;
    // Add other fields as needed
}

interface PetDetailsDialogProps {
    pets: Pet[];
    isOpen: boolean;
    onClose: () => void;
}

const PetDetailsDialog: React.FC<PetDetailsDialogProps> = ({ pets, isOpen, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!isOpen || !pets || pets.length === 0) return null;

    const pet = pets[currentIndex];

    // Determine icon based on pet type
    const getPetIcon = (tipo: string) => {
        switch (tipo?.toLowerCase()) {
            case 'perro': return <Dog size={24} className="text-white" />;
            case 'gato': return <Cat size={24} className="text-white" />;
            default: return <PawPrint size={24} className="text-white" />;
        }
    };

    const getPetColor = (tipo: string) => {
        switch (tipo?.toLowerCase()) {
            case 'perro': return 'bg-amber-500';
            case 'gato': return 'bg-sky-500';
            default: return 'bg-emerald-500';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                {/* Header with Navigation if multiple pets */}
                <div className={`${getPetColor(pet.tipo)} p-6 text-white relative flex flex-col justify-between transition-colors duration-300`}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-1 transition-colors"
                    >
                        <X size={20} className="text-white" />
                    </button>

                    <div className="flex items-center gap-4 py-2">
                        <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                            {getPetIcon(pet.tipo)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{pet.nombre}</h2>
                            <span className="opacity-90 font-medium capitalize flex items-center gap-2 text-sm">
                                {pet.tipo} • {pet.raza || 'Mestizo'}
                            </span>
                        </div>
                    </div>

                    {/* Tabs for multiple pets */}
                    {pets.length > 1 && (
                        <div className="flex gap-1 overflow-x-auto mt-4 pt-2 border-t border-white/20 no-scrollbar">
                            {pets.map((p, idx) => (
                                <button
                                    key={p.id}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${idx === currentIndex
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                        }`}
                                >
                                    {p.nombre}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-bold mb-1">
                                <Calendar size={14} /> Edad
                            </div>
                            <p className="text-slate-900 font-medium">
                                {pet.fecha_nacimiento
                                    ? `${differenceInYears(new Date(), new Date(pet.fecha_nacimiento))} años`
                                    : 'Desconocida'}
                            </p>
                        </div>
                        <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-bold mb-1">
                                <Activity size={14} /> Tamaño
                            </div>
                            <p className="text-slate-900 font-medium capitalize">
                                Estándar {/* Field not yet in DB, placeholder */}
                            </p>
                        </div>
                    </div>

                    {pet.descripcion && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase font-bold mb-2">
                                <Info size={14} /> Sobre {pet.nombre}
                            </div>
                            <p className="text-slate-700 text-sm leading-relaxed">
                                {pet.descripcion}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PetDetailsDialog;
