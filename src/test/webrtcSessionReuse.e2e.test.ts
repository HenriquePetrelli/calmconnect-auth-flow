import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

import {
  validateWebRTCSession,
  getUserTypeForSession,
  SessionValidationError,
} from '@/utils/session-validation';
import { findOngoingCallForUser, sessionIdOf } from '@/lib/emergencyCallGuard';

const PATIENT = '11111111-1111-4111-8111-111111111111';
const PSYCHOLOGIST = '22222222-2222-4222-8222-222222222222';
const REQUEST_ID = '44444444-4444-4444-8444-444444444444';
const SESSION_ID = '55555555-5555-4555-8555-555555555555';

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
const session = () => fakeDb.rows('webrtc_sessions')[0];

/**
 * Leftover row from a call that already happened: expired `expires_at`,
 * `completed` status and termination metadata still filled in.
 */
const seedStaleSessionFromPreviousCall = () => {
  fakeDb.rows('emergency_requests').push({
    id: REQUEST_ID,
    patient_id: PATIENT,
    accepted_by: PSYCHOLOGIST,
    status: 'accepted',
    video_room_id: SESSION_ID,
    room_url: SESSION_ID,
    started_at: null,
    ended_at: null,
    created_at: new Date().toISOString(),
  });
  fakeDb.rows('webrtc_sessions').push({
    id: SESSION_ID,
    emergency_request_id: REQUEST_ID,
    psychologist_id: PSYCHOLOGIST,
    patient_id: PATIENT,
    status: 'completed',
    offer: { sdp: 'old-offer' },
    answer: { sdp: 'old-answer' },
    ice_candidates: [{ candidate: 'old' }],
    expires_at: hoursFromNow(-30),
    ended_at: new Date(Date.now() - 86_400_000).toISOString(),
    ended_by: PSYCHOLOGIST,
    ended_by_type: 'psychologist',
    end_reason: 'encerrada_pelo_usuario',
  });
};

/**
 * Mirrors exactly what `psychologist-emergency` writes when it reuses an
 * existing `webrtc_sessions` row instead of inserting a new one.
 */
const reuseSessionAsEdgeFunctionDoes = async () => {
  const existing = await fakeSupabase
    .from('webrtc_sessions')
    .select('*')
    .eq('emergency_request_id', REQUEST_ID)
    .maybeSingle();

  expect(existing.data?.id).toBe(SESSION_ID); // reused, never re-created

  await fakeSupabase
    .from('webrtc_sessions')
    .update({
      psychologist_id: PSYCHOLOGIST,
      patient_id: PATIENT,
      status: 'pending',
      offer: null,
      answer: null,
      ice_candidates: [],
      ended_at: null,
      ended_by: null,
      ended_by_type: null,
      end_reason: null,
      expires_at: hoursFromNow(24),
      updated_at: new Date().toISOString(),
    })
    .eq('id', SESSION_ID);

  return SESSION_ID;
};

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.writes = [];
  fakeDb.failNextWith = null;
  fakeDb.failSelectWith = null;
  fakeDb.currentUserId = PATIENT;
  localStorage.clear();
  seedStaleSessionFromPreviousCall();
});

describe('reaproveitamento de sessão WebRTC existente', () => {
  it('reutiliza a mesma linha e renova o expires_at ao aceitar de novo', async () => {
    const before = new Date(session().expires_at).getTime();
    expect(before).toBeLessThan(Date.now()); // vencida

    const reusedId = await reuseSessionAsEdgeFunctionDoes();

    expect(reusedId).toBe(SESSION_ID);
    expect(fakeDb.rows('webrtc_sessions')).toHaveLength(1);
    expect(new Date(session().expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it('limpa os metadados de encerramento da chamada anterior', async () => {
    await reuseSessionAsEdgeFunctionDoes();

    expect(session()).toMatchObject({
      status: 'pending',
      offer: null,
      answer: null,
      ended_at: null,
      ended_by: null,
      ended_by_type: null,
      end_reason: null,
    });
    expect(session().ice_candidates).toEqual([]);
  });

  it('não lança SESSION_EXPIRED ao entrar na sala reaproveitada (paciente e psicólogo)', async () => {
    await reuseSessionAsEdgeFunctionDoes();

    fakeDb.currentUserId = PATIENT;
    const asPatient = await validateWebRTCSession(SESSION_ID);
    expect(getUserTypeForSession(asPatient, PATIENT)).toBe('patient');
    expect(new Date(asPatient.expires_at!).getTime()).toBeGreaterThan(Date.now());

    fakeDb.currentUserId = PSYCHOLOGIST;
    const asPsychologist = await validateWebRTCSession(SESSION_ID);
    expect(getUserTypeForSession(asPsychologist, PSYCHOLOGIST)).toBe('psychologist');
  });

  it('renova o expires_at na validação quando a linha reaproveitada ficou vencida', async () => {
    // Linha antiga que a edge function não chegou a renovar, mas cuja chamada
    // está em andamento — entrar na sala deve estender, não bloquear.
    Object.assign(session(), {
      status: 'active',
      ended_at: null,
      ended_by: null,
      ended_by_type: null,
      expires_at: hoursFromNow(-30),
    });

    const validated = await validateWebRTCSession(SESSION_ID);

    expect(new Date(validated.expires_at!).getTime()).toBeGreaterThan(Date.now());
    expect(new Date(session().expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it('mantém a sala acessível pelos guards após o reaproveitamento', async () => {
    await reuseSessionAsEdgeFunctionDoes();

    const ongoing = await findOngoingCallForUser(PATIENT);
    expect(sessionIdOf(ongoing)).toBe(SESSION_ID);
  });

  it('ainda bloqueia uma sessão vencida de chamada realmente encerrada', async () => {
    // Sem reaproveitamento: continua `completed` e vencida.
    await expect(validateWebRTCSession(SESSION_ID)).rejects.toBeInstanceOf(SessionValidationError);
    await expect(validateWebRTCSession(SESSION_ID)).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
    });
  });
});
