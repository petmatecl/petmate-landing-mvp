// lib/comunas.ts
// ----------------------------------------------------------------------------
// Fuente de verdad geografica de Chile: las 16 regiones administrativas y
// las 346 comunas vigentes (post-creacion de Region de Nuble por Ley 21.033,
// septiembre 2018). Fuente: division politico-administrativa oficial de la
// Biblioteca del Congreso Nacional (BCN) / SUBDERE.
//
// Estructura nueva (Ola 1 del feature "direcciones estructuradas"):
//   REGIONES_CHILE  — array de Region, ordenado norte-sur (orden geografico
//                     estandar). Cada region contiene su listado de comunas
//                     ordenadas alfabeticamente.
//   getComunasDeRegion(slug) — lookup por slug.
//   getRegionDeComuna(comunaLabel) — inverso (case-insensitive, robusto vs
//                                    diferencias de capitalizacion en data legacy).
//   getRegionPorSlug(slug) / getRegionPorLabel(label) — lookups directos.
//
// Backward compat (mantener hasta Ola 2):
//   COMUNAS_CHILE — flat array de 346 strings, derivado de REGIONES_CHILE.
//                   Los callsites existentes (register, perfil, filtros home,
//                   ServiceFormModal, SidebarFiltros, SearchBar) lo siguen
//                   usando como lo hacian. Ola 2 los migra al picker nuevo.
//
// Lo que NO cambia en Ola 1:
//   ZONAS_RM         — sectorizacion RM para /explorar (5 zonas urbanas).
//   COMUNA_COORDS    — centroides lat/lng para mapas Leaflet.
//   getComunaCoords  — helper de fallback.
//   getZonaFromComuna— helper de sidebar.
// ----------------------------------------------------------------------------

