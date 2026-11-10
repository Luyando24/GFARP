import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TrainingAttendanceManager from '../TrainingAttendanceManager';

const apiMocks = vi.hoisted(() => ({
  getTrainingSessions: vi.fn(),
  getTrainingLocations: vi.fn(),
  getTrainingSessionRoster: vi.fn(),
  saveTrainingAttendance: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  Api: {
    getTrainingSessions: apiMocks.getTrainingSessions,
    getTrainingLocations: apiMocks.getTrainingLocations,
    getTrainingSessionRoster: apiMocks.getTrainingSessionRoster,
    saveTrainingAttendance: apiMocks.saveTrainingAttendance,
  },
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: apiMocks.toast }),
}));

const session = {
  id: 'session-1',
  sessionNumber: 'TS-001',
  title: 'Evening Training',
  description: '',
  sessionDate: '2026-11-10T16:00:00.000Z',
  durationMinutes: 90,
  locationId: null,
  location: 'Main Ground',
  intensity: 'medium',
  status: 'scheduled',
  markedCount: 0,
  attendedCount: 0,
  absentCount: 0,
  attendanceRate: 0,
  createdAt: '2026-11-10T08:00:00.000Z',
};

const roster = [
  {
    id: 'player-1',
    playerSource: 'academy',
    firstName: 'Amina',
    lastName: 'Banda',
    email: 'amina@example.com',
    position: 'Midfielder',
    dateOfBirth: '2010-04-12',
    isSelfRegistered: false,
    attendanceStatus: 'absent',
    isMarked: false,
  },
  {
    id: 'player-2',
    playerSource: 'academy',
    firstName: 'Joseph',
    lastName: 'Phiri',
    email: 'joseph@example.com',
    position: 'Goalkeeper',
    dateOfBirth: '2012-01-01',
    isSelfRegistered: false,
    attendanceStatus: 'absent',
    isMarked: false,
  },
];

async function openRoster() {
  render(<TrainingAttendanceManager academyId="academy-1" />);
  await screen.findByText('Evening Training');
  fireEvent.click(screen.getByText('Evening Training'));
  await screen.findByText('Amina Banda');
}

function openSearchModeSelect() {
  fireEvent.pointerDown(screen.getByRole('combobox', { name: 'Search players by' }), {
    button: 0,
    pointerType: 'mouse',
  });
}

describe('TrainingAttendanceManager search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    apiMocks.getTrainingSessions.mockResolvedValue({
      data: {
        sessions: [session],
        summary: { total: 1, upcoming: 1, completed: 0, averageAttendance: 0 },
      },
    });
    apiMocks.getTrainingLocations.mockResolvedValue({ data: { locations: [] } });
    apiMocks.getTrainingSessionRoster.mockResolvedValue({ data: { players: roster } });
  });

  it('filters the roster by date of birth when that mode is selected', async () => {
    await openRoster();
    expect(screen.getByText('Joseph Phiri')).toBeInTheDocument();

    openSearchModeSelect();
    fireEvent.click(await screen.findByRole('option', { name: 'Date of birth' }));

    const search = screen.getByPlaceholderText('e.g. 2012 or 15/03/2012');
    fireEvent.change(search, { target: { value: '2010' } });

    await waitFor(() => {
      expect(screen.getByText('Amina Banda')).toBeInTheDocument();
      expect(screen.queryByText('Joseph Phiri')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Born 12/04/2010')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: '01/01/2012' } });
    await waitFor(() => {
      expect(screen.getByText('Joseph Phiri')).toBeInTheDocument();
      expect(screen.queryByText('Amina Banda')).not.toBeInTheDocument();
    });
  });

  it('shows an empty state when no player matches the entered date', async () => {
    await openRoster();

    openSearchModeSelect();
    fireEvent.click(await screen.findByRole('option', { name: 'Date of birth' }));

    fireEvent.change(screen.getByPlaceholderText('e.g. 2012 or 15/03/2012'), {
      target: { value: '1999' },
    });

    expect(await screen.findByText('No players match your search')).toBeInTheDocument();
  });

  it('lets the quick buttons mark a player present or absent', async () => {
    await openRoster();

    fireEvent.click(screen.getByRole('button', { name: 'Mark Amina Banda present' }));
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'Attendance for Amina Banda' }),
      ).toHaveTextContent('Present'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark Amina Banda absent' }));
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'Attendance for Amina Banda' }),
      ).toHaveTextContent('Absent'),
    );
  });
});
