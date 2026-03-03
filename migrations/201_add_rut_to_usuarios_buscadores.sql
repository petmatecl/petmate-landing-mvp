-- Migration: 201_add_rut_to_usuarios_buscadores.sql
-- Fecha: 2026-03-02
-- Proposito: Agregar columna rut a usuarios_buscadores para validar identidad
--            de usuarios que buscan servicios (igual que proveedores).
--
-- INSTRUCCIONES: Ejecutar en Supabase → SQL Editor.
-- NOTA: La columna es nullable para no romper registros existentes.
--       Nuevos registros siempre llegan con RUT validado por el frontend.

ALTER TABLE usuarios_buscadores
  ADD COLUMN IF NOT EXISTS rut text;

-- Comentario en la columna
COMMENT ON COLUMN usuarios_buscadores.rut IS 'RUT chileno del usuario, formato XX.XXX.XXX-X. Validado por dígito verificador en el frontend.';
