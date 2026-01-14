import React from "react";
import { Card } from "../Shared/Card";

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
};

export default function PetCard({ pet, onEdit }: PetCardProps) {
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
        <Card hoverable padding="m" onClick={() => onEdit(pet)} className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-4">
                {/* Icono / Avatar */}
                <div className="w-12 h-12 flex-shrink-0">
                    {pet.foto_mascota ? (
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-300 shadow-sm relative">
                            <img src={pet.foto_mascota} alt={pet.nombre} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div
                            className={`w-12 h-12 flex items-center justify-center rounded-full text-2xl ${isDog ? "bg-orange-50 text-orange-500" : "bg-emerald-50 text-emerald-500"
                                }`}
                        >
                            {isDog ? "🐶" : "🐱"}
                        </div>
                    )}
                </div>

                <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 truncate flex items-center gap-2">
                        {pet.nombre}
                        {pet.trato_especial && (
                            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" title="Requiere trato especial"></span>
                        )}
                    </h3>
                    <p className="text-xs text-slate-500 truncate">
                        {isDog ? "Perro" : "Gato"} • {pet.sexo === "macho" ? "Macho" : "Hembra"} • {pet.tamano && <span className="capitalize">{pet.tamano} • </span>} {ageDisplay}
                    </p>
                    <div className="flex gap-1 mt-1">
                        {pet.vacunas_al_dia && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">Vacunas ✅</span>}
                        {pet.tiene_chip && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">Chip</span>}
                    </div>
                </div>
            </div>
            <button
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors ml-2 flex-shrink-0"
            >
                Editar
            </button>
        </Card>
    );
}
