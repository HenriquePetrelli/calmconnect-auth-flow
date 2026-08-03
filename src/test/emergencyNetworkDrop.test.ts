import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

import { isRealTermination, isStaleCompletedSession } from '@/lib/callTermination';
import { getReconnectDelay, MAX_RECONNECT_ATTEMPTS } from '@/lib/reconnect';
import { findOngoingCallForUser, sessionIdOf } from '@/lib/emergencyCallGuard';
import { validateWebRTCSession } from '@/utils/session-validation';

const PATIENT = '11111111-1111-4111-8111-111111111111';
const PSYCHOLOGIST = '22222222-2222-4222-8222-222222222222';
const REQUEST_ID = '44444444-4444-4444-8444-444444444444';
const SESSION_ID = '55555555-5555-4555-8555-555555555555';

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

/** Ongoing emergency call: request in progress + active webrtc session. */
const startOngoingCall = () => {
  fakeDb.rows('emergency_requests').push({
    id: REQUEST_ID,
    patient_id: PATIENT,
    accepted_by: PSYCHOLOGIST,
    status: 'in_progress',
    video_room_id: SESSION_ID,
    room_url: SESSION_ID,
    started_at: new Date(Date.now() - 120_000).toISOString(),
    ended_at: null,
    created_at: new Date(Date.now() - 180_000).toISOString(),
  });
  fakeDb.rows('webrtc_sessions').push({
    id: SESSION_ID,
    emergency_request_id: REQUEST_ID,
    psychologist_id: PSYCHOLOGIST,
    patient_id: PATIENT,
    status: 'active',
    expires_at: hoursFromNow(24),
    ended_at: null,
    ended_by: null,
    ended_by_type: null,
  });
};

const currentSession = () => fakeDb.rows('webrtc_sessions')[0];

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.writes = [];
  fakeDb.failNextWith = null;
  fakeDb.failSelectWith = null;
  fakeDb.currentUserId = PATIENT;
  localStorage.clear();
  startOngoingCall();
});

describe('queda de rede durante a chamada emergencial', () => {
  it('não mostra aviso de encerramento quando o par some por perda de rede', () => {
    const joinedAt = Date.now() - 60_000;
    // Peer dropped: presence left, but nobody wrote a termination in the DB.
    expect(isRealTermination(currentSession(), joinedAt)).toBe(false);
    expect(isStaleCompletedSession(currentSession(), joinedAt)).toBe(false);
  });

  it('mantém a sessão aberta no banco durante a queda (nenhuma escrita de encerramento)', async () => {
    const joinedAt = Date.now() - 60_000;

    // Simulate offline → online without any call-ending code path running.
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));

    const endingWrites = fakeDb.writes.filter(
      (w: any) => w?.patch?.status === 'completed' || w?.patch?.ended_at
    );
    expect(endingWrites).toHaveLength(0);
    expect(currentSession().status).toBe('active');
    expect(currentSession().ended_at).toBeNull();
    expect(isRealTermination(currentSession(), joinedAt)).toBe(false);
  });

  it('permite reentrar na mesma sala após reconectar', async () => {
    const ongoing = await findOngoingCallForUser(PATIENT);
    expect(sessionIdOf(ongoing)).toBe(SESSION_ID);

    const session = await validateWebRTCSession(SESSION_ID);
    expect(session.id).toBe(SESSION_ID);
    expect(session.status).not.toBe('completed');
  });

  it('estende a sessão vencida durante uma queda longa em vez de encerrá-la', async () => {
    currentSession().expires_at = hoursFromNow(-2);

    const session = await validateWebRTCSession(SESSION_ID);
    expect(new Date(session.expires_at!).getTime()).toBeGreaterThan(Date.now());
    expect(currentSession().status).toBe('active');
  });

  it('usa backoff exponencial limitado nas tentativas de reconexão', () => {
    const delays = [1, 2, 3, 4, 5, 6].map(getReconnectDelay);
    expect(delays).toEqual([1000, 2000, 4000, 8000, 8000, 8000]);
    expect(MAX_RECONNECT_ATTEMPTS).toBeGreaterThan(1);
  });

  it('após esgotar as tentativas a chamada continua aberta (sem encerramento)', () => {
    const joinedAt = Date.now() - 60_000;
    for (let i = 0; i < MAX_RECONNECT_ATTEMPTS + 2; i++) getReconnectDelay(i + 1);

    expect(currentSession().status).toBe('active');
    expect(isRealTermination(currentSession(), joinedAt)).toBe(false);
  });

  it('só avisa encerramento quando o par realmente encerra depois da reconexão', () => {
    const joinedAt = Date.now() - 60_000;
    Object.assign(currentSession(), {
      status: 'completed',
      ended_by: PSYCHOLOGIST,
      ended_by_type: 'psychologist',
      ended_at: new Date().toISOString(),
    });
    expect(isRealTermination(currentSession(), joinedAt)).toBe(true);
  });
});
