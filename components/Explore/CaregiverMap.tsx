import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import Link from "next/link";

// Fix Leaflet default icon issue in Next.js
useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
}, []);

// Santiago Centroid
const CENTER_SANTIAGO: [number, number] = [-33.4489, -70.6693];

// Mapping Comunas to Lat/Lng
const COMUNA_COORDS: Record<string, [number, number]> = {
    "Santiago": [-33.4489, -70.6693],
    "Providencia": [-33.4314, -70.6093],
    "Las Condes": [-33.4131, -70.5810],
    "Ñuñoa": [-33.4569, -70.6033],
    "La Reina": [-33.4433, -70.5367],
    "Vitacura": [-33.4005, -70.5972],
    "Lo Barnechea": [-33.3524, -70.5186],
    "Macul": [-33.4939, -70.5976],
    "Peñalolén": [-33.4862, -70.5385],
    "La Florida": [-33.5297, -70.5872],
    "Puente Alto": [-33.6117, -70.5758],
    "Maipú": [-33.5106, -70.7583],
    "Estación Central": [-33.4633, -70.7061],
    "Quinta Normal": [-33.4363, -70.6975],
    "Independencia": [-33.4150, -70.6550],
    "Recoleta": [-33.4069, -70.6389],
    "Huechuraba": [-33.3768, -70.6398],
    "Conchalí": [-33.3850, -70.6869],
    "Renca": [-33.4050, -70.7303],
    "Quilicura": [-33.3667, -70.7300],
    "Pudahuel": [-33.4475, -70.7694],
    "Lo Prado": [-33.4450, -70.7300],
    "Cerro Navia": [-33.4244, -70.7369],
    "Cerrillos": [-33.5042, -70.7183],
    "Pedro Aguirre Cerda": [-33.4839, -70.6781],
    "San Miguel": [-33.4933, -70.6533],
    "San Joaquín": [-33.4961, -70.6272],
    "La Cisterna": [-33.5358, -70.6653],
    "San Ramón": [-33.5414, -70.6433],
    "La Granja": [-33.5361, -70.6133],
    "El Bosque": [-33.5658, -70.6697],
    "La Pintana": [-33.5853, -70.6319],
    "San Bernardo": [-33.5833, -70.7000]
};

interface CaregiverMapProps {
    sitters: any[];
    isAuthenticated: boolean;
}

// Component to update view when sitters change
function MapUpdater({ sitters }: { sitters: any[] }) {
    const map = useMap();

    useEffect(() => {
        if (sitters.length > 0) {
            // Calculate bounds
            const bounds = L.latLngBounds(
                sitters.map(s => {
                    const coords = COMUNA_COORDS[s.comuna] || COMUNA_COORDS["Santiago"];
                    return coords;
                })
            );
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
        } else {
            map.setView(CENTER_SANTIAGO, 11);
        }
    }, [sitters, map]);

    return null;
}

export default function CaregiverMap({ sitters, isAuthenticated }: CaregiverMapProps) {
    // Memoize markers to keep random offset consistent
    const markers = useMemo(() => {
        return sitters.map(s => {
            const baseCoords = COMUNA_COORDS[s.comuna] || COMUNA_COORDS["Santiago"];
            // Add slight jitter so sitters in same comuna don't perfectly overlap
            // +/- 0.005 degrees is approx 500m
            const lat = baseCoords[0] + (Math.random() - 0.5) * 0.008;
            const lng = baseCoords[1] + (Math.random() - 0.5) * 0.008;
            return {
                ...s,
                lat,
                lng
            };
        });
    }, [sitters]);

    return (
        <div className={`h-[600px] w-full rounded-3xl overflow-hidden border border-slate-200 shadow-lg relative ${!isAuthenticated ? 'blur-sm' : ''}`}>
            {!isAuthenticated && (
                <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/30 backdrop-blur-sm pointer-events-none">
                    {/* Overlay handled by parent mostly, but let's keep interactions blocked */}
                </div>
            )}

            <MapContainer
                center={CENTER_SANTIAGO}
                zoom={11}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                <MapUpdater sitters={sitters} />

                {markers.map((sitter) => (
                    <Marker
                        key={sitter.id}
                        position={[sitter.lat, sitter.lng]}
                    >
                        <Popup className="custom-popup">
                            <div className="min-w-[200px]">
                                <h3 className="font-bold text-slate-800 text-base">{sitter.nombre} {sitter.apellido_p?.charAt(0)}.</h3>
                                <p className="text-xs text-slate-500 mb-2">{sitter.comuna}</p>
                                <div className="flex items-center gap-1 mb-2">
                                    <span className="text-emerald-500 font-bold">★ {sitter.promedio_calificacion || 5.0}</span>
                                    <span className="text-slate-400 text-xs">({sitter.total_reviews || 0})</span>
                                </div>
                                <p className="font-bold text-slate-900 mb-3">
                                    ${(sitter.tarifa_servicio_en_casa || 15000).toLocaleString('es-CL')}
                                    <span className="text-xs font-normal text-slate-400">/noche</span>
                                </p>

                                <Link
                                    href={isAuthenticated ? `/sitter/${sitter.id}` : "/register"}
                                    className="block w-full py-2 bg-emerald-600 text-white text-center rounded-lg text-sm font-bold hover:bg-emerald-700"
                                >
                                    {isAuthenticated ? "Ver Perfil" : "Regístrate para ver"}
                                </Link>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            <style jsx global>{`
                .leaflet-popup-content-wrapper {
                    border-radius: 16px;
                    padding: 0;
                    overflow: hidden;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                }
                .leaflet-popup-content {
                    margin: 16px;
                }
            `}</style>
        </div>
    );
}
