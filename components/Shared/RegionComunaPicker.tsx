// components/Shared/RegionComunaPicker.tsx
// ----------------------------------------------------------------------------
// Selector encadenado de region + comuna de Chile. Foundation de la Ola 1
// del feature "direcciones estructuradas" en agendamiento.
//
// API por labels (no slugs): el componente recibe y emite los nombres
// canonicos ("Metropolitana", "Las Condes") porque eso es lo que persiste
// la BD — match con el patron de proveedores.comuna y servicios_publicados
// .comunas_cobertura.
//
// Flujo UX:
//   - Estado inicial: ambos selects en placeholder. Comuna deshabilitada
//     hasta que se elige region.
//   - Al elegir region: el select de comuna se llena con las comunas de
//     esa region (alfabeticamente). Si habia una comuna previa, se resetea
//     a null porque ya no pertenece a la region nueva.
//   - Al cambiar region nuevamente: idem reset de comuna.
//   - Al cambiar comuna: emite el cambio sin tocar region.
//
// Reusable para Ola 2 (registro, perfil proveedor, filtros /explorar).
// Para Ola 1 solo lo usa SolicitarAgendamientoModal en V4a/V4b.
//
// Diseño visual: 2 <select> nativos lado a lado en desktop, apilados en
// mobile. Consistente con los <select> existentes del modal (h-11,
// rounded-xl, focus:ring-emerald-600).
// ----------------------------------------------------------------------------
import React from 'react';
import { REGIONES_CHILE, getRegionPorLabel, getComunasDeRegion } from '../../lib/comunas';

interface RegionComunaPickerProps {
    /** Label canonico de la region actual (e.g. "Metropolitana"), o null. */
    region: string | null;
    /** Label canonico de la comuna actual (e.g. "Las Condes"), o null. */
    comuna: string | null;
    /** Llamado cada vez que cambia region o comuna. */
    onChange: (next: { region: string | null; comuna: string | null }) => void;
    /** Marca ambos campos como requeridos en el form. Default true. */
    required?: boolean;
    /** Deshabilita ambos selects (e.g. durante submit). Default false. */
    disabled?: boolean;
    /** Override del label visual del select de region. Default "Región". */
    regionLabel?: string;
    /** Override del label visual del select de comuna. Default "Comuna". */
    comunaLabel?: string;
    /** Prefijo opcional para los `id`/`name` de los inputs (a11y + form). */
    idPrefix?: string;
}

export default function RegionComunaPicker({
    region,
    comuna,
    onChange,
    required = true,
    disabled = false,
    regionLabel = 'Región',
    comunaLabel = 'Comuna',
    idPrefix = 'region-comuna',
}: RegionComunaPickerProps) {
    const regionActual = region ? getRegionPorLabel(region) : null;
    const comunasDeRegion = regionActual ? getComunasDeRegion(regionActual.slug) : [];
    const comunasDisabled = disabled || !regionActual;

    const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const slug = e.target.value;
        if (!slug) {
            onChange({ region: null, comuna: null });
            return;
        }
        const r = REGIONES_CHILE.find(x => x.slug === slug);
        // Al cambiar region la comuna previa pierde sentido — resetear a null.
        onChange({ region: r ? r.label : null, comuna: null });
    };

    const handleComunaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        onChange({ region, comuna: value || null });
    };

    // Valor del select de region = slug (no label), porque slugs son URL-safe
    // y la key estable. Convertimos a label en onChange para mantener el
    // contrato externo de la API por labels.
    const regionValue = regionActual ? regionActual.slug : '';
    const comunaValue = comuna ?? '';

    const baseInputClass = 'w-full h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
                <label htmlFor={`${idPrefix}-region`} className="block text-sm font-medium text-slate-700 mb-1.5">
                    {regionLabel}{required && <span className="text-red-500"> *</span>}
                </label>
                <select
                    id={`${idPrefix}-region`}
                    name={`${idPrefix}-region`}
                    value={regionValue}
                    onChange={handleRegionChange}
                    disabled={disabled}
                    required={required}
                    className={baseInputClass}
                >
                    <option value="">Selecciona región</option>
                    {REGIONES_CHILE.map(r => (
                        <option key={r.slug} value={r.slug}>{r.label}</option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor={`${idPrefix}-comuna`} className="block text-sm font-medium text-slate-700 mb-1.5">
                    {comunaLabel}{required && <span className="text-red-500"> *</span>}
                </label>
                <select
                    id={`${idPrefix}-comuna`}
                    name={`${idPrefix}-comuna`}
                    value={comunaValue}
                    onChange={handleComunaChange}
                    disabled={comunasDisabled}
                    required={required}
                    className={baseInputClass}
                >
                    <option value="">
                        {regionActual ? 'Selecciona comuna' : 'Elige una región primero'}
                    </option>
                    {comunasDeRegion.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
