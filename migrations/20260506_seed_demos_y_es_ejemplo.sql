-- ============================================================================
-- IMPORTANTE: Las URLs de Unsplash usadas en este seed deben ser previamente
--   revisadas para que NO contengan logos, watermarks ni branding de marcas
--   externas (especialmente competidoras como Chewy, Petco, etc.).
--   Validar visualmente cada URL antes de aplicar.
--
-- Auditoría visual completada en: 2026-05-07
-- 3 URLs reemplazadas por branding visible (Chewy.com): Foto E, F, U.
-- ============================================================================
-- Bloque 4 sprint /ejemplo: limpieza total + 9 proveedores demo + es_ejemplo
-- ============================================================================
-- Crea columna proveedores.es_ejemplo, limpia seeds actuales (excepto admins),
-- y siembra 9 proveedores demo con perfil 100% completo + 1 servicio cada uno.
-- Cada categoría queda con 1 demo. Los demos disparan ExampleCTAModal en
-- frontend (Commit 3 del Bloque 4).
--
-- ⚠️ Part 5 (27 usuarios_buscadores + 27 evaluaciones) NO está incluido aquí.
-- Bloquea: evaluaciones.usuario_id apunta a auth.users.id (CLAUDE.md). Hay que
-- decidir estrategia (NULL si nullable, o ALTER COLUMN, o columna denormalizada).
-- Resolver con queries de verificación + decisión del usuario, agregar después.
--
-- Admins preservados:
--   19e8e463-8283-45cf-91ce-53417c4ab306
--   47ba31f9-2835-4259-9bde-de733ae19c8a
-- ============================================================================

-- =====================================================================
-- PART 1 — ALTER TABLE
-- =====================================================================

ALTER TABLE proveedores
    ADD COLUMN IF NOT EXISTS es_ejemplo BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN proveedores.es_ejemplo IS
    'true = proveedor demo creado para mostrar el funcionamiento de la plataforma; '
    'sus datos de contacto son ficticios y los CTAs disparan modal informativo en lugar de acciones reales';

-- Ampliar check constraint de unidad_precio para soportar servicios reales adicionales.
-- Valores nuevos: 'por visita' (domicilio), 'por consulta' (veterinario),
-- 'por viaje' (traslado), 'por día' (guardería).
ALTER TABLE servicios_publicados
    DROP CONSTRAINT IF EXISTS servicios_publicados_unidad_precio_check;

ALTER TABLE servicios_publicados
    ADD CONSTRAINT servicios_publicados_unidad_precio_check
    CHECK (unidad_precio = ANY (ARRAY[
        'por noche'::text,
        'por hora'::text,
        'por sesión'::text,
        'por mes'::text,
        'por paseo'::text,
        'por visita'::text,
        'por consulta'::text,
        'por viaje'::text,
        'por día'::text
    ]));

COMMENT ON CONSTRAINT servicios_publicados_unidad_precio_check ON servicios_publicados IS
    'Valores permitidos para unidad_precio. Ampliado en migración 20260506 para soportar '
    'servicios de domicilio (por visita), veterinario (por consulta), traslado (por viaje) y guardería (por día).';


-- =====================================================================
-- PART 2 — DELETE FK-safe (todo lo no-admin)
-- =====================================================================
-- Orden inverso de dependencia. Las tablas hijas se limpian antes que sus padres.
-- usuarios_buscadores.proveedor_id se setea NULL para preservar usuarios reales
-- (si los hubiera) sin perder su perfil de tutor.

DELETE FROM evaluaciones
 WHERE proveedor_id NOT IN (
        '19e8e463-8283-45cf-91ce-53417c4ab306'::uuid,
        '47ba31f9-2835-4259-9bde-de733ae19c8a'::uuid
       );

DELETE FROM contactos
 WHERE proveedor_id NOT IN (
        '19e8e463-8283-45cf-91ce-53417c4ab306'::uuid,
        '47ba31f9-2835-4259-9bde-de733ae19c8a'::uuid
       );

DELETE FROM conversations
 WHERE servicio_id IN (
        SELECT id FROM servicios_publicados
         WHERE proveedor_id NOT IN (
                '19e8e463-8283-45cf-91ce-53417c4ab306'::uuid,
                '47ba31f9-2835-4259-9bde-de733ae19c8a'::uuid
               )
       );

DELETE FROM eventos_tracking
 WHERE servicio_id IN (
        SELECT id FROM servicios_publicados
         WHERE proveedor_id NOT IN (
                '19e8e463-8283-45cf-91ce-53417c4ab306'::uuid,
                '47ba31f9-2835-4259-9bde-de733ae19c8a'::uuid
               )
       );

DELETE FROM favoritos
 WHERE servicio_id IN (
        SELECT id FROM servicios_publicados
         WHERE proveedor_id NOT IN (
                '19e8e463-8283-45cf-91ce-53417c4ab306'::uuid,
                '47ba31f9-2835-4259-9bde-de733ae19c8a'::uuid
               )
       );

DELETE FROM planes_visibilidad
 WHERE proveedor_id NOT IN (
        '19e8e463-8283-45cf-91ce-53417c4ab306'::uuid,
        '47ba31f9-2835-4259-9bde-de733ae19c8a'::uuid
       );

DELETE FROM preguntas
 WHERE proveedor_id NOT IN (
        '19e8e463-8283-45cf-91ce-53417c4ab306'::uuid,
        '47ba31f9-2835-4259-9bde-de733ae19c8a'::uuid
       );

DELETE FROM certificaciones
 WHERE proveedor_id NOT IN (
        '19e8e463-8283-45cf-91ce-53417c4ab306'::uuid,
        '47ba31f9-2835-4259-9bde-de733ae19c8a'::uuid
       );

UPDATE usuarios_buscadores
   SET proveedor_id = NULL
 WHERE proveedor_id NOT IN (
        '19e8e463-8283-45cf-91ce-53417c4ab306'::uuid,
        '47ba31f9-2835-4259-9bde-de733ae19c8a'::uuid
       );

DELETE FROM servicios_publicados
 WHERE proveedor_id NOT IN (
        '19e8e463-8283-45cf-91ce-53417c4ab306'::uuid,
        '47ba31f9-2835-4259-9bde-de733ae19c8a'::uuid
       );

DELETE FROM proveedores
 WHERE id NOT IN (
        '19e8e463-8283-45cf-91ce-53417c4ab306'::uuid,
        '47ba31f9-2835-4259-9bde-de733ae19c8a'::uuid
       )
   AND estado = 'aprobado';


-- =====================================================================
-- PART 3 — INSERT 9 proveedores demo
-- =====================================================================
-- UUIDs canónicos v4. auth_user_id NULL (verificado nullable).
-- Cada proveedor llena los 8 criterios del trigger perfil_completo:
--   foto_perfil ✓ nombre_publico ✓ bio>100 ✓ whatsapp/telefono ✓
--   comuna ✓ galeria≥3 ✓ anios_experiencia ✓ certificaciones ✓
--   + ≥1 servicio activo (Part 4)

