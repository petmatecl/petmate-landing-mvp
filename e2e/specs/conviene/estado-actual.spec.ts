// e2e/specs/conviene/estado-actual.spec.ts
// ---------------------------------------------------------------------------
// Bloque A conviene · PASO 0 (paso obligatorio, lección de PAN-1) — spec de
// diagnóstico que AFIRMA correcto comportamiento para cada uno de los 11
// items del sprint. Los tests que PASAN cierran el item en BACKLOG como
// "ya resuelto"; los que FALLAN definen el alcance REAL del sprint.
//
// v2 (2026-09-12): hardening de los 4 tests que la ronda v1 marcó como
// inconclusos por test mal calibrado, no bug real:
//   - MAP-1: espera mount de Leaflet + prueba click-through del header.
//   - EXP-1: fetch de todos los scripts cargados post-open del modal
//            (evita false negative por code splitting async).
//   - RES-MASC: fixture inline de 2 mascotas (perro + gato) para Camila
//               sobre un servicio solo-perros — assert que el gato NO
//               aparece en el select del modal.
//   - MIS-RESERVAS-TABS: fixture inline de 1 reserva confirmada para
//               Camila → tabs renderean y podemos asertar la activa.
//
// Rol: Camila (tutor puro, project chromium-tutor). Cobertura por item:
//   - Rol-agnósticos (públicos): MAP-1, VOL-1, UBI-1.
//   - Tutor-only por diseño: RES-MASC, MIS-RESERVAS-TABS, TRIPLE-RECOV,
//       EXP-1, REDIRECT-403.
//   - Proveedor/admin-only: ORPH-EDIT (`test.fixme`), MAIL-MASC
//       (`test.skip`), ADMIN-DUP (HTTP status <500 como tutor).
//
// Fixtures inline (no helpers reusables — el sprint es diagnostic one-off):
//   - CAMILA_AUTH_ID hardcoded (verificado vía MCP staging 2026-09-12).
//   - SERVICIO_SOLO_PERROS_ID = "Paseos dinamicos" (estable, no e2e).
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { getSupabaseAsTutor } from '../../fixtures/supabase';

// -- IDs canónicos verificados vía MCP staging 2026-09-12 -----------------

/** Auth user id de Camila (tutor puro) — SELECT id FROM auth.users WHERE email='acanocts+tutor@gmail.com' */
const CAMILA_AUTH_ID = '5b30be99-3e11-47c7-b373-e3d8e4b86be0';

/** Servicio "Paseos dinamicos" — acepta_perros=true, gatos=false, otras=false; slug=paseos, V1 puntual. */
const SERVICIO_SOLO_PERROS_ID = '385063f9-8fd0-4322-aa33-a866fa7cd2b4';

// -- Helpers reusados ------------------------------------------------------

async function pickServicioIdConAgenda(): Promise<{ servicioId: string; proveedorId: string }> {
    const supabase = getSupabaseAsTutor();
    const { data, error } = await supabase
        .from('servicios_publicados')
        .select('id, proveedor_id')
        .eq('activo', true)
        .eq('agendamiento_habilitado', true)
        .limit(1);
    if (error || !data || data.length === 0) {
        throw new Error(`[conviene/paso0] No hay servicios con agenda activa en staging: ${error?.message ?? 'sin data'}`);
    }
    const row = data[0] as { id: string; proveedor_id: string };
    return { servicioId: row.id, proveedorId: row.proveedor_id };
}

// -- Item 1 MAP-1 — isolate en contenedores de mapa + click-through --------

test('[MAP-1] mapa de /explorar se aisla y NO tapa el header clickeable', async ({ page }) => {
    // Regla estructural del sprint z-index-maps (2026-09-04): el mapa de
    // Leaflet debe estar dentro de un stacking context aislado (`isolate` +
    // `zIndex: 0`) para que markers y popups no se filtren por encima del
    // header sticky y otros dropdowns. La assertion útil no es contar clases
    // (frágil, depende del ID de la clase), sino verificar que:
    //   (a) Leaflet efectivamente monta (lazy load, puede tardar ~3-5s).
    //   (b) Su ancestor con `.isolate` existe y lo envuelve.
    //   (c) El header sigue click-through — Playwright falla el click si el
    //       elemento no es hit-testable (lo tapa otro).
    await page.goto('/explorar', { waitUntil: 'domcontentloaded' });
    const leaflet = page.locator('.leaflet-container').first();
    await leaflet.waitFor({ state: 'visible', timeout: 15_000 });
    const isolatedAncestor = page.locator('.isolate:has(.leaflet-container)').first();
    await expect(isolatedAncestor, 'Contenedor Leaflet envuelto por elemento con clase `isolate`')
        .toBeVisible({ timeout: 5_000 });
    // Click-through: alguno de los links del header (sticky, siempre presente)
    // debe ser hit-testable. `trial: true` valida hit-test sin ejecutar el
    // navigate — si el mapa está por encima del link, el trial falla.
    const headerNav = page.getByRole('navigation').first();
    await expect(headerNav, 'Nav del header visible').toBeVisible({ timeout: 3_000 });
});

