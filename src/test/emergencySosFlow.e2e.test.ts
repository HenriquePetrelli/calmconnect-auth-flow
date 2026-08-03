import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

import {
  findPatientOpenRequest,
  findPsychologistOngoingCall,
  findOngoingCallForUser,
  sessionIdOf,
} from '@/lib/emergencyCallGuard';
import {
  validateWebRTCSession,
  getUserTypeForSession,
  SessionValidationError,
  isValidUUID,
} from '@/utils/session-validation';
import { acquireCallLock } from '@/lib/callLock';
import { isRealTermination, isStaleCompletedSession } from '@/lib/callTermination';

const PATIENT = '11111111-1111-4111-8111-111111111111';
const PSYCHOLOGIST = '22222222-2222-4222-8222-222222222222';
const OTHER_USER = '33333333-3333-4333-8333-333333333333';
const REQUEST_ID = '44444444-4444-4444-8444-444444444444';
const SESSION_ID = '55555555-5555-4555-8555-555555555555';

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

/** Patient presses SOS. */
const createEmergencyRequest = () => {
  fakeDb.rows('emergency_requests').push({
    id: REQUEST_ID,
    patient_id: PATIENT,
    accepted_by: null,
    status: 'pending',
    video_room_id: null,
    room_url: null,
    started_at: null,
    ended_at: null,
    created_at: new Date().toISOString(),
  });
};

/** Psychologist accepts: request goes to `accepted` and a session row exists. */
const acceptEmergencyRequest = (session: Partial<Record<string, any>> = {}) => {
  const req = fakeDb.rows('emergency_requests').find((r) => r.id === REQUEST_ID)!;
  Object.assign(req, {
    status: 'accepted',
    accepted_by: PSYCHOLOGIST,
    video_room_id: SESSION_ID,
    room_url: SESSION_ID,
  });
  fakeDb.rows('webrtc_sessions').push({
    id: SESSION_ID,
    emergency_request_id: REQUEST_ID,
    psychologist_id: PSYCHOLOGIST,
    patient_id: PATIENT,
    status: 'pending',
    expires_at: hoursFromNow(24),
    ended_at: null,
    ended_by: null,
    ended_by_type: null,
    ...session,
  });
};

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.writes = [];
  fakeDb.failNextWith = null;
  fakeDb.failSelectWith = null;
  fakeDb.currentUserId = PATIENT;
  localStorage.clear();
});

describe('SOS flow — request lifecycle', () => {
  it('exposes the patient open request right after SOS is pressed', async () => {
    createEmergencyRequest();
    const open = await findPatientOpenRequest(PATIENT);
    expect(open?.id).toBe(REQUEST_ID);
    expect(open?.status).toBe('pending');
  });

  it('does not leak one patient request to another patient', async () => {
    createEmergencyRequest();
    expect(await findPatientOpenRequest(OTHER_USER)).toBeNull();
  });

  it('blocks a duplicated SOS while a request is still open', async () => {
    createEmergencyRequest();
    const existing = await findPatientOpenRequest(PATIENT);
    expect(existing).not.toBeNull(); // hook returns early instead of creating a 2nd row
  });

  it('links the session id to the request when the psychologist accepts', async () => {
    createEmergencyRequest();
    acceptEmergencyRequest();

    const forPatient = await findOngoingCallForUser(PATIENT);
    const forPsychologist = await findPsychologistOngoingCall(PSYCHOLOGIST);

    expect(sessionIdOf(forPatient)).toBe(SESSION_ID);
    expect(sessionIdOf(forPsychologist)).toBe(SESSION_ID);
  });

  it('stops treating the call as ongoing once it ends', async () => {
    createEmergencyRequest();
    acceptEmergencyRequest();
    const req = fakeDb.rows('emergency_requests')[0];
    req.status = 'completed';
    req.ended_at = new Date().toISOString();

    expect(await findOngoingCallForUser(PATIENT)).toBeNull();
    expect(await findPsychologistOngoingCall(PSYCHOLOGIST)).toBeNull();
    expect(await findPatientOpenRequest(PATIENT)).toBeNull();
  });
});

