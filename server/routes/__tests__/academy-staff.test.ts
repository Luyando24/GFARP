import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/db.js', () => ({
  query: vi.fn(),
  hashPassword: vi.fn(),
}));

vi.mock('../../lib/auth-tokens.js', () => ({
  revokeAccountSessions: vi.fn(),
}));

import { query, hashPassword } from '../../lib/db.js';
import { revokeAccountSessions } from '../../lib/auth-tokens.js';
import academyStaffRouter from '../academy-staff.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = { id: 'academy-1', role: 'academy', email: 'owner@academy.com' };
    next();
  });
  app.use('/api/academy-staff', academyStaffRouter);
  return app;
}

const staffRow = {
  id: 'staff-1',
  email: 'coach@academy.com',
  first_name: 'Ada',
  last_name: 'Obi',
  role: 'academy_admin',
  permissions: ['players', 'training'],
  is_active: true,
  last_login: null,
  created_at: null,
};

describe('academy staff management routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    (query as any).mockReset();
    (hashPassword as any).mockReset().mockResolvedValue('hashed-password');
    app = buildApp();
  });

  it('lists staff scoped to the signed-in owner', async () => {
    (query as any).mockResolvedValueOnce({ rows: [staffRow] });

    const response = await request(app).get('/api/academy-staff');

    expect(response.status).toBe(200);
    expect(response.body.data.staff).toEqual([
      {
        id: 'staff-1',
        email: 'coach@academy.com',
        firstName: 'Ada',
        lastName: 'Obi',
        role: 'academy_admin',
        permissions: ['players', 'training'],
        isActive: true,
        lastLogin: null,
        createdAt: null,
      },
    ]);
    expect((query as any).mock.calls[0][1]).toEqual(['academy-1']);
  });

  it('creates a team member with normalized permissions', async () => {
    (query as any)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [staffRow] });

    const response = await request(app).post('/api/academy-staff').send({
      firstName: 'Ada',
      lastName: 'Obi',
      email: 'Coach@Academy.com',
      password: 'password123',
      role: 'academy_admin',
      permissions: ['training', 'players'],
    });

    expect(response.status).toBe(201);
    expect(hashPassword).toHaveBeenCalledWith('password123');
    const insertValues = (query as any).mock.calls[1][1];
    expect(insertValues[1]).toBe('academy-1');
    expect(insertValues[2]).toBe('coach@academy.com');
    expect(insertValues[4]).toBe('academy_admin');
    expect(insertValues[7]).toEqual(['players', 'training']);
    expect(response.body.data.staff.permissions).toEqual(['players', 'training']);
  });

  it('rejects unknown permissions', async () => {
    const response = await request(app).post('/api/academy-staff').send({
      firstName: 'Ada',
      lastName: 'Obi',
      email: 'coach@academy.com',
      password: 'password123',
      role: 'academy_admin',
      permissions: ['players', 'payroll'],
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('not recognised');
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects short passwords', async () => {
    const response = await request(app).post('/api/academy-staff').send({
      firstName: 'Ada',
      lastName: 'Obi',
      email: 'coach@academy.com',
      password: 'short',
      role: 'academy_admin',
      permissions: ['players'],
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('at least 8 characters');
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects emails already used by another account', async () => {
    (query as any).mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const response = await request(app).post('/api/academy-staff').send({
      firstName: 'Ada',
      lastName: 'Obi',
      email: 'coach@academy.com',
      password: 'password123',
      role: 'academy_admin',
      permissions: ['players'],
    });

    expect(response.status).toBe(409);
    expect(response.body.message).toContain('already exists');
    expect(hashPassword).not.toHaveBeenCalled();
  });

  it('updates access and revokes existing sessions', async () => {
    (query as any)
      .mockResolvedValueOnce({
        rows: [{ id: 'staff-1', role: 'staff', permissions: ['players'], is_active: true }],
      })
      .mockResolvedValueOnce({
        rows: [{ ...staffRow, role: 'coach', permissions: ['finances'] }],
      });

    const response = await request(app)
      .put('/api/academy-staff/staff-1')
      .send({ role: 'coach', permissions: ['finances'] });

    expect(response.status).toBe(200);
    expect(response.body.data.reauthRequired).toBe(true);
    expect(response.body.data.staff.permissions).toEqual(['finances']);
    expect(revokeAccountSessions).toHaveBeenCalledWith('staff', 'staff-1');
  });

  it('does not revoke sessions when only a name changes', async () => {
    (query as any)
      .mockResolvedValueOnce({
        rows: [{ id: 'staff-1', role: 'staff', permissions: ['players'], is_active: true }],
      })
      .mockResolvedValueOnce({ rows: [staffRow] });

    const response = await request(app)
      .put('/api/academy-staff/staff-1')
      .send({ firstName: 'Adaeze' });

    expect(response.status).toBe(200);
    expect(response.body.data.reauthRequired).toBe(false);
    expect(revokeAccountSessions).not.toHaveBeenCalled();
  });

  it('refuses to edit a team member from another academy', async () => {
    (query as any).mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .put('/api/academy-staff/other-staff')
      .send({ permissions: ['finances'] });

    expect(response.status).toBe(404);
    expect(revokeAccountSessions).not.toHaveBeenCalled();
  });

  it('explains that linked accounts should be deactivated instead of deleted', async () => {
    (query as any).mockRejectedValueOnce({ code: '23503' });

    const response = await request(app).delete('/api/academy-staff/staff-1');

    expect(response.status).toBe(409);
    expect(response.body.message).toContain('Deactivate it instead');
  });
});
