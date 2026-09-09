// e2e/fixtures/panel-tutor.ts
// ---------------------------------------------------------------------------
// F2-3-E — helpers para navegar como tutor: abrir el modal de reserva desde
// la ficha del servicio, interactuar con el picker de rango de noches,
// confirmar reserva, y validar la card en /mis-solicitudes.
//
// Paralelo a panel-proveedor.ts (F2-2B) pero desde la perspectiva del tutor.
// ---------------------------------------------------------------------------
import { Page, expect } from '@playwright/test';
import path from 'path';
import { authenticate } from '../setup/authenticate';

/**
 * Verifica que la página tenga sesión activa como tutor. Si detecta guest,
 * re-loguea reusando el helper `authenticate` del setup y re-persiste el
 * storageState. Idempotente — no-op si ya hay sesión.
 *
 * Sprint f2-ci-fix (2026-09-09) — motivo. El spec `f2-3/s10-a11y-kbd.spec.ts`
 * cayó una vez en la corrida cross-project (workers=2) con Camila aterrizando
 * como guest en la ficha (yaml del error mostraba "Ingresar" link visible en
 * el header). En 3 corridas seriales `--workers=1 --retries=0` no reprodujo,
 * lo que apunta a un race de contexts cross-project que sobreescribe el
 * storageState en disco (`e2e/.auth/tutor.json`) durante la ejecución
 * paralela. La opción alternativa era forzar `workers: 1` para el project
 * chromium-tutor entero — descartada porque penaliza al resto de la suite
 * f2-3 (7 tests) con serialización cuando el único inestable era s10.
 *
 * Este helper aplica solo donde el guest→login sea aceptable como recovery
 * (specs cortos, sin dependencia de session pre-existente). Llamarlo desde
 * `beforeEach` de los describes afectados.
 */
export async function ensureLoggedInAsTutor(page: Page): Promise<void> {
    // Sanity check en / (ruta pública neutra que renderiza el header).
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const menuUsuario = page.getByRole('button', { name: /Menu de usuario/i });
    const yaLogueada = await menuUsuario.isVisible({ timeout: 3_000 }).catch(() => false);
    if (yaLogueada) return;

    // Guest detectado: re-loguear reusando el mismo flow del setup + persistir
    // storageState (mismo path que `auth-tutor.setup.ts:25`).
    const email = process.env.E2E_STAGING_TUTOR_EMAIL ?? '';
    const password = process.env.E2E_STAGING_TUTOR_PASSWORD ?? '';
    const storagePath = path.resolve(__dirname, '../.auth/tutor.json');
    await authenticate(page, {
        email,
        password,
        storageStatePath: storagePath,
        roleName: 'tutor',
    });
}

/**
 * Devuelve {ymd, day, month, year} para hoy + diasDesdeHoy. Se usa para
 * elegir fechas futuras determinísticas en los specs — el mes/día del mes
 * calculado dependen del calendar en el momento de la corrida, así que
 * los specs no pueden hardcodear día 10 ó 15 sin riesgo de caer en el pasado.
 */
export function fechaFuturoYmd(diasDesdeHoy: number): {
    ymd: string;
    day: number;
    month: number;   // 1-12
    year: number;
} {
    const d = new Date();
    d.setDate(d.getDate() + diasDesdeHoy);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return {
        ymd: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        day,
        month,
        year,
    };
}

/**
 * Navega el DayPicker al mes/año objetivo haciendo click en "Mes siguiente".
 * Asume que el picker arranca en el mes actual (comportamiento default de
 * SolicitarAgendamientoModal con `defaultMonth = mes actual`).
 */
export async function navegarPickerAMes(
    page: Page,
    targetMonth: number,
    targetYear: number,
): Promise<void> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const monthsForward = (targetYear - currentYear) * 12 + (targetMonth - currentMonth);
    for (let i = 0; i < monthsForward; i++) {
        const nextBtn = page.getByRole('button', {
            name: /Go to the Next Month|next month|Ir al mes siguiente|Mes siguiente/i,
        }).first();
        await nextBtn.click();
        // Buffer breve para el re-render del picker + refetch de disponibilidad.
        await page.waitForTimeout(250);
    }
}

