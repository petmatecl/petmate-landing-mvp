import React, { useRef, useEffect, useState } from 'react';

interface Category {
    id: number;
    slug: string;
    nombre: string;
    icono: string;
}

interface Props {
    categories: Category[];
    selectedCategory: string | null;
    onSelect: (slug: string | null) => void;
}

export default function CategoryChips({ categories, selectedCategory, onSelect }: Props) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);

    // Funciones para manejar el scroll y las flechas indicadoras (opcional pero de buena UI)
    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setShowLeftArrow(scrollLeft > 0);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
        }
    };

    useEffect(() => {
        handleScroll();
        window.addEventListener('resize', handleScroll);
        return () => window.removeEventListener('resize', handleScroll);
    }, [categories]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 200;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="relative w-full border-b border-slate-200 bg-white">
            {/* Flecha Izquierda */}
            {showLeftArrow && (
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-white via-white to-transparent flex items-center justify-start pl-2"
                    aria-label="Scroll left"
                >
                    <div className="w-8 h-8 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-slate-600 hover:text-emerald-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </div>
                </button>
            )}

            {/* Contenedor Scrolleable */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex gap-3 overflow-x-auto scrollbar-hide py-4 px-4 scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                <button
                    onClick={() => onSelect(null)}
                    className={`
            flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all font-medium whitespace-nowrap
            ${!selectedCategory
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-slate-50'}
          `}
                >
                    Todos los servicios
                </button>

                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => onSelect(cat.slug)}
                        className={`
              flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all font-medium whitespace-nowrap
              ${selectedCategory === cat.slug
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-slate-50'}
            `}
                    >
                        {cat.nombre}
                    </button>
                ))}
            </div>

            {/* Flecha Derecha */}
            {showRightArrow && (
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-white via-white to-transparent flex items-center justify-end pr-2"
                    aria-label="Scroll right"
                >
                    <div className="w-8 h-8 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-slate-600 hover:text-emerald-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                </button>
            )}
        </div>
    );
}
