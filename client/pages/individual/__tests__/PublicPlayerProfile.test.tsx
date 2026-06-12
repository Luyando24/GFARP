import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PublicPlayerProfile from '../PublicPlayerProfile';

// Mock the react-helmet-async hook if needed or the custom usePageTitle hook
vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

describe('PublicPlayerProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  const renderComponent = (initialEntries: string[]) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/:slug" element={<PublicPlayerProfile />} />
          <Route path="/id/:id" element={<PublicPlayerProfile />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders loading state initially', () => {
    // Keep fetch unresolved to test loading state
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));
    
    const { container } = renderComponent(['/john-doe']);
    
    // Check if the loading spinner container is rendered
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders 404 state if fetch fails', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
    });

    renderComponent(['/unknown']);

    await waitFor(() => {
      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByText('Profile not found or unavailable')).toBeInTheDocument();
    });
  });

  it('renders player profile successfully', async () => {
    const mockProfile = {
      display_name: 'John Doe',
      position: 'Forward',
      nationality: 'Brazil',
      age: 21,
      current_club: 'Santos FC',
      bio: 'A highly rated young forward.',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile,
    });

    renderComponent(['/john-doe']);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getAllByText('Forward')[0]).toBeInTheDocument();
      expect(screen.getByText('Brazil')).toBeInTheDocument();
      expect(screen.getByText('Santos FC')).toBeInTheDocument();
      expect(screen.getByText('A highly rated young forward.')).toBeInTheDocument();
    });
  });
});
