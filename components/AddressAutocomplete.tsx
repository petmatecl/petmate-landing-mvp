import { useState, useEffect, useRef } from "react";

type AddressResult = {
    display_name: string;
    lat: string;
    lon: string;
    address: {
        road?: string;
        pedestrian?: string;
        street?: string;
        house_number?: string;
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        state?: string;
        country?: string;
    };
};

type Props = {
    onSelect: (result: AddressResult) => void;
    initialValue?: string;
    placeholder?: string;
    className?: string;
};

export default function AddressAutocomplete({ onSelect, initialValue = "", placeholder = "Buscar dirección...", className = "" }: Props) {
    const [query, setQuery] = useState(initialValue);
    const [results, setResults] = useState<AddressResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // Debounce ref
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Click outside ref
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const searchAddress = async (searchTerm: string) => {
        if (!searchTerm || searchTerm.length < 3) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchTerm + " Chile")}&format=json&addressdetails=1&limit=5&countrycodes=cl`);
            const data = await response.json();
            setResults(data);
            setIsOpen(true);
        } catch (error) {
            console.error("Error fetching address:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            searchAddress(val);
        }, 500); // 500ms debounce
    };

    const handleSelect = (r: AddressResult) => {
        // Update input with just the main name to keep it clean, or full address
        let mainName = r.display_name.split(',')[0];

        // Improve display for addresses (Street + Number)
        const road = r.address?.road || r.address?.pedestrian || r.address?.street;
        const number = r.address?.house_number;

        if (road) {
            mainName = `${road} ${number || ''}`.trim();
        }

        setQuery(mainName);
        setIsOpen(false);
        onSelect(r);
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className="relative">
                <input
                    type="text"
                    className="w-full text-sm rounded-lg px-3 py-2 border-2 border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all pl-9"
                    placeholder={placeholder}
                    value={query}
                    onChange={handleInput}
                    onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                />
                {/* Search Icon */}
                <span className="absolute left-3 top-2.5 text-slate-400">
                    {loading ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    )}
                </span>
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl shadow-xl border-2 border-slate-300 max-h-60 overflow-y-auto">
                    {results.map((result, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelect(result)}
                            className="w-full text-left px-4 py-3 text-xs hover:bg-emerald-50 border-b border-slate-50 last:border-0 flex flex-col gap-0.5 group"
                        >
                            <span className="font-bold text-slate-800 block truncate group-hover:text-emerald-700">
                                {result.display_name.split(',')[0]}
                            </span>
                            <span className="text-slate-500 block truncate text-[10px]">
                                {result.display_name}
                            </span>
                        </button>
                    ))}
                    <div className="bg-slate-50 px-2 py-1 text-[10px] text-slate-400 text-right">
                        Powered by OpenStreetMap
                    </div>
                </div>
            )}
        </div>
    );
}
