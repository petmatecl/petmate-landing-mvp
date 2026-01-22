-- Update Sitter 1 (Pro) policies
UPDATE public.registro_petmate
SET 
    acepta_cachorros = true,
    acepta_sin_esterilizar = true,
    permite_cama = true,
    permite_sofa = true,
    mascotas_no_encerradas = true,
    capacidad_maxima = 3,
    supervision_24_7 = true
WHERE auth_user_id = 's1111111-1111-1111-1111-111111111111';

-- Update Sitter 2 (New) policies
UPDATE public.registro_petmate
SET 
    acepta_cachorros = true,
    acepta_sin_esterilizar = false,
    permite_cama = false,
    permite_sofa = true,
    mascotas_no_encerradas = true,
    capacidad_maxima = 1,
    supervision_24_7 = false
WHERE auth_user_id = 's2222222-2222-2222-2222-222222222222';
