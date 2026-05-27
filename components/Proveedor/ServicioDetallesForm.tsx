// components/Proveedor/ServicioDetallesForm.tsx
// ----------------------------------------------------------------------------
// Form dinamico de campos categoria-especificos para UN servicio del
// proveedor. Renderiza segun CAMPOS_POR_CATEGORIA[categoria] (lib/
// camposPorCategoria.ts).
//
// Sprint 4 Fase 1 / Commit 2: renombrado desde DatosEspecificosForm para
// reflejar el nuevo modelo — los campos son PER-SERVICIO, no per-proveedor.
// El caller decide a que servicio se aplican (escribe a
// servicios_publicados.detalles del servicio elegido).
//
// Usos:
//   - Tab "Info del Servicio" del dashboard /proveedor (uno por servicio).
//   - Step 3 del wizard de registro (cuando se integre).
//
// Save acepta valores parciales (no requiere todos los campos completos
// para guardar). Solo bloquea si hay campos requeridos vacios.
// ----------------------------------------------------------------------------

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
    CAMPOS_POR_CATEGORIA,
    camposVisibles,
    type CampoDinamico,
} from '../../lib/camposPorCategoria';

interface Props {
    categoria: string;
    initialValues: Record<string, any>;
    onSave: (values: Record<string, any>) => Promise<void>;
    /** Si true, no permite guardar parcial: requiere todos los campos `requerido`. Default false. */
    strictRequired?: boolean;
    /** Texto del boton submit. Default "Guardar cambios". */
    submitLabel?: string;
}

const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none";

export default function ServicioDetallesForm({
    categoria,
    initialValues,
    onSave,
    strictRequired = false,
    submitLabel = 'Guardar cambios',
}: Props) {
    const [values, setValues] = useState<Record<string, any>>(initialValues || {});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const setValor = (key: string, value: any) => {
        setValues((prev) => ({ ...prev, [key]: value }));
        if (error) setError(null);
    };

    const campos: CampoDinamico[] = CAMPOS_POR_CATEGORIA[categoria] || [];
    const visibles = camposVisibles(categoria, values);

    if (campos.length === 0) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                No hay campos específicos definidos para la categoría &quot;{categoria}&quot;.
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (strictRequired) {
            for (const campo of visibles) {
                if (campo.requerido && (values[campo.key] === undefined || values[campo.key] === '' || values[campo.key] === null)) {
                    setError(`El campo «${campo.label}» es obligatorio.`);
                    return;
                }
            }
        }

        // Limpiar valores condicionales que ya no aplican (ej. piso_departamento
        // queda en values si user pone "departamento" y despues vuelve a "casa";
        // queremos persistir solo lo que esta visible).
        const visiblesKeys = new Set(visibles.map((c) => c.key));
        const valoresLimpios: Record<string, any> = {};
        for (const key of Object.keys(values)) {
            if (visiblesKeys.has(key)) {
                valoresLimpios[key] = values[key];
            }
        }

        setSaving(true);
        try {
            await onSave(valoresLimpios);
        } catch (err: any) {
            setError(err?.message || 'Error al guardar. Intenta nuevamente.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {visibles.map((campo) => (
                <div key={campo.key}>
                    {campo.tipo === 'info' ? (
                        <p className="text-sm text-slate-600 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100 italic">
                            {campo.label}
                        </p>
                    ) : (
                        <>
                            <label
                                htmlFor={`campo-${campo.key}`}
                                className="block text-sm font-medium text-slate-700 mb-1"
                            >
                                {campo.label}
                                {campo.requerido && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {campo.tipo === 'boolean' ? (
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        id={`campo-${campo.key}`}
                                        name={`campo-${campo.key}`}
                                        type="checkbox"
                                        checked={!!values[campo.key]}
                                        onChange={(e) => setValor(campo.key, e.target.checked)}
                                        className="w-5 h-5 rounded border-slate-300 accent-emerald-600"
                                    />
                                    <span className="text-sm text-slate-600">Sí</span>
                                </label>
                            ) : campo.tipo === 'select' ? (
                                <select
                                    id={`campo-${campo.key}`}
                                    name={`campo-${campo.key}`}
                                    value={values[campo.key] || ''}
                                    onChange={(e) => setValor(campo.key, e.target.value)}
                                    className={`${inputClass} cursor-pointer`}
                                >
                                    <option value="" disabled>
                                        Selecciona...
                                    </option>
                                    {campo.opciones?.map((op) => (
                                        <option key={op.value} value={op.value}>
                                            {op.label}
                                        </option>
                                    ))}
                                </select>
                            ) : campo.tipo === 'multiselect' ? (() => {
                                // Patron de chips toggle reusado de idiomas y
                                // comunas_cobertura. Cada opcion es un boton; click
                                // togglea su presencia en el array. Vacio se persiste
                                // como [] (el caller decide si convertir a null).
                                const selected: string[] = Array.isArray(values[campo.key]) ? values[campo.key] : [];
                                const toggle = (slug: string) => {
                                    setValor(campo.key, selected.includes(slug)
                                        ? selected.filter(s => s !== slug)
                                        : [...selected, slug]);
                                };
                                return (
                                    <div className="flex flex-wrap gap-2">
                                        {campo.opciones?.map((op) => {
                                            const active = selected.includes(op.value);
                                            return (
                                                <button
                                                    key={op.value}
                                                    type="button"
                                                    onClick={() => toggle(op.value)}
                                                    className={
                                                        active
                                                            ? 'flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-sm font-medium px-3 py-1.5 rounded-full hover:bg-emerald-200 transition-colors'
                                                            : 'flex items-center gap-1.5 bg-slate-50 text-slate-600 text-sm font-medium px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100 transition-colors'
                                                    }
                                                >
                                                    {op.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })() : campo.tipo === 'textarea' ? (
                                <textarea
                                    id={`campo-${campo.key}`}
                                    name={`campo-${campo.key}`}
                                    autoComplete="off"
                                    value={values[campo.key] ?? ''}
                                    onChange={(e) => setValor(campo.key, e.target.value)}
                                    rows={3}
                                    maxLength={300}
                                    placeholder={campo.placeholder}
                                    className={`${inputClass} resize-none`}
                                />
                            ) : (
                                <input
                                    id={`campo-${campo.key}`}
                                    name={`campo-${campo.key}`}
                                    autoComplete="off"
                                    type={campo.tipo === 'number' ? 'number' : 'text'}
                                    value={values[campo.key] ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (campo.tipo === 'number' && val !== '' && Number(val) < 0) return;
                                        setValor(campo.key, val);
                                    }}
                                    min={campo.tipo === 'number' ? 0 : undefined}
                                    placeholder={campo.placeholder}
                                    className={inputClass}
                                />
                            )}
                        </>
                    )}
                </div>
            ))}

            {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="flex justify-end pt-2">
                <button
                    type="submit"
                    disabled={saving}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium tracking-wide py-2.5 px-6 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    {submitLabel}
                </button>
            </div>
        </form>
    );
}
