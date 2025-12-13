CREATE TABLE IF NOT EXISTS reviews (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sitter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    cliente_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    calificacion integer CHECK (calificacion >= 1 AND calificacion <= 5),
    comentario text,
    reserva_id uuid REFERENCES reservas(id) ON DELETE SET NULL
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS reviews_sitter_id_idx ON reviews(sitter_id);
