// e2e/specs/e-header-a11y/estado-actual.spec.ts
// ---------------------------------------------------------------------------
// Sprint E-3 header y a11y — Paso 0 diagnostic + regresión estructural.
//
// Items del PR (walkthrough #1 + walkthrough interno M-ADMIN):
//   1. UX-6: chip del Header muestra pill del rol activo cuando hay más de
//      un rol; menú incluye entry "Panel de administración" cuando isAdmin.
//   2. a11y-3: sidebar tabs proveedor (desktop + mobile) con `role="tablist"`
//      + `role="tab"` + `aria-selected` + `aria-controls` + `tabIndex`.
//   3. M-ADMIN-1..4: los 4 modales de pages/admin/proveedores.tsx (aprobar,
//      rechazar, suspender, detalle) usan `useModalDialog` con ref propio
//      por modal.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { readFile } from 'fs/promises';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../..');

test('[e-header-a11y UX-6] Header pill rol activo + admin nav', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'components/Header.tsx'), 'utf-8');
    // isAdmin derivado de profile.roles.
    expect(source, 'isAdmin derivado de profile.roles').toMatch(
        /isAdmin\s*=\s*Array\.isArray\(profile\?\.roles\)\s*&&\s*profile\.roles\.includes\('admin'\)/,
    );
    // adminNav declarado.
    expect(source, 'adminNav declarado').toMatch(/adminNav\s*=[^;]*Panel de administración/);
    // Pill rol activo renderizado condicionalmente.
    expect(source, 'pill rol activo con rolesDisponibles.length > 1').toMatch(
        /rolActivo\s*&&\s*rolesDisponibles\.length\s*>\s*1/,
    );
    // ROL_LABEL con las 3 keys.
    expect(source, 'ROL_LABEL con Tutor/Proveedor/Admin').toMatch(
        /ROL_LABEL[\s\S]{0,200}tutor:[\s\S]{0,80}proveedor:[\s\S]{0,80}admin:/,
    );
});

test('[e-header-a11y a11y-3] sidebar proveedor con role=tablist + role=tab + aria-selected', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'pages/proveedor/index.tsx'), 'utf-8');
    // Desktop y mobile ambos con role=tablist.
    const tablists = source.match(/role="tablist"/g);
    expect(tablists && tablists.length >= 2, `al menos 2 role=tablist (desktop + mobile), hay ${tablists?.length ?? 0}`).toBe(true);
    // Cada tab con role="tab" + aria-selected + aria-controls + tabIndex.
    expect(source, 'role="tab" en botones').toMatch(/role="tab"/);
    expect(source, 'aria-selected en tabs').toMatch(/aria-selected=\{activeTab\s*===\s*item\.id\}/);
    expect(source, 'aria-controls en tabs').toMatch(/aria-controls=\{`proveedor-tabpanel-\$\{item\.id\}`\}/);
    expect(source, 'tabIndex 0/-1 roving').toMatch(/tabIndex=\{activeTab\s*===\s*item\.id\s*\?\s*0\s*:\s*-1\}/);
});

test('[e-header-a11y M-ADMIN-1..4] los 4 modales usan useModalDialog con refs propios', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'pages/admin/proveedores.tsx'), 'utf-8');
    // Import del hook.
    expect(source, 'import useModalDialog').toMatch(
        /from ['"][^'"]*useModalDialog['"]/,
    );
    // 4 refs distintas.
    expect(source, 'aprobarModalRef').toMatch(/aprobarModalRef\s*=\s*useRef/);
    expect(source, 'rechazarModalRef').toMatch(/rechazarModalRef\s*=\s*useRef/);
    expect(source, 'suspenderModalRef').toMatch(/suspenderModalRef\s*=\s*useRef/);
    expect(source, 'detalleModalRef').toMatch(/detalleModalRef\s*=\s*useRef/);
    // 4 llamadas al hook.
    const calls = source.match(/useModalDialog\(/g);
    expect(calls && calls.length >= 4, `al menos 4 llamadas a useModalDialog, hay ${calls?.length ?? 0}`).toBe(true);
    // blockClose durante actionLoading en las 3 que tienen submit.
    const blockCloseCount = (source.match(/blockClose:\s*actionLoading/g) || []).length;
    expect(blockCloseCount >= 3, `al menos 3 modales con blockClose:actionLoading, hay ${blockCloseCount}`).toBe(true);
});

test('[e-header-a11y M-ADMIN-4] botón cerrar de modal detalle con aria-label', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'pages/admin/proveedores.tsx'), 'utf-8');
    expect(source, 'aria-label="Cerrar ficha" en botón close del modal detalle').toMatch(
        /aria-label="Cerrar ficha"/,
    );
});
