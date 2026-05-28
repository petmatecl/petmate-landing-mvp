// Fuente de verdad de comunas para Chile — sin duplicados
export const COMUNAS_CHILE = [
    // Región Metropolitana
    'Alhué', 'Buin', 'Calera de Tango', 'Cerrillos', 'Cerro Navia', 'Colina',
    'Conchalí', 'Curacaví', 'El Bosque', 'El Monte', 'Estación Central',
    'Huechuraba', 'Independencia', 'Isla de Maipo', 'La Cisterna', 'La Florida',
    'La Granja', 'La Pintana', 'La Reina', 'Lampa', 'Las Condes', 'Lo Barnechea',
    'Lo Espejo', 'Lo Prado', 'Macul', 'Maipú', 'María Pinto',
    'Melipilla', 'Ñuñoa', 'Padre Hurtado', 'Paine', 'Pedro Aguirre Cerda',
    'Peñaflor', 'Peñalolén', 'Pirque', 'Providencia', 'Pudahuel', 'Puente Alto',
    'Quilicura', 'Quinta Normal', 'Recoleta', 'Renca', 'San Bernardo',
    'San Joaquín', 'San José de Maipo', 'San Miguel', 'San Pedro', 'San Ramón',
    'Santiago', 'Talagante', 'Tiltil', 'Vitacura',
    // Otras regiones
    'Antofagasta', 'Arica', 'Concepción', 'Coquimbo', 'Iquique', 'La Serena',
    'Osorno', 'Puerto Montt', 'Punta Arenas', 'Rancagua', 'Talca', 'Temuco',
    'Valdivia', 'Valparaíso', 'Viña del Mar',
];

// Centroide de Santiago — fallback cuando no hay comuna ni lat/lng.
export const CENTER_SANTIAGO: [number, number] = [-33.4489, -70.6693];

// Centroides aproximados por comuna. Usado como fallback en el mapa de
// /explorar (CaregiverMap) cuando un proveedor no tiene lat/lng propios, y
// como punto inicial del LocationPicker en el dashboard cuando un proveedor
// nuevo aun no ha posicionado su pin.
// Originalmente vivia inline en components/Explore/CaregiverMap.tsx; movido
// aqui en Sprint 3B para que LocationPicker lo reuse sin duplicacion.
export const COMUNA_COORDS: Record<string, [number, number]> = {
    'Santiago': [-33.4489, -70.6693],
    'Providencia': [-33.4314, -70.6093],
    'Las Condes': [-33.4131, -70.5810],
    'Ñuñoa': [-33.4569, -70.6033],
    'La Reina': [-33.4433, -70.5367],
    'Vitacura': [-33.4005, -70.5972],
    'Lo Barnechea': [-33.3524, -70.5186],
    'Macul': [-33.4939, -70.5976],
    'Peñalolén': [-33.4862, -70.5385],
    'La Florida': [-33.5297, -70.5872],
    'Puente Alto': [-33.6117, -70.5758],
    'Maipú': [-33.5106, -70.7583],
    'Estación Central': [-33.4633, -70.7061],
    'Quinta Normal': [-33.4363, -70.6975],
    'Independencia': [-33.4150, -70.6550],
    'Recoleta': [-33.4069, -70.6389],
    'Huechuraba': [-33.3768, -70.6398],
    'Conchalí': [-33.3850, -70.6869],
    'Renca': [-33.4050, -70.7303],
    'Quilicura': [-33.3667, -70.7300],
    'Pudahuel': [-33.4475, -70.7694],
    'Lo Prado': [-33.4450, -70.7300],
    'Cerro Navia': [-33.4244, -70.7369],
    'Cerrillos': [-33.5042, -70.7183],
    'Pedro Aguirre Cerda': [-33.4839, -70.6781],
    'San Miguel': [-33.4933, -70.6533],
    'San Joaquín': [-33.4961, -70.6272],
    'La Cisterna': [-33.5358, -70.6653],
    'San Ramón': [-33.5414, -70.6433],
    'La Granja': [-33.5361, -70.6133],
    'El Bosque': [-33.5658, -70.6697],
    'La Pintana': [-33.5853, -70.6319],
    'San Bernardo': [-33.5833, -70.7000],
    // Otras regiones
    'Antofagasta': [-23.6510, -70.3954],
    'Valparaíso': [-33.0472, -71.6127],
    'Viña del Mar': [-33.0241, -71.5516],
    'Concepción': [-36.8201, -73.0444],
    'Temuco': [-38.7359, -72.5904],
    'Rancagua': [-34.1708, -70.7444],
    'Talca': [-35.4264, -71.6553],
    'La Serena': [-29.9027, -71.2520],
    'Coquimbo': [-29.9533, -71.3375],
    'Iquique': [-20.2140, -70.1522],
    'Arica': [-18.4783, -70.3126],
    'Puerto Montt': [-41.4693, -72.9424],
    'Osorno': [-40.5740, -73.1329],
    'Valdivia': [-39.8142, -73.2459],
    'Punta Arenas': [-53.1638, -70.9171],
};

