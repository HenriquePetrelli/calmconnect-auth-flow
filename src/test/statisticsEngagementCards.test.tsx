import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Statistics from '@/pages/Statistics';

const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'patient-1' } }) }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => {},
  },
}));

const updateStreakMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/usePatientStatistics', () => ({
  usePatientStatistics: () => ({
    recentActivities: [],
    statistics: {
      total_scheduled_consultations: 5,
      total_emergency_consultations: 1,
      total_guided_breathing_time: 30,
      total_therapeutic_sound_time: 45,
      streak_days: 3,
    },
    loading: false,
    updateStreak: updateStreakMock,
  }),
}));

const checkAchievementsMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/useAchievements', () => ({
  useAchievements: () => ({
    achievements: [{ achieved: true }, { achieved: false }, { achieved: true }],
    loading: false,
    checkAchievements: checkAchievementsMock,
  }),
}));

vi.mock('@/hooks/useWeeklyGoals', () => ({
  useWeeklyGoals: () => ({ goals: [], loading: false, fetchGoals: vi.fn() }),
}));

vi.mock('@/hooks/usePatientEngagementMetrics', () => ({
  usePatientEngagementMetrics: () => ({
    journalEntriesCount: 12,
    supportGroupParticipationCount: 4,
    appointmentCompletionRate: 80,
    loading: false,
  }),
}));

vi.mock('@/components/progress/MoodTrendChart', () => ({ MoodTrendChart: () => <div /> }));

beforeEach(() => {
  navigateMock.mockClear();
});

describe('Statistics — novas métricas de engajamento', () => {
  it('mostra anotações do diário e participação em grupos de apoio na visão geral', async () => {
    render(<Statistics />);

    expect(await screen.findByText('12')).toBeTruthy();
    expect(screen.getByText('Anotações no diário')).toBeTruthy();

    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('Grupos de apoio')).toBeTruthy();
  });

  it('mostra a taxa de comparecimento junto do card de consultas agendadas', async () => {
    render(<Statistics />);

    expect(await screen.findByText('80% de comparecimento')).toBeTruthy();
  });

  it('mostra a contagem real de conquistas desbloqueadas', async () => {
    render(<Statistics />);

    expect(await screen.findByText('2 de 3 desbloqueadas')).toBeTruthy();
  });
});
