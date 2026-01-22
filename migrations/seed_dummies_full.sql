-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- 1. INSERT USERS (Clients & Sitters)
-- ==========================================
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token
) VALUES 
-- Client 1 (Active - Perfect)
('00000000-0000-0000-0000-000000000000', 'c1111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'active_client@pawnecta.com', crypt('Pawnecta2024!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Cliente","apellido_p":"Activo"}', now(), now(), '', ''),
-- Client 2 (New - Empty-ish)
('00000000-0000-0000-0000-000000000000', 'c2222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'new_client@pawnecta.com', crypt('Pawnecta2024!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Cliente","apellido_p":"Nuevo"}', now(), now(), '', ''),
-- Client 3 (Past History)
('00000000-0000-0000-0000-000000000000', 'c3333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'past_client@pawnecta.com', crypt('Pawnecta2024!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Cliente","apellido_p":"Histórico"}', now(), now(), '', ''),

-- Sitter 1 (Pro - Verified, Reviews)
('00000000-0000-0000-0000-000000000000', 's1111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'pro_sitter@pawnecta.com', crypt('Pawnecta2024!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Sitter","apellido_p":"Pro"}', now(), now(), '', ''),
-- Sitter 2 (New - Verified, No Reviews)
('00000000-0000-0000-0000-000000000000', 's2222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'new_sitter@pawnecta.com', crypt('Pawnecta2024!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Sitter","apellido_p":"Nuevo"}', now(), now(), '', ''),
-- Sitter 3 (Pending - Unverified)
('00000000-0000-0000-0000-000000000000', 's3333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'pending_sitter@pawnecta.com', crypt('Pawnecta2024!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Sitter","apellido_p":"Pendiente"}', now(), now(), '', '')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 2. INSERT PROFILES (registro_petmate)
-- ==========================================
INSERT INTO public.registro_petmate (
    id, auth_user_id, nombre, apellido_p, email, rol, roles, rut, phone, direccion_completa, comuna, region, foto_perfil, descripcion,
    has_pets, pet_details, -- Renaming based on previous query inspection failure? 
    -- wait, I need exact column names. Relying on "tiene_mascotas", "detalles_mascotas" from query output
    tiene_mascotas, detalles_mascotas,
    verificado, aprobado,
    modalidad, servicio_en_casa, servicio_a_domicilio, tarifa_servicio_en_casa, tarifa_servicio_a_domicilio,
    cuida_perros, cuida_gatos,
    tipo_vivienda, tiene_patio, tiene_malla, tiene_ninos, fumador,
    galeria, video_presentacion, created_at
) VALUES
-- Client 1 (Active)
(gen_random_uuid(), 'c1111111-1111-1111-1111-111111111111', 'Cliente', 'Activo', 'active_client@pawnecta.com', 'usuario', ARRAY['usuario'], '11.111.111-1', '+56911111111', 'Av. Providencia 1234', 'Providencia', 'Metropolitana', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150', 'Amante de los animales.', true, '[{"nombre":"Rocky","tipo":"perro"}]'::jsonb, false, false, 'cliente', false, false, 0, 0, false, false, 'casa', true, true, false, false, null, null, now()),
-- Client 2 (New)
(gen_random_uuid(), 'c2222222-2222-2222-2222-222222222222', 'Cliente', 'Nuevo', 'new_client@pawnecta.com', 'usuario', ARRAY['usuario'], '11.111.111-2', '+56922222222', 'Calle Nueva 456', 'Santiago', 'Metropolitana', null, null, false, null, false, false, 'cliente', false, false, 0, 0, false, false, 'departamento', false, false, false, false, null, null, now()),
-- Client 3 (Past)
(gen_random_uuid(), 'c3333333-3333-3333-3333-333333333333', 'Cliente', 'Histórico', 'past_client@pawnecta.com', 'usuario', ARRAY['usuario'], '11.111.111-3', '+56933333333', 'Calle Vieja 789', 'Nuñoa', 'Metropolitana', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150', 'Me gusta viajar.', true, '[{"nombre":"Mishi","tipo":"gato"}]'::jsonb, false, false, 'cliente', false, false, 0, 0, false, false, 'casa', true, true, true, false, null, null, now()),

-- Sitter 1 (Pro)
(gen_random_uuid(), 's1111111-1111-1111-1111-111111111111', 'Sitter', 'Pro', 'pro_sitter@pawnecta.com', 'petmate', ARRAY['petmate','usuario'], '22.222.222-1', '+56944444444', 'Sitter Home 1', 'Las Condes', 'Metropolitana', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150', 'Experto cuidador.', true, '[]'::jsonb, true, true, 'ambos', true, true, 30000, 25000, true, true, 'casa', true, true, false, false, ARRAY['https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=300','https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=300'], 'https://youtube.com/dummy', now()),
-- Sitter 2 (New)
(gen_random_uuid(), 's2222222-2222-2222-2222-222222222222', 'Sitter', 'Nuevo', 'new_sitter@pawnecta.com', 'petmate', ARRAY['petmate','usuario'], '22.222.222-2', '+56955555555', 'Loft Moderno', 'Providencia', 'Metropolitana', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150', 'Nuevo en la app, con muchas ganas.', false, null, true, true, 'hospedaje', true, false, 20000, 0, true, false, 'departamento', false, true, false, false, ARRAY['https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=300'], null, now()),
-- Sitter 3 (Pending)
(gen_random_uuid(), 's3333333-3333-3333-3333-333333333333', 'Sitter', 'Pendiente', 'pending_sitter@pawnecta.com', 'petmate', ARRAY['petmate'], '22.222.222-3', '+56966666666', 'Casa en revision', 'La Reina', 'Metropolitana', null, 'Perfil en construcción.', false, null, false, false, 'paseo', false, true, 0, 15000, true, true, 'casa', true, false, true, true, null, null, now())
ON CONFLICT DO NOTHING; -- Assuming auth_user_id is unique constraint

-- ==========================================
-- 3. INSERT MASCOTAS (For Clients)
-- ==========================================
INSERT INTO public.mascotas (id, user_id, nombre, tipo, raza, sexo, vacunas_al_dia, fecha_nacimiento, foto_mascota, created_at) VALUES
-- Client 1 Pets
(gen_random_uuid(), 'c1111111-1111-1111-1111-111111111111', 'Rocky', 'perro', 'Golden', 'macho', true, '2020-01-01', 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=150', now()),
(gen_random_uuid(), 'c1111111-1111-1111-1111-111111111111', 'Luna', 'gato', 'Siames', 'hembra', true, '2021-05-01', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=150', now()),
-- Client 3 Pets
(gen_random_uuid(), 'c3333333-3333-3333-3333-333333333333', 'Mishi', 'gato', 'Persa', 'macho', true, '2019-03-15', 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=150', now());

-- ==========================================
-- 4. INSERT DIRECCIONES (For Clients)
-- ==========================================
INSERT INTO public.direcciones (id, user_id, calle, numero, comuna, region, tipo, is_default) VALUES
(gen_random_uuid(), 'c1111111-1111-1111-1111-111111111111', 'Av. Providencia', '1234', 'Providencia', 'Metropolitana', 'Casa', true),
(gen_random_uuid(), 'c2222222-2222-2222-2222-222222222222', 'Calle Nueva', '456', 'Santiago', 'Metropolitana', 'Depto', true),
(gen_random_uuid(), 'c3333333-3333-3333-3333-333333333333', 'Calle Vieja', '789', 'Nuñoa', 'Metropolitana', 'Casa', true);

-- ==========================================
-- 5. INSERT VIAJES (Trips) & POSTULACIONES & REVIEWS
-- ==========================================

-- Trip 1: ACTIVE (Confirmed, Upcoming)
-- Client 1 <-> Sitter 1
INSERT INTO public.viajes (id, user_id, sitter_id, fecha_inicio, fecha_fin, servicio, perros, gatos, estado, created_at, comuna) VALUES
('t1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', CURRENT_DATE + 5, CURRENT_DATE + 10, 'alojamiento', 1, 1, 'confirmado', now(), 'Las Condes');

-- Application for Trip 1 (Accepted)
INSERT INTO public.postulaciones (id, viaje_id, sitter_id, precio_oferta, mensaje, estado, created_at) VALUES
(gen_random_uuid(), 't1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 150000, 'Me encantaría cuidar a Rocky y Luna!', 'aceptado', now());

-- Trip 2: PAST (Completed with Review)
-- Client 3 <-> Sitter 1
INSERT INTO public.viajes (id, user_id, sitter_id, fecha_inicio, fecha_fin, servicio, perros, gatos, estado, created_at, comuna) VALUES
('t2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333', 's1111111-1111-1111-1111-111111111111', CURRENT_DATE - 20, CURRENT_DATE - 15, 'alojamiento', 0, 1, 'finalizado', now() - interval '30 days', 'Las Condes');

-- Application for Trip 2 (Accepted)
INSERT INTO public.postulaciones (id, viaje_id, sitter_id, precio_oferta, mensaje, estado, created_at) VALUES
(gen_random_uuid(), 't2222222-2222-2222-2222-222222222222', 's1111111-1111-1111-1111-111111111111', 100000, 'Cuidaré bien de Mishi.', 'aceptado', now() - interval '30 days');

-- Review for Trip 2
INSERT INTO public.reviews (id, sitter_id, cliente_id, reserva_id, calificacion, comentario, created_at) VALUES
(gen_random_uuid(), 's1111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 't2222222-2222-2222-2222-222222222222', 5, 'Excelente servicio, Mishi volvió feliz.', now() - interval '14 days');

-- Trip 3: OPEN (Pending Application from Sitter 2)
-- Client 1 looking for sitter
INSERT INTO public.viajes (id, user_id, sitter_id, fecha_inicio, fecha_fin, servicio, perros, gatos, estado, created_at, comuna) VALUES
('t3333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111', null, CURRENT_DATE + 20, CURRENT_DATE + 25, 'alojamiento', 1, 0, 'pendiente', now(), 'Providencia');

-- Application for Trip 3 (Pending from Sitter 2)
INSERT INTO public.postulaciones (id, viaje_id, sitter_id, precio_oferta, mensaje, estado, created_at) VALUES
(gen_random_uuid(), 't3333333-3333-3333-3333-333333333333', 's2222222-2222-2222-2222-222222222222', 90000, 'Hola, soy nuevo y me gustaría cuidar a tu perro!', 'pendiente', now());

