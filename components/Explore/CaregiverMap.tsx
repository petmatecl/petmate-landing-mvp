import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, Circle } from "react-leaflet";
import L from "leaflet";
// CSS is imported in _app.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ServiceResult } from "./ServiceCard";

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

// Santiago Centroid (fallback)
const CENTER_SANTIAGO: [number, number] = [-33.4489, -70.6693];

// Mapping Comunas to Lat/Lng (Approximate Centers) — fallback when DB lat/lng is null
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
    "San Bernardo": [-33.5833, -70.7000],
    "Antofagasta": [-23.6510, -70.3954],
    "Valparaíso": [-33.0472, -71.6127],
    "Viña del Mar": [-33.0241, -71.5516],
    "Concepción": [-36.8201, -73.0444],
    "Temuco": [-38.7359, -72.5904],
    "Rancagua": [-34.1708, -70.7444],
    "Talca": [-35.4264, -71.6553],
    "La Serena": [-29.9027, -71.2520],
    "Coquimbo": [-29.9533, -71.3375],
    "Iquique": [-20.2140, -70.1522],
    "Arica": [-18.4783, -70.3126],
    "Puerto Montt": [-41.4693, -72.9424],
    "Osorno": [-40.5740, -73.1329],
    "Valdivia": [-39.8142, -73.2459],
    "Punta Arenas": [-53.1638, -70.9171],
};

interface CaregiverMapProps {
    services: ServiceResult[];
}

// Helper to get coords from commune name (case-insensitive)
function getComunaCoords(comunaName: string): [number, number] {
    if (!comunaName) return CENTER_SANTIAGO;
    const normalized = comunaName.trim().toLowerCase();
    const match = Object.keys(COMUNA_COORDS).find(k => k.toLowerCase() === normalized);
    return match ? COMUNA_COORDS[match] : CENTER_SANTIAGO;
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

    return (
        <div className="h-[580px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative bg-slate-50">
            <MapContainer
                center={CENTER_SANTIAGO}
                zoom={11}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
                className="leaflet-container"
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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
                                <div class="bg-white text-slate-900 font-bold text-xs px-2.5 py-1.5 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.18)] border border-slate-200 flex items-center justify-center whitespace-nowrap hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors">
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
                                    color: '#059669',
                                    fillColor: '#10b981',
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
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={coverImage}
                                                alt={s.titulo}
                                                className="w-full h-28 object-cover rounded-t-xl -mx-4 -mt-4 mb-3"
                                                style={{ width: 'calc(100% + 32px)', marginLeft: '-16px', marginTop: '-16px' }}
                                            />
                                        )}
                                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5">{s.categoria_nombre}</p>
                                        <h3 className="font-bold text-slate-900 text-sm leading-tight mb-1 line-clamp-2">{s.titulo}</h3>
                                        <p className="text-xs text-slate-500 mb-2 truncate">{s.proveedor_nombre} · {s.proveedor_comuna}</p>

                                        <div className="flex items-center gap-1.5 mb-3">
                                            <div className="flex items-center text-xs font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                                                <span className="text-emerald-500 mr-1">★</span>
                                                {Number(s.rating_promedio).toFixed(1)}
                                            </div>
                                            <span className="text-xs text-slate-400">({s.total_evaluaciones} reseñas)</span>
                                        </div>

                                        <div className="flex items-baseline gap-1 mb-3">
                                            <span className="font-bold text-lg text-slate-900">${price.toLocaleString('es-CL')}</span>
                                            <span className="text-xs text-slate-500">/ {s.unidad_precio}</span>
                                        </div>

                                        <Link
                                            href={`/proveedor/${s.proveedor_id}`}
                                            className="block w-full py-2 bg-emerald-700 text-white text-center rounded-xl text-sm font-bold hover:bg-emerald-800 transition-colors shadow-sm"
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
