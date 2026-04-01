import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Search, MapPin, LayoutGrid } from 'lucide-react';

import { COMUNAS_CHILE } from '../../lib/comunas';

interface SearchBarProps {
    variant?: "hero" | "inline";
}

export default function SearchBar({ variant = "inline" }: SearchBarProps) {
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
        <form
            onSubmit={handleSearch}
            role="search"
            aria-label="Buscar servicios para mascotas"
            className={`
                flex flex-col sm:flex-row items-stretch sm:items-center w-full
                rounded-2xl overflow-hidden shadow-xl
                ${variant === "hero"
                    ? "bg-white border-0 max-w-2xl mx-auto"
                    : "bg-white border border-slate-200"}
            `}
        >
            {/* Campo Categoría */}
            <div className="flex items-center flex-1 px-4 py-3 border-b sm:border-b-0 sm:border-r border-slate-200 gap-3 min-w-0">
                <LayoutGrid className="w-5 h-5 text-slate-400 shrink-0" />
                <select
                    value={categoria}
                    onChange={(e) => { setCategoria(e.target.value); setErrorMsg(""); }}
                    className="flex-1 bg-transparent text-slate-900 text-sm font-medium focus:outline-none cursor-pointer appearance-none min-w-0"
                >
                    <option value="">¿Qué servicio?</option>
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

            {/* Campo Comuna */}
            <div className="flex items-center flex-1 px-4 py-3 gap-3 min-w-0 relative" ref={comunaRef}>
                <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                    type="text"
                    value={comunaQuery}
                    onChange={(e) => { setComunaQuery(e.target.value); setShowComunaList(true); setErrorMsg(""); }}
                    onFocus={() => setShowComunaList(true)}
                    placeholder="¿En qué comuna?"
                    autoComplete="off"
                    className="flex-1 bg-transparent text-slate-900 text-sm font-medium focus:outline-none placeholder:text-slate-400 placeholder:font-normal min-w-0"
                />
                {/* Dropdown comunas — sin cambios */}
                {showComunaList && comunasFiltradas.length > 0 && (
                    <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                        {comunasFiltradas.map(c => (
                            <li key={c}>
                                <button type="button"
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-800 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                    onMouseDown={() => { setComunaQuery(c); setShowComunaList(false); }}
                                >{c}</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Botón buscar */}
            <button
                type="submit"
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 sm:py-2.5 sm:my-1.5 sm:mr-1.5 rounded-xl transition-colors shrink-0 text-sm"
            >
                <Search className="w-5 h-5" />
                <span>Buscar</span>
            </button>
        </form>
    );
}
