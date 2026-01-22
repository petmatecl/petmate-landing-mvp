-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- 1. INSERT USERS (Clients & Sitters)
-- ==========================================
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token
) VALUES 
-- Client 1 (Active)
('00000000-0000-0000-0000-000000000000', 'c1111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'active_client@pawnecta.com', crypt('Pawnecta2024!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Cliente","apellido_p":"Activo"}', now(), now(), '', ''),
-- Client 2 (New)
('00000000-0000-0000-0000-000000000000', 'c2222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'new_client@pawnecta.com', crypt('Pawnecta2024!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Cliente","apellido_p":"Nuevo"}', now(), now(), '', ''),
-- Client 3 (Past)
('00000000-0000-0000-0000-000000000000', 'c3333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'past_client@pawnecta.com', crypt('Pawnecta2024!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Cliente","apellido_p":"Histórico"}', now(), now(), '', ''),

-- Sitter 1 (Pro - Verified, Reviews) - CHANGED ID s1 -> 51 (Valid Hex)
('00000000-0000-0000-0000-000000000000', '51111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'pro_sitter@pawnecta.com', crypt('Pawnecta2024!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Sitter","apellido_p":"Pro"}', now(), now(), '', ''),
-- Sitter 2 (New - Verified, No Reviews) - CHANGED ID s2 -> 52
('00000000-0000-0000-0000-000000000000', '52222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'new_sitter@pawnecta.com', crypt('Pawnecta2024!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Sitter","apellido_p":"Nuevo"}', now(), now(), '', ''),
-- Sitter 3 (Pending - Unverified) - CHANGED ID s3 -> 53
('00000000-0000-0000-0000-000000000000', '53333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'pending_sitter@pawnecta.com', crypt('Pawnecta2024!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Sitter","apellido_p":"Pendiente"}', now(), now(), '', '')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 2. INSERT PROFILES (registro_petmate)
-- ==========================================
INSERT INTO public.registro_petmate (
    id, auth_user_id, nombre, apellido_p, email, rol, roles, rut, 
    telefono, -- Corrected
    direccion_completa, comuna, region, foto_perfil, descripcion,
    tiene_mascotas, detalles_mascotas, -- Corrected
    verificado, aprobado,
    modalidad, servicio_en_casa, servicio_a_domicilio, tarifa_servicio_en_casa, tarifa_servicio_a_domicilio,
    cuida_perros, cuida_gatos,
    tipo_vivienda, tiene_patio, tiene_malla, tiene_ninos, fumador,
    galeria, video_presentacion, created_at,
    -- NEW POLICY FIELDS
    acepta_cachorros, acepta_sin_esterilizar, permite_cama, permite_sofa, mascotas_no_encerradas, capacidad_maxima, supervision_24_7
) VALUES
-- Client 1 (Active)
(gen_random_uuid(), 'c1111111-1111-1111-1111-111111111111', 'Cliente', 'Activo', 'active_client@pawnecta.com', 'usuario', ARRAY['usuario'], '11.111.111-1', '+56911111111', 'Av. Providencia 1234', 'Providencia', 'Metropolitana', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150', 'Amante de los animales.', 
 true, '[{"nombre":"Rocky","tipo":"perro"}]'::jsonb, -- tiene_mascotas, detalles
 false, false, 'cliente', false, false, 0, 0, false, false, 'casa', true, true, false, false, null, null, now(), false, false, false, false, true, 1, false),

-- Sitter 1 (Pro)
(gen_random_uuid(), '51111111-1111-1111-1111-111111111111', 'Sitter', 'Pro', 'pro_sitter@pawnecta.com', 'petmate', ARRAY['petmate','usuario','sitter'], '22.222.222-1', '+56944444444', 'Sitter Home 1', 'Las Condes', 'Metropolitana', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150', 'Experto cuidador.', 
 true, '[]'::jsonb, -- tiene_mascotas, detalles
 true, true, 'ambos', true, true, 30000, 25000, true, true, 'casa', true, true, false, false, ARRAY['https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=300','https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=300'], 'https://youtube.com/dummy', now(),
 true, true, true, true, true, 4, true),

-- Sitter 2 (New)
(gen_random_uuid(), '52222222-2222-2222-2222-222222222222', 'Sitter', 'Nuevo', 'new_sitter@pawnecta.com', 'petmate', ARRAY['petmate','usuario','sitter'], '22.222.222-2', '+56955555555', 'Loft Moderno', 'Providencia', 'Metropolitana', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150', 'Nuevo en la app, con muchas ganas.', 
 false, '[]'::jsonb, -- tiene_mascotas, detalles
 true, true, 'hospedaje', true, false, 20000, 0, true, false, 'departamento', false, true, false, false, ARRAY['https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=300'], null, now(),
 true, false, false, true, true, 1, false)

ON CONFLICT (auth_user_id) DO UPDATE SET
    roles = EXCLUDED.roles,
    acepta_cachorros = EXCLUDED.acepta_cachorros,
    acepta_sin_esterilizar = EXCLUDED.acepta_sin_esterilizar,
    permite_cama = EXCLUDED.permite_cama,
    permite_sofa = EXCLUDED.permite_sofa,
    mascotas_no_encerradas = EXCLUDED.mascotas_no_encerradas,
    capacidad_maxima = EXCLUDED.capacidad_maxima,
    supervision_24_7 = EXCLUDED.supervision_24_7;
