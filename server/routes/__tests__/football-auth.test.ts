import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../lib/jwt.js';
import { createServer } from '../../index';

// Mock the database module
vi.mock('../../lib/db.js', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
  transaction: vi.fn(async (callback) => {
    const mockClient = { 
      query: vi.fn().mockResolvedValue({ 
        rows: [{ id: 'mock-id', data_type: 'uuid', name: 'Mock Plan', price: 0, email: 'new@academy.com' }] 
      }) 
    };
    return await callback(mockClient);
  }),
  hashPassword: vi.fn().mockResolvedValue('hashed_password'),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

import { query, transaction, hashPassword, verifyPassword } from '../../lib/db.js';

vi.mock('../../lib/email-service.js', () => ({
  emailService: {
    initializeFromDatabase: vi.fn().mockResolvedValue(true),
    sendAcademyActivationEmail: vi.fn(),
    sendAcademyVerificationEmail: vi.fn(),
    sendAdminNotificationEmail: vi.fn(),
    sendEmail: vi.fn().mockResolvedValue({ success: true }),
    sendPlayerRegistrationVerificationEmail: vi.fn().mockResolvedValue(true),
  }
}));

import { emailService } from '../../lib/email-service.js';

describe('Football Auth Routes', () => {
  let app: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (query as any).mockReset().mockResolvedValue({ rows: [] });
    (hashPassword as any).mockReset().mockResolvedValue('hashed_password');
    (verifyPassword as any).mockReset().mockResolvedValue(true);
    (emailService.sendEmail as any).mockReset().mockResolvedValue({ success: true });
    app = createServer();
  });

  describe('POST /api/football-auth/academy/login', () => {
    it('should return 400 if email or password is missing', async () => {
      const response = await request(app)
        .post('/api/football-auth/academy/login')
        .send({ email: 'test@academy.com' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email and password are required');
    });

    it('should return 401 for invalid credentials', async () => {
      (query as any).mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/football-auth/academy/login')
        .send({ email: 'nonexistent@academy.com', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 401 if account is not active', async () => {
      (query as any).mockResolvedValueOnce({
        rows: [{
          id: 'test-id',
          email: 'test@academy.com',
          status: 'inactive',
          password_hash: 'hashed_password'
        }]
      });

      const response = await request(app)
        .post('/api/football-auth/academy/login')
        .send({ email: 'test@academy.com', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Account is inactive');
    });

    it('should login successfully for valid credentials', async () => {
      (query as any).mockResolvedValueOnce({
        rows: [{
          id: 'test-id',
          name: 'Test Academy',
          email: 'test@academy.com',
          status: 'active',
          password_hash: 'hashed_password'
        }]
      });
      (verifyPassword as any).mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/api/football-auth/academy/login')
        .send({ email: 'test@academy.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.academy.id).toBe('test-id');
    });
  });
  
  describe('POST /api/football-auth/academy/register', () => {
    it('should register a new academy', async () => {
      // Mock for checking existing academy
      (query as any).mockResolvedValueOnce({ rows: [] }); 
      
      // Mock for checking academy id type
      (query as any).mockResolvedValueOnce({ rows: [{ data_type: 'uuid' }] }); 
      
      const response = await request(app)
        .post('/api/football-auth/academy/register')
        .send({ 
          name: 'New Academy',
          email: 'new@academy.com', 
          country: 'Zambia',
          password: 'password123',
          contactPerson: 'John Doe',
          subscriptionPlan: 'pro'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('verify');
      expect(response.body.data.academy.email).toBe('new@academy.com');
      // Registration no longer auto-issues a session token.
      expect(response.body.data.requireVerification).toBe(true);
      expect(response.body.data.token).toBeUndefined();
      expect(emailService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'new@academy.com',
        subject: expect.stringContaining('Verify'),
      }));
    });

    it('should reject registration if country is missing', async () => {
      const response = await request(app)
        .post('/api/football-auth/academy/register')
        .send({
          name: 'No Country Academy',
          email: 'nocountry@academy.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email, password, and country are required');
    });
  });

  describe('Password reset routes', () => {
    it('returns a generic success response for an unknown email', async () => {
      (query as any).mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'missing@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('If an account exists');
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('sends a reset link for an academy account', async () => {
      (query as any).mockResolvedValueOnce({ rows: [{ id: 'academy-id' }] });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'Academy@Example.com' });

      expect(response.status).toBe(200);
      expect(emailService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'academy@example.com',
        subject: expect.stringContaining('Reset')
      }));
      const email = (emailService.sendEmail as any).mock.calls[0][0];
      expect(email.html).toContain('/reset-password?token=');
    });

    it('rejects an invalid reset token with JSON', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'invalid-token', password: 'new-password-123' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Invalid or expired password reset link.'
      });
    });

    it('hashes and updates an academy password for a valid token', async () => {
      (query as any).mockResolvedValueOnce({ rows: [{ id: 'academy-id' }] });
      const forgotResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'academy@example.com' });
      expect(forgotResponse.status).toBe(200);

      const email = (emailService.sendEmail as any).mock.calls[0][0];
      const token = new URL(email.html.match(/href="([^"]+)"/)[1]).searchParams.get('token');
      (query as any)
        .mockResolvedValueOnce({ rows: [{ user_id: 'academy-id', account_type: 'academy' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'academy-id' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token, password: 'new-password-123' });

      expect(response.status).toBe(200);
      expect(hashPassword).toHaveBeenCalledWith('new-password-123');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE academies'),
        ['hashed_password', 'academy-id']
      );
      // Staff password updates stay scoped to the reset academy.
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE academy_id = $2'),
        ['hashed_password', 'academy-id']
      );
    });

    it('sends a reset link and updates password for an individual player account', async () => {
      (query as any)
        .mockResolvedValueOnce({ rows: [] }) // academies check
        .mockResolvedValueOnce({ rows: [] }) // agencies check
        .mockResolvedValueOnce({ rows: [{ id: 'player-id' }] }); // individual_players check

      const forgotResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'player@example.com' });
      expect(forgotResponse.status).toBe(200);

      const emailCall = (emailService.sendEmail as any).mock.calls[(emailService.sendEmail as any).mock.calls.length - 1][0];
      const token = new URL(emailCall.html.match(/href="([^"]+)"/)[1]).searchParams.get('token');

      (query as any)
        .mockResolvedValueOnce({ rows: [{ user_id: 'player-id', account_type: 'individual_player' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'player-id' }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token, password: 'new-player-password-123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE individual_players'),
        ['hashed_password', 'player-id']
      );
    });
  });

  describe('POST /api/football-auth/verify-email', () => {
    it('rejects an unknown or already-used verification token', async () => {
      (query as any).mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/football-auth/verify-email')
        .send({ token: 'stale-token' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired');
    });

    it('issues a normal session token after consuming a valid verification token', async () => {
      (query as any)
        .mockResolvedValueOnce({ rows: [{ user_id: 'academy-1' }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'academy-1',
            name: 'Elite Academy',
            code: 'ELITE',
            email: 'elite@example.com',
            status: 'active',
            token_version: 0,
          }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/football-auth/verify-email')
        .send({ token: 'valid-token' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.academy_id).toBe('academy-1');
      expect(response.body.data.academy.password_hash).toBeUndefined();

      const decoded = jwt.verify(response.body.data.token, getJwtSecret()) as any;
      expect(decoded.role).toBe('academy');
      expect(decoded.tv).toBe(0);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SET email_verified = TRUE'),
        ['academy-1'],
      );
    });
  });

  describe('POST /api/football-auth/staff/login', () => {
    it('issues a staff token scoped to the academy', async () => {
      (query as any).mockResolvedValueOnce({
        rows: [{
          id: 'staff-1',
          academy_id: 'academy-1',
          email: 'coach@example.com',
          first_name: 'Alex',
          last_name: 'Coach',
          password_hash: 'hashed_password',
          role: 'coach',
          is_active: true,
          token_version: 0,
        }],
      });
      (verifyPassword as any).mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/api/football-auth/staff/login')
        .send({ email: 'coach@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.data.user.academyId).toBe('academy-1');

      const decoded = jwt.verify(response.body.data.token, getJwtSecret()) as any;
      expect(decoded.role).toBe('staff');
      expect(decoded.academyId).toBe('academy-1');
    });

    it('rejects inactive staff accounts', async () => {
      (query as any).mockResolvedValueOnce({
        rows: [{
          id: 'staff-1',
          academy_id: 'academy-1',
          email: 'coach@example.com',
          password_hash: 'hashed_password',
          is_active: false,
          token_version: 0,
        }],
      });

      const response = await request(app)
        .post('/api/football-auth/staff/login')
        .send({ email: 'coach@example.com', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('inactive');
    });
  });

  describe('academy registration edge cases', () => {
    it('returns 409 when the database rejects a duplicate email', async () => {
      (query as any).mockResolvedValueOnce({ rows: [] });
      (transaction as any).mockRejectedValueOnce({ code: '23505' });

      const response = await request(app)
        .post('/api/football-auth/academy/register')
        .send({ email: 'dupe@academy.com', password: 'password123', country: 'Zambia' });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });
});
