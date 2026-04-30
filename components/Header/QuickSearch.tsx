import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import { Search } from 'lucide-react';

export default function QuickSearch() {
    const [query, setQuery] = useState('');
    const [isOpenMobile, setIsOpenMobile] = useState(false);
    const [scrolledPastHero, setScrolledPastHero] = useState(false);
    const router = useRouter();

    const isHome = router.pathname === '/';

    useEffect(() => {
        if (!isHome) return;
        const onScroll = () => setScrolledPastHero(window.scrollY > 500);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [isHome]);

    if (router.pathname === '/explorar') return null;
    if (isHome && !scrolledPastHero) return null;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const trimmed = query.trim();
        if (trimmed) {
            router.push(`/explorar?q=${encodeURIComponent(trimmed)}`);
            setIsOpenMobile(false);
        }
    };

    return (
        <>
            {/* Desktop View */}
            <div className="hidden sm:flex items-center w-full max-w-xs mx-4">
                <form onSubmit={handleSubmit} className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Busca por servicio o nombre del proveedor..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 block pl-9 p-2 transition-colors placeholder-slate-400 cursor-text outline-none"
                    />
                </form>
            </div>

            {/* Mobile View Toggle */}
            <div className="sm:hidden flex items-center mr-2">
                <button
                    onClick={() => setIsOpenMobile(!isOpenMobile)}
                    className="p-2 text-slate-500 hover:text-emerald-700 focus:outline-none rounded-full focus:bg-slate-100"
                    aria-label="Buscar"
                    aria-expanded={isOpenMobile}
                    aria-controls="quick-search-mobile-panel"
                >
                    <Search size={20} />
                </button>
            </div>

            {/* Mobile Unfolded View */}
            {isOpenMobile && (
                <div id="quick-search-mobile-panel" role="region" aria-label="Buscador de servicios" className="absolute top-16 left-0 w-full bg-white border-b border-slate-200 px-4 py-3 sm:hidden z-50 animate-in slide-in-from-top-2">
                    <form onSubmit={handleSubmit} className="relative w-full flex">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={16} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Busca por servicio o nombre del proveedor..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            // eslint-disable-next-line jsx-a11y/no-autofocus
                            autoFocus
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 block pl-9 p-2.5 transition-colors placeholder-slate-400 outline-none"
                        />
                        <button type="button" onClick={() => setIsOpenMobile(false)} className="ml-3 text-slate-500 font-medium text-sm hover:text-slate-800">
                            Cancelar
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}
