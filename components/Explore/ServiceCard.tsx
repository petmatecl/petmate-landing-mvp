import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Star, Sparkles, CalendarCheck } from 'lucide-react';
import VisitCounter from '../Shared/VisitCounter';
import FavoritoButton from '../Shared/FavoritoButton';
import { getCampoMeta } from '../../lib/camposPorCategoria';

export interface ServiceResult {
    servicio_id: string;
    titulo: string;
    descripcion: string;
    precio_desde: number;
    precio_hasta: number;
    unidad_precio: string;
    fotos: string[];
    categoria_nombre: string;
    categoria_slug: string;
    categoria_icono: string;
    proveedor_id: string;
    proveedor_nombre: string;
    proveedor_foto: string;
    proveedor_comuna: string;
    destacado: boolean;
    rating_promedio: number;
    total_evaluaciones: number;
    acepta_perros?: boolean;
    acepta_gatos?: boolean;
    acepta_otras?: boolean;
    proveedor_updated_at?: string;
    proveedor_lat?: number | null;
    proveedor_lng?: number | null;
    proveedor_verificado?: boolean;
    proveedor_primera_ayuda?: boolean;
    proveedor_perfil_completo?: boolean;
    proveedor_es_ejemplo?: boolean;
    /**
     * PR1 sprint PRODUCTO-1 (2026-07-31): flag "reserva online" — servicio
     * con F1 (duracion_min) o F2 (capacidad_estadia + min_noches) activa
     * Y `agendamiento_habilitado=true`. Calculado server-side por el RPC
     * `buscar_servicios` (columna nueva del RETURNS TABLE); para la ruta
     * join de `pages/index.tsx`, calculado en el mapper con los mismos
     * semáforos. Opcional para no romper callers previos que aún no lo
     * pasan (se renderiza el badge solo cuando viene `true`).
     */
    tiene_agenda_activa?: boolean;
    visitas_total?: number;
    visitas_mes?: number;
    favoritos_total?: number;
    /**
     * Detalles jsonb del servicio. Sprint 4 Fase 2: lo usamos para renderizar
     * un preview de chips de `inclusiones` debajo de la card. Opcional porque
     * los services que vienen de `buscar_servicios` (mapper RPC) no lo
     * incluyen — solo los fetches directos (ej. ficha del proveedor) lo
     * pasan. Si esta ausente, la seccion de chips no se renderiza.
     */
    detalles?: Record<string, any>;
}

interface Props {
    service: ServiceResult;
}

