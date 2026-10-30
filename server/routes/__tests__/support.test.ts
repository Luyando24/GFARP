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

describe('support ticket access scoping', () => {
  const academyId = '11111111-1111-4111-8111-111111111111';
  const otherAcademyId = '22222222-2222-4222-8222-222222222222';
  const staffId = '44444444-4444-4444-8444-444444444444';

  const staffToken = jwt.sign(
    { id: staffId, email: 'staff@example.com', role: 'staff', academyId },
    getJwtSecret(),
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockResolvedValue({ rows: [] });
  });

  it('filters the ticket list by the staff member academy, not the staff id', async () => {
    const response = await request(createServer())
      .get('/api/support/tickets')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('st.school_id = $2'),
      [staffId, academyId],
    );
  });

  it('lets staff open a ticket belonging to their own academy', async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [{ created_by: 'someone-else', school_id: academyId }] })
      .mockResolvedValueOnce({ rows: [{ id: 'ticket-1', school_id: academyId }] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await request(createServer())
      .get('/api/support/tickets/ticket-1')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(200);
  });

  it('blocks staff from another academy\'s ticket', async () => {
    mocks.query.mockResolvedValueOnce({
      rows: [{ created_by: 'someone-else', school_id: otherAcademyId }],
    });

    const response = await request(createServer())
      .get('/api/support/tickets/ticket-2')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(403);
  });
});
