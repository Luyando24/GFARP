import { createClient } from '@supabase/supabase-js'

// Default fallback Supabase configuration for production client bundle
const DEFAULT_SUPABASE_URL = 'https://lpsujzvospfaomgkrcew.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwc3VqenZvc3BmYW9tZ2tyY2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzEwMTQsImV4cCI6MjA3NjYwNzAxNH0.5Q210arv1Xd0ab87OM5VYklq1yoML6CpmIuzEQRjRdE';

// Supabase configuration
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  (typeof process !== 'undefined' && process.env ? process.env.REACT_APP_SUPABASE_URL : undefined) ||
  DEFAULT_SUPABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' && process.env ? process.env.REACT_APP_SUPABASE_ANON_KEY : undefined) ||
  DEFAULT_SUPABASE_ANON_KEY;

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable auth since we're using custom authentication
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  realtime: {
    // Enable real-time features
    params: {
      eventsPerSecond: 10
    }
  }
})

// Storage bucket names (you can customize these)
export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  DOCUMENTS: 'documents',
  ACADEMY_MEDIA: 'academy-media',
  PLAYER_PHOTOS: 'player-photos',
  PLAYER_IMAGES: 'player-images'
} as const

// Helper function to get public URL for uploaded files
export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Helper function to check if storage bucket exists
export const ensureBucketExists = async (bucketName: string) => {
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some(bucket => bucket.name === bucketName)
  
  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['image/*', 'application/pdf', 'text/*']
    })
    
    if (error) {
      console.error(`Failed to create bucket ${bucketName}:`, error)
      throw error
    }
  }
}

export default supabase