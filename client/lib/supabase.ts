import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

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
  PLAYER_PHOTOS: 'player-photos'
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