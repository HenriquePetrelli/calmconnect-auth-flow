import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

import { useEmergencySOS } from '@/hooks/useEmergencySOS';
import { findPatientOpenRequest, OPEN_REQUEST_STATUSES } from '@/lib/emergencyCallGuard';

const PATIENT = '11111111-1111-4111-8111-111111111111';
const REQUEST_ID = '44444444-4444-4444-8444-444444444444';

const seedPendingRequest = () => {
  fakeDb.rows('emergency_requests').push({
    id: REQUEST_ID,
    patient_id: PATIENT,
    accepted_by: null,
    status: 'pending',
    video_room_id: null,
    room_url: null,
    started_at: null,
    ended_at: null,
    ended_by: null,
    ended_by_type: null,
    end_reason: null,
    created_at: new Date().toISOString(),
  });
};

const currentRow = () => fakeDb.rows('emergency_requests').find((r) => r.id === REQUEST_ID);

describe('Cancelamento de SOS mantém histórico', () => {
  beforeEach(() => {
    fakeDb.reset();
    fakeDb.setUser(PATIENT);
    seedPendingRequest();
  });

  it('marca a solicitação como cancelled em vez de apagar a linha', async () => {
    const { result } = renderHook(() => useEmergencySOS());

    await act(async () => {
      await result.current.cancelRequest(REQUEST_ID, 'cancelled_by_patient');
    });

    const row = currentRow();
    expect(row).toBeDefined();
    expect(row!.status).toBe('cancelled');
    expect(row!.ended_by).toBe(PATIENT);
    expect(row!.ended_by_type).toBe('patient');
    expect(row!.end_reason).toBe('cancelled_by_patient');
    expect(row!.ended_at).toBeTruthy();
  });

  it('registra o motivo "abandoned" quando o paciente sai da tela de espera', async () => {
    const { result } = renderHook(() => useEmergencySOS());

    await act(async () => {
      await result.current.cancelRequest(REQUEST_ID, 'abandoned');
    });

    expect(currentRow()!.end_reason).toBe('abandoned');
  });

  it('uma solicitação cancelada não conta como solicitação aberta', async () => {
    const { result } = renderHook(() => useEmergencySOS());

    await act(async () => {
      await result.current.cancelRequest(REQUEST_ID);
    });

    expect(await findPatientOpenRequest(PATIENT)).toBeNull();
    expect(OPEN_REQUEST_STATUSES).not.toContain('cancelled');
  });

  it('não altera uma solicitação que já foi aceita', async () => {
    currentRow()!.status = 'accepted';
    const { result } = renderHook(() => useEmergencySOS());

    await act(async () => {
      await result.current.cancelRequest(REQUEST_ID);
    });

    expect(currentRow()!.status).toBe('accepted');
    expect(currentRow()!.end_reason).toBeNull();
  });

  it('a máquina de estados não usa mais waiting nem rejected', () => {
    expect(OPEN_REQUEST_STATUSES).toEqual(['pending', 'accepted', 'in_progress']);
  });
});
