import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../lib/jwt.js';

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
    getJwtSecret(),
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

  it('updates the academy currency from the supported catalogue', async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          academy_id: academyId,
          default_currency: 'EUR',
          renewal_reminders_enabled: true,
          default_reminder_days: 7,
        }],
      });

    const response = await request(createServer())
      .put(`/api/financial-transactions/${academyId}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ default_currency: 'eur' });

    expect(response.status).toBe(200);
    expect(response.body.data.default_currency).toBe('EUR');
    expect(mocks.query.mock.calls[1][1]).toEqual([academyId, 'EUR', null, null]);
  });

  it('does not reset unrelated financial settings on a partial update', async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          academy_id: academyId,
          default_currency: 'USD',
          renewal_reminders_enabled: false,
          default_reminder_days: 14,
        }],
      });

    const response = await request(createServer())
      .put(`/api/financial-transactions/${academyId}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ renewal_reminders_enabled: false });

    expect(response.status).toBe(200);
    expect(mocks.query.mock.calls[1][1]).toEqual([academyId, null, false, null]);
  });

  it('rejects unsupported academy currency codes', async () => {
    const response = await request(createServer())
      .put(`/api/financial-transactions/${academyId}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ default_currency: 'ZZZ' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Select a supported academy currency');
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

  it('does not activate a paid plan through an unverified payment method', async () => {
    const response = await request(createServer())
      .post('/api/subscriptions/upgrade')
      .set('Authorization', `Bearer ${token}`)
      .send({
        academyId,
        newPlanId: '33333333-3333-4333-8333-333333333333',
        paymentMethod: 'BANK_TRANSFER',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Payment method must be CARD or CASH');
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
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

  it('propagates a transfer currency to its generated ledger entry', async () => {
    const transferId = '55555555-5555-4555-8555-555555555555';
    mocks.query
      .mockResolvedValueOnce({
        rows: [{
          id: transferId,
          academy_id: academyId,
          player_name: 'Alex Banda',
          from_club: 'Club A',
          to_club: 'Club B',
          transfer_amount: 2500,
          transfer_date: '2026-08-03',
          status: 'completed',
          currency: 'EUR',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 22, currency: 'EUR' }] });

    const response = await request(createServer())
      .post('/api/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        academyId,
        playerName: 'Alex Banda',
        fromClub: 'Club A',
        toClub: 'Club B',
        transferAmount: 2500,
        transferDate: '2026-08-03',
        status: 'completed',
        currency: 'EUR',
      });

    expect(response.status).toBe(201);
    expect(mocks.query.mock.calls[0][1][7]).toBe('EUR');
    expect(mocks.query.mock.calls[1][1][12]).toBe('EUR');
  });

  it('stores an invoice currency on both the invoice and its ledger entry', async () => {
    const invoiceId = '66666666-6666-4666-8666-666666666666';
    mocks.clientQuery
      .mockResolvedValueOnce({ rows: [{ id: invoiceId }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await request(createServer())
      .post('/api/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        academy_id: academyId,
        invoice_number: 'INV-2026-1',
        client_name: 'Alex Banda',
        issue_date: '2026-08-03',
        due_date: '2026-08-17',
        subtotal: 100,
        total_amount: 100,
        currency: 'GBP',
        items: [{ description: 'Training', quantity: 1, unitPrice: 100, amount: 100 }],
      });

    expect(response.status).toBe(201);
    expect(mocks.clientQuery.mock.calls[0][1][10]).toBe('GBP');
    expect(mocks.clientQuery.mock.calls[2][1][7]).toBe('GBP');
  });
});
