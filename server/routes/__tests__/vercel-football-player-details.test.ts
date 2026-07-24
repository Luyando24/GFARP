import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock } = vi.hoisted(() => ({
    fromMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        from: fromMock,
    })),
}));

import handler from '../../../api/football-players/[id]';

function createResponse() {
    const response: any = {
        setHeader: vi.fn(),
        status: vi.fn(),
        json: vi.fn(),
        end: vi.fn(),
    };

    response.status.mockReturnValue(response);
    response.json.mockReturnValue(response);
    response.end.mockReturnValue(response);

    return response;
}

function singleResult(result: { data: unknown; error: unknown }) {
    return {
        select: vi.fn(() => ({
            eq: vi.fn(() => ({
                single: vi.fn(async () => result),
            })),
        })),
    };
}

describe('GET /api/football-players/:id profile images', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
        process.env.VITE_SUPABASE_ANON_KEY = 'test-key';
    });

    it('returns the saved profile image for an academy-created player', async () => {
        fromMock.mockImplementation((table: string) => {
            expect(table).toBe('players');
            return singleResult({
                data: {
                    id: 'academy-player',
                    first_name_cipher: 'Lamar',
                    last_name_cipher: 'Mansour',
                    position: 'Forward',
                    profile_image_url: 'https://cdn.example.com/lamar.jpg',
                    cover_image_url: 'https://cdn.example.com/lamar-cover.jpg',
                    gallery_images: ['https://cdn.example.com/gallery.jpg'],
                    social_links: { instagram: 'lamar' },
                    is_active: true,
                },
                error: null,
            });
        });

        const response = createResponse();
        await handler(
            { method: 'GET', query: { id: 'academy-player' } } as any,
            response,
        );

        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                profile_image_url: 'https://cdn.example.com/lamar.jpg',
                cover_image_url: 'https://cdn.example.com/lamar-cover.jpg',
                gallery_images: ['https://cdn.example.com/gallery.jpg'],
                social_links: { instagram: 'lamar' },
            }),
        }));
    });

    it('returns the profile image nested under a self-registered player profile', async () => {
        fromMock.mockImplementation((table: string) => {
            if (table === 'players') {
                return singleResult({ data: null, error: { code: 'PGRST116' } });
            }

            expect(table).toBe('individual_players');
            return singleResult({
                data: {
                    id: 'self-registered-player',
                    first_name: 'Lamar',
                    last_name: 'Mansour',
                    created_at: '2026-01-01T00:00:00.000Z',
                    updated_at: '2026-01-02T00:00:00.000Z',
                    player_profiles: [{
                        position: 'Forward',
                        display_name: 'Lamar Khaled Mansour',
                        profile_image_url: 'https://cdn.example.com/self-registered.jpg',
                        cover_image_url: 'https://cdn.example.com/self-cover.jpg',
                        gallery_images: [],
                        social_links: {},
                    }],
                },
                error: null,
            });
        });

        const response = createResponse();
        await handler(
            { method: 'GET', query: { id: 'self-registered-player' } } as any,
            response,
        );

        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                display_name: 'Lamar Khaled Mansour',
                profile_image_url: 'https://cdn.example.com/self-registered.jpg',
                cover_image_url: 'https://cdn.example.com/self-cover.jpg',
                isSelfRegistered: true,
            }),
        }));
    });
});
