import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../../lib/db.js', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, query: mocks.query, transaction: mocks.transaction };
});

vi.mock('../../lib/email-service.js', () => ({
  emailService: {
    initializeFromDatabase: vi.fn().mockResolvedValue(undefined),
    sendEmail: vi.fn(),
    sendAdminNotificationEmail: vi.fn(),
  },
}));

import { createServer } from '../../index';
import { clearMaintenanceCache } from '../../middleware/maintenance.js';

describe('admin login with missing production secrets', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    clearMaintenanceCache();
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    mocks.query.mockResolvedValue({
      rows: [{
        id: 'admin-1',
        email: 'admin@soccercircular.com',
        password_hash: bcrypt.hashSync('correct-horse-battery', 4),
        role: 'ADMIN',
        first_name: 'Admin',
        last_name: 'User',
        is_active: true,
        token_version: 0,
      }],
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
    if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousJwtSecret;
    clearMaintenanceCache();
  });

  it('returns a JSON 503 instead of crashing the function', async () => {
    const response = await request(createServer())
      .post('/api/auth/login')
      .send({ email: 'admin@soccercircular.com', password: 'correct-horse-battery' });

    expect(response.status).toBe(503);
    expect(response.type).toMatch(/json/);
    expect(response.body).toEqual({
      success: false,
      code: 'CONFIGURATION_ERROR',
      message: 'The service is not fully configured. Please contact support.',
    });
  });
});
