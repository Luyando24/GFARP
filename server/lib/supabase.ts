import { createClient } from '@supabase/supabase-js';

// Supabase configuration for server-side operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with service role key for server operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    // Disable auth since we're using custom authentication
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// Storage bucket names
export const STORAGE_BUCKETS = {
  PLAYER_DOCUMENTS: 'player-documents',
  AVATARS: 'avatars',
  DOCUMENTS: 'documents'
};