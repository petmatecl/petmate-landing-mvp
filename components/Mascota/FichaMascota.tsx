// components/Mascota/FichaMascota.tsx
// ----------------------------------------------------------------------------
// Vista read-only de la ficha de una mascota. Componente shared entre:
//   1. El panel del proveedor (tab Solicitudes) — donde el proveedor ve la
//      ficha completa al recibir una solicitud con mascota_id set.
//   2. El listado de /usuario/mascotas del tutor — donde el tutor abre esta
//      MISMA vista clickeando la card ("asi te vera el proveedor").
//
// El shape acepta chip/vacunas como OPCIONALES: la vista del proveedor no los
// trae en su join (columnas no incluidas), pero el modal del tutor si los
// muestra. Si vienen `undefined`, la seccion no se renderea.
// ----------------------------------------------------------------------------
import React from 'react';
import { PawPrint, ShieldCheck, Syringe } from 'lucide-react';

export interface MascotaFichaData {
    nombre: string;
    tipo: string;
    raza?: string | null;
    sexo?: string | null;
    fecha_nacimiento?: string | null;
    tamano?: string | null;
    descripcion?: string | null;
    enfermedades?: string | null;
    trato_especial?: boolean;
    trato_especial_desc?: string | null;
    foto_mascota?: string | null;
    fotos_galeria?: string[] | null;
    // Opcionales — solo se pasan desde el modal del tutor. La vista del
    // proveedor no incluye estas columnas en su join.
    tiene_chip?: boolean;
    chip_id?: string | null;
    vacunas_al_dia?: boolean;
}

function calcularEdad(fechaNacimiento: string | null | undefined): string | null {
    if (!fechaNacimiento) return null;
    const nac = new Date(fechaNacimiento);
    if (Number.isNaN(nac.getTime())) return null;
    const ahora = new Date();
    const anos = ahora.getFullYear() - nac.getFullYear();
    const mesDiff = ahora.getMonth() - nac.getMonth();
    const total = mesDiff < 0 || (mesDiff === 0 && ahora.getDate() < nac.getDate()) ? anos - 1 : anos;
    if (total < 0) return null;
    if (total === 0) {
        const meses = Math.max(0, (ahora.getFullYear() - nac.getFullYear()) * 12 + mesDiff);
        return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
    }
    return `${total} ${total === 1 ? 'año' : 'años'}`;
}

interface Props {
    mascota: MascotaFichaData;
    /** Cabecera "Ficha de la mascota". Default true. En el modal del tutor
     * la cabecera vive fuera del componente (h1 propio), asi que se apaga. */
    showHeader?: boolean;
}

export default function FichaMascota({ mascota, showHeader = true }: Props) {
    const edad = calcularEdad(mascota.fecha_nacimiento);
    const hasChipInfo = mascota.tiene_chip !== undefined || mascota.vacunas_al_dia !== undefined;

    return (
        <div className="bg-accent-50/40 rounded-xl p-4 border border-accent-100">
            {showHeader && (
                <p className="text-[11px] uppercase tracking-widest text-accent-700 font-medium mb-3 flex items-center gap-1.5">
                    <PawPrint size={12} /> Ficha de la mascota
                </p>
            )}

            <div className="flex items-start gap-3">
                {mascota.foto_mascota && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                        src={mascota.foto_mascota}
                        alt={mascota.nombre}
                        className="w-16 h-16 rounded-xl object-cover border border-accent-100 shrink-0"
                    />
                )}
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">
                        {mascota.nombre}
                        <span className="text-slate-500 font-normal"> · {mascota.tipo.charAt(0).toUpperCase() + mascota.tipo.slice(1)}</span>
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-600">
                        {mascota.raza && <span>Raza: <strong className="text-slate-700 font-medium">{mascota.raza}</strong></span>}
                        {edad && <span>Edad: <strong className="text-slate-700 font-medium">{edad}</strong></span>}
                        {mascota.sexo && <span>Sexo: <strong className="text-slate-700 font-medium capitalize">{mascota.sexo}</strong></span>}
                        {mascota.tamano && <span>Tamaño: <strong className="text-slate-700 font-medium capitalize">{mascota.tamano}</strong></span>}
                    </div>
                    {mascota.descripcion && (
                        <p className="text-xs text-slate-500 leading-relaxed mt-1.5 italic">{mascota.descripcion}</p>
                    )}
                </div>
            </div>

            {/* Chip + vacunas — solo si el consumidor pasa las flags. Mismo
                tratamiento visual que las metas: chips discretos con icono. */}
            {hasChipInfo && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {mascota.tiene_chip && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-800 bg-white border border-accent-200 rounded-full px-2 py-0.5">
                            <ShieldCheck size={11} /> Chip
                            {mascota.chip_id && <span className="text-slate-500 font-normal">· {mascota.chip_id}</span>}
                        </span>
                    )}
                    {mascota.vacunas_al_dia && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-800 bg-white border border-accent-200 rounded-full px-2 py-0.5">
                            <Syringe size={11} /> Vacunas al día
                        </span>
                    )}
                </div>
            )}

            {(mascota.enfermedades || (mascota.trato_especial && mascota.trato_especial_desc)) && (
                <div className="mt-3 space-y-2">
                    {mascota.enfermedades && (
                        <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
                            <p className="text-[10px] uppercase tracking-widest text-warning-700 font-semibold mb-1 flex items-center gap-1">⚠ Condiciones médicas</p>
                            <p className="text-sm text-warning-900 leading-relaxed whitespace-pre-wrap">{mascota.enfermedades}</p>
                        </div>
                    )}
                    {mascota.trato_especial && mascota.trato_especial_desc && (
                        <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
                            <p className="text-[10px] uppercase tracking-widest text-warning-700 font-semibold mb-1 flex items-center gap-1">⚠ Trato especial</p>
                            <p className="text-sm text-warning-900 leading-relaxed whitespace-pre-wrap">{mascota.trato_especial_desc}</p>
                        </div>
                    )}
                </div>
            )}

            {Array.isArray(mascota.fotos_galeria) && mascota.fotos_galeria.length > 0 && (
                <div className="mt-3">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mb-1.5">Galería</p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                        {mascota.fotos_galeria.map((url: string, i: number) => (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="relative aspect-square rounded-lg overflow-hidden border border-accent-100 hover:border-accent-300 transition-colors"
                            >
                                <img src={url} alt={`${mascota.nombre} - foto ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
