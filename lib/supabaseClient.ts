// pages/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn("WARNING: NEXT_PUBLIC_SUPABASE_URL is missing. Supabase client will fail.");
}

// Proxy Logic: Keep original URL on server, use absolute proxy URL on client to bypass AdBlock
const isBrowser = typeof window !== 'undefined';
let clientUrl = supabaseUrl;

if (isBrowser) {
    // supabase-js requires an absolute URL. We construct it from the current location.
    // This allows it to work on localhost, vercel, or custom domain dynamically.
    const origin = window.location.origin;
    clientUrl = `${origin}/supabase-proxy`;
}

export const supabase = createClient(clientUrl, supabaseAnonKey);
