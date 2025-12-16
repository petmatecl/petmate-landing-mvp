-- Actualizar fotos de perfil de los Sitters para asegurar que sean distintas
-- Usamos las imágenes de Unsplash con parámetros fijos para evitar que cambien

UPDATE public.registro_petmate
SET foto_perfil = CASE 
    WHEN email = 'camila.sitter@example.com' THEN 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400'
    WHEN email = 'felipe.sitter@example.com' THEN 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400'
    WHEN email = 'andrea.sitter@example.com' THEN 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=400'
    WHEN email = 'matias.sitter@example.com' THEN 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400' -- Hombre con lentes
    WHEN email = 'sofia.sitter@example.com' THEN 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400'
    -- Si es Eduardo (el del screenshot, asumimos que es un usuario de prueba creado)
    WHEN nombre = 'Eduardo' THEN 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400'
    ELSE foto_perfil -- mantener la que tenga
END
WHERE rol = 'petmate';
