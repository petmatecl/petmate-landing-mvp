// lib/formatFecha.ts
// ----------------------------------------------------------------------------
// Helpers de formato de fecha consistente para el feature de agendamiento.
// Reusados por:
//   - pages/proveedor/index.tsx (tab Solicitudes)
//   - pages/mis-solicitudes.tsx (lado tutor)
//   - pages/api/agendamientos/notify-proveedor.ts (email)
//   - pages/api/agendamientos/notify-tutor.ts (email)
//
// Tener un helper centralizado garantiza que si Aldo cambia el formato,
// se actualiza en un solo lugar — y ambos lados (proveedor/tutor) ven
// la misma fecha textual.
// ----------------------------------------------------------------------------
import { differenceInCalendarDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

// Capitaliza SOLO la primera letra del string, sin tocar el resto. Necesario
// porque en espanol los dias/meses/preposiciones van en MINUSCULA (a
// diferencia del ingles donde se usa Title Case). El callsite anterior usaba
// la clase tailwind `capitalize` que aplica CSS text-transform:capitalize, el
// cual capitaliza CADA palabra — daba "Del Miercoles 1 De Julio Al Viernes 3
// De Julio (2 Noches)" en lugar de "Del miercoles 1 de julio al viernes 3 de
// julio (2 noches)". Pasaba desapercibido cuando el string empezaba con una
// sola palabra (e.g. "Sabado 15 de junio") pero quedo evidente con el rango.
function capitalizarPrimera(s: string): string {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * "Sábado 15 de junio, 14:00" — formato largo para fecha preferida del
 * agendamiento. Incluye dia de la semana, util porque el tutor agenda
 * con dias de anticipacion. Primera letra en mayuscula para que se vea
 * natural al inicio de un valor; el resto en minuscula segun convencion
 * del espanol.
 */
export function formatFechaPreferida(input: Date | string | null | undefined): string {
    if (!input) return 'sin fecha';
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return 'sin fecha';
    return capitalizarPrimera(format(d, "EEEE d 'de' MMMM, HH:mm", { locale: es }));
}

/**
 * "15 de junio, 14:00" — formato corto, sin dia de la semana. Para timestamps
 * de respondido_at / cancelado_at donde el contexto (ya pasó) no necesita
 * destacar el dia. Empieza con numero — capitalizar la primera letra es
 * no-op pero lo aplicamos por consistencia con los otros helpers.
 */
export function formatFechaCorta(input: Date | string | null | undefined): string {
    if (!input) return '';
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return '';
    return capitalizarPrimera(format(d, "d 'de' MMMM, HH:mm", { locale: es }));
}

/**
 * "Del viernes 4 de julio al lunes 7 de julio (3 noches)" — formato para
 * agendamientos V2 (cuidado rango de noches). Sin hora porque entrega/retiro
 * se coordina por chat. Usa differenceInCalendarDays para evitar errores de
 * borde por DST/timezone — cuenta DIAS de calendario, no horas / 24.
 *
 * Si las puntas son invalidas o iguales, devuelve "sin fecha" (defensa —
 * deberia bloquearse en validacion client + CHECK de BD).
 */
export function formatRangoNoches(
    inicio: Date | string | null | undefined,
    fin: Date | string | null | undefined
): string {
    if (!inicio || !fin) return 'sin fecha';
    const di = inicio instanceof Date ? inicio : new Date(inicio);
    const df = fin instanceof Date ? fin : new Date(fin);
    if (Number.isNaN(di.getTime()) || Number.isNaN(df.getTime())) return 'sin fecha';
    const noches = differenceInCalendarDays(df, di);
    if (noches < 1) return 'sin fecha';
    const inicioFmt = format(di, "EEEE d 'de' MMMM", { locale: es });
    const finFmt = format(df, "EEEE d 'de' MMMM", { locale: es });
    const sufijoNoches = noches === 1 ? '1 noche' : `${noches} noches`;
    return `Del ${inicioFmt} al ${finFmt} (${sufijoNoches})`;
}

/**
 * "Jueves 4 de julio, 14:00 · 3 horas" — formato para agendamientos V4b
 * (cuidado a domicilio puntual por horas). Combina fecha+hora con la
 * duracion. Plural correcto: 1 hora vs N horas. La duracion se separa por
 * un separador medium-dot por consistencia visual con otros campos de
 * sufijo en la UI.
 */
export function formatPuntualConDuracion(
    fechaHora: Date | string | null | undefined,
    horas: number | null | undefined
): string {
    if (!fechaHora || horas == null || horas < 1) return 'sin fecha';
    const d = fechaHora instanceof Date ? fechaHora : new Date(fechaHora);
    if (Number.isNaN(d.getTime())) return 'sin fecha';
    const fechaFmt = capitalizarPrimera(format(d, "EEEE d 'de' MMMM, HH:mm", { locale: es }));
    const duracionFmt = horas === 1 ? '1 hora' : `${horas} horas`;
    return `${fechaFmt} · ${duracionFmt}`;
}
