import crypto from 'crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { getJwtSecret } from './jwt.js';
import { query } from './db.js';

// Access tokens are deliberately short-lived. Revocation is enforced through
// the per-account token_version claim checked in authenticateToken.
export const ACCESS_TOKEN_TTL = '12h';
export const ACCESS_TOKEN_TTL_SECONDS = 12 * 60 * 60;
export const PASSWORD_RESET_TTL_MINUTES = 30;
export const EMAIL_VERIFICATION_TTL_MINUTES = 24 * 60;

const SESSION_CACHE_TTL_MS = 30_000;
const sessionCache = new Map<string, { valid: boolean; reason?: string; expiresAt: number }>();

export interface SessionTokenInput {
  id: string;
  email?: string | null;
  name?: string | null;
  role: string;
  academyId?: string | null;
  tokenVersion?: number | null;
  permissions?: string[] | null;
}

export function normalizeSessionRole(role: unknown): string {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'super_admin') return 'superadmin';
  if (normalized === 'academy_admin') return 'academy';
  if (normalized === 'agency' || normalized === 'agencyadmin') return 'agency_admin';
  return normalized;
}

export function signSessionToken(
  input: SessionTokenInput,
  expiresIn: SignOptions['expiresIn'] = ACCESS_TOKEN_TTL,
): string {
  const payload: Record<string, unknown> = {
    id: input.id,
    role: input.role,
    tv: Number(input.tokenVersion ?? 0),
  };
  if (input.email) payload.email = input.email;
  if (input.name) payload.name = input.name;
  if (input.academyId) payload.academyId = input.academyId;
  if (Array.isArray(input.permissions)) payload.perm = input.permissions;
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}

// role -> table/column used to validate that a token still represents an
// active account. Quoted identifiers are safe here: the values are constants.
const SESSION_SOURCES: Record<string, { table: string; select: string; isActive: (row: any) => boolean }> = {
  admin: { table: '"Admin"', select: 'is_active AS account_active, token_version', isActive: (row) => row.account_active !== false },
  superadmin: { table: '"Admin"', select: 'is_active AS account_active, token_version', isActive: (row) => row.account_active !== false },
  academy: { table: 'academies', select: 'status AS account_active, token_version', isActive: (row) => (row.account_active ?? 'active') === 'active' },
  agency_admin: { table: 'agencies', select: 'status AS account_active, token_version', isActive: (row) => (row.account_active ?? 'active') === 'active' },
  staff: { table: 'staff_users', select: 'is_active AS account_active, token_version', isActive: (row) => row.account_active !== false },
  individual_player: { table: 'individual_players', select: 'NULL AS account_active, token_version', isActive: () => true },
};

const TOKEN_VERSION_TABLES: Record<string, string> = {
  admin: '"Admin"',
  superadmin: '"Admin"',
  academy: 'academies',
  agency_admin: 'agencies',
  staff: 'staff_users',
  individual_player: 'individual_players',
};

export function clearSessionValidationCache(): void {
  sessionCache.clear();
}

export interface SessionValidationResult {
  valid: boolean;
  reason?: 'ACCOUNT_NOT_FOUND' | 'ACCOUNT_INACTIVE' | 'SESSION_REVOKED';
}

export async function validateActiveSession(decoded: { id?: unknown; role?: unknown; tv?: unknown }): Promise<SessionValidationResult> {
  const role = normalizeSessionRole(decoded.role);
  const source = SESSION_SOURCES[role];
  const id = String(decoded.id || '');
  if (!source || !id) return { valid: true };

  const tokenVersion = Number(decoded.tv ?? 0);
  const cacheKey = `${role}:${id}:${tokenVersion}`;
  const cached = sessionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { valid: cached.valid, reason: cached.reason as SessionValidationResult['reason'] };
  }

  const result = await query(
    `SELECT ${source.select} FROM ${source.table} WHERE id = $1 LIMIT 1`,
    [id],
  );
  const row = result.rows[0];

  let outcome: SessionValidationResult;
  if (!row) {
    outcome = { valid: false, reason: 'ACCOUNT_NOT_FOUND' };
  } else if (!source.isActive(row)) {
    outcome = { valid: false, reason: 'ACCOUNT_INACTIVE' };
  } else if (Number(row.token_version ?? 0) !== tokenVersion) {
    outcome = { valid: false, reason: 'SESSION_REVOKED' };
  } else {
    outcome = { valid: true };
  }

  sessionCache.set(cacheKey, { ...outcome, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
  return outcome;
}

export async function revokeAccountSessions(role: unknown, accountId: string): Promise<void> {
  const table = TOKEN_VERSION_TABLES[normalizeSessionRole(role)];
  if (!table) return;
  await query(`UPDATE ${table} SET token_version = token_version + 1 WHERE id = $1`, [accountId]);
  clearSessionValidationCache();
}

export function createOpaqueToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashOpaqueToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function issueEmailVerificationToken(
  userType: 'academy' | 'agency' | 'staff' | 'individual_player',
  userId: string,
  ttlMinutes: number = EMAIL_VERIFICATION_TTL_MINUTES,
): Promise<string> {
  const raw = createOpaqueToken();
  await query(
    `INSERT INTO email_verification_tokens (user_type, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + make_interval(mins => $4))`,
    [userType, userId, hashOpaqueToken(raw), ttlMinutes],
  );
  return raw;
}

export async function consumeEmailVerificationToken(
  rawToken: string,
  userType: 'academy' | 'agency' | 'staff' | 'individual_player',
): Promise<string | null> {
  const result = await query(
    `UPDATE email_verification_tokens
     SET used_at = NOW()
     WHERE token_hash = $1 AND user_type = $2 AND used_at IS NULL AND expires_at > NOW()
     RETURNING user_id`,
    [hashOpaqueToken(rawToken), userType],
  );
  return result.rows[0]?.user_id ?? null;
}

export async function issuePasswordResetToken(
  accountType: 'academy' | 'agency' | 'admin' | 'individual_player',
  userId: string,
  ttlMinutes: number = PASSWORD_RESET_TTL_MINUTES,
): Promise<string> {
  const raw = createOpaqueToken();
  await query(
    `INSERT INTO password_reset_tokens (account_type, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + make_interval(mins => $4))`,
    [accountType, userId, hashOpaqueToken(raw), ttlMinutes],
  );
  return raw;
}

export async function consumePasswordResetToken(
  rawToken: string,
): Promise<{ userId: string; accountType: string } | null> {
  const result = await query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
     RETURNING user_id, account_type`,
    [hashOpaqueToken(rawToken)],
  );
  const row = result.rows[0];
  if (!row) return null;
  return { userId: row.user_id, accountType: row.account_type };
}
