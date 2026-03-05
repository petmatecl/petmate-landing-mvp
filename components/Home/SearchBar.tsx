import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Search, MapPin, LayoutGrid } from 'lucide-react';

import { COMUNAS_CHILE } from '../../lib/comunas';

export default function SearchBar() {
    const router = useRouter();
    const [categoria, setCategoria] = useState('');
    const [comunaQuery, setComunaQuery] = useState('');
    const [showComunaList, setShowComunaList] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const comunaRef = useRef<HTMLDivElement>(null);

    // Muestra hasta 8 comunas filtradas; si no hay texto muestra las primeras 8
    const comunasFiltradas = (comunaQuery.length === 0
        ? COMUNAS_CHILE
        : COMUNAS_CHILE.filter(c => c.toLowerCase().includes(comunaQuery.toLowerCase()))
    ).slice(0, 8);

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        function handleOutside(e: MouseEvent) {
            if (comunaRef.current && !comunaRef.current.contains(e.target as Node)) {
                setShowComunaList(false);
            }
        }
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoria && !comunaQuery.trim()) {
            setErrorMsg('Ingresa al menos un servicio o comuna para buscar');
            return;
        }
        setErrorMsg('');
        const query: Record<string, string> = {};
        if (categoria) query.categoria = categoria;
        if (comunaQuery.trim()) query.comuna = comunaQuery.trim();
        router.push({ pathname: '/explorar', query });
    };

    return (
        <form onSubmit={handleSearch} role="search" aria-label="Buscar servicios para mascotas" className="bg-white p-6 rounded-3xl shadow-md border border-slate-200 flex flex-col gap-4 w-full md:max-w-md md:ml-auto relative z-10">
            <h3 className="text-xl font-semibold text-slate-900 mb-1">Empieza tu busqueda</h3>

            {/* Campo Servicio — select */}
            <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <LayoutGrid className="w-5 h-5 text-slate-400" />
                </div>
                <select
                    value={categoria}
                    onChange={(e) => { setCategoria(e.target.value); setErrorMsg(''); }}
                    className="w-full h-12 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 appearance-none cursor-pointer transition-all"
                >
                    <option value="">Ejemplo: Paseo, Guardería, Veterinario</option>
                    <option value="hospedaje">Hospedaje</option>
                    <option value="guarderia">Guardería diurna</option>
                    <option value="paseos">Paseo</option>
                    <option value="domicilio">Visita a domicilio</option>
                    <option value="peluqueria">Peluquería</option>
                    <option value="adiestramiento">Adiestramiento</option>
                    <option value="veterinario">Veterinaria</option>
                    <option value="traslado">Traslado</option>
                </select>
            </div>

            {/* Campo Comuna — combobox filtrable */}
            <div className="relative" ref={comunaRef}>
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none z-10" />
                <input
                    type="text"
                    value={comunaQuery}
                    onChange={(e) => { setComunaQuery(e.target.value); setShowComunaList(true); setErrorMsg(''); }}
                    onFocus={() => setShowComunaList(true)}
                    placeholder="Ej: Providencia, Las Condes"
                    autoComplete="off"
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 text-sm focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none placeholder:text-slate-400 transition-all"
                />
                {showComunaList && comunasFiltradas.length > 0 && (
                    <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                        {comunasFiltradas.map(c => (
                            <li key={c}>
                                <button
                                    type="button"
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-800 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                    onMouseDown={() => { setComunaQuery(c); setShowComunaList(false); }}
                                >
                                    {c}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Error inline */}
            {errorMsg && (
                <p role="alert" aria-live="polite" className="text-sm text-red-500 font-medium -mt-1">{errorMsg}</p>
            )}

            <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5 hover:shadow-md text-white w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all mt-2"
            >
                <Search className="w-5 h-5" />
                Buscar servicios
            </button>
        </form>
    );
}
