import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration for server-side operations
// Lazy initialization to prevent crashes if env vars are missing at startup
let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables. Please check your .env file.');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        // Disable auth since we're using custom authentication
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }
  return supabaseInstance;
};

// Export a proxy object that lazily calls getSupabase() for backward compatibility
// This allows existing imports of 'supabase' to work without changes, 
// but the client is only created when a property is accessed.
export const supabase = new Proxy({} as SupabaseClient, {
  get: (_target, prop) => {
    const client = getSupabase();
    return (client as any)[prop];
  }
});

// Storage bucket names
export const STORAGE_BUCKETS = {
  PLAYER_DOCUMENTS: 'player-documents',
  AVATARS: 'avatars',
  DOCUMENTS: 'documents'
};