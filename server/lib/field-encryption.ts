import crypto from 'crypto';
import { getJwtSecret } from './jwt.js';

const PREFIX = 'enc:v1';

function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

function legacySecrets(): string[] {
  return (process.env.FIELD_ENCRYPTION_KEY_LEGACY ?? '')
    .split(',')
    .map((secret) => secret.trim())
    .filter(Boolean);
}

// Writes use the first key. Reads try every key this deployment may have used
// in the past (FIELD_ENCRYPTION_KEY rotations listed in
// FIELD_ENCRYPTION_KEY_LEGACY, and the JWT-secret-derived key that was used
// before FIELD_ENCRYPTION_KEY existed) so stored ciphertext survives a rotation
// instead of becoming permanently unreadable.
function candidateKeys(): Buffer[] {
  const configured = process.env.FIELD_ENCRYPTION_KEY?.trim();
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('FIELD_ENCRYPTION_KEY is required in production');
  }

  const keys: Buffer[] = [];
  const seen = new Set<string>();
  for (const secret of [configured, ...legacySecrets(), getJwtSecret()]) {
    if (!secret || seen.has(secret)) continue;
    seen.add(secret);
    keys.push(deriveKey(secret));
  }
  return keys;
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
  const cipher = crypto.createCipheriv('aes-256-gcm', candidateKeys()[0], iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.from(`${PREFIX}:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`, 'utf8');
}

function openEnvelope(key: Buffer, stored: string): string | null {
  const [, , ivValue, tagValue, ciphertext] = stored.split(':');
  if (!ivValue || !tagValue || !ciphertext) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

export function decryptField(value: unknown): string {
  const stored = toStoredString(value);
  if (!stored.startsWith(`${PREFIX}:`)) return stored;
  for (const key of candidateKeys()) {
    const decrypted = openEnvelope(key, stored);
    if (decrypted !== null) return decrypted;
  }
  throw new Error('Encrypted field could not be decrypted');
}

// A single row written under a foreign key must not fail a request that returns
// hundreds of rows, so list/read paths use this and get an empty value back.
export function decryptFieldSafe(value: unknown, label = 'encrypted field'): string {
  try {
    return decryptField(value);
  } catch {
    console.warn(`Undecryptable ${label}: written with an encryption key this deployment no longer has`);
    return '';
  }
}
