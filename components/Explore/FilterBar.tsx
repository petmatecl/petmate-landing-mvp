
import { DateRange } from "react-day-picker";
import DateRangeFilter from "./DateRangeFilter";
import { PawPrint, Home, Car, Ruler } from "lucide-react";

interface FilterBarProps {
    filters: {
        petType: "dogs" | "cats" | "both" | "any";
        serviceType: "all" | "hospedaje" | "a_domicilio";
        dogSize: string | null;
        dateRange: DateRange | undefined;
    };
    onFilterChange: (key: string, value: any) => void;
}

export default function FilterBar({ filters, onFilterChange }: FilterBarProps) {
    return (
        <div className="sticky top-[64px] z-30 w-full bg-white/80 backdrop-blur-md border-b border-slate-300 py-3 mb-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    {/* Filtros Activos */}
                    <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                        {/* Toggle Perros */}
                        <button
                            onClick={() => {
                                // Logic: dogs -> any, cats -> both, both -> cats, any -> dogs
                                if (filters.petType === "dogs") onFilterChange("petType", "any");
                                else if (filters.petType === "cats") onFilterChange("petType", "both");
                                else if (filters.petType === "both") onFilterChange("petType", "cats");
                                else onFilterChange("petType", "dogs");
                            }}
                            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors
                                ${filters.petType === "dogs" || filters.petType === "both"
                                    ? "bg-slate-900 border-slate-900 text-white"
                                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                        >
                            <PawPrint size={16} /> Perros
                        </button>

                        <button
                            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors
                                ${filters.petType === "cats" || filters.petType === "both"
                                    ? "bg-slate-900 border-slate-900 text-white"
                                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                            onClick={() => {
                                // Logic: cats -> any, dogs -> both, both -> dogs, any -> cats
                                if (filters.petType === "cats") onFilterChange("petType", "any");
                                else if (filters.petType === "dogs") onFilterChange("petType", "both");
                                else if (filters.petType === "both") onFilterChange("petType", "dogs");
                                else onFilterChange("petType", "cats");
                            }}
                        >
                            <PawPrint size={16} /> Gatos
                        </button>


                        <div className="bg-slate-200 w-px h-8 mx-1 hidden sm:block"></div>

                        {/* Date Picker */}
                        <DateRangeFilter
                            dateRange={filters.dateRange}
                            onDateRangeChange={(range) => onFilterChange("dateRange", range)}
                        />

                        <div className="bg-slate-200 w-px h-8 mx-1 hidden sm:block"></div>

                        {/* Dropdown/Select Modalidad simplificado como botones */}
                        <button
                            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors
                                ${filters.serviceType === "hospedaje"
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                            onClick={() => onFilterChange("serviceType", filters.serviceType === "hospedaje" ? "all" : "hospedaje")}
                        >
                            <Home size={16} /> En casa del Sitter
                        </button>

                        <button
                            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors
                                ${filters.serviceType === "a_domicilio"
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                            onClick={() => onFilterChange("serviceType", filters.serviceType === "a_domicilio" ? "all" : "a_domicilio")}
                        >
                            <Car size={16} /> A domicilio
                        </button>

                        {(filters.petType === 'dogs' || filters.petType === 'both') && (
                            <>
                                <div className="bg-slate-200 w-px h-8 mx-1 hidden sm:block"></div>
                                <div className="relative">
                                    <select
                                        className={`appearance-none rounded-full border pl-10 pr-4 py-2 text-sm font-bold transition-colors outline-none cursor-pointer
                                        ${filters.dogSize ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}
                                        value={filters.dogSize || ""}
                                        onChange={(e) => onFilterChange("dogSize", e.target.value || null)}
                                    >
                                        <option value="" className="bg-white text-slate-900">Cualquier Tamaño</option>
                                        <option value="Pequeño" className="bg-white text-slate-900">Pequeño (0-10kg)</option>
                                        <option value="Mediano" className="bg-white text-slate-900">Mediano (11-25kg)</option>
                                        <option value="Grande" className="bg-white text-slate-900">Grande (26-45kg)</option>
                                        <option value="Gigante" className="bg-white text-slate-900">Gigante (+45kg)</option>
                                    </select>
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <Ruler size={16} />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="text-xs text-slate-400 font-medium text-right hidden sm:block">
                        {/* Info extra */}
                    </div>
                </div>
            </div>
        </div>
    );
}
