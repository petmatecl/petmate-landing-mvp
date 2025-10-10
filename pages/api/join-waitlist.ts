import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE!;
const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

const COMUNAS_ORIENTE = [
  'Vitacura','Las Condes','Lo Barnechea','Providencia','La Reina','Ñuñoa',
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
      visible_role,
      property_type,
      travel_start,
      travel_end,
      dog_count,
      cat_count,
    } = (req.body ?? {}) as Record<string, any>;

    if (!name || !last_name_paternal || !last_name_maternal) {
      return res.status(400).json({ ok: false, error: 'Nombre y apellidos son obligatorios' });
    }
    if (!email) return res.status(400).json({ ok: false, error: 'Email es obligatorio' });
    if (!isComunaPermitida(city)) {
      return res.status(400).json({ ok: false, error: 'Comuna no admitida en el piloto' });
    }
    if (property_type && !['casa','departamento'].includes(property_type)) {
      return res.status(400).json({ ok: false, error: 'Tipo de propiedad inválido' });
    }

    const role = ROLE_MAP[(visible_role as 'necesita' | 'quiere') ?? 'necesita'];
    const dog = Number(dog_count ?? 0) || 0;
    const cat = Number(cat_count ?? 0) || 0;

    if (role === 'owner') {
      if (!travel_start || !travel_end) {
        return res.status(400).json({ ok: false, error: 'Debe indicar fecha de inicio y fin del viaje' });
      }
      if (travel_end < travel_start) {
        return res.status(400).json({ ok: false, error: 'La fecha fin no puede ser anterior al inicio' });
      }
      if (dog + cat === 0) {
        return res.status(400).json({ ok: false, error: 'Selecciona al menos Perro o Gato' });
      }
    }

    const pet_types: string[] = [];
    if (dog > 0) pet_types.push('perro');
    if (cat > 0) pet_types.push('gato');

    const { error } = await supabase.from('waitlist').insert([{
      name,
      last_name_paternal,
      last_name_maternal,
      email,
      city,
      role,
      property_type,
      travel_start: role === 'owner' ? travel_start : null,
      travel_end: role === 'owner' ? travel_end : null,
      dog_count: dog,
      cat_count: cat,
      pet_types,
    }]);

    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('join-waitlist error', e);
    return res.status(500).json({ ok: false, error: e.message ?? 'Server error' });
  }
}
