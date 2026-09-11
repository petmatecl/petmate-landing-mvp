// e2e/specs/pan-1/race-mascotas-reviewform.spec.ts
// ---------------------------------------------------------------------------
// PAN-1 PR-3b · regresión del patrón buggy `useEffect(() =>
// supabase.auth.getSession()..., [])` en 2 archivos más (además del bell
// del PR-3):
//
//   - `pages/usuario/mascotas/index.tsx` — 2 lugares:
//       * L1083-1090 (default export): race del auth resolution →
//         `session === null` → `router.push('/login')` → user autenticado
//         REDIRIGIDO INCORRECTAMENTE al login. Bug productivo grave.
//       * L207-213 (MascotasPageContent): race → `userId` queda null →
//         fetchMascotas no corre → tabla vacía indefinida aunque el user
//         sí tenga mascotas.
//   - `components/Service/ReviewForm.tsx` L60-67: race → `setUser(null)` +
//     `setLoadingAuth(false)` → form muestra "iniciá sesión" a user
//     autenticado.
//
// Fix uniforme: `useUser()` del contexto (fuente reactiva) en vez de
// getSession local + useEffect[]. Effect deps `[user?.id]` re-corre
// cuando auth se resuelve.
//
// Este spec verifica el caso más crítico: Camila (tutor) navega a
// `/usuario/mascotas` con storageState. PRE-FIX: race deja `session=null`
// en el mount → redirect a `/login`. POST-FIX: RoleGuard + useUser
// resuelven correcto, no redirect.
//
// El fix del ReviewForm es UI-cosmético (muestra "iniciá sesión" cuando
// hay sesión) — su regresión visual queda cubierta indirectamente por
// tests existentes de review que abren el form con user autenticado. No
// escribimos test dedicado.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';

// Correr como Camila (tutor) — el bug pre-fix redirigía a /login cuando
// race del getSession local devolvía null. `use` override storageState del
// project default (chromium/proveedor) al de tutor. Cero necesidad de
// tocar playwright.config para agregar un project nuevo por este spec.
test.use({ storageState: 'e2e/.auth/tutor.json' });

test.describe('PAN-1 PR-3b · race auth resolution en /usuario/mascotas', () => {
    test('Camila navega a /usuario/mascotas → NO redirige a /login', async ({ page }) => {
        // Usa storageState de tutor (Camila). Navegación gated por
        // RoleGuard(requiredRole="usuario") — si el fix funciona, la
        // página monta y RoleGuard resuelve el rol via UserContext sin
        // redirect prematuro.
        await page.goto('/usuario/mascotas');
        // Aguardar por hidratación mínima — cualquier estado post-navegación
        // sirve para descartar el redirect racy.
        await page.waitForLoadState('domcontentloaded');
        // Verificación: la URL NO cambió a /login post-mount.
        // Espera un poco para dar chance al race pre-fix (mount + auth
        // resolution + posible redirect); 3s es holgado, el race lo cerraba
        // en <500ms typically.
        await page.waitForTimeout(3_000);
        expect(page.url()).not.toContain('/login');
        // Confirmación positiva: la página muestra su título "Mis mascotas"
        // (heading H1) → montó completo, no está el spinner de RoleGuard
        // indefinido ni una pantalla de login.
        await expect(page.getByRole('heading', { name: /Mis mascotas/i })).toBeVisible({ timeout: 10_000 });
    });
});
