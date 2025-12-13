
interface FilterBarProps {
    filters: {
        petType: "dogs" | "cats" | "both" | "any";
        serviceType: "all" | "en_casa_petmate" | "a_domicilio";
    };
    onFilterChange: (key: string, value: any) => void;
}

export default function FilterBar({ filters, onFilterChange }: FilterBarProps) {
    return (
        <div className="sticky top-[64px] z-30 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 py-3 mb-6">
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
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                        >
                            🐶 Perros
                        </button>

                        <button
                            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors
                                ${filters.petType === "cats" || filters.petType === "both"
                                    ? "bg-slate-900 border-slate-900 text-white"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                            onClick={() => {
                                // Logic: cats -> any, dogs -> both, both -> dogs, any -> cats
                                if (filters.petType === "cats") onFilterChange("petType", "any");
                                else if (filters.petType === "dogs") onFilterChange("petType", "both");
                                else if (filters.petType === "both") onFilterChange("petType", "dogs");
                                else onFilterChange("petType", "cats");
                            }}
                        >
                            🐱 Gatos
                        </button>

                        <div className="bg-slate-200 w-px h-8 mx-1 hidden sm:block"></div>

                        {/* Dropdown/Select Modalidad simplificado como botones */}
                        <button
                            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors
                                ${filters.serviceType === "en_casa_petmate"
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                            onClick={() => onFilterChange("serviceType", filters.serviceType === "en_casa_petmate" ? "all" : "en_casa_petmate")}
                        >
                            🏠 En casa del Sitter
                        </button>

                        <button
                            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors
                                ${filters.serviceType === "a_domicilio"
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                            onClick={() => onFilterChange("serviceType", filters.serviceType === "a_domicilio" ? "all" : "a_domicilio")}
                        >
                            🚗 A domicilio
                        </button>
                    </div>

                    <div className="text-xs text-slate-400 font-medium text-right hidden sm:block">
                        {/* Info extra */}
                    </div>
                </div>
            </div>
        </div>
    );
}
