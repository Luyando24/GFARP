import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EmailService from '../email-service.js';

describe('EmailService Resend transport', () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFromEmail = process.env.RESEND_FROM_EMAIL;
  const originalFromName = process.env.RESEND_FROM_NAME;
  const originalReplyTo = process.env.RESEND_REPLY_TO;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.RESEND_FROM_EMAIL = 'notifications@soccercircular.com';
    process.env.RESEND_FROM_NAME = 'Soccer Circular';
    process.env.RESEND_REPLY_TO = 'support@soccercircular.com';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.RESEND_API_KEY = originalApiKey;
    process.env.RESEND_FROM_EMAIL = originalFromEmail;
    process.env.RESEND_FROM_NAME = originalFromName;
    process.env.RESEND_REPLY_TO = originalReplyTo;
    vi.restoreAllMocks();
  });

  it('sends email through the Resend HTTP API', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'email_123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const service = new EmailService();
    const result = await service.sendEmail({
      to: 'player@example.com',
      subject: 'Training reminder',
      html: '<p>Training starts soon.</p>',
    });

    expect(result).toEqual({ success: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer re_test_key',
          'Content-Type': 'application/json',
        }),
      }),
    );

    const request = vi.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual(
      expect.objectContaining({
        from: 'Soccer Circular <notifications@soccercircular.com>',
        to: ['player@example.com'],
        reply_to: 'support@soccercircular.com',
        subject: 'Training reminder',
      }),
    );
  });

  it('returns the Resend API error without throwing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Domain is not verified' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const service = new EmailService();
    const result = await service.sendEmail({
      to: 'player@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    expect(result).toEqual({
      success: false,
      error: 'Domain is not verified',
    });
  });
});
