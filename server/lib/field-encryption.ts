import crypto from 'crypto';
import { getJwtSecret } from './jwt.js';

const PREFIX = 'enc:v1';

function encryptionKey(): Buffer {
  const configured = process.env.FIELD_ENCRYPTION_KEY?.trim();
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('FIELD_ENCRYPTION_KEY is required in production');
  }
  return crypto.createHash('sha256').update(configured || getJwtSecret()).digest();
}

function toStoredString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string' && value.startsWith('\\x')) {
    return Buffer.from(value.slice(2), 'hex').toString('utf8');
  }
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  if (value instanceof Uint8Array) return Buffer.from(value).toString('utf8');
  return String(value);
}

export function encryptField(value: string): Buffer {
  if (!value) return Buffer.from('');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.from(`${PREFIX}:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`, 'utf8');
}

export function decryptField(value: unknown): string {
  const stored = toStoredString(value);
  if (!stored.startsWith(`${PREFIX}:`)) return stored;
  try {
    const [, , ivValue, tagValue, ciphertext] = stored.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    throw new Error('Encrypted field could not be decrypted');
  }
}
