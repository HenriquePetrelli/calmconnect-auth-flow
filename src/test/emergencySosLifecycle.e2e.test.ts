import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

import { persistExplicitTermination, isRealTermination } from '@/lib/callTermination';
import { END_REASONS } from '@/lib/emergencyEndReasons';
import { attachCallSignalChannel, parseCallSignal } from '@/lib/callSignals';

const PATIENT = '11111111-1111-4111-8111-111111111111';
const PSYCHOLOGIST = '22222222-2222-4222-8222-222222222222';
const OTHER_PSYCHOLOGIST = '99999999-9999-4999-8999-999999999999';
const REQUEST_ID = '33333333-3333-4333-8333-333333333333';
const SESSION_ID = '44444444-4444-4444-8444-444444444444';

const request = () => fakeDb.rows('emergency_requests')[0];
const session = () => fakeDb.rows('webrtc_sessions')[0];

/** Patient presses SOS. */
const createRequest = async () => {
  await fakeSupabase.from('emergency_requests').insert({
    id: REQUEST_ID,
    patient_id: PATIENT,
    status: 'pending',
    accepted_by: null,
    accepted_at: null,
    started_at: null,
    ended_at: null,
    ended_by: null,
    ended_by_type: null,
    end_reason: null,
    duration: null,
    created_at: new Date().toISOString(),
  });
};