export interface Region {
    /** Slug kebab-case sin acentos para uso interno (URL, keys, switches). */
    slug: string;
    /** Nombre corto para UI (dropdown del picker). Con acentos y ñ. */
    label: string;
    /** Nombre oficial completo (footer, exports, paginas legales). */
    labelOficial: string;
    /** ISO 3166-2:CL (referencia opcional para integraciones futuras). */
    codigo: string;
    /** Comunas de la region, label canonico, orden alfabetico. */
    comunas: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// Las 16 regiones de Chile, norte → sur.
// Conteo por region (verificado contra BCN):
//   AP 4 + TA 7 + AN 9 + AT 9 + CO 15 + VS 38 + RM 52 + LI 33 + ML 30
//   + NB 21 + BI 33 + AR 32 + LR 12 + LL 30 + AI 10 + MA 11 = 346.
// ────────────────────────────────────────────────────────────────────────────
export const REGIONES_CHILE: Region[] = [
    {
        slug: 'arica-y-parinacota',
        label: 'Arica y Parinacota',
        labelOficial: 'Arica y Parinacota',
        codigo: 'CL-AP',
        comunas: [
            'Arica', 'Camarones', 'General Lagos', 'Putre',
        ],
    },
    {
        slug: 'tarapaca',
        label: 'Tarapacá',
        labelOficial: 'Tarapacá',
        codigo: 'CL-TA',
        comunas: [
            'Alto Hospicio', 'Camiña', 'Colchane', 'Huara', 'Iquique',
            'Pica', 'Pozo Almonte',
        ],
    },
    {
        slug: 'antofagasta',
        label: 'Antofagasta',
        labelOficial: 'Antofagasta',
        codigo: 'CL-AN',
        comunas: [
            'Antofagasta', 'Calama', 'María Elena', 'Mejillones', 'Ollagüe',
            'San Pedro de Atacama', 'Sierra Gorda', 'Taltal', 'Tocopilla',
        ],
    },
    {
        slug: 'atacama',
        label: 'Atacama',
        labelOficial: 'Atacama',
        codigo: 'CL-AT',
        comunas: [
            'Alto del Carmen', 'Caldera', 'Chañaral', 'Copiapó',
            'Diego de Almagro', 'Freirina', 'Huasco', 'Tierra Amarilla',
            'Vallenar',
        ],
    },
    {
        slug: 'coquimbo',
        label: 'Coquimbo',
        labelOficial: 'Coquimbo',
        codigo: 'CL-CO',
        comunas: [
            'Andacollo', 'Canela', 'Combarbalá', 'Coquimbo', 'Illapel',
            'La Higuera', 'La Serena', 'Los Vilos', 'Monte Patria', 'Ovalle',
            'Paihuano', 'Punitaqui', 'Río Hurtado', 'Salamanca', 'Vicuña',
        ],
    },
    {
        slug: 'valparaiso',
        label: 'Valparaíso',
        labelOficial: 'Valparaíso',
        codigo: 'CL-VS',
        comunas: [
            'Algarrobo', 'Cabildo', 'Calle Larga', 'Cartagena', 'Casablanca',
            'Catemu', 'Concón', 'El Quisco', 'El Tabo', 'Hijuelas',
            'Isla de Pascua', 'Juan Fernández', 'La Calera', 'La Cruz',
            'La Ligua', 'Limache', 'Llaillay', 'Los Andes', 'Nogales',
            'Olmué', 'Panquehue', 'Papudo', 'Petorca', 'Puchuncaví',
            'Putaendo', 'Quillota', 'Quilpué', 'Quintero', 'Rinconada',
            'San Antonio', 'San Esteban', 'San Felipe', 'Santa María',
            'Santo Domingo', 'Valparaíso', 'Villa Alemana', 'Viña del Mar',
            'Zapallar',
        ],
    },
    {
        slug: 'metropolitana',
        label: 'Metropolitana',
        labelOficial: 'Metropolitana de Santiago',
        codigo: 'CL-RM',
        comunas: [
            'Alhué', 'Buin', 'Calera de Tango', 'Cerrillos', 'Cerro Navia',
            'Colina', 'Conchalí', 'Curacaví', 'El Bosque', 'El Monte',
            'Estación Central', 'Huechuraba', 'Independencia', 'Isla de Maipo',
            'La Cisterna', 'La Florida', 'La Granja', 'La Pintana', 'La Reina',
            'Lampa', 'Las Condes', 'Lo Barnechea', 'Lo Espejo', 'Lo Prado',
            'Macul', 'Maipú', 'María Pinto', 'Melipilla', 'Ñuñoa',
            'Padre Hurtado', 'Paine', 'Pedro Aguirre Cerda', 'Peñaflor',
            'Peñalolén', 'Pirque', 'Providencia', 'Pudahuel', 'Puente Alto',
            'Quilicura', 'Quinta Normal', 'Recoleta', 'Renca', 'San Bernardo',
            'San Joaquín', 'San José de Maipo', 'San Miguel', 'San Pedro',
            'San Ramón', 'Santiago', 'Talagante', 'Tiltil', 'Vitacura',
        ],
    },
    {
        slug: 'ohiggins',
        label: 'O\'Higgins',
        labelOficial: 'Libertador General Bernardo O\'Higgins',
        codigo: 'CL-LI',
        comunas: [
            'Chépica', 'Chimbarongo', 'Codegua', 'Coínco', 'Coltauco',
            'Doñihue', 'Graneros', 'La Estrella', 'Las Cabras', 'Litueche',
            'Lolol', 'Machalí', 'Malloa', 'Marchihue', 'Mostazal', 'Nancagua',
            'Navidad', 'Olivar', 'Palmilla', 'Paredones', 'Peralillo',
            'Peumo', 'Pichidegua', 'Pichilemu', 'Placilla', 'Pumanque',
            'Quinta de Tilcoco', 'Rancagua', 'Rengo', 'Requínoa',
            'San Fernando', 'San Vicente', 'Santa Cruz',
        ],
    },
    {
        slug: 'maule',
        label: 'Maule',
        labelOficial: 'Maule',
        codigo: 'CL-ML',
        comunas: [
            'Cauquenes', 'Chanco', 'Colbún', 'Constitución', 'Curepto',
            'Curicó', 'Empedrado', 'Hualañé', 'Licantén', 'Linares',
            'Longaví', 'Maule', 'Molina', 'Parral', 'Pelarco', 'Pelluhue',
            'Pencahue', 'Rauco', 'Retiro', 'Río Claro', 'Romeral',
            'Sagrada Familia', 'San Clemente', 'San Javier', 'San Rafael',
            'Talca', 'Teno', 'Vichuquén', 'Villa Alegre', 'Yerbas Buenas',
        ],
    },
    {
        slug: 'nuble',
        label: 'Ñuble',
        labelOficial: 'Ñuble',
        codigo: 'CL-NB',
        comunas: [
            'Bulnes', 'Chillán', 'Chillán Viejo', 'Cobquecura', 'Coelemu',
            'Coihueco', 'El Carmen', 'Ninhue', 'Ñiquén', 'Pemuco', 'Pinto',
            'Portezuelo', 'Quillón', 'Quirihue', 'Ránquil', 'San Carlos',
            'San Fabián', 'San Ignacio', 'San Nicolás', 'Trehuaco', 'Yungay',
        ],
    },
    {
        slug: 'biobio',
        label: 'Biobío',
        labelOficial: 'Biobío',
        codigo: 'CL-BI',
        comunas: [
            'Alto Biobío', 'Antuco', 'Arauco', 'Cabrero', 'Cañete',
            'Chiguayante', 'Concepción', 'Contulmo', 'Coronel', 'Curanilahue',
            'Florida', 'Hualpén', 'Hualqui', 'Laja', 'Lebu', 'Los Álamos',
            'Los Ángeles', 'Lota', 'Mulchén', 'Nacimiento', 'Negrete',
            'Penco', 'Quilaco', 'Quilleco', 'San Pedro de la Paz',
            'San Rosendo', 'Santa Bárbara', 'Santa Juana', 'Talcahuano',
            'Tirúa', 'Tomé', 'Tucapel', 'Yumbel',
        ],
    },
    {
        slug: 'araucania',
        label: 'La Araucanía',
        labelOficial: 'La Araucanía',
        codigo: 'CL-AR',
        comunas: [
            'Angol', 'Carahue', 'Cholchol', 'Collipulli', 'Cunco', 'Curacautín',
            'Curarrehue', 'Ercilla', 'Freire', 'Galvarino', 'Gorbea',
            'Lautaro', 'Loncoche', 'Lonquimay', 'Los Sauces', 'Lumaco',
            'Melipeuco', 'Nueva Imperial', 'Padre Las Casas', 'Perquenco',
            'Pitrufquén', 'Pucón', 'Purén', 'Renaico', 'Saavedra', 'Temuco',
            'Teodoro Schmidt', 'Toltén', 'Traiguén', 'Victoria', 'Vilcún',
            'Villarrica',
        ],
    },
    {
        slug: 'los-rios',
        label: 'Los Ríos',
        labelOficial: 'Los Ríos',
        codigo: 'CL-LR',
        comunas: [
            'Corral', 'Futrono', 'La Unión', 'Lago Ranco', 'Lanco',
            'Los Lagos', 'Máfil', 'Mariquina', 'Paillaco', 'Panguipulli',
            'Río Bueno', 'Valdivia',
        ],
    },
    {
        slug: 'los-lagos',
        label: 'Los Lagos',
        labelOficial: 'Los Lagos',
        codigo: 'CL-LL',
        comunas: [
            'Ancud', 'Calbuco', 'Castro', 'Chaitén', 'Chonchi', 'Cochamó',
            'Curaco de Vélez', 'Dalcahue', 'Fresia', 'Frutillar', 'Futaleufú',
            'Hualaihué', 'Llanquihue', 'Los Muermos', 'Maullín', 'Osorno',
            'Palena', 'Puerto Montt', 'Puerto Octay', 'Puerto Varas',
            'Puqueldón', 'Purranque', 'Puyehue', 'Queilén', 'Quellón',
            'Quemchi', 'Quinchao', 'Río Negro', 'San Juan de la Costa',
            'San Pablo',
        ],
    },
    {
        slug: 'aysen',
        label: 'Aysén',
        labelOficial: 'Aysén del General Carlos Ibáñez del Campo',
        codigo: 'CL-AI',
        comunas: [
            'Aysén', 'Chile Chico', 'Cisnes', 'Cochrane', 'Coyhaique',
            'Guaitecas', 'Lago Verde', 'O\'Higgins', 'Río Ibáñez', 'Tortel',
        ],
    },
    {
        slug: 'magallanes',
        label: 'Magallanes',
        labelOficial: 'Magallanes y de la Antártica Chilena',
        codigo: 'CL-MA',
        comunas: [
            'Antártica', 'Cabo de Hornos', 'Laguna Blanca', 'Natales',
            'Porvenir', 'Primavera', 'Punta Arenas', 'Río Verde',
            'San Gregorio', 'Timaukel', 'Torres del Paine',
        ],
    },
];

// ────────────────────────────────────────────────────────────────────────────
// Backward compat — flat list de 346 comunas para callsites legacy
// (register, perfil proveedor, ServiceFormModal, SidebarFiltros, SearchBar
// del home, etc.). Ola 2 los migra al picker nuevo; mientras tanto, esta
// derivacion mantiene la API actual sin cambios.
// ────────────────────────────────────────────────────────────────────────────
export const COMUNAS_CHILE: string[] = REGIONES_CHILE.flatMap(r => r.comunas);

// ────────────────────────────────────────────────────────────────────────────
// Helpers publicos para el picker y para callsites que necesiten resolver
// region desde comuna (e.g. backfill, exports). Los lookups por nombre son
// case-insensitive con trim — defensivos contra data legacy con casing/
// whitespace variable.
// ────────────────────────────────────────────────────────────────────────────

/** Comunas de una region por slug. Retorna [] si el slug no existe. */
export function getComunasDeRegion(slug: string | null | undefined): string[] {
    if (!slug) return [];
    const r = REGIONES_CHILE.find(x => x.slug === slug);
    return r ? r.comunas : [];
}

/** Region que contiene una comuna (case-insensitive). null si no se encuentra. */
export function getRegionDeComuna(comuna: string | null | undefined): Region | null {
    if (!comuna) return null;
    const normalized = comuna.trim().toLowerCase();
    for (const r of REGIONES_CHILE) {
        if (r.comunas.some(c => c.toLowerCase() === normalized)) {
            return r;
        }
    }
    return null;
}

/** Region por slug exacto. null si no existe. */
export function getRegionPorSlug(slug: string | null | undefined): Region | null {
    if (!slug) return null;
    return REGIONES_CHILE.find(r => r.slug === slug) ?? null;
}

/** Region por label (corto u oficial), case-insensitive. null si no matchea. */
export function getRegionPorLabel(label: string | null | undefined): Region | null {
    if (!label) return null;
    const normalized = label.trim().toLowerCase();
    return REGIONES_CHILE.find(r =>
        r.label.toLowerCase() === normalized
        || r.labelOficial.toLowerCase() === normalized
    ) ?? null;
}

/**
 * Quita tildes/diacriticos de una string y la baja a lowercase. Util para
 * comparaciones tolerantes a acentos (e.g. "vina" debe matchear "Viña",
 * "nuble" debe matchear "Ñuble"). NFD + remocion del block combining-marks.
 */
function normalizarParaBusqueda(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Filtra una lista de comunas por termino con criterio "alguna palabra
 * EMPIEZA con el termino" — no "contiene en cualquier lugar". Insensible
 * a tildes y mayusculas.
 *
 *   "cur" → Curacavi, Curacautin, Curanilahue, Curepto, Curico
 *           (NO matchea Vitacura ni Quilicura — el 'cur' esta en el medio).
 *   "montt" → Puerto Montt (segunda palabra empieza con montt).
 *   "mar"  → Vina del Mar (tercera palabra empieza con mar).
 *   "vina" → Vina del Mar (insensible a tildes).
 *   "nuble" → Nuble (insensible a la enie).
 *
 * Termino vacio / solo whitespace → devuelve la lista completa sin filtrar.
 * Preserva el orden original — no re-ordena ni dedup. El caller hace
 * .slice() para limitar resultados.
 *
 * Usado en: SearchBar (home), register, proveedor/index (perfil),
 * ServiceFormModal (comunas_cobertura), SidebarFiltros (/explorar).
 */
export function filtrarComunasPorTermino(termino: string | null | undefined, comunas: string[]): string[] {
    const t = termino ? normalizarParaBusqueda(termino.trim()) : '';
    if (!t) return comunas;
    return comunas.filter(c => {
        const palabras = normalizarParaBusqueda(c).split(/\s+/);
        return palabras.some(p => p.startsWith(t));
    });
}

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