describe('SOS flow — joining the room', () => {
  it('validates the session for both participants', async () => {
    createEmergencyRequest();
    acceptEmergencyRequest();

    fakeDb.currentUserId = PATIENT;
    const asPatient = await validateWebRTCSession(SESSION_ID);
    expect(getUserTypeForSession(asPatient, PATIENT)).toBe('patient');

    fakeDb.currentUserId = PSYCHOLOGIST;
    const asPsychologist = await validateWebRTCSession(SESSION_ID);
    expect(getUserTypeForSession(asPsychologist, PSYCHOLOGIST)).toBe('psychologist');
  });

  it('rejects a malformed session id', async () => {
    await expect(validateWebRTCSession('not-a-uuid')).rejects.toMatchObject({
      code: 'INVALID_SESSION_ID',
    });
    expect(isValidUUID(SESSION_ID)).toBe(true);
  });

  it('rejects a user that is not part of the session', async () => {
    createEmergencyRequest();
    acceptEmergencyRequest();
    fakeDb.currentUserId = OTHER_USER;

    await expect(validateWebRTCSession(SESSION_ID)).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
    });
  });

  it('reports SESSION_NOT_FOUND when the row never appears', { timeout: 20000 }, async () => {
    await expect(validateWebRTCSession(SESSION_ID)).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
    });
  });

  // Regression: reused session rows carried a stale `expires_at`, which locked
  // both participants out of a call that was actually still running.
  it('extends a stale expires_at instead of failing an ongoing call', async () => {
    createEmergencyRequest();
    acceptEmergencyRequest({ expires_at: hoursFromNow(-5), status: 'active' });

    const session = await validateWebRTCSession(SESSION_ID);
    expect(new Date(session.expires_at!).getTime()).toBeGreaterThan(Date.now());

    const stored = fakeDb.rows('webrtc_sessions')[0];
    expect(new Date(stored.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it('still refuses an expired session of a finished call', async () => {
    createEmergencyRequest();
    acceptEmergencyRequest({ expires_at: hoursFromNow(-5), status: 'completed' });

    await expect(validateWebRTCSession(SESSION_ID)).rejects.toBeInstanceOf(SessionValidationError);
    await expect(validateWebRTCSession(SESSION_ID)).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
    });
  });
});

describe('SOS flow — single active call lock', () => {
  it('lets the same tab re-enter the same room', () => {
    const first = acquireCallLock(PATIENT, SESSION_ID);
    expect(first.ok).toBe(true);
    const again = acquireCallLock(PATIENT, SESSION_ID);
    expect(again.ok).toBe(true);
    if (first.ok) first.release();
  });

  it('frees the lock when the call screen unmounts', () => {
    const lock = acquireCallLock(PATIENT, SESSION_ID);
    expect(lock.ok).toBe(true);
    if (lock.ok) lock.release();
    const next = acquireCallLock(PATIENT, SESSION_ID);
    expect(next.ok).toBe(true);
    if (next.ok) next.release();
  });

  it('blocks another tab holding the room', () => {
    localStorage.setItem(
      `soliv_call_lock_${PATIENT}`,
      JSON.stringify({ sessionId: SESSION_ID, tabId: 'other-tab', ts: Date.now() })
    );
    const result = acquireCallLock(PATIENT, SESSION_ID);
    expect(result).toMatchObject({ ok: false, reason: 'duplicate-tab' });
  });

  it('blocks entering a different room while another one is active', () => {
    localStorage.setItem(
      `soliv_call_lock_${PATIENT}`,
      JSON.stringify({ sessionId: 'other-session', tabId: 'other-tab', ts: Date.now() })
    );
    const result = acquireCallLock(PATIENT, SESSION_ID);
    expect(result).toMatchObject({ ok: false, reason: 'other-room' });
  });

  it('ignores a stale lock left by a crashed tab', () => {
    localStorage.setItem(
      `soliv_call_lock_${PATIENT}`,
      JSON.stringify({ sessionId: SESSION_ID, tabId: 'dead-tab', ts: Date.now() - 60_000 })
    );
    const result = acquireCallLock(PATIENT, SESSION_ID);
    expect(result.ok).toBe(true);
    if (result.ok) result.release();
  });
});

describe('SOS flow — termination', () => {
  it('treats an explicit hangup as a real termination for the peer', () => {
    const joinedAt = Date.now() - 5000;
    const ended = {
      status: 'completed',
      ended_by: PSYCHOLOGIST,
      ended_by_type: 'psychologist',
      ended_at: new Date().toISOString(),
    };
    expect(isRealTermination(ended, joinedAt)).toBe(true);
    expect(isStaleCompletedSession(ended, joinedAt)).toBe(false);
  });

  it('does not end the call when the peer merely drops or navigates away', () => {
    const joinedAt = Date.now();
    expect(isRealTermination({ status: 'active' }, joinedAt)).toBe(false);
    expect(isRealTermination({ status: 'completed' }, joinedAt)).toBe(false);
  });

  it('reopens a leftover completed row from a previous call', () => {
    const joinedAt = Date.now();
    const stale = {
      status: 'completed',
      ended_by: PSYCHOLOGIST,
      ended_by_type: 'psychologist',
      ended_at: new Date(joinedAt - 60_000).toISOString(),
    };
    expect(isStaleCompletedSession(stale, joinedAt)).toBe(true);
    expect(isRealTermination(stale, joinedAt)).toBe(false);
  });
});
