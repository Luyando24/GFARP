import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  sendEmail: vi.fn(),
  initializeFromDatabase: vi.fn(),
}));

vi.mock('../db.js', () => ({ query: mocks.query }));
vi.mock('../email-service.js', () => ({
  emailService: {
    sendEmail: mocks.sendEmail,
    initializeFromDatabase: mocks.initializeFromDatabase,
  },
}));

import {
  formatTrainingReminderDate,
  processTrainingSessionReminders,
} from '../training-session-reminders';

describe('training session reminders', () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.sendEmail.mockReset().mockResolvedValue({ success: true });
    mocks.initializeFromDatabase.mockReset().mockResolvedValue(undefined);
  });

  it('emails academy admins and players once per unique address', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM training_sessions s')) {
        return {
          rows: [
            {
              id: 'session-1',
              academy_id: 'academy-1',
              academy_name: 'Rising Stars',
              academy_email: 'ADMIN@example.com',
              director_email: 'director@example.com',
              title: 'Morning Training',
              session_date: '2026-08-03T06:00:00Z',
              duration_minutes: 90,
              location: 'Main Ground',
              timezone_offset_minutes: -120,
            },
          ],
        };
      }
      if (sql.includes('FROM staff_users')) {
        return {
          rows: [
            { email: 'admin@example.com' },
            { email: 'coach-admin@example.com' },
          ],
        };
      }
      if (sql.includes('academy_players')) {
        return {
          rows: [
            { email_value: Buffer.from('player@example.com') },
            { email_value: Buffer.from('PLAYER@example.com') },
          ],
        };
      }
      if (sql.includes('INSERT INTO training_session_reminder_deliveries')) {
        return { rows: [{ id: `delivery-${Math.random()}` }] };
      }
      return { rows: [] };
    });

    const result = await processTrainingSessionReminders();

    expect(result).toEqual({
      sessionsChecked: 1,
      recipientsFound: 4,
      emailsSent: 4,
      emailsFailed: 0,
      emailsSkipped: 0,
    });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(4);
    expect(
      mocks.sendEmail.mock.calls.map(([email]) => email.to).sort(),
    ).toEqual([
      'admin@example.com',
      'coach-admin@example.com',
      'director@example.com',
      'player@example.com',
    ]);
  });

  it('formats the session in the academy creator local time', () => {
    expect(
      formatTrainingReminderDate('2026-08-03T06:00:00Z', -120),
    ).toContain('8:00');
  });
});
