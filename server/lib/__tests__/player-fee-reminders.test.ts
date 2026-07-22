import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock('../../lib/db.js', () => ({ query: mocks.query }));
vi.mock('../../lib/email-service.js', () => ({
  emailService: { sendEmail: mocks.sendEmail },
}));

import { processPlayerFeeRenewalReminders } from '../player-fee-reminders';

describe('player fee renewal reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendEmail.mockResolvedValue({ success: true });
  });

  it('sends and records one reminder for both academy and player', async () => {
    mocks.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'subscription-1',
          academy_id: 'academy-1',
          academy_name: 'Future Stars',
          academy_email: 'finance@futurestars.test',
          player_name: 'Alex Banda',
          player_email: 'alex@example.test',
          fee_name: 'Monthly training fee',
          amount: 500,
          currency: 'ZMW',
          billing_cycle: 'monthly',
          next_renewal_date: '2026-08-01',
          academy_reminder_sent: false,
          player_reminder_sent: false,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // academy claim
      .mockResolvedValueOnce({ rows: [] }) // academy delivery result
      .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // player claim
      .mockResolvedValueOnce({ rows: [] }) // player delivery result
      .mockResolvedValueOnce({ rows: [{ sent_count: 2 }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await processPlayerFeeRenewalReminders('academy-1');

    expect(result).toEqual({ subscriptionsChecked: 1, emailsSent: 2, emailsFailed: 0 });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
    expect(mocks.sendEmail).toHaveBeenNthCalledWith(1, expect.objectContaining({
      to: 'finance@futurestars.test',
    }));
    expect(mocks.sendEmail).toHaveBeenNthCalledWith(2, expect.objectContaining({
      to: 'alex@example.test',
    }));
  });

  it('does not resend recipients already marked sent for the renewal date', async () => {
    mocks.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'subscription-1',
          academy_name: 'Future Stars',
          academy_email: 'finance@futurestars.test',
          player_name: 'Alex Banda',
          player_email: 'alex@example.test',
          fee_name: 'Monthly training fee',
          amount: 500,
          currency: 'ZMW',
          billing_cycle: 'monthly',
          next_renewal_date: '2026-08-01',
          academy_reminder_sent: true,
          player_reminder_sent: true,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ sent_count: 2 }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await processPlayerFeeRenewalReminders();

    expect(result.emailsSent).toBe(0);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
