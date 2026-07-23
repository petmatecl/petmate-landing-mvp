// e2e/setup/auth.setup.ts
// ---------------------------------------------------------------------------
// Setup project — autentica al usuario staging (rol proveedor + admin) y
// guarda storageState en e2e/.auth/proveedor.json. Corre una vez antes de
// toda la suite; el resto de projects (chromium) depende de este.
//
// Para sumar otro rol (ej. tutor en F2-4): crear e2e/setup/auth-tutor.setup.ts
// con su propio storageState path y credenciales. Zero refactor del helper.
//
// Requisitos en e2e/.env.test (gitignored):
//   E2E_STAGING_EMAIL      — email del usuario proveedor+admin en staging
//   E2E_STAGING_PASSWORD   — su password
// ---------------------------------------------------------------------------
import { test as setup } from '@playwright/test';
import path from 'path';
import { authenticate } from './authenticate';

setup('authenticate as proveedor', async ({ page }) => {
    await authenticate(page, {
        email: process.env.E2E_STAGING_EMAIL ?? '',
        password: process.env.E2E_STAGING_PASSWORD ?? '',
        storageStatePath: path.resolve(__dirname, '../.auth/proveedor.json'),
        roleName: 'proveedor',
    });
});
