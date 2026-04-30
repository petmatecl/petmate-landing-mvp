import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Search, MapPin, LayoutGrid, ChevronDown } from 'lucide-react';

import { COMUNAS_CHILE } from '../../lib/comunas';

const CATEGORIAS = [
    { slug: 'hospedaje', label: 'Hospedaje' },
    { slug: 'guarderia', label: 'Guardería diurna' },
    { slug: 'paseos', label: 'Paseo de perros' },
    { slug: 'domicilio', label: 'Visita a domicilio' },
    { slug: 'peluqueria', label: 'Peluquería' },
    { slug: 'adiestramiento', label: 'Adiestramiento' },
    { slug: 'veterinario', label: 'Veterinaria' },
    { slug: 'traslado', label: 'Traslado' },
    { slug: 'fotografia', label: 'Fotografía de Mascotas' },
];

interface SearchBarProps {
    variant?: "hero" | "inline";
}

export default function SearchBar({ variant = "inline" }: SearchBarProps) {
    const router = useRouter();
    const [categoria, setCategoria] = useState('');
    const [catOpen, setCatOpen] = useState(false);
    const [comunaQuery, setComunaQuery] = useState('');
    const [showComunaList, setShowComunaList] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const catRef = useRef<HTMLDivElement>(null);
    const comunaRef = useRef<HTMLDivElement>(null);

    const comunasFiltradas = (comunaQuery.length === 0
        ? COMUNAS_CHILE
        : COMUNAS_CHILE.filter(c => c.toLowerCase().includes(comunaQuery.toLowerCase()))
    ).slice(0, 8);

    const selectedCatLabel = CATEGORIAS.find(c => c.slug === categoria)?.label;

    useEffect(() => {
        function handleOutside(e: MouseEvent) {
            if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
            if (comunaRef.current && !comunaRef.current.contains(e.target as Node)) setShowComunaList(false);
        }
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();

        // Auto-select first matching comuna if user typed partial text
        let finalComuna = comunaQuery.trim();
        if (finalComuna && !COMUNAS_CHILE.includes(finalComuna)) {
            const match = COMUNAS_CHILE.find(c =>
                c.toLowerCase().startsWith(finalComuna.toLowerCase())
            );
            if (match) {
                finalComuna = match;
                setComunaQuery(match);
            }
        }

        if (!categoria && !finalComuna) {
            setErrorMsg('Ingresa al menos un servicio o comuna para buscar');
            return;
        }
        setErrorMsg('');
        setShowComunaList(false);
        const query: Record<string, string> = {};
        if (categoria) query.categoria = categoria;
        if (finalComuna) query.comuna = finalComuna;
        router.push({ pathname: '/explorar', query });
    };

    return (
        <form
            onSubmit={handleSearch}
            role="search"
            aria-label="Buscar servicios para mascotas"
            className={`
                flex flex-col sm:flex-row items-stretch sm:items-center w-full
                rounded-2xl overflow-visible shadow-xl
                ${variant === "hero"
                    ? "bg-white border-0 max-w-2xl mx-auto"
                    : "bg-white border border-slate-200"}
            `}
        >
            {/* Campo Categoría — custom dropdown */}
            <div ref={catRef} className="relative flex items-center flex-1 px-4 py-3 border-b sm:border-b-0 sm:border-r border-slate-200 gap-3 min-w-0">
                <LayoutGrid className="w-5 h-5 text-slate-400 shrink-0" />
                <button
                    type="button"
                    onClick={() => { setCatOpen(!catOpen); setShowComunaList(false); }}
                    className="flex-1 flex items-center justify-between bg-transparent text-sm font-medium focus:outline-none cursor-pointer min-w-0"
                >
                    <span className={selectedCatLabel ? 'text-slate-900' : 'text-slate-400'}>
                        {selectedCatLabel || '¿Qué servicio?'}
                    </span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ml-1 ${catOpen ? 'rotate-180' : ''}`} />
                </button>

                {catOpen && (
                    <ul className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto py-1">
                        <li>
                            <button type="button"
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${!categoria ? 'text-emerald-700 font-semibold bg-emerald-50' : 'text-slate-600 hover:bg-slate-50'}`}
                                onMouseDown={() => { setCategoria(''); setCatOpen(false); setErrorMsg(''); }}
                            >
                                Todos los servicios
                            </button>
                        </li>
                        {CATEGORIAS.map(c => (
                            <li key={c.slug}>
                                <button type="button"
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${categoria === c.slug ? 'text-emerald-700 font-semibold bg-emerald-50' : 'text-slate-700 hover:bg-slate-50'}`}
                                    onMouseDown={() => { setCategoria(c.slug); setCatOpen(false); setErrorMsg(''); }}
                                >
                                    {c.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Campo Comuna */}
            <div ref={comunaRef} className="relative flex items-center flex-1 px-4 py-3 gap-3 min-w-0">
                <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                    type="text"
                    value={comunaQuery}
                    onChange={(e) => { setComunaQuery(e.target.value); setShowComunaList(true); setCatOpen(false); setErrorMsg(""); }}
                    onFocus={() => { setShowComunaList(true); setCatOpen(false); }}
                    placeholder="¿En qué comuna?"
                    autoComplete="off"
                    className="flex-1 bg-transparent text-slate-900 text-sm font-medium focus:outline-none placeholder:text-slate-400 placeholder:font-normal min-w-0"
                />
                {showComunaList && comunasFiltradas.length > 0 && (
                    <ul className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto py-1">
                        {comunasFiltradas.map(c => (
                            <li key={c}>
                                <button type="button"
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
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
                className="flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-3 sm:py-2.5 sm:my-1.5 sm:mr-1.5 rounded-xl transition-colors shrink-0 text-sm"
            >
                <Search className="w-5 h-5" />
                <span>Buscar</span>
            </button>
        </form>
    );
}
