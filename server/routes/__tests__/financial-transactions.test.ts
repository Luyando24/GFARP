import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  transaction: vi.fn(),
  clientQuery: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock('../../lib/db.js', () => ({
  query: mocks.query,
  transaction: mocks.transaction,
}));

vi.mock('../../lib/email-service.js', () => ({
  emailService: {
    initializeFromDatabase: vi.fn().mockResolvedValue(undefined),
    sendEmail: mocks.sendEmail,
    sendAcademyActivationEmail: vi.fn(),
    sendAcademyVerificationEmail: vi.fn(),
    sendAdminNotificationEmail: vi.fn(),
    sendPlayerRegistrationVerificationEmail: vi.fn(),
    sendPaymentConfirmationEmail: vi.fn(),
  },
}));

import { createServer } from '../../index';

describe('Academy player fee management', () => {
  const academyId = '11111111-1111-4111-8111-111111111111';
  const otherAcademyId = '22222222-2222-4222-8222-222222222222';
  const token = jwt.sign(
    { id: academyId, email: 'academy@example.com', role: 'ACADEMY_ADMIN' },
    process.env.JWT_SECRET || 'your-secret-key',
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockResolvedValue({ rows: [] });
    mocks.clientQuery.mockReset();
    mocks.transaction.mockImplementation(async (callback: any) => callback({ query: mocks.clientQuery }));
  });

  it('returns academy-scoped financial settings', async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          academy_id: academyId,
          default_currency: 'ZMW',
          renewal_reminders_enabled: true,
          default_reminder_days: 7,
        }],
      });

    const response = await request(createServer())
      .get(`/api/financial-transactions/${academyId}/settings`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.default_currency).toBe('ZMW');
  });

  it('rejects access to another academy ledger', async () => {
    const response = await request(createServer())
      .get(`/api/financial-transactions/${otherAcademyId}/settings`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('returns a successful nullable subscription response when no plan is active', async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ player_count: '3' }] });

    const response = await request(createServer())
      .get(`/api/subscriptions/current?academyId=${otherAcademyId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        subscription: null,
        limits: { playerLimit: 0 },
        usage: { playerCount: 3, playerUsagePercentage: 0 },
      },
    });
    expect(mocks.query.mock.calls[0][1]).toEqual([academyId]);
    expect(mocks.query.mock.calls[1][1]).toEqual([academyId]);
  });

  it('requires authentication for the current subscription endpoint', async () => {
    const response = await request(createServer())
      .get(`/api/subscriptions/current?academyId=${academyId}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Access token required');
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('records an external player fee and creates its recurring schedule atomically', async () => {
    const playerId = '33333333-3333-4333-8333-333333333333';
    const subscriptionId = '44444444-4444-4444-8444-444444444444';
    mocks.clientQuery
      .mockResolvedValueOnce({
        rows: [{
          id: playerId,
          player_source: 'individual',
          first_name_cipher: Buffer.from('Alex'),
          last_name_cipher: Buffer.from('Banda'),
          email_cipher: Buffer.from('alex@example.com'),
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: subscriptionId }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 10,
          academy_id: academyId,
          player_id: playerId,
          player_name: 'Alex Banda',
          currency: 'ZMW',
          is_external_payment: true,
          fee_subscription_id: subscriptionId,
        }],
      });

    const response = await request(createServer())
      .post('/api/financial-transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        academy_id: academyId,
        transaction_type: 'income',
        category: 'Academy Fees',
        amount: 500,
        description: 'Monthly training fee',
        transaction_date: '2026-07-22',
        status: 'completed',
        currency: 'ZMW',
        player_id: playerId,
        payment_type: 'monthly',
        is_external_payment: true,
        is_recurring: true,
        next_renewal_date: '2026-08-22',
        reminder_days_before: 7,
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      player_name: 'Alex Banda',
      currency: 'ZMW',
      is_external_payment: true,
      fee_subscription_id: subscriptionId,
    });
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.clientQuery).toHaveBeenCalledTimes(3);
  });
});
