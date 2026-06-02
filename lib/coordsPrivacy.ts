// lib/coordsPrivacy.ts
// ----------------------------------------------------------------------------
// Helper de privacidad de ubicacion. Reduce la precision de lat/lng antes
// de enviarlas al cliente publico.
//
// Regla unica: 2 decimales (~1km a 33° lat S — chile central).
//   3 decimales = ~111m  (lo que se persiste en BD, ver pages/proveedor/index.tsx)
//   2 decimales = ~1.1km (lo que mostramos al publico, ver ficha [id].tsx)
//
// La BD sigue guardando la version de 3 decimales — solo redondeamos en el
// shape de salida hacia el cliente. Asi internamente conservamos precision
// para calculos de distancia, pero no exponemos la direccion del proveedor.
//
// Usos:
//   - pages/proveedor/[id].tsx getServerSideProps (ficha publica del proveedor)
//   - lib/serviceMapper.ts (defensivo: RPC actual no devuelve lat/lng, pero
//     si algun dia los devuelve este redondeo cierra el flanco)
// ----------------------------------------------------------------------------

export const PUBLIC_COORD_DECIMALS = 2;
export const PUBLIC_COORD_RADIUS_METERS = 1000;

/**
 * Redondea un par lat/lng a la precision publica (2 decimales). null-safe.
 * El radio del Circle de Leaflet asociado debe ser PUBLIC_COORD_RADIUS_METERS
 * o mayor para que la zona visible cubra el ruido de redondeo.
 */
export function roundCoordsForPublic<T extends number | null | undefined>(
    lat: T,
    lng: T
): { lat: T; lng: T } {
    const factor = Math.pow(10, PUBLIC_COORD_DECIMALS);
    const round = (v: T): T => (typeof v === 'number' ? (Math.round(v * factor) / factor) as T : v);
    return { lat: round(lat), lng: round(lng) };
}
