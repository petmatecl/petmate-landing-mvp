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

// Sprint pii-nombre-publico (2026-11-17) — tests de guardia P8 del PO:
// "Proveedor" solo puede aparecer si NO hay ningún nombre. Con nombre
// presente, siempre "Nombre I." o solo "Nombre" si no hay apellido.

test('P8 guardia — proveedor con nombre seteado NUNCA devuelve "Proveedor"', () => {
    // Caso real: 17 proveedores aprobados en prod con nombre="Renata"
    // apellido_p="Gacitúa" nombre_publico=NULL. Antes del fix del
    // mapper, el helper recibía input = {} y retornaba "Proveedor" —
    // el PO detectó el síntoma como NO-GO en el preview de #115.
    const casos = [
        { nombre: 'Renata', apellido_p: 'Gacitúa' },
        { nombre: 'Damián', apellido_p: 'Morel' },
        { nombre: 'Aranza', apellido_p: 'Velasquez' },
        { nombre: 'Eduardo', apellido_p: null },
        { nombre: 'Eduardo', apellido_p: '' },
        { nombre: 'Juan Pérez' },   // apellido embutido
        { nombre_publico: 'Peluquería Luna' },
    ];
    for (const c of casos) {
        const out = displayName(c);
        assert.notEqual(out, 'Proveedor', `displayName(${JSON.stringify(c)}) devolvió "Proveedor" cuando había input`);
    }
});

test('P8 guardia — proveedor con nombre NUNCA expone apellido completo', () => {
    // Un apellido real >1 char nunca debe aparecer entero en el output.
    const casos = [
        { nombre: 'Damián', apellido_p: 'Morel' },
        { nombre: 'Aranza', apellido_p: 'Velasquez' },
        { nombre: 'Renata', apellido_p: 'Gacitúa' },
        { nombre: 'Juan Pérez', apellido_p: null },
    ];
    for (const c of casos) {
        const out = displayName(c);
        const apellidoEmbutido = c.apellido_p ?? c.nombre?.split(/\s+/)[1] ?? null;
        if (apellidoEmbutido && apellidoEmbutido.length > 1) {
            assert.ok(
                !out.includes(apellidoEmbutido),
                `displayName(${JSON.stringify(c)}) = "${out}" contiene el apellido completo "${apellidoEmbutido}"`
            );
        }
    }
});

console.log(`\n${pass} passed · ${fail} failed`);
if (fail > 0) process.exit(1);
