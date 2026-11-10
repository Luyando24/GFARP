import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StaffManagement from '../StaffManagement';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  Api: {
    get: apiMocks.get,
    post: apiMocks.post,
    put: apiMocks.put,
    delete: apiMocks.delete,
  },
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    session: {
      userId: 'academy-1',
      role: 'academy',
      tokens: { accessToken: 'token', expiresInSec: 3600 },
    },
  }),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: apiMocks.toast }),
}));

if (!('ResizeObserver' in globalThis)) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const member = {
  id: 'staff-1',
  email: 'ada@academy.com',
  firstName: 'Ada',
  lastName: 'Obi',
  role: 'academy_admin',
  permissions: ['players', 'training'],
  isActive: true,
  lastLogin: null,
};

function mockList() {
  apiMocks.get.mockResolvedValue({ success: true, data: { staff: [member] } });
}

describe('StaffManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList();
    apiMocks.post.mockResolvedValue({ success: true, data: {} });
    apiMocks.put.mockResolvedValue({ success: true, data: { reauthRequired: true } });
    apiMocks.delete.mockResolvedValue({ success: true, data: {} });
  });

  it('lists team members with their module access', async () => {
    render(<StaffManagement />);

    expect(await screen.findByText('Ada Obi')).toBeTruthy();
    expect(screen.getByText('ada@academy.com')).toBeTruthy();
    expect(screen.getByText('Players')).toBeTruthy();
    expect(screen.getByText('Training & attendance')).toBeTruthy();
    expect(screen.queryByText('Finances')).toBeNull();
    expect(apiMocks.get).toHaveBeenCalledWith('academy-staff');
  });

  it('adds an administrator without finance access', async () => {
    render(<StaffManagement />);
    await screen.findByText('Ada Obi');

    fireEvent.click(screen.getByRole('button', { name: 'Add team member' }));
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Chidi' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Mwale' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'chidi@academy.com' } });
    fireEvent.change(screen.getByLabelText('Temporary password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByLabelText('Allow Finances'));

    const submitButtons = screen.getAllByRole('button', { name: 'Add team member' });
    fireEvent.click(submitButtons[submitButtons.length - 1]);

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledTimes(1));
    const payload = apiMocks.post.mock.calls[0][1];
    expect(apiMocks.post.mock.calls[0][0]).toBe('academy-staff');
    expect(payload).toMatchObject({
      firstName: 'Chidi',
      lastName: 'Mwale',
      email: 'chidi@academy.com',
      role: 'academy_admin',
    });
    expect(payload.permissions).toContain('players');
    expect(payload.permissions).not.toContain('finances');
  });

  it('pauses access for a team member', async () => {
    render(<StaffManagement />);
    await screen.findByText('Ada Obi');

    fireEvent.click(screen.getByRole('button', { name: 'Pause access for Ada Obi' }));

    await waitFor(() =>
      expect(apiMocks.put).toHaveBeenCalledWith('academy-staff/staff-1', { isActive: false }),
    );
  });

  it('shows the server error when a linked account cannot be removed', async () => {
    apiMocks.delete.mockRejectedValue(new Error('This account is linked to academy records. Deactivate it instead.'));
    render(<StaffManagement />);
    await screen.findByText('Ada Obi');

    fireEvent.click(screen.getByRole('button', { name: 'Remove Ada Obi' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));

    await waitFor(() =>
      expect(apiMocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Remove failed',
          description: 'This account is linked to academy records. Deactivate it instead.',
        }),
      ),
    );
  });
});
