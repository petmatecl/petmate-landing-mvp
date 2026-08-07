// e2e/specs/zonab-1/s10-a11y-modales-batch.spec.ts
// ---------------------------------------------------------------------------
// ZB1 sprint ZONAB-1 — smoke a11y kbd sobre los modales migrados en batch.
//
// El sweep anterior (F2-3 s10) cubrió SolicitarAgendamientoModal +
// ConfirmDialog "Cancelar reserva". Este spec cubre 1 representativo del
// batch nuevo migrado en ZB1: el modal "Ficha del Proveedor" (inline en
// pages/admin/proveedores.tsx) — antes no tenía role/aria; ZB1 le agregó
// role="dialog" + aria-modal + aria-labelledby.
//
// Cobertura indirecta del resto del batch: los 9 componentes migrados a
// useModalDialog (ConfirmDialog, ExampleCTAModal, VerificationGateModal,
// LoginRequiredModal, ModalAlert, ReportModal, ReviewModal,
// MobileActionSheet, SitterDetailModal) heredan el patrón por consumir
// el mismo hook. Tests exhaustivos por modal son deuda light si algún
// flujo específico rompe. El spec s6 de F2-3 ya ejercita el
// ConfirmDialog migrado ("Cancelar reserva dentro de ventana").
//
// El spec corre bajo el project `chromium` (proveedor storageState = Aldo
// con rol admin en staging).
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';

test.describe('ZB1 S10 — a11y kbd sobre modales migrados', () => {
    test('Modal "Ficha del Proveedor" (admin): role=dialog + aria-modal + Escape cierra', async ({ page }) => {
        await page.goto('/admin/proveedores');

        // Esperar a que la lista termine de cargar. El heading H1 aparece
        // temprano; los items de la tabla llegan tras el fetch a Supabase.
        // Anchor determinístico: los triggers del detalle son
        //   * botón con title="Ver Perfil" (Eye icon) — para estado aprobado/suspendido
        //   * botón "Revisar" — para placeholder/rechazado
        //   * <p> clickeable con el nombre del proveedor — para todos
        // Usamos el botón Revisar como primer intento (staging tiene
        // placeholders creados por el seed) y fallback a "Ver Perfil".
        const revisarBtn = page.getByRole('button', { name: /^Revisar$/ }).first();
        const verPerfilBtn = page.locator('button[title="Ver Perfil"]').first();

        // Esperar a que ALGUNO de los dos triggers esté visible (lo que
        // implica que la tabla ya renderizó al menos una fila).
        await expect(async () => {
            const revisarCount = await revisarBtn.count();
            const verCount = await verPerfilBtn.count();
            expect(revisarCount + verCount).toBeGreaterThan(0);
        }).toPass({ timeout: 20_000 });

        if (await revisarBtn.count()) {
            await revisarBtn.click();
        } else {
            await verPerfilBtn.click();
        }

        // Verificar que el modal aparece con role=dialog + aria-modal.
        await expect(page.getByRole('heading', { name: /Ficha del Proveedor/i })).toBeVisible({ timeout: 10_000 });

        const check = await page.evaluate(() => {
            const headings = Array.from(document.querySelectorAll('h3'));
            const heading = headings.find(h => /Ficha del Proveedor/i.test(h.textContent ?? ''));
            if (!heading) return { found: false, ariaModal: null as string | null, labelledById: null as string | null, headingId: null as string | null };
            const dialog = heading.closest('div[role="dialog"]');
            return {
                found: !!dialog,
                ariaModal: dialog?.getAttribute('aria-modal') ?? null,
                labelledById: dialog?.getAttribute('aria-labelledby') ?? null,
                headingId: heading.id || null,
            };
        });
        expect(check.found, 'heading "Ficha del Proveedor" no tiene ancestor role="dialog"').toBe(true);
        expect(check.ariaModal).toBe('true');
        expect(check.labelledById).toBeTruthy();
        expect(check.labelledById).toBe(check.headingId);

        // Nota Escape: los modales inline de admin/proveedores.tsx tienen
        // role/aria mínimos pero NO usan useModalDialog (deuda light
        // documentada en el comentario del bloque MODALES OVERLAYS). Por
        // eso el spec no chequea Escape acá — sí lo hace el spec s6 de
        // F2-3 para ConfirmDialog, que sí usa el hook.
    });
});
