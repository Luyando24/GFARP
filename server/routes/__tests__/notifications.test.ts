import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../lib/jwt.js';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  transaction: vi.fn(),
  clientQuery: vi.fn(),
}));

vi.mock('../../lib/db.js', () => ({
  query: mocks.query,
  transaction: mocks.transaction,
}));

vi.mock('../../lib/email-service.js', () => ({
  emailService: {
    initializeFromDatabase: vi.fn().mockResolvedValue(undefined),
    sendEmail: vi.fn(),
  },
}));

import { createServer } from '../../index';

function tokenFor(id: string, role: string) {
  return jwt.sign({ id, email: `${id}@example.com`, role }, getJwtSecret());
}

describe('notification recipient model', () => {
  const academyId = '11111111-1111-4111-8111-111111111111';
  const agencyId = '33333333-3333-4333-8333-333333333333';
  const adminToken = tokenFor('admin-1', 'admin');

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockResolvedValue({ rows: [] });
    mocks.clientQuery.mockReset();
    mocks.transaction.mockImplementation(async (callback: any) =>
      callback({ query: mocks.clientQuery }),
    );
  });

  it('lists notifications addressed to the academy account, not its staff', async () => {
    const token = tokenFor(academyId, 'ACADEMY_ADMIN');

    const response = await request(createServer())
      .get('/api/notifications/list')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('un.user_type = $2'),
      [academyId, 'academy'],
    );
  });

  it('lists notifications addressed to an agency account', async () => {
    const token = tokenFor(agencyId, 'AGENCY_ADMIN');

    await request(createServer())
      .get('/api/notifications/list')
      .set('Authorization', `Bearer ${token}`);

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('un.user_type = $2'),
      [agencyId, 'agency'],
    );
  });

  it('does not let a non-admin read another account inbox via query params', async () => {
    const token = tokenFor(academyId, 'ACADEMY_ADMIN');

    await request(createServer())
      .get('/api/notifications/list')
      .query({ userId: 'someone-else', userType: 'admin' })
      .set('Authorization', `Bearer ${token}`);

    expect(mocks.query).toHaveBeenCalledWith(expect.any(String), [academyId, 'academy']);
  });

  it('addresses notifications for selected schools to the academy account', async () => {
    mocks.clientQuery.mockResolvedValueOnce({ rows: [{ id: 'notification-1' }] });
    mocks.clientQuery.mockResolvedValue({ rows: [] });

    const response = await request(createServer())
      .post('/api/notifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Fee reminder',
        message: 'Term fees are due',
        schoolIds: [academyId],
      });

    expect(response.status).toBe(201);
    const recipientInsert = mocks.clientQuery.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO user_notifications'),
    );
    expect(recipientInsert?.[0]).toContain("'academy'");
    expect(recipientInsert?.[1]).toEqual(['notification-1', [academyId]]);
  });

  it('fans global notifications out to staff, academies and agencies', async () => {
    mocks.clientQuery.mockResolvedValueOnce({ rows: [{ id: 'notification-2' }] });
    mocks.clientQuery.mockResolvedValue({ rows: [] });

    await request(createServer())
      .post('/api/notifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Maintenance', message: 'Window tonight', isGlobal: true });

    const fanOut = mocks.clientQuery.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO user_notifications'),
    )?.[0] as string;
    expect(fanOut).toContain('FROM staff_users');
    expect(fanOut).toContain('FROM academies');
    expect(fanOut).toContain('FROM agencies');
  });

  it('marks a notification read only for the caller and their recipient type', async () => {
    const token = tokenFor(academyId, 'ACADEMY_ADMIN');
    mocks.query.mockResolvedValueOnce({ rows: [{ id: 'un-1' }] });

    const response = await request(createServer())
      .post('/api/notifications/mark-read')
      .set('Authorization', `Bearer ${token}`)
      .send({ userNotificationId: 'un-1' });

    expect(response.status).toBe(200);
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('user_type = $3'),
      ['un-1', academyId, 'academy'],
    );
  });
});
