import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Public fields projection
const PUBLIC_FIELDS = `
    id, nombre, apellido_p, descripcion, comuna, region,
    foto_perfil, galeria, approved_reviews_avg, total_reviews,
    latitud, longitud, auth_user_id,
    cuida_perros, cuida_gatos,
    servicio_a_domicilio, servicio_en_casa, tarifa_servicio_a_domicilio, tarifa_servicio_en_casa
`.replace(/\s+/g, '');

const calculateDaysBetween = (startStr: string, endStr: string) => {
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    const firstDate = new Date(startStr);
    const secondDate = new Date(endStr);

    // Calculate difference in days, inclusive
    return Math.round(Math.abs((firstDate.getTime() - secondDate.getTime()) / oneDay)) + 1;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { query, from, to } = req.query; // Search text + Date Range

        // 1. Availability Pre-Filter (if dates provided)
        let availableSitterIds: string[] | null = null;

        if (from && to) {
            const fromStr = String(from);
            const toStr = String(to);
            const daysRequired = calculateDaysBetween(fromStr, toStr);

            // Fetch availability for the range
            // We want sitters who have 'daysRequired' distinct entries in this range
            const { data: availabilityData, error: availError } = await supabase
                .from('sitter_availability')
                .select('sitter_id')
                .gte('available_date', fromStr)
                .lte('available_date', toStr);

            if (availError) throw availError;

            if (availabilityData) {
                const counts: Record<string, number> = {};
                availabilityData.forEach((row: any) => {
                    counts[row.sitter_id] = (counts[row.sitter_id] || 0) + 1;
                });

                // Keep only those with full coverage
                availableSitterIds = Object.keys(counts).filter(id => counts[id] >= daysRequired);
            } else {
                availableSitterIds = [];
            }
        }

        // 2. Build Main Query
        let dbQuery = supabase
            .from('registro_petmate')
            .select(PUBLIC_FIELDS)
            .eq('aprobado', true) // STRICT filter
            .eq('roles', '["petmate"]'); // Ensure it is a sitter (simple check)

        // Apply Availability Filter
        if (availableSitterIds !== null) {
            if (availableSitterIds.length === 0) {
                // If filtering by date requested but no one found, return empty early
                return res.status(200).json({ data: [] });
            }
            dbQuery = dbQuery.in('id', availableSitterIds);
        }

        // Apply Text Filters
        if (query && typeof query === 'string' && query.trim().length > 0) {
            const term = `%${query.trim()}%`;
            // Note: Space before term in ILIKE might affect matching depending on tokenizer, 
            // but standard 'ilike.%term%' is better.
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
