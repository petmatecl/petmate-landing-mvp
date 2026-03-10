-- Create waitlist table for capturing emails
CREATE TABLE IF NOT EXISTS public.waitlist (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL,
    comuna text,
    categoria text,
    rol text DEFAULT 'tutor' CHECK (rol IN ('tutor','proveedor')),
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Allow inserts from authenticated and anon users (waitlist is public to join)
CREATE POLICY "allow insert" ON public.waitlist 
FOR INSERT 
WITH CHECK (true);

-- Create unique index to allow UPSERT operations
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_idx ON public.waitlist(email);
