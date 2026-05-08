-- ============================================================================
-- Sprint F — Contador de visitas (5/6): trigger perfil_completo optimizado
-- ============================================================================
-- El trigger trg_proveedor_perfil_completo (creado en 20260505) era
-- BEFORE UPDATE genérico, sin OF (cols). Eso significa que CUALQUIER UPDATE
-- a la tabla proveedores ejecutaba calcular_perfil_completo_proveedor().
--
-- Con el contador de visitas (registrar_visita hace UPDATE proveedores SET
-- visitas_total = ..., visitas_mes = ...), cada visita disparaba el cálculo
-- innecesariamente — esas 2 columnas NO afectan perfil_completo.
--
-- Optimización: BEFORE UPDATE OF (lista de cols que SÍ afectan). Identificadas
-- leyendo calcular_perfil_completo_proveedor (20260505):
--
--   foto_perfil, nombre_publico, bio, whatsapp, telefono,
--   galeria, comuna, anios_experiencia, certificaciones
--
-- Excluidas explícitamente (no afectan el cálculo):
--   visitas_total, visitas_mes        ← lo que motiva esta migración
--   updated_at                        ← timestamp técnico
--   nombre, apellido_p, apellido_m    ← solo se usan en proveedor_nombre del RPC
--   rut, rut_verificado, foto_carnet* ← KYC, no parte de la rúbrica
--   primera_ayuda                     ← badge separado, no perfil_completo
--   estado, verificacion_estado       ← workflow admin, no perfil_completo
--   sitio_web, instagram, email_publico, mostrar_*  ← extras opcionales
--   roles, tipo_entidad, genero, ocupacion, fecha_nacimiento, es_ejemplo
--   perfil_completo                   ← evita re-disparo recursivo (PG no
--                                       re-dispara el mismo trigger en el
--                                       mismo statement, pero igual lo excluyo
--                                       por claridad documental)
--
-- ⚠️ Si la rúbrica de calcular_perfil_completo_proveedor cambia en el futuro,
-- actualizar la lista OF (cols) en este archivo. Mantener en sync.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- DROP trigger viejo + CREATE optimizado
-- ──────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_proveedor_perfil_completo ON proveedores;

CREATE TRIGGER trg_proveedor_perfil_completo
BEFORE UPDATE OF
    foto_perfil,
    nombre_publico,
    bio,
    whatsapp,
    telefono,
    galeria,
    comuna,
    anios_experiencia,
    certificaciones
ON proveedores
FOR EACH ROW
EXECUTE FUNCTION trg_proveedor_recalcular_completo();

COMMENT ON TRIGGER trg_proveedor_perfil_completo ON proveedores IS
    'Recalcula perfil_completo solo cuando cambia alguna de las 9 columnas '
    'que la rúbrica de calcular_perfil_completo_proveedor() lee. '
    'Excluye visitas_total, visitas_mes, updated_at, etc. para evitar '
    'overhead innecesario. Si la rúbrica cambia, actualizar la lista OF.';
