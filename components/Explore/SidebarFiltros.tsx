import React, { useState, useRef, useEffect } from 'react';
import {
    Check, Crosshair, Loader2, Search,
    Home, Sun, PawPrint, Scissors, Truck, Stethoscope, Dumbbell, MapPin, Grid2x2,
    Dog, Cat, Bird,
    LucideIcon
} from 'lucide-react';
import { COMUNAS_CHILE } from '../../lib/comunas';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
    id: string;
    slug: string;
    nombre: string;
    icono: string;
}

interface FiltersState {
    q: string;
    categorias: string[];
    comuna: string;
    mascota: 'perro' | 'gato' | 'otro' | 'any';
    tamano: 'pequeno' | 'mediano' | 'grande' | null;
    precioMin: string;
    precioMax: string;
}

interface Props {
    filters: FiltersState;
    categories: Category[];
    onFilterChange: (f: Partial<FiltersState>) => void;
    onClear: () => void;
    /** When true, wraps content in white card (desktop sidebar). False = bare (mobile drawer). */
    card?: boolean;
    /** Count of services per category slug from current results (calculated client-side) */
    categoryCounts?: Record<string, number>;
}

// ─── Icon mapping (matches CategoryChips.tsx) ─────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function SidebarFiltros({ filters, categories, onFilterChange, onClear, card = true, categoryCounts = {} }: Props) {
    const [geoLoading, setGeoLoading] = useState(false);
    const [comunaOpen, setComunaOpen] = useState(false);
    const [comunaInput, setComunaInput] = useState(filters.comuna);
    const comunaRef = useRef<HTMLDivElement>(null);

    // Sync comunaInput if filter is cleared externally (e.g. "Limpiar todo")
    useEffect(() => {
        setComunaInput(filters.comuna);
    }, [filters.comuna]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (comunaRef.current && !comunaRef.current.contains(e.target as Node)) {
                setComunaOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const comunasFiltradas = COMUNAS_CHILE.filter(c =>
        comunaInput ? c.toLowerCase().includes(comunaInput.toLowerCase()) : true
    ).slice(0, 40);

    const hasActiveFilters =
        filters.categorias.length > 0 ||
        filters.mascota !== 'any' ||
        !!filters.precioMin ||
        !!filters.precioMax ||
        !!filters.q ||
        !!filters.comuna;

    const handleGeolocate = () => {
        if (!navigator.geolocation) return;
        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const { latitude, longitude } = pos.coords;
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=es`
                    );
                    const data = await res.json();
                    const commune =
                        data.address?.city ||
                        data.address?.town ||
                        data.address?.village ||
                        data.address?.municipality;
                    if (commune) onFilterChange({ comuna: commune });
                } catch {
                    // silent fail
                } finally {
                    setGeoLoading(false);
                }
            },
            () => setGeoLoading(false),
            { timeout: 8000 }
        );
    };

    const toggleCategoria = (slug: string) => {
        if (filters.categorias.includes(slug)) {
            onFilterChange({ categorias: filters.categorias.filter(s => s !== slug) });
        } else {
            onFilterChange({ categorias: [...filters.categorias, slug] });
        }
    };

    const inner = (
        <div>
            {/* ── 1. Header ── */}
            <div className="flex items-center justify-between mb-5">
                <span className="text-base font-bold text-slate-900" aria-hidden="true">Filtros</span>
                {hasActiveFilters && (
                    <button
                        onClick={onClear}
                        className="text-xs text-rose-500 font-semibold hover:underline transition-colors"
                    >
                        Limpiar todo
                    </button>
                )}
            </div>

            {/* ── 2. Búsqueda ── */}
            <div className="mb-5">
                <label htmlFor="sidebar-search" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Buscar
                </label>
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        id="sidebar-search"
                        name="q"
                        type="text"
                        value={filters.q}
                        onChange={(e) => onFilterChange({ q: e.target.value })}
                        placeholder="Servicio o nombre del proveedor..."
                        className="w-full h-10 pl-9 pr-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm
                                   focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white
                                   placeholder:text-slate-400 transition-colors"
                    />
                </div>
            </div>

            {/* ── 3. Categorías ── */}
            <div className="mb-5 border-t border-slate-100 pt-5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Categoría
                </label>

                {/* "Todas" */}
                <button
                    type="button"
                    onClick={() => onFilterChange({ categorias: [] })}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors mb-1 ${filters.categorias.length === 0
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                        }`}
                >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${filters.categorias.length === 0 ? 'bg-emerald-700 border-emerald-600' : 'border-slate-300'
                        }`}>
                        {filters.categorias.length === 0 && <Check size={10} strokeWidth={3} className="text-white" />}
                    </div>
                    <Grid2x2 size={14} className={filters.categorias.length === 0 ? 'text-emerald-700' : 'text-slate-400'} />
                    <span>Todas las categorías</span>
                </button>

                {/* Per-category rows */}
                <div className="space-y-0.5">
                    {categories.map(cat => {
                        const checked = filters.categorias.includes(cat.slug);
                        const CatIcon = SLUG_ICONS[cat.slug] ?? Grid2x2;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => toggleCategoria(cat.slug)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${checked
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                                    }`}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-emerald-700 border-emerald-600' : 'border-slate-300'
                                    }`}>
                                    {checked && <Check size={10} strokeWidth={3} className="text-white" />}
                                </div>
                                <CatIcon size={14} className={checked ? 'text-emerald-700' : 'text-slate-400'} />
                                <span className="text-left flex-1 truncate">{cat.nombre}</span>
                                {(categoryCounts[cat.slug] ?? 0) > 0 && (
                                    <span className="text-xs text-slate-400 font-normal tabular-nums ml-auto">
                                        {categoryCounts[cat.slug]}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── 4. Comuna ── */}
            <div className="mb-5 border-t border-slate-100 pt-5">
                <label htmlFor="sidebar-comuna" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Comuna
                </label>
                <div className="relative" ref={comunaRef}>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </span>
                    <input
                        id="sidebar-comuna"
                        name="comuna"
                        role="combobox"
                        aria-expanded={comunaOpen}
                        aria-controls="sidebar-comuna-listbox"
                        aria-autocomplete="list"
                        aria-haspopup="listbox"
                        type="text"
                        value={comunaInput}
                        onChange={e => {
                            setComunaInput(e.target.value); // solo actualiza texto visible
                            setComunaOpen(true);            // abre el dropdown
                            // NO llama a onFilterChange aquí
                        }}
                        onFocus={() => setComunaOpen(true)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                                e.preventDefault();
                                const trimmed = comunaInput.trim();
                                if (!trimmed) {
                                    onFilterChange({ comuna: '' });
                                } else {
                                    // Auto-match first comuna
                                    const match = comunasFiltradas[0];
                                    if (match) {
                                        setComunaInput(match);
                                        onFilterChange({ comuna: match });
                                    }
                                }
                                setComunaOpen(false);
                            }
                            if (e.key === 'Escape') {
                                setComunaInput(filters.comuna);
                                setComunaOpen(false);
                            }
                        }}
                        onBlur={() => {
                            setTimeout(() => {
                                // Auto-match on blur too
                                const trimmed = comunaInput.trim();
                                if (trimmed && trimmed !== filters.comuna) {
                                    const match = COMUNAS_CHILE.find(c => c.toLowerCase().startsWith(trimmed.toLowerCase()));
                                    if (match) {
                                        setComunaInput(match);
                                        onFilterChange({ comuna: match });
                                    } else {
                                        setComunaInput(filters.comuna);
                                    }
                                } else if (!trimmed && filters.comuna) {
                                    onFilterChange({ comuna: '' });
                                }
                                setComunaOpen(false);
                            }, 200);
                        }}
                        placeholder="¿En qué comuna?"
                        autoComplete="off"
                        className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-400 transition-colors"
                    />
                    {comunaOpen && comunasFiltradas.length > 0 && (
                        <ul id="sidebar-comuna-listbox" role="listbox" aria-label="Sugerencias de comuna" className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                            {comunasFiltradas.map(c => (
                                <li key={c}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={false}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                        onMouseDown={() => { onFilterChange({ comuna: c }); setComunaOpen(false); }}
                                    >
                                        {c}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* ── 5. Tipo de mascota ── */}
            <div className="mb-5 border-t border-slate-100 pt-5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Tipo de mascota
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                    {([
                        { id: 'any', label: 'Cualquiera', Icon: PawPrint },
                        { id: 'perro', label: 'Perros', Icon: Dog },
                        { id: 'gato', label: 'Gatos', Icon: Cat },
                        { id: 'otro', label: 'Otro', Icon: Bird },
                    ] as const).map(opt => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => onFilterChange({ mascota: opt.id as any, tamano: null })}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${filters.mascota === opt.id
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-200 hover:bg-white'
                                }`}
                        >
                            <opt.Icon size={14} className={filters.mascota === opt.id ? 'text-emerald-700' : 'text-slate-400'} />
                            <span>{opt.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tamaño (solo perros) */}
                {filters.mascota === 'perro' && (
                    <div className="mt-3">
                        <p className="text-xs text-slate-500 font-medium mb-2">Tamaño</p>
                        <div className="flex gap-1.5">
                            {(['pequeno', 'mediano', 'grande'] as const).map(size => (
                                <button
                                    key={size}
                                    type="button"
                                    onClick={() => onFilterChange({ tamano: size })}
                                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${filters.tamano === size
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-200'
                                        }`}
                                >
                                    {size === 'pequeno' ? 'Pequeño' : size.charAt(0).toUpperCase() + size.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── 6. Precio ── */}
            <div className="border-t border-slate-100 pt-5">
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Precio (CLP)
                </span>
                <div className="flex items-center gap-2">
                    <input
                        id="sidebar-precio-min"
                        name="precio-min"
                        aria-label="Precio mínimo"
                        type="text"
                        inputMode="numeric"
                        value={filters.precioMin ? Number(filters.precioMin).toLocaleString('es-CL') : ''}
                        onChange={e => {
                            const raw = e.target.value.replace(/\D/g, '');
                            onFilterChange({ precioMin: raw });
                        }}
                        placeholder="Mín"
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm text-slate-900 bg-slate-50
                                   placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600
                                   focus:border-emerald-600 focus:bg-white transition-colors"
                    />
                    <span className="text-slate-400 text-sm font-medium select-none shrink-0">a</span>
                    <input
                        id="sidebar-precio-max"
                        name="precio-max"
                        aria-label="Precio máximo"
                        type="text"
                        inputMode="numeric"
                        value={filters.precioMax ? Number(filters.precioMax).toLocaleString('es-CL') : ''}
                        onChange={e => {
                            const raw = e.target.value.replace(/\D/g, '');
                            onFilterChange({ precioMax: raw });
                        }}
                        placeholder="Máx"
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm text-slate-900 bg-slate-50
                                   placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600
                                   focus:border-emerald-600 focus:bg-white transition-colors"
                    />
                </div>
            </div>
        </div>
    );

    if (!card) return inner;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            {inner}
        </div>
    );
}
