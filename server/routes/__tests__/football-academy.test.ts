import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../../index';

vi.mock('../../lib/db.js', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
}));

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

import { query } from '../../lib/db.js';

vi.mock('../../lib/email-service.js', () => ({
  emailService: {
    initializeFromDatabase: vi.fn().mockResolvedValue(true),
  }
}));

describe('Academy Routes', () => {
  let app: any;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createServer();
  });

  describe('GET /api/academies/:id', () => {
    it('should return 404 if academy is not found', async () => {
      (query as any).mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/academies/academy-1')
        .set('Authorization', 'Bearer valid_token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Academy not found');
    });

    it('should return academy profile if found', async () => {
      const mockAcademy = { id: 'academy-1', name: 'Elite Academy' };
      // First query: academy details
      (query as any).mockResolvedValueOnce({ rows: [mockAcademy] });
      // Second query: players
      (query as any).mockResolvedValueOnce({ rows: [] });
      // Third query: compliance
      (query as any).mockResolvedValueOnce({ rows: [] });
      // Fourth query: activities
      (query as any).mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/academies/academy-1')
        .set('Authorization', 'Bearer valid_token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Elite Academy');
    });
  });
});
