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

describe('Individual Players Routes', () => {
  let app: any;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createServer();
  });

  describe('GET /api/individual-players/public/:id', () => {
    it('should return 404 if player is not found anywhere', async () => {
      // First query (individual_players by id)
      (query as any).mockResolvedValueOnce({ rows: [] });
      // UUID check in code prevents academy fallback if id is not UUID

      const response = await request(app)
        .get('/api/individual-players/public/unknown-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Profile not found');
    });

    it('should return individual player profile if found by slug', async () => {
      const mockPlayer = { player_id: 'uuid-123', display_name: 'John Doe', slug: 'john-doe' };
      
      // Query (by slug)
      (query as any).mockResolvedValueOnce({ rows: [mockPlayer] });

      const response = await request(app)
        .get('/api/individual-players/public/by-slug/john-doe');

      expect(response.status).toBe(200);
      expect(response.body.display_name).toBe('John Doe');
      expect(response.body.is_academy_player).toBeUndefined(); // Backend doesn't return this flag for individual players
    });

    it('should fallback to academy player if not found in individual_players', async () => {
      const mockAcademyPlayer = { 
        id: '123e4567-e89b-12d3-a456-426614174000', 
        first_name_cipher: 'encoded_first',
        last_name_cipher: 'encoded_last', 
        slug: 'jane-doe',
      };
      
      // First query (individual_players by id)
      (query as any).mockResolvedValueOnce({ rows: [] });
      // Academy players fallback
      (query as any).mockResolvedValueOnce({ rows: [mockAcademyPlayer] });

      const response = await request(app)
        .get('/api/individual-players/public/123e4567-e89b-12d3-a456-426614174000');

      expect(response.status).toBe(200);
      expect(response.body.slug).toBe('jane-doe');
      expect(response.body.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });
});
