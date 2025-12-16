-- Add calle and numero columns to registro_petmate
ALTER TABLE registro_petmate 
ADD COLUMN IF NOT EXISTS calle text,
ADD COLUMN IF NOT EXISTS numero text;
