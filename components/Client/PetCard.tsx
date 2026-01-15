import { Card } from "../Shared/Card";
import { Edit2, Mars, Venus } from "lucide-react";

export type Pet = {
    id: string;
    nombre: string;
    tipo: "perro" | "gato";
    edad?: number;
    raza?: string;
    descripcion?: string;
    sexo?: "macho" | "hembra";
    tamano?: "pequeño" | "mediano" | "grande" | "gigante";
    // New fields
    fecha_nacimiento?: string;
    tiene_chip?: boolean;
    chip_id?: string;
    vacunas_al_dia?: boolean;
    enfermedades?: string;
    trato_especial?: boolean;
    trato_especial_desc?: string;
    foto_mascota?: string;
    fotos_galeria?: string[]; // Added gallery field
    user_id?: string;
};

type PetCardProps = {
    pet: Pet;
    onEdit: (pet: Pet) => void;
    className?: string;
};

export default function PetCard({ pet, onEdit, ...props }: PetCardProps) {
    const isDog = pet.tipo === "perro";

    // Calcular edad si hay fecha de nacimiento
    const calculateAge = (dobString?: string) => {
        if (!dobString) return pet.edad ? `${pet.edad} años` : "Edad desc.";
        const dob = new Date(dobString);
        const today = new Date();

        let years = today.getFullYear() - dob.getFullYear();
        let months = today.getMonth() - dob.getMonth();

        if (months < 0 || (months === 0 && today.getDate() < dob.getDate())) {
            years--;
            months += 12;
        }

        if (years < 1) {
            // Recalculate strict months if needed, but the above logic handles year adjustment.
            // If years became -1 (future date), handle it? Assuming valid past date.
            // If years is 0, we use the months remainder.
            if (today.getDate() < dob.getDate()) {
                months--;
            }
            // Ensure non-negative
            months = Math.max(0, months + (years * 12)); // Should be just 'months' if years is 0

            // Simplest approach for < 1 year:
            const diffMonths = (today.getFullYear() - dob.getFullYear()) * 12 + (today.getMonth() - dob.getMonth());
            const adjustedMonths = today.getDate() < dob.getDate() ? diffMonths - 1 : diffMonths;

            return `${Math.max(0, adjustedMonths)} meses`;
        }

        return `${years} años`;
    };

    const ageDisplay = calculateAge(pet.fecha_nacimiento);

    return (
        <Card hoverable padding="m" onClick={() => onEdit(pet)} className={`flex items-center justify-between cursor-pointer border-slate-200 hover:shadow-md transition-all group ${props.className || ''}`}>
            <div className="flex items-center gap-5 min-w-0">
                {/* Icono / Avatar */}
                <div className="w-20 h-20 flex-shrink-0">
                    {pet.foto_mascota ? (
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative">
                            <img src={pet.foto_mascota} alt={pet.nombre} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div
                            className={`w-20 h-20 flex items-center justify-center rounded-2xl text-3xl font-bold border ${isDog
                                ? "bg-orange-50 text-orange-600 border-orange-100"
                                : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                }`}
                        >
                            {/* Initials or Icon */}
                            {pet.nombre ? pet.nombre.charAt(0).toUpperCase() : (isDog ? "🐶" : "🐱")}
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-lg truncate flex items-center gap-2">
                        {pet.nombre}
                        {pet.trato_especial && (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm ring-1 ring-white" title="Requiere trato especial"></span>
                        )}
                    </h3>
                    <p className="text-sm text-slate-500 truncate mt-0.5 flex items-center gap-1.5">
                        <span className="font-medium text-slate-700">{isDog ? "Perro" : "Gato"}</span>
                        {pet.sexo && (
                            <span className="flex items-center gap-1 text-slate-400" title={pet.sexo === "macho" ? "Macho" : "Hembra"}>
                                • {pet.sexo === "macho" ? <Mars size={14} /> : <Venus size={14} />}
                            </span>
                        )}
                        {pet.raza && <span className="text-slate-400"> • {pet.raza}</span>}
                    </p>
                    <div className="flex gap-2 mt-3 text-center">
                        <span className="flex-1 min-w-[80px] h-9 inline-flex items-center justify-center px-2 rounded-xl text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200">
                            {ageDisplay}
                        </span>
                        {pet.vacunas_al_dia && (
                            <span className="flex-1 min-w-[80px] h-9 inline-flex items-center justify-center px-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100/50">
                                Vacunas OK
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <button
                className="p-2.5 text-slate-400 hover:text-white hover:bg-emerald-500 rounded-xl transition-all ml-4 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                title="Editar Mascota"
                aria-label={`Editar a ${pet.nombre}`}
            >
                <Edit2 size={18} />
            </button>
        </Card>
    );
}
