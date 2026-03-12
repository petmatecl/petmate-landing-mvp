-- Referral program: tracks who referred whom
-- Run via Supabase SQL editor

CREATE TABLE IF NOT EXISTS referidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_auth_id UUID NOT NULL REFERENCES auth.users(id),
    referred_auth_id UUID REFERENCES auth.users(id),
    codigo VARCHAR(20) NOT NULL UNIQUE,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'registrado', 'activo', 'recompensado')),
    created_at TIMESTAMPTZ DEFAULT now(),
    registered_at TIMESTAMPTZ,
    rewarded_at TIMESTAMPTZ
);

-- Index for fast lookup by code
CREATE INDEX IF NOT EXISTS idx_referidos_codigo ON referidos(codigo);
CREATE INDEX IF NOT EXISTS idx_referidos_referrer ON referidos(referrer_auth_id);

-- Add referral code column to users
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS codigo_referido VARCHAR(20);
ALTER TABLE usuarios_buscadores ADD COLUMN IF NOT EXISTS codigo_referido VARCHAR(20);

-- Add onboarding email tracking columns for cron
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS email_onboarding_at TIMESTAMPTZ;
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS email_foto_at TIMESTAMPTZ;

-- RLS policies
ALTER TABLE referidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals"
    ON referidos FOR SELECT
    USING (referrer_auth_id = auth.uid());

CREATE POLICY "Users can create referral codes"
    ON referidos FOR INSERT
    WITH CHECK (referrer_auth_id = auth.uid());
