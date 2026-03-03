-- Migration 202: Crear tabla favoritos
-- Ejecutar en Supabase SQL Editor (o via CLI: supabase db push)

CREATE TABLE IF NOT EXISTS favoritos (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    servicio_id uuid        REFERENCES servicios_publicados(id) ON DELETE CASCADE NOT NULL,
    created_at  timestamptz DEFAULT now(),
    UNIQUE(user_id, servicio_id)
);

ALTER TABLE favoritos ENABLE ROW LEVEL SECURITY;

-- Usuarios solo ven sus propios favoritos
CREATE POLICY "Usuarios ven sus favoritos"
    ON favoritos FOR SELECT
    USING (auth.uid() = user_id);

-- Usuarios crean sus propios favoritos
CREATE POLICY "Usuarios crean sus favoritos"
    ON favoritos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Usuarios eliminan sus propios favoritos
CREATE POLICY "Usuarios eliminan sus favoritos"
    ON favoritos FOR DELETE
    USING (auth.uid() = user_id);

-- Índice para lookups rápidos por usuario
CREATE INDEX IF NOT EXISTS idx_favoritos_user_id ON favoritos(user_id);

-- NOTA: La columna usada en DashboardContent.tsx es user_id (= auth.uid()).
-- Si la query existente usa auth_user_id, cambiar a user_id en la query.
