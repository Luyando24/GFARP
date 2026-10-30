import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createServer } from '../../index.js';
import { emailService } from '../../lib/email-service.js';

const PRODUCTION_SECRETS: Record<string, string> = {
  JWT_SECRET: 'test-only-jwt-secret-with-at-least-32-characters',
  NRC_SALT: 'test-only-nrc-salt-with-at-least-32-characters',
  FIELD_ENCRYPTION_KEY: 'test-only-field-key-with-at-least-32-characters',
  CRON_SECRET: 'test-only-cron-secret-with-at-least-32-characters',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
};

function enterProductionMode() {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSecrets: Record<string, string | undefined> = {};
  process.env.NODE_ENV = 'production';
  for (const [key, value] of Object.entries(PRODUCTION_SECRETS)) {
    previousSecrets[key] = process.env[key];
    process.env[key] = value;
  }

  return () => {
    process.env.NODE_ENV = previousNodeEnv;
    for (const [key, value] of Object.entries(previousSecrets)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

describe('server startup protections', () => {
  it('allows a production request whose Origin matches the request host', async () => {
    const restoreEnv = enterProductionMode();
    const initializeSpy = vi
      .spyOn(emailService, 'initializeFromDatabase')
      .mockResolvedValue(undefined);

    try {
      const response = await request(createServer())
        .get('/ping')
        .set('Host', 'app.example.com')
        .set('Origin', 'https://app.example.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com');
    } finally {
      initializeSpy.mockRestore();
      restoreEnv();
    }
  });

  it('allows an origin explicitly listed in CORS_ORIGINS', async () => {
    const restoreEnv = enterProductionMode();
    const previousCorsOrigins = process.env.CORS_ORIGINS;
    process.env.CORS_ORIGINS = 'https://app.example.com, https://admin.example.com';
    const initializeSpy = vi
      .spyOn(emailService, 'initializeFromDatabase')
      .mockResolvedValue(undefined);

    try {
      const response = await request(createServer())
        .get('/ping')
        .set('Host', 'api.example.com')
        .set('Origin', 'https://admin.example.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(
        'https://admin.example.com',
      );
    } finally {
      initializeSpy.mockRestore();
      if (previousCorsOrigins === undefined) delete process.env.CORS_ORIGINS;
      else process.env.CORS_ORIGINS = previousCorsOrigins;
      restoreEnv();
    }
  });

  it('does not auto-allow localhost origins in production', async () => {
    const restoreEnv = enterProductionMode();
    const initializeSpy = vi
      .spyOn(emailService, 'initializeFromDatabase')
      .mockResolvedValue(undefined);

    try {
      const response = await request(createServer())
        .get('/ping')
        .set('Host', 'app.example.com')
        .set('Origin', 'http://localhost:5173');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      initializeSpy.mockRestore();
      restoreEnv();
    }
  });

  it('does not turn a disallowed cross-origin request into HTTP 500', async () => {
    const restoreEnv = enterProductionMode();
    const initializeSpy = vi
      .spyOn(emailService, 'initializeFromDatabase')
      .mockResolvedValue(undefined);

    try {
      const response = await request(createServer())
        .get('/ping')
        .set('Host', 'app.example.com')
        .set('Origin', 'https://untrusted.example.net');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      initializeSpy.mockRestore();
      restoreEnv();
    }
  });

  it('returns a JSON 404 for unknown API routes', async () => {
    const response = await request(createServer()).get('/api/route-that-does-not-exist');

    expect(response.status).toBe(404);
    expect(response.type).toMatch(/json/);
    expect(response.body).toEqual({ success: false, error: 'Not found' });
  });

  it('starts in production without required secrets and reports them instead of crashing', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const required = Object.keys(PRODUCTION_SECRETS);
    const previousSecrets = required.map((key) => [key, process.env[key]] as const);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const initializeSpy = vi
      .spyOn(emailService, 'initializeFromDatabase')
      .mockResolvedValue(undefined);
    process.env.NODE_ENV = 'production';
    for (const key of required) delete process.env[key];

    try {
      // A throw here becomes FUNCTION_INVOCATION_FAILED on serverless hosts, so
      // boot must succeed and the failure must be visible as HTTP 503 instead.
      expect(() => createServer()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing production configuration: JWT_SECRET'),
      );
    } finally {
      initializeSpy.mockRestore();
      consoleSpy.mockRestore();
      process.env.NODE_ENV = previousNodeEnv;
      for (const [key, value] of previousSecrets) {
        if (value !== undefined) process.env[key] = value;
      }
    }
  });
});
