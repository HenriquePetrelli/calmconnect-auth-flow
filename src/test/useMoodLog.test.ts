import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

// Referência estável — objeto novo a cada render quebraria hooks que
// dependem de `user` em efeitos (usePatientStatistics, useWeeklyGoals).
const mockUser = { id: 'patient-1' };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

import { useMoodLog } from '@/hooks/useMoodLog';
import { getCurrentWeekRange } from '@/hooks/useWeeklyGoals';

const PATIENT = mockUser.id;
const today = () => new Date().toISOString().split('T')[0];

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.writes = [];
});

describe('useMoodLog', () => {
  it('grava o agregado em patients e cria a entrada de hoje em patient_mood_logs', async () => {
    fakeDb.rows('patients').push({
      user_id: PATIENT,
      daily_mood_count: 0,
      daily_mood_sum: 0,
      last_mood_date: null,
      last_mood_value: null,
    });

    const { result } = renderHook(() => useMoodLog());

    await act(async () => {
      const ok = await result.current.logMood(4);
      expect(ok).toBe(true);
    });

    const patientRow = fakeDb.rows('patients')[0];
    expect(patientRow.daily_mood_count).toBe(1);
    expect(patientRow.daily_mood_sum).toBe(4);
    expect(patientRow.last_mood_value).toBe(4);
    expect(patientRow.last_mood_date).toBe(today());

    const logs = fakeDb.rows('patient_mood_logs');
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ patient_id: PATIENT, mood_value: 4, logged_date: today() });
  });

  it('registrar de novo no mesmo dia substitui o valor em vez de duplicar', async () => {
    fakeDb.rows('patients').push({
      user_id: PATIENT,
      daily_mood_count: 1,
      daily_mood_sum: 3,
      last_mood_date: today(),
      last_mood_value: 3,
    });
    fakeDb.rows('patient_mood_logs').push({
      id: 'log-1',
      patient_id: PATIENT,
      mood_value: 3,
      logged_date: today(),
    });

    const { result } = renderHook(() => useMoodLog());

    await act(async () => {
      await result.current.logMood(5);
    });

    const patientRow = fakeDb.rows('patients')[0];
    expect(patientRow.daily_mood_count).toBe(1); // não incrementa de novo no mesmo dia
    expect(patientRow.daily_mood_sum).toBe(5); // desconta o 3 antigo, soma o 5 novo

    const logs = fakeDb.rows('patient_mood_logs');
    expect(logs).toHaveLength(1);
    expect(logs[0].mood_value).toBe(5);
  });

  it('conta como atividade e avança a meta semanal da categoria mood', async () => {
    fakeDb.rows('patients').push({
      user_id: PATIENT,
      daily_mood_count: 0,
      daily_mood_sum: 0,
      last_mood_date: null,
      last_mood_value: null,
    });

    const { weekStart, weekEnd } = getCurrentWeekRange();
    fakeDb.rows('patient_weekly_goals').push({
      id: 'pwg-mood',
      user_id: PATIENT,
      goal_id: 'goal-mood',
      target: 7,
      progress: 0,
      completed: false,
      week_start_date: weekStart,
      week_end_date: weekEnd,
      created_at: new Date().toISOString(),
      // fakeSupabase não simula o embedding do PostgREST — semeia o objeto
      // já aninhado do jeito que `select('*, weekly_goals(*)')' devolveria.
      weekly_goals: { id: 'goal-mood', category: 'mood', title: 'Humor Diário', target: 7 },
    });

    const { result } = renderHook(() => useMoodLog());

    // Deixa o `useWeeklyGoals` interno (composto via usePatientStatistics)
    // terminar de buscar as metas da semana antes de registrar o humor —
    // senão `checkAndUpdateGoals` roda contra um `goals` ainda vazio.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.logMood(5);
    });

    const goalRow = fakeDb.rows('patient_weekly_goals').find((g) => g.id === 'pwg-mood');
    expect(goalRow?.progress).toBe(1);
    expect(goalRow?.completed).toBe(false);

    const activities = fakeDb.rows('patient_statistics');
    expect(activities).toHaveLength(1);
  });
});
