// lib/camposPorCategoria.ts
// ----------------------------------------------------------------------------
// FUENTE UNICA de los campos categoria-especificos a nivel servicio. Sprint 4
// Fase 1: unifica la antigua definicion inline de ServiceFormModal con la de
// este archivo. Antes existian dos definiciones paralelas con keys distintas
// (`campo.tipo` aqui vs `campo.type` alla, `opciones` vs `options`, set de
// campos disjunto). Se conserva el shape de este archivo (`tipo`,
// `opciones: {value,label}[]`, soporte `condicionalDe`) y se mergea el
// contenido de ambas.
//
// Consumers:
//   - components/Proveedor/ServiceFormModal.tsx     (edicion completa de un servicio)
//   - components/Proveedor/ServicioDetallesForm.tsx (edicion rapida de detalles per-servicio — antes DatosEspecificosForm)
//   - pages/register.tsx                            (Step 3 del wizard)
//   - components/Servicio/ServiceDetailView.tsx     (ficha publica del servicio)
//   - pages/proveedor/[id].tsx                      (ficha publica del proveedor)
//
// Reconciliacion de keys (las que diferian entre las dos definiciones legacy):
//
//   Categoria       lib legacy → SFM legacy → CANONICA (Fase 1)
//   hospedaje       tipo_vivienda         tipo_espacio        → tipo_espacio  (3 vals: casa/departamento/campo)
//                   capacidad_maxima      capacidad           → capacidad
//                   otras_mascotas_hogar  mascotas_propias    → mascotas_propias
//                   tiene_ninos           ninos_en_hogar      → ninos_en_hogar
//   domicilio       servicios_incluidos   que_incluye         → que_incluye (textarea)
//                   incluye_medicamentos  administra_medicamentos → administra_medicamentos
//                   incluye_foto_reporte  envia_foto_reporte  → envia_foto_reporte
//   paseos          max_perros_simultaneos max_perros         → max_perros
//                   acepta_razas_grandes  razas_fuerza        → razas_fuerza
//                   usa_gps               lleva_gps           → usa_gps
//                   envia_reporte_fotos   envia_fotos         → envia_fotos
//   guarderia       capacidad_maxima      capacidad           → capacidad
//                   tiene_camara          camara_vigilancia   → camara_vigilancia
//                   envia_fotos           fotos_durante       → fotos_durante
//   peluqueria      atiende_en            modalidad           → modalidad (vals lowercase canonicos)
//                   tiene_mesa_hidraulica mesa_hidraulica     → mesa_hidraulica
//                   razas_especiales(text) razas_especiales(bool) → razas_especiales TEXT (mas informativo;
//                                                                    candidato a multiselect en Fase 2)
//   veterinario     hace_urgencias        atiende_urgencias   → atiende_urgencias
//                   especialidad(singular) especialidades(plural) → especialidades
//   traslado        tipo_vehiculo(select 3) tipo_vehiculo(text) → tipo_vehiculo select 4 (+ "otro")
//                   acepta_mascotas_grandes mascotas_grandes  → acepta_mascotas_grandes
//   adiestramiento  modalidad(individual/grupal) modalidad(domicilio/online) → DOS EJES:
//                     formato (individual/grupal/ambas) + modalidad (domicilio/online/academia)
//                   certificacion         certificaciones     → certificaciones
//                   metodo (3 vals)       metodo (4 vals)     → metodo union (5 vals)
//                   va_domicilio          —                   → ELIMINADO (modalidad=domicilio lo cubre)
//   fotografia      edicion_profesional   incluye_edicion     → edicion_profesional
//
// Valores de `select`: siempre lowercase canonico en BD, label de display en
// `opciones[].label`. No mezclar UI labels en BD.
//
// NO se elimina ningun campo de los sets legacy — todo se mergea para que el
// dato existente en `servicios_publicados.detalles` siga renderizando con su
// nuevo label canonico (la migracion de keys legacy → canonicas para data
// existente es un paso separado, decision pendiente).
//
// BACKLOG Sprint 4 Fase 2+ (pendiente, no implementar aqui):
// Cuando un proveedor con `proveedores.datos_especificos` legacy (poblado
// pre-deprecacion del Sprint 4 Fase 1 Commit 3) crea su PRIMER servicio
// desde ServiceFormModal, ofrecer prefill del `detalles` del servicio
// nuevo a partir de ese blob. El blob legacy permanece en BD intacto
// (no se hizo migracion ni drop), asi que esta disponible para read en
// el momento del prefill. Mapeo de keys: usar el mismo set canonico que
// vive arriba (CAMPOS_POR_CATEGORIA[categoria]). Si la categoria del
// servicio nuevo difiere de la inferida del registro, solo se prefillen
// las keys que coinciden con el set de la nueva categoria; el resto se
// descarta. UX: mostrar un banner del estilo "Recuperamos campos que
// llenaste en tu registro" con boton "Usar"/"Empezar en blanco".
// ----------------------------------------------------------------------------

