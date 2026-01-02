import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "../../lib/supabaseClient";
import { Save, CheckCircle2, Loader2, Calendar as CalendarIcon, ShieldAlert } from "lucide-react";

// CSS Imported globally in _app.tsx now

interface Props {
    sitterId: string;
}

export default function AvailabilityCalendar({ sitterId }: Props) {
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
    }, [sitterId, month]);

    const loadAvailability = async () => {
        setIsLoading(true);
        // Load a wide range (Current Year + Next Year) to prevent constant refetching
        const start = new Date();
        const end = new Date();
        end.setFullYear(end.getFullYear() + 1);

        try {
            const { data, error } = await supabase
                .from("sitter_availability")
                .select("available_date")
                .eq("sitter_id", sitterId)
                .gte("available_date", format(start, "yyyy-MM-dd"))
                .lte("available_date", format(end, "yyyy-MM-dd"));

            if (error) throw error;

            if (data) {
                // Parse dates as local midnight
                const dates = data.map(item => parseISO(item.available_date));
                // Add timezone offset correction if needed, but parseISO usually handles YYYY-MM-DD well
                // A safer bet involves splitting by '-' to avoid browser timezone offset issues
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

        // Define the range we are modifying (Visible Month)
        // We only modify the CURRENT VIEWED MONTH to avoid deleting future/past data accidentally
        const startOfView = startOfMonth(month);
        const endOfView = endOfMonth(month);

        const startStr = format(startOfView, "yyyy-MM-dd");
        const endStr = format(endOfView, "yyyy-MM-dd");

        try {
            // 1. Clear existing availability for this month
            const { error: deleteError } = await supabase
                .from("sitter_availability")
                .delete()
                .eq("sitter_id", sitterId)
                .gte("available_date", startStr)
                .lte("available_date", endStr);

            if (deleteError) throw deleteError;

            // 2. Prepare new rows
            // Filter selectedDays to only keep those inside the current view
            const daysToSave = selectedDays.filter(day =>
                isSameDay(day, startOfView) || (day >= startOfView && day <= endOfView)
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
            setTimeout(() => setMessage(null), 3000);

        } catch (err: any) {
            console.error(err);
            setMessage({ type: 'error', text: 'Error al guardar.' });
            alert(`Error detallado: ${err.message || JSON.stringify(err)}`); // Temporary Debug Alert
        } finally {
            setIsSaving(false);
        }
    };

    // Helper: Select Entire Month
    const handleSelectMonth = () => {
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        const daysInMonth = eachDayOfInterval({ start, end });

        // Check if all are already selected
        const allSelected = daysInMonth.every(day =>
            selectedDays.some(s => isSameDay(s, day))
        );

        if (allSelected) {
            // Deselect the month
            setSelectedDays(prev => prev.filter(d =>
                d.getMonth() !== month.getMonth() || d.getFullYear() !== month.getFullYear()
            ));
        } else {
            // Select the month (merge)
            const newDays = [...selectedDays];
            daysInMonth.forEach(day => {
                if (!selectedDays.some(s => isSameDay(s, day))) {
                    newDays.push(day);
                }
            });
            setSelectedDays(newDays);
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm max-w-xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <CalendarIcon className="text-emerald-600" /> Disponibilidad
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Marca tus días libres.
                    </p>
                    {/* DEBUG MODE */}
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                        [DEBUG] Días seleccionados: {selectedDays.length}
                    </p>
                </div>

                {/* Save Button */}
                <div className="flex flex-col items-end">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white transition-all
                        ${isSaving ? 'bg-slate-400' : 'bg-slate-900 hover:bg-slate-800'}`}
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

            <div className="flex flex-col md:flex-row gap-8">
                {/* Calendar Area */}
                <div className="flex-1 flex justify-center border rounded-xl p-4 bg-slate-50/50">
                    <DayPicker
                        mode="multiple"
                        selected={selectedDays}
                        onSelect={(days) => setSelectedDays(days || [])}
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
                            day: { borderRadius: "9999px" }
                        }}
                    />
                </div>

                {/* Sidebar / Helpers */}
                <div className="w-full md:w-48 flex flex-col gap-4">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-900">
                        <h4 className="font-bold text-sm mb-1">Días Habilitados</h4>
                        <p className="text-xs opacity-80">
                            Estos días serán visibles para los dueños de mascotas.
                        </p>
                    </div>

                    <button
                        onClick={handleSelectMonth}
                        className="w-full py-2 px-3 text-sm font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        Marcar Todo el Mes
                    </button>
                </div>
            </div>
        </div>
    );
}
