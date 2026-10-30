import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../lib/jwt.js';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock('../../lib/db.js', () => ({
  query: mocks.query,
  transaction: vi.fn(),
}));

vi.mock('../../lib/email-service.js', () => ({
  emailService: {
    initializeFromDatabase: vi.fn().mockResolvedValue(undefined),
    sendEmail: vi.fn(),
  },
}));

import { createServer } from '../../index';

describe('academy dashboard access', () => {
  const academyId = '11111111-1111-4111-8111-111111111111';
  const otherAcademyId = '22222222-2222-4222-8222-222222222222';
  const staffId = '44444444-4444-4444-8444-444444444444';

  const staffToken = jwt.sign(
    { id: staffId, email: 'staff@example.com', role: 'staff', academyId },
    getJwtSecret(),
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockResolvedValue({ rows: [{ count: 0, revenue: 0 }] });
  });

  it('lets academy staff read their own dashboard stats', async () => {
    const response = await request(createServer())
      .get(`/api/dashboard/academy-stats?academyId=${academyId}`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.totalPlayers).toBe(0);
  });

  it('blocks a staff member from reading another academy stats', async () => {
    const response = await request(createServer())
      .get(`/api/dashboard/academy-stats?academyId=${otherAcademyId}`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(403);
  });
});
