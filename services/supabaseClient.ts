import { createClient } from '@supabase/supabase-js';

// Default Configuration (Provided by User)
const DEFAULT_URL = 'https://cwkaqyxbughjtkbukliq.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3a2FxeXhidWdoanRrYnVrbGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MDQwMzQsImV4cCI6MjA4MDQ4MDAzNH0.pcO7hab0YR8JQGypRcwv5ftNzOclVCaUzyiMrm2Qhb4';

// Check environment variables first (Build time / Server env)
const envUrl = process.env.SUPABASE_URL;
const envKey = process.env.SUPABASE_KEY;

// Check local storage second (User entered via UI)
const localUrl = typeof window !== 'undefined' ? localStorage.getItem('sb_project_url') : null;
const localKey = typeof window !== 'undefined' ? localStorage.getItem('sb_anon_key') : null;

// Determine final configuration (Priority: Local Storage > Env Var > Hardcoded Default)
// We prioritize Local Storage so the user can override the hardcoded default via the UI if needed.
const supabaseUrl = localUrl || envUrl || DEFAULT_URL;
const supabaseKey = localKey || envKey || DEFAULT_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;

/**
 * Helper to save keys from the UI
 */
export const saveConnectionConfig = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sb_project_url', url);
    localStorage.setItem('sb_anon_key', key);
    window.location.reload(); // Reload to re-initialize the client
  }
};

/**
 * Helper to clear keys
 */
export const clearConnectionConfig = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sb_project_url');
    localStorage.removeItem('sb_anon_key');
    window.location.reload();
  }
};

/**
 * Helper to get current config for UI display
 */
export const getCurrentConfig = () => {
  return {
    url: supabaseUrl,
    key: supabaseKey
  };
};