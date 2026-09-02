import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

const mockUser = { id: 'patient-1' };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

import { usePatientMoodHistory } from '@/hooks/usePatientMoodHistory';

const PATIENT = mockUser.id;

const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.writes = [];
});

describe('usePatientMoodHistory', () => {
  it('sem nenhum registro, entries fica vazio e average/trend ficam null', async () => {
    const { result } = renderHook(() => usePatientMoodHistory(30));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.entries).toEqual([]);
    expect(result.current.average).toBeNull();
    expect(result.current.trend).toBeNull();
  });

  it('traz só os registros dentro da janela de dias, ordenados por data', async () => {
    fakeDb.rows('patient_mood_logs').push(
      { patient_id: PATIENT, mood_value: 3, logged_date: daysAgo(40) }, // fora da janela de 30 dias
      { patient_id: PATIENT, mood_value: 5, logged_date: daysAgo(2) },
      { patient_id: PATIENT, mood_value: 2, logged_date: daysAgo(10) },
      { patient_id: 'outro-paciente', mood_value: 1, logged_date: daysAgo(1) } // não é do usuário logado
    );

    const { result } = renderHook(() => usePatientMoodHistory(30));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.entries).toEqual([
      { date: daysAgo(10), value: 2 },
      { date: daysAgo(2), value: 5 },
    ]);
    expect(result.current.average).toBe(3.5);
  });

  it('calcula tendência de alta quando a segunda metade do período está melhor que a primeira', async () => {
    fakeDb.rows('patient_mood_logs').push(
      { patient_id: PATIENT, mood_value: 1, logged_date: daysAgo(8) },
      { patient_id: PATIENT, mood_value: 1, logged_date: daysAgo(6) },
      { patient_id: PATIENT, mood_value: 5, logged_date: daysAgo(4) },
      { patient_id: PATIENT, mood_value: 5, logged_date: daysAgo(2) }
    );

    const { result } = renderHook(() => usePatientMoodHistory(30));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.trend).toBe('up');
  });

  it('menos de 4 registros não é suficiente pra calcular tendência', async () => {
    fakeDb.rows('patient_mood_logs').push(
      { patient_id: PATIENT, mood_value: 1, logged_date: daysAgo(3) },
      { patient_id: PATIENT, mood_value: 5, logged_date: daysAgo(1) }
    );

    const { result } = renderHook(() => usePatientMoodHistory(30));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.trend).toBeNull();
  });
});