INSERT INTO proveedores (
    id, auth_user_id, nombre, apellido_p, nombre_publico,
    foto_perfil, bio, comuna,
    whatsapp, telefono, mostrar_whatsapp, mostrar_telefono, mostrar_email,
    tipo_entidad, anios_experiencia, certificaciones, primera_ayuda,
    galeria, rut_verificado, estado, verificacion_estado, es_ejemplo
) VALUES
-- 1. Carolina (Hospedaje, Providencia)
('b1000001-0000-4000-8000-000000000001'::uuid, NULL,
 'Carolina', 'Méndez', 'Carolina M.',
 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
 'Soy Carolina, tengo 32 años y vivo en Providencia con mi familia. Estudié educación parvularia pero hace 5 años descubrí mi vocación cuidando mascotas. Mis propias perras (Mota y Luna) son la prueba de que en mi casa los animales son uno más. Me certifiqué en primeros auxilios para mascotas y me actualizo constantemente leyendo sobre comportamiento canino y felino. Lo que más me gusta es ver cómo se relajan en mi hogar después de unos días. Recibo a una mascota a la vez para asegurar atención total.',
 'Providencia',
 '+56912345678', '+56212345678', true, true, false,
 'persona_natural', 5, 'Primeros auxilios para mascotas (2023). Voluntaria en refugio canino durante 3 años.', true,
 ARRAY[
   'https://images.unsplash.com/photo-1591946614720-90a587da4a36?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1568393691622-c7ba131d63b4?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1546975490-e8b92a360b24?w=1200&auto=format&fit=crop&q=80'
 ],
 true, 'aprobado', 'aprobado', true),

-- 2. Daniela (Guardería, Ñuñoa)
('b1000001-0000-4000-8000-000000000002'::uuid, NULL,
 'Daniela', 'Rojas', 'Daniela R.',
 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop&q=80',
 'Soy Daniela, vivo en Ñuñoa y desde chica tuve perros en casa. Hace 4 años abrí una guardería diurna en mi propio domicilio porque me di cuenta que muchas personas necesitaban dejar a sus mascotas en un lugar de confianza durante la jornada laboral. Tengo título de adiestradora canina nivel básico y trabajo con grupos pequeños para que cada perrito reciba atención personalizada. Mi enfoque es estimulación física y mental: paseos en grupo, juegos colaborativos y descanso supervisado. Recibo perros sociables que disfruten estar acompañados.',
 'Ñuñoa',
 '+56912345678', '+56212345678', true, true, false,
 'persona_natural', 4, 'Adiestradora canina nivel básico (Universidad Mayor 2021). Primeros auxilios mascotas.', true,
 ARRAY[
   'https://images.unsplash.com/photo-1597595735637-05a49627ee29?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1750967028517-31b4b2faad5c?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&auto=format&fit=crop&q=80'
 ],
 true, 'aprobado', 'aprobado', true),

-- 3. Sebastián (Cuidado Domicilio, Las Condes)
('b1000001-0000-4000-8000-000000000003'::uuid, NULL,
 'Sebastián', 'Castro', 'Sebastián C.',
 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
 'Hola, soy Sebastián, tengo 28 años y trabajo de manera independiente desde hace 3 años cuidando mascotas en sus propios hogares. Me especializo en visitas a domicilio para gatos y perros que prefieren no salir de su entorno. Soy puntual, comunicativo y siempre envío reportes con fotos para que sepas cómo está tu compañero. Tuve dos gatas rescatadas durante muchos años y entiendo lo importante que es mantener su rutina. Estudié técnico veterinario incompleto, lo que me dio bases sólidas en manejo de mascotas. Cubro Las Condes y comunas vecinas en bicicleta o caminando.',
 'Las Condes',
 '+56912345678', '+56212345678', true, true, false,
 'persona_natural', 3, 'Técnico Veterinario incompleto (DUOC 2020-2021). Curso de manejo felino (Felinos Chile 2022).', false,
 ARRAY[
   'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=1200&auto=format&fit=crop&q=80'
 ],
 true, 'aprobado', 'aprobado', true),

-- 4. Matías (Paseos, Las Condes)
('b1000001-0000-4000-8000-000000000004'::uuid, NULL,
 'Matías', 'Fernández', 'Matías F.',
 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=400&auto=format&fit=crop&q=80',
 'Soy Matías, tengo 26 años y soy estudiante de educación física. Combino mis estudios con paseos profesionales de perros desde hace 4 años. Llevo grupos pequeños (máximo 4 perros) para asegurar que cada uno reciba atención y para mantener el control en zonas urbanas. Soy deportista y caminamos rutas largas con desniveles cuando los perros tienen condición para ello. Llevo GPS activado durante el paseo y envío fotos en tiempo real. Tengo experiencia con razas grandes y perros enérgicos. Mi compromiso es que tu perro vuelva cansado, feliz y con ganas de comer y dormir.',
 'Las Condes',
 '+56912345678', '+56212345678', true, true, false,
 'persona_natural', 4, 'Curso de paseador profesional (Pet Lovers Academy 2022). Estudiante educación física UMET.', false,
 ARRAY[
   'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1494947665470-20322015e3a8?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1750967028517-31b4b2faad5c?w=1200&auto=format&fit=crop&q=80'
 ],
 true, 'aprobado', 'aprobado', true),

-- 5. Patricia (Peluquería, Providencia)
('b1000001-0000-4000-8000-000000000005'::uuid, NULL,
 'Patricia', 'Soto', 'Patricia S.',
 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
 'Soy Patricia, peluquera canina y felina con 8 años de experiencia. Trabajo desde mi casa en Providencia, donde adapté un espacio cómodo y tranquilo para que las mascotas no se estresen. Me especializo en razas de pelaje complicado (Schnauzer, Caniche, Persa) y trabajo con paciencia con animales nerviosos o que tuvieron malas experiencias previas. Uso productos hipoalergénicos y mesa hidráulica para no forzar posturas. Mi prioridad es el bienestar emocional del animal antes que el resultado estético: si una mascota se altera, paramos. Soy madre de dos gatas persas y un Poodle que me acompañan en el día a día.',
 'Providencia',
 '+56912345678', '+56212345678', true, true, false,
 'persona_natural', 8, 'Curso profesional de peluquería canina (Academia Canina Chile 2017). Especialización razas felinas (2019).', false,
 ARRAY[
   'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1591946614720-90a587da4a36?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1750967028517-31b4b2faad5c?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=1200&auto=format&fit=crop&q=80'
 ],
 true, 'aprobado', 'aprobado', true),

-- 6. Felipe (Adiestramiento, Vitacura)
('b1000001-0000-4000-8000-000000000006'::uuid, NULL,
 'Felipe', 'Navarro', 'Felipe N.',
 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
 'Soy Felipe, adiestrador canino certificado con 7 años de experiencia. Trabajo exclusivamente con refuerzo positivo y métodos basados en evidencia científica. No uso collares de castigo ni técnicas aversivas. Mi enfoque combina adiestramiento básico (sentarse, venir, caminar al lado) con resolución de problemas de comportamiento como ansiedad por separación, reactividad y miedos. Acompaño al tutor todo el proceso porque el verdadero cambio sucede en casa, no en una sesión semanal. Entreno desde cachorros hasta perros adultos rescatados. Trabajo en Vitacura y comunas cercanas, voy a tu domicilio o nos juntamos en parques tranquilos.',
 'Vitacura',
 '+56912345678', '+56212345678', true, true, false,
 'persona_natural', 7, 'Adiestrador canino CCPDT-KA (2018). Curso modificación de conducta (Karen Pryor 2020).', false,
 ARRAY[
   'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1750967028517-31b4b2faad5c?w=1200&auto=format&fit=crop&q=80'
 ],
 true, 'aprobado', 'aprobado', true),

