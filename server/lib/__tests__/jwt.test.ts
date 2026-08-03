import { afterEach, describe, expect, it } from 'vitest';
import { getJwtSecret } from '../jwt.js';

describe('JWT secret configuration', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it('fails closed when production has no secret', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow('JWT_SECRET is required');
  });

  it('rejects short production secrets', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'too-short';
    expect(() => getJwtSecret()).toThrow('at least 32 characters');
  });
});
