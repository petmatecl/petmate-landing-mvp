
import type { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    // Security check: Only allow Supabase URLs
    if (!url.includes('supabase.co')) {
        return res.status(400).json({ error: 'Invalid URL domain' });
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            return res.status(response.status).send(response.statusText);
        }

        // Forward content-type
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        // Cache control (optional but good for images)
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

        // Pipe the response body to the client
        if (response.body) {
            response.body.pipe(res);
        } else {
            res.end();
        }

    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const config = {
    api: {
        responseLimit: false, // Enable streaming larger files if needed
    },
};
