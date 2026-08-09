import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

import {
  persistExplicitTermination,
  isRealTermination,
  isStaleCompletedSession,
  getTerminationMessage,
} from '@/lib/callTermination';

const PATIENT = '11111111-1111-4111-8111-111111111111';
const PSYCHOLOGIST = '22222222-2222-4222-8222-222222222222';
const REQUEST_ID = '33333333-3333-4333-8333-333333333333';
const SESSION_ID = '44444444-4444-4444-8444-444444444444';

const request = () => fakeDb.rows('emergency_requests')[0];
const session = () => fakeDb.rows('webrtc_sessions')[0];

const seedOngoingCall = (startedMinutesAgo = 10) => {
  fakeDb.rows('emergency_requests').push({
    id: REQUEST_ID,
    patient_id: PATIENT,
    accepted_by: PSYCHOLOGIST,
    status: 'in_progress',
    video_room_id: SESSION_ID,
    started_at: new Date(Date.now() - startedMinutesAgo * 60_000).toISOString(),
    ended_at: null,
    ended_by: null,
    ended_by_type: null,
    end_reason: null,
    duration: null,
  });
  fakeDb.rows('webrtc_sessions').push({
    id: SESSION_ID,
    emergency_request_id: REQUEST_ID,
    patient_id: PATIENT,
    psychologist_id: PSYCHOLOGIST,
    status: 'active',
    ended_at: null,
    ended_by: null,
    ended_by_type: null,
    end_reason: null,
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
  });
};

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.writes = [];
  fakeDb.failNextWith = null;
  fakeDb.failSelectWith = null;
  fakeDb.currentUserId = PATIENT;
  seedOngoingCall();
});

describe('encerramento explícito da chamada emergencial', () => {
  it('persiste status, autor, motivo e duração em emergency_requests', async () => {
    const { duration } = await persistExplicitTermination(fakeSupabase, {
      requestId: REQUEST_ID,
      sessionId: SESSION_ID,
      userId: PATIENT,
      endedByType: 'patient',
      reason: 'completed_by_patient',
    });

    expect(duration).toBeGreaterThanOrEqual(595); // ~10 min
    expect(request()).toMatchObject({
      status: 'completed',
      ended_by: PATIENT,
      ended_by_type: 'patient',
      end_reason: 'completed_by_patient',
      duration,
    });
    expect(request().ended_at).toBeTruthy();
  });

  it('marca a sessão WebRTC como completed com os mesmos metadados', async () => {
    await persistExplicitTermination(fakeSupabase, {
      requestId: REQUEST_ID,
      sessionId: SESSION_ID,
      userId: PSYCHOLOGIST,
      endedByType: 'psychologist',
      reason: 'completed_by_psychologist',
    });

    expect(session()).toMatchObject({
      status: 'completed',
      ended_by: PSYCHOLOGIST,
      ended_by_type: 'psychologist',
      end_reason: 'completed_by_psychologist',
    });
    expect(request().ended_by_type).toBe('psychologist');
  });

  it('grava duração 0 quando a chamada nunca chegou a começar', async () => {
    request().started_at = null;

    const { duration } = await persistExplicitTermination(fakeSupabase, {
      requestId: REQUEST_ID,
      sessionId: SESSION_ID,
      userId: PATIENT,
      endedByType: 'patient',
    });

    expect(duration).toBe(0);
    expect(request().duration).toBe(0);
  });

  it('o outro participante reconhece o encerramento como real', async () => {
    const joinedAt = Date.now() - 60_000;

    await persistExplicitTermination(fakeSupabase, {
      requestId: REQUEST_ID,
      sessionId: SESSION_ID,
      userId: PSYCHOLOGIST,
      endedByType: 'psychologist',
    });

    expect(isRealTermination(session(), joinedAt)).toBe(true);
    expect(isStaleCompletedSession(session(), joinedAt)).toBe(false);
    expect(getTerminationMessage(session().ended_by_type)).toBe(
      'O psicólogo encerrou a chamada de vídeo.'
    );
  });
});

describe('fechamentos do app não encerram a chamada', () => {
  it('fechar a aba/app não escreve nada em emergency_requests', async () => {
    // Simula unload: nenhuma chamada a persistExplicitTermination.
    window.dispatchEvent(new Event('beforeunload'));
    window.dispatchEvent(new Event('pagehide'));

    expect(request().status).toBe('in_progress');
    expect(request().ended_at).toBeNull();
    expect(request().ended_by).toBeNull();
    expect(session().status).toBe('active');
    expect(fakeDb.writes.filter((w: any) => w.type !== 'insert')).toHaveLength(0);
  });

  it('sessão sem ended_by/ended_by_type nunca é tratada como encerramento', () => {
    session().status = 'completed';
    session().ended_at = new Date().toISOString();

    expect(isRealTermination(session(), Date.now() - 60_000)).toBe(false);
    expect(isStaleCompletedSession(session(), Date.now() - 60_000)).toBe(true);
  });

  it('linha completed de uma chamada anterior não gera aviso ao reentrar', () => {
    Object.assign(session(), {
      status: 'completed',
      ended_at: new Date(Date.now() - 86_400_000).toISOString(),
      ended_by: PSYCHOLOGIST,
      ended_by_type: 'psychologist',
    });

    const joinedNow = Date.now();
    expect(isRealTermination(session(), joinedNow)).toBe(false);
    expect(isStaleCompletedSession(session(), joinedNow)).toBe(true);
  });

  it('queda de rede (status disconnected) não finaliza a sessão', () => {
    session().status = 'disconnected';

    expect(isRealTermination(session(), Date.now() - 60_000)).toBe(false);
    expect(request().status).toBe('in_progress');
  });

  it('propaga erro e não deixa a request meio-encerrada quando o update falha', async () => {
    fakeDb.failNextWith = { message: 'network error' };

    await expect(
      persistExplicitTermination(fakeSupabase, {
        requestId: REQUEST_ID,
        sessionId: SESSION_ID,
        userId: PATIENT,
        endedByType: 'patient',
      })
    ).rejects.toBeTruthy();

    expect(session().status).toBe('active'); // sessão não foi tocada
  });
});
