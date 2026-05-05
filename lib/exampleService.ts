// lib/exampleService.ts
// Datos canónicos del servicio de ejemplo usado en /ejemplo.
// Shape compatible con el resultado de getServerSideProps en /servicio/[id].

const EXAMPLE_PROVEEDOR_ID = '00000000-0000-0000-0000-000000000001';
const EXAMPLE_AUTH_USER_ID = '00000000-0000-0000-0000-000000000002';
const EXAMPLE_SERVICE_ID = '00000000-0000-0000-0000-000000000003';

export const exampleService = {
    id: EXAMPLE_SERVICE_ID,
    titulo: 'Hospedaje hogareño en Providencia con jardín y cuidado personalizado',
    descripcion:
        'Recibo a tu mascota como un miembro más de mi familia. Mi hogar tiene un jardín cerrado de 80 m², ' +
        'cocina equipada con productos para mascotas y un espacio tranquilo para el descanso. Cuento con experiencia ' +
        'en perros de todos los tamaños, gatos sociables y mascotas con necesidades especiales (medicación diaria, ' +
        'dietas restrictivas). Envío fotos y videos cada día para que sepas cómo está tu compañero. ' +
        'Salidas al parque dos veces al día, alimentación según tu indicación y juegos en casa. ' +
        'Cuento con certificación en primeros auxilios para mascotas y trabajé como voluntaria en un refugio ' +
        'durante tres años antes de empezar a hospedar profesionalmente. La idea es que vuelvas y encuentres ' +
        'a tu mascota más feliz que cuando la dejaste.',
    precio_desde: 25000,
    precio_hasta: 35000,
    unidad_precio: 'por noche',
    fotos: [
        'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1200&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&auto=format&fit=crop&q=80',
    ],
    detalles: {
        capacidad: 2,
        tipo_espacio: 'Casa con jardín',
        tiene_patio: true,
        camara_vigilancia: false,
        incluye_alimentacion: true,
        incluye_paseos: true,
        mascotas_propias: 'Sí, una perra Beagle de 4 años (sociable)',
        ninos_en_hogar: false,
        fotos_durante_estadia: true,
    },
    comunas_cobertura: ['Providencia', 'Ñuñoa', 'Las Condes'],
    disponibilidad: null,
    activo: true,
    destacado: true,
    rating_promedio: 4.7,
    total_evaluaciones: 12,
    acepta_perros: true,
    acepta_gatos: true,
    acepta_otras: false,
    proveedor_id: EXAMPLE_PROVEEDOR_ID,
    created_at: '2025-01-15T00:00:00Z',
    proveedores: {
        id: EXAMPLE_PROVEEDOR_ID,
        auth_user_id: EXAMPLE_AUTH_USER_ID,
        nombre: 'Carolina',
        apellido_p: 'Méndez',
        nombre_publico: 'Carolina M.',
        rut_verificado: true,
        foto_perfil: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
        comuna: 'Providencia',
        mostrar_whatsapp: true,
        mostrar_telefono: false,
        mostrar_email: false,
        telefono: '+56 9 0000 0000',
        email_publico: null,
        created_at: '2025-01-15T00:00:00Z',
        tipo_entidad: 'persona_natural',
        razon_social: null,
        nombre_fantasia: null,
        giro: null,
        anios_experiencia: 5,
        certificaciones: 'Certificada en primeros auxilios para mascotas. Voluntaria en refugio durante 3 años.',
        sitio_web: '',
        instagram: 'carolina_pawsitter',
        primera_ayuda: true,
        perfil_completo: true,
        bio: 'Soy Carolina, tengo 32 años y vivo en Providencia con mi familia. Estudié educación parvularia pero hace 5 años descubrí mi vocación cuidando mascotas. Mis propias perras (Mota y Luna) son la prueba de que en mi casa los animales son uno más. Me certifiqué en primeros auxilios para mascotas y me actualizo constantemente leyendo sobre comportamiento canino y felino. Lo que más me gusta es ver cómo se relajan en mi hogar después de unos días.',
        galeria: [
            'https://images.unsplash.com/photo-1591946614720-90a587da4a36?w=1200&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1568393691622-c7ba131d63b4?w=1200&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=1200&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1546975490-e8b92a360b24?w=1200&auto=format&fit=crop&q=80',
        ],
    },
    categorias_servicio: {
        nombre: 'Hospedaje',
        slug: 'hospedaje',
        icono: 'Home',
    },
};

export const exampleReviews = [
    {
        id: '00000000-0000-0000-0000-0000000000a1',
        servicio_id: EXAMPLE_SERVICE_ID,
        proveedor_id: EXAMPLE_PROVEEDOR_ID,
        usuario_id: '00000000-0000-0000-0000-0000000000b1',
        rating: 5,
        comentario:
            'Carolina cuidó a Luna durante una semana y volvió contenta y relajada. Recibí fotos todos los días, ' +
            'mensajes con detalles del comportamiento, y noté que la hizo dormir en su rutina habitual. ' +
            'Súper recomendada, ya reservé para las próximas vacaciones.',
        estado: 'aprobado',
        respuesta_proveedor: '¡Gracias! Luna fue una compañera adorable. Te esperamos cuando quieran.',
        created_at: '2025-03-20T10:30:00Z',
        usuarios_buscadores: { nombre: 'María José T.' },
        _user: { nombre: 'María José T.', foto_perfil: null },
    },
    {
        id: '00000000-0000-0000-0000-0000000000a2',
        servicio_id: EXAMPLE_SERVICE_ID,
        proveedor_id: EXAMPLE_PROVEEDOR_ID,
        usuario_id: '00000000-0000-0000-0000-0000000000b2',
        rating: 5,
        comentario: 'Excelente atención. Mi gato Pelusa pudo descansar sin estrés. Volvería sin dudar.',
        estado: 'aprobado',
        respuesta_proveedor: null,
        created_at: '2025-03-05T14:00:00Z',
        usuarios_buscadores: { nombre: 'Andrés P.' },
        _user: { nombre: 'Andrés P.', foto_perfil: null },
    },
    {
        id: '00000000-0000-0000-0000-0000000000a3',
        servicio_id: EXAMPLE_SERVICE_ID,
        proveedor_id: EXAMPLE_PROVEEDOR_ID,
        usuario_id: '00000000-0000-0000-0000-0000000000b3',
        rating: 4,
        comentario:
            'Muy buena experiencia en general. La comunicación fue impecable y mi perro se notaba cómodo. ' +
            'Solo le pondría 4 estrellas porque hubiese preferido más fotos durante el día, pero eso es muy personal. ' +
            'Definitivamente repetiría.',
        estado: 'aprobado',
        respuesta_proveedor: '¡Gracias por el feedback! Tomé nota, voy a enviar más fotos a quienes lo prefieran.',
        created_at: '2025-02-18T09:15:00Z',
        usuarios_buscadores: { nombre: 'Sofía L.' },
        _user: { nombre: 'Sofía L.', foto_perfil: null },
    },
];
