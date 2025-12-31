import { X, Dog, Cat, PawPrint, Calendar, Ruler, FileText } from "lucide-react";
import { differenceInYears } from "date-fns";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    pet: any; // Using any for flexibility
};

export default function PetDetailsDialog({ isOpen, onClose, pet }: Props) {
    if (!isOpen || !pet) return null;

    const age = pet.fecha_nacimiento
        ? differenceInYears(new Date(), new Date(pet.fecha_nacimiento))
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header using Pet Type Color */}
                <div className={`px-6 py-6 flex flex-col items-center justify-center relative ${pet.tipo === 'perro' ? 'bg-amber-50' : 'bg-slate-50'}`}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-3 shadow-sm border-4 border-white ${pet.tipo === 'perro' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-600'}`}>
                        {pet.tipo === 'perro' ? <Dog size={40} /> : pet.tipo === 'gato' ? <Cat size={40} /> : <PawPrint size={40} />}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">{pet.nombre}</h2>
                    <span className="text-xs uppercase tracking-wide font-bold text-slate-400 mt-1 bg-white/60 px-2 py-0.5 rounded-full">
                        {pet.tipo}
                    </span>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-2 mb-1 text-slate-400">
                                <Ruler size={14} />
                                <span className="text-[10px] uppercase font-bold">Raza</span>
                            </div>
                            <p className="font-medium text-slate-700 truncate" title={pet.raza}>
                                {pet.raza || "No especificada"}
                            </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-2 mb-1 text-slate-400">
                                <Calendar size={14} />
                                <span className="text-[10px] uppercase font-bold">Edad</span>
                            </div>
                            <p className="font-medium text-slate-700">
                                {age !== null ? `${age} años` : "Desconocida"}
                            </p>
                        </div>
                    </div>

                    {pet.descripcion && (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-2 text-slate-400">
                                <FileText size={14} />
                                <span className="text-[10px] uppercase font-bold">Notas importantes</span>
                            </div>
                            <p className="text-sm text-slate-600 italic leading-relaxed">
                                "{pet.descripcion}"
                            </p>
                        </div>
                    )}

                    {/* Size and Weight if available could go here */}
                </div>
            </div>
        </div>
    );
}
