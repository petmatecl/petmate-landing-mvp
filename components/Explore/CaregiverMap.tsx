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
                                {/* Sprint popup-fix commit 2 (2026-09-04) — reestructuración del JSX
                                    del popup para arreglar el bug de imagen recortada a la derecha.

                                    MECANISMO DEL BUG (verificado empíricamente por PO en consola de prod):
                                      - .leaflet-popup-content-wrapper (padre): 253px de ancho (Leaflet
                                        calcula dinámicamente basado en content).
                                      - .leaflet-popup-content (con override margin: 16px uniforme): 221px
                                        de ancho (253 - 32 de margin). Confirmado por
                                        `getComputedStyle(...).margin` = "16px".
                                      - <img w-full>: 221px de ancho (100% del content). Confirmado por
                                        Leaflet inline `width: 221px` en el content.
                                      - Hack anterior: `w-full` + `style={{ width: 'calc(100% + 32px)' }}`
                                        + `marginLeft: -16px`. Intención: imagen 253px alineada al borde
                                        izquierdo del wrapper.
                                      - Bug: **Tailwind reset aplica `img { max-width: 100% }`** por
                                        default. Confirmado por PO con
                                        `getComputedStyle('.leaflet-popup-content img').maxWidth` = "100%".
                                        El `calc(100% + 32px)` intenta pedir 253px pero max-width limita
                                        a 221px. **La imagen NO crece**. Sí se corre 16px a la izquierda
                                        (marginLeft aplica sin restricción), pero sin crecer.
                                      - Resultado: imagen de 221px corrida 16px a la izquierda cubre desde
                                        `-16px` hasta `205px`. Wrapper mide 253px. **Franja blanca de
                                        48-60px sin cubrir a la derecha** (48 en cálculo estricto, ~60 en
                                        percepción del PO por bordes redondeados).

                                    LO CONFUSO ERA QUE EL HACK FUNCIONABA A MEDIAS: el desplazamiento
                                    izquierdo sí (margin negativo sin límite), el ensanchamiento NO
                                    (limitado por max-width). Si ninguna hubiera funcionado, la imagen
                                    estaría centrada y nadie habría notado nada.

                                    FIX ESTRUCTURAL (Opción R, aprobada por PO 2026-09-04):
                                    - CSS override: `.leaflet-popup-content { margin: 0 }` (era 16px).
                                      Content pasa a ocupar todo el wrapper (253px de content).
                                    - JSX: imagen SIN hacks negativos ni width extendido — solo `w-full
                                      h-32 object-cover`. Al 100% del content nuevo (253px), llega
                                      naturalmente a los dos bordes del wrapper.
                                    - Div interno `p-4` (padding 16px, equivalente al margin original)
                                      contiene solo el texto — reemplaza el "aire" que daba el margin
                                      del content, pero sin afectar la imagen.

                                    ROBUSTEZ: cero número hardcodeado en el hack de la imagen. Un upgrade
                                    de Leaflet que cambie el padding default del content NO rompe nada —
                                    la imagen sigue al 100% del content, que sigue ocupando el wrapper.
                                    El único CSS override que sigue dependiendo del layout de Leaflet es
                                    el `margin: 0` del content, pero es una assertion clara y auditable
                                    ("queremos que el content ocupe el wrapper entero"), no un hack de
                                    valor mágico.
                                    ═══════════════════════════════════════════════════════════════════ */}
                                <Popup className="custom-popup" closeButton={false} offset={[0, -32]} maxWidth={220}>
                                    <div className="min-w-[200px]">
                                        {coverImage && (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={coverImage}
                                                alt={s.titulo}
                                                className="w-full h-32 object-cover"
                                            />
                                        )}
                                        <div className="p-4">
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

                                            {/* Sprint popup-fix commit 1 (2026-09-04) — `!text-white` con
                                                Tailwind `!` prefix (= `color: white !important` en CSS).
                                                Motivo: Leaflet incluye `.leaflet-container a { color:
                                                #0078A8 }` en su CSS default. Verificado por PO en DevTools
                                                de prod 2026-09-04 — selector real `.leaflet-container a`
                                                (no `.leaflet-popup-content a` como estimé inicialmente).
                                                Especificidad `(0,0,1,1)` > `.text-white` `(0,0,1,0)` →
                                                Leaflet ganaba silente y el botón renderea azul-verdoso
                                                sobre fondo verde → efecto "verde apenas más claro".
                                                `!important` (via `!`) supera especificidad → text-white
                                                efectivo. El selector `.leaflet-container a` cubre TODOS
                                                los links del mapa (incluyendo attribution "OpenStreetMap"
                                                y "CARTO"), pero esos viven sobre fondo blanco donde el
                                                azul funciona — solo este CTA sobre fondo verde sufría
                                                el bug. */}
                                            <Link
                                                href={`/proveedor/${s.proveedor_id}`}
                                                className="block w-full py-2 bg-accent-600 !text-white text-center rounded-xl text-sm font-medium tracking-wide hover:bg-accent-700 transition-colors shadow-sm"
                                            >
                                                Ver perfil completo
                                            </Link>
                                        </div>
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
