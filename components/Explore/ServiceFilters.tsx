import React, { useState } from 'react';
import AddressAutocomplete from '../AddressAutocomplete';

interface FiltersState {
    q: string;
    comuna: string;
    mascota: "perro" | "gato" | "otro" | "any";
    tamano: "pequeno" | "mediano" | "grande" | null;
    precioMax: string;
}

interface Props {
    filters: FiltersState;
    onFilterChange: (filters: Partial<FiltersState>) => void;
    onClear: () => void;
}

export default function ServiceFilters({ filters, onFilterChange, onClear }: Props) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // We map 'any' to null visually, but logic-wise it's 'any'
    return (
        <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">

                {/* Mobile Toggle & Main Search Bar */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">

                    {/* Búsqueda por texto (QuickSearch) */}
                    <div className="w-full md:w-1/3 min-w-[250px] relative">
                        <span className="absolute left-3 top-[11px] text-slate-400 z-10 w-5 h-5 flex items-center justify-center">
                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <circle cx="11" cy="11" r="8" strokeWidth="2" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            value={filters.q}
                            onChange={(e) => onFilterChange({ q: e.target.value })}
                            placeholder="Buscar servicios..."
                            className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                        />
                    </div>

                    {/* Ubicación (Primary Filter) */}
                    <div className="w-full md:w-1/3 min-w-[250px] relative">
                        <span className="absolute left-3 top-[11px] text-slate-400 z-10">
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </span>
                        <AddressAutocomplete
                            initialValue={filters.comuna}
                            placeholder="¿En qué comuna?"
                            onSelect={(res) => {
                                const cityName = res.address?.city || res.address?.town || res.address?.village || res.address?.municipality || res.display_name.split(',')[0];
                                onFilterChange({ comuna: cityName });
                            }}
                        // override padding via class approach from parent isn't fully supported by AddressAutocomplete props as wrote it, 
                        // but we can wrap it if needed. However, the autocomplete has pl-9 already.
                        />
                    </div>

                    <div className="w-full flex md:hidden justify-between items-center border-t border-slate-100 pt-3 mt-1">
                        <button
                            onClick={() => setIsMobileOpen(!isMobileOpen)}
                            className="text-sm font-semibold flex items-center gap-2 text-slate-700 hover:text-emerald-700"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                            {isMobileOpen ? 'Ocultar Filtros' : 'Más Filtros'}
                        </button>
                        {/* If any filter (beside comuna) is active, show clear */}
                        {(filters.mascota !== 'any' || filters.precioMax || filters.q) && (
                            <button onClick={onClear} className="text-xs text-rose-500 font-medium hover:underline">Limpiar</button>
                        )}
                    </div>

                    {/* Additional Filters (Desktop inline, Mobile hidden by default) */}
                    <div className={`w-full md:w-auto flex flex-col md:flex-row items-start md:items-center gap-4 ${isMobileOpen ? 'flex' : 'hidden md:flex'}`}>

                        {/* Tipo de Mascota Reusable Toggle */}
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            {[
                                { id: 'any', label: 'Todos' },
                                { id: 'perro', label: 'Perros' },
                                { id: 'gato', label: 'Gatos' },
                                { id: 'otro', label: 'Otro' }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => onFilterChange({ mascota: opt.id as any, tamano: null })}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filters.mascota === opt.id
                                        ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50'
                                        : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {/* Tamaño (Solo Perro) */}
                        {filters.mascota === 'perro' && (
                            <div className="flex bg-slate-100 p-1 rounded-xl animate-fade-in">
                                {['pequeno', 'mediano', 'grande'].map(size => (
                                    <button
                                        key={size}
                                        onClick={() => onFilterChange({ tamano: size as any })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${filters.tamano === size
                                            ? 'bg-emerald-100 text-emerald-800 shadow-sm border border-emerald-200'
                                            : 'text-slate-600 hover:text-slate-900 bg-white/50 border border-transparent'
                                            }`}
                                    >
                                        {size.replace('pequeno', 'Pequeño')}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Presupuesto */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-500 font-medium whitespace-nowrap">Precio Máx:</label>
                            <div className="relative w-32">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                                <input
                                    type="number"
                                    value={filters.precioMax}
                                    onChange={e => onFilterChange({ precioMax: e.target.value })}
                                    placeholder="Ej: 15000"
                                    className="w-full text-sm rounded-lg pl-6 pr-3 py-1.5 border-2 border-slate-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="hidden md:block">
                            {(filters.mascota !== 'any' || filters.precioMax || filters.comuna || filters.q) && (
                                <button onClick={onClear} className="text-sm text-rose-500 font-medium hover:underline p-2">
                                    Limpiar Todo
                                </button>
                            )}
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