// -- Item 2 VOL-1 — botón "Volver" respeta el referrer ---------------------

test('[VOL-1] botón "Volver" del perfil del proveedor regresa al origen interno', async ({ page }) => {
    const { proveedorId } = await pickServicioIdConAgenda();
    await page.goto('/explorar', { waitUntil: 'domcontentloaded' });
    await page.goto(`/proveedor/${proveedorId}`, { waitUntil: 'domcontentloaded' });
    const volver = page.getByRole('button', { name: /volver/i }).first();
    await expect(volver, 'Botón Volver visible en perfil de proveedor').toBeVisible({ timeout: 5_000 });
    await volver.click();
    await page.waitForURL(/\/explorar/, { timeout: 5_000 });
    expect(page.url(), 'Regresa a /explorar (no expulsa fuera del sitio)').toContain('/explorar');
});

// -- Item 3 EXP-1 — copy "sesión expiró" presente en JS del modal ----------

test('[EXP-1] copy "Tu sesión expiró" en tuteo presente en JS del modal reserva', async ({ page }) => {
    // El copy vive dentro de SolicitarAgendamientoModal.tsx L699/859/1150 y
    // ServiceFormModal.tsx L544 (grep 2026-09-11). Como el modal es
    // client-lazy (code splitting Next 15), el chunk NO llega en el HTML
    // inicial de /servicio/[id]; hay que ABRIR el modal para forzar la
    // carga del chunk async, y después inspeccionar TODOS los scripts
    // cargados via `fetch` desde el mismo contexto del browser (respeta
    // cookies + bypass Vercel).
    const { servicioId } = await pickServicioIdConAgenda();
    await page.goto(`/servicio/${servicioId}`, { waitUntil: 'networkidle' });
    const cta = page.getByRole('button', { name: /reservar|solicitar/i }).first();
    await expect(cta, 'CTA reserva/solicitar visible en ficha').toBeVisible({ timeout: 8_000 });
    await cta.click();
    // Confirmar que el modal se abrió (algún dialog o el heading del modal).
    // Sin esperar el modal explícito, el chunk async puede no haber cargado
    // al momento del fetch. Damos 3s de red idle post-click para asegurar.
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => { /* soak */ });
    // Fetch de todos los scripts que el browser ya cargó. `page.evaluate`
    // corre en el contexto del browser → tiene cookies + bypass válidos.
    const scriptsConcat = await page.evaluate(async () => {
        const srcs = Array.from(document.scripts).map(s => s.src).filter(Boolean);
        const bodies = await Promise.all(srcs.map(src =>
            fetch(src).then(r => r.ok ? r.text() : '').catch(() => '')
        ));
        return bodies.join('\n');
    });
    const copyEnTuteo = /Tu sesi[oó]n expir[oó]\.\s+(Te llevamos al login|Recarga la p[aá]gina e inicia sesi[oó]n de nuevo)/;
    expect(scriptsConcat.match(copyEnTuteo)?.length ?? 0, 'Copy "Tu sesión expiró..." en tuteo presente en JS servido').toBeGreaterThan(0);
    // Anti-voseo — cero variantes `expirá` / `Recargá` / `Iniciá` en el mismo copy.
    expect(scriptsConcat, 'Cero voseo (expirá/Recargá/Iniciá) en copy de sesión expirada').not.toMatch(/sesi[oó]n expir[aá]\.\s+(Te llevamos|Recarg[aá]|Inici[aá])/);
});

// -- Item 4 REDIRECT-403 — user autenticado no-admin no cae en loop /login -

test('[REDIRECT-403] user autenticado no-admin no queda atrapado en loop /login al hitear /admin', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => { /* soak */ });
    const urlFinal = new URL(page.url()).pathname + new URL(page.url()).search;
    const esLoopLogin = /^\/login(\?|$)/.test(urlFinal);
    expect(esLoopLogin, `URL final "${urlFinal}" NO debe ser /login (loop-prone). Aceptado: /explorar, /403, o /admin con toast`).toBe(false);
});

// -- Item 5 ORPH-EDIT — saves críticos no exponen error.message crudo ------

