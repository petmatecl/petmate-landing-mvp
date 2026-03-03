import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Search, MapPin, LayoutGrid } from 'lucide-react';
import DatePickerSingle from '../DatePickerSingle';

export default function SearchBar() {
    const router = useRouter();
    const [categoria, setCategoria] = useState('');
    const [comuna, setComuna] = useState('');
    const [fecha, setFecha] = useState<Date | undefined>(undefined);
    const [errorMsg, setErrorMsg] = useState('');

    const requiresDate = ['hospedaje', 'guarderia-diurna', 'visita-domicilio'].includes(categoria);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();

        // Validación: al menos uno de los dos campos debe estar lleno
        if (!categoria && !comuna.trim()) {
            setErrorMsg('Ingresa al menos un servicio o comuna para buscar');
            return;
        }
        setErrorMsg('');

        const query: Record<string, string> = {};
        if (categoria) query.categoria = categoria;
        if (comuna.trim()) query.comuna = comuna.trim();

        router.push({
            pathname: '/explorar',
            query
        });
    };

    return (
        <form onSubmit={handleSearch} className="bg-white p-6 rounded-3xl shadow-md border border-slate-200 flex flex-col gap-4 w-full md:max-w-md ml-auto relative z-10">
            <h3 className="text-xl font-bold text-slate-900 mb-1">Empieza tu búsqueda</h3>

            {/* Campo Servicio — select con LayoutGrid icon */}
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
                    <option value="guarderia-diurna">Guardería diurna</option>
                    <option value="paseo">Paseo</option>
                    <option value="visita-domicilio">Visita a domicilio</option>
                    <option value="peluqueria">Peluquería</option>
                    <option value="adiestramiento">Adiestramiento</option>
                    <option value="veterinaria">Veterinaria</option>
                    <option value="traslado">Traslado</option>
                </select>
            </div>

            {/* Campo Comuna — input con MapPin icon */}
            <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                    type="text"
                    value={comuna}
                    onChange={(e) => { setComuna(e.target.value); setErrorMsg(''); }}
                    placeholder="Ej: Providencia, Las Condes"
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 text-sm focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none placeholder:text-slate-400 transition-all"
                />
            </div>

            {/* Date picker condicional */}
            {requiresDate && (
                <div className="relative w-full">
                    <DatePickerSingle
                        value={fecha}
                        onChange={setFecha}
                    />
                </div>
            )}

            {/* Mensaje de error inline */}
            {errorMsg && (
                <p className="text-sm text-red-500 font-medium -mt-1">{errorMsg}</p>
            )}

            <button
                type="submit"
                className="bg-emerald-700 hover:bg-emerald-800 hover:-translate-y-0.5 hover:shadow-lg text-white w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-2 shadow-sm"
            >
                <Search className="w-5 h-5" />
                Buscar servicios
            </button>
        </form>
    );
}
