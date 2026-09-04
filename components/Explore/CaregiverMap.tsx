import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, Circle } from "react-leaflet";
import L from "leaflet";
// CSS is imported in _app.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ServiceResult } from "./ServiceCard";
import { COMUNA_COORDS, CENTER_SANTIAGO, getComunaCoords } from "../../lib/comunas";

// Fix Leaflet default icon issue in Next.js
const fixLeafletIcons = () => {
    try {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
    } catch (e) {
        console.error("Leaflet icon fix failed", e);
    }
};

// COMUNA_COORDS / CENTER_SANTIAGO / getComunaCoords se importan desde
// lib/comunas (Sprint 3B). Antes el hash + helper vivian inline aqui.

interface CaregiverMapProps {
    services: ServiceResult[];
}

// Re-centers map when services change
function MapUpdater({ services }: { services: ServiceResult[] }) {
    const map = useMap();

    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100);
        return () => clearTimeout(timer);
    }, [map]);

    useEffect(() => {
        if (services.length > 0) {
            const coords = services.map(s =>
                (s.proveedor_lat && s.proveedor_lng)
                    ? [s.proveedor_lat, s.proveedor_lng] as [number, number]
                    : getComunaCoords(s.proveedor_comuna)
            );
            const bounds = L.latLngBounds(coords);
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
            } else {
                map.setView(CENTER_SANTIAGO, 12);
            }
        } else {
            map.setView(CENTER_SANTIAGO, 12);
        }
    }, [services, map]);

    return null;
}

