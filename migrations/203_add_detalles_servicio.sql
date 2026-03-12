-- Migration 203: Agregar columna detalles_servicio (JSONB) a servicios_publicados
-- Ejecutar en Supabase SQL Editor
-- Propósito: Almacenar campos específicos por tipo de servicio (horarios, capacidad,
--            tipo de vehículo, duración de paseos, cobertura geográfica, etc.)
--            de forma flexible usando JSONB.

ALTER TABLE servicios_publicados
ADD COLUMN IF NOT EXISTS detalles_servicio jsonb DEFAULT '{}'::jsonb;

-- Comentario para documentar el schema esperado por categoría:
-- traslado:      { dias_disponibles: string[], horario_inicio: string, horario_fin: string, tipo_vehiculo: string, capacidad_mascotas: number, zona_cobertura: string }
-- paseos:        { duracion_paseo: string, capacidad_mascotas: number, zona_cobertura: string, dias_disponibles: string[], horario_inicio: string, horario_fin: string }
-- hospedaje:     { capacidad_mascotas: number, tiene_patio: boolean, espacio_interior: string, dias_disponibles: string[], supervision_nocturna: boolean }
-- guarderia:     { capacidad_mascotas: number, horario_inicio: string, horario_fin: string, dias_disponibles: string[], actividades_incluidas: string }
-- peluqueria:    { duracion_sesion: string, servicios_incluidos: string, atencion_domicilio: boolean, dias_disponibles: string[], horario_inicio: string, horario_fin: string }
-- veterinario:   { especialidades: string, atencion_domicilio: boolean, atencion_urgencias: boolean, dias_disponibles: string[], horario_inicio: string, horario_fin: string }
-- adiestramiento:{ modalidad: string, duracion_sesion: string, tipo_adiestramiento: string, dias_disponibles: string[], horario_inicio: string, horario_fin: string }