-- 7. Tomás (Veterinario, Las Condes)
('b1000001-0000-4000-8000-000000000007'::uuid, NULL,
 'Tomás', 'Pizarro', 'Dr. Tomás P.',
 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80',
 'Soy el Dr. Tomás Pizarro, médico veterinario titulado de la Universidad de Chile (2014). Atiendo a domicilio en Las Condes y comunas cercanas porque creo que la consulta debe adaptarse al paciente, no al revés. Muchos animales se estresan en clínicas y eso interfiere con el diagnóstico. Realizo controles preventivos, vacunación, desparasitación, exámenes de sangre con maletín portátil y atención de cuadros leves a moderados. Para casos complejos derivo a clínicas con las que tengo convenio. Emito boleta electrónica para reembolsos de seguros. Tengo dos perros adoptados y dos gatos rescatados de la calle.',
 'Las Condes',
 '+56912345678', '+56212345678', true, true, false,
 'persona_natural', 10, 'Médico Veterinario Universidad de Chile (2014). Diplomado en medicina felina (UNAB 2018). Postítulo en endocrinología veterinaria (2020).', true,
 ARRAY[
   'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1750967028517-31b4b2faad5c?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=1200&auto=format&fit=crop&q=80'
 ],
 true, 'aprobado', 'aprobado', true),

-- 8. Javiera (Traslado, Maipú)
('b1000001-0000-4000-8000-000000000008'::uuid, NULL,
 'Javiera', 'Espinoza', 'Javiera E.',
 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
 'Soy Javiera, transportista de mascotas con 5 años de experiencia. Tengo una camioneta acondicionada exclusivamente para esto: jaulas tamaño grande y mediano fijas al piso, cinturones de seguridad para arneses, ventilación independiente, agua y mantas. Cubro toda la Región Metropolitana y traslados a regiones cercanas (V, VI, VII). Hago acompañamiento a clínicas, mudanzas, traslado al aeropuerto con documentación, viajes de vacaciones. Para razas grandes tengo jaula reforzada. Soy puntual, manejo defensivo y mantengo comunicación constante con el dueño durante el viaje. Vivo en Maipú con mi golden retriever Tobi, que a veces me acompaña en los viajes cortos.',
 'Maipú',
 '+56912345678', '+56212345678', true, true, false,
 'persona_natural', 5, 'Curso transporte de mascotas IATA (2020). Manejo defensivo profesional. Primeros auxilios mascotas.', true,
 ARRAY[
   'https://images.unsplash.com/photo-1544568100-847a948585b9?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1750967028517-31b4b2faad5c?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=1200&auto=format&fit=crop&q=80'
 ],
 true, 'aprobado', 'aprobado', true),

-- 9. Andrea (Fotografía, Vitacura)
('b1000001-0000-4000-8000-000000000009'::uuid, NULL,
 'Andrea', 'Navarro', 'Andrea N.',
 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
 'Soy Andrea, fotógrafa profesional especializada en mascotas desde hace 6 años. Tengo formación en fotografía publicitaria y descubrí mi vocación con animales cuando hice una sesión a la perrita de una amiga. Trabajo principalmente en exteriores (parques, playas) porque la luz natural y el ambiente relajado dan los mejores retratos. Para sesiones en interior llevo equipo de iluminación portátil. Soy paciente con animales tímidos y conozco trucos para captar miradas y expresiones únicas. Entrego entre 30 y 50 fotos editadas en alta resolución dentro de 7 días. Tuve una golden llamada Maple durante 13 años y eso marcó todo mi enfoque: las mascotas se merecen retratos de la misma calidad que las personas.',
 'Vitacura',
 '+56912345678', '+56212345678', true, true, false,
 'persona_natural', 6, 'Licenciada en Fotografía (Instituto ARCOS 2017). Especialización en fotografía animal (Workshop Pet Photography International 2021).', false,
 ARRAY[
   'https://images.unsplash.com/photo-1597595735637-05a49627ee29?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1750967028517-31b4b2faad5c?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1552053831-71594a27632d?w=1200&auto=format&fit=crop&q=80'
 ],
 true, 'aprobado', 'aprobado', true);


-- =====================================================================
-- PART 4 — INSERT 9 servicios_publicados
-- =====================================================================
-- 1 servicio activo por demo. categoria_id se resuelve por slug via subquery.
-- detalles jsonb usa shape exacto de DETALLE_LABELS en ServiceDetailView.tsx.
-- disponibilidad usa shape {"Lunes":{"activo":true,"desde":"09:00","hasta":"18:00"}, ...}.

INSERT INTO servicios_publicados (
    id, proveedor_id, categoria_id, titulo, descripcion,
    precio_desde, precio_hasta, unidad_precio, fotos,
    detalles, comunas_cobertura, disponibilidad,
    activo, destacado, acepta_perros, acepta_gatos, acepta_otras
) VALUES
-- 1. Hospedaje — Carolina
('c1000001-0000-4000-8000-000000000001'::uuid,
 'b1000001-0000-4000-8000-000000000001'::uuid,
 (SELECT id FROM categorias_servicio WHERE slug = 'hospedaje'),
 'Hospedaje hogareño en Providencia con jardín y cuidado personalizado',
 'Recibo a tu mascota como un miembro más de mi familia. Mi hogar tiene un jardín cerrado de 80 m², cocina equipada con productos para mascotas y un espacio tranquilo para el descanso. Cuento con experiencia en perros de todos los tamaños, gatos sociables y mascotas con necesidades especiales (medicación diaria, dietas restrictivas). Envío fotos y videos cada día para que sepas cómo está tu compañero. Salidas al parque dos veces al día, alimentación según tu indicación y juegos en casa. Cuento con certificación en primeros auxilios para mascotas y trabajé como voluntaria en un refugio durante tres años antes de empezar a hospedar profesionalmente. La idea es que vuelvas y encuentres a tu mascota más feliz que cuando la dejaste.',
 25000, 35000, 'por noche',
 ARRAY[
   'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1674376360420-b344eafcc3d2?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1597595735637-05a49627ee29?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&auto=format&fit=crop&q=80'
 ],
 '{"capacidad": 2, "tipo_espacio": "Casa con jardín", "tiene_patio": true, "camara_vigilancia": false, "incluye_alimentacion": true, "incluye_paseos": true, "mascotas_propias": "Sí, una perra Beagle de 4 años (sociable)", "ninos_en_hogar": false, "fotos_durante_estadia": true}'::jsonb,
 ARRAY['Providencia', 'Ñuñoa', 'Las Condes'],
 '{"Lunes":{"activo":true,"desde":"08:00","hasta":"22:00"},"Martes":{"activo":true,"desde":"08:00","hasta":"22:00"},"Miércoles":{"activo":true,"desde":"08:00","hasta":"22:00"},"Jueves":{"activo":true,"desde":"08:00","hasta":"22:00"},"Viernes":{"activo":true,"desde":"08:00","hasta":"22:00"},"Sábado":{"activo":true,"desde":"09:00","hasta":"20:00"},"Domingo":{"activo":true,"desde":"09:00","hasta":"20:00"}}'::jsonb,
 true, false, true, true, false),

