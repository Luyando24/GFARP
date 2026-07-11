import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
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
          password: 'password123',
          contactPerson: 'John Doe',
          subscriptionPlan: 'pro'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Academy registered successfully');
      expect(response.body.data.academy.email).toBe('new@academy.com');
      expect(response.body.data.token).toBeDefined();
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
        .mockResolvedValueOnce({ rows: [{ id: 'academy-id' }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token, password: 'new-password-123' });

      expect(response.status).toBe(200);
      expect(hashPassword).toHaveBeenCalledWith('new-password-123');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE academies'),
        ['hashed_password', 'academy@example.com']
      );
    });
  });
});
