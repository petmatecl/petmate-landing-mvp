-- 1. Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sitter_id uuid REFERENCES public.registro_petmate(auth_user_id) ON DELETE CASCADE,
    cliente_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    calificacion integer CHECK (calificacion >= 1 AND calificacion <= 5),
    comentario text,
    reserva_id uuid REFERENCES public.reservas(id) ON DELETE SET NULL
);

-- Index for reviews
CREATE INDEX IF NOT EXISTS reviews_sitter_id_idx ON public.reviews(sitter_id);

-- RLS for reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view reviews" 
ON public.reviews FOR SELECT 
USING (true);

CREATE POLICY "Clients can create reviews" 
ON public.reviews FOR INSERT 
WITH CHECK (auth.uid() = cliente_id);

-- 2. Add missing Foreign Key Constraints

-- mascotas.user_id -> auth.users(id)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'mascotas_user_id_fkey') THEN
        ALTER TABLE public.mascotas 
        ADD CONSTRAINT mascotas_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- sitter_availability.sitter_id -> registro_petmate(auth_user_id)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sitter_availability_sitter_id_fkey') THEN
        ALTER TABLE public.sitter_availability 
        ADD CONSTRAINT sitter_availability_sitter_id_fkey 
        FOREIGN KEY (sitter_id) REFERENCES public.registro_petmate(auth_user_id) ON DELETE CASCADE;
    END IF;
END $$;

-- postulaciones.sitter_id -> registro_petmate(auth_user_id)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'postulaciones_sitter_id_fkey') THEN
        ALTER TABLE public.postulaciones 
        ADD CONSTRAINT postulaciones_sitter_id_fkey 
        FOREIGN KEY (sitter_id) REFERENCES public.registro_petmate(auth_user_id) ON DELETE CASCADE;
    END IF;
END $$;

-- viajes.sitter_id -> registro_petmate(auth_user_id)
-- Note: viajes_sitter_id_fkey might already exist, checking carefully
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'viajes_sitter_id_fkey') THEN
        ALTER TABLE public.viajes 
        ADD CONSTRAINT viajes_sitter_id_fkey 
        FOREIGN KEY (sitter_id) REFERENCES public.registro_petmate(auth_user_id) ON DELETE SET NULL;
    END IF;
END $$;
