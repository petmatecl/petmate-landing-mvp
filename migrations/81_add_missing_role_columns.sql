-- Add missing role columns
ALTER TABLE public.registro_petmate 
ADD COLUMN IF NOT EXISTS rol text DEFAULT 'cliente',
ADD COLUMN IF NOT EXISTS roles text[] DEFAULT ARRAY['cliente'];

-- Backfill data based on service flags (heuristic)
-- If they offer services or have rates, assume they are sitters
UPDATE public.registro_petmate
SET rol = 'petmate', roles = ARRAY['petmate']
WHERE 
    cuida_perros = true OR 
    cuida_gatos = true OR 
    servicio_en_casa = true OR 
    servicio_a_domicilio = true OR 
    tarifa_servicio_en_casa IS NOT NULL OR
    tarifa_servicio_a_domicilio IS NOT NULL;

-- Make sure admin is admin (optional, if you have specific emails)
UPDATE public.registro_petmate
SET rol = 'admin', roles = ARRAY['admin', 'petmate', 'cliente']
WHERE email IN ('admin@petmate.cl', 'aldo@petmate.cl', 'canocortes@gmail.com');
