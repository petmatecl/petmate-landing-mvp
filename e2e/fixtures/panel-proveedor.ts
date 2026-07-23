// e2e/fixtures/panel-proveedor.ts
// ---------------------------------------------------------------------------
// Helpers para navegar el panel proveedor desde tests.
// ---------------------------------------------------------------------------
import { Page, expect } from '@playwright/test';

/**
 * Navega a /proveedor?tab=servicios y abre el modal de edición del servicio
 * cuyo título matchea `titulo`. Espera a que el modal esté visible antes de
 * retornar (usa #servicio-titulo como anchor único del modal).
 */
export async function abrirEditorServicio(page: Page, titulo: string): Promise<void> {
    await page.goto('/proveedor?tab=servicios');

    // El card del servicio efímero puede tardar en aparecer — networkidle
    // no es 100% confiable en Next.js con RSC + client fetches, pero da
    // margen para que la lista se hidrate.
    await page.waitForLoadState('domcontentloaded');

    // Locate the title text on the card. Título único por timestamp.
    const tituloLoc = page.getByText(titulo, { exact: true }).first();
    await expect(tituloLoc).toBeVisible({ timeout: 20_000 });

    // Ubicar el botón "Editar" en la misma card (ancestor común que contiene
    // ambos elementos). Usamos xpath porque el layout tiene varios divs
    // anidados y el filter de Playwright es menos preciso.
    const card = tituloLoc.locator('xpath=ancestor::*[.//button[normalize-space()="Editar" or contains(., "Editar")]][1]');
    await card.locator('button', { hasText: 'Editar' }).first().click();

    // Modal abierto: el input #servicio-titulo es único del modal.
    await expect(page.locator('#servicio-titulo')).toBeVisible({ timeout: 10_000 });
}

/**
 * Cierra el modal via botón X del header (o Escape si falla). Best-effort —
 * no throwea si ya está cerrado.
 */
export async function cerrarModal(page: Page): Promise<void> {
    if (await page.locator('#servicio-titulo').isVisible().catch(() => false)) {
        // Botón X del header del modal — busca aria-label "Cerrar" o similar.
        const closeBtn = page.getByRole('button', { name: /cerrar|close/i }).first();
        if (await closeBtn.isVisible().catch(() => false)) {
            await closeBtn.click();
        } else {
            await page.keyboard.press('Escape');
        }
        await expect(page.locator('#servicio-titulo')).not.toBeVisible({ timeout: 5_000 }).catch(() => {});
    }
}

/**
 * Espera al toggle F2 (label "Aceptar reservas por rango de noches") y lo
 * enciende si no lo está. Idempotente.
 */
export async function activarF2(page: Page): Promise<void> {
    const label = page.getByText('Aceptar reservas por rango de noches');
    await expect(label).toBeVisible({ timeout: 5_000 });
    // El checkbox está escondido (sr-only peer); toggleamos clickeando la label.
    const parent = label.locator('xpath=ancestor::label[1]');
    const checkbox = parent.locator('input[type="checkbox"]');
    if (!(await checkbox.isChecked())) {
        await parent.click();
    }
    await expect(checkbox).toBeChecked();
}

/**
 * Espera al toggle F2 y lo apaga si está encendido.
 */
export async function desactivarF2(page: Page): Promise<void> {
    const label = page.getByText('Aceptar reservas por rango de noches');
    await expect(label).toBeVisible({ timeout: 5_000 });
    const parent = label.locator('xpath=ancestor::label[1]');
    const checkbox = parent.locator('input[type="checkbox"]');
    if (await checkbox.isChecked()) {
        await parent.click();
    }
    await expect(checkbox).not.toBeChecked();
}

/**
 * Click en el botón principal de guardar del modal (Actualizar / Publicar).
 * No espera resultado — el caller decide qué esperar (toast success, error,
 * validación inline, etc.).
 */
export async function clickGuardar(page: Page): Promise<void> {
    // El texto es "Actualizar servicio" para edit o "Publicar servicio" para
    // nuevo. Usamos el patrón que matchea ambos.
    const btn = page.getByRole('button', { name: /Actualizar servicio|Publicar servicio|Guardar/i }).last();
    await expect(btn).toBeVisible();
    await btn.click();
}
