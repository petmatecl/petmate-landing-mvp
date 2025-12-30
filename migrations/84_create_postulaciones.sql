-- Create postulaciones table
CREATE TABLE IF NOT EXISTS public.postulaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viaje_id UUID NOT NULL REFERENCES public.viajes(id) ON DELETE CASCADE,
    sitter_id UUID NOT NULL REFERENCES public.registro_petmate(auth_user_id) ON DELETE CASCADE,
    precio NUMERIC,
    mensaje TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptado', 'rechazado')),
    origen TEXT NOT NULL DEFAULT 'solicitud_cliente' CHECK (origen IN ('solicitud_cliente', 'postulacion_sitter')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(viaje_id, sitter_id) -- Prevent duplicate applications
);

-- RLS Policies
ALTER TABLE public.postulaciones ENABLE ROW LEVEL SECURITY;

-- Clients can view applications for their trips
CREATE POLICY "Clients can view applications for their trips"
    ON public.postulaciones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.viajes
            WHERE public.viajes.id = public.postulaciones.viaje_id
            AND public.viajes.user_id = auth.uid()
        )
    );

-- Sitters can view their own applications
CREATE POLICY "Sitters can view their own applications"
    ON public.postulaciones FOR SELECT
    USING (sitter_id = auth.uid());

-- Sitters can insert their own applications
CREATE POLICY "Sitters can create applications"
    ON public.postulaciones FOR INSERT
    WITH CHECK (sitter_id = auth.uid());

-- Clients can insert direct requests (origin must be 'solicitud_cliente')
CREATE POLICY "Clients can create direct requests"
    ON public.postulaciones FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.viajes
            WHERE public.viajes.id = public.postulaciones.viaje_id
            AND public.viajes.user_id = auth.uid()
        )
        AND origen = 'solicitud_cliente'
    );

-- Clients can update status (accept/reject)
CREATE POLICY "Clients can update application status"
    ON public.postulaciones FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.viajes
            WHERE public.viajes.id = public.postulaciones.viaje_id
            AND public.viajes.user_id = auth.uid()
        )
    );

-- Sitters can update status of direct requests (accept/reject)
CREATE POLICY "Sitters can update direct request status"
    ON public.postulaciones FOR UPDATE
    USING (sitter_id = auth.uid() AND origen = 'solicitud_cliente');
