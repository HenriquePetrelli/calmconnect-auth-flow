import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

const mockUser = { id: 'patient-1' };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

import { usePatientStatistics } from '@/hooks/usePatientStatistics';
import { getCurrentWeekRange } from '@/hooks/useWeeklyGoals';

const PATIENT = mockUser.id;

const seedGoal = (id: string, category: string) => {
  const { weekStart, weekEnd } = getCurrentWeekRange();
  fakeDb.rows('patient_weekly_goals').push({
    id,
    user_id: PATIENT,
    goal_id: `${id}-template`,
    target: 5,
    progress: 0,
    completed: false,
    week_start_date: weekStart,
    week_end_date: weekEnd,
    created_at: new Date().toISOString(),
    weekly_goals: { id: `${id}-template`, category, title: category },
  });
};

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.writes = [];
});

describe('usePatientStatistics.addActivity — mapeamento de categoria por prefixo', () => {
  it('"Sons Terapêuticos: <nome do som>" avança a meta da categoria sound', async () => {
    seedGoal('pwg-sound', 'sound');
    const { result } = renderHook(() => usePatientStatistics());
    await settle();

    await act(async () => {
      await result.current.addActivity('Sons Terapêuticos: Chuva');
    });

    expect(fakeDb.rows('patient_weekly_goals').find((g) => g.id === 'pwg-sound')?.progress).toBe(1);
  });

  it('"Grupo de Apoio: <nome do grupo>" avança a meta da categoria support_group', async () => {
    seedGoal('pwg-support', 'support_group');
    const { result } = renderHook(() => usePatientStatistics());
    await settle();

    await act(async () => {
      await result.current.addActivity('Grupo de Apoio: Ansiedade');
    });

    expect(fakeDb.rows('patient_weekly_goals').find((g) => g.id === 'pwg-support')?.progress).toBe(1);
  });

  it('"Consulta com Psicólogo" avança a meta da categoria appointment', async () => {
    seedGoal('pwg-appt', 'appointment');
    const { result } = renderHook(() => usePatientStatistics());
    await settle();

    await act(async () => {
      await result.current.addActivity('Consulta com Psicólogo');
    });

    expect(fakeDb.rows('patient_weekly_goals').find((g) => g.id === 'pwg-appt')?.progress).toBe(1);
  });

  it('atividade sem categoria mapeada não mexe em nenhuma meta e não quebra', async () => {
    seedGoal('pwg-sound', 'sound');
    const { result } = renderHook(() => usePatientStatistics());
    await settle();

    await act(async () => {
      await expect(result.current.addActivity('Algo Não Mapeado')).resolves.toBeUndefined();
    });

    expect(fakeDb.rows('patient_weekly_goals').find((g) => g.id === 'pwg-sound')?.progress).toBe(0);
  });
});
