import React, { useState } from 'react';
import AddressAutocomplete from '../AddressAutocomplete';

interface FiltersState {
    q: string;
    comuna: string;
    mascota: "perro" | "gato" | "otro" | "any";
    tamano: "pequeno" | "mediano" | "grande" | null;
    precioMin: string;
    precioMax: string;
}

interface Props {
    filters: FiltersState;
    onFilterChange: (filters: Partial<FiltersState>) => void;
    onClear: () => void;
}

export default function ServiceFilters({ filters, onFilterChange, onClear }: Props) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const hasActiveFilters = filters.mascota !== 'any' || filters.precioMin || filters.precioMax || filters.q;

    return (
        <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">

                {/* Mobile Toggle & Main Search Bar */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">

                    {/* Búsqueda por texto */}
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
                            className="w-full h-12 pl-10 pr-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 transition-colors"
                        />
                    </div>

                    {/* Ubicación */}
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
                        />
                    </div>

                    {/* Mobile toggle row */}
                    <div className="w-full flex md:hidden justify-between items-center border-t border-slate-100 pt-3 mt-1">
                        <button
                            onClick={() => setIsMobileOpen(!isMobileOpen)}
                            className="text-sm font-semibold flex items-center gap-2 text-slate-700 hover:text-emerald-700"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                            {isMobileOpen ? 'Ocultar Filtros' : 'Más Filtros'}
                        </button>
                        {hasActiveFilters && (
                            <button onClick={onClear} className="text-xs text-rose-500 font-medium hover:underline">Limpiar</button>
                        )}
                    </div>

                    {/* Additional Filters */}
                    <div className={`w-full md:w-auto flex flex-col md:flex-row items-start md:items-center gap-4 ${isMobileOpen ? 'flex' : 'hidden md:flex'}`}>

                        {/* Tipo de Mascota */}
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            {[
                                { id: 'any', label: 'Cualquiera' },
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

                        {/* Rango de precio */}
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={filters.precioMin}
                                onChange={e => onFilterChange({ precioMin: e.target.value })}
                                placeholder="$ Min"
                                min="0"
                                className="w-24 h-10 px-3 border border-slate-200 rounded-xl text-sm text-slate-900 bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white transition-colors"
                            />
                            <span className="text-slate-400 text-sm font-medium select-none">a</span>
                            <input
                                type="number"
                                value={filters.precioMax}
                                onChange={e => onFilterChange({ precioMax: e.target.value })}
                                placeholder="$ Max"
                                min="0"
                                className="w-24 h-10 px-3 border border-slate-200 rounded-xl text-sm text-slate-900 bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white transition-colors"
                            />
                        </div>

                        <div className="hidden md:block">
                            {(filters.mascota !== 'any' || filters.precioMin || filters.precioMax || filters.comuna || filters.q) && (
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
