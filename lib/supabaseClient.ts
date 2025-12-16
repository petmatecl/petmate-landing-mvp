// pages/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn("WARNING: NEXT_PUBLIC_SUPABASE_URL is missing. Supabase client will fail.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
