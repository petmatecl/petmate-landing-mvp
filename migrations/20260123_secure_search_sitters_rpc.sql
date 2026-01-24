-- Secure version of search_sitters RPC
-- 1. Returns explicit table structure instead of whole record (prevents data leakage of phone, rut, email, etc.)
-- 2. Enforces Approved=True in WHERE clause
-- 3. Aliases tarifa_servicio_en_casa as price for frontend compatibility

DROP FUNCTION IF EXISTS public.search_sitters(text, text, text, date, date);

CREATE OR REPLACE FUNCTION public.search_sitters(
    pet_type text,
    service_type text,
    dog_size text,
    date_start date,
    date_end date
)
RETURNS TABLE (
    id uuid,
    auth_user_id uuid,
    nombre text,
    apellido_p text,
    comuna text,
    region text,
    foto_perfil text,
    descripcion text,
    latitud double precision,
    longitud double precision,
    price integer,
    tarifa_servicio_a_domicilio integer,
    cuida_perros boolean,
    cuida_gatos boolean,
    servicio_en_casa boolean,
    servicio_a_domicilio boolean,
    modalidad text,
    tamanos_perros text[],
    aprobado boolean,
    verificado boolean,
    promedio_calificacion float,
    total_reviews int,
    video_presentacion text
)
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
    SELECT 
        p.id,
        p.auth_user_id,
        p.nombre,
        p.apellido_p,
        p.comuna,
        p.region,
        p.foto_perfil,
        p.descripcion,
        p.latitud,
        p.longitud,
        p.tarifa_servicio_en_casa AS price,
        p.tarifa_servicio_a_domicilio,
        p.cuida_perros,
        p.cuida_gatos,
        p.servicio_en_casa,
        p.servicio_a_domicilio,
        p.modalidad,
        p.tamanos_perros,
        p.aprobado,
        p.verificado,
        p.promedio_calificacion,
        p.total_reviews,
        p.video_presentacion
    FROM public.registro_petmate p
    WHERE 
        p.aprobado = true -- SECURITY: Only show approved sitters
        
        -- 1. Role Filter (Must be petmate)
        AND p.roles @> ARRAY['petmate']
        
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
