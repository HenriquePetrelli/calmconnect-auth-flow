import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UpcomingConsultations from '@/components/psychologist/UpcomingConsultations';
import { usePsychologistSchedule } from '@/hooks/usePsychologistSchedule';

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/components/psychologist/PendingAppointments', () => ({
  default: () => null,
}));

vi.mock('@/hooks/usePsychologistSchedule', () => ({
  usePsychologistSchedule: vi.fn(),
}));

const now = new Date();
const inProgressAppointment = {
  id: 'appt-1',
  status: 'confirmed',
  duration: 50,
  appointment_type: 'regular',
  patient: { full_name: 'Paciente Um' },
  // Started 10 minutes ago, still within the 50min window -> joinable now.
  scheduled_at: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
};

describe('UpcomingConsultations — starting a call', () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it('marks the appointment in_progress before navigating to the call', async () => {
    const updateAppointment = vi.fn().mockResolvedValue({ ...inProgressAppointment, status: 'in_progress' });

    vi.mocked(usePsychologistSchedule).mockReturnValue({
      todayAppointments: [inProgressAppointment],
      upcomingAppointments: [],
      loading: false,
      updateAppointment,
    } as any);

    render(<UpcomingConsultations />);

    const button = screen.getByRole('button', { name: /entrar na chamada/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(updateAppointment).toHaveBeenCalledWith('appt-1', { status: 'in_progress' });
    });
    expect(navigateMock).toHaveBeenCalledWith('/consultation-call/appt-1');
  });

  it('does not navigate if updating the appointment status fails', async () => {
    const updateAppointment = vi.fn().mockRejectedValue(new Error('network error'));

    vi.mocked(usePsychologistSchedule).mockReturnValue({
      todayAppointments: [inProgressAppointment],
      upcomingAppointments: [],
      loading: false,
      updateAppointment,
    } as any);

    render(<UpcomingConsultations />);

    fireEvent.click(screen.getByRole('button', { name: /entrar na chamada/i }));

    await waitFor(() => {
      expect(updateAppointment).toHaveBeenCalled();
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