export default function ServiceCard({ service }: Props) {
    // Use first photo of service, fallback to provider photo, fallback to generic
    const defaultImage = "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=600";
    const coverImage = service.fotos?.[0] || service.proveedor_foto || defaultImage;

    return (
        <Link
            href={`/servicio/${service.servicio_id}`}
            className="group block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative flex flex-col h-full"
        >
            {/* Etiqueta Destacado — debajo de la categoría */}
            {service.destacado && (
                <div className="absolute top-12 left-3 z-10 bg-amber-400 text-amber-900 text-[10px] font-medium px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-sm">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    Destacado
                </div>
            )}

            {/* Botón Guardar Favorito (overlay) */}
            <div className="absolute top-3 right-3 z-20 bg-white/90 rounded-full shadow-sm">
                <FavoritoButton
                    entidad_tipo="servicio"
                    entidad_id={service.servicio_id}
                    contador_inicial={service.favoritos_total ?? 0}
                    es_ejemplo={!!service.proveedor_es_ejemplo}
                    variant="icon"
                />
            </div>

            {/* Imagen Principal */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={coverImage}
                    alt={service.titulo}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (target.src !== defaultImage) {
                            target.src = defaultImage;
                        }
                    }}
                />

                {/* Badge de Categoría Base */}
                <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                    {service.categoria_nombre}
                </div>

                {/* Rating overlay (bottom-left) — con reseñas: estrella filled
                    amber-400 + rating decimal + contador. Sin reseñas: estrella
                    outline slate-400 + texto "Sin reseñas". Chip bg-white/90 aisla
                    contraste sobre imagen impredecible. Eje izquierdo (info)
                    espeja a la categoria arriba; el derecho queda para acciones
                    (corazon favorito). */}
                {service.total_evaluaciones > 0 ? (
                    <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur-sm shadow-sm px-2.5 py-1 rounded-full flex items-center gap-1 text-slate-900 text-xs font-semibold">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        {Number(service.rating_promedio).toFixed(1)}
                        <span className="text-slate-500 font-normal">({service.total_evaluaciones})</span>
                    </div>
                ) : (
                    <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur-sm shadow-sm px-2.5 py-1 rounded-full flex items-center gap-1 text-slate-500 text-xs font-medium">
                        <Star size={12} className="text-slate-400" />
                        Sin reseñas
                    </div>
                )}
            </div>

            {/* Contenido Card */}
            <div className="p-5 flex flex-col flex-grow">

                {/* Titulo — el rating se movio al overlay bottom-left de la imagen.
                    line-clamp-2: corta con "..." en la 3ra linea. min-h-[2.5em]:
                    reserva altura de 2 lineas (2 x 1.25 line-height del leading-tight)
                    para alinear proveedor/precio verticalmente entre cards vecinas
                    del grid, aunque un titulo sea de 1 linea y otro de 2. */}
                <h3 title={service.titulo} className="font-semibold text-lg leading-tight text-slate-900 group-hover:text-accent-600 transition-colors line-clamp-2 min-h-[2.5em] mb-2">
                    {service.titulo}
                </h3>

                {/* Proveedor info (Footer de texto) */}
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-200 shrink-0">
                        {service.proveedor_foto ? (
                            <img src={service.proveedor_foto} alt={service.proveedor_nombre} className="w-full h-full object-cover" />
                        ) : (
                            <svg className="w-full h-full text-slate-400 p-1" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        )}
                    </div>
                    <p title={`${service.proveedor_nombre} • ${service.proveedor_comuna}`} className="text-sm text-slate-500 truncate">
                        {service.proveedor_nombre} <span className="text-slate-300 mx-1">•</span> {service.proveedor_comuna}
                    </p>
                    {service.proveedor_updated_at && (
                        Date.now() - new Date(service.proveedor_updated_at).getTime() < 7 * 24 * 60 * 60 * 1000
                    ) && (
                            <span className="flex items-center gap-1 shrink-0 ml-auto">
                                <span className="w-2 h-2 rounded-full bg-accent-600 inline-block" />
                                <span className="text-xs text-accent-600">Activo</span>
                            </span>
                        )}
                </div>

                {/* Visitas del mes (compact, solo si > 0) */}
                {(service.visitas_mes ?? 0) > 0 && (
                    <div className="flex justify-end mb-2">
                        <VisitCounter total={service.visitas_total ?? 0} mes={service.visitas_mes ?? 0} variant="compact" />
                    </div>
                )}

                {/* Trust badges: EJEMPLO + Verificado + Reserva online (PR1
                    sprint PRODUCTO-1). "Reserva online" indica que el servicio
                    tiene agenda F1/F2 activa — el tutor puede reservar sin
                    esperar respuesta del proveedor. Se posiciona junto a los
                    otros trust badges por semántica (marca calidad operativa)
                    pero sin robar jerarquía al precio. Fallback <div mb-3 />
                    preserva el spacing cuando ningún badge aplica. */}
                {(service.proveedor_es_ejemplo || service.proveedor_verificado || service.tiene_agenda_activa) ? (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {service.proveedor_es_ejemplo && (
                            <span
                                title="Este es un proveedor de ejemplo, no real. Regístrate para publicar tu servicio."
                                className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[11px] font-medium uppercase tracking-widest"
                            >
                                <Sparkles size={10} aria-hidden="true" /> EJEMPLO
                            </span>
                        )}
                        {service.proveedor_verificado && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-accent-50 text-accent-800 rounded-full text-[11px] font-medium">
                                <ShieldCheck size={10} /> Verificado
                            </span>
                        )}
                        {service.tiene_agenda_activa && (
                            <span
                                title="Este servicio tiene agenda en línea — puedes reservar directamente sin esperar respuesta."
                                className="flex items-center gap-1 px-2 py-0.5 bg-accent-50 text-accent-800 rounded-full text-[11px] font-medium"
                            >
                                <CalendarCheck size={10} aria-hidden="true" /> Reserva online
                            </span>
                        )}
                    </div>
                ) : <div className="mb-3" />}

                {/* Preview de inclusiones (Sprint 4 Fase 2 Commit C). Max 3
                    chips + "+N más" para mantener la card compacta. Solo se
                    renderiza si el caller pasa `detalles.inclusiones` — los
                    fetches del RPC `buscar_servicios` no incluyen `detalles`
                    asi que en /explorar no aparece (acceptable; el detalle
                    completo se ve al entrar al servicio). */}
                {Array.isArray(service.detalles?.inclusiones) && service.detalles.inclusiones.length > 0 && (() => {
                    const slugs: string[] = service.detalles.inclusiones;
                    const campo = getCampoMeta(service.categoria_slug, 'inclusiones');
                    const labels = slugs.map(slug => campo?.opciones?.find(o => String(o.value) === String(slug))?.label ?? slug);
                    const visibles = labels.slice(0, 3);
                    const extra = labels.length - visibles.length;
                    return (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {visibles.map((label, i) => (
                                <span key={i} className="bg-accent-50 text-accent-800 text-[11px] font-medium px-2 py-0.5 rounded-full border border-accent-100">
                                    {label}
                                </span>
                            ))}
                            {extra > 0 && (
                                <span className="text-[11px] text-slate-500 font-medium px-2 py-0.5">
                                    +{extra} más
                                </span>
                            )}
                        </div>
                    );
                })()}

                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Precio desde</span>
                        <p className="font-semibold text-slate-900 text-lg">
                            ${service.precio_desde?.toLocaleString('es-CL')} <span className="text-sm font-normal text-slate-500">/ {service.unidad_precio}</span>
                        </p>
                    </div>
                </div>
            </div>

        </Link>
    );
}
