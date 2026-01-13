ALTER TABLE public.viajes
DROP CONSTRAINT IF EXISTS fk_viajes_user;

ALTER TABLE public.viajes
ADD CONSTRAINT fk_viajes_user
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;
