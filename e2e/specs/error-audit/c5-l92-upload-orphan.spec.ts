// e2e/specs/error-audit/c5-l92-upload-orphan.spec.ts
// ---------------------------------------------------------------------------
// Sprint e2e-error-audit-2 — Case 5 línea 92: handlePhotoUpload en
// ClientLayout.tsx reorden verificar-antes-de-escribir.
//
// Cubre el fix de commit f40f499 (sprint error-audit) — el orden crítico
// del upload de foto: verificar rol ANTES de subir el archivo al bucket
// storage. Antes: upload sucedía primero, luego se verificaba el rol; si
// era tutor (no tiene columna foto_perfil), el flow mostraba "No disponible
// aún" pero el archivo YA estaba huérfano en el bucket avatars.
//
// Además del bug de huérfanos, el fix cubre el error de red en la query
// de rol: post-fix, si la query falla, se muestra un toast "No pudimos
// guardar la foto — Vuelve a intentar" en vez de proceder al upload +
// UPDATE con WHERE que no matchea (silent-lie previa).
//
// Los 2 tests corren bajo project `chromium-tutor-mobile` — el
// avatar-upload label es `md:hidden` (mobile-only). Camila es tutora, la
// query esBuscador debe encontrar su fila.
//
// **Assertion strategy — Opción (b) acordada con PO 2026-09-08**:
// primary = ausencia del request `storage/v1/object/avatars` en Network.
// secondary (dependiente de la policy amplia en BACKLOG) = count del
// bucket via anon key. Cuando la policy se cierre, la primary sigue
// válida; la secondary se marca skipped con nota.
//
// Protocolo P8:
//   Test 1 (control positivo) — sin bloqueo, click avatar → modal "No
//     disponible aún" + cero request a storage/avatars.
//   Test 2 (negativo) — con bloqueo usuarios_buscadores*, click avatar
//     → toast "No pudimos guardar la foto — Vuelve a intentar." + cero
//     request a storage.
// ---------------------------------------------------------------------------
import { test, expect, type Route, type Request } from '@playwright/test';

const USUARIO_MASCOTAS_ROUTE = '/usuario/mascotas';
const USUARIOS_BUSCADORES_PATTERN = '**/rest/v1/usuarios_buscadores*';
const STORAGE_AVATARS_PATTERN = /storage\/v1\/object\/avatars/;

// Payload PNG mínimo válido (1x1 transparente) — 67 bytes. Usado para
// disparar el file input sin necesitar un archivo real en disco.
const FAKE_PNG_BUFFER = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d494441547801636000000005000102b53c8b090000000049454e44ae426082',
    'hex',
);

test.describe('e2e-error-audit C5-L92 — reorden verificar-antes-de-upload', () => {
    test('1) control positivo: sin bloqueo → modal "No disponible aún" + cero upload al bucket', async ({ page }) => {
        // Rastrear todas las requests al bucket avatars.
        const avatarRequests: string[] = [];
        page.on('request', (req: Request) => {
            if (STORAGE_AVATARS_PATTERN.test(req.url())) {
                avatarRequests.push(`${req.method()} ${req.url()}`);
            }
        });

        await page.goto(USUARIO_MASCOTAS_ROUTE);
        // Aguardar que la ClientLayout monte (el fetchClientProfile hidrata
        // el avatar sin bloquear la interacción con #avatar-upload).
        await expect(page.getByText('Usuario Verificado')).toBeVisible({ timeout: 15_000 });

        // El input file avatar-upload es hidden (label md:hidden lo dispara).
        // setInputFiles funciona directo sobre el input hidden.
        await page.locator('#avatar-upload').setInputFiles({
            name: 'smoke.png',
            mimeType: 'image/png',
            buffer: FAKE_PNG_BUFFER,
        });

        // Post-fix flujo: fetchClientProfile pregunta rol → Camila matchea
        // esBuscador → showAlert('No disponible aún', 'La foto de perfil
        // todavía no está habilitada para tutores.', 'info') → return.
        // CERO upload al bucket.
        await expect(page.getByText('No disponible aún')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/no está habilitada para tutores/)).toBeVisible();

        // ASSERTION PRIMARY: cero request al bucket avatars.
        // Esta assertion es la que garantiza que el fix del orden funciona
        // (verificar rol ANTES de upload → huérfano no se crea).
        expect(avatarRequests, `Cero requests esperados al bucket, hubo: ${avatarRequests.join('; ')}`).toEqual([]);
    });

    test('2) negativo: bloqueo usuarios_buscadores* → toast error + cero upload al bucket', async ({ page }) => {
        // Idem tracking.
        const avatarRequests: string[] = [];
        page.on('request', (req: Request) => {
            if (STORAGE_AVATARS_PATTERN.test(req.url())) {
                avatarRequests.push(`${req.method()} ${req.url()}`);
            }
        });

        await page.goto(USUARIO_MASCOTAS_ROUTE);
        // Aguardar hidratación inicial (fetchClientProfile hace su propia
        // query a usuarios_buscadores en mount).
        await expect(page.getByText('Usuario Verificado')).toBeVisible({ timeout: 15_000 });

        // Activar bloqueo DESPUÉS del mount para que fetchClientProfile
        // ya cargó el badge. El bloqueo afecta la SIGUIENTE query — la del
        // handlePhotoUpload (esBuscador check) — no la inicial.
        await page.route(USUARIOS_BUSCADORES_PATTERN, async (route: Route) => {
            await route.abort('failed');
        });

        await page.locator('#avatar-upload').setInputFiles({
            name: 'smoke.png',
            mimeType: 'image/png',
            buffer: FAKE_PNG_BUFFER,
        });

        // Post-fix flujo: fetchClientProfile pregunta rol → query aborta →
        // rolError truthy → showAlert('No pudimos guardar la foto', 'Vuelve
        // a intentar.', 'error') → return. CERO upload al bucket.
        await expect(page.getByText('No pudimos guardar la foto')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText('Vuelve a intentar.')).toBeVisible();

        // ASSERTION PRIMARY: cero request al bucket avatars.
        // El fix del orden garantiza que un error de red en la query rol NO
        // dispare el upload — ergo cero huérfano en el bucket.
        expect(avatarRequests, `Cero requests esperados al bucket, hubo: ${avatarRequests.join('; ')}`).toEqual([]);
    });
});
