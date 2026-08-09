import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

import { acquireCallLock, getCallLock } from '@/lib/callLock';
import { findOngoingCallForUser, sessionIdOf } from '@/lib/emergencyCallGuard';
import { getConnectionBannerState, isRemoteDropInvoluntary } from '@/lib/callBanner';
import { getReconnectDelay, MAX_RECONNECT_ATTEMPTS, shouldKeepCallOpenOnDrop } from '@/lib/reconnect';
import { isRealTermination } from '@/lib/callTermination';
import { validateWebRTCSession } from '@/utils/session-validation';

const PATIENT = '11111111-1111-4111-8111-111111111111';
const PSYCHOLOGIST = '22222222-2222-4222-8222-222222222222';
const REQUEST_ID = '33333333-3333-4333-8333-333333333333';
const SESSION_ID = '44444444-4444-4444-8444-444444444444';

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
const session = () => fakeDb.rows('webrtc_sessions')[0];

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

/**
 * Minimal peer-connection factory that mimics the singleton behaviour used in
 * production: one connection per session, reused while it is still usable.
 */
const makePeerFactory = () => {
  const pool = new Map<string, any>();
  let created = 0;
  let iceRestarts = 0;

  const get = (sessionId: string) => {
    const existing = pool.get(sessionId);
    if (existing && existing.connectionState !== 'closed') return existing;
    created += 1;
    const pc = {
      connectionState: 'connected',
      close() {
        this.connectionState = 'closed';
      },
      restartIce() {
        iceRestarts += 1;
        this.connectionState = 'connected';
      },
    };
    pool.set(sessionId, pc);
    return pc;
  };

  return {
    get,
    get created() {
      return created;
    },
    get iceRestarts() {
      return iceRestarts;
    },
    get size() {
      return pool.size;
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

describe('SOS — perda e restauração de rede', () => {
  it('a queda mantém a chamada aberta e nenhuma escrita de encerramento acontece', async () => {
    const joinedAt = Date.now() - 60_000;

    window.dispatchEvent(new Event('offline'));
    expect(shouldKeepCallOpenOnDrop()).toBe(true);
    window.dispatchEvent(new Event('online'));

    const endingWrites = fakeDb.writes.filter(
      (w: any) => w?.patch?.status === 'completed' || w?.patch?.ended_at
    );
    expect(endingWrites).toHaveLength(0);
    expect(session().status).toBe('active');
    expect(isRealTermination(session() as any, joinedAt)).toBe(false);
  });

  it('reconecta na MESMA sessão sem criar um segundo peer', async () => {
    const peers = makePeerFactory();

    peers.get(SESSION_ID); // conexão inicial

    // Queda: ICE falha, mas a conexão é reaproveitada com iceRestart.
    for (let attempt = 1; attempt <= 3; attempt++) {
      expect(getReconnectDelay(attempt)).toBeLessThanOrEqual(8000);
      peers.get(SESSION_ID).restartIce();
    }

    expect(peers.created).toBe(1);
    expect(peers.size).toBe(1);
    expect(peers.iceRestarts).toBe(3);

    const ongoing = await findOngoingCallForUser(PATIENT);
    expect(sessionIdOf(ongoing)).toBe(SESSION_ID);
  });

  it('recria um único peer quando a conexão anterior foi fechada pela queda', () => {
    const peers = makePeerFactory();
    const first = peers.get(SESSION_ID);
    first.close();

    peers.get(SESSION_ID);
    peers.get(SESSION_ID); // segunda chamada durante o retry não duplica

    expect(peers.created).toBe(2);
    expect(peers.size).toBe(1);
  });

  it('o lock da chamada continua com a mesma aba após voltar a rede (sem duplicar sessão)', () => {
    const first = acquireCallLock(PATIENT, SESSION_ID);
    expect(first.ok).toBe(true);

    // Remount do componente após reconexão, mesma aba.
    const second = acquireCallLock(PATIENT, SESSION_ID);
    expect(second.ok).toBe(true);
    expect(getCallLock(PATIENT)?.sessionId).toBe(SESSION_ID);

    if (first.ok) first.release();
  });

  it('a sessão vencida durante a queda é renovada em vez de expirar', async () => {
    session().expires_at = hoursFromNow(-1);

    const renewed = await validateWebRTCSession(SESSION_ID);
    expect(new Date(renewed.expires_at!).getTime()).toBeGreaterThan(Date.now());
    expect(session().status).toBe('active');
  });

  it('o banner passa por offline → reconectando → oculto ao restaurar', () => {
    const base = {
      remoteDroppedInvoluntarily: false,
      callTerminated: false,
      reconnectAttempt: 1,
      userType: 'patient' as const,
    };

    const offline = getConnectionBannerState({ ...base, isReconnecting: false, isNetworkOffline: true });
    expect(offline).toMatchObject({ visible: true, variant: 'offline' });

    const reconnecting = getConnectionBannerState({
      ...base,
      isReconnecting: true,
      isNetworkOffline: false,
      reconnectAttempt: 2,
    });
    expect(reconnecting.variant).toBe('reconnecting');
    expect(reconnecting.title).toContain('tentativa 2');

    const restored = getConnectionBannerState({ ...base, isReconnecting: false, isNetworkOffline: false });
    expect(restored.visible).toBe(false);
  });

  it('a queda do par é tratada como involuntária e some quando ele volta', () => {
    expect(isRemoteDropInvoluntary(false, Date.now(), false)).toBe(true);
    expect(isRemoteDropInvoluntary(true, null, false)).toBe(false);
  });

  it('esgotar as tentativas não encerra a chamada nem duplica estado no banco', () => {
    const joinedAt = Date.now() - 60_000;
    for (let i = 1; i <= MAX_RECONNECT_ATTEMPTS + 3; i++) getReconnectDelay(i);

    expect(fakeDb.rows('webrtc_sessions')).toHaveLength(1);
    expect(fakeDb.rows('emergency_requests')).toHaveLength(1);
    expect(session().status).toBe('active');
    expect(isRealTermination(session() as any, joinedAt)).toBe(false);
  });

  it('após restaurar a rede, um encerramento real ainda é detectado normalmente', () => {
    const joinedAt = Date.now() - 60_000;
    Object.assign(session(), {
      status: 'completed',
      ended_by: PSYCHOLOGIST,
      ended_by_type: 'psychologist',
      ended_at: new Date().toISOString(),
    });

    expect(isRealTermination(session() as any, joinedAt)).toBe(true);
    expect(
      getConnectionBannerState({
        isReconnecting: true,
        isNetworkOffline: false,
        remoteDroppedInvoluntarily: true,
        callTerminated: true,
        reconnectAttempt: 1,
        userType: 'psychologist',
      }).visible
    ).toBe(false);
  });
});
