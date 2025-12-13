-- 1. DELETE DUPLICATES: Keep only the latest record for each authenticated user
-- Uses ROW_NUMBER to identify the latest record based on 'created_at' timestamp
-- If created_at doesn't exist, use id::text to break ties (arbitrary but deterministic)

DELETE FROM public.registro_petmate
WHERE id IN (
    SELECT id FROM (
        SELECT 
            id, 
            ROW_NUMBER() OVER (
                PARTITION BY auth_user_id 
                ORDER BY created_at DESC, id::text DESC
            ) as rn
        FROM public.registro_petmate
        WHERE auth_user_id IS NOT NULL
    ) t 
    WHERE rn > 1
);

-- 2. ADD CONSTRAINT: Prevent future duplicates
ALTER TABLE public.registro_petmate
ADD CONSTRAINT unique_auth_user_id UNIQUE (auth_user_id);
