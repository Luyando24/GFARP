import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';

vi.mock('../../lib/db.js', () => ({
  query: vi.fn(),
}));

import { query } from '../../lib/db.js';
import { clearMaintenanceCache, enforceMaintenanceMode } from '../maintenance.js';
import { getJwtSecret } from '../../lib/jwt.js';

function makeRes() {
  const res: any = { statusCode: 200, body: undefined };
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((body: unknown) => {
    res.body = body;
    return res;
  });
  return res;
}

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    path: '/api/players',
    header: vi.fn(() => undefined),
    ...overrides,
  } as any;
}

describe('enforceMaintenanceMode', () => {
  const previousNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    clearMaintenanceCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
    clearMaintenanceCache();
  });

  it('passes traffic through when maintenance is disabled', async () => {
    (query as any).mockResolvedValueOnce({ rows: [{ value: 'false' }] });
    const next = vi.fn();
    const res = makeRes();

    await enforceMaintenanceMode(makeReq(), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 503 for anonymous callers while maintenance is on', async () => {
    (query as any).mockResolvedValueOnce({ rows: [{ value: 'true' }] });
    const next = vi.fn();
    const res = makeRes();

    await enforceMaintenanceMode(makeReq(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual(
      expect.objectContaining({ success: false, code: 'MAINTENANCE_MODE' }),
    );
  });

  it('lets an admin token through during maintenance', async () => {
    (query as any).mockResolvedValueOnce({ rows: [{ value: 'true' }] });
    const token = jwt.sign({ id: 'admin-1', role: 'admin' }, getJwtSecret(), {
      expiresIn: '1h',
    });
    const next = vi.fn();
    const res = makeRes();

    await enforceMaintenanceMode(
      makeReq({ header: vi.fn(() => `Bearer ${token}`) }),
      res,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('does not let a non-admin token through during maintenance', async () => {
    (query as any).mockResolvedValueOnce({ rows: [{ value: 'true' }] });
    const token = jwt.sign({ id: 'academy-1', role: 'academy' }, getJwtSecret(), {
      expiresIn: '1h',
    });
    const next = vi.fn();
    const res = makeRes();

    await enforceMaintenanceMode(
      makeReq({ header: vi.fn(() => `Bearer ${token}`) }),
      res,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
  });

  it('exempts allow-listed paths so admins can sign in and turn it off', async () => {
    const next = vi.fn();
    const res = makeRes();

    await enforceMaintenanceMode(makeReq({ path: '/auth/login' }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(query).not.toHaveBeenCalled();
  });

  it('caches the setting instead of reading the database on every request', async () => {
    (query as any).mockResolvedValueOnce({ rows: [{ value: 'false' }] });

    const res = makeRes();
    await enforceMaintenanceMode(makeReq(), res, vi.fn());
    await enforceMaintenanceMode(makeReq(), res, vi.fn());

    expect(query).toHaveBeenCalledTimes(1);
  });

  it('fails open when the settings table cannot be read', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    (query as any).mockRejectedValueOnce(new Error('connection refused'));
    const next = vi.fn();
    const res = makeRes();

    await enforceMaintenanceMode(makeReq(), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