-- 2. Guardería — Daniela
('c1000001-0000-4000-8000-000000000002'::uuid,
 'b1000001-0000-4000-8000-000000000002'::uuid,
 (SELECT id FROM categorias_servicio WHERE slug = 'guarderia'),
 'Guardería diurna en Ñuñoa con grupos pequeños y actividades supervisadas',
 'Mi guardería funciona en una casa adaptada con patio amplio cerrado y zona interior climatizada. Recibo grupos pequeños (máximo 6 perros) para que cada mascota tenga atención personalizada. La jornada incluye dos paseos en grupo, juegos colaborativos en el patio, descanso supervisado en colchonetas individuales y un break de mediodía con agua fresca. Conozco a cada perro antes de aceptarlo (entrevista previa) para asegurar buena convivencia. Tengo cámaras de vigilancia accesibles para los tutores durante la jornada. Acepto perros de cualquier tamaño siempre que sean sociables y estén vacunados. Si tu perro tiene necesidades especiales (medicación, dieta) lo conversamos. Servicio de lunes a viernes en horario laboral.',
 12000, 15000, 'por día',
 ARRAY[
   'https://images.unsplash.com/photo-1597595735637-05a49627ee29?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1750967028517-31b4b2faad5c?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&auto=format&fit=crop&q=80'
 ],
 '{"horario": "08:00 a 19:00", "capacidad": 6, "tiene_patio": true, "actividades": "Paseos, juegos en grupo, descanso supervisado, estimulación mental", "camara_vigilancia": true, "fotos_durante": true}'::jsonb,
 ARRAY['Ñuñoa', 'Providencia', 'Macul', 'La Reina'],
 '{"Lunes":{"activo":true,"desde":"08:00","hasta":"19:00"},"Martes":{"activo":true,"desde":"08:00","hasta":"19:00"},"Miércoles":{"activo":true,"desde":"08:00","hasta":"19:00"},"Jueves":{"activo":true,"desde":"08:00","hasta":"19:00"},"Viernes":{"activo":true,"desde":"08:00","hasta":"19:00"},"Sábado":{"activo":false,"desde":"00:00","hasta":"00:00"},"Domingo":{"activo":false,"desde":"00:00","hasta":"00:00"}}'::jsonb,
 true, false, true, false, false),

-- 3. Cuidado en Casa (domicilio) — Sebastián
('c1000001-0000-4000-8000-000000000003'::uuid,
 'b1000001-0000-4000-8000-000000000003'::uuid,
 (SELECT id FROM categorias_servicio WHERE slug = 'domicilio'),
 'Cuidado en casa del cliente — visitas a domicilio para gatos y perros',
 'Voy a tu casa a cuidar a tu mascota mientras estás de viaje o trabajando largas jornadas. Mi servicio incluye alimentación según tu indicación, limpieza de bandeja sanitaria, paseos cortos para perros, juegos, compañía y administración de medicamentos si es necesario. Hago una visita de coordinación previa sin costo para conocer a tu mascota y revisar dónde está todo (comida, correa, medicamentos, datos del veterinario). Durante cada visita envío reporte con fotos y video corto. Las llaves se manejan con protocolo seguro y respeto absoluto a tu hogar. Tengo experiencia con gatos tímidos, perros mayores y mascotas con tratamientos médicos. Cubro Las Condes y comunas vecinas en bicicleta o caminando, lo que mantiene los costos bajos.',
 8000, 12000, 'por visita',
 ARRAY[
   'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=1200&auto=format&fit=crop&q=80'
 ],
 '{"visitas_por_dia": 2, "duracion_visita": 45, "que_incluye": "Alimentación, limpieza bandeja, paseo corto si aplica, juegos, compañía, fotos", "envia_foto_reporte": true, "administra_medicamentos": true}'::jsonb,
 ARRAY['Las Condes', 'Vitacura', 'Lo Barnechea', 'Providencia'],
 '{"Lunes":{"activo":true,"desde":"07:00","hasta":"21:00"},"Martes":{"activo":true,"desde":"07:00","hasta":"21:00"},"Miércoles":{"activo":true,"desde":"07:00","hasta":"21:00"},"Jueves":{"activo":true,"desde":"07:00","hasta":"21:00"},"Viernes":{"activo":true,"desde":"07:00","hasta":"21:00"},"Sábado":{"activo":true,"desde":"09:00","hasta":"19:00"},"Domingo":{"activo":true,"desde":"09:00","hasta":"19:00"}}'::jsonb,
 true, false, true, true, false),

-- 4. Paseos — Matías
('c1000001-0000-4000-8000-000000000004'::uuid,
 'b1000001-0000-4000-8000-000000000004'::uuid,
 (SELECT id FROM categorias_servicio WHERE slug = 'paseos'),
 'Paseos profesionales en Las Condes con grupos pequeños y GPS activo',
 'Tu perro se merece un paseo de verdad, no una vuelta a la manzana. Llevo grupos pequeños (máximo 4 perros) para asegurar control y atención personalizada. Camino rutas largas con desniveles en parques de Las Condes y Vitacura cuando los perros tienen condición física para ello. Para perros mayores o pequeños hago rutas más planas y cortas. Mantengo GPS activo durante todo el paseo y puedes seguir el recorrido en tiempo real. Envío fotos y un video corto durante o después del paseo. Tengo experiencia con razas grandes (Husky, Pastor Alemán, Labrador) y razas potencialmente peligrosas con manejo adecuado. Recojo y dejo al perro en tu domicilio sin costo extra dentro del radio.',
 10000, 18000, 'por paseo',
 ARRAY[
   'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1494947665470-20322015e3a8?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1750967028517-31b4b2faad5c?w=1200&auto=format&fit=crop&q=80'
 ],
 '{"duracion_minutos": 60, "max_perros": 4, "zona_paseo": "Parque Bicentenario, Cerro San Cristóbal, Parque Padre Hurtado", "lleva_gps": true, "envia_fotos": true, "razas_fuerza": true}'::jsonb,
 ARRAY['Las Condes', 'Vitacura', 'Lo Barnechea', 'Providencia', 'Ñuñoa'],
 '{"Lunes":{"activo":true,"desde":"06:30","hasta":"20:00"},"Martes":{"activo":true,"desde":"06:30","hasta":"20:00"},"Miércoles":{"activo":true,"desde":"06:30","hasta":"20:00"},"Jueves":{"activo":true,"desde":"06:30","hasta":"20:00"},"Viernes":{"activo":true,"desde":"06:30","hasta":"20:00"},"Sábado":{"activo":true,"desde":"08:00","hasta":"19:00"},"Domingo":{"activo":true,"desde":"08:00","hasta":"19:00"}}'::jsonb,
 true, false, true, false, false),

-- 5. Peluquería — Patricia
('c1000001-0000-4000-8000-000000000005'::uuid,
 'b1000001-0000-4000-8000-000000000005'::uuid,
 (SELECT id FROM categorias_servicio WHERE slug = 'peluqueria'),
 'Peluquería canina y felina en Providencia con paciencia y mesa hidráulica',
 'Atiendo en mi domicilio en Providencia, en un espacio acondicionado para que las mascotas no se estresen. Tengo mesa hidráulica para no forzar posturas y trabajo con productos hipoalergénicos. Mi especialidad son las razas de pelaje complicado (Schnauzer, Caniche, Yorkshire, Persa, Maine Coon) y soy paciente con animales nerviosos o que tuvieron malas experiencias en otros lugares. Si tu mascota no tolera el secado o el corte, paramos y reagendamos: nunca uso fuerza ni sedación. El servicio completo incluye baño con shampoo según tipo de pelaje, secado controlado, corte de pelo, corte de uñas, limpieza de oídos, perfume y un mini regalito para llevar. Atiendo con cita previa y horarios flexibles.',
 15000, 28000, 'por sesión',
 ARRAY[
   'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1591946614720-90a587da4a36?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1750967028517-31b4b2faad5c?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=1200&auto=format&fit=crop&q=80'
 ],
 '{"modalidad": "En mi domicilio (Providencia)", "duracion_estimada": "1h 30min a 2h 30min según raza", "que_incluye": "Baño, secado, corte, uñas, limpieza oídos, perfume", "razas_especiales": true, "mesa_hidraulica": true}'::jsonb,
 ARRAY['Providencia', 'Ñuñoa', 'Las Condes', 'La Reina'],
 '{"Lunes":{"activo":true,"desde":"09:00","hasta":"19:00"},"Martes":{"activo":true,"desde":"09:00","hasta":"19:00"},"Miércoles":{"activo":true,"desde":"09:00","hasta":"19:00"},"Jueves":{"activo":true,"desde":"09:00","hasta":"19:00"},"Viernes":{"activo":true,"desde":"09:00","hasta":"19:00"},"Sábado":{"activo":true,"desde":"10:00","hasta":"17:00"},"Domingo":{"activo":false,"desde":"00:00","hasta":"00:00"}}'::jsonb,
 true, false, true, true, false),