/**
 * Navega a la ficha pública del servicio y abre el modal de reserva
 * click "Reservar" (o "Reservar servicio" — el copy exacto depende de la
 * ficha; usamos regex para cubrir variantes).
 */
export async function abrirModalReservaEstadia(page: Page, servicioId: string): Promise<void> {
    await page.goto(`/servicio/${servicioId}`);
    await page.waitForLoadState('domcontentloaded');

    // Botón principal del CTA de reserva en la ficha. El texto varía según
    // el estado del servicio (agenda activa vs no) y el modo (V1/V2/F2) —
    // regex cubre "Reservar" (F1/F2 instant-book) y "Enviar solicitud"
    // (legacy request). Sweep #3 taxonomía: el CTA "Solicitar agendamiento"
    // fue renombrado — F1/F2 muestran "Reservar" y legacy muestra "Enviar
    // solicitud". El heading del modal es "Reservar horario|estadía" para
    // F1/F2 y "Solicitar servicio" para legacy.
    const cta = page.getByRole('button', { name: /Reservar|Enviar solicitud/i }).first();
    await expect(cta).toBeVisible({ timeout: 20_000 });
    await cta.click();

    // Modal abierto — anchor único del modal de reserva del tutor.
    await expect(page.getByRole('heading', { name: /Reservar (estadía|horario)|Solicitar servicio/i })).toBeVisible({ timeout: 10_000 });
}

/**
 * Cierra el modal via botón X (o Escape si falla). Best-effort.
 */
export async function cerrarModalReserva(page: Page): Promise<void> {
    const closeBtn = page.getByRole('button', { name: /cerrar|close/i }).first();
    if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
    } else {
        await page.keyboard.press('Escape');
    }
}

/**
 * Encuentra un día en el DayPicker por su número. react-day-picker v8
 * renderiza cada día como un <button> con `name="fecha"` accesible.
 * Devuelve el locator; el caller puede clickear o assertar disabled.
 */
export function locatorDiaPicker(page: Page, dayOfMonth: number) {
    // react-day-picker v8 usa `<button name="day" aria-label="...">`. El
    // aria-label incluye "N de mes de año" en locale es. Preferimos matchear
    // el texto interno del button (el número).
    return page.locator('.rdp-day').filter({ hasText: new RegExp(`^${dayOfMonth}$`) }).first();
}

/**
 * Selecciona rango en el DayPicker por dos día-de-mes numéricos. Ambos
 * deben estar en el mes visible actual del picker.
 */
export async function seleccionarRangoPorDia(page: Page, desdeDay: number, hastaDay: number): Promise<void> {
    await locatorDiaPicker(page, desdeDay).click();
    await locatorDiaPicker(page, hastaDay).click();
}

/**
 * Click "Confirmar reserva" en el submit del modal.
 */
export async function clickConfirmarReserva(page: Page): Promise<void> {
    const btn = page.getByRole('button', { name: /Confirmar reserva|Enviar solicitud/i }).last();
    await expect(btn).toBeVisible();
    await btn.click();
}

/**
 * Navega a /mis-reservas y espera a que la lista de agendamientos esté
 * renderizada. Devuelve el locator del contenedor de cards.
 */
export async function irAMisSolicitudes(page: Page) {
    await page.goto('/mis-reservas');
    await page.waitForLoadState('domcontentloaded');
    // La página muestra un heading H1 "Mis reservas" (sweep #3). La ruta
    // Post Batch REMATE-1 R2b (2026-08-11): ruta renombrada a /mis-reservas.
    // El redirect 301 en next.config.js hace que goto('/mis-solicitudes')
    // funcione también (Playwright sigue el redirect). Este helper usa el
    // path canónico nuevo directo para no sumar hops innecesarios.
    await expect(page.getByRole('heading', { name: /Mis reservas/i })).toBeVisible({ timeout: 10_000 });
    return page.locator('article'); // cada card es <article>
}
