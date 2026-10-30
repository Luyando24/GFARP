import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../../index';

vi.mock('../../lib/db.js', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
  transaction: vi.fn(),
}));

import { query } from '../../lib/db.js';

vi.mock('../../lib/email-service.js', () => ({
  emailService: {
    initializeFromDatabase: vi.fn().mockResolvedValue(true),
  }
}));

describe('Football Players Routes', () => {
  let app: any;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createServer();
  });

  describe('GET /api/football-players', () => {
    it('should return players for an academy', async () => {
      const mockPlayer = { id: 'player-1', position: 'Forward' };
      (query as any)
        .mockResolvedValueOnce({ rows: [mockPlayer] })
        .mockResolvedValueOnce({ rows: [{ count: 21 }] });

      // We need a mock token or bypass auth since the route is protected
      // For testing, we might want to either mock the auth middleware, or generate a valid token
      // Let's mock jwt.verify
      vi.mock('jsonwebtoken', async (importOriginal) => {
        const mod: any = await importOriginal();
        return {
          ...mod,
          default: {
            ...mod.default,
            verify: vi.fn().mockReturnValue({ id: 'academy-1', role: 'ACADEMY_ADMIN' })
          }
        };
      });

      const response = await request(app)
        .get('/api/football-players?academyId=academy-1&page=2&limit=10')
        .set('Authorization', 'Bearer valid_token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.players).toHaveLength(1);
      expect(response.body.data.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 21,
        totalPages: 3,
      });
      expect(query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM individual_players'),
        ['academy-1', 10, 10],
      );
    });
  });

  describe('POST /api/football-players', () => {
    it('rejects player creation when the organization has no active subscription', async () => {
      (query as any).mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/football-players')
        .set('Authorization', 'Bearer valid_token')
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          dateOfBirth: '2010-01-01',
          position: 'forward',
          academyId: 'academy-1',
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('SUBSCRIPTION_REQUIRED');
      expect(query).toHaveBeenCalledTimes(1);
    });

    it('stores NULL national id fields when no NRC is supplied', async () => {
      (query as any)
        .mockResolvedValueOnce({ rows: [{ plan_name: 'Pro', player_limit: -1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'player-1', player_card_id: 'CARD-1', position: 'forward', created_at: new Date(), updated_at: new Date() }] });

      const response = await request(app)
        .post('/api/football-players')
        .set('Authorization', 'Bearer valid_token')
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          dateOfBirth: '2010-01-01',
          position: 'forward',
          academyId: 'academy-1',
        });

      expect(response.status).toBe(201);
      const insertParams = (query as any).mock.calls[1][1];
      expect(insertParams[2]).toBeNull();
      expect(insertParams[3]).toBeNull();
    });

    it('hashes a supplied NRC and records the hash version', async () => {
      (query as any)
        .mockResolvedValueOnce({ rows: [{ plan_name: 'Pro', player_limit: -1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'player-2', player_card_id: 'CARD-2', position: 'forward', created_at: new Date(), updated_at: new Date() }] });

      const response = await request(app)
        .post('/api/football-players')
        .set('Authorization', 'Bearer valid_token')
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          dateOfBirth: '2010-01-01',
          position: 'forward',
          academyId: 'academy-1',
          nrc: '123456/78/9',
        });

      expect(response.status).toBe(201);
      const insertParams = (query as any).mock.calls[1][1];
      expect(insertParams[2]).toMatch(/^[a-f0-9]{64}$/);
      expect(insertParams[2]).not.toBe('123456/78/9');
      expect(insertParams[3]).toBe('hmac-sha256:v1');
    });
  });
});