-- 6. Adiestramiento — Felipe
('c1000001-0000-4000-8000-000000000006'::uuid,
 'b1000001-0000-4000-8000-000000000006'::uuid,
 (SELECT id FROM categorias_servicio WHERE slug = 'adiestramiento'),
 'Adiestramiento canino con refuerzo positivo en Vitacura y comunas cercanas',
 'Trabajo exclusivamente con métodos basados en evidencia científica: refuerzo positivo, gestión del entorno y comunicación clara. No uso collares de castigo, ahorcadores ni técnicas aversivas. Mi enfoque combina obediencia básica (sentarse, venir, caminar al lado, quedarse) con resolución de problemas de comportamiento más complejos: ansiedad por separación, reactividad hacia otros perros, miedos, robo de objetos. Acompaño al tutor durante todo el proceso porque el verdadero cambio sucede en casa, no en una sesión semanal. Trabajo desde cachorros hasta perros adultos rescatados que necesitan adaptación. Las sesiones son en tu domicilio o en parques tranquilos según el caso. Programa básico: 6 a 8 sesiones semanales con tareas entre clases.',
 25000, 40000, 'por sesión',
 ARRAY[
   'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1750967028517-31b4b2faad5c?w=1200&auto=format&fit=crop&q=80'
 ],
 '{"metodo": "Refuerzo positivo, basado en evidencia", "modalidad": "A domicilio o en parques", "duracion_sesion": 60, "problemas_que_resuelve": "Obediencia básica, ansiedad por separación, reactividad, miedos, manejo de cachorros", "certificaciones": "CCPDT-KA, Karen Pryor"}'::jsonb,
 ARRAY['Vitacura', 'Las Condes', 'Lo Barnechea', 'La Reina'],
 '{"Lunes":{"activo":true,"desde":"09:00","hasta":"19:00"},"Martes":{"activo":true,"desde":"09:00","hasta":"19:00"},"Miércoles":{"activo":true,"desde":"09:00","hasta":"19:00"},"Jueves":{"activo":true,"desde":"09:00","hasta":"19:00"},"Viernes":{"activo":true,"desde":"09:00","hasta":"19:00"},"Sábado":{"activo":true,"desde":"10:00","hasta":"15:00"},"Domingo":{"activo":false,"desde":"00:00","hasta":"00:00"}}'::jsonb,
 true, false, true, false, false),

-- 7. Veterinario — Tomás
('c1000001-0000-4000-8000-000000000007'::uuid,
 'b1000001-0000-4000-8000-000000000007'::uuid,
 (SELECT id FROM categorias_servicio WHERE slug = 'veterinario'),
 'Veterinario a domicilio — controles, vacunas y consultas en tu hogar',
 'Atiendo a domicilio porque muchos animales se estresan en clínicas y eso interfiere con el diagnóstico. Llevo maletín portátil con todo lo necesario para una consulta completa: instrumental para examen físico, vacunas refrigeradas, medicamentos básicos, equipo para toma de muestra de sangre. Realizo controles preventivos, vacunación, desparasitación, atención de cuadros leves a moderados (gastritis, infecciones cutáneas, otitis). Para casos complejos derivo a clínicas de confianza con las que tengo convenio. Emito boleta electrónica para reembolsos de seguros (Pet Plan, Hipaa, etc.). Consulta de coordinación previa por WhatsApp para anticipar el caso. Atiendo perros, gatos y mascotas exóticas (conejos, hámsters, aves pequeñas).',
 35000, 55000, 'por consulta',
 ARRAY[
   'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1750967028517-31b4b2faad5c?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=1200&auto=format&fit=crop&q=80'
 ],
 '{"servicios_ofrecidos": "Controles, vacunas, desparasitación, exámenes sangre, atención cuadros leves a moderados", "atiende_urgencias": false, "emite_boleta": true, "especialidades": "Medicina felina, endocrinología veterinaria", "examenes_disponibles": "Hemograma, perfil bioquímico, urianálisis básico"}'::jsonb,
 ARRAY['Las Condes', 'Vitacura', 'Lo Barnechea', 'Providencia', 'Ñuñoa'],
 '{"Lunes":{"activo":true,"desde":"09:00","hasta":"19:00"},"Martes":{"activo":true,"desde":"09:00","hasta":"19:00"},"Miércoles":{"activo":true,"desde":"09:00","hasta":"19:00"},"Jueves":{"activo":true,"desde":"09:00","hasta":"19:00"},"Viernes":{"activo":true,"desde":"09:00","hasta":"19:00"},"Sábado":{"activo":true,"desde":"10:00","hasta":"14:00"},"Domingo":{"activo":false,"desde":"00:00","hasta":"00:00"}}'::jsonb,
 true, false, true, true, true),

-- 8. Traslado — Javiera
('c1000001-0000-4000-8000-000000000008'::uuid,
 'b1000001-0000-4000-8000-000000000008'::uuid,
 (SELECT id FROM categorias_servicio WHERE slug = 'traslado'),
 'Traslado seguro de mascotas en camioneta acondicionada para Santiago y regiones',
 'Mi camioneta está acondicionada exclusivamente para transporte de mascotas: jaulas tamaño grande y mediano fijas al piso, cinturones para arneses, ventilación independiente, agua disponible y mantas. Cubro toda la Región Metropolitana y traslados a regiones cercanas (Quinta Región, Sexto, Séptima). Servicios típicos: acompañamiento a clínicas veterinarias, mudanzas dentro o fuera de la ciudad, traslado al aeropuerto con documentación de vuelo, viajes de vacaciones con la familia. Para razas grandes tengo jaula reforzada. Manejo defensivo, soy puntual y mantengo comunicación constante durante el viaje (mensajes con ubicación, foto de tu mascota tranquila). Tarifas según distancia, sin cobros sorpresa.',
 18000, 80000, 'por viaje',
 ARRAY[
   'https://images.unsplash.com/photo-1544568100-847a948585b9?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1750967028517-31b4b2faad5c?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=1200&auto=format&fit=crop&q=80'
 ],
 '{"tipo_vehiculo": "Camioneta acondicionada con jaulas fijas", "equipamiento": "Jaulas grandes y medianas, cinturones para arnés, ventilación, agua, mantas", "mascotas_grandes": true}'::jsonb,
 ARRAY['Maipú', 'Santiago', 'Pudahuel', 'Las Condes', 'Providencia', 'La Florida'],
 '{"Lunes":{"activo":true,"desde":"06:00","hasta":"22:00"},"Martes":{"activo":true,"desde":"06:00","hasta":"22:00"},"Miércoles":{"activo":true,"desde":"06:00","hasta":"22:00"},"Jueves":{"activo":true,"desde":"06:00","hasta":"22:00"},"Viernes":{"activo":true,"desde":"06:00","hasta":"22:00"},"Sábado":{"activo":true,"desde":"07:00","hasta":"21:00"},"Domingo":{"activo":true,"desde":"08:00","hasta":"20:00"}}'::jsonb,
 true, false, true, true, true),

