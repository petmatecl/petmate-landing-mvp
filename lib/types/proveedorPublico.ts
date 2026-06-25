/**
 * Tipo de fila de la vista `proveedores_publicos` (columnas seguras + coords
 * redondeadas a 2 decimales + contactos gated por flags mostrar_*).
 *
 * Reemplaza la lectura directa de la tabla base `proveedores` desde paths
 * publicos (anon o sesion authenticated leyendo proveedores ajenos). La
 * tabla base solo es legible por el owner (auth.uid()=auth_user_id) o admin
 * (is_admin) — el sprint RLS junio 2026 cerro la lectura publica directa.
 *
 * El shape lo define el CREATE VIEW del DDL. Si la vista cambia (agregar /
 * quitar columnas), actualizar este tipo.
 */
export interface ProveedorPublico {
    id: string;
    auth_user_id: string | null;
    nombre: string | null;
    apellido_p: string | null;
    nombre_publico: string | null;
    foto_perfil: string | null;
    bio: string | null;
    comuna: string | null;
    region: string | null;
    comunas_cobertura: string[] | null;
    tipo_entidad: string | null;
    razon_social: string | null;
    nombre_fantasia: string | null;
    giro: string | null;
    ocupacion: string | null;
    anios_experiencia: number | null;
    certificaciones: string | null;
    primera_ayuda: boolean | null;
    rut_verificado: boolean | null;
    miembro_asociacion: boolean | null;
    idiomas: string[] | null;
    politica_cancelacion: string | null;
    politica_cancelacion_nota: string | null;
    lat: number | null;
    lng: number | null;
    telefono: string | null;
    whatsapp: string | null;
    email_publico: string | null;
    mostrar_telefono: boolean | null;
    mostrar_whatsapp: boolean | null;
    mostrar_email: boolean | null;
    sitio_web: string | null;
    instagram: string | null;
    facebook: string | null;
    tiktok: string | null;
    youtube: string | null;
    galeria: string[] | null;
    estado: string;
    created_at: string;
    updated_at: string;
    perfil_completo: boolean | null;
    es_ejemplo: boolean | null;
    visitas_total: number | null;
    visitas_mes: number | null;
    favoritos_total: number | null;
}
