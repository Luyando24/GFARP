import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/db.js', () => ({
  query: vi.fn(),
}));

import { requirePermission } from '../auth.js';

function buildApp(user?: Record<string, unknown>) {
  const app = express();
  if (user) {
    app.use((req: any, _res, next) => {
      req.user = user;
      next();
    });
  }
  app.get('/finances', requirePermission('finances'), (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe('requirePermission', () => {
  it('lets academy owners through every module', async () => {
    const response = await request(buildApp({ id: 'academy-1', role: 'academy' })).get('/finances');
    expect(response.status).toBe(200);
  });

  it('blocks staff accounts without the module permission', async () => {
    const response = await request(
      buildApp({ id: 'staff-1', role: 'staff', permissions: ['players', 'training'] }),
    ).get('/finances');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('PERMISSION_DENIED');
  });

  it('allows staff accounts with the module permission', async () => {
    const response = await request(
      buildApp({ id: 'staff-1', role: 'staff', permissions: ['finances'] }),
    ).get('/finances');

    expect(response.status).toBe(200);
  });

  it('rejects unauthenticated requests', async () => {
    const response = await request(buildApp()).get('/finances');
    expect(response.status).toBe(401);
  });
});
