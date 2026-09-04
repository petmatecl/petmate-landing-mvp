import { MapContainer, TileLayer, Circle, useMap, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix Leaflet/Next.js icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationMapProps {
    lat: number;
    lng: number;
    approximate?: boolean; // If true, show circle. If false, show marker.
    radius?: number; // In meters, default 1000 — matchea PUBLIC_COORD_RADIUS_METERS
    height?: string;
}

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

// Default radius 1000m: matchea la precision publica de 2 decimales que
// aplica roundCoordsForPublic. Sin esto, el Circle podria ser mas chico
// que el ruido de redondeo y dar falsa sensacion de exactitud.
export default function LocationMap({ lat, lng, approximate = true, radius = 1000, height = "300px" }: LocationMapProps) {
    const center: [number, number] = [lat, lng];
    const zoom = approximate ? 14 : 15;

    // Sprint carto-key (2026-09-04) — fix estructural de layout.
    // El div de attribution debajo del MapContainer NO se renderizaba
    // visible porque el padre tenía `height:300px + overflow:hidden` y
    // el MapContainer con `height:100%` ocupaba TODO el padre → el div
    // hermano quedaba empujado fuera del área visible + recortado. Bug
    // PREEXISTENTE al sprint (desde 8f1d766 dic 2025 cuando se creó el
    // componente). No lo introdujimos, el sprint lo hizo visible porque
    // el texto pasa a ser requisito contractual con la key CARTO.
    // Fix: `flex flex-col` en el padre + `flex-1` en el MapContainer
    // (en vez de height:100%). Attribution ocupa su altura natural
    // debajo (~24px con font-size 10px + padding), MapContainer ocupa
    // lo que sobra. Ambos visibles siempre.
    return (
        <div className="isolate flex flex-col" style={{ height, width: '100%', borderRadius: '1rem', overflow: 'hidden', position: 'relative', zIndex: 0 }}>
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ width: '100%', flex: 1 }}
                scrollWheelZoom={false}
                attributionControl={false}
            >
                {/* Sprint carto-key (2026-09-04) — tiles CARTO Voyager con
                    API key. Sin key, CARTO devolvía marca de agua "API KEY
                    REQUIRED" atravesando el fondo (política 2024/2025).
                    Con key limpio.

                    URL preserva el {r} placeholder de Leaflet (expande a
                    "@2x" en pantallas retina). Verificado empíricamente
                    contra CARTO 2026-09-04: tanto `.png?key=` como
                    `@2x.png?key=` responden 200 OK — CARTO soporta retina
                    con key. Doc oficial CARTO omite {r} por simplificación
                    pero la infra lo sirve.

                    ATRIBUCIÓN CARTO + OSM es requisito CONTRACTUAL del
                    free tier — "keeping CARTO and OpenStreetMap attribution
                    visible". NO REMOVER ninguna de las 2. Ver el div
                    debajo del MapContainer.

                    Fallback `?? ''` para que el build no rompa si la env
                    var falta en un clon local sin .env — degrada al modo
                    "marca de agua" (el estado pre-sprint), no crashea.

                    Trigger deuda futura anotada en BACKLOG: CARTO está
                    retirando raster tiles. Cuando anuncien deprecation,
                    la rama `map-tiles` (SHA caf3972) tiene la migración a
                    OSM lista para mergear como plan B. */}
                <TileLayer
                    url={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${process.env.NEXT_PUBLIC_CARTO_TILES_KEY ?? ''}`}
                />
                <ChangeView center={center} zoom={zoom} />

                {approximate ? (
                    <Circle
                        center={center}
                        radius={radius}
                        pathOptions={{
                            color: '#16A34A', // accent-600 hex
                            fillColor: '#16A34A',
                            fillOpacity: 0.2,
                            weight: 2
                        }}
                    />
                ) : (
                    <Marker position={center} />
                )}
            </MapContainer>
            {/* Sprint carto-key (2026-09-04) — atribución OpenStreetMap +
                CARTO. Requisito CONTRACTUAL del free tier CARTO ("keeping
                CARTO and OpenStreetMap attribution visible"). NO REMOVER
                ninguno de los 2 créditos. Actualizado a "© CARTO" desde
                "© CartoDB" para alinear con formato oficial CARTO 2026
                (CartoDB era el nombre histórico). */}
            <div className="text-[10px] text-slate-400 text-right bg-slate-50 px-2 py-1 border-t">
                © OpenStreetMap contributors, © CARTO
            </div>
        </div>
    );
}
