// components/Shared/LocationPicker.tsx
// ----------------------------------------------------------------------------
// Picker editable de ubicacion del proveedor. Sprint 3B (UI de ubicacion).
//
// Composicion:
//   1. AddressAutocomplete (Nominatim, ya existente) — busqueda por direccion
//      que entrega lat/lng iniciales.
//   2. Mapa Leaflet con <Marker draggable /> que escucha `dragend` para
//      reposicionar el pin; click en cualquier punto del mapa tambien
//      reposiciona.
//
// Privacidad: la precision del pin que se persiste se redondea aguas arriba
// (en el caller, no aqui) a 3 decimales (~111m). Este picker entrega lat/lng
// crudos; el caller los redondea antes de guardar.
//
// SSR: debe cargarse via next/dynamic({ ssr: false }) — Leaflet rompe en
// server render por el acceso a `window` durante el modulo inicial.
// ----------------------------------------------------------------------------
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import AddressAutocomplete from '../AddressAutocomplete';
import { getComunaCoords } from '../../lib/comunas';

// Fix iconos Leaflet en Next.js (mismo parche que LocationMap/CaregiverMap).
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Props {
    /** Latitud actual. null si el proveedor no ha posicionado pin todavia. */
    lat: number | null;
    /** Longitud actual. null si el proveedor no ha posicionado pin todavia. */
    lng: number | null;
    /** Nombre de la comuna para fallback del centro inicial cuando lat/lng son null. */
    comuna?: string;
    /** Callback al actualizar (drag, click, autocomplete, o limpiar). null/null = pin removido. */
    onChange: (lat: number | null, lng: number | null) => void;
}

// Recentra el MapContainer cuando cambia el target (selecciones via address).
// MapContainer solo respeta `center` en mount inicial; sin esto, elegir una
// direccion en el autocomplete no movia el viewport.
function RecenterMap({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center[0], center[1], zoom, map]);
    return null;
}

// Captura clicks en cualquier punto del mapa y los traduce a una nueva
// posicion del pin.
function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onPick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export default function LocationPicker({ lat, lng, comuna, onChange }: Props) {
    const hasMarker = lat != null && lng != null;

    // Ref al Marker para limpieza defensiva del handler de dragging antes de
    // unmount. Si el usuario logra hacer click en "Quitar ubicacion" mientras
    // el marker esta en estado de drag (alcanzable via automatizacion o
    // multi-pointer en touch; raro pero posible), Leaflet llama finishDrag
    // dentro de removeLayer y crashea con "Cannot read properties of
    // undefined (reading 'baseVal')" porque el estado SVG del drag preview
    // ya esta inconsistente. Desactivar dragging antes del state change
    // que dispara el unmount cierra el drag limpiamente.
    const markerRef = useRef<L.Marker | null>(null);

    // Centro inicial: pin actual > centroide de comuna > Santiago.
    const initialCenter: [number, number] = hasMarker
        ? [lat as number, lng as number]
        : getComunaCoords(comuna);

    // mapCenter cambia con el autocomplete o con el pin; el effect en
    // RecenterMap re-vuela la camara cuando este state cambia.
    const [mapCenter, setMapCenter] = useState<[number, number]>(initialCenter);

    // Si lat/lng cambian por re-hidratacion del padre (saveProfile + refresh),
    // sincronizamos el viewport.
    useEffect(() => {
        if (lat != null && lng != null) {
            setMapCenter([lat, lng]);
        }
    }, [lat, lng]);

    const zoom = hasMarker ? 15 : 13;

    return (
        <div className="space-y-3">
            <AddressAutocomplete
                placeholder="Busca tu dirección o sector..."
                onSelect={(result) => {
                    const newLat = parseFloat(result.lat);
                    const newLng = parseFloat(result.lon);
                    if (!Number.isFinite(newLat) || !Number.isFinite(newLng)) return;
                    setMapCenter([newLat, newLng]);
                    onChange(newLat, newLng);
                }}
            />

            <div className="relative h-[280px] w-full rounded-xl overflow-hidden border border-slate-200">
                <MapContainer
                    center={initialCenter}
                    zoom={zoom}
                    scrollWheelZoom={false}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    <RecenterMap center={mapCenter} zoom={zoom} />
                    <ClickToPlace
                        onPick={(newLat, newLng) => {
                            setMapCenter([newLat, newLng]);
                            onChange(newLat, newLng);
                        }}
                    />
                    {hasMarker && (
                        <Marker
                            ref={markerRef}
                            position={[lat as number, lng as number]}
                            draggable
                            eventHandlers={{
                                dragend: (e) => {
                                    const marker = e.target as L.Marker;
                                    const pos = marker.getLatLng();
                                    onChange(pos.lat, pos.lng);
                                },
                            }}
                        />
                    )}
                </MapContainer>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
                Busca tu dirección o haz clic en el mapa para posicionar tu ubicación. En tu perfil público se mostrará como un área aproximada (~500 m), no como una dirección exacta.
            </p>

            {hasMarker && (
                <button
                    type="button"
                    onClick={() => {
                        // Cierra el drag handler para el caso multi-pointer
                        // (alcanzable via automatizacion). Mantiene el fix
                        // anterior (4e35805).
                        try {
                            markerRef.current?.dragging?.disable();
                        } catch {
                            // no-op: defensivo
                        }
                        // Defer del unmount al siguiente macrotask para que
                        // los listeners document-level que Leaflet tiene
                        // pendientes (mouseup que dispara _onUp → finishDrag)
                        // corran ANTES de que React desmontee el <Marker>.
                        // Sin esto, _onUp accede a `_icon.baseVal` de un SVG
                        // ya removido y logueea TypeError en consola — la UI
                        // recupera (el state se actualiza igual), pero el
                        // error queda en console. El smoke 3B confirmo que
                        // pasa incluso tras un drag limpio (no es estado
                        // sucio, es ordering del event loop). setTimeout(0)
                        // saca el state change a la siguiente macrotarea;
                        // cualquier listener document-level encolado dentro
                        // del click cycle ya corrio.
                        setTimeout(() => onChange(null, null), 0);
                    }}
                    className="text-xs font-medium text-slate-500 hover:text-red-600 transition-colors underline-offset-2 hover:underline"
                >
                    Quitar ubicación
                </button>
            )}
        </div>
    );
}