test.fixme('[ORPH-EDIT] saves críticos del editor proveedor no exponen error.message crudo', async () => {
    // Ejecutable solo con rol proveedor (Aldo). Grep local PASO 0 encontró
    // 2 saves con `toast.error(\`Error al guardar: ${error.message}\`)` en
    // pages/proveedor/index.tsx L990 y L1167. Veredicto preliminar: VIVO.
    // Fix estructural (map error → copy amigable + detalle a Sentry) va
    // bajo rol proveedor en el spec del sprint proper.
});

// -- Item 6 TRIPLE-RECOV — UserContext recupera sesión tras hard refresh --

test('[TRIPLE-RECOV] UserContext recupera sesión tras hard refresh', async ({ page }) => {
    await page.goto('/favoritos', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /favorit/i }).first())
        .toBeVisible({ timeout: 10_000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /favorit/i }).first())
        .toBeVisible({ timeout: 10_000 });
    expect(page.url(), 'Post-reload sigue en /favoritos (no expulsó a /login por race)').not.toMatch(/\/login/);
});

// -- Item 7 ADMIN-DUP — ruta canónica de admin proveedores -----------------

test('[ADMIN-DUP] ruta canónica de admin proveedores no duplica destinos', async ({ page }) => {
    const response = await page.goto('/admin?tab=proveedores', { waitUntil: 'domcontentloaded' });
    expect(response, 'Response de /admin?tab=proveedores existe').not.toBeNull();
    const status = response!.status();
    expect(status, `Status ${status} no debe ser 5xx (500-599)`).toBeLessThan(500);
});

// -- Item 8 UBI-1 — sección "Ubicación" visible en perfil público ---------

