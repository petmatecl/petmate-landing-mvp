import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "../../lib/supabaseClient";
import { Save, CheckCircle2, Loader2, Calendar as CalendarIcon, ShieldAlert } from "lucide-react";

import "react-day-picker/dist/style.css";

interface Props {
    sitterId: string;
}

export default function AvailabilityCalendar({ sitterId }: Props) {
    const [selectedDays, setSelectedDays] = useState<Date[]>([]);
    const [initialDays, setInitialDays] = useState<Date[]>([]); // To track changes
    const [month, setMonth] = useState<Date>(new Date());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Fetch availability on mount or month change
    useEffect(() => {
        if (sitterId) fetchAvailability();
    }, [sitterId, month]);

    const fetchAvailability = async () => {
        setLoading(true);
        // Fetch ALL future availability to ensure navigating months works without re-fetching
        // Or at least a wide range. Let's do current year + next year to be safe and simple.
        const start = new Date();
        const end = new Date();
        end.setFullYear(end.getFullYear() + 1);

        const { data, error } = await supabase
            .from("sitter_availability")
            .select("available_date")
            .eq("sitter_id", sitterId)
            .gte("available_date", format(start, "yyyy-MM-dd"))
            .lte("available_date", format(end, "yyyy-MM-dd"));

        if (error) {
            console.error("Error fetching availability:", error);
        } else {
            // Convert YYYY-MM-DD strings to Date objects at NOON to prevent timezone shifts
            const dates = (data || []).map(row => {
                const [year, month, day] = row.available_date.split('-').map(Number);
                return new Date(year, month - 1, day, 12, 0, 0, 0); // Month is 0-indexed
            });
            setSelectedDays(dates);
            setInitialDays(dates);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        setSuccessMsg(null);
        setErrorMsg(null);

        // Strategy: 
        // 1. Calculate which dates are currently selected in the VISIBLE month.
        // 2. Delete ALL entries for the visible month from DB.
        // 3. Insert the currently selected dates for the visible month.
        // This ensures unselected days are removed and new ones added, without affecting other months.

        const startOfMonthDate = startOfMonth(month);
        const endOfMonthDate = endOfMonth(month);

        // Format as YYYY-MM-DD for DB queries
        const startStr = format(startOfMonthDate, "yyyy-MM-dd");
        const endStr = format(endOfMonthDate, "yyyy-MM-dd");

        try {
            // 1. Delete all availability for this sitter in the current month range
            const { error: delError } = await supabase
                .from("sitter_availability")
                .delete()
                .eq("sitter_id", sitterId)
                .gte("available_date", startStr)
                .lte("available_date", endStr);

            if (delError) {
                console.error("Delete Error:", delError);
                throw new Error("Error al limpiar fechas anteriores.");
            }

            // 2. Prepare inserts for selected days THAT FALL WITHIN this month
            // Filter selectedDays to only those in the current month
            const daysToInsert = selectedDays
                .filter(d => isSameDay(d, startOfMonthDate) || (d >= startOfMonthDate && d <= endOfMonthDate)) // Robust range check
                .map(d => ({
                    sitter_id: sitterId,
                    available_date: format(d, "yyyy-MM-dd") // Local date formatting depends on browser, but d is noon, so should be safe.
                }));

            if (daysToInsert.length > 0) {
                const { error: insError } = await supabase
                    .from("sitter_availability")
                    .insert(daysToInsert);

                if (insError) {
                    console.error("Insert Error:", insError);
                    throw new Error("Error al guardar nuevas fechas.");
                }
            }

            setSuccessMsg("Calendario actualizado");
            setTimeout(() => setSuccessMsg(null), 3000);
            setInitialDays(selectedDays); // Update "initial" to current state

        } catch (err: any) {
            console.error("Error saving availability:", err);
            setErrorMsg(err.message || "Error desconocido al guardar.");
        } finally {
            setSaving(false);
        }
    };

    const toggleAllMonth = () => {
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        const allDaysInMonth = eachDayOfInterval({ start, end });

        // Normalize generated days to NOON
        const allDaysNoon = allDaysInMonth.map(d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0));

        // Check availability in current month
        // We need to check if EVERY day in the month is already selected
        const selectedInMonth = selectedDays.filter(d =>
            d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear()
        );

        // Simple heuristic: if selected count >= days in month, we assum full. 
        // Or strictly check if every day is present.
        const isFull = allDaysNoon.every(dayNoon =>
            selectedDays.some(selected => isSameDay(selected, dayNoon))
        );

        if (isFull) {
            // Deselect all: Remove days belonging to this month
            setSelectedDays(prev => prev.filter(d =>
                d.getMonth() !== month.getMonth() || d.getFullYear() !== month.getFullYear()
            ));
        } else {
            // Select all: Add missing days from this month
            const newSelection = [...selectedDays];
            allDaysNoon.forEach(day => {
                if (!selectedDays.some(s => isSameDay(s, day))) {
                    newSelection.push(day);
                }
            });
            setSelectedDays(newSelection);
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm max-w-xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <CalendarIcon className="text-emerald-600" /> Calendario de Disponibilidad
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Selecciona los días que puedes cuidar mascotas.
                    </p>
                </div>
                <div className="text-right">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white transition-all
                            ${saving ? "bg-slate-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/20 active:scale-95"}
                        `}
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {saving ? "Guardando..." : "Guardar Cambios"}
                    </button>
                    {successMsg && (
                        <p className="text-xs text-emerald-600 font-bold mt-1 animate-in fade-in flex items-center justify-end gap-1">
                            <CheckCircle2 size={14} /> {successMsg}
                        </p>
                    )}
                    {errorMsg && (
                        <p className="text-xs text-red-500 font-bold mt-1 animate-in fade-in flex items-center justify-end gap-1">
                            <ShieldAlert size={14} /> {errorMsg}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 flex justify-center border rounded-xl p-4 bg-slate-50/50">
                    <DayPicker
                        mode="multiple"
                        selected={selectedDays}
                        onSelect={(days) => {
                            // Normalize selection to noon to avoid mismatch
                            const normalized = (days || []).map(d => {
                                const n = new Date(d);
                                n.setHours(12, 0, 0, 0);
                                return n;
                            });
                            setSelectedDays(normalized);
                        }}
                        month={month}
                        onMonthChange={setMonth}
                        locale={es}
                        modifiersClassNames={{
                            selected: "bg-emerald-600 text-white hover:bg-emerald-600 rounded-full",
                            today: "font-bold text-emerald-600"
                        }}
                        styles={{
                            head_cell: { width: "40px", height: "40px", fontSize: "0.85rem", color: "#64748b" },
                            cell: { width: "40px", height: "40px" },
                            day: { width: "40px", height: "40px", borderRadius: "100%" }
                        }}
                    />
                </div>

                <div className="w-full md:w-48 flex flex-col gap-3">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                        <h4 className="font-bold text-emerald-900 text-sm mb-1">Días Seleccionados</h4>
                        <p className="text-xs text-emerald-700 leading-relaxed">
                            Los días marcados en verde aparecerán como disponibles en el buscador.
                        </p>
                    </div>

                    <button
                        onClick={toggleAllMonth}
                        className="w-full py-2 px-3 text-sm font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                    >
                        Seleccionar Todo el Mes
                    </button>

                    <div className="mt-auto">
                        <p className="text-[10px] text-slate-400 text-center">
                            * Recuerda actualizar tu calendario regularmente.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