-- 9. Fotografía — Andrea
('c1000001-0000-4000-8000-000000000009'::uuid,
 'b1000001-0000-4000-8000-000000000009'::uuid,
 (SELECT id FROM categorias_servicio WHERE slug = 'fotografia'),
 'Fotografía profesional de mascotas en exteriores e interior',
 'Hago retratos profesionales de mascotas y sus familias. Trabajo principalmente en exteriores (parques, playas) porque la luz natural y un ambiente relajado dan resultados más auténticos. Para sesiones en interior llevo equipo portátil de iluminación y rebotadores. Soy paciente con animales tímidos y conozco trucos para captar miradas únicas. Antes de la sesión hacemos una pre-producción corta por mensaje para definir locación, hora y cualquier detalle especial (premios favoritos, juguetes, vestuario). La sesión dura 1 a 2 horas según el animal. Entrego entre 30 y 50 fotos editadas en alta resolución dentro de 7 días vía Drive. Si quieres impresiones, las coordinamos aparte. Acepto sesiones con más de una mascota sin recargo.',
 60000, 120000, 'por sesión',
 ARRAY[
   'https://images.unsplash.com/photo-1597595735637-05a49627ee29?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1750967028517-31b4b2faad5c?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=1200&auto=format&fit=crop&q=80',
   'https://images.unsplash.com/photo-1552053831-71594a27632d?w=1200&auto=format&fit=crop&q=80'
 ],
 '{"tipo_sesion": "Exteriores (parques, playas) o interior con iluminación portátil", "duracion_sesion": "1 a 2 horas", "fotos_entregadas": "30 a 50 fotos editadas en alta resolución", "incluye_edicion": true, "entrega_digitales": true, "acepta_multiples_mascotas": true, "equipo": "Cámara profesional Sony A7III, iluminación portátil Godox"}'::jsonb,
 ARRAY['Vitacura', 'Las Condes', 'Lo Barnechea', 'Providencia', 'Ñuñoa'],
 '{"Lunes":{"activo":true,"desde":"08:00","hasta":"19:00"},"Martes":{"activo":true,"desde":"08:00","hasta":"19:00"},"Miércoles":{"activo":true,"desde":"08:00","hasta":"19:00"},"Jueves":{"activo":true,"desde":"08:00","hasta":"19:00"},"Viernes":{"activo":true,"desde":"08:00","hasta":"19:00"},"Sábado":{"activo":true,"desde":"09:00","hasta":"18:00"},"Domingo":{"activo":true,"desde":"09:00","hasta":"18:00"}}'::jsonb,
 true, false, true, true, true);


-- =====================================================================
-- PART 5 — Schema evaluaciones + INSERT 27 reseñas demo
-- =====================================================================
-- Plan A híbrido confirmado: usuario_id era NOT NULL con FK a auth.users(id).
-- Lo hacemos nullable y agregamos nombre_autor TEXT denormalizado para reseñas
-- demo (que no tienen auth.users real). Frontend usa fallback en cascada:
--   review._user?.nombre  ||  review.nombre_autor  ||  'Usuario'

-- 5A — Schema changes
ALTER TABLE evaluaciones ALTER COLUMN usuario_id DROP NOT NULL;

ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS nombre_autor TEXT;

COMMENT ON COLUMN evaluaciones.nombre_autor IS
    'Nombre mostrado en frontend cuando usuario_id es NULL (caso típico: '
    'reseñas de proveedores demo sin auth.users asociado). Frontend usa '
    'fallback: review._user?.nombre ?? review.nombre_autor ?? ''Usuario''.';


-- 5B — INSERT 27 reseñas (3 por demo, mix de 4★ y 5★, comentarios variados)

INSERT INTO evaluaciones (
    id, servicio_id, proveedor_id, usuario_id, nombre_autor,
    rating, comentario, estado, respuesta_proveedor, created_at
) VALUES

-- ───────── Demo 1: Carolina (Hospedaje) ─────────
('e1000001-0000-4000-8000-000000000001'::uuid,
 'c1000001-0000-4000-8000-000000000001'::uuid,
 'b1000001-0000-4000-8000-000000000001'::uuid, NULL, 'María José T.',
 5, 'Carolina cuidó a Luna durante una semana mientras estábamos de vacaciones. Recibí fotos todos los días, mensajes con detalles del comportamiento y noté que la hizo dormir en su rutina habitual. El jardín le encantó, llegó cansada y feliz. Ya tuvimos malas experiencias en otros lugares y de verdad no tiene comparación. Súper recomendada, ya reservé para las próximas vacaciones.',
 'aprobado', '¡Gracias María José! Luna fue una compañera adorable. Te esperamos cuando quieran.',
 '2026-03-20 10:30:00+00'),

('e1000001-0000-4000-8000-000000000002'::uuid,
 'c1000001-0000-4000-8000-000000000001'::uuid,
 'b1000001-0000-4000-8000-000000000001'::uuid, NULL, 'Andrés P.',
 5, 'Excelente atención con mi gato Pelusa. Es tímido y normalmente se estresa, pero con Carolina pudo descansar sin problemas. Volvería sin dudar.',
 'aprobado', NULL,
 '2026-03-05 14:00:00+00'),

('e1000001-0000-4000-8000-000000000003'::uuid,
 'c1000001-0000-4000-8000-000000000001'::uuid,
 'b1000001-0000-4000-8000-000000000001'::uuid, NULL, 'Sofía L.',
 4, 'Muy buena experiencia. La comunicación fue impecable y mi perro se notaba cómodo. Le pondría 4 estrellas porque me hubiese gustado más fotos durante el día, pero es algo personal.',
 'aprobado', '¡Gracias por el feedback! Tomé nota, voy a enviar más fotos a quienes lo prefieran.',
 '2026-02-18 09:15:00+00'),

-- ───────── Demo 2: Daniela (Guardería) ─────────
('e1000001-0000-4000-8000-000000000004'::uuid,
 'c1000001-0000-4000-8000-000000000002'::uuid,
 'b1000001-0000-4000-8000-000000000002'::uuid, NULL, 'Mauricio R.',
 5, 'Llevo a mi Husky Thor a la guardería de Daniela hace 3 meses y la diferencia conductual es notoria. Llegaba ansioso a casa después del trabajo y ahora viene relajado. La socialización con otros perros le hizo muy bien. Daniela mantiene grupos pequeños y eso se nota: cada perro recibe atención. Las cámaras me dejaron tranquilo las primeras semanas.',
 'aprobado', '¡Gracias Mauricio! Thor se integró súper bien al grupo, es un encanto.',
 '2026-04-10 16:20:00+00'),

('e1000001-0000-4000-8000-000000000005'::uuid,
 'c1000001-0000-4000-8000-000000000002'::uuid,
 'b1000001-0000-4000-8000-000000000002'::uuid, NULL, 'Valentina C.',
 5, 'La rutina diaria que tiene Daniela es lo que más valoro. Mi perrita ya sabe los horarios y se entusiasma cuando la voy a dejar. Los reportes con fotos del día son un plus.',
 'aprobado', NULL,
 '2026-03-12 11:05:00+00'),

