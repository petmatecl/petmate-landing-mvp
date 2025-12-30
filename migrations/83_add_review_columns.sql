-- Add rating columns
ALTER TABLE public.registro_petmate 
ADD COLUMN IF NOT EXISTS promedio_calificacion float DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews int DEFAULT 0,
ADD COLUMN IF NOT EXISTS verificado boolean DEFAULT false;

-- Backfill defaults (optional, defaults handle new rows but existing nulls might need 0)
UPDATE public.registro_petmate
SET 
  promedio_calificacion = 5.0,
  total_reviews = 0,
  verificado = false
WHERE promedio_calificacion IS NULL;
