import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createServer } from '../../index.js';
import { emailService } from '../../lib/email-service.js';

describe('server startup protections', () => {
  it('allows a production request whose Origin matches the request host', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
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
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it('does not turn a disallowed cross-origin request into HTTP 500', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
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
      process.env.NODE_ENV = previousNodeEnv;
    }
  });
});
