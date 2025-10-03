import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE!;
const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

// Comunas piloto (sector oriente, sin Peñalolén)
const COMUNAS_ORIENTE = [
  'Vitacura', 'Las Condes', 'Lo Barnechea', 'Providencia', 'La Reina', 'Ñuñoa',
] as const;
function isComunaPermitida(v: string): v is typeof COMUNAS_ORIENTE[number] {
  return COMUNAS_ORIENTE.includes(v as any);
}

const ROLE_MAP: Record<'necesita' | 'quiere', 'owner' | 'sitter'> = {
  necesita: 'owner',
  quiere: 'sitter',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const {
      name,
      last_name_paternal,
      last_name_maternal,
      email,
      city,
      visible_role,    // 'necesita' | 'quiere' (desde los radios)
      when_travel,     // string opcional (compatibilidad)
      travel_date,     // 'YYYY-MM-DD'
      property_type,   // 'casa' | 'departamento'
      pet_count,       // string -> number
      pet_types,       // string|string[] -> string[]
    } = (req.body ?? {}) as Record<string, any>;

    // Normalizaciones
    const role = ROLE_MAP[(visible_role as 'necesita' | 'quiere') ?? 'necesita'];
    const petCountNum = Number(pet_count ?? 0) || 0;
    const travelDateISO = travel_date ? new Date(travel_date).toISOString().slice(0, 10) : null;

    const petTypesArr = Array.isArray(pet_types)
      ? (pet_types as string[])
      : (pet_types ? [String(pet_types)] : []);

    // Validaciones mínimas
    if (!name || !last_name_paternal || !last_name_maternal) {
      return res.status(400).json({ ok: false, error: 'Nombre y apellidos son obligatorios' });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email es obligatorio' });
    }
    if (!isComunaPermitida(city)) {
      return res.status(400).json({ ok: false, error: 'Comuna no admitida en el piloto' });
    }
    if (property_type && !['casa', 'departamento'].includes(property_type)) {
      return res.status(400).json({ ok: false, error: 'Tipo de propiedad inválido' });
    }

    const { error } = await supabase.from('waitlist').insert([{
      name,
      last_name_paternal,
      last_name_maternal,
      email,
      city,               // seguimos usando 'city' para comuna
      role,               // owner | sitter
      when_travel: when_travel ?? null,
      travel_date: travelDateISO,
      property_type: property_type ?? null,
      pet_types: petTypesArr,
      pet_count: petCountNum,
    }]);

    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('join-waitlist error', e);
    return res.status(500).json({ ok: false, error: e.message ?? 'Server error' });
  }
}
