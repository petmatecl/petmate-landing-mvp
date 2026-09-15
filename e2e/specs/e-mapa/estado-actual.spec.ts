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

test('[e-mapa MAP-BURBUJAS] CaregiverMap usa leaflet.markercluster imperativo', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'components/Explore/CaregiverMap.tsx'), 'utf-8');
    // Import directo de la librería base (sin wrapper React).
    expect(source, 'import "leaflet.markercluster"').toMatch(
        /import ['"]leaflet\.markercluster['"];/,
    );
    // CSS del plugin.
    expect(source, 'import CSS MarkerCluster').toMatch(
        /import ['"]leaflet\.markercluster\/dist\/MarkerCluster\.css['"]/,
    );
    // Cero import del wrapper react-leaflet-cluster.
    expect(source, 'sin import react-leaflet-cluster').not.toMatch(
        /react-leaflet-cluster/,
    );
    // Componente hijo ClusteredPriceMarkers que usa useMap + L.markerClusterGroup.
    expect(source, 'ClusteredPriceMarkers declarado').toMatch(
        /function ClusteredPriceMarkers\(/,
    );
    expect(source, 'L.markerClusterGroup imperativo').toMatch(
        /\(L as any\)\.markerClusterGroup\(\{[\s\S]{0,500}spiderfyOnMaxZoom:\s*true[\s\S]{0,200}disableClusteringAtZoom:\s*15/,
    );
});

test('[e-mapa MAP-BURBUJAS] Circles overlays quedan fuera del cluster', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'components/Explore/CaregiverMap.tsx'), 'utf-8');
    // El bloque de Circles debe estar ANTES del <ClusteredPriceMarkers />.
    // Los Circles renderean sueltos como overlays; el cluster solo aplica
    // a los pill markers de precio (dentro del componente hijo imperativo).
    const idxCircleMap = source.indexOf(`markers.map((s, idx) => (\n                    <Circle`);
    const idxCluster = source.indexOf('<ClusteredPriceMarkers');
    expect(idxCircleMap > 0, 'existe map de Circles').toBe(true);
    expect(idxCluster > 0, 'existe ClusteredPriceMarkers').toBe(true);
    expect(idxCircleMap < idxCluster, 'Circles renderean antes que ClusteredPriceMarkers').toBe(true);
});

test('[e-mapa MAP-BURBUJAS] cero .npmrc con legacy-peer-deps en el repo', async () => {
    // Anti-regresión: el fix imperativo evita el peer dep conflict de
    // react-leaflet-cluster con react-leaflet 4. NO debe haber `.npmrc`
    // en la raíz con `legacy-peer-deps=true`.
    let contenido = '';
    try {
        contenido = await readFile(path.join(REPO_ROOT, '.npmrc'), 'utf-8');
    } catch {
        // Archivo no existe — perfecto, es el estado esperado.
        return;
    }
    expect(contenido, '.npmrc no debe contener legacy-peer-deps=true').not.toMatch(
        /legacy-peer-deps\s*=\s*true/,
    );
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
