import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decryptField, decryptFieldSafe, encryptField } from '../field-encryption.js';

const CURRENT_KEY = 'test-only-field-encryption-key-with-32-characters';
const ROTATED_KEY = 'another-rotation-target-key-with-32-characters!';

describe('sensitive player field encryption', () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.FIELD_ENCRYPTION_KEY = CURRENT_KEY;
    delete process.env.FIELD_ENCRYPTION_KEY_LEGACY;
  });

  afterEach(() => {
    if (env.FIELD_ENCRYPTION_KEY === undefined) delete process.env.FIELD_ENCRYPTION_KEY;
    else process.env.FIELD_ENCRYPTION_KEY = env.FIELD_ENCRYPTION_KEY;
    if (env.FIELD_ENCRYPTION_KEY_LEGACY === undefined) delete process.env.FIELD_ENCRYPTION_KEY_LEGACY;
    else process.env.FIELD_ENCRYPTION_KEY_LEGACY = env.FIELD_ENCRYPTION_KEY_LEGACY;
  });

  it('stores authenticated ciphertext and decrypts it', () => {
    const encrypted = encryptField('Lusaka confidential value');
    expect(encrypted.toString('utf8')).toMatch(/^enc:v1:/);
    expect(encrypted.toString('utf8')).not.toContain('Lusaka confidential value');
    expect(decryptField(encrypted)).toBe('Lusaka confidential value');
  });

  it('continues to read legacy plaintext buffers', () => {
    expect(decryptField(Buffer.from('legacy value'))).toBe('legacy value');
  });

  it('does not silently accept tampered ciphertext', () => {
    const encrypted = encryptField('protected').toString('utf8');
    expect(() => decryptField(`${encrypted.slice(0, -2)}AA`)).toThrow('could not be decrypted');
  });

  it('reads ciphertext written under a key listed in FIELD_ENCRYPTION_KEY_LEGACY', () => {
    process.env.FIELD_ENCRYPTION_KEY = ROTATED_KEY;
    const writtenBeforeRotation = encryptField('Chanda Banda');

    process.env.FIELD_ENCRYPTION_KEY = CURRENT_KEY;
    process.env.FIELD_ENCRYPTION_KEY_LEGACY = ROTATED_KEY;

    expect(decryptField(writtenBeforeRotation)).toBe('Chanda Banda');
    // Writes always use the current key.
    expect(decryptField(encryptField('Chanda Banda'))).toBe('Chanda Banda');
  });

  it('reads ciphertext written before FIELD_ENCRYPTION_KEY existed', () => {
    delete process.env.FIELD_ENCRYPTION_KEY;
    const writtenWithJwtKey = encryptField('Mwape Katongo');

    process.env.FIELD_ENCRYPTION_KEY = CURRENT_KEY;

    expect(decryptField(writtenWithJwtKey)).toBe('Mwape Katongo');
  });

  it('returns an empty value instead of failing a whole page on one unreadable field', () => {
    process.env.FIELD_ENCRYPTION_KEY = ROTATED_KEY;
    const orphan = encryptField('unknowable');
    process.env.FIELD_ENCRYPTION_KEY = CURRENT_KEY;

    expect(() => decryptField(orphan)).toThrow('could not be decrypted');
    expect(decryptFieldSafe(orphan, 'player 1 first name')).toBe('');
  });
});
