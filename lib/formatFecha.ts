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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * "sábado 15 de junio, 14:00" — formato largo para fecha preferida del
 * agendamiento. Incluye dia de la semana, util porque el tutor agenda
 * con dias de anticipacion.
 */
export function formatFechaPreferida(input: Date | string | null | undefined): string {
    if (!input) return 'sin fecha';
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return 'sin fecha';
    return format(d, "EEEE d 'de' MMMM, HH:mm", { locale: es });
}

/**
 * "15 de junio, 14:00" — formato corto, sin dia de la semana. Para timestamps
 * de respondido_at / cancelado_at donde el contexto (ya pasó) no necesita
 * destacar el dia.
 */
export function formatFechaCorta(input: Date | string | null | undefined): string {
    if (!input) return '';
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return '';
    return format(d, "d 'de' MMMM, HH:mm", { locale: es });
}
