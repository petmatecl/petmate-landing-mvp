
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Pet } from "./PetCard";
import { PetsValue } from "../PetsSelectorAirbnb";

type Props = {
    myPets: Pet[];
    selectedIds: string[];
    onChange: (selectedIds: string[], computedValue: PetsValue) => void;
    hideLabel?: boolean;
};

export default function MyPetsSelector({ myPets, selectedIds, onChange, hideLabel }: Props) {
    const [open, setOpen] = useState(false);

    // Calcular totales basados en IDs seleccionados para mostrar en label
    const getSelectedPets = () => myPets.filter(p => selectedIds.includes(p.id));
    const selectedDogs = getSelectedPets().filter(p => p.tipo === "perro").length;
    const selectedCats = getSelectedPets().filter(p => p.tipo === "gato").length;

    const total = selectedIds.length;
    const label = total === 0 ? "Sin mascotas" :
        selectedIds.length === myPets.length && myPets.length > 0 ? "Todas mis mascotas" :
            `${selectedDogs > 0 ? `${selectedDogs} perro${selectedDogs > 1 ? 's' : ''}` : ''}${selectedDogs > 0 && selectedCats > 0 ? ', ' : ''}${selectedCats > 0 ? `${selectedCats} gato${selectedCats > 1 ? 's' : ''}` : ''}`;


    const togglePet = (petId: string) => {
        let newIds;
        if (selectedIds.includes(petId)) {
            newIds = selectedIds.filter(id => id !== petId);
        } else {
            newIds = [...selectedIds, petId];
        }

        // Calcular nuevos valores de perros/gatos para el padre
        const newSelectedPets = myPets.filter(p => newIds.includes(p.id));
        const dogs = newSelectedPets.filter(p => p.tipo === "perro").length;
        const cats = newSelectedPets.filter(p => p.tipo === "gato").length;

        onChange(newIds, { dogs, cats });
    };

    const selectAll = () => {
        const allIds = myPets.map(p => p.id);
        const dogs = myPets.filter(p => p.tipo === "perro").length;
        const cats = myPets.filter(p => p.tipo === "gato").length;
        onChange(allIds, { dogs, cats });
    }

    const clearAll = () => {
        onChange([], { dogs: 0, cats: 0 });
    }

    return (
        <div className="relative">
            {!hideLabel && (
                <label className="block text-sm font-medium text-slate-900">
                    Mascotas
                </label>
            )}

            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="mt-1 flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm shadow-sm hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
                <div className="flex flex-col overflow-hidden">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Mascotas
                    </span>
                    <span className={`truncate ${total === 0 ? "text-slate-400" : "text-slate-900"}`}>
                        {label || "Seleccionar..."}
                    </span>
                </div>
                <span className="text-xs text-slate-500 shrink-0 ml-2">Editar</span>
            </button>

            <p className="mt-1 text-xs text-slate-500">
                Selecciona quiénes viajan contigo (o se quedan en casa).
            </p>

            {/* Dropdown */}
            {open && (
                <>
                    <button
                        type="button"
                        className="fixed inset-0 z-40 cursor-default"
                        onClick={() => setOpen(false)}
                    />

                    <div className="absolute z-50 mt-2 w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl border border-slate-100 right-0 sm:left-0 sm:right-auto">
                        <div className="mb-2 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase">Tus Mascotas</span>
                            <button type="button" onClick={selectAll} className="text-xs text-emerald-600 font-medium hover:underline">Seleccionar todas</button>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {myPets.map(pet => {
                                const isSelected = selectedIds.includes(pet.id);
                                return (
                                    <div
                                        key={pet.id}
                                        onClick={() => togglePet(pet.id)}
                                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:bg-slate-50'}`}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>
                                            {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>

                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${pet.tipo === 'perro' ? "bg-orange-50 text-orange-500" : "bg-purple-50 text-purple-500"}`}>
                                            {pet.tipo === 'perro' ? '🐶' : '🐱'}
                                        </div>

                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-slate-900 leading-tight">{pet.nombre}</p>
                                            <p className="text-xs text-slate-500 capitalize">{pet.tipo} • {pet.raza || 'Sin raza'}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t pt-3">
                            <button
                                type="button"
                                onClick={clearAll}
                                className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline"
                            >
                                Limpiar selección
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                                Listo
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
