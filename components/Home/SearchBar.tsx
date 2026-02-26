import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Search, MapPin, LayoutGrid } from 'lucide-react';
import DatePickerSingle from '../DatePickerSingle';

export default function SearchBar() {
    const router = useRouter();
    const [categoria, setCategoria] = useState('');
    const [comuna, setComuna] = useState('');
    const [fecha, setFecha] = useState<Date | undefined>(undefined);

    const requiresDate = ['hospedaje', 'guarderia-diurna', 'visita-domicilio'].includes(categoria);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const query: Record<string, string> = {};
        if (categoria) query.categoria = categoria;
        if (comuna) query.comuna = comuna;

        router.push({
            pathname: '/explorar',
            query
        });
    };

    return (
        <form onSubmit={handleSearch} className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 flex flex-col gap-4 w-full md:max-w-md ml-auto relative z-10">
            <h3 className="text-xl font-black text-slate-900 mb-1">Empieza tu búsqueda</h3>
            <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <LayoutGrid className="w-5 h-5 text-slate-400" />
                </div>
                <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none cursor-pointer transition-colors"
                >
                    <option value="" disabled>¿Qué servicio buscas?</option>
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

            <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <MapPin className="w-5 h-5 text-slate-400" />
                </div>
                <input
                    type="text"
                    value={comuna}
                    onChange={(e) => setComuna(e.target.value)}
                    placeholder="¿En qué comuna?"
                    className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-400 transition-colors"
                />
            </div>

            {requiresDate && (
                <div className="relative w-full">
                    <DatePickerSingle
                        value={fecha}
                        onChange={setFecha}
                    />
                </div>
            )}

            <button
                type="submit"
                className="bg-emerald-700 hover:bg-emerald-800 text-white w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors mt-2"
            >
                <Search className="w-5 h-5" />
                Buscar servicios
            </button>
        </form>
    );
}