('e1000001-0000-4000-8000-000000000006'::uuid,
 'c1000001-0000-4000-8000-000000000002'::uuid,
 'b1000001-0000-4000-8000-000000000002'::uuid, NULL, 'Cristóbal V.',
 4, 'Buena guardería, mi perro vuelve cansado y contento. El espacio podría ser un poco más grande, pero el cuidado es muy bueno.',
 'aprobado', NULL,
 '2026-02-22 08:40:00+00'),

-- ───────── Demo 3: Sebastián (Domicilio) ─────────
('e1000001-0000-4000-8000-000000000007'::uuid,
 'c1000001-0000-4000-8000-000000000003'::uuid,
 'b1000001-0000-4000-8000-000000000003'::uuid, NULL, 'Constanza M.',
 5, 'Tengo dos gatas que detestan moverse de la casa. Sebastián viene dos veces al día cuando estoy de viaje y siempre me deja tranquila con sus reportes. Las gatas lo aceptaron rápido, lo cual ya es un milagro. Le confié las llaves sin dudar después de la primera visita coordinada. Súper profesional y comunicativo.',
 'aprobado', '¡Gracias Constanza! Mishi y Pelusa son adorables, ya las extraño cuando no están en la pauta.',
 '2026-04-25 19:00:00+00'),

('e1000001-0000-4000-8000-000000000008'::uuid,
 'c1000001-0000-4000-8000-000000000003'::uuid,
 'b1000001-0000-4000-8000-000000000003'::uuid, NULL, 'Diego H.',
 5, 'Puntualidad impecable. Los videos cortos que envía después de cada visita son geniales. Mi perro lo recibe contento, ya forman un vínculo.',
 'aprobado', NULL,
 '2026-03-30 13:25:00+00'),

('e1000001-0000-4000-8000-000000000009'::uuid,
 'c1000001-0000-4000-8000-000000000003'::uuid,
 'b1000001-0000-4000-8000-000000000003'::uuid, NULL, 'Trinidad N.',
 4, 'Servicio confiable. Mi gato pudo quedarse en casa sin estresarse mientras yo viajaba. Recomendado.',
 'aprobado', NULL,
 '2026-02-08 10:15:00+00'),

-- ───────── Demo 4: Matías (Paseos) ─────────
('e1000001-0000-4000-8000-000000000010'::uuid,
 'c1000001-0000-4000-8000-000000000004'::uuid,
 'b1000001-0000-4000-8000-000000000004'::uuid, NULL, 'Rodrigo P.',
 5, 'Tengo un Husky que necesita ejercicio intenso y Matías es el primero que realmente le da el ritmo que requiere. Las rutas largas en el Parque Bicentenario son perfectas. El GPS en tiempo real me da tranquilidad y las fotos durante el paseo son un detalle. Mi perro vuelve agotado y feliz, justo lo que necesitaba.',
 'aprobado', '¡Gracias Rodrigo! Bruno tiene una energía increíble, es un gusto pasearlo.',
 '2026-04-18 17:45:00+00'),

('e1000001-0000-4000-8000-000000000011'::uuid,
 'c1000001-0000-4000-8000-000000000004'::uuid,
 'b1000001-0000-4000-8000-000000000004'::uuid, NULL, 'Bárbara S.',
 4, 'Buen servicio, mi perrita disfruta los paseos en grupo. Las fotos son un plus. A veces me gustaría rutas más cortas para los días de lluvia, pero en general muy bien.',
 'aprobado', NULL,
 '2026-03-22 12:10:00+00'),

('e1000001-0000-4000-8000-000000000012'::uuid,
 'c1000001-0000-4000-8000-000000000004'::uuid,
 'b1000001-0000-4000-8000-000000000004'::uuid, NULL, 'Camila L.',
 5, 'Confiable y deportista. Mi labrador llega cansado, justo lo que buscaba.',
 'aprobado', NULL,
 '2026-02-14 09:30:00+00'),

-- ───────── Demo 5: Patricia (Peluquería) ─────────
('e1000001-0000-4000-8000-000000000013'::uuid,
 'c1000001-0000-4000-8000-000000000005'::uuid,
 'b1000001-0000-4000-8000-000000000005'::uuid, NULL, 'Tamara A.',
 5, 'Mi gata Persa odiaba ir al peluquero. Patricia es la única persona que ha logrado hacer un buen trabajo sin que termine arañando a alguien. Le tiene una paciencia infinita y sabe leer cuándo parar. Productos hipoalergénicos perfectos para su piel sensible. La mesa hidráulica también ayuda a que no se forcé. Mi gata sale con los nudos sacados y oliendo rico, sin trauma.',
 'aprobado', '¡Gracias Tamara! Coco es una reina, hay que respetarle sus tiempos. Te esperamos en 6 semanas.',
 '2026-04-05 15:00:00+00'),

('e1000001-0000-4000-8000-000000000014'::uuid,
 'c1000001-0000-4000-8000-000000000005'::uuid,
 'b1000001-0000-4000-8000-000000000005'::uuid, NULL, 'Javiera B.',
 5, 'Mi Schnauzer salió perfecto. El corte respeta la estructura de la raza, algo que no encontraba en otros lugares. Volveré seguro.',
 'aprobado', NULL,
 '2026-03-08 11:45:00+00'),

('e1000001-0000-4000-8000-000000000015'::uuid,
 'c1000001-0000-4000-8000-000000000005'::uuid,
 'b1000001-0000-4000-8000-000000000005'::uuid, NULL, 'Macarena Q.',
 4, 'Buena atención y ambiente tranquilo. Mi perrito normalmente se altera y aquí estuvo bien.',
 'aprobado', NULL,
 '2026-02-01 16:20:00+00'),

-- ───────── Demo 6: Felipe (Adiestramiento) ─────────
('e1000001-0000-4000-8000-000000000016'::uuid,
 'c1000001-0000-4000-8000-000000000006'::uuid,
 'b1000001-0000-4000-8000-000000000006'::uuid, NULL, 'Pablo F.',
 5, 'Adopté un perro adulto con ansiedad por separación severa: destruía la casa cuando me iba. Después de 8 sesiones con Felipe, puedo salir tranquilo. Su método con refuerzo positivo es respetuoso y de verdad funciona. Lo importante es que me enseñó a mí también, no solo entrenó al perro. Felipe acompaña el proceso entre sesiones por mensaje.',
 'aprobado', '¡Gracias Pablo! Luca avanzó mucho gracias a tu compromiso. El refuerzo positivo requiere paciencia pero los resultados duran.',
 '2026-04-30 18:30:00+00'),

('e1000001-0000-4000-8000-000000000017'::uuid,
 'c1000001-0000-4000-8000-000000000006'::uuid,
 'b1000001-0000-4000-8000-000000000006'::uuid, NULL, 'Andrea V.',
 5, 'Mi perra reactiva ahora puede pasar al lado de otros perros sin explotar. Felipe sabe lo que hace, sin métodos invasivos.',
 'aprobado', NULL,
 '2026-03-25 14:50:00+00'),

('e1000001-0000-4000-8000-000000000018'::uuid,
 'c1000001-0000-4000-8000-000000000006'::uuid,
 'b1000001-0000-4000-8000-000000000006'::uuid, NULL, 'Daniela O.',
 4, 'Trabajamos obediencia básica con mi cachorro. Buen profesional, claro al explicar. Las tareas entre sesiones son fundamentales.',
 'aprobado', NULL,
 '2026-01-28 10:00:00+00'),

