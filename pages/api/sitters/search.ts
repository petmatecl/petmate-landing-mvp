import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Public fields projection
const PUBLIC_FIELDS = `
    id, nombre, apellido_p, descripcion, comuna, region, price,
    foto_perfil, galeria, approved_reviews_avg, total_reviews,
    latitud, longitud, auth_user_id,
    cuida_perros, cuida_gatos,
    servicio_a_domicilio, servicio_en_casa, tarifa_servicio_a_domicilio
`.replace(/\s+/g, '');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { query } = req.query; // Search text

        // Build generic query
        // Note: For full text search we might still need RPC or TextSearch, 
        // but for MVP 'ilike' on name/comuna is often sufficient or we can use the table's capabilities.
        // User requested FIXING search_sitters specifically regarding return fields.

        // Let's implement a basic robust search using the table directly to guarantee field selection.
        let dbQuery = supabase
            .from('registro_petmate')
            .select(PUBLIC_FIELDS)
            .eq('aprobado', true) // STRICT filter
            .eq('roles', '["petmate"]'); // Ensure it is a sitter (simple check)

        // Apply filters if passed (extending basic text search)
        // If we want to replicate the RPC logic exactly:
        if (query && typeof query === 'string' && query.trim().length > 0) {
            // Simple OR search on common fields
            const term = `%${query.trim()}%`;
            dbQuery = dbQuery.or(`nombre.ilike.${term},apellido_p.ilike.${term},comuna.ilike.${term},region.ilike.${term}`);
        }

        const { data, error } = await dbQuery;

        if (error) throw error;

        return res.status(200).json({ data });
    } catch (error: any) {
        console.error('Search API Error:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
