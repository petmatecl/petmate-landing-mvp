// lib/camposPorCategoria.ts
// ----------------------------------------------------------------------------
// Definicion centralizada de los campos categoria-especificos del perfil de
// proveedor. Antes vivia hardcoded en pages/register.tsx. Movido aca en
// Sprint 2 commit c para reusar en:
//   - pages/register.tsx (Step 3 del wizard)
//   - components/Proveedor/DatosEspecificosForm.tsx (tab Info del servicio
//     en el dashboard del proveedor)
//
// El objeto se serializa al JSONB proveedores.datos_especificos por el RPC
// registrar_proveedor (en signup) y por UPDATE directo (en edicion).
//
// Para agregar campos a una categoria existente: agregar entry al array.
// Para agregar una categoria nueva: agregar key al objeto + actualizar
// CATEGORIES en register.tsx + BD.
// ----------------------------------------------------------------------------

export type TipoCampoDinamico = 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'info';

export interface CampoDinamico {
    key: string;
    label: string;
    tipo: TipoCampoDinamico;
    placeholder?: string;
    requerido?: boolean;
    opciones?: { value: string; label: string }[];
    /** Si esta seteado, el campo solo se renderiza cuando datosDinamicos[condicionalDe] === condicionalValor. */
    condicionalDe?: string;
    condicionalValor?: string | boolean | number;
}