export default function CaregiverMap({ services }: CaregiverMapProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        fixLeafletIcons();
        setMounted(true);
    }, []);

    // Memoize marker positions (add small jitter only when using commune fallback, for visual separation)
    //
    // Privacidad: s.proveedor_lat / s.proveedor_lng llegan ya redondeadas a
    // 2 decimales (~1km) via roundCoordsForPublic en lib/serviceMapper.ts.
    // No hace falta redondear de nuevo aca. Hoy ademas el RPC
    // buscar_servicios no devuelve estos campos, asi que hasRealCoords es
    // casi siempre false y este componente cae al fallback de comuna —
    // pero si el RPC vuelve a incluirlos, las coords ya vienen capadas.
    const markers = useMemo(() => {
        return services.map(s => {
            const hasRealCoords = s.proveedor_lat != null && s.proveedor_lng != null;
            let lat: number;
            let lng: number;

            if (hasRealCoords) {
                lat = s.proveedor_lat!;
                lng = s.proveedor_lng!;
            } else {
                const base = getComunaCoords(s.proveedor_comuna);
                // Small jitter (~500m) so multiple providers in same commune don't overlap
                lat = base[0] + (Math.random() - 0.5) * 0.008;
                lng = base[1] + (Math.random() - 0.5) * 0.008;
            }

            return { ...s, lat, lng, hasRealCoords };
        });
    }, [services]);

    if (!mounted) return (
        <div className="h-[580px] w-full rounded-2xl bg-slate-100 flex items-center justify-center">
            <p className="text-slate-400 text-sm">Cargando mapa...</p>
        </div>
    );

    if (services.length === 0) return (
        <div className="h-[580px] w-full rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
            <p className="text-slate-400 text-sm">Sin resultados para mostrar en el mapa</p>
        </div>
    );

    // Sprint z-index-maps (2026-09-04) — `isolate` + `zIndex: 0` crean
    // stacking context propio del wrapper, conteniendo los z-index internos
    // de Leaflet (tile-pane=200, marker-pane=600, popup-pane=700,
    // control=800). Sin esto, esos valores escapan al context superior y
    // ganan contra el Header sticky (z-40) → el mapa tapa la navegación
    // + los CTAs "Soy tutor" / "Soy proveedor" al scrollear. Y los divIcon
    // de precio (Marker con HTML custom) escapan visualmente del wrapper
    // por la derecha en la baseline del PO.
    //
    // Fix es transcripción literal del patrón que LocationMap ya aplicaba
    // (línea 38). No es diseño nuevo. Cero cambio funcional interno del
    // mapa — los z-index internos siguen ordenándose entre sí dentro del
    // stacking context (popup encima de marker, marker encima de tile).
    //
    // Consecuencia esperada (asumida por PO al aterrizar): burbujas de
    // precio (divIcon markers) cerca del borde pasan a recortarse por
    // `overflow-hidden` que ahora sí funciona. Trade-off aceptado —
    // recorte de burbuja cerca del borde es infinitamente menor que
    // tapar navegación + CTAs. Fix incremental (padding interno,
    // ajuste de iconAnchor) queda como sprint aparte si el recorte
    // resulta feo en smoke.
    return (
        <div className="h-[580px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative bg-slate-50 isolate" style={{ zIndex: 0 }}>
            <MapContainer
                center={CENTER_SANTIAGO}
                zoom={11}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
                className="leaflet-container"
                zoomControl={false}
            >
                {/* Sprint z-index-maps commit 2 (2026-09-04) — migrado de
                    OpenStreetMap directo a CARTO Voyager con API key.
                    Motivo: unifica estilo visual con LocationMap +
                    LocationPicker (los 3 mapas del sitio quedan iguales).
                    La divergencia OSM/CARTO se notaba a ojo tras el cierre
                    de carto-key. Attribution con AMBOS créditos (requisito
                    contractual free tier CARTO).
                    subdomains 'abcd' + maxZoom 20 siguen la doc oficial
                    CARTO (mejor reparto de carga sobre 4 subdominios vs
                    3 default Leaflet; zoom 20 habilitado que CARTO
                    soporta y el default Leaflet 18 recortaba).
                    Env var NEXT_PUBLIC_CARTO_TILES_KEY ya en Vercel
                    Prod/Preview/Dev desde sprint carto-key. */}
                <TileLayer
                    url={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${process.env.NEXT_PUBLIC_CARTO_TILES_KEY ?? ''}`}
                    subdomains="abcd"
                    maxZoom={20}
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                <ZoomControl position="topleft" />
                <MapUpdater services={services} />

                {markers.map((s, idx) => {
                    const price = s.precio_desde;
                    const formattedPrice = price >= 1000
                        ? `$${(price / 1000).toLocaleString('es-CL', { maximumFractionDigits: 0 })}k`
                        : `$${price.toLocaleString('es-CL')}`;

                    const priceIcon = L.divIcon({
                        className: 'bg-transparent border-none',
                        html: `
                            <div class="relative group cursor-pointer transform transition-transform hover:scale-110 hover:z-50">
                                <div class="bg-white text-slate-900 font-semibold text-xs px-2.5 py-1.5 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.18)] border border-slate-200 flex items-center justify-center whitespace-nowrap hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors">
                                    ${formattedPrice}
                                </div>
                                <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-b border-r border-slate-200 transition-colors"></div>
                            </div>
                        `,
                        iconSize: [56, 40],
                        iconAnchor: [28, 40],
                    });

                    const coverImage = s.fotos?.[0] || s.proveedor_foto || null;

                    return (
                        <div key={`${s.servicio_id}-${idx}`}>
                            {/* Area de cobertura aproximada */}
                            <Circle
                                center={[s.lat, s.lng]}
                                radius={600}
                                pathOptions={{
                                    color: '#16A34A',
                                    fillColor: '#22C55E',
                                    fillOpacity: 0.07,
                                    weight: 1,
                                    dashArray: '4, 4'
                                }}
                            />

                            {/* Precio pill marker */}
                            <Marker
                                position={[s.lat, s.lng]}
                                icon={priceIcon}
                            >
                                <Popup className="custom-popup" closeButton={false} offset={[0, -32]} maxWidth={220}>
                                    <div className="min-w-[200px]">
                                        {coverImage && (
                                            /* Sprint popup-fix (2026-09-04) — h-28 (112px) → h-32 (128px).
                                               Motivo: aspect ratio del contenedor era ~2:1 (220x112), muy
                                               horizontal para fotos típicas de mascotas (3:2 o 4:3). Con
                                               object-cover default center, foto quedaba muy recortada
                                               arriba y abajo. h-32 mejora aspect ratio a ~1.7:1 — más
                                               cerca de fotos típicas, menos recorte. Iterar a h-36 si
                                               en smoke sigue apretado. Sin object-position — que la
                                               evidencia del smoke decida si conviene agregar. */
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={coverImage}
                                                alt={s.titulo}
                                                className="w-full h-32 object-cover rounded-t-xl -mx-4 -mt-4 mb-3"
                                                style={{ width: 'calc(100% + 32px)', marginLeft: '-16px', marginTop: '-16px' }}
                                            />
                                        )}
                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-0.5">{s.categoria_nombre}</p>
                                        <h3 className="font-semibold text-slate-900 text-sm leading-tight mb-1 line-clamp-2">{s.titulo}</h3>
                                        <p className="text-xs text-slate-500 mb-2 truncate">{s.proveedor_nombre} · {s.proveedor_comuna}</p>

                                        <div className="flex items-center gap-1.5 mb-3">
                                            <div className="flex items-center text-xs font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                                <span className="text-accent-600 mr-1">★</span>
                                                {Number(s.rating_promedio).toFixed(1)}
                                            </div>
                                            <span className="text-xs text-slate-400">({s.total_evaluaciones} reseñas)</span>
                                        </div>

                                        <div className="flex items-baseline gap-1 mb-3">
                                            <span className="font-semibold text-lg text-slate-900">${price.toLocaleString('es-CL')}</span>
                                            <span className="text-xs text-slate-500">/ {s.unidad_precio}</span>
                                        </div>

                                        {/* Sprint popup-fix (2026-09-04) — `!text-white` con Tailwind
                                            `!` prefix (= `color: white !important` en CSS).
                                            Motivo: Leaflet incluye en su CSS default el selector
                                            `.leaflet-container a { color: #0078A8 }` (verificado por
                                            PO en DevTools de prod 2026-09-04 — regla visible en el
                                            panel de estilos del inspector con selector real `.leaflet-container a`,
                                            no `.leaflet-popup-content a` como estimé inicialmente).
                                            Especificidad `(0,0,1,1)` de Leaflet > `(0,0,1,0)` de
                                            `.text-white` de Tailwind → Leaflet ganaba silente y el
                                            botón renderea azul-verdoso apagado sobre fondo verde
                                            (bg-accent-600) → efecto "verde apenas más claro" que
                                            reportó el PO. `text-white` estaba en la clase pero NO
                                            se aplicaba.
                                            `!important` (via Tailwind `!`) supera especificidad —
                                            gana sobre el default de Leaflet. Cero cambio en el resto
                                            del botón. Fix quirúrgico.
                                            El selector `.leaflet-container a` es amplio (cubre TODOS
                                            los links dentro del mapa, incluyendo los del attribution
                                            control "OpenStreetMap" y "CARTO"). Esos otros links viven
                                            sobre fondo blanco/transparente del control Leaflet — el
                                            azul de Leaflet ahí funciona (contraste aceptable), no
                                            necesitan el override. Solo este CTA sobre fondo verde
                                            sufría el bug. Verificado por auditor 2026-09-04. */}
                                        <Link
                                            href={`/proveedor/${s.proveedor_id}`}
                                            className="block w-full py-2 bg-accent-600 !text-white text-center rounded-xl text-sm font-medium tracking-wide hover:bg-accent-700 transition-colors shadow-sm"
                                        >
                                            Ver perfil completo
                                        </Link>
                                    </div>
                                </Popup>
                            </Marker>
                        </div>
                    );
                })}
            </MapContainer>

            <style jsx global>{`
                .leaflet-popup-content-wrapper {
                    border-radius: 16px;
                    padding: 0;
                    overflow: hidden;
                    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.15);
                }
                .leaflet-popup-content {
                    margin: 16px;
                }
                .leaflet-popup-tip-container {
                    display: none;
                }
            `}</style>
        </div>
    );
}
