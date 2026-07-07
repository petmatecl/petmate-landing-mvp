-- Feature "fichas de mascotas → solicitud"
-- ----------------------------------------------------------------------------
-- Agrega la asociacion opcional entre un agendamiento y una ficha de mascota
-- del tutor (public.mascotas). Si el tutor NO tiene fichas o eligio "otra",
-- puede escribir texto libre en tipo_mascota_texto como fallback.
--
-- Mutuamente exclusivos en el flujo de UI (uno u otro, no ambos), pero
-- ambos son NULLABLE porque las solicitudes SIN mascota siguen siendo
-- validas (retrocompat con agendamientos previos y flujos sin ficha).
--
-- Idempotente: usa IF NOT EXISTS por si ya se aplico via UI de Supabase.

ALTER TABLE public.agendamientos
    ADD COLUMN IF NOT EXISTS mascota_id uuid
        REFERENCES public.mascotas(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS tipo_mascota_texto text;

COMMENT ON COLUMN public.agendamientos.mascota_id IS
    'FK opcional a la ficha de mascota (public.mascotas) que el tutor asocio a esta solicitud. NULL si el tutor uso texto libre (tipo_mascota_texto) o no especifico mascota.';

COMMENT ON COLUMN public.agendamientos.tipo_mascota_texto IS
    'Texto libre alternativo cuando el tutor no tiene ficha o eligio "otra". Mutuamente exclusivo con mascota_id en el flujo de UI, pero no forzado a nivel DB (ambos NULLABLE).';

-- Indice para queries del proveedor que joinean con mascotas.
CREATE INDEX IF NOT EXISTS idx_agendamientos_mascota
    ON public.agendamientos (mascota_id)
    WHERE mascota_id IS NOT NULL;
