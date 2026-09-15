// e2e/specs/d-base-ui/estado-actual.spec.ts
// ---------------------------------------------------------------------------
// Bloque D · PR D-3 base UI — Paso 0 diagnostic + regresión estructural.
//
// Verifica los items del PR:
//   1. BUTTON-CANON: componente compartido `components/UI/Button.tsx` existe
//      con las 4 variantes documentadas (primary/secondary/ghost/danger).
//   2. BUTTON-CANON: CookieBanner refactoreado — los 2 CTAs primarios
//      ("Aceptar todas" y "Guardar preferencias") importan y usan el
//      componente Button, no `<button className="bg-accent-600 ...">`.
//
// Tests structural via fs.readFile — rol-agnóstico, cero navegación.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { readFile, access } from 'fs/promises';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../..');

async function fileExists(relPath: string): Promise<boolean> {
    try {
        await access(path.join(REPO_ROOT, relPath));
        return true;
    } catch {
        return false;
    }
}

test('[d-base-ui BUTTON-CANON] componente Button.tsx existe con 4 variantes', async () => {
    expect(
        await fileExists('components/UI/Button.tsx'),
        'components/UI/Button.tsx debe existir',
    ).toBe(true);
    const source = await readFile(
        path.join(REPO_ROOT, 'components/UI/Button.tsx'),
        'utf-8',
    );
    // Union ButtonVariant declara las 4 variantes documentadas.
    expect(source, 'declara ButtonVariant con primary').toMatch(
        /ButtonVariant\s*=[^;]*'primary'/,
    );
    expect(source, 'declara ButtonVariant con secondary').toMatch(
        /ButtonVariant\s*=[^;]*'secondary'/,
    );
    expect(source, 'declara ButtonVariant con ghost').toMatch(
        /ButtonVariant\s*=[^;]*'ghost'/,
    );
    expect(source, 'declara ButtonVariant con danger').toMatch(
        /ButtonVariant\s*=[^;]*'danger'/,
    );
    // Sizes sm/md/lg/xl.
    expect(source, 'declara ButtonSize con sm/md/lg/xl').toMatch(
        /ButtonSize\s*=[^;]*'sm'[^;]*'md'[^;]*'lg'[^;]*'xl'/,
    );
});

test('[d-base-ui BUTTON-CANON] CookieBanner refactoreado a Button', async () => {
    const source = await readFile(
        path.join(REPO_ROOT, 'components/CookieBanner.tsx'),
        'utf-8',
    );
    // Importa el componente compartido.
    expect(source, 'importa Button desde UI/Button').toMatch(
        /import Button from ['"][^'"]*UI\/Button['"]/,
    );
    // Cero <button className="... bg-accent-600 ..."> crudo. El grep
    // busca botones nativos con el patrón canónico primary — si quedaron,
    // la migración no aterrizó.
    const bareButtonPrimary = /<button[^>]+className=["'`][^"'`]*bg-accent-600[^"'`]*["'`]/g;
    expect(
        source.match(bareButtonPrimary),
        'cero <button> con bg-accent-600 crudo (todos migrados a Button primary)',
    ).toBeNull();
    // Al menos 2 usos del componente Button (los 2 CTAs primarios
    // migrados en este PR).
    const buttonUsages = source.match(/<Button[\s>]/g);
    expect(buttonUsages && buttonUsages.length >= 2, `al menos 2 usos de <Button>, hay ${buttonUsages?.length ?? 0}`).toBe(true);
});