export const CAMPOS_POR_CATEGORIA: Record<string, CampoDinamico[]> = {
    hospedaje: [
        { key: "tipo_vivienda", label: "Tipo de vivienda donde cuidas", tipo: "select", opciones: [{ value: "casa", label: "Casa" }, { value: "departamento", label: "Departamento" }], requerido: true },
        { key: "metros_espacio", label: "Metros cuadrados del espacio disponible para la mascota", tipo: "number", placeholder: "Ej: 30" },
        { key: "capacidad_maxima", label: "Capacidad máxima (mascotas simultáneas)", tipo: "number", placeholder: "Ej: 2", requerido: true },
        { key: "tiene_patio", label: "Tengo patio o jardín con acceso directo", tipo: "boolean" },
        { key: "piso_departamento", label: "Piso del departamento", tipo: "number", placeholder: "Ej: 5", condicionalDe: "tipo_vivienda", condicionalValor: "departamento" },
        { key: "tiene_mallas_seguridad", label: "Tengo mallas de seguridad en ventanas y balcones", tipo: "boolean", condicionalDe: "tipo_vivienda", condicionalValor: "departamento" },
        { key: "otras_mascotas_hogar", label: "Tengo mascotas propias en el hogar", tipo: "boolean" },
        { key: "tipo_mascotas_propias", label: "¿Qué mascotas tienes? (describe)", tipo: "text", placeholder: "Ej: 1 gato castrado tranquilo", condicionalDe: "otras_mascotas_hogar", condicionalValor: true },
        { key: "tiene_ninos", label: "Hay niños menores de 12 años en el hogar", tipo: "boolean" },
        { key: "acepta_separacion", label: "Puedo mantener mascotas separadas si es necesario", tipo: "boolean" },
    ],
    domicilio: [
        { key: 'info_domicilio', label: 'Tú vas a la casa del cliente. No necesitas espacio propio para mascotas.', tipo: 'info' },
        { key: 'visitas_por_dia', label: 'Visitas por día que puedes hacer', tipo: 'number', placeholder: 'Ej: 2', requerido: true },
        { key: 'duracion_visita', label: 'Duración de cada visita (minutos)', tipo: 'number', placeholder: 'Ej: 45', requerido: true },
        { key: 'servicios_incluidos', label: '¿Qué incluye cada visita?', tipo: 'text', placeholder: 'Ej: Alimentación, paseo corto, limpieza' },
        { key: 'radio_cobertura_km', label: 'Radio máximo de cobertura (km desde tu comuna)', tipo: 'number', placeholder: 'Ej: 5' },
        { key: 'incluye_medicamentos', label: 'Puedo administrar medicamentos según instrucciones', tipo: 'boolean' },
        { key: 'incluye_foto_reporte', label: 'Envío foto y reporte de cada visita', tipo: 'boolean' },
    ],
    paseos: [
        { key: "max_perros_simultaneos", label: "Máximo de perros simultáneos", tipo: "number", placeholder: "Ej: 3", requerido: true },
        { key: "duracion_minutos", label: "Duración estándar del paseo (min)", tipo: "number", placeholder: "Ej: 45" },
        { key: "radio_cobertura_km", label: "Radio de cobertura en km desde tu comuna", tipo: "number", placeholder: "Ej: 3" },
        { key: "comunas_adicionales", label: "Otras comunas donde paseas (opcional)", tipo: "text", placeholder: "Ej: Ñuñoa, Macul" },
        { key: "acepta_razas_grandes", label: "Acepto razas grandes o de fuerza (rottweiler, pitbull, etc.)", tipo: "boolean" },
        { key: "usa_gps", label: "Uso GPS o app de seguimiento durante el paseo", tipo: "boolean" },
        { key: "envia_reporte_fotos", label: "Envío foto y reporte al dueño tras cada paseo", tipo: "boolean" },
    ],
    veterinario: [
        { key: "universidad", label: "Universidad donde estudié", tipo: "text", placeholder: "Ej: Universidad de Chile", requerido: true },
        { key: "anio_titulacion", label: "Año de titulación", tipo: "number", placeholder: "Ej: 2018" },
        { key: "numero_registro", label: "N.° de registro profesional", tipo: "text", placeholder: "Ej: 12345" },
        { key: "especialidad", label: "Especialidad (opcional)", tipo: "text", placeholder: "Ej: Dermatología, Cirugía..." },
        { key: "radio_cobertura_km", label: "Radio máximo de cobertura a domicilio (km)", tipo: "number", placeholder: "Ej: 10" },
        { key: "comunas_cobertura", label: "Comunas donde atiendes a domicilio", tipo: "text", placeholder: "Ej: Providencia, Las Condes, Vitacura" },
        { key: "hace_urgencias", label: "Atención de urgencias / horario extendido", tipo: "boolean" },
    ],
    traslado: [
        { key: "tipo_vehiculo", label: "Tipo de vehículo", tipo: "select", opciones: [{ value: "auto", label: "Auto" }, { value: "van", label: "Van" }, { value: "furgon", label: "Furgón" }], requerido: true },
        { key: "radio_cobertura_km", label: "Radio máximo de cobertura (km)", tipo: "number", placeholder: "Ej: 20" },
        { key: "comunas_cobertura", label: "Comunas de origen y destino que cubres", tipo: "text", placeholder: "Ej: Todo Santiago, Región Metropolitana" },
        { key: "tiene_jaula", label: "Tengo jaula o transportín para el traslado", tipo: "boolean" },
        { key: "acepta_mascotas_grandes", label: "Acepto mascotas grandes (más de 30 kg)", tipo: "boolean" },
        { key: "capacidad_mascotas", label: "Capacidad máxima de mascotas por viaje", tipo: "number", placeholder: "Ej: 2" },
        { key: "tiene_empresa", label: "Opero con empresa o emito boleta", tipo: "boolean" },
    ],
    peluqueria: [
        { key: "anios_experiencia", label: "Años de experiencia", tipo: "number", placeholder: "Ej: 5", requerido: true },
        { key: "atiende_en", label: "¿Dónde atiendes?", tipo: "select", opciones: [{ value: "local_propio", label: "En mi local propio" }, { value: "domicilio", label: "Voy al domicilio del cliente" }, { value: "ambos", label: "Ambas opciones" }], requerido: true },
        { key: "tiene_mesa_hidraulica", label: "Cuento con mesa hidráulica profesional", tipo: "boolean" },
        { key: "certificaciones", label: "Cursos o certificaciones", tipo: "text", placeholder: "Ej: Curso Groomex 2022, Especialidad Nordic" },
        { key: "razas_especiales", label: "Razas especiales que manejas (opcional)", tipo: "text", placeholder: "Ej: Poodle, Cocker, Schnauzer" },
        { key: "radio_cobertura_km", label: "Radio de cobertura si vas a domicilio (km)", tipo: "number", placeholder: "Ej: 5", condicionalDe: "atiende_en", condicionalValor: "domicilio" },
    ],
    adiestramiento: [
        { key: "metodo", label: "Método de adiestramiento", tipo: "select", opciones: [{ value: "positivo", label: "Refuerzo positivo" }, { value: "mixto", label: "Mixto" }, { value: "tradicional", label: "Tradicional" }], requerido: true },
        { key: "anios_experiencia", label: "Años de experiencia", tipo: "number", placeholder: "Ej: 3" },
        { key: "modalidad", label: "Modalidad de trabajo", tipo: "select", opciones: [{ value: "individual", label: "Sesiones individuales" }, { value: "grupal", label: "Clases grupales" }, { value: "ambas", label: "Ambas modalidades" }], requerido: true },
        { key: "va_domicilio", label: "Puedo ir al domicilio del cliente", tipo: "boolean" },
        { key: "duracion_sesion", label: "Duración de la sesión (minutos)", tipo: "number", placeholder: "Ej: 60" },
        { key: "certificacion", label: "Certificación profesional", tipo: "text", placeholder: "Ej: CPDT-KA, IAA" },
        { key: "radio_cobertura_km", label: "Radio de cobertura si vas a domicilio (km)", tipo: "number", condicionalDe: "va_domicilio", condicionalValor: true },
    ],
    guarderia: [
        { key: "capacidad_maxima", label: "Capacidad máxima de mascotas simultáneas", tipo: "number", placeholder: "Ej: 5", requerido: true },
        { key: "horario", label: "Horario de atención", tipo: "text", placeholder: "Ej: Lunes a viernes 8:00-18:00", requerido: true },
        { key: "tipo_guarderia", label: "Tipo de guardería", tipo: "select", opciones: [{ value: "diurna", label: "Solo diurna (horas)" }, { value: "nocturna", label: "Incluye quedarse de noche" }, { value: "ambas", label: "Ambas opciones" }], requerido: true },
        { key: "tiene_patio", label: "Tengo patio o jardín con acceso directo", tipo: "boolean" },
        { key: "tiene_camara", label: "Tengo cámara para que el dueño vea a su mascota", tipo: "boolean" },
        { key: "envia_fotos", label: "Envío fotos durante el día al dueño", tipo: "boolean" },
    ],
    fotografia: [
        { key: "tipo_sesion", label: "Tipo de sesión", tipo: "select", opciones: [{ value: "exterior", label: "Exterior" }, { value: "estudio", label: "Estudio" }, { value: "domicilio", label: "A domicilio" }, { value: "todas", label: "Todas las anteriores" }], requerido: true },
        { key: "anios_experiencia", label: "Años de experiencia en fotografía", tipo: "number", placeholder: "Ej: 3" },
        { key: "equipo", label: "Equipo fotográfico que utilizas", tipo: "text", placeholder: "Ej: Canon R6, lentes 50mm y 85mm" },
        { key: "portfolio_url", label: "Link a tu portfolio (opcional)", tipo: "text", placeholder: "Ej: www.miportfolio.com" },
        { key: "edicion_profesional", label: "Incluyo edición profesional de las fotos", tipo: "boolean" },
    ],
};

/**
 * Filtra los campos visibles segun las condicionales activas. Util para
 * iterar y renderizar solo los campos relevantes en cada momento.
 */
export function camposVisibles(categoria: string, datos: Record<string, any>): CampoDinamico[] {
    const campos = CAMPOS_POR_CATEGORIA[categoria];
    if (!campos) return [];
    return campos.filter((campo) => {
        if (!campo.condicionalDe) return true;
        const valorActual = datos[campo.condicionalDe];
        return valorActual === campo.condicionalValor;
    });
}
