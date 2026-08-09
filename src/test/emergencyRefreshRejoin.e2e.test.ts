import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

import { acquireCallLock, getCallLock } from '@/lib/callLock';
import { findOngoingCallForUser, sessionIdOf } from '@/lib/emergencyCallGuard';
import { validateWebRTCSession } from '@/utils/session-validation';
import { isRealTermination, isStaleCompletedSession, persistExplicitTermination } from '@/lib/callTermination';
import { attachCallSignalChannel } from '@/lib/callSignals';
import { END_REASONS } from '@/lib/emergencyEndReasons';

const PATIENT = '11111111-1111-4111-8111-111111111111';
const PSYCHOLOGIST = '22222222-2222-4222-8222-222222222222';
const REQUEST_ID = '33333333-3333-4333-8333-333333333333';
const SESSION_ID = '44444444-4444-4444-8444-444444444444';

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
const session = () => fakeDb.rows('webrtc_sessions')[0];
const request = () => fakeDb.rows('emergency_requests')[0];

const startOngoingCall = (timeLeft = 900) => {
  fakeDb.rows('emergency_requests').push({
    id: REQUEST_ID,
    patient_id: PATIENT,
    accepted_by: PSYCHOLOGIST,
    status: 'in_progress',
    video_room_id: SESSION_ID,
    room_url: SESSION_ID,
    started_at: new Date(Date.now() - 300_000).toISOString(),
    ended_at: null,
    ended_by: null,
    ended_by_type: null,
    end_reason: null,
    created_at: new Date(Date.now() - 360_000).toISOString(),
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
    end_reason: null,
    time_left_seconds: timeLeft,
    timer_paused: false,
  });
};

/** Reads the shared timer exactly like `useSharedCallTimer` does on mount. */
const restoreTimer = async (fallback: number) => {
  const { data } = await fakeSupabase
    .from('webrtc_sessions')
    .select('time_left_seconds')
    .eq('id', SESSION_ID)
    .maybeSingle();
  const stored = (data as any)?.time_left_seconds;
  return typeof stored === 'number' ? Math.max(0, stored) : fallback;
};

/** Simulates a page refresh: local state is dropped, the DB survives. */
const refreshPage = () => {
  localStorage.removeItem(`soliv_call_lock_${PATIENT}`);
  localStorage.removeItem(`soliv_call_lock_${PSYCHOLOGIST}`);
};

/** Full re-entry as done by the call screen after a reload. */
const reenterRoom = async (userId: string) => {
  const ongoing = await findOngoingCallForUser(userId);
  const sessionId = sessionIdOf(ongoing);
  if (!sessionId) return null;
  const validated = await validateWebRTCSession(sessionId);
  const lock = acquireCallLock(userId, sessionId);
  return { ongoing, sessionId, validated, lock, joinedAt: Date.now() };
};

const makePeerPair = () => {
  const makeChannel = () => ({
    readyState: 'open',
    peer: null as any,
    onmessage: null as null | ((e: { data: unknown }) => void),
    send(data: string) {
      this.peer?.onmessage?.({ data });
    },
    close() {
      this.readyState = 'closed';
    },
  });

  const aOut = makeChannel();
  const bOut = makeChannel();
  const pcA: any = { ondatachannel: null, createDataChannel: () => aOut };
  const pcB: any = { ondatachannel: null, createDataChannel: () => bOut };

  return {
    pcA,
    pcB,
    connect() {
      aOut.peer = bOut;
      bOut.peer = aOut;
      pcB.ondatachannel?.({ channel: bOut });
      pcA.ondatachannel?.({ channel: aOut });
    },
  };
};

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.writes = [];
  fakeDb.failNextWith = null;
  fakeDb.failSelectWith = null;
  fakeDb.currentUserId = PATIENT;
  localStorage.clear();
  startOngoingCall();
});

