-- Migration: Rename 'petmate' role to 'sitter'
-- Description:
-- 1. Updates existing data in registro_petmate (roles array and legacy rol column).
-- 2. Updates search_sitters RPC function to filter by 'sitter' instead of 'petmate'.

-- 1. Update roles array column (Replace 'petmate' with 'sitter')
UPDATE public.registro_petmate
SET roles = array_replace(roles, 'petmate', 'sitter')
WHERE roles @> ARRAY['petmate'];

-- 2. Update legacy rol column
UPDATE public.registro_petmate
SET rol = 'sitter'
WHERE rol = 'petmate';

-- 3. Update search_sitters function to use 'sitter' role
CREATE OR REPLACE FUNCTION public.search_sitters(
    pet_type text,         -- 'dogs', 'cats', 'both', 'any'
    service_type text,     -- 'en_casa_petmate', 'a_domicilio', 'all'
    dog_size text,         -- 'Pequeño', 'Mediano', etc., or NULL
    date_start date,       -- NULL if no date filter
    date_end date          -- NULL if no date filter
)
RETURNS SETOF public.registro_petmate
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    days_count int;
BEGIN
    -- If dates are provided, calculate expected available days
    IF date_start IS NOT NULL AND date_end IS NOT NULL THEN
        days_count := (date_end - date_start) + 1;
    END IF;

    RETURN QUERY
    SELECT p.*
    FROM public.registro_petmate p
    WHERE 
        -- 1. Role Filter (Must be sitter)
        p.roles @> ARRAY['sitter']
        
        -- 2. Pet Type Filter
        AND (
            CASE 
                WHEN pet_type = 'dogs' THEN p.cuida_perros = true
                WHEN pet_type = 'cats' THEN p.cuida_gatos = true
                WHEN pet_type = 'both' THEN p.cuida_perros = true AND p.cuida_gatos = true
                ELSE true -- 'any'
            END
        )
        
        -- 3. Service Type Filter
        AND (
            CASE 
                WHEN service_type = 'en_casa_petmate' THEN (p.modalidad = 'en_casa_petmate' OR p.modalidad = 'ambos')
                WHEN service_type = 'a_domicilio' THEN (p.modalidad = 'a_domicilio' OR p.modalidad = 'ambos')
                ELSE true -- 'all'
            END
        )
        
        -- 4. Dog Size Filter (only if pet_type involves dogs and size is specified)
        AND (
            CASE
                WHEN dog_size IS NOT NULL AND (pet_type = 'dogs' OR pet_type = 'both' OR pet_type = 'any') 
                THEN p.tamanos_perros @> ARRAY[dog_size]
                ELSE true
            END
        )

        -- 5. Availability Filter (only if dates are provided)
        AND (
            CASE
                WHEN date_start IS NOT NULL AND date_end IS NOT NULL THEN
                    p.auth_user_id IN (
                        SELECT sa.sitter_id
                        FROM public.sitter_availability sa
                        WHERE sa.available_date >= date_start 
                          AND sa.available_date <= date_end
                        GROUP BY sa.sitter_id
                        HAVING count(*) = days_count
                    )
                ELSE true
            END
        );
END;
$$;
