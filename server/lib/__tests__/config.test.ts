import { afterEach, describe, expect, it } from 'vitest';
import { isConfigurationError, missingProductionConfig } from '../config.js';

describe('production configuration', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const CONFIG_KEYS = [
    'JWT_SECRET',
    'NRC_SALT',
    'FIELD_ENCRYPTION_KEY',
    'DATABASE_URL',
    'SUPABASE_DB_URL',
    'SUPABASE_DB_POOL_URL',
    'SUPABASE_POOLED_DATABASE_URL',
    'SUPABASE_PGBOUNCER_URL',
    'SUPABASE_DATABASE_URL',
    'POSTGRES_URL',
    'POSTGRES_PRISMA_URL',
    'PG_CONNECTION_STRING',
  ];
  const previousEnv = Object.fromEntries(
    CONFIG_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<string, string | undefined>;

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('reports every missing secret in production', () => {
    process.env.NODE_ENV = 'production';
    for (const key of Object.keys(previousEnv)) delete process.env[key];

    expect(missingProductionConfig()).toEqual([
      'JWT_SECRET',
      'NRC_SALT',
      'FIELD_ENCRYPTION_KEY',
      'DATABASE_URL',
    ]);
  });

  it('does not require secrets outside production', () => {
    process.env.NODE_ENV = 'development';
    for (const key of Object.keys(previousEnv)) delete process.env[key];

    expect(missingProductionConfig()).toEqual([]);
  });

  it('recognises configuration failures thrown at request time', () => {
    expect(isConfigurationError(new Error('JWT_SECRET is required in production'))).toBe(true);
    expect(isConfigurationError(new Error('FIELD_ENCRYPTION_KEY is required in production'))).toBe(true);
    expect(isConfigurationError(new Error('Database unavailable: set DATABASE_URL'))).toBe(true);
    expect(isConfigurationError(new Error('Invalid credentials'))).toBe(false);
  });
});