describe('SOS — refresh no meio da chamada', () => {
  it('o refresh não encerra a chamada nem altera a solicitação', async () => {
    refreshPage();
    await reenterRoom(PATIENT);

    const endingWrites = fakeDb.writes.filter(
      (w: any) => w?.patch?.status === 'completed' || w?.patch?.ended_at
    );
    expect(endingWrites).toHaveLength(0);
    expect(request().status).toBe('in_progress');
    expect(session().status).toBe('active');
  });

  it('o paciente reentra na MESMA sala após o refresh', async () => {
    refreshPage();
    const state = await reenterRoom(PATIENT);

    expect(state?.sessionId).toBe(SESSION_ID);
    expect(state?.validated.id).toBe(SESSION_ID);
    expect(state?.validated.status).not.toBe('completed');
    expect(fakeDb.rows('webrtc_sessions')).toHaveLength(1);
  });

  it('o psicólogo também reentra na mesma sala e o lock é readquirido', async () => {
    refreshPage();
    const state = await reenterRoom(PSYCHOLOGIST);

    expect(state?.sessionId).toBe(SESSION_ID);
    expect(state?.lock.ok).toBe(true);
    expect(getCallLock(PSYCHOLOGIST)?.sessionId).toBe(SESSION_ID);
  });

  it('o timer compartilhado retoma exatamente de onde parou', async () => {
    session().time_left_seconds = 742;
    refreshPage();
    await reenterRoom(PATIENT);

    expect(await restoreTimer(1200)).toBe(742);
  });

  it('a sessão vencida enquanto a aba recarregava é renovada, não expirada', async () => {
    session().expires_at = hoursFromNow(-1);
    refreshPage();

    const state = await reenterRoom(PATIENT);
    expect(new Date(state!.validated.expires_at!).getTime()).toBeGreaterThan(Date.now());
    expect(session().status).toBe('active');
  });

  it('não mostra aviso de encerramento ao reentrar (a sessão continua ativa)', async () => {
    refreshPage();
    const state = await reenterRoom(PATIENT);

    expect(isRealTermination(session() as any, state!.joinedAt)).toBe(false);
    expect(isStaleCompletedSession(session() as any, state!.joinedAt)).toBe(false);
  });

  it('CALL_ENDED enviado após o refresh chega ao par e o banco é a fonte da verdade', async () => {
    refreshPage();
    const state = await reenterRoom(PATIENT);

    const pair = makePeerPair();
    const received: any[] = [];
    const patientChannel = attachCallSignalChannel(pair.pcA, () => {});
    attachCallSignalChannel(pair.pcB, (s) => received.push(s));
    pair.connect();

    const sent = patientChannel.sendCallEnded({
      endedByType: 'patient',
      reason: END_REASONS.COMPLETED_BY_PATIENT,
      sessionId: SESSION_ID,
    });

    expect(sent).toBe(true);
    expect(received).toHaveLength(1);
    // Sinal ainda não persistiu nada.
    expect(isRealTermination(session() as any, state!.joinedAt)).toBe(false);

    await persistExplicitTermination(fakeSupabase, {
      requestId: REQUEST_ID,
      sessionId: SESSION_ID,
      userId: PATIENT,
      endedByType: 'patient',
      reason: END_REASONS.COMPLETED_BY_PATIENT,
    });

    expect(isRealTermination(session() as any, state!.joinedAt)).toBe(true);
    expect(request()).toMatchObject({ status: 'completed', ended_by_type: 'patient' });
  });

  it('CALL_ENDED recebido antes do refresh continua consistente após recarregar', async () => {
    await persistExplicitTermination(fakeSupabase, {
      requestId: REQUEST_ID,
      sessionId: SESSION_ID,
      userId: PSYCHOLOGIST,
      endedByType: 'psychologist',
      reason: END_REASONS.COMPLETED_BY_PSYCHOLOGIST,
    });

    refreshPage();

    // Chamada encerrada: nada de ongoing para reentrar.
    const ongoing = await findOngoingCallForUser(PATIENT);
    expect(sessionIdOf(ongoing)).toBeNull();
    expect(isRealTermination(session() as any, Date.now() - 60_000)).toBe(true);
  });

  it('refresh repetido não duplica sessões, solicitações nem locks', async () => {
    for (let i = 0; i < 3; i++) {
      refreshPage();
      const state = await reenterRoom(PATIENT);
      expect(state?.sessionId).toBe(SESSION_ID);
    }

    expect(fakeDb.rows('webrtc_sessions')).toHaveLength(1);
    expect(fakeDb.rows('emergency_requests')).toHaveLength(1);
    expect(getCallLock(PATIENT)?.sessionId).toBe(SESSION_ID);
  });
});
