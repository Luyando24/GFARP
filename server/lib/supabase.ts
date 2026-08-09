import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Ensure environment variables are loaded from the root .env files
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

// Supabase configuration for server-side operations
// Lazy initialization to prevent crashes if env vars are missing at startup
let supabaseInstance: SupabaseClient | null = null;

function cleanSupabaseUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;

  let cleaned = rawUrl
    .replace(/^["']|["']$/g, '')
    .replace(/[\r\n\t]/g, '')
    .trim()
    .replace(/\/+$/, '');

  if (!cleaned) return null;

  if (cleaned.startsWith('postgres://') || cleaned.startsWith('postgresql://') || cleaned.includes('pooler.supabase.com')) {
    const match = cleaned.match(/postgres\.([a-z0-9]+)@/i);
    if (match && match[1]) {
      return `https://${match[1]}.supabase.co`;
    }
    return null;
  }

  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }

  try {
    const parsed = new URL(cleaned);
    let hostname = parsed.hostname;

    if (hostname.includes('pooler.supabase.com') || hostname.startsWith('db.')) {
      return null;
    }

    let port = parsed.port;
    if (port === '443' || port === '80' || (hostname.endsWith('.supabase.co') && port)) {
      port = '';
    }

    const origin = `${parsed.protocol}//${hostname}${port ? ':' + port : ''}`;
    return origin;
  } catch {
    return null;
  }
}

export const getSupabase = () => {
  if (!supabaseInstance) {
    const candidates = [
      process.env.SUPABASE_URL,
      process.env.VITE_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.REACT_APP_SUPABASE_URL,
    ];

    let supabaseUrl: string | null = null;
    for (const cand of candidates) {
      if (cand) {
        supabaseUrl = cleanSupabaseUrl(cand);
        if (supabaseUrl) break;
      }
    }

    if (!supabaseUrl && process.env.DATABASE_URL) {
      const match = process.env.DATABASE_URL.match(/postgres\.([a-z0-9]+)@/i);
      if (match && match[1]) {
        supabaseUrl = `https://${match[1]}.supabase.co`;
      }
    }

    const rawKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.REACT_APP_SUPABASE_ANON_KEY ||
      '';

    const supabaseServiceKey = rawKey
      .replace(/^["']|["']$/g, '')
      .replace(/[\r\n\t]/g, '')
      .trim();

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables:', { 
        url: supabaseUrl, 
        hasKey: !!supabaseServiceKey 
      });
      throw new Error('Server requires a valid Supabase API URL and Key.');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
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
