-- Migración para soportar roles duales
ALTER TABLE public.usuarios_buscadores
  ADD COLUMN IF NOT EXISTS proveedor_id UUID
  REFERENCES public.proveedores(id) ON DELETE SET NULL;
