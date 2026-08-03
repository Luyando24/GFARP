import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decryptField, encryptField } from '../field-encryption.js';

describe('sensitive player field encryption', () => {
  const previousKey = process.env.FIELD_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.FIELD_ENCRYPTION_KEY = 'test-only-field-encryption-key-with-32-characters';
  });

  afterEach(() => {
    if (previousKey === undefined) delete process.env.FIELD_ENCRYPTION_KEY;
    else process.env.FIELD_ENCRYPTION_KEY = previousKey;
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
});
