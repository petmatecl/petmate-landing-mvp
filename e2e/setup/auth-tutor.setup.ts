// e2e/setup/auth-tutor.setup.ts
// ---------------------------------------------------------------------------
// Setup project — autentica al usuario tutor puro de staging (Camila
// Figueroa Mendoza según la decisión F2-3 punto 3) y guarda storageState en
// e2e/.auth/tutor.json. Corre en paralelo al setup de proveedor
// (auth.setup.ts) — ambos son independientes; los specs que necesitan cada
// rol declaran su storageState via project distinto.
//
// Sumar más roles en el futuro (admin puro, otro tutor, etc): copiar este
// archivo, cambiar credenciales + storageState path, agregar un project en
// playwright.config.ts. Cero refactor del helper `authenticate`.
//
// Requisitos en e2e/.env.test (gitignored):
//   E2E_STAGING_TUTOR_EMAIL     — email de Camila (tutora pura staging)
//   E2E_STAGING_TUTOR_PASSWORD  — su password
// ---------------------------------------------------------------------------
import { test as setup } from '@playwright/test';
import path from 'path';
import { authenticate } from './authenticate';

setup('authenticate as tutor', async ({ page }) => {
    await authenticate(page, {
        email: process.env.E2E_STAGING_TUTOR_EMAIL ?? '',
        password: process.env.E2E_STAGING_TUTOR_PASSWORD ?? '',
        storageStatePath: path.resolve(__dirname, '../.auth/tutor.json'),
        roleName: 'tutor',
    });
});
