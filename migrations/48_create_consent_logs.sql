-- Tabla para registro de consentimientos (Términos y Condiciones)
CREATE TABLE IF NOT EXISTS public.consent_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    document_version text NOT NULL, -- Ej: "v1.0 - 2025"
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS: Solo lectura para el dueño (si quisiera ver su historial)
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver su propio historial de consentimiento"
ON public.consent_logs FOR SELECT
USING (auth.uid() = user_id);

-- No permitimos INSERT/UPDATE vía cliente directo para integridad.
-- Las inserciones se harán vía API segura (Service Role).
