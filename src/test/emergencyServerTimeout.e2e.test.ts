import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

import {
  isRealTermination,
  isStaleCompletedSession,
  getTerminationMessage,
  persistExplicitTermination,
} from '@/lib/callTermination';
import { END_REASONS } from '@/lib/emergencyEndReasons';
import { findOngoingCallForUser, sessionIdOf } from '@/lib/emergencyCallGuard';

const PATIENT = '11111111-1111-4111-8111-111111111111';
const PSYCHOLOGIST = '22222222-2222-4222-8222-222222222222';
const REQUEST_ID = '33333333-3333-4333-8333-333333333333';
const SESSION_ID = '44444444-4444-4444-8444-444444444444';

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const request = () => fakeDb.rows('emergency_requests')[0];
const session = () => fakeDb.rows('webrtc_sessions')[0];

const CALL_LIMIT_MIN = 21; // 20 min + 1 min de tolerância
const PENDING_TTL_MIN = 10;
const PRESENCE_TTL_MIN = 10;

/**
 * Port fiel de `public.finalize_stale_emergency_sessions()`.
 *
 * O cron roda no servidor, sem participação do cliente: nenhuma das ações
 * abaixo depende de o paciente ou o psicólogo estarem com o app aberto.
 */
const runServerFinalizer = () => {
  const now = Date.now();
  const age = (iso?: string | null) => (iso ? now - new Date(iso).getTime() : 0);
  let expired = 0;
  let timedOut = 0;
  let abandoned = 0;

  for (const er of fakeDb.rows('emergency_requests') as any[]) {
    if (er.status === 'pending' && age(er.created_at) > PENDING_TTL_MIN * 60_000) {
      Object.assign(er, {
        status: 'cancelled',
        ended_at: new Date(now).toISOString(),
        ended_by_type: 'system',
        end_reason: END_REASONS.EXPIRED,
      });
      expired++;
      continue;
    }

    if (
      er.status === 'in_progress' &&
      er.started_at &&
      age(er.started_at) > CALL_LIMIT_MIN * 60_000
    ) {
      Object.assign(er, {
        status: 'completed',
        ended_at: new Date(now).toISOString(),
        ended_by_type: 'system',
        end_reason: END_REASONS.TIME_LIMIT,
        duration: Math.max(0, Math.floor(age(er.started_at) / 1000)),
      });
      timedOut++;
      continue;
    }

    if (['accepted', 'in_progress'].includes(er.status)) {
      const reference = er.started_at ?? er.accepted_at ?? er.created_at;
      const hasHeartbeat = (fakeDb.rows('participant_presence') as any[]).some(
        (pp) =>
          (fakeDb.rows('webrtc_sessions') as any[]).some(
            (ws) => ws.id === pp.session_id && ws.emergency_request_id === er.id
          ) && age(pp.last_seen) < PRESENCE_TTL_MIN * 60_000
      );
      if (age(reference) > PRESENCE_TTL_MIN * 60_000 && !hasHeartbeat) {
        Object.assign(er, {
          status: 'cancelled',
          ended_at: new Date(now).toISOString(),
          ended_by_type: 'system',
          end_reason: END_REASONS.ABANDONED,
        });
        abandoned++;
      }
    }
  }

  // Fecha as salas propagando quem encerrou e por quê.
  for (const ws of fakeDb.rows('webrtc_sessions') as any[]) {
    const er: any = (fakeDb.rows('emergency_requests') as any[]).find(
      (r) => r.id === ws.emergency_request_id
    );
    if (!er || !['completed', 'cancelled'].includes(er.status)) continue;
    if (ws.status === 'completed') continue;
    Object.assign(ws, {
      status: 'completed',
      ended_at: ws.ended_at ?? er.ended_at ?? new Date(now).toISOString(),
      ended_by_type: ws.ended_by_type ?? er.ended_by_type ?? 'system',
      end_reason: ws.end_reason ?? er.end_reason ?? null,
    });
  }

  return { expired, timedOut, abandoned };
};

const seedCall = ({
  status = 'in_progress',
  startedMinutesAgo = 25,
  heartbeatMinutesAgo = 0 as number | null,
} = {}) => {
  fakeDb.rows('emergency_requests').push({
    id: REQUEST_ID,
    patient_id: PATIENT,
    accepted_by: PSYCHOLOGIST,
    status,
    video_room_id: SESSION_ID,
    room_url: SESSION_ID,
    accepted_at: minutesAgo(startedMinutesAgo + 1),
    started_at: status === 'pending' ? null : minutesAgo(startedMinutesAgo),
    created_at: minutesAgo(startedMinutesAgo + 2),
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
  if (heartbeatMinutesAgo !== null) {
    fakeDb.rows('participant_presence').push({
      id: 'presence-1',
      session_id: SESSION_ID,
      user_id: PATIENT,
      user_type: 'patient',
      last_seen: minutesAgo(heartbeatMinutesAgo),
    });
  }
};

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.writes = [];
  fakeDb.failNextWith = null;
  fakeDb.failSelectWith = null;
  fakeDb.currentUserId = PATIENT;
  localStorage.clear();
});