/**
 * Resuelve el centroide de una comuna por nombre (case-insensitive).
 * Si no matchea, retorna el centroide de Santiago.
 */
export function getComunaCoords(comunaName: string | null | undefined): [number, number] {
    if (!comunaName) return CENTER_SANTIAGO;
    const normalized = comunaName.trim().toLowerCase();
    const match = Object.keys(COMUNA_COORDS).find(k => k.toLowerCase() === normalized);
    return match ? COMUNA_COORDS[match] : CENTER_SANTIAGO;
}

// Sprint Categorias: sectorizacion canonica de la RM en 5 zonas urbanas.
// El filtro de comuna en /explorar muestra primero un selector de zona
// (estado client-side, no persiste en URL) y luego restringe el listado
// de comunas a las de la zona elegida. La zona NO filtra por si misma —
// el filtro real sigue siendo `comuna` (un solo valor).
//
// Comunas rurales de la RM (Alhue, Curacavi, Melipilla, Talagante, etc.)
// y comunas fuera de RM (Valparaiso, Concepcion, etc.) NO estan en
// ninguna zona. getZonaFromComuna devuelve null para ellas, lo que hace
// que la sidebar abra en zona "Todas" con el combobox completo.
export type ZonaRM = 'oriente' | 'centro' | 'norte' | 'poniente' | 'sur';

export const ZONAS_RM: { slug: ZonaRM; label: string; comunas: string[] }[] = [
    {
        slug: 'oriente',
        label: 'Oriente',
        comunas: ['Las Condes', 'Vitacura', 'Lo Barnechea', 'Providencia', 'Ñuñoa', 'La Reina', 'Peñalolén', 'Macul'],
    },
    {
        slug: 'centro',
        label: 'Centro',
        comunas: ['Santiago', 'Independencia', 'Recoleta', 'San Miguel', 'San Joaquín', 'Pedro Aguirre Cerda'],
    },
    {
        slug: 'norte',
        label: 'Norte',
        comunas: ['Huechuraba', 'Conchalí', 'Renca', 'Quilicura'],
    },
    {
        slug: 'poniente',
        label: 'Poniente',
        comunas: ['Maipú', 'Estación Central', 'Cerrillos', 'Pudahuel', 'Lo Prado', 'Cerro Navia', 'Quinta Normal'],
    },
    {
        slug: 'sur',
        label: 'Sur',
        comunas: ['La Florida', 'Puente Alto', 'La Granja', 'La Pintana', 'San Ramón', 'El Bosque', 'La Cisterna', 'Lo Espejo', 'San Bernardo'],
    },
];

/**
 * Devuelve el slug de zona al que pertenece una comuna RM (case-insensitive),
 * o null si la comuna no esta en ninguna de las 5 zonas urbanas. Util para
 * que la sidebar pre-seleccione la zona al hidratar desde URL/localStorage
 * y para que el boton de geolocate actualice zona automaticamente.
 */
export function getZonaFromComuna(comuna: string | null | undefined): ZonaRM | null {
    if (!comuna) return null;
    const normalized = comuna.trim().toLowerCase();
    for (const zona of ZONAS_RM) {
        if (zona.comunas.some(c => c.toLowerCase() === normalized)) {
            return zona.slug;
        }
    }
    return null;
}
