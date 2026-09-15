// e2e/specs/e-mapa/estado-actual.spec.ts
// ---------------------------------------------------------------------------
// Sprint E-4 mapa — Paso 0 diagnostic + regresión estructural.
//
// Items del PR:
//   1. MAP-BURBUJAS: CaregiverMap wrappea los Markers en
//      MarkerClusterGroup (react-leaflet-cluster + leaflet.markercluster).
//   2. MAP-FICHA: ServiceDetailView renderea LocationMap SOLO cuando
//      modalidad incluye 'casa_cuidador' + proveedor tiene lat+lng.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { readFile } from 'fs/promises';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../..');

test('[e-mapa MAP-BURBUJAS] CaregiverMap usa MarkerClusterGroup', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'components/Explore/CaregiverMap.tsx'), 'utf-8');
    // Import del wrapper.
    expect(source, 'import MarkerClusterGroup').toMatch(
        /import MarkerClusterGroup from ['"]react-leaflet-cluster['"]/,
    );
    // CSS del plugin.
    expect(source, 'import CSS MarkerCluster').toMatch(
        /import ['"]leaflet\.markercluster\/dist\/MarkerCluster\.css['"]/,
    );
    // Wrapper renderizado con props razonables (spiderfyOnMaxZoom + disableClusteringAtZoom).
    expect(source, '<MarkerClusterGroup ...>').toMatch(
        /<MarkerClusterGroup[\s\S]{0,500}spiderfyOnMaxZoom=\{true\}[\s\S]{0,200}disableClusteringAtZoom=\{15\}/,
    );
});

test('[e-mapa MAP-BURBUJAS] Circles overlays quedan fuera del cluster', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'components/Explore/CaregiverMap.tsx'), 'utf-8');
    // El bloque de Circles debe estar ANTES del <MarkerClusterGroup> — se
    // rendean sueltos como overlays, no clusterizables.
    const idxCircleMap = source.indexOf(`markers.map((s, idx) => (\n                    <Circle`);
    const idxClusterOpen = source.indexOf('<MarkerClusterGroup');
    expect(idxCircleMap > 0, 'existe map de Circles').toBe(true);
    expect(idxClusterOpen > 0, 'existe MarkerClusterGroup').toBe(true);
    expect(idxCircleMap < idxClusterOpen, 'Circles renderean antes que MarkerClusterGroup').toBe(true);
});

test('[e-mapa MAP-FICHA] ServiceDetailView renderea LocationMap condicional', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'components/Servicio/ServiceDetailView.tsx'), 'utf-8');
    // Import dinámico de LocationMap (no SSR).
    expect(source, 'import dynamic LocationMap').toMatch(
        /const LocationMap\s*=\s*dynamic\(\(\)\s*=>\s*import\(['"][^'"]*LocationMap['"]\)/,
    );
    // Condición: modalidad incluye 'casa_cuidador' + lat + lng.
    expect(source, 'condición modalidad casa_cuidador').toMatch(
        /service\.detalles\.modalidad\.includes\(['"]casa_cuidador['"]\)/,
    );
    expect(source, 'guard lat/lng no null').toMatch(
        /service\.proveedor_lat\s*!=\s*null[\s\S]{0,100}service\.proveedor_lng\s*!=\s*null/,
    );
    // Render con approximate=true (preserva privacidad — mismo círculo ~1km
    // que la ficha de /proveedor/[id]).
    expect(source, 'LocationMap con approximate=true').toMatch(
        /<LocationMap[\s\S]{0,300}approximate=\{true\}/,
    );
});

test('[e-mapa MAP-FICHA] copy de privacidad presente', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'components/Servicio/ServiceDetailView.tsx'), 'utf-8');
    expect(source, 'copy "dirección exacta no se comparte"').toMatch(
        /La dirección exacta no se comparte públicamente/,
    );
});