export type TipoCampoDinamico = 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'info';

export interface CampoDinamico {
    key: string;
    label: string;
    tipo: TipoCampoDinamico;
    placeholder?: string;
    requerido?: boolean;
    opciones?: { value: string; label: string }[];
    /** Sufijo de display para tipo `number` (ej. "mascotas", "km", "minutos"). Hoy las unidades viven dentro del `label` entre parentesis; este campo queda como hook para moverlas a data en Fase 2. */
    unit?: string;
    /** Si esta seteado, el campo solo se renderiza cuando datos[condicionalDe] === condicionalValor. */
    condicionalDe?: string;
    condicionalValor?: string | boolean | number;
}

// Sprint 4 Fase 2 / Commit B — inclusiones (multiselect) + notas (textarea)
// como reemplazo de booleans atomicos + textareas libres por categoria.
//
// Booleans absorbidos en `inclusiones` (eliminados del set):
//   hospedaje    : incluye_alimentacion, incluye_paseos, fotos_durante_estadia
//   guarderia    : fotos_durante                          (y `actividades` text → notas)
//   paseos       : usa_gps, envia_fotos
//   domicilio    : administra_medicamentos, envia_foto_reporte (y `que_incluye` textarea → notas)
//   peluqueria   : (sin booleans absorbidos; `que_incluye` textarea → notas)
//   veterinario  : atiende_urgencias                      (y `servicios_ofrecidos` textarea y `examenes_disponibles` text → notas / absorbido)
//   traslado     : tiene_jaula, acepta_mascotas_grandes   (y `equipamiento` text → notas)
//   adiestramiento: (sin booleans absorbidos)              (y `problemas_que_resuelve` textarea → notas)
//   fotografia   : edicion_profesional, entrega_digitales, acepta_multiples_mascotas
//
// La columna `servicios_publicados.detalles` jsonb queda intacta a nivel BD —
// las keys legacy de los servicios existentes se preservan; el render
// simplemente deja de mostrarlas (cae al `?? key` fallback si quedan en BD).
// Decision de migracion: opcion (a) deprecar; el unico mapping SQL aprobado es
// que_incluye → notas (entregado aparte para correr una vez).
export const CAMPOS_POR_CATEGORIA: Record<string, CampoDinamico[]> = {
    hospedaje: [
        { key: 'tipo_espacio', label: 'Tipo de espacio donde cuidas', tipo: 'select', opciones: [
            { value: 'casa', label: 'Casa' },
            { value: 'departamento', label: 'Departamento' },
            { value: 'campo', label: 'Campo / parcela' },
        ], requerido: true },
        { key: 'metros_espacio', label: 'Metros cuadrados disponibles para la mascota', tipo: 'number', placeholder: 'Ej: 30' },
        { key: 'capacidad', label: 'Capacidad máxima (mascotas simultáneas)', tipo: 'number', placeholder: 'Ej: 2', requerido: true },
        { key: 'tiene_patio', label: 'Tengo patio o jardín con acceso directo', tipo: 'boolean' },
        { key: 'piso_departamento', label: 'Piso del departamento', tipo: 'number', placeholder: 'Ej: 5', condicionalDe: 'tipo_espacio', condicionalValor: 'departamento' },
        { key: 'tiene_mallas_seguridad', label: 'Tengo mallas de seguridad en ventanas y balcones', tipo: 'boolean', condicionalDe: 'tipo_espacio', condicionalValor: 'departamento' },
        { key: 'camara_vigilancia', label: 'Tengo cámara de vigilancia para que el dueño vea a su mascota', tipo: 'boolean' },
        { key: 'mascotas_propias', label: 'Tengo mascotas propias en el hogar', tipo: 'boolean' },
        { key: 'tipo_mascotas_propias', label: '¿Qué mascotas tienes? (describe)', tipo: 'text', placeholder: 'Ej: 1 gato castrado tranquilo', condicionalDe: 'mascotas_propias', condicionalValor: true },
        { key: 'ninos_en_hogar', label: 'Hay niños menores de 12 años en el hogar', tipo: 'boolean' },
        { key: 'acepta_separacion', label: 'Puedo mantener mascotas separadas si es necesario', tipo: 'boolean' },
        { key: 'inclusiones', label: '¿Qué incluye tu servicio?', tipo: 'multiselect', opciones: [
            { value: 'alimentacion', label: 'Alimentación' },
            { value: 'paseos_diarios', label: 'Paseos diarios' },
            { value: 'fotos_diarias', label: 'Fotos diarias al dueño' },
            { value: 'juego', label: 'Juego / estimulación' },
            { value: 'espacio_separado', label: 'Espacio separado para la mascota' },
            { value: 'medicamentos', label: 'Administración de medicamentos' },
            { value: 'videollamada', label: 'Videollamada con el dueño' },
            { value: 'socializacion_otras_mascotas', label: 'Socialización con otras mascotas' },
        ] },
        { key: 'notas', label: 'Notas adicionales (opcional)', tipo: 'textarea', placeholder: 'Ej: Particularidades del espacio, rutina diaria, marca de alimento que uso...' },
    ],
    domicilio: [
        { key: 'info_domicilio', label: 'Tú vas a la casa del cliente. No necesitas espacio propio para mascotas.', tipo: 'info' },
        { key: 'visitas_por_dia', label: 'Visitas por día que puedes hacer', tipo: 'number', placeholder: 'Ej: 2', requerido: true },
        { key: 'duracion_visita', label: 'Duración de cada visita (minutos)', tipo: 'number', placeholder: 'Ej: 45', requerido: true },
        { key: 'radio_cobertura_km', label: 'Radio máximo de cobertura (km desde tu comuna)', tipo: 'number', placeholder: 'Ej: 5' },
        { key: 'inclusiones', label: '¿Qué incluye cada visita?', tipo: 'multiselect', opciones: [
            { value: 'alimentacion', label: 'Alimentación' },
            { value: 'agua_fresca', label: 'Cambio de agua fresca' },
            { value: 'limpieza_arenero', label: 'Limpieza de arenero' },
            { value: 'paseo_corto', label: 'Paseo corto' },
            { value: 'juego', label: 'Juego / estimulación' },
            { value: 'foto_reporte', label: 'Foto y reporte de la visita' },
            { value: 'medicamentos', label: 'Administración de medicamentos' },
            { value: 'riego_plantas', label: 'Riego de plantas' },
            { value: 'recoger_correspondencia', label: 'Recoger correspondencia' },
        ] },
        { key: 'notas', label: 'Notas adicionales (opcional)', tipo: 'textarea', placeholder: 'Ej: Detalles de la rutina, instrucciones especiales, alergias...' },
    ],
    paseos: [
        { key: 'max_perros', label: 'Máximo de perros simultáneos', tipo: 'number', placeholder: 'Ej: 3', requerido: true },
        { key: 'duracion_minutos', label: 'Duración estándar del paseo (minutos)', tipo: 'number', placeholder: 'Ej: 45' },
        { key: 'radio_cobertura_km', label: 'Radio de cobertura desde tu comuna (km)', tipo: 'number', placeholder: 'Ej: 3' },
        { key: 'zona_paseo', label: 'Zona o parque donde paseas habitualmente', tipo: 'text', placeholder: "Ej: Parque O'Higgins, Parque Forestal" },
        { key: 'comunas_adicionales', label: 'Otras comunas donde paseas (opcional)', tipo: 'text', placeholder: 'Ej: Ñuñoa, Macul' },
        { key: 'razas_fuerza', label: 'Acepto razas grandes o de fuerza (rottweiler, pitbull, etc.)', tipo: 'boolean' },
        { key: 'inclusiones', label: '¿Qué incluye el paseo?', tipo: 'multiselect', opciones: [
            { value: 'alimentacion', label: 'Snack / premio durante el paseo' },
            { value: 'agua_fresca', label: 'Agua fresca' },
            { value: 'juego', label: 'Juego / socialización' },
            { value: 'foto_reporte', label: 'Foto y reporte tras el paseo' },
            { value: 'gps_tracking', label: 'GPS / app de seguimiento' },
            { value: 'recogida_domicilio', label: 'Recogida en domicilio' },
        ] },
        { key: 'notas', label: 'Notas adicionales (opcional)', tipo: 'textarea', placeholder: 'Ej: Detalles de la ruta, horarios preferidos, equipo que uso...' },
    ],
    veterinario: [
        { key: 'universidad', label: 'Universidad donde estudié', tipo: 'text', placeholder: 'Ej: Universidad de Chile', requerido: true },
        { key: 'anio_titulacion', label: 'Año de titulación', tipo: 'number', placeholder: 'Ej: 2018' },
        { key: 'numero_registro', label: 'N.° de registro profesional', tipo: 'text', placeholder: 'Ej: 12345' },
        { key: 'especialidades', label: 'Especialidades', tipo: 'text', placeholder: 'Ej: Dermatología, Cirugía...' },
        { key: 'radio_cobertura_km', label: 'Radio máximo de cobertura a domicilio (km)', tipo: 'number', placeholder: 'Ej: 10' },
        { key: 'comunas_cobertura', label: 'Comunas donde atiendes a domicilio', tipo: 'text', placeholder: 'Ej: Providencia, Las Condes, Vitacura' },
        { key: 'emite_boleta', label: 'Emito boleta o factura', tipo: 'boolean' },
        { key: 'inclusiones', label: '¿Qué servicios ofreces?', tipo: 'multiselect', opciones: [
            { value: 'consulta_general', label: 'Consulta general' },
            { value: 'vacunas', label: 'Vacunas' },
            { value: 'desparasitacion', label: 'Desparasitación' },
            { value: 'examenes_basicos', label: 'Exámenes básicos (hemograma, ecografía, etc.)' },
            { value: 'atencion_urgencias', label: 'Atención de urgencias' },
            { value: 'cirugia_menor', label: 'Cirugía menor' },
            { value: 'certificados_salud', label: 'Certificados de salud' },
            { value: 'microchip', label: 'Implantación de microchip' },
        ] },
        { key: 'notas', label: 'Notas adicionales (opcional)', tipo: 'textarea', placeholder: 'Ej: Equipos disponibles, marcas de medicamentos, condiciones especiales de atención...' },
    ],
    traslado: [
        { key: 'tipo_vehiculo', label: 'Tipo de vehículo', tipo: 'select', opciones: [
            { value: 'auto', label: 'Auto' },
            { value: 'van', label: 'Van' },
            { value: 'furgon', label: 'Furgón' },
            { value: 'otro', label: 'Otro' },
        ], requerido: true },
        { key: 'capacidad_mascotas', label: 'Capacidad máxima de mascotas por viaje', tipo: 'number', placeholder: 'Ej: 2' },
        { key: 'radio_cobertura_km', label: 'Radio máximo de cobertura (km)', tipo: 'number', placeholder: 'Ej: 20' },
        { key: 'comunas_cobertura', label: 'Comunas de origen y destino que cubres', tipo: 'text', placeholder: 'Ej: Todo Santiago, Región Metropolitana' },
        { key: 'tiene_empresa', label: 'Opero con empresa o emito boleta', tipo: 'boolean' },
        { key: 'inclusiones', label: '¿Qué incluye tu servicio?', tipo: 'multiselect', opciones: [
            { value: 'jaula_propia', label: 'Jaula / transportín propio' },
            { value: 'mascotas_grandes', label: 'Acepto mascotas grandes (más de 30 kg)' },
            { value: 'climatizacion', label: 'Climatización (aire / calefacción)' },
            { value: 'multiples_pasajeros', label: 'Múltiples mascotas por viaje' },
            { value: 'seguro_traslado', label: 'Seguro de traslado' },
            { value: 'transporte_nacional', label: 'Transporte interregional / nacional' },
        ] },
        { key: 'notas', label: 'Notas adicionales (opcional)', tipo: 'textarea', placeholder: 'Ej: Equipamiento de seguridad, restricciones de horario, condiciones especiales...' },
    ],
    peluqueria: [
        { key: 'anios_experiencia', label: 'Años de experiencia', tipo: 'number', placeholder: 'Ej: 5', requerido: true },
        { key: 'modalidad', label: 'Modalidad de atención', tipo: 'select', opciones: [
            { value: 'local_propio', label: 'En mi local propio' },
            { value: 'domicilio', label: 'Voy al domicilio del cliente' },
            { value: 'ambos', label: 'Ambas opciones' },
        ], requerido: true },
        { key: 'duracion_estimada', label: 'Duración estimada por sesión', tipo: 'text', placeholder: 'Ej: 1-2 horas según tamaño' },
        { key: 'mesa_hidraulica', label: 'Cuento con mesa hidráulica profesional', tipo: 'boolean' },
        { key: 'certificaciones', label: 'Cursos o certificaciones', tipo: 'text', placeholder: 'Ej: Curso Groomex 2022, Especialidad Nordic' },
        // razas_especiales: texto libre por decision de Sprint 4 Fase 1. Aun
        // candidato a migrar a multiselect en una Fase 2b si se quiere
        // filtrabilidad — por ahora se queda como texto.
        { key: 'razas_especiales', label: 'Razas especiales que manejas (opcional)', tipo: 'text', placeholder: 'Ej: Poodle, Cocker, Schnauzer' },
        { key: 'radio_cobertura_km', label: 'Radio de cobertura si vas a domicilio (km)', tipo: 'number', placeholder: 'Ej: 5', condicionalDe: 'modalidad', condicionalValor: 'domicilio' },
        { key: 'inclusiones', label: '¿Qué incluye el servicio?', tipo: 'multiselect', opciones: [
            { value: 'bano', label: 'Baño' },
            { value: 'corte_pelo', label: 'Corte de pelo' },
            { value: 'corte_unas', label: 'Corte de uñas' },
            { value: 'limpieza_oidos', label: 'Limpieza de oídos' },
            { value: 'cepillado_dental', label: 'Cepillado dental' },
            { value: 'perfume', label: 'Perfume / finalización' },
            { value: 'desenredado', label: 'Desenredado / cepillado profundo' },
        ] },
        { key: 'notas', label: 'Notas adicionales (opcional)', tipo: 'textarea', placeholder: 'Ej: Productos que uso, condiciones para razas difíciles, recomendaciones...' },
    ],
    adiestramiento: [
        { key: 'metodo', label: 'Método de adiestramiento', tipo: 'select', opciones: [
            { value: 'positivo', label: 'Refuerzo positivo' },
            { value: 'mixto', label: 'Mixto' },
            { value: 'clicker', label: 'Clicker training' },
            { value: 'tradicional', label: 'Tradicional' },
            { value: 'otro', label: 'Otro' },
        ], requerido: true },
        { key: 'anios_experiencia', label: 'Años de experiencia', tipo: 'number', placeholder: 'Ej: 3' },
        // formato y modalidad son ejes ortogonales — formato describe tamaño
        // del grupo, modalidad describe lugar. Sprint 4 dejo ambos como
        // select separados (decision explicita del usuario, no se absorben
        // en inclusiones).
        { key: 'formato', label: 'Formato de trabajo', tipo: 'select', opciones: [
            { value: 'individual', label: 'Sesiones individuales' },
            { value: 'grupal', label: 'Clases grupales' },
            { value: 'ambas', label: 'Ambas modalidades' },
        ], requerido: true },
        { key: 'modalidad', label: 'Modalidad de atención', tipo: 'select', opciones: [
            { value: 'domicilio', label: 'A domicilio' },
            { value: 'online', label: 'Online' },
            { value: 'academia', label: 'Academia o local propio' },
        ], requerido: true },
        { key: 'duracion_sesion', label: 'Duración de la sesión (minutos)', tipo: 'number', placeholder: 'Ej: 60' },
        { key: 'certificaciones', label: 'Certificación profesional', tipo: 'text', placeholder: 'Ej: CPDT-KA, IAA' },
        { key: 'radio_cobertura_km', label: 'Radio de cobertura si vas a domicilio (km)', tipo: 'number', condicionalDe: 'modalidad', condicionalValor: 'domicilio' },
        { key: 'inclusiones', label: '¿Qué incluye tu servicio?', tipo: 'multiselect', opciones: [
            { value: 'evaluacion_inicial', label: 'Evaluación inicial' },
            { value: 'sesion_individual', label: 'Sesión individual' },
            { value: 'sesion_grupal', label: 'Sesión grupal' },
            { value: 'plan_personalizado', label: 'Plan personalizado' },
            { value: 'seguimiento_post_sesion', label: 'Seguimiento post-sesión' },
            { value: 'material_didactico', label: 'Material didáctico para el dueño' },
            { value: 'clases_socializacion', label: 'Clases de socialización' },
        ] },
        { key: 'notas', label: 'Notas adicionales (opcional)', tipo: 'textarea', placeholder: 'Ej: Problemas conductuales que trabajas, edad recomendada, enfoque pedagógico...' },
    ],
    guarderia: [
        { key: 'capacidad', label: 'Capacidad máxima de mascotas simultáneas', tipo: 'number', placeholder: 'Ej: 5', requerido: true },
        { key: 'horario', label: 'Horario de atención', tipo: 'text', placeholder: 'Ej: Lunes a viernes 8:00-18:00', requerido: true },
        { key: 'tipo_guarderia', label: 'Tipo de guardería', tipo: 'select', opciones: [
            { value: 'diurna', label: 'Solo diurna (horas)' },
            { value: 'nocturna', label: 'Incluye quedarse de noche' },
            { value: 'ambas', label: 'Ambas opciones' },
        ], requerido: true },
        { key: 'tiene_patio', label: 'Tengo patio o área al aire libre', tipo: 'boolean' },
        { key: 'camara_vigilancia', label: 'Tengo cámara para que el dueño vea a su mascota', tipo: 'boolean' },
        { key: 'inclusiones', label: '¿Qué incluye la guardería?', tipo: 'multiselect', opciones: [
            { value: 'alimentacion', label: 'Alimentación' },
            { value: 'paseos', label: 'Paseos' },
            { value: 'fotos_durante_dia', label: 'Fotos durante el día' },
            { value: 'socializacion', label: 'Socialización con otras mascotas' },
            { value: 'juego', label: 'Juego / estimulación' },
            { value: 'siesta_supervisada', label: 'Siesta supervisada' },
            { value: 'videollamada', label: 'Videollamada con el dueño' },
        ] },
        { key: 'notas', label: 'Notas adicionales (opcional)', tipo: 'textarea', placeholder: 'Ej: Rutina del día, actividades especiales, equipo del local...' },
    ],
    fotografia: [
        { key: 'tipo_sesion', label: 'Tipo de sesión', tipo: 'select', opciones: [
            { value: 'exterior', label: 'Exterior' },
            { value: 'estudio', label: 'Estudio' },
            { value: 'domicilio', label: 'A domicilio' },
            { value: 'todas', label: 'Todas las anteriores' },
        ], requerido: true },
        { key: 'anios_experiencia', label: 'Años de experiencia en fotografía', tipo: 'number', placeholder: 'Ej: 3' },
        { key: 'duracion_sesion', label: 'Duración estimada de la sesión', tipo: 'text', placeholder: 'Ej: 1 a 2 horas' },
        { key: 'fotos_entregadas', label: 'Cantidad de fotos entregadas', tipo: 'text', placeholder: 'Ej: 20 fotos editadas' },
        { key: 'equipo', label: 'Equipo fotográfico que utilizas', tipo: 'text', placeholder: 'Ej: Canon R6, lentes 50mm y 85mm, flash' },
        { key: 'portfolio_url', label: 'Link a tu portfolio (opcional)', tipo: 'text', placeholder: 'Ej: www.miportfolio.com' },
        { key: 'inclusiones', label: '¿Qué incluye tu servicio?', tipo: 'multiselect', opciones: [
            { value: 'edicion_profesional', label: 'Edición profesional' },
            { value: 'entrega_digital', label: 'Entrega en digital alta resolución' },
            { value: 'multiples_mascotas', label: 'Sesiones con múltiples mascotas' },
            { value: 'props_decoracion', label: 'Props / decoración temática' },
            { value: 'sesion_outdoor', label: 'Sesión outdoor' },
            { value: 'retoque_avanzado', label: 'Retoque avanzado' },
        ] },
        { key: 'notas', label: 'Notas adicionales (opcional)', tipo: 'textarea', placeholder: 'Ej: Estilo fotográfico, locaciones disponibles, paquetes especiales...' },
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

/**
 * Resuelve un campo por (categoria, key) para que los consumers (renders de
 * ficha publica, listing admin, etc.) puedan obtener el label y tipo canonico
 * sin duplicar el mapping. Retorna undefined si la categoria o la key no
 * existen — el caller puede caer a `key.replace(/_/g, ' ')` o similar.
 */
export function getCampoMeta(categoria: string, key: string): CampoDinamico | undefined {
    return CAMPOS_POR_CATEGORIA[categoria]?.find(c => c.key === key);
}

/**
 * Formatea un valor de `detalles[key]` para mostrar en la UI segun el tipo
 * del campo. Centraliza la logica que antes vivia duplicada en
 * pages/proveedor/[id].tsx (formatValor) y components/Servicio/ServiceDetailView.tsx.
 *
 * - boolean → "Sí" / "No"  (caller usualmente filtra `false` antes)
 * - select  → busca el `label` correspondiente en `opciones`
 * - resto   → String(value)
 *
 * Si `campo` es undefined (porque la categoria es desconocida o la key cayo
 * fuera del set canonico) cae a String(value), garantizando que un dato
 * legacy nunca rompa el render.
 */
export function formatValorCampo(campo: CampoDinamico | undefined, value: any): string {
    if (value === null || value === undefined || value === '') return '';
    if (Array.isArray(value) && value.length === 0) return '';
    if (!campo) return typeof value === 'boolean' ? (value ? 'Sí' : 'No') : String(value);
    if (campo.tipo === 'boolean') return value ? 'Sí' : 'No';
    if (campo.tipo === 'multiselect' && Array.isArray(value)) {
        // Resuelve cada slug a su label canonico (igual que select). Slugs
        // desconocidos en BD (data legacy o categorias divergentes) pasan tal
        // cual como fallback.
        return value
            .map((slug: string) => campo.opciones?.find(o => String(o.value) === String(slug))?.label ?? String(slug))
            .join(', ');
    }
    if (campo.tipo === 'select') {
        const opt = campo.opciones?.find(o => String(o.value) === String(value));
        return opt?.label ?? String(value);
    }
    return String(value);
}
