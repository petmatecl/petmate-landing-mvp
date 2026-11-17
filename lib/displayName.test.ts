// lib/displayName.test.ts
// ---------------------------------------------------------------------------
// Tests unitarios puros del helper. Ejecutable con:
//   npx tsx lib/displayName.test.ts
// Cero deps de framework — asserta con Node `assert/strict`. Mismo patrón que
// el resto de tests del proyecto (estadoDerivado, formatFecha, etc.).
// ---------------------------------------------------------------------------
import { strict as assert } from 'node:assert';
import { displayName } from './displayName';

let pass = 0;
let fail = 0;
function test(name: string, fn: () => void) {
    try {
        fn();
        pass += 1;
        console.log(`  ✓ ${name}`);
    } catch (e) {
        fail += 1;
        console.error(`  ✗ ${name}`);
        console.error('    ', (e as Error).message);
    }
}

console.log('\ndisplayName()\n');

test('null / undefined → Proveedor', () => {
    assert.equal(displayName(null), 'Proveedor');
    assert.equal(displayName(undefined), 'Proveedor');
});

test('nombre_publico seteado → literal (prioridad)', () => {
    assert.equal(
        displayName({ nombre_publico: 'Peluquería Luna', nombre: 'Juan', apellido_p: 'Pérez' }),
        'Peluquería Luna'
    );
    assert.equal(displayName({ nombre_publico: 'Petsitters CL' }), 'Petsitters CL');
});

test('nombre_publico vacío o solo espacios → fallback', () => {
    assert.equal(displayName({ nombre_publico: '', nombre: 'Juan', apellido_p: 'Pérez' }), 'Juan P.');
    assert.equal(displayName({ nombre_publico: '   ', nombre: 'Juan', apellido_p: 'Pérez' }), 'Juan P.');
    assert.equal(displayName({ nombre_publico: null, nombre: 'Juan', apellido_p: 'Pérez' }), 'Juan P.');
});

test('nombre + apellido_p separado → "Nombre I."', () => {
    assert.equal(displayName({ nombre: 'Eduardo', apellido_p: 'Contreras' }), 'Eduardo C.');
    assert.equal(displayName({ nombre: 'María Fernanda', apellido_p: 'González' }), 'María G.');
});

test('apellido_p embutido como segundo token del nombre (buscadores)', () => {
    assert.equal(displayName({ nombre: 'Camila Fuentes', apellido_p: null }), 'Camila F.');
    assert.equal(displayName({ nombre: 'Juan Pérez Soto', apellido_p: '' }), 'Juan P.');
});

test('solo nombre, sin apellido en ningún lado → solo primer token', () => {
    assert.equal(displayName({ nombre: 'Eduardo', apellido_p: null }), 'Eduardo');
    assert.equal(displayName({ nombre: '   Eduardo   ', apellido_p: null }), 'Eduardo');
});

test('nombre vacío + apellido seteado → Proveedor (sin nombre no hay pila)', () => {
    assert.equal(displayName({ nombre: '', apellido_p: 'Pérez' }), 'Proveedor');
    assert.equal(displayName({ nombre: null, apellido_p: 'Pérez' }), 'Proveedor');
});

test('nombre_publico con espacios al borde se trimmea', () => {
    assert.equal(displayName({ nombre_publico: '  Peluquería Luna  ' }), 'Peluquería Luna');
});

test('capitalización de inicial del apellido', () => {
    assert.equal(displayName({ nombre: 'Juan', apellido_p: 'pérez' }), 'Juan P.');
    assert.equal(displayName({ nombre: 'Juan', apellido_p: 'ÁLVAREZ' }), 'Juan Á.');
});

console.log(`\n${pass} passed · ${fail} failed`);
if (fail > 0) process.exit(1);
