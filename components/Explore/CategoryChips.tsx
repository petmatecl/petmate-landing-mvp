import React, { useState, useRef, useEffect } from 'react';
import {
    ChevronDown, Check, Grid2x2,
    Home, Sun, MapPin, Scissors, Truck, Stethoscope, Dumbbell, PawPrint,
    LucideIcon
} from 'lucide-react';

const SLUG_ICONS: Record<string, LucideIcon> = {
    hospedaje: Home,
    guarderia: Sun,
    paseos: PawPrint,
    peluqueria: Scissors,
    traslado: Truck,
    veterinario: Stethoscope,
    adiestramiento: Dumbbell,
    domicilio: MapPin,
};

interface Category {
    id: string;
    slug: string;
    nombre: string;
    icono: string;
}

interface Props {
    categories: Category[];
    selectedCategories: string[];
    onChange: (slugs: string[]) => void;
}

export default function CategorySelect({ categories, selectedCategories, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggle = (slug: string) => {
        if (selectedCategories.includes(slug)) {
            onChange(selectedCategories.filter(s => s !== slug));
        } else {
            onChange([...selectedCategories, slug]);
        }
    };

    const clearAll = () => onChange([]);

    // Label for the trigger button
    const label = selectedCategories.length === 0
        ? 'Todas las categorías'
        : selectedCategories.length === 1
            ? categories.find(c => c.slug === selectedCategories[0])?.nombre ?? '1 categoría'
            : `${selectedCategories.length} categorías`;

    const isActive = selectedCategories.length > 0;

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className={`flex items-center gap-2 h-10 pl-3 pr-3 rounded-xl border text-sm font-medium transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${isActive
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-white'
                    }`}
            >
                <Grid2x2 size={15} className={isActive ? 'text-emerald-700' : 'text-slate-400'} />
                <span>{label}</span>
                <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${open ? 'rotate-180' : ''} ${isActive ? 'text-emerald-700' : 'text-slate-400'}`}
                />
            </button>

            {open && (
                <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* "Todas" option */}
                    <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); clearAll(); setOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold border-b border-slate-100 transition-colors ${selectedCategories.length === 0
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'text-slate-700 hover:bg-slate-50'
                            }`}
                    >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedCategories.length === 0 ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'}`}>
                            {selectedCategories.length === 0 && <Check size={10} strokeWidth={3} className="text-white" />}
                        </div>
                        Todas las categorías
                    </button>

                    {/* Individual categories */}
                    <div className="py-1 max-h-64 overflow-y-auto">
                        {categories.map(cat => {
                            const checked = selectedCategories.includes(cat.slug);
                            const CatIcon = SLUG_ICONS[cat.slug] ?? Grid2x2;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onMouseDown={e => { e.preventDefault(); toggle(cat.slug); }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${checked
                                        ? 'bg-emerald-50 text-emerald-800'
                                        : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'}`}>
                                        {checked && <Check size={10} strokeWidth={3} className="text-white" />}
                                    </div>
                                    <CatIcon size={14} className={checked ? 'text-emerald-700' : 'text-slate-400'} />
                                    <span className="font-medium">{cat.nombre}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Clear selection footer */}
                    {selectedCategories.length > 0 && (
                        <div className="border-t border-slate-100 px-4 py-2">
                            <button
                                type="button"
                                onMouseDown={e => { e.preventDefault(); clearAll(); setOpen(false); }}
                                className="text-xs text-rose-500 font-medium hover:underline"
                            >
                                Quitar filtros de categoría
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
