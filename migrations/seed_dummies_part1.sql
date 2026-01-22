-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Define constants for UUIDs for easy linking
-- Client 1: active_client@pawnecta.com (Has everything + active trip)
-- Client 2: new_client@pawnecta.com (Just registered)
-- Client 3: past_client@pawnecta.com (History of trips)
-- Sitter 1: pro_sitter@pawnecta.com (Verified, 5 stars, premium)
-- Sitter 2: new_sitter@pawnecta.com (Verified, no reviews)
-- Sitter 3: pending_sitter@pawnecta.com (Unverified/Basic)

-- We use DO block to declare variables but we can't easily use them across statements in standard SQL script without procedural code.
-- Instead, we'll use specific hardcoded UUIDs.

-- CLIENTS
-- c1... Active
-- c2... New
-- c3... Past

-- SITTERS
-- s1... Pro
-- s2... New
-- s3... Pending

-- CLEANUP (Optional - comment out if you want to keep data)
-- DELETE FROM auth.users WHERE email IN ('active_client@pawnecta.com', 'new_client@pawnecta.com', 'past_client@pawnecta.com', 'pro_sitter@pawnecta.com', 'new_sitter@pawnecta.com', 'pending_sitter@pawnecta.com');
-- Note: Cascading usually handles public tables, but let's be safe.

-- 1. INSERT USERS into auth.users
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES 
-- Client 1 (Active) - c1111111-1111-1111-1111-111111111111
(
    '00000000-0000-0000-0000-000000000000',
    'c1111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'active_client@pawnecta.com',
    crypt('Pawnecta2024!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"nombre": "Cliente", "apellido_p": "Activo"}',
    now(),
    now()
),
-- Client 2 (New) - c2222222-2222-2222-2222-222222222222
(
    '00000000-0000-0000-0000-000000000000',
    'c2222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'new_client@pawnecta.com',
    crypt('Pawnecta2024!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"nombre": "Cliente", "apellido_p": "Nuevo"}',
    now(),
    now()
),
-- Sitter 1 (Pro) - s1111111-1111-1111-1111-111111111111
(
    '00000000-0000-0000-0000-000000000000',
    's1111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'pro_sitter@pawnecta.com',
    crypt('Pawnecta2024!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"nombre": "Sitter", "apellido_p": "Pro"}',
    now(),
    now()
),
-- Sitter 2 (New) - s2222222-2222-2222-2222-222222222222
(
    '00000000-0000-0000-0000-000000000000',
    's2222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'new_sitter@pawnecta.com',
    crypt('Pawnecta2024!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"nombre": "Sitter", "apellido_p": "Nuevo"}',
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING; -- Avoid errors if run multiple times

-- 2. COMPLETE PROFILES (public.registro_petmate)
INSERT INTO public.registro_petmate (
    id,
    auth_user_id,
    nombre,
    apellido_p,
    email,
    rol,
    roles,
    rut,
    telefono,
    direccion_completa,
    comuna,
    region,
    foto_perfil,
    descripcion,
    -- Pets logic
    tiene_mascotas,
    detalles_mascotas,
    -- Sitter Specifics
    verificado,
    aprobado,
    modalidad,
    servicio_en_casa,
    servicio_a_domicilio,
    tarifa_servicio_en_casa,
    tarifa_servicio_a_domicilio,
    cuida_perros,
    cuida_gatos,
    tipo_vivienda,
    tiene_patio,
    tiene_malla,
    tiene_ninos,
    fumador,
    galeria, -- Array of strings
    video_presentacion
) VALUES
-- Client 1 (Active)
(
    gen_random_uuid(),
    'c1111111-1111-1111-1111-111111111111',
    'Cliente',
    'Activo',
    'active_client@pawnecta.com',
    'usuario',
    ARRAY['usuario'],
    '11.111.111-1',
    '+56911111111',
    'Av. Providencia 1234',
    'Providencia',
    'Metropolitana',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150',
    'Soy un cliente activo con 2 perros hermosos.',
    true, -- tiene_mascotas
    '[{"nombre": "Rocky", "tipo": "perro"}]'::jsonb, -- detalles_mascotas logic seems partial here compared to `mascotas` table? leaving simple.
    false, false, 'cliente', false, false, 0, 0, false, false, 'departamento', false, true, false, false, null, null
),
-- Sitter 1 (Pro)
(
    gen_random_uuid(),
    's1111111-1111-1111-1111-111111111111',
    'Sitter',
    'Pro',
    'pro_sitter@pawnecta.com',
    'petmate',
    ARRAY['petmate', 'usuario'], -- Dual role usually
    '22.222.222-2',
    '+56922222222',
    'Calle Falsa 123',
    'Las Condes',
    'Metropolitana',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150',
    '¡Hola! Soy el mejor sitter de la ciudad. Tengo 5 años de experiencia, certificado veterinario y amo a los animales.',
    true,
    '[]'::jsonb,
    true, -- verificado
    true, -- aprobado
    'ambos', -- modalidad
    true, -- en casa
    true, -- a domicilio
    25000, -- tarifa casa
    20000, -- tarifa domicilio
    true, -- cuida perros
    true, -- cuida gatos
    'casa',
    true, -- patio
    true, -- malla
    false, -- ninos
    false, -- fumador
    ARRAY[
        'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=300',
        'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=300'
    ],
    'https://www.youtube.com/watch?v=dummy'
);

-- 3. INSERT MASCOTAS (For Client 1)
INSERT INTO public.mascotas (
    id,
    user_id,
    nombre,
    tipo,
    raza,
    sexo,
    chip_id,
    vacunas_al_dia,
    fecha_nacimiento,
    foto_mascota,
    descripcion,
    created_at
) VALUES
(
    gen_random_uuid(),
    'c1111111-1111-1111-1111-111111111111',
    'Max',
    'perro',
    'Golden Retriever',
    'macho',
    '123456789',
    true,
    '2020-01-01',
    'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=150',
    'Muy juguetón y amigable.',
    now()
),
(
    gen_random_uuid(),
    'c1111111-1111-1111-1111-111111111111',
    'Luna',
    'gato',
    'Siamés',
    'hembra',
    null,
    true,
    '2021-06-15',
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=150',
    'Tranquila y regalona.',
    now()
);

-- 4. INSERT DIRECCIONES (For Client 1)
INSERT INTO public.direcciones (
    id,
    user_id,
    calle,
    numero,
    comuna,
    region,
    tipo,
    is_default
) VALUES
(
    gen_random_uuid(),
    'c1111111-1111-1111-1111-111111111111',
    'Av. Providencia',
    '1234',
    'Providencia',
    'Metropolitana',
    'Casa',
    true
);

-- 5. INSERT ACTIVE TRIP (Client 1 <-> Sitter 1)
-- "Confirmado" state
INSERT INTO public.viajes (
    id,
    user_id,
    sitter_id,
    fecha_inicio,
    fecha_fin,
    servicio,
    perros,
    gatos,
    estado,
    created_at,
    comuna -- Important for filtering
) VALUES
(
    gen_random_uuid(), -- We need this ID for postulacion? No, postulacion links to viaje_id
    'c1111111-1111-1111-1111-111111111111',
    's1111111-1111-1111-1111-111111111111', -- Assigned sitter
    CURRENT_DATE + 5,
    CURRENT_DATE + 10,
    'alojamiento',
    1,
    0,
    'confirmado',
    now(),
    'Las Condes'
);
