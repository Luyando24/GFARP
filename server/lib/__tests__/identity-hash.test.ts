import { afterEach, describe, expect, it } from 'vitest';
import { hashNationalId } from '../identity-hash.js';

describe('national ID hashing', () => {
  const previousSalt = process.env.NRC_SALT;
  const previousNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
    if (previousSalt === undefined) delete process.env.NRC_SALT;
    else process.env.NRC_SALT = previousSalt;
  });

  it('is deterministic after normalizing common separators', () => {
    process.env.NRC_SALT = 'test-national-id-key-that-is-long-enough';
    expect(hashNationalId('123456/78/9')).toBe(hashNationalId('123456-78-9'));
  });

  it('does not encode the original identifier reversibly', () => {
    process.env.NRC_SALT = 'test-national-id-key-that-is-long-enough';
    const result = hashNationalId('123456/78/9');
    expect(result).toMatch(/^[a-f0-9]{64}$/);
    expect(result).not.toContain('123456');
  });

  it('requires a strong production key', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NRC_SALT;
    expect(() => hashNationalId('123456/78/9')).toThrow('NRC_SALT is required');
  });
});
