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
    // Fase 1 del feature multi-dia: para variante V2 (cuidado rango noches)
    // este campo trae el check-out. fecha_preferida = check-in. Para V1
    // (puntual fecha+hora) queda null. Fases 2-3 lo reusan (V3 guarderia,
    // V4a cuidado a domicilio rango).
    fecha_fin: string | null;
    // Fase 2 — modalidad elegida por el tutor cuando solicita cuidado
    // (casa_tutor | casa_cuidador | recinto). Para servicios no-cuidado o
    // solicitudes legacy de Fase 1 queda null.
    modalidad_elegida: string | null;
    // Fase 2 — distingue V4a (casa_tutor noches) de V4b (casa_tutor horas).
    // Solo se popula cuando modalidad_elegida='casa_tutor'. null en otras.
    modo_tarifa: string | null;
    // Fase 2 — solo V4b. Duracion del servicio puntual a domicilio (1-12).
    duracion_horas: number | null;
    // Fase 2 — solo V4a/V4b (modalidad casa_tutor). Direccion libre donde se
    // presta el servicio. Max 500 chars (CHECK en BD).
    direccion_servicio: string | null;
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
