import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../../index';

vi.mock('../../lib/db.js', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
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
      (query as any).mockResolvedValueOnce({ rows: [mockPlayer] });

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
        .get('/api/football-players?academyId=academy-1')
        .set('Authorization', 'Bearer valid_token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
