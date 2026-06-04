import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

let sessionKey: Buffer | null = null;

/**
 * Get or generate encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    if (!sessionKey) {
      console.warn('ENCRYPTION_KEY environment variable not set. Using a fallback key for development.');
      sessionKey = crypto.createHash('sha256').update('sofwan_default_fallback_encryption_key_2024').digest();
    }
    return sessionKey;
  }
  
  // Convert hex string to buffer, or hash if it's not the right length
  if (key.length === 64 && /^[0-9a-fA-F]{64}$/.test(key)) {
    return Buffer.from(key, 'hex');
  }
  
  // Hash the key to get a consistent 32-byte key
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt a plaintext string
 * @param text - The plaintext to encrypt
 * @returns The encrypted string in format: salt(64) + iv(16) + tag(16) + encrypted
 */
export function encryptPassword(text: string): string {
  if (!text) return '';
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Combine: salt + iv + tag + encrypted
  const combined = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]);
  
  return combined.toString('base64');
}

/**
 * Decrypt an encrypted string
 * @param encrypted - The encrypted string in base64 format
 * @returns The decrypted plaintext
 */
export function decryptPassword(encrypted: string): string {
  if (!encrypted) return '';
  
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encrypted, 'base64');
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, TAG_POSITION);
    const tag = combined.subarray(TAG_POSITION, ENCRYPTED_POSITION);
    const encryptedText = combined.subarray(ENCRYPTED_POSITION);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Error decrypting password:', error);
    return '';
  }
}

/**
 * Check if a string appears to be encrypted
 * @param text - The string to check
 * @returns True if the string appears to be encrypted
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false;
  try {
    const decoded = Buffer.from(text, 'base64');
    // Check if it's long enough to contain salt + iv + tag + some data
    return decoded.length >= ENCRYPTED_POSITION;
  } catch {
    return false;
  }
}
