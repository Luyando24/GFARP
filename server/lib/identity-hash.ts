import crypto from 'crypto';

const NON_PRODUCTION_KEY = 'local-development-national-id-key-not-for-production';

// Stored alongside the hash so the algorithm can be rotated later.
export const IDENTITY_HASH_VERSION = 'hmac-sha256:v1';

function getIdentityHashKey(): string {
  const key = process.env.NRC_SALT?.trim();
  if (key) {
    if (process.env.NODE_ENV === 'production' && key.length < 32) {
      throw new Error('NRC_SALT must be at least 32 characters in production');
    }
    return key;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NRC_SALT is required in production');
  }
  return NON_PRODUCTION_KEY;
}

export function hashNationalId(value: string): string {
  const normalized = value.replace(/[\s/-]/g, '').toUpperCase();
  return crypto.createHmac('sha256', getIdentityHashKey()).update(normalized).digest('hex');
}
