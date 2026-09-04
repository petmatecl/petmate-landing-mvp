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

    return (
        <div className="isolate" style={{ height, width: '100%', borderRadius: '1rem', overflow: 'hidden', position: 'relative', zIndex: 0 }}>
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
                attributionControl={false}
            >
                {/* Sprint map-tiles (2026-09-04) — migrado de CARTO Voyager
                    a OpenStreetMap directo. Motivo: CARTO cambió su política
                    en 2024/2025 exigiendo API key para basemaps públicos
                    (marca de agua "API KEY REQUIRED" atravesando el mapa)
                    y está retirando los raster tiles. OSM se elige por (a)
                    consistencia con CaregiverMap que ya lo usa, (b) sin
                    dependencia de key, (c) estable a mediano plazo. Ver
                    ACTA_MAP_TILES.md.
                    URL sin `{r}` retina — OSM no lo soporta con el mismo
                    pattern. Pérdida de resolución en pantallas retina
                    aceptable, verificado con /explorar en prod (mismo
                    tile provider hoy) por PO 2026-09-04.
                    Trigger post-launch para migrar a proveedor comercial
                    con free tier + API key (Stadia/Mapbox/CARTO): OSM
                    Tile Usage Policy limita a 2 req/sec/user + uso
                    comercial pesado no permitido. Ver BACKLOG. */}
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
            <div className="text-[10px] text-slate-400 text-right bg-slate-50 px-2 py-1 border-t">
                © OpenStreetMap contributors
            </div>
        </div>
    );
}
