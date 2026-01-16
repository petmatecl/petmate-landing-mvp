import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format, startOfDay, addYears, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "../../lib/supabaseClient";
import { Save, Loader2, Calendar as CalendarIcon } from "lucide-react";

// CSS Imported globally in _app.tsx now

interface Props {
    sitterId: string;
    onSaveSuccess?: () => void;
}

export default function AvailabilityCalendar({ sitterId, onSaveSuccess }: Props) {
    // State management
    const [selectedDays, setSelectedDays] = useState<Date[]>([]);
    const [month, setMonth] = useState<Date>(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Initial Load
    useEffect(() => {
        if (sitterId) {
            loadAvailability();
        }
    }, [sitterId]);

    const loadAvailability = async () => {
        setIsLoading(true);
        // Load a wide range (Current Date to Next Year)
        const start = startOfDay(new Date());
        const end = addYears(start, 1);

        try {
            const { data, error } = await supabase
                .from("sitter_availability")
                .select("available_date")
                .eq("sitter_id", sitterId)
                .gte("available_date", format(start, "yyyy-MM-dd"))
                .lte("available_date", format(end, "yyyy-MM-dd"));

            if (error) throw error;

            if (data) {
                const safeDates = data.map(item => {
                    const [y, m, d] = item.available_date.split('-');
                    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                });
                setSelectedDays(safeDates);
            }
        } catch (err) {
            console.error("Error loading dates:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);

        // Global Save: We overwrite the availability for the entire upcoming year
        // based on the current selection. This ensures persistence across month navigation.
        const start = startOfDay(new Date());
        const end = addYears(start, 1);

        const startStr = format(start, "yyyy-MM-dd");
        const endStr = format(end, "yyyy-MM-dd");

        try {
            // 1. Clear existing availability for the entire range
            const { error: deleteError } = await supabase
                .from("sitter_availability")
                .delete()
                .eq("sitter_id", sitterId)
                .gte("available_date", startStr)
                .lte("available_date", endStr);

            if (deleteError) throw deleteError;

            // 2. Prepare new rows from selectedDays that fall within the range
            const daysToSave = selectedDays.filter(day =>
                day >= start && day <= end
            );

            if (daysToSave.length > 0) {
                const rows = daysToSave.map(day => ({
                    sitter_id: sitterId,
                    available_date: format(day, "yyyy-MM-dd")
                }));

                const { error: insertError } = await supabase
                    .from("sitter_availability")
                    .insert(rows);

                if (insertError) throw insertError;
            }

            setMessage({ type: 'success', text: 'Calendario actualizado correctamente.' });
            if (onSaveSuccess) onSaveSuccess();
            setTimeout(() => setMessage(null), 3000);

        } catch (err: any) {
            console.error(err);
            setMessage({ type: 'error', text: 'Error al guardar.' });
            alert(`Error detallado: ${err.message || JSON.stringify(err)}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Helper: Select Entire Current View (Both months if visible) - Simplified to just add next 30 days for utility
    const handleSelectNext30Days = () => {
        const today = new Date();
        const next30 = Array.from({ length: 30 }, (_, i) => {
            const d = new Date();
            d.setDate(today.getDate() + i);
            d.setHours(0, 0, 0, 0); // normalize
            return d;
        });

        // Add to selection
        const newDays = [...selectedDays];
        next30.forEach(day => {
            if (!selectedDays.some(s => isSameDay(s, day))) {
                newDays.push(day);
            }
        });
        setSelectedDays(newDays);
    };

    return (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm w-full">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <CalendarIcon className="text-emerald-600" /> Disponibilidad
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Marca tus días disponibles para aceptar servicios. Se guardarán todos los cambios.
                    </p>
                </div>

                {/* Save Button */}
                <div className="flex flex-col items-end">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white transition-all
                        ${isSaving ? 'bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        {isSaving ? "Guardando..." : "Guardar"}
                    </button>
                    {message && (
                        <span className={`text-xs font-bold mt-2 ${message.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {message.text}
                        </span>
                    )}
                </div>
            </div>

            {/* Calendar Area */}
            <div className="flex justify-center border border-slate-200 rounded-xl p-6 bg-slate-50/50 mb-6">
                <DayPicker
                    mode="multiple"
                    selected={selectedDays}
                    onSelect={(days) => setSelectedDays(days || [])}
                    // UX: Show 2 months
                    numberOfMonths={2}
                    pagedNavigation
                    month={month}
                    onMonthChange={setMonth}
                    locale={es}
                    modifiersStyles={{
                        selected: {
                            backgroundColor: '#10b981', // emerald-500
                            color: 'white',
                            borderRadius: '50%',
                            fontWeight: 'bold'
                        }
                    }}
                    styles={{
                        head_cell: { color: "#64748b" },
                        day: { borderRadius: "9999px" },
                        caption: { color: "#0f172a", fontWeight: "bold" }
                    }}
                />
            </div>

            {/* Footer / Helpers */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center border-t border-slate-100 pt-4">

                {/* Legend */}
                <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-medium text-emerald-900">Días Habilitados (Visibles para clientes)</span>
                </div>

                {/* Actions */}
                <button
                    onClick={handleSelectNext30Days}
                    className="text-sm font-bold text-slate-600 hover:text-slate-900 hover:underline"
                >
                    Marcar próximos 30 días
                </button>
            </div>
        </div>
    );
}
