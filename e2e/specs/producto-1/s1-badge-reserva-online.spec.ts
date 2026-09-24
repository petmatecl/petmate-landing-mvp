// e2e/specs/producto-1/s1-badge-reserva-online.spec.ts
// ---------------------------------------------------------------------------
// PR1 sprint PRODUCTO-1 — badge "Reserva online" en cards del explorador.
//
// Verifica que el badge:
//   (a) APARECE en cards de servicios con agenda F2 activa (fixture existente
//       crearServicioCuidadoConF2 → agendamiento_habilitado + capacidad_estadia
//       + min_noches).
//   (b) NO APARECE en cards de servicios sin agenda (fixture existente
//       crearServicioCuidadoEfimero → agendamiento_habilitado true pero sin
//       config F1/F2 populada).
//
// Filtro por texto del título único (timestamp) para cero ambigüedad en el
// listado del explorador.
//
// REQUIERE aplicada la migration `migrations/20260731_buscar_servicios_agenda_activa_fix.sql`
// en staging DB. Sin ella, el RPC no retorna `tiene_agenda_activa` → el
// mapper defaultea a false → el spec falla en el assert (a).
//
// KNOWN-FLAKY (observado 2026-07-31 en la corrida de cierre PR1): primer
// intento falló con "locator not found" buscando la card por id en el
// listado del explorador (probable paginación / servicios nuevos empujados
// fuera de la 1ª página del RPC), retry #1 verde en 1.3s. Sin bloqueo
// pre-merge. Mejora conocida: agregar filtro `?categoria=cuidado&comuna=Providencia`
// al goto de /explorar para reducir el set y garantizar que la card esté
// en la 1ª página. Deuda registrada en el commit del cierre PR1.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { getSupabaseAsProveedor, getProveedorId } from '../../fixtures/supabase';
import {
    crearServicioCuidadoConF2,
    cleanupHuerfanosF23,
    type ServicioCuidadoListo,
} from '../../fixtures/servicio-cuidado-listo';
import {
    crearServicioCuidadoEfimero,
    borrarServicioResiliente,
    cleanupHuerfanos,
    type ServicioEfimero,
} from '../../fixtures/servicio-efimero';

test.describe.serial('PR1 S1 — badge "Reserva online" en /explorar', () => {
    let servicioConAgenda: ServicioCuidadoListo;
    let servicioSinAgenda: ServicioEfimero;

    test.beforeAll(async () => {
        const supabase = await getSupabaseAsProveedor();
        const proveedorId = await getProveedorId();

        // Limpiar residuos previos (misma protección que las suites F2).
        await cleanupHuerfanosF23(supabase, proveedorId);
        await cleanupHuerfanos(supabase, proveedorId);

        // Servicio CON agenda F2 activa (cuidado, capacidad_estadia=1,
        // min_noches=1, agendamiento_habilitado=true por default del fixture).
        servicioConAgenda = await crearServicioCuidadoConF2(supabase, {
            proveedorId,
            minNoches: 1,
            maxNoches: 30,
        });

        // Servicio SIN agenda activa (cuidado efímero, agendamiento_habilitado
        // true por default del fixture pero sin capacidad_estadia ni duracion_min
        // → tiene_agenda_activa = false según el semáforo del RPC/mapper).
        servicioSinAgenda = await crearServicioCuidadoEfimero(supabase, proveedorId);
    });

    test.afterAll(async () => {
        const supabase = await getSupabaseAsProveedor();
        if (servicioConAgenda) await borrarServicioResiliente(supabase, servicioConAgenda.id);
        if (servicioSinAgenda) await borrarServicioResiliente(supabase, servicioSinAgenda.id);
    });

    test('badge visible en servicio F2 activa, ausente en servicio sin agenda', async ({ page }) => {
        // Sprint cue-1-fix B2 (2026-09-24) — resolver deuda KNOWN-FLAKY
        // documentada en el header del spec: sin filtro, la card recién
        // creada puede caer fuera de la 1ª página del RPC (spec falla con
        // "locator not found"). El fixture crea servicios con
        // comunas_cobertura=['Providencia'] + categoría cuidado → aplicar
        // ese filtro garantiza que las cards estén en el set corto de la
        // primera página. Descubierto tras include del dir producto-1 al
        // workflow por B3 CI-SPEC-COUNT (spec llevaba semanas sin correr).
        await page.goto('/explorar?categoria=cuidado&comuna=Providencia');

        // Localizar por título exacto en el listado. Cada fixture usa un
        // titulo con timestamp único; sea con o sin query de texto, el título
        // aparece en la card como <h3>.
        const cardConAgenda = page
            .locator(`a[href*="/servicio/${servicioConAgenda.id}"]`)
            .first();
        await expect(cardConAgenda).toBeVisible({ timeout: 15_000 });

        // Assert (a): badge "Reserva online" presente en la card F2 activa.
        await expect(
            cardConAgenda.getByText(/Reserva online/i),
        ).toBeVisible();

        // Localizar la card sin agenda por su id.
        const cardSinAgenda = page
            .locator(`a[href*="/servicio/${servicioSinAgenda.id}"]`)
            .first();
        await expect(cardSinAgenda).toBeVisible({ timeout: 15_000 });

        // Assert (b): badge "Reserva online" AUSENTE en la card sin agenda.
        // `toBeHidden` con timeout corto — si el badge apareciera, esperaría
        // hasta el timeout y fallaría.
        await expect(
            cardSinAgenda.getByText(/Reserva online/i),
        ).toHaveCount(0);
    });
});
