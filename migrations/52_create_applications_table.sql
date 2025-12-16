-- Create postulaciones table
CREATE TABLE IF NOT EXISTS public.postulaciones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    viaje_id UUID NOT NULL REFERENCES public.viajes(id) ON DELETE CASCADE,
    sitter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mensaje TEXT,
    precio_oferta INTEGER, -- Opcional: si el sitter quiere ofrecer un precio distinto
    estado TEXT CHECK (estado IN ('pendiente', 'aceptada', 'rechazada')) DEFAULT 'pendiente',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(viaje_id, sitter_id) -- Prevent duplicate applications
);

-- Enable RLS
ALTER TABLE public.postulaciones ENABLE ROW LEVEL SECURITY;

-- Policies

-- Sitter: Can create application
CREATE POLICY "Sitters can create applications"
    ON public.postulaciones FOR INSERT
    WITH CHECK (auth.uid() = sitter_id);

-- Sitter: Can view their own applications
CREATE POLICY "Sitters can view their own applications"
    ON public.postulaciones FOR SELECT
    USING (auth.uid() = sitter_id);

-- Client: Can view applications for their own trips
-- We join with viajes table to check if the current user is the owner of the trip
CREATE POLICY "Clients can view applications for their trips"
    ON public.postulaciones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.viajes
            WHERE public.viajes.id = postulaciones.viaje_id
            AND public.viajes.user_id = auth.uid()
        )
    );

-- Client: Can update applications (to accept/reject)
CREATE POLICY "Clients can update applications for their trips"
    ON public.postulaciones FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.viajes
            WHERE public.viajes.id = postulaciones.viaje_id
            AND public.viajes.user_id = auth.uid()
        )
    );
