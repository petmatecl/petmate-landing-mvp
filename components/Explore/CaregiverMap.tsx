import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, Circle, CircleMarker } from "react-leaflet";
import L from "leaflet";
// CSS is imported in _app.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

// Santiago Centroid
const CENTER_SANTIAGO: [number, number] = [-33.4489, -70.6693];

// Mapping Comunas to Lat/Lng (Approximate Centers)
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

// Helper to find coords case-insensitively
function getComunaCoords(comunaName: string): [number, number] {
    if (!comunaName) return CENTER_SANTIAGO;
    const normalized = comunaName.trim().toLowerCase();

    // Find key that matches case-insensitively
    const match = Object.keys(COMUNA_COORDS).find(k => k.toLowerCase() === normalized);
    return match ? COMUNA_COORDS[match] : CENTER_SANTIAGO;
}

// Component to update view when sitters change
function MapUpdater({ sitters }: { sitters: any[] }) {
    const map = useMap();

    useEffect(() => {
        // Force resize calculation after mount to fix "grey box"
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100);
        return () => clearTimeout(timer);
    }, [map]);

    useEffect(() => {
        if (sitters.length > 0) {
            // Calculate bounds
            const bounds = L.latLngBounds(
                sitters.map(s => getComunaCoords(s.comuna))
            );

            // If only one point (or very close points), extend bounds slightly or use specific zoom
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
            } else {
                map.setView(CENTER_SANTIAGO, 12);
            }
        } else {
            map.setView(CENTER_SANTIAGO, 12);
        }
    }, [sitters, map]);

    return null;
}

export default function CaregiverMap({ sitters, isAuthenticated }: CaregiverMapProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        fixLeafletIcons();
        setMounted(true);
    }, []);

    // Memoize markers to keep random offset consistent
    const markers = useMemo(() => {
        return sitters.map(s => {
            const baseCoords = getComunaCoords(s.comuna);
            // Add slight jitter for privacy and separation
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

    if (!mounted) return null;

    return (
        <div className={`h-[600px] w-full rounded-3xl overflow-hidden border-2 border-slate-200 shadow-lg relative bg-slate-50 ${!isAuthenticated ? 'blur-sm' : ''}`}>
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
                className="leaflet-container"
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {/* Default Zoom Control */}
                <ZoomControl position="topleft" />

                {markers.map((sitter) => {
                    const price = sitter.tarifa_servicio_en_casa || sitter.tarifa_servicio_a_domicilio || 15000;
                    const formattedPrice = `$${(price / 1000).toLocaleString('es-CL', { maximumFractionDigits: 0 })}k`;

                    const priceIcon = L.divIcon({
                        className: 'bg-transparent border-none',
                        html: `
                            <div class="relative group cursor-pointer transform transition-transform hover:scale-110 hover:z-50">
                                <div class="bg-white text-slate-900 font-bold text-xs px-2.5 py-1.5 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.2)] border border-slate-200 flex items-center justify-center whitespace-nowrap hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors">
                                    ${formattedPrice}
                                </div>
                                <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-b border-r border-slate-200 group-hover:bg-slate-900 group-hover:border-slate-900 transition-colors"></div>
                            </div>
                        `,
                        iconSize: [50, 40], // Enough space for the pill
                        iconAnchor: [25, 40], // Tip of the "arrow" (bottom center approx)
                    });

                    return (
                        <div key={sitter.id}>
                            {/* Area de Servicio (Radio Aproximado) */}
                            <Circle
                                center={[sitter.lat, sitter.lng]}
                                radius={800} // 800 meters approximate radius
                                pathOptions={{
                                    color: '#059669', // emerald-600 (Darker border)
                                    fillColor: '#10b981', // emerald-500 (Vivid fill)
                                    fillOpacity: 0.1, // Reduced for cleaner look with pills
                                    weight: 1, // Thinner border
                                    dashArray: '5, 5'
                                }}
                            />

                            {/* Price Pill Marker */}
                            <Marker
                                position={[sitter.lat, sitter.lng]}
                                icon={priceIcon}
                            >
                                <Popup className="custom-popup" closeButton={false} offset={[0, -30]}>
                                    <div className="min-w-[200px]">
                                        <h3 className="font-bold text-slate-900 text-base mb-0.5">{sitter.nombre} {sitter.apellido_p?.charAt(0)}.</h3>
                                        <p className="text-xs text-slate-500 mb-2 truncate max-w-[180px]">{sitter.comuna}</p>

                                        <div className="flex items-center gap-1.5 mb-3">
                                            <div className="flex items-center text-xs font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                                                <span className="text-emerald-500 mr-1">★</span>
                                                {sitter.promedio_calificacion || 5.0}
                                            </div>
                                            <span className="text-xs text-slate-400">({sitter.total_reviews || 0} reseñas)</span>
                                        </div>

                                        <div className="flex items-end gap-1 mb-3">
                                            <span className="font-bold text-lg text-slate-900">${price.toLocaleString('es-CL')}</span>
                                            <span className="text-xs text-slate-500 mb-1">/noche</span>
                                        </div>

                                        <Link
                                            href={isAuthenticated ? `/sitter/${sitter.id}` : "/register"}
                                            className="block w-full py-2.5 bg-slate-900 text-white text-center rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
                                        >
                                            {isAuthenticated ? "Ver Perfil" : "Regístrate"}
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
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                }
                .leaflet-popup-content {
                    margin: 16px;
                }
            `}</style>
        </div>
    );
}
