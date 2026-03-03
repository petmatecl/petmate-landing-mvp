import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Search, MapPin, LayoutGrid, Calendar } from 'lucide-react';

const COMUNAS_CHILE = [
    'Alhué', 'Buin', 'Calera de Tango', 'Cerrillos', 'Cerro Navia', 'Colina',
    'Conchalí', 'Curacaví', 'El Bosque', 'El Monte', 'Estación Central',
    'Huechuraba', 'Independencia', 'Isla de Maipo', 'La Cisterna', 'La Florida',
    'La Granja', 'La Pintana', 'La Reina', 'Lampa', 'Las Condes', 'Lo Barnechea',
    'Lo Espejo', 'Lo Prado', 'Lo Barnechea', 'Macul', 'Maipú', 'María Pinto',
    'Melipilla', 'Ñuñoa', 'Padre Hurtado', 'Paine', 'Pedro Aguirre Cerda',
    'Peñaflor', 'Peñalolén', 'Pirque', 'Providencia', 'Pudahuel', 'Puente Alto',
    'Quilicura', 'Quinta Normal', 'Recoleta', 'Renca', 'San Bernardo',
    'San Joaquín', 'San José de Maipo', 'San Miguel', 'San Pedro', 'San Ramón',
    'Santiago', 'Talagante', 'Tiltil', 'Vitacura',
    // Otras regiones
    'Antofagasta', 'Arica', 'Concepción', 'Coquimbo', 'Iquique', 'La Serena',
    'Osorno', 'Puerto Montt', 'Punta Arenas', 'Rancagua', 'Talca', 'Temuco',
    'Valdivia', 'Valparaíso', 'Viña del Mar',
];

export default function SearchBar() {
    const router = useRouter();
    const [categoria, setCategoria] = useState('');
    const [comunaQuery, setComunaQuery] = useState('');
    const [fecha, setFecha] = useState('');
    const [showComunaList, setShowComunaList] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const comunaRef = useRef<HTMLDivElement>(null);

    const comunasFiltradas = COMUNAS_CHILE.filter(c =>
        c.toLowerCase().includes(comunaQuery.toLowerCase())
    ).slice(0, 6);

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
        if (fecha) query.fecha = fecha;
        router.push({ pathname: '/explorar', query });
    };

    return (
        <form onSubmit={handleSearch} className="bg-white p-6 rounded-3xl shadow-md border border-slate-200 flex flex-col gap-4 w-full md:max-w-md ml-auto relative z-10">
            <h3 className="text-xl font-bold text-slate-900 mb-1">Empieza tu búsqueda</h3>

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
                    <option value="guarderia-diurna">Guardería diurna</option>
                    <option value="paseo">Paseo</option>
                    <option value="visita-domicilio">Visita a domicilio</option>
                    <option value="peluqueria">Peluquería</option>
                    <option value="adiestramiento">Adiestramiento</option>
                    <option value="veterinaria">Veterinaria</option>
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
                {showComunaList && comunaQuery.length > 0 && comunasFiltradas.length > 0 && (
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

            {/* Campo Fecha (opcional) */}
            <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none z-10" />
                <input
                    type="date"
                    value={fecha}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 text-sm focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition-all"
                />
                {!fecha && (
                    <span className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                        Fecha de inicio (opcional)
                    </span>
                )}
            </div>

            {/* Error inline */}
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
