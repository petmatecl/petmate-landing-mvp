// lib/types/agendamiento.ts
// ----------------------------------------------------------------------------
// Tipo compartido del feature de agendamiento. Sprint 3 hardcodeo `any` en
// la tab Solicitudes del proveedor; Sprint 4 lo extrae para que el panel
// del proveedor y la pagina del tutor compartan shape sin drift.
//
// El shape refleja el join que ambos lados hacen contra usuarios_buscadores
// / proveedores / servicios_publicados via FK.
// ----------------------------------------------------------------------------

export type EstadoAgendamiento = 'pendiente' | 'confirmada' | 'rechazada' | 'cancelada';

export interface AgendamientoRow {
    id: string;
    servicio_id: string;
    proveedor_id: string;
    tutor_id: string;
    fecha_preferida: string | null;
    mensaje: string | null;
    estado: EstadoAgendamiento;
    nota_proveedor: string | null;
    respondido_at: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Shape devuelto por la query con joins (`tutor:usuarios_buscadores!...`).
 * Para Sprint 4 mantenemos solo el subset necesario para render — ambos
 * lados (proveedor + tutor) consumen el mismo shape, pero usan campos
 * distintos (proveedor mira `tutor`, tutor mira `proveedor`).
 */
export interface AgendamientoConRelaciones extends AgendamientoRow {
    tutor?: {
        id: string;
        nombre: string | null;
        apellido_p: string | null;
        foto_perfil?: string | null;
    } | null;
    proveedor?: {
        id: string;
        nombre: string | null;
        apellido_p?: string | null;
        foto_perfil?: string | null;
        telefono?: string | null;
        whatsapp?: string | null;
        mostrar_telefono?: boolean | null;
        mostrar_whatsapp?: boolean | null;
    } | null;
    servicio?: {
        id: string;
        titulo: string | null;
    } | null;
}
