import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../jwt.js';
import {
  clearSessionValidationCache,
  consumeEmailVerificationToken,
  consumePasswordResetToken,
  hashOpaqueToken,
  issueEmailVerificationToken,
  issuePasswordResetToken,
  revokeAccountSessions,
  signSessionToken,
  validateActiveSession,
} from '../auth-tokens.js';

const dbMocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock('../db.js', () => ({
  query: dbMocks.query,
}));

describe('session tokens', () => {
  beforeEach(() => {
    dbMocks.query.mockReset();
    clearSessionValidationCache();
  });

  it('signs a token with a token version claim', () => {
    const token = signSessionToken({ id: 'academy-1', email: 'a@example.com', role: 'academy', tokenVersion: 4 });
    const decoded = jwt.verify(token, getJwtSecret()) as any;

    expect(decoded.id).toBe('academy-1');
    expect(decoded.role).toBe('academy');
    expect(decoded.tv).toBe(4);
  });

  it('accepts a session whose token version and account status still match', async () => {
    dbMocks.query.mockResolvedValueOnce({ rows: [{ account_active: 'active', token_version: 2 }] });

    const result = await validateActiveSession({ id: 'academy-1', role: 'ACADEMY_ADMIN', tv: 2 });

    expect(result.valid).toBe(true);
    expect(dbMocks.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM academies'),
      ['academy-1'],
    );
  });

  it('rejects a session for an inactive account', async () => {
    dbMocks.query.mockResolvedValueOnce({ rows: [{ account_active: 'suspended', token_version: 0 }] });

    const result = await validateActiveSession({ id: 'academy-1', role: 'academy', tv: 0 });

    expect(result).toEqual({ valid: false, reason: 'ACCOUNT_INACTIVE' });
  });

  it('rejects a session after the token version was bumped', async () => {
    dbMocks.query.mockResolvedValueOnce({ rows: [{ account_active: 'active', token_version: 3 }] });

    const result = await validateActiveSession({ id: 'academy-1', role: 'academy', tv: 2 });

    expect(result).toEqual({ valid: false, reason: 'SESSION_REVOKED' });
  });

  it('rejects a session whose account no longer exists', async () => {
    dbMocks.query.mockResolvedValueOnce({ rows: [] });

    const result = await validateActiveSession({ id: 'gone', role: 'staff', tv: 0 });

    expect(result).toEqual({ valid: false, reason: 'ACCOUNT_NOT_FOUND' });
  });

  it('caches validation results to avoid a query on every request', async () => {
    dbMocks.query.mockResolvedValueOnce({ rows: [{ account_active: true, token_version: 1 }] });

    await validateActiveSession({ id: 'staff-1', role: 'staff', tv: 1 });
    const second = await validateActiveSession({ id: 'staff-1', role: 'staff', tv: 1 });

    expect(second.valid).toBe(true);
    expect(dbMocks.query).toHaveBeenCalledTimes(1);
  });

  it('bumps the stored token version to revoke sessions', async () => {
    dbMocks.query.mockResolvedValueOnce({ rows: [] });

    await revokeAccountSessions('agency_admin', 'agency-1');

    expect(dbMocks.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE agencies SET token_version'),
      ['agency-1'],
    );
  });
});

describe('one-time tokens', () => {
  beforeEach(() => {
    dbMocks.query.mockReset();
  });

  it('stores only the hash of an email verification token', async () => {
    dbMocks.query.mockResolvedValueOnce({ rows: [] });

    const raw = await issueEmailVerificationToken('academy', 'academy-1');

    expect(raw.length).toBeGreaterThan(20);
    const params = dbMocks.query.mock.calls[0][1];
    expect(params[0]).toBe('academy');
    expect(params[1]).toBe('academy-1');
    expect(params[2]).toBe(hashOpaqueToken(raw));
    expect(params[2]).not.toBe(raw);
  });

  it('consumes a verification token exactly once', async () => {
    dbMocks.query
      .mockResolvedValueOnce({ rows: [{ user_id: 'academy-1' }] })
      .mockResolvedValueOnce({ rows: [] });

    const first = await consumeEmailVerificationToken('raw-token', 'academy');
    const second = await consumeEmailVerificationToken('raw-token', 'academy');

    expect(first).toBe('academy-1');
    expect(second).toBeNull();
    expect(dbMocks.query).toHaveBeenCalledWith(
      expect.stringContaining('used_at IS NULL'),
      [hashOpaqueToken('raw-token'), 'academy'],
    );
  });

  it('returns the account that owns a consumed password reset token', async () => {
    dbMocks.query.mockResolvedValueOnce({ rows: [{ user_id: 'player-1', account_type: 'individual_player' }] });

    const reset = await consumePasswordResetToken('raw-reset');

    expect(reset).toEqual({ userId: 'player-1', accountType: 'individual_player' });
  });

  it('issues password reset tokens with a 30 minute expiry by default', async () => {
    dbMocks.query.mockResolvedValueOnce({ rows: [] });

    await issuePasswordResetToken('admin', 'admin-1');

    expect(dbMocks.query.mock.calls[0][1][3]).toBe(30);
  });
});
