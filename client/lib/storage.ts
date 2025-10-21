import { supabase, STORAGE_BUCKETS, ensureBucketExists, getPublicUrl } from './supabase'

export interface UploadOptions {
  bucket: string
  path: string
  file: File
  upsert?: boolean
}

export interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

/**
 * Upload a file to Supabase Storage
 */
export const uploadFile = async ({
  bucket,
  path,
  file,
  upsert = true
}: UploadOptions): Promise<UploadResult> => {
  try {
    // Ensure bucket exists
    await ensureBucketExists(bucket)

    // Upload file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert,
        contentType: file.type
      })

    if (error) {
      console.error('Upload error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    // Get public URL
    const publicUrl = getPublicUrl(bucket, data.path)

    return {
      success: true,
      url: publicUrl,
      path: data.path
    }
  } catch (error) {
    console.error('Upload failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Upload avatar image
 */
export const uploadAvatar = async (file: File, userId: string): Promise<UploadResult> => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}.${fileExt}`
  const filePath = `avatars/${fileName}`

  return uploadFile({
    bucket: STORAGE_BUCKETS.AVATARS,
    path: filePath,
    file
  })
}

/**
 * Upload player photo
 */
export const uploadPlayerPhoto = async (file: File, playerId: string): Promise<UploadResult> => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${playerId}_${Date.now()}.${fileExt}`
  const filePath = `players/${fileName}`

  return uploadFile({
    bucket: STORAGE_BUCKETS.PLAYER_PHOTOS,
    path: filePath,
    file
  })
}

/**
 * Upload academy media (logos, banners, etc.)
 */
export const uploadAcademyMedia = async (
  file: File, 
  academyId: string, 
  mediaType: 'logo' | 'banner' | 'gallery'
): Promise<UploadResult> => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${academyId}_${mediaType}_${Date.now()}.${fileExt}`
  const filePath = `academies/${academyId}/${mediaType}/${fileName}`

  return uploadFile({
    bucket: STORAGE_BUCKETS.ACADEMY_MEDIA,
    path: filePath,
    file
  })
}

/**
 * Upload document (PDF, etc.)
 */
export const uploadDocument = async (
  file: File, 
  category: string, 
  userId?: string
): Promise<UploadResult> => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${category}_${userId || 'system'}_${Date.now()}.${fileExt}`
  const filePath = `documents/${category}/${fileName}`

  return uploadFile({
    bucket: STORAGE_BUCKETS.DOCUMENTS,
    path: filePath,
    file
  })
}

/**
 * Delete a file from storage
 */
export const deleteFile = async (bucket: string, path: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete failed:', error)
    return false
  }
}

/**
 * List files in a bucket/folder
 */
export const listFiles = async (bucket: string, folder?: string) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit: 100,
        offset: 0
      })

    if (error) {
      console.error('List files error:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('List files failed:', error)
    return []
  }
}

/**
 * Get download URL for a private file
 */
export const getDownloadUrl = async (bucket: string, path: string, expiresIn = 3600) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error) {
      console.error('Get download URL error:', error)
      return null
    }

    return data.signedUrl
  } catch (error) {
    console.error('Get download URL failed:', error)
    return null
  }
}

/**
 * Validate file type and size
 */
export const validateFile = (
  file: File,
  allowedTypes: string[] = ['image/*', 'application/pdf'],
  maxSizeMB: number = 10
): { valid: boolean; error?: string } => {
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB`
    }
  }

  // Check file type
  const isValidType = allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      const baseType = type.replace('/*', '')
      return file.type.startsWith(baseType)
    }
    return file.type === type
  })

  if (!isValidType) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
    }
  }

  return { valid: true }
}