// Configuración de campos específicos por categoría de servicio.
// Cada categoría define qué campos adicionales puede completar el proveedor
// para dar información de valor a los clientes.

export const DIAS_SEMANA = [
    'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
] as const;

export type FieldType = 'text' | 'number' | 'select' | 'boolean' | 'days' | 'time';

export interface ServiceField {
    key: string;
    label: string;
    type: FieldType;
    placeholder?: string;
    options?: string[];  // for select type
    suffix?: string;     // e.g. "mascotas", "minutos"
    helpText?: string;
    icon?: string;       // emoji for display
}

export interface CategoryFieldsConfig {
    sectionTitle: string;
    fields: ServiceField[];
}

// Campos específicos por slug de categoría
export const SERVICE_DETAILS_CONFIG: Record<string, CategoryFieldsConfig> = {
    traslado: {
        sectionTitle: 'Detalles del Servicio de Traslado',
        fields: [
            { key: 'dias_disponibles', label: 'Días disponibles', type: 'days', icon: '📅' },
            { key: 'horario_inicio', label: 'Horario desde', type: 'time', icon: '🕐' },
            { key: 'horario_fin', label: 'Horario hasta', type: 'time', icon: '🕐' },
            { key: 'tipo_vehiculo', label: 'Tipo de vehículo', type: 'select', options: ['Auto', 'Camioneta', 'SUV', 'Van', 'Furgón', 'Otro'], icon: '🚗', placeholder: 'Selecciona el tipo de vehículo' },
            { key: 'capacidad_mascotas', label: 'Capacidad de mascotas por viaje', type: 'number', placeholder: 'Ej: 3', suffix: 'mascotas', icon: '🐾' },
            { key: 'zona_cobertura', label: 'Zona de cobertura', type: 'text', placeholder: 'Ej: Santiago Centro, Providencia, Las Condes', icon: '📍', helpText: 'Comunas o sectores donde realizas traslados' },
            { key: 'tiene_aire_acondicionado', label: 'Vehículo con aire acondicionado', type: 'boolean', icon: '❄️' },
            { key: 'tiene_jaula_transporte', label: 'Cuenta con jaula de transporte', type: 'boolean', icon: '📦' },
        ]
    },
    paseos: {
        sectionTitle: 'Detalles del Servicio de Paseos',
        fields: [
            { key: 'dias_disponibles', label: 'Días disponibles', type: 'days', icon: '📅' },
            { key: 'horario_inicio', label: 'Horario desde', type: 'time', icon: '🕐' },
            { key: 'horario_fin', label: 'Horario hasta', type: 'time', icon: '🕐' },
            { key: 'duracion_paseo', label: 'Duración del paseo', type: 'select', options: ['30 minutos', '45 minutos', '1 hora', '1.5 horas', '2 horas', 'Personalizable'], icon: '⏱️' },
            { key: 'capacidad_mascotas', label: 'Máximo de mascotas por paseo', type: 'number', placeholder: 'Ej: 4', suffix: 'mascotas', icon: '🐾' },
            { key: 'zona_cobertura', label: 'Zona de cobertura', type: 'text', placeholder: 'Ej: Providencia, Ñuñoa, La Reina', icon: '📍', helpText: 'Comunas o sectores donde realizas paseos' },
            { key: 'incluye_fotos', label: 'Envía fotos/videos durante el paseo', type: 'boolean', icon: '📸' },
            { key: 'paseo_grupal', label: 'Realiza paseos grupales', type: 'boolean', icon: '👥' },
        ]
    },
    hospedaje: {
        sectionTitle: 'Detalles del Hospedaje',
        fields: [
            { key: 'dias_disponibles', label: 'Días disponibles', type: 'days', icon: '📅' },
            { key: 'capacidad_mascotas', label: 'Capacidad máxima de mascotas', type: 'number', placeholder: 'Ej: 2', suffix: 'mascotas', icon: '🐾' },
            { key: 'tiene_patio', label: 'Cuenta con patio o jardín', type: 'boolean', icon: '🌳' },
            { key: 'espacio_interior', label: 'Tipo de espacio interior', type: 'select', options: ['Departamento pequeño', 'Departamento amplio', 'Casa pequeña', 'Casa amplia', 'Casa con jardín'], icon: '🏠' },
            { key: 'supervision_nocturna', label: 'Supervisión nocturna', type: 'boolean', icon: '🌙' },
            { key: 'camaras_vigilancia', label: 'Tiene cámaras de vigilancia', type: 'boolean', icon: '📹' },
            { key: 'otras_mascotas_hogar', label: 'Hay otras mascotas en el hogar', type: 'boolean', icon: '🏡' },
        ]
    },
    guarderia: {
        sectionTitle: 'Detalles de la Guardería',
        fields: [
            { key: 'dias_disponibles', label: 'Días disponibles', type: 'days', icon: '📅' },
            { key: 'horario_inicio', label: 'Horario de apertura', type: 'time', icon: '🕐' },
            { key: 'horario_fin', label: 'Horario de cierre', type: 'time', icon: '🕐' },
            { key: 'capacidad_mascotas', label: 'Capacidad máxima de mascotas', type: 'number', placeholder: 'Ej: 5', suffix: 'mascotas', icon: '🐾' },
            { key: 'actividades_incluidas', label: 'Actividades incluidas', type: 'text', placeholder: 'Ej: Juego libre, socialización, descanso supervisado', icon: '🎾', helpText: 'Describe las actividades que realizan las mascotas' },
            { key: 'tiene_patio', label: 'Cuenta con patio o área exterior', type: 'boolean', icon: '🌳' },
            { key: 'camaras_vigilancia', label: 'Tiene cámaras de vigilancia', type: 'boolean', icon: '📹' },
        ]
    },
    peluqueria: {
        sectionTitle: 'Detalles de Peluquería',
        fields: [
            { key: 'dias_disponibles', label: 'Días disponibles', type: 'days', icon: '📅' },
            { key: 'horario_inicio', label: 'Horario desde', type: 'time', icon: '🕐' },
            { key: 'horario_fin', label: 'Horario hasta', type: 'time', icon: '🕐' },
            { key: 'duracion_sesion', label: 'Duración promedio de una sesión', type: 'select', options: ['30 minutos', '45 minutos', '1 hora', '1.5 horas', '2 horas', 'Variable según raza'], icon: '⏱️' },
            { key: 'servicios_incluidos', label: 'Servicios que ofreces', type: 'text', placeholder: 'Ej: Baño, corte, deslanado, limpieza de oídos, corte de uñas', icon: '✂️' },
            { key: 'atencion_domicilio', label: 'Ofrece atención a domicilio', type: 'boolean', icon: '🏠' },
        ]
    },
    veterinario: {
        sectionTitle: 'Detalles del Servicio Veterinario',
        fields: [
            { key: 'dias_disponibles', label: 'Días de atención', type: 'days', icon: '📅' },
            { key: 'horario_inicio', label: 'Horario desde', type: 'time', icon: '🕐' },
            { key: 'horario_fin', label: 'Horario hasta', type: 'time', icon: '🕐' },
            { key: 'especialidades', label: 'Especialidades', type: 'text', placeholder: 'Ej: Medicina general, dermatología, traumatología', icon: '🩺' },
            { key: 'atencion_domicilio', label: 'Atención a domicilio', type: 'boolean', icon: '🏠' },
            { key: 'atencion_urgencias', label: 'Atención de urgencias', type: 'boolean', icon: '🚨' },
        ]
    },
    adiestramiento: {
        sectionTitle: 'Detalles del Adiestramiento',
        fields: [
            { key: 'dias_disponibles', label: 'Días disponibles', type: 'days', icon: '📅' },
            { key: 'horario_inicio', label: 'Horario desde', type: 'time', icon: '🕐' },
            { key: 'horario_fin', label: 'Horario hasta', type: 'time', icon: '🕐' },
            { key: 'modalidad', label: 'Modalidad', type: 'select', options: ['Presencial', 'A domicilio', 'Online', 'Mixta'], icon: '📋' },
            { key: 'duracion_sesion', label: 'Duración de cada sesión', type: 'select', options: ['30 minutos', '45 minutos', '1 hora', '1.5 horas', '2 horas'], icon: '⏱️' },
            { key: 'tipo_adiestramiento', label: 'Tipo de adiestramiento', type: 'text', placeholder: 'Ej: Obediencia básica, modificación de conducta, socialización', icon: '🎓' },
            { key: 'capacidad_mascotas', label: 'Máximo de mascotas por sesión', type: 'number', placeholder: 'Ej: 1', suffix: 'mascotas', icon: '🐾' },
        ]
    },
    domicilio: {
        sectionTitle: 'Detalles del Cuidado a Domicilio',
        fields: [
            { key: 'dias_disponibles', label: 'Días disponibles', type: 'days', icon: '📅' },
            { key: 'horario_inicio', label: 'Horario desde', type: 'time', icon: '🕐' },
            { key: 'horario_fin', label: 'Horario hasta', type: 'time', icon: '🕐' },
            { key: 'capacidad_mascotas', label: 'Máximo de mascotas que atiende', type: 'number', placeholder: 'Ej: 3', suffix: 'mascotas', icon: '🐾' },
            { key: 'zona_cobertura', label: 'Zona de cobertura', type: 'text', placeholder: 'Ej: Santiago Centro, Providencia, Ñuñoa', icon: '📍', helpText: 'Comunas o sectores donde te desplazas' },
            { key: 'incluye_fotos', label: 'Envía fotos/reportes al dueño', type: 'boolean', icon: '📸' },
        ]
    },
};

// Labels para mostrar los valores booleanos
export const BOOLEAN_LABELS: Record<string, { true: string; false: string }> = {
    tiene_aire_acondicionado: { true: 'Con aire acondicionado', false: 'Sin aire acondicionado' },
    tiene_jaula_transporte: { true: 'Con jaula de transporte', false: 'Sin jaula de transporte' },
    incluye_fotos: { true: 'Incluye fotos/videos', false: '' },
    paseo_grupal: { true: 'Realiza paseos grupales', false: 'Solo paseos individuales' },
    tiene_patio: { true: 'Con patio/jardín', false: 'Sin patio' },
    supervision_nocturna: { true: 'Con supervisión nocturna', false: '' },
    camaras_vigilancia: { true: 'Con cámaras de vigilancia', false: '' },
    otras_mascotas_hogar: { true: 'Hay otras mascotas en el hogar', false: 'Sin otras mascotas en el hogar' },
    atencion_domicilio: { true: 'Atención a domicilio disponible', false: '' },
    atencion_urgencias: { true: 'Atiende urgencias', false: '' },
};