-- ───────── Demo 7: Tomás (Veterinario) ─────────
('e1000001-0000-4000-8000-000000000019'::uuid,
 'c1000001-0000-4000-8000-000000000007'::uuid,
 'b1000001-0000-4000-8000-000000000007'::uuid, NULL, 'Paulina R.',
 5, 'Mi gato se estresa muchísimo en clínicas, hasta el punto de no poder hacer un examen completo. Que el Dr. Tomás venga a casa cambió todo: pudo revisarlo tranquilo, le sacó muestra de sangre sin drama. Recibí los resultados rápido y emite boleta para reembolso del seguro. La consulta previa por WhatsApp también es muy útil. Lo recomiendo cien por ciento.',
 'aprobado', '¡Gracias Paulina! Mauro es un caballero cuando está en su entorno. Cualquier consulta me avisas.',
 '2026-04-15 11:30:00+00'),

('e1000001-0000-4000-8000-000000000020'::uuid,
 'c1000001-0000-4000-8000-000000000007'::uuid,
 'b1000001-0000-4000-8000-000000000007'::uuid, NULL, 'Felipe M.',
 5, 'Vino a hacer los controles preventivos anuales de mis dos perros. Profesionalismo total, explica todo, deja recomendaciones por escrito. Volveré.',
 'aprobado', NULL,
 '2026-03-18 09:00:00+00'),

('e1000001-0000-4000-8000-000000000021'::uuid,
 'c1000001-0000-4000-8000-000000000007'::uuid,
 'b1000001-0000-4000-8000-000000000007'::uuid, NULL, 'Andrés W.',
 5, 'Atención excelente. Vacunas a domicilio sin estrés.',
 'aprobado', NULL,
 '2026-02-26 16:15:00+00'),

-- ───────── Demo 8: Javiera (Traslado) ─────────
('e1000001-0000-4000-8000-000000000022'::uuid,
 'c1000001-0000-4000-8000-000000000008'::uuid,
 'b1000001-0000-4000-8000-000000000008'::uuid, NULL, 'Ignacio L.',
 5, 'Necesitaba trasladar a mi golden al aeropuerto para un viaje internacional con toda la documentación. Javiera coordinó todo perfecto: vehículo acondicionado, jaulas IATA, llegó con tiempo y me mantuvo informado por mensaje durante el trayecto. La camioneta tiene ventilación independiente y mi perro viajó tranquilo. Para razas grandes es la mejor opción que encontré.',
 'aprobado', '¡Gracias Ignacio! Cooper viajó como un campeón. Buen vuelo a ambos.',
 '2026-04-22 06:45:00+00'),

('e1000001-0000-4000-8000-000000000023'::uuid,
 'c1000001-0000-4000-8000-000000000008'::uuid,
 'b1000001-0000-4000-8000-000000000008'::uuid, NULL, 'Carla T.',
 4, 'Hice una mudanza con mis dos perros desde Maipú a Las Condes. Comunicación constante durante el viaje. Tarifa clara desde el principio, sin sorpresas.',
 'aprobado', NULL,
 '2026-03-14 13:00:00+00'),

('e1000001-0000-4000-8000-000000000024'::uuid,
 'c1000001-0000-4000-8000-000000000008'::uuid,
 'b1000001-0000-4000-8000-000000000008'::uuid, NULL, 'Sebastián K.',
 5, 'Confiable y puntual. Trasladó a mi gato a la veterinaria sin estrés.',
 'aprobado', NULL,
 '2026-01-15 08:20:00+00'),

-- ───────── Demo 9: Andrea (Fotografía) ─────────
('e1000001-0000-4000-8000-000000000025'::uuid,
 'c1000001-0000-4000-8000-000000000009'::uuid,
 'b1000001-0000-4000-8000-000000000009'::uuid, NULL, 'Macarena D.',
 5, 'Hice una sesión de fotos con mi perro tímido en un parque. Andrea fue increíblemente paciente, no lo presionó en ningún momento y consiguió retratos hermosos. Las fotos finales superaron mis expectativas, captó su personalidad. Entrega rápida (5 días) en alta resolución y muy buena edición. Ya estoy planeando una sesión familiar incluyendo a mi gato.',
 'aprobado', '¡Gracias Macarena! Toby tiene una mirada única. Te espero para la sesión familiar cuando quieran.',
 '2026-05-01 14:30:00+00'),

('e1000001-0000-4000-8000-000000000026'::uuid,
 'c1000001-0000-4000-8000-000000000009'::uuid,
 'b1000001-0000-4000-8000-000000000009'::uuid, NULL, 'Vicente A.',
 5, 'Edición impecable y entrega más rápida de lo prometido. Las fotos las usamos para Instagram y los amigos preguntan quién las hizo.',
 'aprobado', NULL,
 '2026-03-28 17:00:00+00'),

('e1000001-0000-4000-8000-000000000027'::uuid,
 'c1000001-0000-4000-8000-000000000009'::uuid,
 'b1000001-0000-4000-8000-000000000009'::uuid, NULL, 'Antonia P.',
 4, 'Buenas fotos, ambiente relajado durante la sesión. Recomendable.',
 'aprobado', NULL,
 '2026-02-10 11:20:00+00');


-- 5C — Verificación PARTE 5 (descomentar para correr):
-- SELECT proveedor_id, count(*) FROM evaluaciones GROUP BY proveedor_id ORDER BY proveedor_id;
-- -- Esperado: 9 filas con count=3 cada una
-- SELECT count(*) FROM evaluaciones WHERE estado = 'aprobado' AND usuario_id IS NULL;
-- -- Esperado: 27
-- SELECT id, nombre_autor, rating, length(comentario) as len, respuesta_proveedor IS NOT NULL as tiene_respuesta
--   FROM evaluaciones WHERE usuario_id IS NULL ORDER BY proveedor_id, created_at;
-- -- Esperado: 27 filas con nombre_autor populado, ratings 4-5, longitudes variadas, ~50% respuestas


-- =====================================================================
-- PART 6 — Recalcular perfil_completo
-- =====================================================================
-- Defensa: el trigger BEFORE UPDATE en proveedores no dispara con INSERT,
-- pero el trigger AFTER INSERT en servicios_publicados sí actualiza el flag
-- al insertar el primer servicio activo. Este UPDATE explícito asegura
-- que los 9 demos terminen con perfil_completo=true incluso si el orden
-- del INSERT cambia o falla algún trigger.

UPDATE proveedores
   SET perfil_completo = calcular_perfil_completo_proveedor(id)
 WHERE es_ejemplo = true;


-- =====================================================================
-- PART 7 — Verificación post-script
-- =====================================================================
-- Descomentar y correr después del script principal:
--
-- SELECT id, nombre, apellido_p, comuna, perfil_completo, es_ejemplo
--   FROM proveedores
--  WHERE es_ejemplo = true
--  ORDER BY nombre;
-- -- Esperado: 9 filas, todas con perfil_completo=true
--
-- SELECT count(*) FROM servicios_publicados WHERE activo = true;
-- -- Esperado: 9 (sin admins) o 9+N si admins tienen servicios
--
-- SELECT cs.slug, count(*)
--   FROM servicios_publicados sp
--   JOIN categorias_servicio cs ON cs.id = sp.categoria_id
--  WHERE sp.activo = true
--  GROUP BY cs.slug
--  ORDER BY cs.slug;
-- -- Esperado: 1 servicio por cada slug (hospedaje, guarderia, domicilio,
-- --           paseos, peluqueria, adiestramiento, veterinario, traslado, fotografia)
