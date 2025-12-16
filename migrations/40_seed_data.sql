-- Semilla de datos para Pawnecta (Sitters y Clientes)
-- LIMPIEZA PREVIA: Eliminar datos anteriores para evitar conflictos
DELETE FROM public.mascotas WHERE user_id IN (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b21',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b23'
);

DELETE FROM public.registro_petmate WHERE id IN (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b21', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b23'
);

DELETE FROM auth.users WHERE id IN (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b21', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b23'
);

-- Contraseña por defecto: '123456' (hash bcrypt de ejemplo o genérico)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES 
-- Sitters
(
    '00000000-0000-0000-0000-000000000000',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'authenticated',
    'authenticated',
    'camila.sitter@example.com',
    '$2a$10$6.536.536.536.536.536.536.536.536.536.536.536.536.536', -- Dummy hash
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(), NOW(),
    '', '', '', ''
),
(
    '00000000-0000-0000-0000-000000000000',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'authenticated',
    'authenticated',
    'felipe.sitter@example.com',
    '$2a$10$6.536.536.536.536.536.536.536.536.536.536.536.536.536',
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(), NOW(),
    '', '', '', ''
),
(
    '00000000-0000-0000-0000-000000000000',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    'authenticated',
    'authenticated',
    'andrea.sitter@example.com',
    '$2a$10$6.536.536.536.536.536.536.536.536.536.536.536.536.536',
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(), NOW(),
    '', '', '', ''
),
(
    '00000000-0000-0000-0000-000000000000',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
    'authenticated',
    'authenticated',
    'matias.sitter@example.com',
    '$2a$10$6.536.536.536.536.536.536.536.536.536.536.536.536.536',
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(), NOW(),
    '', '', '', ''
),
(
    '00000000-0000-0000-0000-000000000000',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
    'authenticated',
    'authenticated',
    'sofia.sitter@example.com',
    '$2a$10$6.536.536.536.536.536.536.536.536.536.536.536.536.536',
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(), NOW(),
    '', '', '', ''
),
-- Clientes
(
    '00000000-0000-0000-0000-000000000000',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b21',
    'authenticated',
    'authenticated',
    'pedro.cliente@example.com',
    '$2a$10$6.536.536.536.536.536.536.536.536.536.536.536.536.536',
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(), NOW(),
    '', '', '', ''
),
(
    '00000000-0000-0000-0000-000000000000',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
    'authenticated',
    'authenticated',
    'laura.cliente@example.com',
    '$2a$10$6.536.536.536.536.536.536.536.536.536.536.536.536.536',
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(), NOW(),
    '', '', '', ''
),
(
    '00000000-0000-0000-0000-000000000000',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b23',
    'authenticated',
    'authenticated',
    'diego.cliente@example.com',
    '$2a$10$6.536.536.536.536.536.536.536.536.536.536.536.536.536',
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(), NOW(),
    '', '', '', ''
);

-- 1. Insertar Sitters (Pawnecta)
INSERT INTO public.registro_petmate (
    id, 
    created_at, 
    email, 
    nombre, 
    apellido_p, 
    rol, 
    comuna, 
    descripcion, 
    aprobado, 
    foto_perfil,
    auth_user_id,
    acepta_perros,
    acepta_gatos,
    modalidad
) VALUES 
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
    NOW(), 
    'camila.sitter@example.com', 
    'Camila', 
    'Vargas', 
    'petmate', 
    'Las Condes', 
    'Amante de los animales con 5 años de experiencia cuidando perros y gatos. Tengo un departamento amplio con terraza segura.', 
    true, 
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- auth_user_id matches id
    true, true, 'ambos'
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 
    NOW(), 
    'felipe.sitter@example.com', 
    'Felipe', 
    'Mendoza', 
    'petmate', 
    'Providencia', 
    'Estudiante de veterinaria de último año. Me encanta cuidar mascotas con necesidades especiales y cachorros.', 
    true, 
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    true, false, 'ambos'
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 
    NOW(), 
    'andrea.sitter@example.com', 
    'Andrea', 
    'Rojas', 
    'petmate', 
    'Ñuñoa', 
    'Cuidadora certificada. Tu mascota se sentirá como en casa. Envío fotos y videos diarios.', 
    true, 
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    false, true, 'a_domicilio'
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 
    NOW(), 
    'matias.sitter@example.com', 
    'Matías', 
    'Soto', 
    'petmate', 
    'Vitacura', 
    'Experto en razas grandes y perros con mucha energía. Salimos a correr y jugar al parque.', 
    false, 
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
    true, true, 'ambos'
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 
    NOW(), 
    'sofia.sitter@example.com', 
    'Sofía', 
    'Castillo', 
    'petmate', 
    'La Reina', 
    'Casa grande con jardín seguro para que tus peludos corran libres. Ambiente familiar y cariñoso.', 
    true, 
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
    true, true, 'en_casa_petmate'
);

-- 2. Insertar Clientes (Dueños de mascotas)
INSERT INTO public.registro_petmate (
    id, 
    created_at, 
    email, 
    nombre, 
    apellido_p, 
    rol, 
    comuna,
    auth_user_id
) VALUES 
(
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b21', 
    NOW(), 
    'pedro.cliente@example.com', 
    'Pedro', 
    'Gómez', 
    'cliente', 
    'Providencia',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b21'
),
(
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 
    NOW(), 
    'laura.cliente@example.com', 
    'Laura', 
    'Pérez', 
    'cliente', 
    'Las Condes',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22'
),
(
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b23', 
    NOW(), 
    'diego.cliente@example.com', 
    'Diego', 
    'Muñoz', 
    'cliente', 
    'Ñuñoa',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b23'
);

-- 3. Insertar Mascotas para los clientes
INSERT INTO public.mascotas (
    id,
    user_id,
    nombre,
    tipo,
    raza,
    edad,
    sexo,
    descripcion,
    tiene_chip,
    vacunas_al_dia,
    trato_especial
) VALUES
-- Mascotas de Pedro
(
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c31',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b21',
    'Rocky',
    'perro',
    'Golden Retriever',
    3,
    'macho',
    'Muy juguetón y cariñoso, se lleva bien con todos.',
    true,
    true,
    false
),
-- Mascotas de Laura
(
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c32',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
    'Luna',
    'gato',
    'Siamés',
    2,
    'hembra',
    'Un poco tímida al principio pero muy dulce.',
    true,
    true,
    false
),
(
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
    'Simba',
    'perro',
    'Poodle Toy',
    5,
    'macho',
    'Pequeño y energético. Le gusta ladrar a veces.',
    true,
    true,
    true
),
-- Mascotas de Diego
(
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c34',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b23',
    'Nala',
    'perro',
    'Mestizo',
    4,
    'hembra',
    'Rescatada, muy fiel y tranquila.',
    true,
    true,
    false
);