/** Atomic accept: only succeeds while the request is still `pending`. */
const acceptRequest = async (psychologistId: string) => {
  const { data } = await fakeSupabase
    .from('emergency_requests')
    .update({
      status: 'accepted',
      accepted_by: psychologistId,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', REQUEST_ID)
    .eq('status', 'pending')
    .select();

  return Array.isArray(data) && data.length > 0;
};

/** Both participants land in the room and the call effectively starts. */
const joinRoom = async (startedMinutesAgo = 0) => {
  await fakeSupabase.from('webrtc_sessions').insert({
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

  await fakeSupabase
    .from('emergency_requests')
    .update({
      status: 'in_progress',
      video_room_id: SESSION_ID,
      started_at: new Date(Date.now() - startedMinutesAgo * 60_000).toISOString(),
    })
    .eq('id', REQUEST_ID);
};

/** Minimal RTCDataChannel pair, wired like a real peer connection. */
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

  const pcA: any = {
    ondatachannel: null,
    createDataChannel: () => aOut,
  };
  const pcB: any = {
    ondatachannel: null,
    createDataChannel: () => bOut,
  };

  return {
    pcA,
    pcB,
    connect() {
      // A's outgoing channel arrives at B and vice-versa.
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
});

describe('ciclo de vida SOS — aceite', () => {
  it('o primeiro psicólogo assume a solicitação e ela sai da fila', async () => {
    await createRequest();

    expect(await acceptRequest(PSYCHOLOGIST)).toBe(true);
    expect(request()).toMatchObject({ status: 'accepted', accepted_by: PSYCHOLOGIST });
  });

  it('um segundo psicólogo não consegue aceitar a mesma solicitação', async () => {
    await createRequest();
    await acceptRequest(PSYCHOLOGIST);

    expect(await acceptRequest(OTHER_PSYCHOLOGIST)).toBe(false);
    expect(request().accepted_by).toBe(PSYCHOLOGIST);
  });
});

describe('ciclo de vida SOS — entrada na sala', () => {
  it('cria a sessão de vídeo e move a solicitação para em andamento', async () => {
    await createRequest();
    await acceptRequest(PSYCHOLOGIST);
    await joinRoom();

    expect(request()).toMatchObject({ status: 'in_progress', video_room_id: SESSION_ID });
    expect(session()).toMatchObject({ status: 'active', patient_id: PATIENT });
    expect(request().started_at).toBeTruthy();
  });

  it('a sessão recém-criada não é interpretada como encerrada', () => {
    expect(isRealTermination(session() as any, Date.now())).toBe(false);
  });
});

describe('ciclo de vida SOS — encerramento por timeout', () => {
  beforeEach(async () => {
    await createRequest();
    await acceptRequest(PSYCHOLOGIST);
    await joinRoom(20);
  });

  it('finaliza a chamada com motivo time_limit e duração aproximada de 20 min', async () => {
    const { duration } = await persistExplicitTermination(fakeSupabase, {
      requestId: REQUEST_ID,
      sessionId: SESSION_ID,
      userId: null,
      endedByType: 'system',
      reason: END_REASONS.TIME_LIMIT,
    });

    expect(duration).toBeGreaterThanOrEqual(1195);
    expect(request()).toMatchObject({
      status: 'completed',
      ended_by_type: 'system',
      end_reason: END_REASONS.TIME_LIMIT,
    });
    expect(session()).toMatchObject({ status: 'completed', end_reason: END_REASONS.TIME_LIMIT });
  });

  it('é idempotente: um segundo timeout não reescreve o desfecho', async () => {
    await persistExplicitTermination(fakeSupabase, {
      requestId: REQUEST_ID,
      sessionId: SESSION_ID,
      endedByType: 'system',
      reason: END_REASONS.TIME_LIMIT,
    });

    const result = await persistExplicitTermination(fakeSupabase, {
      requestId: REQUEST_ID,
      sessionId: SESSION_ID,
      userId: PATIENT,
      endedByType: 'patient',
      reason: END_REASONS.COMPLETED_BY_PATIENT,
    });

    expect(result.alreadyEnded).toBe(true);
    expect(request().end_reason).toBe(END_REASONS.TIME_LIMIT);
  });
});

describe('ciclo de vida SOS — sinal CALL_ENDED', () => {
  it('entrega o encerramento ao outro participante imediatamente', () => {
    const pair = makePeerPair();
    const received: any[] = [];

    const patientChannel = attachCallSignalChannel(pair.pcA, (s) => received.push(['patient', s]));
    attachCallSignalChannel(pair.pcB, (s) => received.push(['psychologist', s]));
    pair.connect();

    const sent = patientChannel.sendCallEnded({
      endedByType: 'patient',
      reason: END_REASONS.COMPLETED_BY_PATIENT,
      sessionId: SESSION_ID,
    });

    expect(sent).toBe(true);
    expect(received).toHaveLength(1);
    expect(received[0][0]).toBe('psychologist');
    expect(received[0][1]).toMatchObject({
      type: 'CALL_ENDED',
      endedByType: 'patient',
      reason: END_REASONS.COMPLETED_BY_PATIENT,
      sessionId: SESSION_ID,
    });
  });

  it('o encerramento por timeout também é sinalizado como CALL_ENDED do sistema', () => {
    const pair = makePeerPair();
    const received: any[] = [];
    const psychologistChannel = attachCallSignalChannel(pair.pcA, () => {});
    attachCallSignalChannel(pair.pcB, (s) => received.push(s));
    pair.connect();

    psychologistChannel.sendCallEnded({
      endedByType: 'system',
      reason: END_REASONS.TIME_LIMIT,
      sessionId: SESSION_ID,
    });

    expect(received[0]).toMatchObject({ endedByType: 'system', reason: END_REASONS.TIME_LIMIT });
  });

  it('não entrega a mesma mensagem duas vezes', () => {
    const pair = makePeerPair();
    const received: any[] = [];
    const a = attachCallSignalChannel(pair.pcA, () => {});
    attachCallSignalChannel(pair.pcB, (s) => received.push(s));
    pair.connect();

    const payload = { endedByType: 'patient' as const, reason: END_REASONS.COMPLETED_BY_PATIENT };
    a.sendCallEnded(payload);
    // Simulate the duplicate that a second (inbound) channel could deliver.
    const duplicate = received[0];
    (pair.pcB as any).ondatachannel?.({
      channel: {
        readyState: 'open',
        send: () => {},
        onmessage: null,
      },
    });
    expect(parseCallSignal(JSON.stringify(duplicate))).toMatchObject({ type: 'CALL_ENDED' });
    expect(received).toHaveLength(1);
  });

  it('não envia nada quando o canal ainda não está aberto', () => {
    const pc: any = {
      ondatachannel: null,
      createDataChannel: () => ({ readyState: 'connecting', send: () => {}, onmessage: null }),
    };
    const channel = attachCallSignalChannel(pc, () => {});
    expect(channel.sendCallEnded({ endedByType: 'patient', reason: 'other' })).toBe(false);
  });

  it('ignora mensagens inválidas no canal de controle', () => {
    expect(parseCallSignal('nao-e-json')).toBeNull();
    expect(parseCallSignal(JSON.stringify({ type: 'PING' }))).toBeNull();
    expect(parseCallSignal(JSON.stringify({ type: 'CALL_ENDED', endedByType: 'alien' }))).toBeNull();
  });

  it('o sinal é apenas um atalho: o banco continua sendo a fonte da verdade', async () => {
    await createRequest();
    await acceptRequest(PSYCHOLOGIST);
    await joinRoom(5);

    const joinedAt = Date.now() - 60_000;
    const pair = makePeerPair();
    const a = attachCallSignalChannel(pair.pcA, () => {});
    attachCallSignalChannel(pair.pcB, () => {});
    pair.connect();

    a.sendCallEnded({ endedByType: 'psychologist', reason: END_REASONS.COMPLETED_BY_PSYCHOLOGIST });
    // Nothing persisted yet — the row must still be live.
    expect(isRealTermination(session() as any, joinedAt)).toBe(false);

    await persistExplicitTermination(fakeSupabase, {
      requestId: REQUEST_ID,
      sessionId: SESSION_ID,
      userId: PSYCHOLOGIST,
      endedByType: 'psychologist',
      reason: END_REASONS.COMPLETED_BY_PSYCHOLOGIST,
      crisisResolved: true,
    });

    expect(isRealTermination(session() as any, joinedAt)).toBe(true);
    expect(request().crisis_resolved).toBe(true);
  });
});
