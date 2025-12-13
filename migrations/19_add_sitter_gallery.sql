ALTER TABLE registro_petmate
ADD COLUMN IF NOT EXISTS galeria text[] DEFAULT '{}';