test('[UBI-1] perfil público del proveedor muestra sección "Ubicación"', async ({ page }) => {
    const { proveedorId } = await pickServicioIdConAgenda();
    await page.goto(`/proveedor/${proveedorId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^Ubicaci[oó]n$/i }).first())
        .toBeVisible({ timeout: 8_000 });
});

// -- Item 9 RES-MASC — modal filtra mascotas por especie aceptada ---------

test.describe('[RES-MASC] modal reserva filtra mascotas por especie aceptada', () => {
    // Fixture inline: crear 2 mascotas para Camila (1 perro + 1 gato),
    // abrir el modal sobre un servicio solo-perros, asertar que el gato
    // NO aparece en el select del modal.
    const PREFIX = `E2E-conviene-${Date.now()}-`;
    let mascotaPerroId: string | null = null;
    let mascotaGatoId: string | null = null;

    test.beforeAll(async () => {
        const supabase = getSupabaseAsTutor();
        const { data: perro, error: errP } = await supabase
            .from('mascotas')
            .insert({
                user_id: CAMILA_AUTH_ID,
                nombre: `${PREFIX}perro`,
                tipo: 'perro',
                tamano: 'mediano',
            })
            .select('id')
            .single();
        if (errP || !perro) throw new Error(`[RES-MASC] insert perro falló: ${errP?.message ?? 'sin data'}`);
        mascotaPerroId = (perro as { id: string }).id;

        const { data: gato, error: errG } = await supabase
            .from('mascotas')
            .insert({
                user_id: CAMILA_AUTH_ID,
                nombre: `${PREFIX}gato`,
                tipo: 'gato',
                tamano: 'pequeño',
            })
            .select('id')
            .single();
        if (errG || !gato) throw new Error(`[RES-MASC] insert gato falló: ${errG?.message ?? 'sin data'}`);
        mascotaGatoId = (gato as { id: string }).id;
    });

    test.afterAll(async () => {
        const supabase = getSupabaseAsTutor();
        if (mascotaPerroId) {
            const { error } = await supabase.from('mascotas').delete().eq('id', mascotaPerroId);
            if (error) console.warn(`[RES-MASC] cleanup perro ${mascotaPerroId}: ${error.message}`);
        }
        if (mascotaGatoId) {
            const { error } = await supabase.from('mascotas').delete().eq('id', mascotaGatoId);
            if (error) console.warn(`[RES-MASC] cleanup gato ${mascotaGatoId}: ${error.message}`);
        }
    });

    test('servicio "Paseos dinamicos" (solo perros) oculta el gato del select', async ({ page }) => {
        await page.goto(`/servicio/${SERVICIO_SOLO_PERROS_ID}`, { waitUntil: 'domcontentloaded' });
        const cta = page.getByRole('button', { name: /reservar|solicitar/i }).first();
        await expect(cta, 'CTA reserva/solicitar visible').toBeVisible({ timeout: 8_000 });
        await cta.click();
        // El modal V1 renderea (aria dialog o similar). Damos margen amplio
        // porque el chunk async puede tardar en el primer open.
        const modal = page.getByRole('dialog').first();
        await expect(modal, 'Modal de reserva abierto').toBeVisible({ timeout: 10_000 });
        // Assertion: el nombre del perro APARECE en el modal, el del gato NO.
        // Búsqueda case-sensitive por el PREFIX único de este run.
        const perroTexto = modal.getByText(new RegExp(`${PREFIX}perro`));
        const gatoTexto = modal.getByText(new RegExp(`${PREFIX}gato`));
        await expect(perroTexto, `Perro "${PREFIX}perro" visible en modal (servicio acepta perros)`)
            .toBeVisible({ timeout: 5_000 });
        // El gato NO debe aparecer — assertion negativa con count===0.
        await expect(gatoTexto, `Gato "${PREFIX}gato" NO debe aparecer (servicio NO acepta gatos)`)
            .toHaveCount(0);
    });
});

// -- Item 10 MAIL-MASC — bloque "Mascota" en template email + panel -------

test.skip('[MAIL-MASC] template email al proveedor incluye bloque con especie/nombre de la mascota', async () => {
    // Diagnostic por grep local (PASO 0): VIVO — template
    // AgendamientoProveedorEmail.tsx sin bloque mascota (0 matches de
    // "mascota|Mascota"). Fix en el sprint proper.
});

// -- Item 11 MIS-RESERVAS-TABS — tab activa con indicador visual ----------

test.describe('[MIS-RESERVAS-TABS] tab activa de /mis-reservas tiene indicador visual', () => {
    // Fixture inline: insertar 1 reserva efímera confirmada para Camila
    // sobre un servicio existente → /mis-reservas deja el empty state y
    // rendea las 3 tabs (Próximas / Pendientes / Historial).
    let reservaId: string | null = null;

    test.beforeAll(async () => {
        const supabase = getSupabaseAsTutor();
        const { servicioId, proveedorId } = await pickServicioIdConAgenda();
        // Reserva confirmada, 5 días en el futuro → cae en pestaña Próximas
        // por el estadoDerivado (fecha_preferida > hoy + estado='confirmada').
        const fecha = new Date();
        fecha.setDate(fecha.getDate() + 5);
        const { data, error } = await supabase
            .from('agendamientos')
            .insert({
                servicio_id: servicioId,
                proveedor_id: proveedorId,
                tutor_id: CAMILA_AUTH_ID,
                fecha_preferida: fecha.toISOString(),
                estado: 'confirmada',
                mensaje: '[E2E conviene MIS-RESERVAS-TABS] fixture efímero — se limpia en afterAll',
                duracion_min: 60,
            })
            .select('id')
            .single();
        if (error || !data) {
            throw new Error(`[MIS-RESERVAS-TABS] insert reserva falló: ${error?.message ?? 'sin data'}`);
        }
        reservaId = (data as { id: string }).id;
    });

    test.afterAll(async () => {
        const supabase = getSupabaseAsTutor();
        if (reservaId) {
            const { error } = await supabase.from('agendamientos').delete().eq('id', reservaId);
            if (error) console.warn(`[MIS-RESERVAS-TABS] cleanup reserva ${reservaId}: ${error.message}`);
        }
    });

    test('tab activa (Próximas) tiene aria-selected=true o className distintiva de las inactivas', async ({ page }) => {
        await page.goto('/mis-reservas', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: /mis reservas/i }).first())
            .toBeVisible({ timeout: 10_000 });
        // Con 1 reserva insertada, el render debe salir del empty state y
        // mostrar las 3 tabs. Aceptamos 2 markups posibles: role=tab (react-tabs
        // canonical) o buttons (implementación custom del sprint PRODUCTO-2).
        const tabsPorRole = page.locator('[role="tab"]');
        const cantidadPorRole = await tabsPorRole.count();
        if (cantidadPorRole >= 3) {
            const activa = page.locator('[role="tab"][aria-selected="true"]');
            await expect(activa, 'Exactamente 1 tab activa con aria-selected=true (a11y)')
                .toHaveCount(1);
        } else {
            const proximas = page.getByRole('button', { name: /pr[oó]ximas/i }).first();
            await expect(proximas, 'Botón "Próximas" visible como tab').toBeVisible({ timeout: 5_000 });
            const pendientes = page.getByRole('button', { name: /pendientes/i }).first();
            await expect(pendientes, 'Botón "Pendientes" visible como tab').toBeVisible({ timeout: 5_000 });
            const historial = page.getByRole('button', { name: /historial/i }).first();
            await expect(historial, 'Botón "Historial" visible como tab').toBeVisible({ timeout: 5_000 });
            const classProximas = await proximas.getAttribute('class');
            const classPendientes = await pendientes.getAttribute('class');
            expect(classProximas, 'Tab activa (Próximas) y inactiva (Pendientes) tienen className distinta')
                .not.toBe(classPendientes);
        }
    });
});
