/**
 * Helper to route Supabase Storage URLs through the local proxy.
 * This bypasses client-side network blocks (AdBlock/Firewalls) that block *.supabase.co
 */
export const getProxyImageUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    if (typeof window === 'undefined') return url; // Server-side usage: keep original

    // Check if it's a Supabase URL
    if (url.includes('supabase.co')) {
        // Replace the origin with the local proxy prefix
        // e.g. https://xyz.supabase.co/storage/... -> /supabase-proxy/storage/...
        // The rewrite rule in next.config.js handles the upstream.
        return url.replace(/https:\/\/.*\.supabase\.co/, '/supabase-proxy');
    }

    return url;
};