describe('SOS — encerramento por timeout 100% server-side', () => {
  it('finaliza a chamada que passou do limite mesmo sem nenhum cliente conectado', () => {
    seedCall({ startedMinutesAgo: 25, heartbeatMinutesAgo: null });

    const result = runServerFinalizer();

    expect(result.timedOut).toBe(1);
    expect(request()).toMatchObject({
      status: 'completed',
      ended_by_type: 'system',
      end_reason: END_REASONS.TIME_LIMIT,
    });
    expect(request().duration).toBeGreaterThanOrEqual(20 * 60);
    // Nenhuma escrita partiu do cliente.
    expect(fakeDb.writes).toHaveLength(0);
  });

  it('não finaliza antes do limite de 20 minutos (+ tolerância)', () => {
    seedCall({ startedMinutesAgo: 18 });

    expect(runServerFinalizer().timedOut).toBe(0);
    expect(request().status).toBe('in_progress');
    expect(session().status).toBe('active');
  });

  it('a sala de vídeo é fechada com autor e motivo do sistema', () => {
    seedCall({ startedMinutesAgo: 25 });
    runServerFinalizer();

    expect(session()).toMatchObject({
      status: 'completed',
      ended_by_type: 'system',
      end_reason: END_REASONS.TIME_LIMIT,
    });
    expect(session().ended_at).toBeTruthy();
  });

  it('AMBOS os lados enxergam o encerramento (paciente e psicólogo)', () => {
    seedCall({ startedMinutesAgo: 25 });
    const patientJoinedAt = Date.now() - 25 * 60_000;
    const psychologistJoinedAt = Date.now() - 24 * 60_000;

    runServerFinalizer();

    expect(isRealTermination(session() as any, patientJoinedAt)).toBe(true);
    expect(isRealTermination(session() as any, psychologistJoinedAt)).toBe(true);
    expect(isStaleCompletedSession(session() as any, patientJoinedAt)).toBe(false);
    expect(getTerminationMessage(session().ended_by_type)).toContain('tempo da chamada');
  });

  it('é idempotente: rodar o finalizador várias vezes não reescreve o desfecho', () => {
    seedCall({ startedMinutesAgo: 25 });
    runServerFinalizer();
    const snapshot = { ...request(), ...{ session: { ...session() } } };

    const second = runServerFinalizer();
    const third = runServerFinalizer();

    expect(second.timedOut + third.timedOut).toBe(0);
    expect(request().ended_at).toBe(snapshot.ended_at);
    expect(request().end_reason).toBe(END_REASONS.TIME_LIMIT);
    expect(session().ended_at).toBe(snapshot.session.ended_at);
  });

  it('o cliente que volta depois não consegue sobrescrever o encerramento do sistema', async () => {
    seedCall({ startedMinutesAgo: 25 });
    runServerFinalizer();

    const late = await persistExplicitTermination(fakeSupabase, {
      requestId: REQUEST_ID,
      sessionId: SESSION_ID,
      userId: PATIENT,
      endedByType: 'patient',
      reason: END_REASONS.COMPLETED_BY_PATIENT,
    });

    expect(late.alreadyEnded).toBe(true);
    expect(request()).toMatchObject({
      ended_by_type: 'system',
      end_reason: END_REASONS.TIME_LIMIT,
    });
    expect(session().end_reason).toBe(END_REASONS.TIME_LIMIT);
  });

  it('depois do timeout nenhum dos dois consegue reentrar na sala', async () => {
    seedCall({ startedMinutesAgo: 25 });
    runServerFinalizer();

    expect(sessionIdOf(await findOngoingCallForUser(PATIENT))).toBeNull();
    expect(sessionIdOf(await findOngoingCallForUser(PSYCHOLOGIST))).toBeNull();
  });

  it('sala sem heartbeat há mais de 10 min é encerrada como abandonada', () => {
    seedCall({ startedMinutesAgo: 15, heartbeatMinutesAgo: 12 });

    expect(runServerFinalizer().abandoned).toBe(1);
    expect(request()).toMatchObject({
      status: 'cancelled',
      ended_by_type: 'system',
      end_reason: END_REASONS.ABANDONED,
    });
    expect(session().status).toBe('completed');
  });

  it('heartbeat recente impede o encerramento por abandono', () => {
    seedCall({ startedMinutesAgo: 15, heartbeatMinutesAgo: 1 });

    expect(runServerFinalizer().abandoned).toBe(0);
    expect(request().status).toBe('in_progress');
  });

  it('solicitação pendente sem aceite vira expirada pelo servidor', () => {
    seedCall({ status: 'pending', startedMinutesAgo: 12, heartbeatMinutesAgo: null });
    request().accepted_by = null;
    request().accepted_at = null;

    expect(runServerFinalizer().expired).toBe(1);
    expect(request()).toMatchObject({
      status: 'cancelled',
      ended_by_type: 'system',
      end_reason: END_REASONS.EXPIRED,
    });
  });

  it('o encerramento explícito anterior tem prioridade sobre o finalizador', async () => {
    seedCall({ startedMinutesAgo: 25 });

    await persistExplicitTermination(fakeSupabase, {
      requestId: REQUEST_ID,
      sessionId: SESSION_ID,
      userId: PSYCHOLOGIST,
      endedByType: 'psychologist',
      reason: END_REASONS.COMPLETED_BY_PSYCHOLOGIST,
    });

    runServerFinalizer();

    expect(request().end_reason).toBe(END_REASONS.COMPLETED_BY_PSYCHOLOGIST);
    expect(session().end_reason).toBe(END_REASONS.COMPLETED_BY_PSYCHOLOGIST);
    expect(session().ended_by).toBe(PSYCHOLOGIST);
  });
});
