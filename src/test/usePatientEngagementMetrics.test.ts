import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

const mockUser = { id: 'patient-1' };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

import { usePatientEngagementMetrics } from '@/hooks/usePatientEngagementMetrics';

const PATIENT = mockUser.id;

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.writes = [];
});

describe('usePatientEngagementMetrics', () => {
  it('sem nenhum dado, tudo fica zerado e a taxa de comparecimento fica null', async () => {
    const { result } = renderHook(() => usePatientEngagementMetrics());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.journalEntriesCount).toBe(0);
    expect(result.current.supportGroupParticipationCount).toBe(0);
    expect(result.current.appointmentCompletionRate).toBeNull();
  });

  it('conta só as anotações do diário e depoimentos do próprio paciente', async () => {
    fakeDb.rows('private_journals').push(
      { id: 'j1', user_id: PATIENT, texto: 'a', humor: 3 },
      { id: 'j2', user_id: PATIENT, texto: 'b', humor: 4 },
      { id: 'j3', user_id: 'outro-paciente', texto: 'c', humor: 2 }
    );
    fakeDb.rows('group_testimonials').push(
      { id: 't1', user_id: PATIENT, group_id: 'g1', texto: 'x', humor: 3 },
      { id: 't2', user_id: 'outro-paciente', group_id: 'g1', texto: 'y', humor: 3 }
    );

    const { result } = renderHook(() => usePatientEngagementMetrics());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.journalEntriesCount).toBe(2);
    expect(result.current.supportGroupParticipationCount).toBe(1);
  });

  it('calcula a taxa de comparecimento só sobre consultas finalizadas, ignorando as pendentes/agendadas', async () => {
    fakeDb.rows('appointments').push(
      { id: 'a1', patient_id: PATIENT, status: 'completed' },
      { id: 'a2', patient_id: PATIENT, status: 'completed' },
      { id: 'a3', patient_id: PATIENT, status: 'completed' },
      { id: 'a4', patient_id: PATIENT, status: 'cancelled' },
      { id: 'a5', patient_id: PATIENT, status: 'pending' }, // não conta pro cálculo
      { id: 'a6', patient_id: PATIENT, status: 'scheduled' }, // não conta pro cálculo
      { id: 'a7', patient_id: 'outro-paciente', status: 'cancelled' } // não é do usuário logado
    );

    const { result } = renderHook(() => usePatientEngagementMetrics());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // 3 concluídas de 4 finalizadas (3 completed + 1 cancelled) = 75%
    expect(result.current.appointmentCompletionRate).toBe(75);
  });
});
