import React from "react";

export type Pet = {
    id: string;
    nombre: string;
    tipo: "perro" | "gato";
    edad?: number;
    raza?: string;
    descripcion?: string;
    sexo?: "macho" | "hembra";
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
        const diffMs = Date.now() - dob.getTime();
        const ageDt = new Date(diffMs);
        return `${Math.abs(ageDt.getUTCFullYear() - 1970)} años`;
    };

    const ageDisplay = calculateAge(pet.fecha_nacimiento);

    return (
        <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
                {/* Icono / Avatar */}
                <div className="w-12 h-12 flex-shrink-0">
                    {pet.foto_mascota ? (
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-100 shadow-sm relative">
                            <img src={pet.foto_mascota} alt={pet.nombre} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div
                            className={`w-12 h-12 flex items-center justify-center rounded-full text-2xl ${isDog ? "bg-orange-50 text-orange-500" : "bg-purple-50 text-purple-500"
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
                        {isDog ? "Perro" : "Gato"} • {pet.sexo === "macho" ? "Macho" : "Hembra"} • {ageDisplay}
                    </p>
                    <div className="flex gap-1 mt-1">
                        {pet.vacunas_al_dia && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">Vacunas ✅</span>}
                        {pet.tiene_chip && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">Chip</span>}
                    </div>
                </div>
            </div>
            <button
                onClick={() => onEdit(pet)}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors ml-2 flex-shrink-0"
            >
                Editar
            </button>
        </div>
    );
}
