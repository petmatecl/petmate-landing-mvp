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
    radius?: number; // In meters, default 500 for approximate
    height?: string;
}

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

export default function LocationMap({ lat, lng, approximate = true, radius = 800, height = "300px" }: LocationMapProps) {
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
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <ChangeView center={center} zoom={zoom} />

                {approximate ? (
                    <Circle
                        center={center}
                        radius={radius}
                        pathOptions={{
                            color: '#10b981', // emerald-500
                            fillColor: '#10b981',
                            fillOpacity: 0.2,
                            weight: 2
                        }}
                    />
                ) : (
                    <Marker position={center} />
                )}
            </MapContainer>
            <div className="text-[10px] text-slate-400 text-right bg-slate-50 px-2 py-1 border-t">
                © OpenStreetMap contributors, © CartoDB
            </div>
        </div>
    );
}
