import { MapContainer, TileLayer, useMap, ZoomControl, Circle } from "react-leaflet";
import L from "leaflet";
// Sprint E-4 MAP-BURBUJAS (2026-09-15) — clustering con conteo via
// leaflet.markercluster (la librería base, sin wrapper React). Cero peer
// dep conflict con react-leaflet 4. El wrapper `react-leaflet-cluster`
// que probamos primero declara peer `@react-leaflet/core ^3.0.0` que
// choca con nuestro `react-leaflet 4.2.1` (core 2.x); ver historia en
// el commit `9f7a776` que se revirtió con este approach. Al importar
// directamente `leaflet.markercluster`, extiende el namespace global de
// Leaflet con `L.markerClusterGroup(...)` sin tocar React. Usamos
// `useMap()` del react-leaflet para obtener la instancia del mapa y
// gestionamos el clusterGroup manualmente en un useEffect.
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
// CSS is imported in _app.tsx
import { useEffect, useMemo, useState } from "react";
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

interface MarkerData extends ServiceResult {
    lat: number;
    lng: number;
    hasRealCoords: boolean;
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

// Escapa un string para uso seguro dentro de un atributo HTML de doble
// comilla (title, href, alt). Sin este escape, valores con `"` romperían
// el HTML del popup (bindPopup) al inyectarse en runtime.
function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Sprint E-4 MAP-BURBUJAS (2026-09-15) — HTML del popup construido como
// string. Antes vivía como JSX dentro del <Popup> del react-leaflet.
// Al mover el clustering al approach imperativo (bindPopup nativo), el
// contenido pasa a HTML plano. Cambios semánticos:
//   - `<Link>` de Next.js → `<a href>` plano. Trade-off aceptado: el
//     click gatilla navegación full page en vez de client-side routing.
//     Aceptable para un CTA de popup — el user viene desde la vista mapa
//     con la intención de saltar a la ficha; el reload de una página
//     no compromete UX.
//   - `object-cover object-top` + `h-32` + `min-w-[200px]` + `p-4` +
//     tipografía slate/accent: mismas clases Tailwind — Tailwind procesa
//     este archivo (safelist automática), así que las clases están
//     disponibles en el bundle CSS.
function buildPopupHtml(s: MarkerData): string {
    const price = s.precio_desde;
    const formattedPrice = price >= 1000
        ? `$${(price / 1000).toLocaleString('es-CL', { maximumFractionDigits: 0 })}k`
        : `$${price.toLocaleString('es-CL')}`;
    const coverImage = s.fotos?.[0] || s.proveedor_foto || null;
    const imgHtml = coverImage
        ? `<img src="${escapeHtml(coverImage)}" alt="${escapeHtml(s.titulo)}" class="w-full h-32 object-cover object-top" />`
        : '';
    // Mismo copy y clases que el <Popup> anterior; solo pasa de JSX a HTML.
    return `
        <div class="min-w-[200px]">
            ${imgHtml}
            <div class="p-4">
                <p class="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-0.5">${escapeHtml(s.categoria_nombre)}</p>
                <h3 class="font-semibold text-slate-900 text-sm leading-tight mb-1 line-clamp-2">${escapeHtml(s.titulo)}</h3>
                <p class="text-xs text-slate-500 mb-2 truncate">${escapeHtml(s.proveedor_nombre)} · ${escapeHtml(s.proveedor_comuna)}</p>

                <div class="flex items-center gap-1.5 mb-3">
                    <div class="flex items-center text-xs font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        <span class="text-accent-600 mr-1">★</span>
                        ${Number(s.rating_promedio).toFixed(1)}
                    </div>
                    <span class="text-xs text-slate-400">(${s.total_evaluaciones} reseñas)</span>
                </div>

                <div class="flex items-baseline gap-1 mb-3">
                    <span class="font-semibold text-lg text-slate-900">$${price.toLocaleString('es-CL')}</span>
                    <span class="text-xs text-slate-500">/ ${escapeHtml(s.unidad_precio)}</span>
                </div>

                <a href="/proveedor/${encodeURIComponent(s.proveedor_id)}" class="block w-full py-2 bg-accent-600 text-white text-center rounded-xl text-sm font-medium tracking-wide hover:bg-accent-700 transition-colors shadow-sm">
                    Ver perfil completo
                </a>
            </div>
        </div>
    `;
}

// Sprint E-4 MAP-BURBUJAS (2026-09-15) — clustering imperativo.
// Componente hijo del MapContainer que usa useMap() para obtener la
// instancia y gestiona el markerClusterGroup en un useEffect. La lib
// leaflet.markercluster extiende `L` globalmente al importarse; el
// tipo se resuelve via `@types/leaflet.markercluster`. Cuando `markers`
// cambia, se limpia y se re-crea el grupo — barato dado <100 servicios.
function ClusteredPriceMarkers({ markers }: { markers: MarkerData[] }) {
    const map = useMap();

    useEffect(() => {
        // L.markerClusterGroup existe en runtime tras el import top-level;
        // los tipos vienen de @types/leaflet.markercluster.
        const clusterGroup = (L as any).markerClusterGroup({
            showCoverageOnHover: false,
            spiderfyOnMaxZoom: true,
            disableClusteringAtZoom: 15,
            maxClusterRadius: 40,
            chunkedLoading: true,
        });

        markers.forEach((s) => {
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

            const marker = L.marker([s.lat, s.lng], { icon: priceIcon });
            marker.bindPopup(buildPopupHtml(s), {
                className: 'custom-popup',
                closeButton: false,
                offset: [0, -32],
                maxWidth: 220,
            });
            clusterGroup.addLayer(marker);
        });

        map.addLayer(clusterGroup);

        return () => {
            // Al desmontar (o cambio de markers), limpiar el grupo entero.
            // Alternativa .removeLayers() por marker es innecesaria para
            // <100 servicios: la re-creación completa es simple y correcta.
            map.removeLayer(clusterGroup);
        };
    }, [map, markers]);

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
    const markers = useMemo<MarkerData[]>(() => {
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

                {/* Sprint E-4 MAP-BURBUJAS (2026-09-15) — Circles de cobertura
                    quedan como overlays react-leaflet (no clusterizables). El
                    clustering aplica solo a los pill markers de precio, via
                    el componente hijo ClusteredPriceMarkers que gestiona el
                    L.markerClusterGroup imperativo. */}
                {markers.map((s, idx) => (
                    <Circle
                        key={`circle-${s.servicio_id}-${idx}`}
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
                ))}
                <ClusteredPriceMarkers markers={markers} />
            </MapContainer>

            <style jsx global>{`
                .leaflet-popup-content-wrapper {
                    border-radius: 16px;
                    padding: 0;
                    overflow: hidden;
                    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.15);
                }
                /* Sprint popup-fix commit 2 (2026-09-04) — margin 0 (era 16px).
                   El content ahora llena todo el wrapper. Ver comentario extenso
                   en el JSX del <Popup> arriba para el mecanismo completo del
                   bug y por qué esto (más p-4 en div interno de texto + imagen
                   sin hacks negativos) es el fix estructural. */
                .leaflet-popup-content {
                    margin: 0;
                }
                .leaflet-popup-tip-container {
                    display: none;
                }
            `}</style>
        </div>
    );
}
