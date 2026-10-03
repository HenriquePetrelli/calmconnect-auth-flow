import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

import { dismissAppointmentFeedback, usePendingCallFeedback } from '@/hooks/usePendingCallFeedback';
import { canRateAppointment } from '@/lib/appointmentRating';

const user = { id: 'pat' };
let auth: { user: typeof user; userType: string } = { user, userType: 'patient' };
const recent = new Date(Date.now() - 2 * 3_600_000).toISOString();

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.writes = [];
  localStorage.clear();
  auth = { user, userType: 'patient' };
  fakeDb.seed('emergency_requests', []);
  fakeDb.seed('session_feedback', []);
});

describe('avaliação da consulta agendada', () => {
  it('pede a avaliação de consulta concluída e ainda não avaliada (sem bloquear)', async () => {
    fakeDb.seed('appointments', [
      { id: 'a1', patient_id: 'pat', status: 'completed', video_room_id: 's1', scheduled_at: recent },
    ]);
    const { result } = renderHook(() => usePendingCallFeedback());
    await waitFor(() => expect(result.current.pending).toMatchObject({ kind: 'appointment', sessionId: 's1', requestId: 'a1' }));
  });

  it('não pede de novo depois de avaliada ou pulada', async () => {
    fakeDb.seed('appointments', [
      { id: 'a1', patient_id: 'pat', status: 'completed', video_room_id: 's1', scheduled_at: recent },
      { id: 'a2', patient_id: 'pat', status: 'completed', video_room_id: 's2', scheduled_at: recent },
    ]);
    fakeDb.seed('session_feedback', [{ session_id: 's1', user_id: 'pat', rating: 5 }]);
    dismissAppointmentFeedback('s2');
    const { result } = renderHook(() => usePendingCallFeedback());
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current.pending).toBeNull();
  });

  it('SOS sem avaliação vem antes (e continua obrigatório)', async () => {
    fakeDb.seed('emergency_requests', [
      { id: 'e1', patient_id: 'pat', video_room_id: 'se', ended_at: recent, started_at: recent },
    ]);
    fakeDb.seed('appointments', [
      { id: 'a1', patient_id: 'pat', status: 'completed', video_room_id: 's1', scheduled_at: recent },
    ]);
    const { result } = renderHook(() => usePendingCallFeedback());
    await waitFor(() => expect(result.current.pending).toMatchObject({ kind: 'emergency', sessionId: 'se' }));
  });

  it('psicólogo não recebe o convite de avaliar consulta agendada', async () => {
    auth = { user: { id: 'psy' }, userType: 'psychologist' };
    fakeDb.seed('appointments', [
      { id: 'a1', patient_id: 'pat', psychologist_id: 'psy', status: 'completed', video_room_id: 's1', scheduled_at: recent },
    ]);
    const { result } = renderHook(() => usePendingCallFeedback());
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current.pending).toBeNull();
  });

  it('pelo histórico, avalia até 30 dias depois', () => {
    const now = Date.now();
    const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();
    expect(canRateAppointment({ status: 'completed', scheduled_at: daysAgo(10), video_room_id: 's' }, now)).toBe(true);
    expect(canRateAppointment({ status: 'completed', scheduled_at: daysAgo(40), video_room_id: 's' }, now)).toBe(false);
    expect(canRateAppointment({ status: 'completed', scheduled_at: daysAgo(1), video_room_id: null }, now)).toBe(false);
    expect(canRateAppointment({ status: 'cancelled', scheduled_at: daysAgo(1), video_room_id: 's' }, now)).toBe(false);
  });
});
