import { createClient } from '@supabase/supabase-js';

// In a real Next.js app, these would be process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl!, supabaseKey!) 
  : null;