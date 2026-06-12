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

import { query, transaction, verifyPassword } from '../../lib/db.js';

vi.mock('../../lib/email-service.js', () => ({
  emailService: {
    initializeFromDatabase: vi.fn().mockResolvedValue(true),
    sendAcademyActivationEmail: vi.fn(),
    sendAcademyVerificationEmail: vi.fn(),
    sendAdminNotificationEmail: vi.fn(),
  }
}));

describe('Football Auth Routes', () => {
  let app: any;

  beforeEach(() => {
    vi.clearAllMocks();
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
});
