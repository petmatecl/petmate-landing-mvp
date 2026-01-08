-- Add manual client fields for admin-generated reviews
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS nombre_cliente_manual text,
ADD COLUMN IF NOT EXISTS foto_cliente_manual text;

-- Make cliente_id nullable if we want to allow reviews without a real user (optional, but good for pure manual reviews)
ALTER TABLE reviews ALTER COLUMN cliente_id DROP NOT NULL;
