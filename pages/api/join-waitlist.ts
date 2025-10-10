import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE!;
const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

// Comunas piloto (sector oriente, sin Peñalolén)
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
      visible_role,     // 'necesita' | 'quiere'
      property_type,    // 'casa' | 'departamento'
      travel_start,     // 'YYYY-MM-DD'
      travel_end,       // 'YYYY-MM-DD'
      dog_count,
      cat_count,
    } = (req.body ?? {}) as Record<string, any>;

    // Validaciones mínimas
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

    // Rango de fechas válido solo si necesita
    let startISO: string | null = null;
    let endISO: string | null = null;
    if (role === 'owner') {
      if (!travel_start || !travel_end) {
        return res.status(400).json({ ok: false, error: 'Debe indicar fecha de inicio y fin del viaje' });
      }
      startISO = new Date(travel_start).toISOString().slice(0,10);
      endISO = new Date(travel_end).toISOString().slice(0,10);
      if (endISO < startISO) {
        return res.status(400).json({ ok: false, error: 'La fecha fin no puede ser anterior al inicio' });
      }
    }

    // Compatibilidad: pet_types como array
    const pet_types: string[] = [];
    if (dog > 0) pet_types.push('perro');
    if (cat > 0) pet_types.push('gato');

    const { error } = await supabase.from('waitlist').insert([{
      name,
      last_name_paternal,
      last_name_maternal,
      email,
      city,                    // comuna
      role,                    // owner | sitter
      property_type,           // casa | departamento
      travel_start: startISO,  // date
      travel_end: endISO,      // date
      dog_count: dog,
      cat_count: cat,
      pet_types,               // compat
    }]);

    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('join-waitlist error', e);
    return res.status(500).json({ ok: false, error: e.message ?? 'Server error' });
  }
}
