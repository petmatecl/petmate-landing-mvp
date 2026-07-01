// components/Servicio/ProveedorResumenCard.tsx
// ----------------------------------------------------------------------------
// Tarjeta resumen del proveedor (Zona B del rediseno estructural de la ficha
// de servicio, Commit 4). Reemplaza al bloque grande "Sobre X" en la columna
// izquierda + duplicaciones que existian en la sticky right. La info completa
// (bio larga, certificaciones tabla, presencia online, mapa, idiomas) vive
// exclusivamente en /proveedor/[id]; aca solo la sintesis con boton "Ver
// perfil completo →".
//
// Estilos actuales — sin sistema visual nuevo (etapa posterior).
// ----------------------------------------------------------------------------

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, CheckCircle, Star, Briefcase } from 'lucide-react';
import { getProxyImageUrl } from '../../lib/utils';

interface ProveedorResumenCardProps {
    proveedor: any;
    /** Rating global del proveedor (todas sus evaluaciones, no solo este servicio). */
    globalRatingPromedio: number;
    globalTotalEvaluaciones: number;
}

/**
 * Trunca bio a un preview corto sin cortar palabra. Sin ExpandibleText —
 * si el tutor quiere leer todo, va al perfil completo (boton). El objetivo
 * en la ficha es sintesis, no relato.
 */
function truncarBio(texto: string, maxChars: number = 150): string {
    if (texto.length <= maxChars) return texto;
    const cortado = texto.slice(0, maxChars);
    const ultimoEspacio = cortado.lastIndexOf(' ');
    const base = ultimoEspacio > 0 ? cortado.slice(0, ultimoEspacio) : cortado;
    return base + '…';
}

export default function ProveedorResumenCard({
    proveedor,
    globalRatingPromedio,
    globalTotalEvaluaciones,
}: ProveedorResumenCardProps) {
    const nombreVisible = proveedor.nombre_publico || `${proveedor.nombre || ''} ${proveedor.apellido_p || ''}`.trim() || 'Proveedor';
    const bioTrunc = proveedor.bio ? truncarBio(proveedor.bio, 150) : null;
    const aniosExp = proveedor.anios_experiencia && parseInt(proveedor.anios_experiencia) > 0
        ? parseInt(proveedor.anios_experiencia)
        : null;

    return (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex gap-4 sm:gap-5">

                {/* Foto */}
                <Link href={`/proveedor/${proveedor.id}`} className="shrink-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-slate-200 hover:border-emerald-400 overflow-hidden bg-slate-100 transition-colors">
                        {proveedor.foto_perfil ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={getProxyImageUrl(proveedor.foto_perfil) || ''}
                                alt={nombreVisible}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <svg className="w-full h-full text-slate-400 p-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        )}
                    </div>
                </Link>

                {/* Datos del proveedor */}
                <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Nombre + badge verificacion */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                            href={`/proveedor/${proveedor.id}`}
                            className="font-semibold text-slate-900 text-base hover:text-emerald-700 transition-colors"
                        >
                            {nombreVisible}
                        </Link>
                        {proveedor.rut_verificado && (
                            <span
                                title="Identidad verificada"
                                className="inline-flex items-center gap-1 text-emerald-600"
                            >
                                <ShieldCheck size={16} />
                            </span>
                        )}
                    </div>

                    {/* Rating global (todas sus evaluaciones) */}
                    {globalTotalEvaluaciones > 0 ? (
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <Star size={14} className="text-amber-400 fill-amber-400" />
                            <span className="font-semibold text-slate-900">
                                {globalRatingPromedio.toFixed(1)}
                            </span>
                            <span className="text-slate-500">
                                ({globalTotalEvaluaciones} evaluaci{globalTotalEvaluaciones !== 1 ? 'ones' : 'ón'} en total)
                            </span>
                        </div>
                    ) : (
                        <div className="text-sm text-slate-500">Aún sin evaluaciones</div>
                    )}

                    {/* Anios de experiencia + tipo entidad (empresa) inline */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                        {aniosExp != null && (
                            <span>{aniosExp} {aniosExp === 1 ? 'año' : 'años'} de experiencia</span>
                        )}
                        {proveedor.tipo_entidad === 'empresa' && (proveedor.nombre_fantasia || proveedor.razon_social) && (
                            <span className="inline-flex items-center gap-1 text-slate-500">
                                <Briefcase size={13} className="shrink-0" />
                                {proveedor.nombre_fantasia || proveedor.razon_social}
                            </span>
                        )}
                    </div>

                    {/* Badge Primeros auxilios — solo si aplica (positivo).
                        Si el proveedor no lo declara, no se muestra nada
                        (evita ruido negativo — para el detalle esta el perfil). */}
                    {proveedor.primera_ayuda && (
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full border border-emerald-100 mt-1">
                            <CheckCircle size={12} className="shrink-0" />
                            Primeros auxilios
                        </div>
                    )}
                </div>
            </div>

            {/* Bio corta (sin ExpandibleText — sintesis) */}
            {bioTrunc && (
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                    {bioTrunc}
                </p>
            )}

            {/* Boton "Ver perfil completo →" — enlace al detalle full en
                /proveedor/[id]: bio expandible larga, certificaciones tabla,
                presencia online, mapa, idiomas, otros servicios. */}
            <div className="mt-4">
                <Link
                    href={`/proveedor/${proveedor.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
                >
                    Ver perfil completo
                    <span aria-hidden="true">→</span>
                </Link>
            </div>
        </div>
    );
}
